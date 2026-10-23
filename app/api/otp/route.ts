import { NextResponse, type NextRequest } from "next/server";
import { issueOtp, OTP_COOKIE, OTP_TTL_SECONDS, recordSend, RESEND_COOLDOWN_SECONDS, sendOtpSms, sendWaitSeconds } from "@/features/contact/lib/otp";
import { clientIp, json, readJson, sameOrigin } from "@/features/contact/lib/request";
import { isCountry, localPhone, phoneError, PHONE_RULES } from "@/features/contact/lib/validation";

/** Sends a one-time code to the visitor's mobile number. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);

  const body = (await readJson(request)) as { phone?: unknown; country?: unknown } | null;
  if (!body || typeof body.phone !== "string" || !isCountry(body.country)) return json({ error: "Invalid request." }, 400);

  const invalid = phoneError(body.phone, body.country);
  if (invalid) return json({ error: invalid }, 400);

  const phone = `${PHONE_RULES[body.country].code}${localPhone(body.phone, body.country)}`;
  const keys = [`phone:${phone}`, `ip:${clientIp(request)}`];
  const wait = sendWaitSeconds(keys);
  if (wait) {
    return json({ error: `Please wait ${wait}s before requesting another code.`, retryAfter: wait }, 429, { "Retry-After": String(wait) });
  }

  const { code, cookie } = issueOtp(phone);
  try {
    await sendOtpSms(phone, code);
  } catch (error) {
    console.error("[otp] SMS delivery failed:", error instanceof Error ? error.message : error);
    return json({ error: "We couldn't send the code right now. Please try again in a moment." }, 502);
  }
  recordSend(keys);

  const response = NextResponse.json({ ok: true, cooldown: RESEND_COOLDOWN_SECONDS });
  response.cookies.set(OTP_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: OTP_TTL_SECONDS,
  });
  return response;
}
