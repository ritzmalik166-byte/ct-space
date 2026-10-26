import type { Service } from "./validation";

export const CONTACT_OPEN_EVENT = "contact:open";
/** Add to any element (server or client component) to open the popup on click; an optional value preselects a service. */
export const CONTACT_TRIGGER_ATTR = "data-open-contact";

export type ContactOpenOptions = { service?: Service };

/** Opens the site-wide contact popup from anywhere in client code. */
export function openContact(options: ContactOpenOptions = {}) {
  window.dispatchEvent(new CustomEvent<ContactOpenOptions>(CONTACT_OPEN_EVENT, { detail: options }));
}
