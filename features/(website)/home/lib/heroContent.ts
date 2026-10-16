export type HeroStateId = "galaxy" | "robot" | "spaceship";

export interface HeroCta {
  label: string;
  href: string;
}

export interface HeroStateContent {
  id: HeroStateId;
  eyebrow: string;
  heading: string;
  /** Single heading word rendered in the brand gold gradient. */
  highlight?: string;
  description: string;
  primaryCta: HeroCta;
  secondaryCta: HeroCta;
}

/** Ordered narrative states. The order must match the particle morph order. */
export const HERO_STATES: readonly HeroStateContent[] = [
  {
    id: "galaxy",
    eyebrow: "Cosmic Storytelling",
    heading: "A Storytelling Universe in Orbit",
    highlight: "Universe",
    description:
      "Transform bold ideas into extraordinary digital experiences through intelligent creativity, cinematic storytelling, and next-generation technology.",
    primaryCta: { label: "Explore Our Universe", href: "#universe" },
    secondaryCta: { label: "Start a Project", href: "#contact" },
  },
  {
    id: "robot",
    eyebrow: "Creative Intelligence",
    heading: "Where Intelligence Becomes Imagination",
    description:
      "Connect human creativity with intelligent systems to transform ambitious ideas into meaningful, immersive experiences.",
    primaryCta: { label: "Explore AI Creativity", href: "#ai-creativity" },
    secondaryCta: { label: "Let's Collaborate", href: "#contact" },
  },
  {
    id: "spaceship",
    eyebrow: "The Next Frontier",
    heading: "Beyond the Limits of Imagination",
    description:
      "Launch your next big idea into a new dimension of digital storytelling, creative technology, and limitless possibility.",
    primaryCta: { label: "Discover What's Possible", href: "#possibilities" },
    secondaryCta: { label: "Launch a Project", href: "#contact" },
  },
];
