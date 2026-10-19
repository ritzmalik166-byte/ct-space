import type { PlanetKind } from "../portfolioPartners";

const TEXTURES = "/assets/space/textures";

/** Full-size maps on desktop, half-size (`1k/`) on mobile. */
export function textureUrl(file: string, mobile: boolean) {
  return mobile ? `${TEXTURES}/1k/${file}` : `${TEXTURES}/${file}`;
}

export interface PlanetPreset {
  albedo: string;
  normal?: string;
  roughness?: string;
  emissive?: string;
  clouds?: string;
  ring?: { inner: number; outer: number; tint: string; opacity: number; tilt: [number, number, number] };
  atmosphere?: { color: string; strength: number };
  normalScale: number;
  roughnessValue: number;
  metalness: number;
  emissiveIntensity?: number;
  /** Radians per second around the planet's own axis. */
  spin: number;
  axialTilt: number;
  thumb: string;
}

export const PLANET_PRESETS: Record<PlanetKind, PlanetPreset> = {
  mars: {
    albedo: "mars-albedo.jpg",
    normal: "mars-normal.jpg",
    roughness: "mars-roughness.jpg",
    atmosphere: { color: "#d88a5a", strength: 0.35 },
    normalScale: 1.1,
    roughnessValue: 1,
    metalness: 0,
    spin: 0.05,
    axialTilt: 0.44,
    thumb: "/assets/space/thumbs/mars.webp",
  },
  earth: {
    albedo: "earth-albedo.jpg",
    normal: "earth-normal.jpg",
    roughness: "earth-roughness.jpg",
    clouds: "earth-clouds.jpg",
    atmosphere: { color: "#6fb6ff", strength: 0.9 },
    normalScale: 0.8,
    roughnessValue: 1,
    metalness: 0,
    spin: 0.045,
    axialTilt: 0.41,
    thumb: "/assets/space/thumbs/earth.webp",
  },
  ringed: {
    albedo: "ringed-planet-albedo.jpg",
    ring: { inner: 1.3, outer: 2.25, tint: "#f3e3c2", opacity: 0.95, tilt: [1.2, 0.12, 0.38] },
    atmosphere: { color: "#f2d6a0", strength: 0.3 },
    normalScale: 0,
    roughnessValue: 0.85,
    metalness: 0,
    spin: 0.06,
    axialTilt: 0.47,
    thumb: "/assets/space/thumbs/ringed.webp",
  },
  volcanic: {
    albedo: "volcanic-planet-albedo.jpg",
    normal: "volcanic-planet-normal.jpg",
    roughness: "volcanic-planet-roughness.jpg",
    emissive: "volcanic-planet-emissive.jpg",
    atmosphere: { color: "#ffb347", strength: 1.0 },
    normalScale: 1.4,
    roughnessValue: 1,
    metalness: 0.45,
    emissiveIntensity: 1.6,
    spin: 0.04,
    axialTilt: 0.2,
    thumb: "/assets/space/thumbs/volcanic.webp",
  },
  ice: {
    albedo: "ice-planet-albedo.jpg",
    normal: "ice-planet-normal.jpg",
    roughness: "ice-planet-roughness.jpg",
    atmosphere: { color: "#b9d4ff", strength: 0.55 },
    normalScale: 0.9,
    roughnessValue: 1,
    metalness: 0.05,
    spin: 0.035,
    axialTilt: 0.3,
    thumb: "/assets/space/thumbs/ice.webp",
  },
  rocky: {
    albedo: "rocky-planet-albedo.jpg",
    normal: "rocky-planet-normal.jpg",
    roughness: "rocky-planet-roughness.jpg",
    normalScale: 1.2,
    roughnessValue: 1,
    metalness: 0,
    spin: 0.03,
    axialTilt: 0.12,
    thumb: "/assets/space/thumbs/rocky.webp",
  },
  gasGiant: {
    albedo: "gas-giant-albedo.jpg",
    ring: { inner: 1.35, outer: 2.05, tint: "#e2cfae", opacity: 0.7, tilt: [1.28, -0.1, -0.3] },
    atmosphere: { color: "#f0cf9c", strength: 0.35 },
    normalScale: 0,
    roughnessValue: 0.85,
    metalness: 0,
    spin: 0.08,
    axialTilt: 0.05,
    thumb: "/assets/space/thumbs/gas-giant.webp",
  },
};
