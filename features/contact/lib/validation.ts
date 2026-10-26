/** Contact form rules shared by the browser form and the API routes, so both reject the same input. */

export const SERVICES = ["AI Brand Films", "Digital-First Content", "AI-Powered Campaigns", "Visual Identity System", "Other"] as const;
export type Service = (typeof SERVICES)[number];

export const COUNTRIES = ["India", "UAE", "UK", "Singapore", "USA"] as const;
export type Country = (typeof COUNTRIES)[number];

type PhoneRule = { length: number; pattern: RegExp; code: string; example: string; message: string };

export const PHONE_RULES: Record<Country, PhoneRule> = {
  India: { length: 10, pattern: /^[6-9]\d{9}$/, code: "91", example: "9876543210", message: "Enter a valid 10-digit Indian mobile number starting with 6–9." },
  UAE: { length: 9, pattern: /^5\d{8}$/, code: "971", example: "501234567", message: "Enter a valid 9-digit UAE mobile number starting with 5." },
  UK: { length: 10, pattern: /^7\d{9}$/, code: "44", example: "7123456789", message: "Enter a valid 10-digit UK mobile number starting with 7." },
  Singapore: { length: 8, pattern: /^[89]\d{7}$/, code: "65", example: "81234567", message: "Enter a valid 8-digit Singapore mobile number starting with 8 or 9." },
  USA: { length: 10, pattern: /^[2-9]\d{2}[2-9]\d{6}$/, code: "1", example: "2025550123", message: "Enter a valid 10-digit US number (area code can't start with 0 or 1)." },
};

export const LIMITS = { name: 60, email: 254, messageMin: 10, messageMax: 1500 } as const;
export const OTP_LENGTH = 4;

export type ContactFields = { fullName: string; email: string; phone: string; country: Country; service: Service; message: string };
export type FieldErrors = Partial<Record<keyof ContactFields, string>>;

const NAME = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export const isCountry = (value: unknown): value is Country => typeof value === "string" && (COUNTRIES as readonly string[]).includes(value);
export const isService = (value: unknown): value is Service => typeof value === "string" && (SERVICES as readonly string[]).includes(value);

/** Strips formatting, a leading country code and a trunk zero, leaving the local mobile number. */
export function localPhone(raw: string, country: Country) {
  let digits = raw.replace(/\D/g, "");
  const { length, code } = PHONE_RULES[country];
  if (digits.length > length && digits.startsWith(code)) digits = digits.slice(code.length);
  if (digits.length > length && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** 9999999999, 9898989898 and similar are rejected even when the format is valid. */
function repeated(digits: string) {
  return /^(\d)\1+$/.test(digits) || /^(\d\d)\1+$/.test(digits);
}

export function phoneError(raw: string, country: Country) {
  const local = localPhone(raw, country);
  if (!local) return "Please enter your mobile number.";
  const rule = PHONE_RULES[country];
  if (local.length !== rule.length || !rule.pattern.test(local)) return rule.message;
  if (repeated(local)) return "Please enter a real mobile number.";
  return "";
}

export function fieldError(name: keyof ContactFields, fields: ContactFields): string {
  const value = String(fields[name] ?? "").trim();
  switch (name) {
    case "fullName":
      if (value.length < 2) return "Please enter your full name.";
      if (value.length > LIMITS.name || !NAME.test(value)) return "Use letters, spaces, apostrophes or hyphens only.";
      return "";
    case "email":
      if (!value) return "Please enter your email address.";
      if (value.length > LIMITS.email || !EMAIL.test(value)) return "Please enter a valid email address.";
      return "";
    case "phone":
      return phoneError(value, fields.country);
    case "country":
      return isCountry(value) ? "" : "Please select a country.";
    case "service":
      return isService(value) ? "" : "Please choose a service.";
    case "message":
      if (value.length < LIMITS.messageMin) return `Please write at least ${LIMITS.messageMin} characters.`;
      if (value.length > LIMITS.messageMax) return `Please keep it under ${LIMITS.messageMax} characters.`;
      return "";
  }
}

export function validate(fields: ContactFields): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of Object.keys(fields) as (keyof ContactFields)[]) {
    const message = fieldError(key, fields);
    if (message) errors[key] = message;
  }
  return errors;
}

/** Parses an untrusted request body into trimmed contact fields, or null if the shape is wrong. */
export function parseFields(body: unknown): ContactFields | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  if (!isCountry(b.country) || !isService(b.service)) return null;
  return {
    fullName: text(b.fullName, LIMITS.name + 1),
    email: text(b.email, LIMITS.email + 1),
    phone: text(b.phone, 20),
    country: b.country,
    service: b.service,
    message: text(b.message, LIMITS.messageMax + 1),
  };
}
