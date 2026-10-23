import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { OTP_LENGTH } from "./validation";

export const OTP_COOKIE = "ct_otp";
export const OTP_TTL_SECONDS = 5 * 60;
export const RESEND_COOLDOWN_SECONDS = 45;
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const SMS_TIMEOUT_MS = 10_000;

type Token = { phone: string; nonce: string; hash: string; exp: number };

function secret() {
  const value = process.env.OTP_SECRET;
  if (!value || value.length < 32) throw new Error("OTP_SECRET is missing or too short");
  return value;
}

const hmac = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/*
 * Best-effort abuse limits kept in process memory. They reset on restart and are per instance,
 * which is enough for a single Node server; a multi-instance deployment should move them to a shared store.
 */
const sends = new Map<string, number[]>();
const attempts = new Map<string, number>();

function prune(now: number) {
  for (const [key, times] of sends) {
    const recent = times.filter((t) => now - t < 3_600_000);
    if (recent.length) sends.set(key, recent);
    else sends.delete(key);
  }
  if (attempts.size > 5_000) attempts.clear();
}

/** Returns seconds to wait before another code may be sent to this number or from this client, or 0. */
export function sendWaitSeconds(keys: string[], now = Date.now()) {
  prune(now);
  let wait = 0;
  for (const key of keys) {
    const times = sends.get(key) ?? [];
    const last = times.at(-1);
    if (last && now - last < RESEND_COOLDOWN_SECONDS * 1000) wait = Math.max(wait, Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (now - last)) / 1000));
    if (times.length >= MAX_SENDS_PER_HOUR) wait = Math.max(wait, Math.ceil((3_600_000 - (now - times[0])) / 1000));
  }
  return wait;
}

export function recordSend(keys: string[], now = Date.now()) {
  for (const key of keys) sends.set(key, [...(sends.get(key) ?? []), now]);
}

/** Creates a code and the signed cookie value that proves it was issued for this phone number. */
export function issueOtp(phone: string) {
  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  const nonce = randomBytes(12).toString("base64url");
  const token: Token = { phone, nonce, hash: hmac(`${nonce}:${phone}:${code}`), exp: Date.now() + OTP_TTL_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(token)).toString("base64url");
  return { code, cookie: `${body}.${hmac(body)}` };
}

export type VerifyResult = "ok" | "expired" | "mismatch" | "locked" | "invalid";

export function verifyOtp(cookie: string | undefined, phone: string, code: string): VerifyResult {
  if (!cookie) return "expired";
  const [body, signature] = cookie.split(".");
  if (!body || !signature || !safeEqual(signature, hmac(body))) return "invalid";

  let token: Token;
  try {
    token = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Token;
  } catch {
    return "invalid";
  }
  if (token.exp < Date.now()) return "expired";
  if (token.phone !== phone) return "invalid";

  const used = attempts.get(token.nonce) ?? 0;
  if (used >= MAX_VERIFY_ATTEMPTS) return "locked";
  attempts.set(token.nonce, used + 1);

  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code) || !safeEqual(token.hash, hmac(`${token.nonce}:${phone}:${code}`))) return "mismatch";
  attempts.set(token.nonce, MAX_VERIFY_ATTEMPTS);
  return "ok";
}

/** Sends the code through the SMS gateway configured in SMS_API_URL / SMS_API_KEY / SMS_SENDER_ID. */
export async function sendOtpSms(phone: string, code: string) {
  const { SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID, SMS_OTP_TEMPLATE } = process.env;
  if (!SMS_API_URL || !SMS_API_KEY || !SMS_SENDER_ID || !SMS_OTP_TEMPLATE) throw new Error("SMS gateway is not configured");

  const url = new URL(SMS_API_URL);
  url.searchParams.set("apikey", SMS_API_KEY);
  url.searchParams.set("senderid", SMS_SENDER_ID);
  url.searchParams.set("number", phone);
  url.searchParams.set("message", SMS_OTP_TEMPLATE.replace("{otp}", code));
  if (process.env.SMS_TEMPLATE_ID) url.searchParams.set("templateid", process.env.SMS_TEMPLATE_ID);

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(SMS_TIMEOUT_MS) });
  const text = (await res.text()).slice(0, 300);
  if (!res.ok || /error|invalid|fail/i.test(text)) throw new Error(`SMS gateway rejected the request (${res.status}): ${text}`);
}
