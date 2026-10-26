import { NextResponse, type NextRequest } from "next/server";
import { OTP_COOKIE, verifyOtp, type VerifyResult } from "@/features/contact/lib/otp";
import { json, readJson, sameOrigin } from "@/features/contact/lib/request";
import { localPhone, parseFields, PHONE_RULES, validate } from "@/features/contact/lib/validation";

const FORWARD_TIMEOUT_MS = 15_000;

const OTP_ERRORS: Record<Exclude<VerifyResult, "ok">, string> = {
  mismatch: "That code doesn't match. Please check it and try again.",
  expired: "This code has expired. Please request a new one.",
  locked: "Too many incorrect attempts. Please request a new code.",
  invalid: "Please request a new code for this number.",
};

/** Verifies the one-time code, then forwards the enquiry to the Google Sheets script. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);

  const body = (await readJson(request)) as Record<string, unknown> | null;
  const fields = parseFields(body);
  if (!fields) return json({ error: "Invalid request." }, 400);

  const errors = validate(fields);
  if (Object.keys(errors).length) return json({ error: "Please fix the highlighted fields.", errors }, 400);

  const local = localPhone(fields.phone, fields.country);
  const phone = `${PHONE_RULES[fields.country].code}${local}`;
  const result = verifyOtp(request.cookies.get(OTP_COOKIE)?.value, phone, typeof body?.otp === "string" ? body.otp : "");
  if (result !== "ok") return json({ error: OTP_ERRORS[result], otp: result }, result === "mismatch" ? 400 : 410);

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    console.error("[contact] GOOGLE_SCRIPT_URL is not configured");
    return json({ error: "We couldn't send your message. Please email us instead." }, 500);
  }

  const payload = {
    fullName: fields.fullName,
    email: fields.email,
    contactNumber: local,
    subject: fields.service,
    message: `${fields.message}\n\nCountry: ${fields.country}`,
    timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    source: request.headers.get("referer") ?? `${request.nextUrl.origin}/contact`,
  };

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
    if (res.status >= 500) throw new Error(`Script responded ${res.status}`);
  } catch (error) {
    console.error("[contact] forwarding failed:", error instanceof Error ? error.message : error);
    return json({ error: "We couldn't send your message right now. Please try again or email us." }, 502);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete({ name: OTP_COOKIE, path: "/api" });
  return response;
}
