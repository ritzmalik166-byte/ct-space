"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type Dispatch,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  COUNTRIES,
  fieldError,
  LIMITS,
  localPhone,
  OTP_LENGTH,
  PHONE_RULES,
  SERVICES,
  validate,
  type ContactFields,
  type Country,
  type FieldErrors,
} from "../lib/validation";

const STEPS = ["Details", "Verify", "Submitted"] as const;
/** Codes live for 5 minutes on the server; reuse one only while it has a comfortable margin left. */
const CODE_REUSE_MS = 4 * 60_000;
type Step = 0 | 1 | 2;
type Status = "idle" | "sending" | "verifying";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: FieldErrors; cooldown?: number; retryAfter?: number };
  return { ok: res.ok, status: res.status, data };
}

function mask(phone: string, country: Country) {
  const local = localPhone(phone, country);
  return `+${PHONE_RULES[country].code} ${"•".repeat(Math.max(0, local.length - 4))}${local.slice(-4)}`;
}

type Props = {
  /** Owned by the popup so entries survive closing and reopening. */
  fields: ContactFields;
  setFields: Dispatch<SetStateAction<ContactFields>>;
  onClose: () => void;
  onSubmitted: () => void;
};

/** Compact three-step enquiry for the contact popup: details, SMS verification, confirmation. */
export function ContactPopupForm({ fields, setFields, onClose, onSubmitted }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpAttempt, setOtpAttempt] = useState(0);
  const [otpNotice, setOtpNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const sent = useRef<{ target: string; at: number } | null>(null);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const startCooldown = (seconds: number) => {
    window.clearInterval(timer.current);
    setCooldown(seconds);
    timer.current = window.setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) window.clearInterval(timer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const goTo = (next: Step) => {
    setStep(next);
    setFormError("");
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());
  };

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const name = e.target.name as keyof ContactFields;
    const next = { ...fields, [name]: e.target.value } as ContactFields;
    setFields(next);
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: fieldError(name, next) }));
    if (name === "country" && errors.phone) setErrors((prev) => ({ ...prev, phone: fieldError("phone", next) }));
  };

  const onBlur = (e: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const name = e.target.name as keyof ContactFields;
    if (fields[name]) setErrors((prev) => ({ ...prev, [name]: fieldError(name, fields) }));
  };

  const showErrors = (found: FieldErrors) => {
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) root.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    return !first;
  };

  const requestCode = async () => {
    const res = await post("/api/otp", { phone: fields.phone, country: fields.country });
    if (res.ok) startCooldown(res.data.cooldown ?? 45);
    else if (res.data.retryAfter) startCooldown(res.data.retryAfter);
    return res;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status !== "idle" || !showErrors(validate(fields))) return;

    // Coming back from the verify step with the same number reuses the code already sent.
    const target = `${fields.country}:${localPhone(fields.phone, fields.country)}`;
    if (sent.current?.target === target && Date.now() - sent.current.at < CODE_REUSE_MS) return goTo(1);

    setStatus("sending");
    setFormError("");
    const res = await requestCode();
    setStatus("idle");
    if (res.ok) sent.current = { target, at: Date.now() };
    if (res.ok || res.status === 429) {
      setOtpError(res.ok ? "" : res.data.error ?? "");
      setOtpNotice(res.ok ? "Code sent. It expires in 5 minutes." : "");
      goTo(1);
    } else if (res.data.errors) {
      showErrors(res.data.errors);
      setFormError(res.data.error ?? "Please fix the highlighted fields.");
    } else {
      setFormError(res.data.error ?? "Something went wrong. Please try again.");
    }
  };

  const onResend = async () => {
    setResending(true);
    setOtpError("");
    setOtpNotice("");
    const res = await requestCode();
    setResending(false);
    if (res.ok) sent.current = { target: `${fields.country}:${localPhone(fields.phone, fields.country)}`, at: Date.now() };
    if (res.ok) setOtpNotice("A new code is on its way.");
    else setOtpError(res.data.error ?? "Couldn't resend the code.");
  };

  const onVerify = async (otp: string) => {
    setStatus("verifying");
    setOtpError("");
    setOtpNotice("");
    const res = await post("/api/contact", { ...fields, otp });
    setStatus("idle");
    if (res.ok) {
      onSubmitted();
      return goTo(2);
    }
    if (res.data.errors) {
      goTo(0);
      showErrors(res.data.errors);
      setFormError(res.data.error ?? "Please fix the highlighted fields.");
      return;
    }
    // Expired, locked or missing codes can't be reused; the next Continue texts a fresh one.
    if (res.status === 410) sent.current = null;
    setOtpError(res.data.error ?? "Something went wrong. Please try again.");
    setOtpAttempt((n) => n + 1);
  };

  const input = (name: keyof ContactFields) =>
    `h-11 w-full rounded-xl bg-white/[0.04] px-3.5 text-[15px] text-white placeholder:text-slate-500 outline-none ring-1 transition-[box-shadow,background-color] focus:bg-white/[0.06] focus:ring-2 ${
      errors[name] ? "ring-red-400/70 focus:ring-red-400" : "ring-white/10 hover:ring-white/20 focus:ring-cyan-300"
    }`;

  return (
    <div ref={root}>
      <Progress step={step} />

      <div key={step} className="animate-[rise_0.45s_cubic-bezier(0.22,1,0.36,1)_both] px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
        {step === 0 && (
          <form noValidate onSubmit={onSubmit}>
            <div className="grid gap-x-3 gap-y-3.5 sm:grid-cols-2">
              <Field label="Full name" name="fullName" error={errors.fullName}>
                <input id="fullName" name="fullName" data-autofocus value={fields.fullName} onChange={onChange} onBlur={onBlur} autoComplete="name" maxLength={LIMITS.name} placeholder="Asha Verma" aria-invalid={Boolean(errors.fullName)} className={input("fullName")} />
              </Field>
              <Field label="Email" name="email" error={errors.email}>
                <input id="email" name="email" type="email" value={fields.email} onChange={onChange} onBlur={onBlur} autoComplete="email" inputMode="email" maxLength={LIMITS.email} placeholder="asha@company.com" aria-invalid={Boolean(errors.email)} className={input("email")} />
              </Field>
              <Field label="Mobile number" name="phone" error={errors.phone}>
                <div className="flex gap-2">
                  <label className="relative flex h-11 w-[4.75rem] shrink-0 cursor-pointer items-center rounded-xl bg-white/[0.04] pl-3 text-[15px] text-white ring-1 ring-white/10 transition-shadow hover:ring-white/20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-300">
                    <span className="sr-only">Country</span>
                    <span aria-hidden>+{PHONE_RULES[fields.country].code}</span>
                    <select name="country" value={fields.country} onChange={onChange} autoComplete="country-name" className="absolute inset-0 cursor-pointer appearance-none opacity-0">
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} className="bg-[#0a1322]">
                          {c} +{PHONE_RULES[c].code}
                        </option>
                      ))}
                    </select>
                    <Chevron />
                  </label>
                  <input id="phone" name="phone" type="tel" value={fields.phone} onChange={onChange} onBlur={onBlur} autoComplete="tel-national" inputMode="tel" maxLength={PHONE_RULES[fields.country].length + 5} placeholder={PHONE_RULES[fields.country].example} aria-invalid={Boolean(errors.phone)} className={`${input("phone")} min-w-0 flex-1`} />
                </div>
              </Field>
              <Field label="Service" name="service" error={errors.service}>
                <div className="relative">
                  <select id="service" name="service" value={fields.service} onChange={onChange} className={`${input("service")} cursor-pointer appearance-none pr-9`}>
                    {SERVICES.map((s) => (
                      <option key={s} value={s} className="bg-[#0a1322]">
                        {s}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </Field>
              <Field label="Project message" name="message" error={errors.message} className="sm:col-span-2" hint={`${fields.message.length}/${LIMITS.messageMax}`}>
                <textarea id="message" name="message" value={fields.message} onChange={onChange} onBlur={onBlur} rows={3} maxLength={LIMITS.messageMax} placeholder="Goals, timeline, budget range…" aria-invalid={Boolean(errors.message)} className={`${input("message")} h-auto resize-none py-2.5 leading-relaxed`} />
              </Field>
            </div>

            {formError && (
              <p role="alert" className="mt-4 text-sm text-red-400">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={status !== "idle"}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-sm font-semibold text-space transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "sending" ? "Sending code…" : "Continue to verification"}
              <svg viewBox="0 0 16 16" className={`size-3.5 ${status === "sending" ? "animate-pulse" : ""}`} aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">We&apos;ll text a {OTP_LENGTH}-digit code to confirm your number.</p>
          </form>
        )}

        {step === 1 && (
          <OtpPanel
            maskedPhone={mask(fields.phone, fields.country)}
            busy={status === "verifying"}
            error={otpError}
            attempt={otpAttempt}
            notice={otpNotice}
            cooldown={cooldown}
            resending={resending}
            onVerify={onVerify}
            onResend={onResend}
            onBack={() => goTo(0)}
          />
        )}

        {step === 2 && (
          <div role="status" className="py-4 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/30">
              <svg viewBox="0 0 24 24" className="size-8 text-emerald-300" aria-hidden>
                <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="animate-[draw_0.6s_0.15s_cubic-bezier(0.65,0,0.35,1)_both] [stroke-dasharray:1]" />
              </svg>
            </span>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight">Message Received</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              Thanks, {fields.fullName.trim().split(" ")[0]}. Our team will reply to <span className="text-white">{fields.email}</span> within 24 hours.
            </p>
            <button type="button" onClick={onClose} data-autofocus className="mt-7 h-11 w-full rounded-xl bg-white text-sm font-semibold text-space transition-colors hover:bg-cyan-200 sm:w-auto sm:px-10">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2 px-5 pt-4 sm:px-7" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < step || step === 2;
        const current = i === step;
        return (
          <li key={label} aria-current={current ? "step" : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors ${
                done ? "bg-cyan-300 text-space" : current ? "text-cyan-200 ring-1 ring-cyan-300" : "text-slate-500 ring-1 ring-white/15"
              }`}
            >
              {done ? (
                <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
                  <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={`text-xs font-medium ${current || done ? "text-white" : "text-slate-500"}`}>{label}</span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className="relative h-px flex-1 overflow-hidden bg-white/10">
                <span className={`absolute inset-0 origin-left bg-cyan-300 transition-transform duration-500 ${i < step ? "scale-x-100" : "scale-x-0"}`} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Field({ label, name, error, hint, className = "", children }: { label: string; name: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="text-xs font-medium text-slate-300">
          {label}
        </label>
        {hint && <span className="font-mono text-[10px] text-slate-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-slate-400">
      <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NO_DIGITS = Array.from({ length: OTP_LENGTH }, () => "");

type OtpProps = {
  maskedPhone: string;
  busy: boolean;
  error: string;
  /** Increments each time the server rejects a code, so the boxes clear even for a repeated message. */
  attempt: number;
  notice: string;
  cooldown: number;
  resending: boolean;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
};

function OtpPanel({ maskedPhone, busy, error, attempt, notice, cooldown, resending, onVerify, onResend, onBack }: OtpProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState(NO_DIGITS);

  const [seenAttempt, setSeenAttempt] = useState(attempt);
  if (seenAttempt !== attempt) {
    setSeenAttempt(attempt);
    setDigits(NO_DIGITS);
  }

  useEffect(() => {
    inputs.current[0]?.focus();
  }, [attempt]);

  const focus = (i: number) => inputs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))]?.focus();

  const fill = (raw: string, from = 0) => {
    const chars = raw.replace(/\D/g, "").split("");
    const next = [...digits];
    if (!chars.length) {
      next[from] = "";
      setDigits(next);
      return;
    }
    chars.slice(0, OTP_LENGTH - from).forEach((c, k) => (next[from + k] = c));
    setDigits(next);
    const empty = next.findIndex((d) => !d);
    focus(empty === -1 ? OTP_LENGTH - 1 : empty);
    if (empty === -1 && !busy) onVerify(next.join(""));
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      focus(i - 1);
    } else if (e.key === "ArrowLeft") focus(i - 1);
    else if (e.key === "ArrowRight") focus(i + 1);
    else if (e.key === "Enter" && digits.every(Boolean) && !busy) onVerify(digits.join(""));
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    fill(e.clipboardData.getData("text"));
  };

  const complete = digits.every(Boolean);

  return (
    <div className="text-center">
      <button type="button" onClick={onBack} disabled={busy} className="-ml-1 flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-40">
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <path d="M13 8H3m4-4L3 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Verify your number</h3>
      <p className="mt-1.5 text-sm text-slate-400">
        Enter the {OTP_LENGTH}-digit code sent to <span className="font-medium text-white">{maskedPhone}</span>
      </p>

      <fieldset disabled={busy} className="mt-6">
        <legend className="sr-only">Verification code</legend>
        <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={onPaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={digit}
              onChange={(e) => fill(e.target.value.slice(-1), i)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={Boolean(error)}
              className={`size-14 rounded-xl bg-white/[0.04] text-center text-2xl font-semibold text-white outline-none ring-1 transition-[box-shadow,background-color] focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-300 disabled:opacity-50 sm:size-16 ${
                error ? "ring-red-400/70" : digit ? "ring-white/40" : "ring-white/10"
              }`}
            />
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className={`mt-4 min-h-5 text-sm ${error ? "text-red-400" : "text-emerald-400"}`}>
        {busy ? "Verifying…" : error || notice}
      </p>

      <button
        type="button"
        onClick={() => onVerify(digits.join(""))}
        disabled={busy || !complete}
        className="mt-4 h-12 w-full rounded-xl bg-cyan-300 text-sm font-semibold text-space transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Verifying…" : "Verify & submit"}
      </button>

      <p className="mt-4 text-sm text-slate-500">
        Didn&apos;t get it?{" "}
        <button type="button" onClick={onResend} disabled={busy || resending || cooldown > 0} className="font-medium text-cyan-300 transition-colors hover:text-white disabled:text-slate-500">
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </div>
  );
}
