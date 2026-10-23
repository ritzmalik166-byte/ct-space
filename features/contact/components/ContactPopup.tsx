"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { lockScroll } from "@/lib/scroll";
import { CONTACT_OPEN_EVENT, CONTACT_TRIGGER_ATTR, type ContactOpenOptions } from "../lib/popup";
import { isService, type ContactFields } from "../lib/validation";

const INITIAL_FIELDS: ContactFields = { fullName: "", email: "", phone: "", country: "India", service: "AI Brand Films", message: "" };

// The form and its validation only download the first time the popup opens.
const ContactPopupForm = dynamic(() => import("./ContactPopupForm").then((m) => m.ContactPopupForm), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="space-y-3.5 px-5 pb-7 pt-5 sm:px-7">
      <div className="h-6 rounded-full bg-white/[0.04]" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-11 rounded-xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-24 rounded-xl bg-white/[0.04]" />
      <div className="h-12 rounded-xl bg-white/[0.06]" />
    </div>
  ),
});

/**
 * Site-wide contact popup, mounted once in the root layout. Open it with `openContact()`, or add
 * `data-open-contact` (optionally `="AI Brand Films"`) to any button or link.
 */
export function ContactPopup() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fields, setFields] = useState<ContactFields>(INITIAL_FIELDS);
  const [formKey, setFormKey] = useState(0);
  const submitted = useRef(false);

  useEffect(() => {
    const show = ({ service }: ContactOpenOptions) => {
      // After a successful enquiry, reopening starts a fresh one but keeps the contact details.
      if (submitted.current) {
        submitted.current = false;
        setFields((f) => ({ ...f, message: "" }));
        setFormKey((k) => k + 1);
      }
      if (service) setFields((f) => ({ ...f, service }));
      setMounted(true);
      setOpen(true);
    };

    const onEvent = (e: Event) => show((e as CustomEvent<ContactOpenOptions>).detail ?? {});

    // Capture phase runs before Next's <Link> handler, so `href` stays as a no-JS fallback.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const trigger = (e.target as Element | null)?.closest?.(`[${CONTACT_TRIGGER_ATTR}]`);
      if (!trigger) return;
      e.preventDefault();
      const value = trigger.getAttribute(CONTACT_TRIGGER_ATTR);
      show({ service: isService(value) ? value : undefined });
    };

    window.addEventListener(CONTACT_OPEN_EVENT, onEvent);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(CONTACT_OPEN_EVENT, onEvent);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (!open) {
      if (el.open) el.close();
      return;
    }
    if (!el.open) el.showModal();
    el.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    lockScroll(true);
    return () => lockScroll(false);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="contact-popup-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="mb-0 mt-auto max-h-none w-full max-w-none overflow-hidden rounded-t-3xl border border-b-0 border-white/10 bg-[#08101d] p-0 text-white shadow-[0_-30px_80px_-20px_rgb(0_0_0/0.8)] backdrop:bg-[#02040a]/80 open:animate-[sheet-up_0.45s_cubic-bezier(0.22,1,0.36,1)] backdrop:open:animate-[fade-in_0.3s_ease-out] sm:m-auto sm:max-w-[34rem] sm:rounded-3xl sm:border-b sm:shadow-[0_50px_120px_-40px_rgb(0_0_0/0.9),0_0_80px_-40px_rgb(34_211_238/0.35)] sm:open:animate-[pop-in_0.35s_cubic-bezier(0.22,1,0.36,1)]"
    >
      <div data-lenis-prevent className="max-h-[92svh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] sm:max-h-[90svh] sm:pb-0">
        <div className="relative flex items-center justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
          <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/15 sm:hidden" />
          <div>
            <h2 id="contact-popup-title" className="text-lg font-semibold tracking-tight sm:text-xl">
              Let&apos;s talk about your project
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <span aria-hidden className="size-1.5 rounded-full bg-emerald-400" />
              Replies within 24 hours
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full text-slate-400 ring-1 ring-white/10 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {mounted && (
          <ContactPopupForm
            key={formKey}
            fields={fields}
            setFields={setFields}
            onClose={close}
            onSubmitted={() => {
              submitted.current = true;
            }}
          />
        )}
      </div>
    </dialog>
  );
}
