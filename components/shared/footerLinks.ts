export type FooterLink = { label: string; href: string };

export const EXPLORE: FooterLink[] = [
  { label: "Work", href: "/#archive" },
  { label: "Capabilities", href: "/#creative-services" },
  { label: "Our approach", href: "/#how-we-think" },
];

export const CONNECT: FooterLink[] = [{ label: "Start a mission", href: "/contact" }];

/** Icon paths are drawn on a 24×24 grid. */
export const SOCIALS: (FooterLink & { icon: string })[] = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/contenaissance",
    icon: "M20.45 2H3.55C2.7 2 2 2.7 2 3.55v16.9C2 21.3 2.7 22 3.55 22h16.9c.85 0 1.55-.7 1.55-1.55V3.55C22 2.7 21.3 2 20.45 2ZM8.06 19.04H5.09V9.5h2.97v9.54ZM6.58 8.2a1.72 1.72 0 1 1 0-3.44 1.72 1.72 0 0 1 0 3.44Zm12.46 10.84h-2.96v-4.64c0-1.1-.02-2.53-1.54-2.53-1.55 0-1.78 1.2-1.78 2.45v4.72H9.8V9.5h2.84v1.3h.04c.4-.75 1.37-1.54 2.81-1.54 3 0 3.56 1.98 3.56 4.55v5.23Z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/contenaissance",
    icon: "M16.5 2h-9A5.5 5.5 0 0 0 2 7.5v9A5.5 5.5 0 0 0 7.5 22h9a5.5 5.5 0 0 0 5.5-5.5v-9A5.5 5.5 0 0 0 16.5 2ZM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm5.6-9.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Contenaissance/61579738437856",
    icon: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z",
  },
];

export const LEGAL: FooterLink[] = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Legal notice", href: "/legal" },
];
