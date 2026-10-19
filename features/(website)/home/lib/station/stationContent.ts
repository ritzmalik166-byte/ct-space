/**
 * Section 3 content. Screen categories, copy, posters and video URLs live here;
 * the 3D scene, hotspots and projector read everything from this file.
 *
 * Thumbnails are poster frames taken from the videos below.
 */

export interface StationCta {
  label: string;
  href: string;
}

export interface StationVideo {
  /** YouTube / Vimeo page or embed URL, or a direct .mp4 / .webm file. Anything else opens in a new tab. */
  url: string;
  /** Accessible title for the player. */
  title: string;
}

export interface StationScreenContent {
  id: string;
  /** Heading on the screen and the projection. */
  category: string;
  /** Optional tag printed on the screen bezel, e.g. "Featured Reel". */
  label?: string;
  description: string;
  /** 16:9 poster shown on the 3D screen and before playback. */
  thumbnail: string;
  /** Light colour used for the screen glow and projection accents. */
  accent: "gold" | "cyan";
  video: StationVideo;
}

export interface StationGateBrand {
  /** Primary message; words listed in `highlight` get the gold gradient. */
  message: string;
  highlight: readonly string[];
  headline: string;
  /** Transparent brand mark drawn under the text. */
  logo: string;
}

/** Same destination as the hero "Start a Project" CTAs. */
export const STATION_CONTACT: StationCta = { label: "Contact Us", href: "#contact" };

export const STATION_GATE_BRAND: StationGateBrand = {
  message: "AI Story Telling Agency & AI Creative Studio",
  highlight: ["Story", "Telling", "Creative", "Studio"],
  headline: "AI is changing so fast in 2026",
  logo: "/assets/brand/contenaissance-mark.png",
};

const CT_ASSETS = "https://contenaissance.blob.core.windows.net/ct-assets";

export const STATION_SCREENS: readonly StationScreenContent[] = [
  {
    id: "brand-films",
    category: "Brand Films",
    label: "Featured Reel",
    description: "Cinematic storytelling",
    thumbnail: "/assets/station/thumbs/brand-films.jpg",
    accent: "gold",
    video: { url: `${CT_ASSETS}/01.mp4`, title: "Brand Films" },
  },
  {
    id: "commercials",
    category: "Commercials",
    label: "Featured Reel",
    description: "Ad campaigns that convert",
    thumbnail: "/assets/station/thumbs/commercials.jpg",
    accent: "cyan",
    video: { url: `${CT_ASSETS}/02.MP4`, title: "Commercials" },
  },
  {
    id: "social-content",
    category: "Social Content",
    description: "Viral-worthy reels",
    thumbnail: "/assets/station/thumbs/social-content.jpg",
    accent: "cyan",
    video: { url: `${CT_ASSETS}/03.mp4`, title: "Social Content" },
  },
  {
    id: "documentary",
    category: "Documentary",
    label: "Featured Reel",
    description: "Stories that matter",
    thumbnail: "/assets/station/thumbs/documentary.jpg",
    accent: "gold",
    video: { url: `${CT_ASSETS}/09.mp4`, title: "Documentary" },
  },
  {
    id: "music-videos",
    category: "Music Videos",
    description: "Visual rhythms",
    thumbnail: "/assets/station/thumbs/music-videos.jpg",
    accent: "gold",
    video: { url: `${CT_ASSETS}/05.MP4`, title: "Music Videos" },
  },
];
