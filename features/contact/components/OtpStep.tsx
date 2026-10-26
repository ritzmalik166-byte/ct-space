"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { OTP_LENGTH } from "../lib/validation";

type Props = {
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

const EMPTY = Array.from({ length: OTP_LENGTH }, () => "");

/** Inline verification step: the code is entered in the brief panel itself, not in a modal. */
export function OtpStep({ maskedPhone, busy, error, attempt, notice, cooldown, resending, onVerify, onResend, onBack }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState(EMPTY);

  const [seenAttempt, setSeenAttempt] = useState(attempt);
  if (seenAttempt !== attempt) {
    setSeenAttempt(attempt);
    setDigits(EMPTY);
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

  return (
    <div className="text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/25">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <path d="M10.5 18.5h3" />
        </svg>
      </span>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight">Check your phone</h3>
      <p className="mt-2 text-sm text-slate-400">
        We sent a {OTP_LENGTH}-digit code to <span className="font-medium text-white">{maskedPhone}</span>
      </p>

      <fieldset disabled={busy} className="mt-8">
        <legend className="sr-only">Verification code</legend>
        <div className="flex justify-center gap-3 sm:gap-4" onPaste={onPaste}>
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
              className={`h-16 w-14 border-b-2 bg-transparent text-center text-3xl font-semibold text-white outline-none transition-colors focus:border-cyan-300 disabled:opacity-50 sm:w-16 ${
                error ? "border-red-400" : digit ? "border-white/60" : "border-white/15"
              }`}
            />
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className={`mt-5 min-h-5 text-sm ${error ? "text-red-400" : "text-emerald-400"}`}>
        {busy ? "Verifying…" : error || notice}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
        <button type="button" onClick={onBack} disabled={busy} className="text-slate-400 transition-colors hover:text-white disabled:opacity-40">
          ← Change number
        </button>
        <span aria-hidden className="h-4 w-px bg-white/15" />
        <button
          type="button"
          onClick={onResend}
          disabled={busy || resending || cooldown > 0}
          className="font-medium text-cyan-300 transition-colors hover:text-white disabled:text-slate-500"
        >
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
