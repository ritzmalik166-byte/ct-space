import { assetUrl } from "@/features/home/lib/assets";

export type Partner = {
  name: string;
  /** Wordmark shown when there is no logo, or while the logo file is missing. */
  mark: string;
  logo?: { src: string; width: number; height: number };
  description?: string;
  tone: string;
};

export type Orbit = {
  /** Stadium size in viewBox units. */
  w: number;
  h: number;
  opacity: number;
  /** Seconds for a partner to complete one lap. */
  lap: number;
  /** Seconds for the dashed line to flow one cycle. */
  dash: number;
  reverse: boolean;
  partners: Partner[];
};

const AI_TOOLS: Partner[] = [
  {
    name: "Pika",
    mark: "Pika",
    logo: { src: assetUrl("pika.png"), width: 164, height: 57 },
    description: "AI-powered video generation platform that creates stunning videos from text and images.",
    tone: "#f8f9fa",
  },
  {
    name: "Claude",
    mark: "Claude",
    logo: { src: "/assets/claude.png", width: 160, height: 56 },
    description: "Anthropic's AI assistant focused on being helpful, harmless, and honest.",
    tone: "#d97757",
  },
  {
    name: "ChatGPT",
    mark: "ChatGPT",
    logo: { src: "/assets/chatgpt.png", width: 160, height: 56 },
    description: "OpenAI's conversational AI that understands context and generates human-like responses.",
    tone: "#10a37f",
  },
  {
    name: "Copilot",
    mark: "Copilot",
    logo: { src: assetUrl("copilot.png"), width: 181, height: 50 },
    description: "Microsoft's AI coding assistant that helps developers write better code faster.",
    tone: "#60a5fa",
  },
  {
    name: "Grok",
    mark: "Grok",
    logo: { src: assetUrl("grok.png"), width: 156, height: 57 },
    description: "xAI's witty AI assistant with real-time knowledge and a rebellious streak.",
    tone: "#f8f9fa",
  },
  {
    name: "Gemini",
    mark: "Gemini",
    logo: { src: assetUrl("gemini.png"), width: 194, height: 87 },
    description: "Google's multimodal AI model capable of understanding text, images, and code.",
    tone: "#8ab4f8",
  },
];

/** Tilted stadium orbits around (500, 310); partners ride each one, evenly spaced. */
export const ORBITS: Orbit[] = [
  { w: 560, h: 330, opacity: 0.55, lap: 70, dash: 18, reverse: false, partners: AI_TOOLS.slice(0, 2) },
  { w: 780, h: 460, opacity: 0.4, lap: 95, dash: 26, reverse: true, partners: AI_TOOLS.slice(2, 4) },
  { w: 960, h: 580, opacity: 0.28, lap: 120, dash: 34, reverse: false, partners: AI_TOOLS.slice(4, 6) },
];

export const ALL_PARTNERS = ORBITS.flatMap((orbit) => orbit.partners);
