import type { Service } from "@/features/contact/lib/validation";

export type Slide = { service: Service; title: string; body: string; bg: string; figure: string; tint: string };

export const SLIDES: Slide[] = [
  {
    service: "AI Brand Films",
    title: "AI Brand Films",
    body: "Discover how to turn your brand story into a cinematic experience via AI-driven 3D technology. We use generative AI to make brand films with dynamic live action in a synthetic environment that boosts your brand and captures imagination!",
    bg: "/images/services/brand-films-bg.webp",
    figure: "/images/services/brand-films-figure.webp",
    tint: "from-slate-700 to-slate-950",
  },
  {
    service: "Digital-First Content",
    title: "Digital-First Content",
    body: "Reels, shorts and social stories built for the feed. We pair generative visuals with sharp editing so every post stops the scroll and stays on brand, at the pace your channels demand.",
    bg: "/images/services/digital-content-bg.webp",
    figure: "/images/services/digital-content-figure1.webp",
    tint: "from-indigo-900 to-slate-950",
  },
  {
    service: "AI-Powered Campaigns",
    title: "AI-Powered Campaigns",
    body: "Campaigns that learn, test and optimise themselves. We generate creative variations at scale, measure what lands and keep refining, so your budget follows the ideas that actually work.",
    figure: "/images/services/campaigns-bg.webp",
    bg: "/images/services/campaigns-figure.webp",
    tint: "from-cyan-900 to-slate-950",
  },
  {
    service: "Visual Identity System",
    title: "Visual Identity System",
    body: "Logos, type and design systems that scale. We explore hundreds of directions with AI, then craft the one that fits into a complete identity your team can use everywhere.",
    bg: "/images/services/identity-bg.webp",
    figure: "/images/services/identity-figure.webp",
    tint: "from-amber-900 to-slate-950",
  },
];
