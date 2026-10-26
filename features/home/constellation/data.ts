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
    logo: { src: "/assets/pika-icon.webp", width: 200, height: 160 },
    description: "AI-powered video generation platform that creates stunning videos from text and images.",
    tone: "#f8f9fa",
  },
  {
    name: "Claude",
    mark: "Claude",
    logo: { src: "/assets/claude-icon.webp", width: 172, height: 169 },
    description: "Anthropic's AI assistant focused on being helpful, harmless, and honest.",
    tone: "#d97757",
  },
  {
    name: "ChatGPT",
    mark: "ChatGPT",
    logo: { src: "/assets/chatgpt-icon.webp", width: 190, height: 192 },
    description: "OpenAI's conversational AI that understands context and generates human-like responses.",
    tone: "#10a37f",
  },
  {
    name: "Copilot",
    mark: "Copilot",
    logo: { src: "/assets/copilot-icon.webp", width: 216, height: 187 },
    description: "Microsoft's AI coding assistant that helps developers write better code faster.",
    tone: "#60a5fa",
  },
  {
    name: "Grok",
    mark: "Grok",
    logo: { src: "/assets/grok-icon.webp", width: 183, height: 183 },
    description: "xAI's witty AI assistant with real-time knowledge and a rebellious streak.",
    tone: "#f8f9fa",
  },
  {
    name: "Gemini",
    mark: "Gemini",
    logo: { src: "/assets/gemini-icon.webp", width: 197, height: 202 },
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
