import type { ReactNode } from "react";
import { CONTACT_TRIGGER_ATTR } from "../lib/popup";
import type { Service } from "../lib/validation";

const VARIANTS = {
  primary: "bg-white text-space hover:bg-cyan-200",
  accent: "bg-cyan-300 text-space hover:bg-cyan-200",
  outline: "text-white ring-1 ring-white/20 hover:bg-white hover:text-space",
} as const;

/**
 * Opens the site-wide contact popup. Works in server components: the popup listens for clicks on
 * `data-open-contact`, so no client JavaScript ships with the button itself.
 */
export function ContactButton({
  children = "Start a project",
  service,
  variant = "primary",
  className = "",
}: {
  children?: ReactNode;
  service?: Service;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <button
      type="button"
      {...{ [CONTACT_TRIGGER_ATTR]: service ?? "" }}
      aria-haspopup="dialog"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
