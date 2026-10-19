/**
 * Portfolio partners shown in the solar-system section.
 *
 * Names follow the Section 02 design reference. Apart from Contenaissance, the
 * taglines, descriptions, expertise and links are placeholders (`placeholder: true`)
 * until approved partner content is supplied. Add a row to introduce another
 * planet — the orbit, scroll length, labels, panel and selector follow this list.
 */

export type PlanetKind = "mars" | "earth" | "ringed" | "volcanic" | "ice" | "rocky" | "gasGiant";

export interface PortfolioPartner {
  id: string;
  name: string;
  tagline: string;
  description: string;
  expertise: readonly string[];
  ctaLabel: string;
  href: string;
  planet: PlanetKind;
  /** World radius before the active-planet emphasis (desktop framing). */
  radius: number;
  /** Optional logo shown in the active-partner panel. */
  logo?: string;
  placeholder: boolean;
}

const PLACEHOLDER_COPY = "Partner summary to be supplied. Replace this with the approved description and case-study link.";

export const PORTFOLIO_PARTNERS: readonly PortfolioPartner[] = [
  {
    id: "innovatech",
    name: "Innovatech",
    tagline: "Partner tagline",
    description: PLACEHOLDER_COPY,
    expertise: [],
    ctaLabel: "View case study",
    href: "#contact",
    planet: "mars",
    radius: 0.46,
    placeholder: true,
  },
  {
    id: "datafy",
    name: "Datafy",
    tagline: "Partner tagline",
    description: PLACEHOLDER_COPY,
    expertise: [],
    ctaLabel: "View case study",
    href: "#contact",
    planet: "earth",
    radius: 0.5,
    placeholder: true,
  },
  {
    id: "cloudmind",
    name: "Cloudmind",
    tagline: "Partner tagline",
    description: PLACEHOLDER_COPY,
    expertise: [],
    ctaLabel: "View case study",
    href: "#contact",
    planet: "ringed",
    radius: 0.52,
    placeholder: true,
  },
  {
    id: "contenaissance",
    name: "Contenaissance",
    tagline: "The Cosmic Storytellers",
    description:
      "We craft intelligent digital experiences that combine creativity, technology, and strategy to help brands grow in the digital universe.",
    expertise: ["AI Solutions", "Web Development", "Digital Strategy"],
    ctaLabel: "View case study",
    href: "#contact",
    planet: "volcanic",
    radius: 0.62,
    logo: "/assets/brand/contenaissance-mark.png",
    placeholder: false,
  },
  {
    id: "pixelnexus",
    name: "PixelNexus",
    tagline: "Partner tagline",
    description: PLACEHOLDER_COPY,
    expertise: [],
    ctaLabel: "View case study",
    href: "#contact",
    planet: "ice",
    radius: 0.5,
    placeholder: true,
  },
  {
    id: "codeorb",
    name: "CodeOrb",
    tagline: "Partner tagline",
    description: PLACEHOLDER_COPY,
    expertise: [],
    ctaLabel: "View case study",
    href: "#contact",
    planet: "rocky",
    radius: 0.44,
    placeholder: true,
  },
  {
    id: "digilytix",
    name: "Digilytix",
    tagline: "Partner tagline",
    description: PLACEHOLDER_COPY,
    expertise: [],
    ctaLabel: "View case study",
    href: "#contact",
    planet: "gasGiant",
    radius: 0.54,
    placeholder: true,
  },
];

/** Partner the carousel opens on (the reference frames Contenaissance as active). */
export const INITIAL_PARTNER_INDEX = Math.max(
  0,
  PORTFOLIO_PARTNERS.findIndex((partner) => partner.id === "contenaissance"),
);
