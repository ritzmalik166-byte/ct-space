"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent, type ReactNode } from "react";
import { OtpStep } from "./OtpStep";
import {
  COUNTRIES,
  fieldError,
  LIMITS,
  localPhone,
  PHONE_RULES,
  SERVICES,
  type ContactFields,
  type Country,
  type FieldErrors,
  type Service,
} from "../lib/validation";

const EMPTY: ContactFields = { fullName: "", email: "", phone: "", country: "India", service: "AI Brand Films", message: "" };

const SERVICE_NOTES: Record<Service, string> = {
  "AI Brand Films": "Cinematic films, made faster with generative production.",
  "Digital-First Content": "Reels, shorts and social stories built for the feed.",
  "AI-Powered Campaigns": "Campaigns that learn, test and optimise themselves.",
  "Visual Identity System": "Logos, type and design systems that scale.",
  Other: "Something new? Tell us and we'll shape it together.",
};

const STEPS = [
  { title: "Project", fields: ["service"] },
  { title: "Story", fields: ["message"] },
  { title: "You", fields: ["fullName", "email", "country", "phone"] },
  { title: "Verify", fields: [] },
] as const satisfies readonly { title: string; fields: readonly (keyof ContactFields)[] }[];

type Status = "idle" | "sending" | "verifying" | "done";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: FieldErrors; cooldown?: number; retryAfter?: number };
  return { ok: res.ok, status: res.status, data };
}

function mask(phone: string, country: Country) {
  const local = localPhone(phone, country);
  return `+${PHONE_RULES[country].code} ${"•".repeat(Math.max(0, local.length - 4))}${local.slice(-4)}`;
}

/** Four-step project brief: pick a service, describe it, add contact details, verify by SMS. */
export function ContactForm() {
  const [fields, setFields] = useState<ContactFields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpAttempt, setOtpAttempt] = useState(0);
  const [otpNotice, setOtpNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const panel = useRef<HTMLFormElement>(null);

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

  const goTo = (next: number) => {
    setStep(next);
    setFormError("");
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());
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

  /** Validates the current step; returns true when it may advance. */
  const checkStep = (index: number) => {
    const found: FieldErrors = {};
    for (const name of STEPS[index].fields) {
      const message = fieldError(name, fields);
      if (message) found[name] = message;
    }
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(STEPS[index].fields.map((f) => [f, found[f] ?? ""])) }));
    const first = Object.keys(found)[0];
    if (first) panel.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
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
    if (status !== "idle" || step === 3 || !checkStep(step)) return;
    if (step < 2) return goTo(step + 1);

    setStatus("sending");
    const res = await requestCode();
    setStatus("idle");
    if (res.ok || res.status === 429) {
      setOtpError(res.ok ? "" : res.data.error ?? "");
      setOtpNotice(res.ok ? "Code sent. It expires in 5 minutes." : "");
      goTo(3);
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
    if (res.ok) setOtpNotice("A new code is on its way.");
    else setOtpError(res.data.error ?? "Couldn't resend the code.");
  };

  const onVerify = async (otp: string) => {
    setStatus("verifying");
    setOtpError("");
    setOtpNotice("");
    const res = await post("/api/contact", { ...fields, otp });
    if (res.ok) return setStatus("done");
    setStatus("idle");
    if (res.data.errors) {
      setErrors(res.data.errors);
      const back = STEPS.findIndex((s) => s.fields.some((f) => res.data.errors?.[f]));
      goTo(back === -1 ? 2 : back);
      setFormError(res.data.error ?? "Please fix the highlighted fields.");
      return;
    }
    setOtpError(res.data.error ?? "Something went wrong. Please try again.");
    setOtpAttempt((n) => n + 1);
  };

  const reset = () => {
    setFields(EMPTY);
    setErrors({});
    setStatus("idle");
    goTo(0);
  };

  if (status === "done") {
    return (
      <div role="status" className="animate-[rise_0.7s_cubic-bezier(0.22,1,0.36,1)_both] px-6 py-16 text-center sm:px-12 sm:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-300/90">Transmission received</p>
        <h3 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight tracking-[-0.03em]">
          Thanks, {fields.fullName.split(" ")[0]}. <span className="text-slate-400">We&apos;re on it.</span>
        </h3>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-400">
          Your {fields.service.toLowerCase()} brief is with our team. Expect a reply at <span className="text-white">{fields.email}</span> within 24 hours.
        </p>
        <button type="button" onClick={reset} className="mt-10 min-h-11 rounded-full px-6 text-sm text-white ring-1 ring-white/15 transition-colors hover:bg-white hover:text-space">
          Start another brief
        </button>
      </div>
    );
  }

  const input = (name: keyof ContactFields) =>
    `w-full border-b bg-transparent pb-3 pt-1 text-lg text-white placeholder:text-slate-600 outline-none transition-colors sm:text-xl ${
      errors[name] ? "border-red-400/70 focus:border-red-400" : "border-white/15 hover:border-white/30 focus:border-cyan-300"
    }`;

  return (
    <form ref={panel} noValidate onSubmit={onSubmit}>
      <Progress step={step} onJump={(i) => i < step && status === "idle" && goTo(i)} />

      <div key={step} className="animate-[rise_0.6s_cubic-bezier(0.22,1,0.36,1)_both] px-5 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-10">
        {step === 0 && (
          <StepBody title="What are we making?" lead="Pick the closest fit. You can explain the details next.">
            <fieldset>
              <legend className="sr-only">Service</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {SERVICES.map((service, i) => (
                  <ServiceTile key={service} index={i} value={service} checked={fields.service === service} onChange={onChange} autoFocus={i === 0} />
                ))}
              </div>
            </fieldset>
          </StepBody>
        )}

        {step === 1 && (
          <StepBody title="Tell us the story." lead="Goals, audience, timeline, budget range: whatever helps us understand it.">
            <label htmlFor="message" className="sr-only">
              Your message
            </label>
            <textarea
              id="message"
              name="message"
              data-autofocus
              value={fields.message}
              onChange={onChange}
              onBlur={onBlur}
              rows={6}
              maxLength={LIMITS.messageMax}
              placeholder="We're launching a new residential tower in Noida and need a brand film for…"
              aria-invalid={Boolean(errors.message)}
              aria-describedby="message-meta"
              className={`${input("message")} resize-none leading-relaxed`}
            />
            <div id="message-meta" className="mt-3 flex items-center justify-between gap-4 text-xs">
              <span className="text-red-400">{errors.message}</span>
              <span className="font-mono text-slate-500">
                {fields.message.length}/{LIMITS.messageMax}
              </span>
            </div>
          </StepBody>
        )}

        {step === 2 && (
          <StepBody title="Who should we reply to?" lead="We verify your mobile number by SMS before the brief is sent.">
            <Recap fields={fields} onEdit={goTo} />
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <Line label="Full name" name="fullName" error={errors.fullName} className="sm:col-span-2">
                <input id="fullName" name="fullName" data-autofocus value={fields.fullName} onChange={onChange} onBlur={onBlur} autoComplete="name" maxLength={LIMITS.name} placeholder="Asha Verma" aria-invalid={Boolean(errors.fullName)} className={input("fullName")} />
              </Line>
              <Line label="Email" name="email" error={errors.email}>
                <input id="email" name="email" type="email" value={fields.email} onChange={onChange} onBlur={onBlur} autoComplete="email" inputMode="email" maxLength={LIMITS.email} placeholder="asha@company.com" aria-invalid={Boolean(errors.email)} className={input("email")} />
              </Line>
              <Line label="Mobile" name="phone" error={errors.phone}>
                <div className="flex items-end gap-3">
                  <label className="relative shrink-0">
                    <span className="sr-only">Country</span>
                    <select name="country" value={fields.country} onChange={onChange} autoComplete="country-name" className={`${input("country")} cursor-pointer appearance-none pr-6 text-base sm:text-lg`}>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} className="bg-[#0a1322] text-base">
                          {c} +{PHONE_RULES[c].code}
                        </option>
                      ))}
                    </select>
                    <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute bottom-4 right-0 size-3 text-slate-400">
                      <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </label>
                  <input id="phone" name="phone" type="tel" value={fields.phone} onChange={onChange} onBlur={onBlur} autoComplete="tel-national" inputMode="tel" maxLength={PHONE_RULES[fields.country].length + 5} placeholder={PHONE_RULES[fields.country].example} aria-invalid={Boolean(errors.phone)} className={`${input("phone")} min-w-0 flex-1`} />
                </div>
              </Line>
            </div>
          </StepBody>
        )}

        {step === 3 && (
          <OtpStep
            maskedPhone={mask(fields.phone, fields.country)}
            busy={status === "verifying"}
            error={otpError}
            attempt={otpAttempt}
            notice={otpNotice}
            cooldown={cooldown}
            resending={resending}
            onVerify={onVerify}
            onResend={onResend}
            onBack={() => goTo(2)}
          />
        )}

        {formError && (
          <p role="alert" className="mt-6 text-sm text-red-400">
            {formError}
          </p>
        )}
      </div>

      {step < 3 && (
        <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] px-5 py-5 sm:px-10">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0 || status !== "idle"}
            className="text-sm text-slate-400 transition-colors hover:text-white disabled:invisible"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={status !== "idle"}
            className="group inline-flex h-12 items-center gap-3 rounded-full bg-cyan-300 pl-6 pr-2 text-sm font-semibold text-space transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? "Sending code…" : step === 2 ? "Send brief" : "Continue"}
            <span className="grid size-8 place-items-center rounded-full bg-space text-cyan-200">
              <svg viewBox="0 0 16 16" className={`size-3.5 transition-transform group-hover:translate-x-0.5 ${status === "sending" ? "animate-pulse" : ""}`} aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </div>
      )}
    </form>
  );
}

function Progress({ step, onJump }: { step: number; onJump: (index: number) => void }) {
  return (
    <ol className="grid grid-cols-4 border-b border-white/[0.06]">
      {STEPS.map((s, i) => {
        const state = i < step ? "done" : i === step ? "current" : "next";
        return (
          <li key={s.title} className="relative">
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={state !== "done"}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex w-full flex-col items-start gap-1 px-3 py-4 text-left transition-colors sm:px-6 ${state === "done" ? "cursor-pointer hover:bg-white/[0.02]" : "cursor-default"}`}
            >
              <span className={`font-mono text-[10px] tracking-[0.2em] ${state === "next" ? "text-slate-600" : "text-cyan-300"}`}>
                {state === "done" ? "✓" : String(i + 1).padStart(2, "0")}
              </span>
              <span className={`text-xs font-medium sm:text-sm ${state === "next" ? "text-slate-500" : "text-white"}`}>{s.title}</span>
            </button>
            <span
              aria-hidden
              className={`absolute inset-x-0 -bottom-px h-0.5 origin-left bg-cyan-300 transition-transform duration-500 ${i <= step ? "scale-x-100" : "scale-x-0"}`}
            />
          </li>
        );
      })}
    </ol>
  );
}

function StepBody({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <>
      <h3 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.025em]">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{lead}</p>
      <div className="mt-8">{children}</div>
    </>
  );
}

function ServiceTile({ index, value, checked, onChange, autoFocus }: { index: number; value: Service; checked: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void; autoFocus: boolean }) {
  return (
    <label
      className={`group relative flex cursor-pointer flex-col rounded-2xl p-5 transition-[background-color,box-shadow] duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-300 ${
        checked ? "bg-cyan-300/[0.08] ring-1 ring-cyan-300/60" : "bg-white/[0.02] ring-1 ring-white/[0.08] hover:bg-white/[0.04] hover:ring-white/20"
      } ${index === SERVICES.length - 1 && SERVICES.length % 2 ? "sm:col-span-2" : ""}`}
    >
      <input type="radio" name="service" value={value} checked={checked} onChange={onChange} data-autofocus={autoFocus || undefined} className="sr-only" />
      <span className="flex items-center justify-between">
        <span className={`font-mono text-[11px] tracking-[0.2em] ${checked ? "text-cyan-300" : "text-slate-500"}`}>{String(index + 1).padStart(2, "0")}</span>
        <span className={`grid size-5 place-items-center rounded-full ring-1 transition-colors ${checked ? "bg-cyan-300 ring-cyan-300" : "ring-white/20"}`}>
          {checked && (
            <svg viewBox="0 0 16 16" className="size-3 text-space" aria-hidden>
              <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </span>
      <span className="mt-6 text-base font-semibold text-white">{value}</span>
      <span className="mt-1 text-sm leading-snug text-slate-400">{SERVICE_NOTES[value]}</span>
    </label>
  );
}

function Recap({ fields, onEdit }: { fields: ContactFields; onEdit: (step: number) => void }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06] text-sm sm:grid-cols-[auto_1fr]">
      {[
        { label: "Project", value: fields.service, step: 0 },
        { label: "Story", value: fields.message, step: 1 },
      ].map((row) => (
        <div key={row.label} className="contents">
          <dt className="bg-[#0a1322] px-4 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:py-3">{row.label}</dt>
          <dd className="flex items-center justify-between gap-4 bg-[#0a1322] px-4 pb-3 sm:py-3">
            <span className="line-clamp-1 text-slate-200">{row.value}</span>
            <button type="button" onClick={() => onEdit(row.step)} className="shrink-0 text-xs text-cyan-300 hover:text-white">
              Edit
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Line({ label, name, error, className = "", children }: { label: string; name: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
