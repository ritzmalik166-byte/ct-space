"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  TextureLoader,
  Vector3,
  type Texture,
} from "three";
import { PORTFOLIO_PARTNERS, type PlanetKind } from "../../../lib/portfolioPartners";
import { PLANET_PRESETS, textureUrl } from "../../../lib/voyage/planetPresets";
import type { VoyageLayout } from "../../../lib/voyage/voyageLayout";
import NebulaSky from "./NebulaSky";
import PortfolioPlanet, { type PlanetTextures } from "./PortfolioPlanet";
import SunBody from "./SunBody";

interface SolarSystemProps {
  layout: VoyageLayout;
  reduceMotion: boolean;
  isMobile: boolean;
  labelsRoot?: RefObject<HTMLElement | null>;
}

const SAMPLES = 180;
/** Concentric orbits around the partner orbit (scale 1); only the partner orbit is bright. */
const ORBITS: Array<[scale: number, opacity: number]> = [
  [0.58, 0.07],
  [0.79, 0.1],
  [1, 0.3],
  [1.22, 0.11],
  [1.46, 0.06],
];

const SRGB_ROLES = new Set(["albedo", "emissive"]);

interface TextureEntry {
  url: string;
  role: string;
  kind?: PlanetKind;
  equirect: boolean;
}

/** Colour maps are sRGB, data maps linear; equirectangular maps wrap horizontally. */
function configureTextures(plan: TextureEntry[], loaded: Texture[], anisotropy: number) {
  const kinds = {} as Record<PlanetKind, PlanetTextures>;
  plan.forEach((entry, i) => {
    const texture = loaded[i];
    texture.colorSpace = SRGB_ROLES.has(entry.role) ? SRGBColorSpace : NoColorSpace;
    texture.anisotropy = anisotropy;
    texture.wrapS = entry.equirect ? RepeatWrapping : ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.needsUpdate = true;
    if (entry.kind) {
      kinds[entry.kind] ??= {} as PlanetTextures;
      (kinds[entry.kind] as unknown as Record<string, Texture>)[entry.role] = texture;
    }
  });
  return { sun: loaded[0], sky: loaded[1], ring: loaded[2], byKind: kinds };
}

function OrbitLines({ layout }: { layout: VoyageLayout }) {
  const lines = useMemo(
    () =>
      ORBITS.map(([, opacity]) => {
        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new BufferAttribute(new Float32Array(SAMPLES * 3), 3));
        const material = new LineBasicMaterial({ color: "#d4ac62", transparent: true, opacity: 0, depthWrite: false });
        const line = new LineLoop(geometry, material);
        line.frustumCulled = false;
        line.userData.opacity = opacity;
        return line;
      }),
    [],
  );
  const point = useMemo(() => new Vector3(), []);

  useEffect(
    () => () => {
      for (const line of lines) {
        line.geometry.dispose();
        (line.material as LineBasicMaterial).dispose();
      }
    },
    [lines],
  );

  useFrame(() => {
    const visible = layout.reveal > 0.01;
    lines.forEach((line, k) => {
      line.visible = visible;
      if (!visible) return;
      const scale = ORBITS[k][0];
      const attribute = line.geometry.getAttribute("position") as BufferAttribute;
      const array = attribute.array as Float32Array;
      for (let i = 0; i < SAMPLES; i++) {
        layout.orbitPoint((i / SAMPLES) * Math.PI * 2, scale, point);
        array[i * 3] = point.x;
        array[i * 3 + 1] = point.y;
        array[i * 3 + 2] = point.z;
      }
      attribute.needsUpdate = true;
      (line.material as LineBasicMaterial).opacity = layout.reveal * line.userData.opacity;
    });
  });

  return (
    <>
      {lines.map((line, k) => (
        <primitive key={k} object={line} />
      ))}
    </>
  );
}

/** Positions the HTML planet labels over their 3D planets (DOM writes only, no React state). */
function PlanetLabels({ layout, labelsRoot }: { layout: VoyageLayout; labelsRoot: RefObject<HTMLElement | null> }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const labels = useRef<HTMLElement[]>([]);
  const point = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const root = labelsRoot.current;
    if (!root) return;
    if (labels.current.length !== PORTFOLIO_PARTNERS.length) {
      labels.current = Array.from(root.querySelectorAll<HTMLElement>("[data-planet-label]"));
    }
    labels.current.forEach((label, i) => {
      let vis = layout.visibility[i] * layout.reveal;
      if (layout.isBehindSun(i)) {
        const d = Math.hypot(layout.positions[i].x - layout.sun.x, layout.positions[i].y - layout.sun.y);
        vis *= MathUtils.smoothstep(d, layout.sunRadius * 0.8, layout.sunRadius * 1.1);
      }
      if (vis < 0.02) {
        label.style.opacity = "0";
        return;
      }
      point.copy(layout.positions[i]);
      point.y += layout.radii[i] * 1.18 + 0.08;
      point.project(camera);
      const x = (point.x * 0.5 + 0.5) * size.width;
      const y = (-point.y * 0.5 + 0.5) * size.height;
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      label.style.opacity = vis.toFixed(3);
    });
  });

  return null;
}

export default function SolarSystem({ layout, reduceMotion, isMobile, labelsRoot }: SolarSystemProps) {
  const gl = useThree((state) => state.gl);

  const plan = useMemo(() => {
    const entries: TextureEntry[] = [
      { url: textureUrl("sun-surface.jpg", isMobile), role: "albedo", equirect: true },
      { url: textureUrl("milky-way.jpg", isMobile), role: "albedo", equirect: true },
      { url: "/assets/space/textures/planet-ring.png", role: "albedo", equirect: false },
    ];
    const kinds = Array.from(new Set(PORTFOLIO_PARTNERS.map((partner) => partner.planet)));
    for (const kind of kinds) {
      const preset = PLANET_PRESETS[kind];
      for (const role of ["albedo", "normal", "roughness", "emissive", "clouds"] as const) {
        const file = preset[role];
        if (file) entries.push({ url: textureUrl(file, isMobile), role, kind, equirect: true });
      }
    }
    return entries;
  }, [isMobile]);

  const urls = useMemo(() => plan.map((entry) => entry.url), [plan]);
  const loaded = useLoader(TextureLoader, urls) as Texture[];

  const { sun, sky, ring, byKind } = useMemo(
    () => configureTextures(plan, loaded, Math.min(8, gl.capabilities.getMaxAnisotropy())),
    [gl, loaded, plan],
  );

  useEffect(
    () => () => {
      for (const texture of loaded) texture.dispose();
      useLoader.clear(TextureLoader, urls);
    },
    [loaded, urls],
  );

  const sphere = useMemo(() => new SphereGeometry(1, isMobile ? 48 : 96, isMobile ? 32 : 64), [isMobile]);
  useEffect(() => () => sphere.dispose(), [sphere]);

  return (
    <>
      <NebulaSky layout={layout} map={sky} />
      <OrbitLines layout={layout} />
      <SunBody layout={layout} map={sun} isMobile={isMobile} />
      {PORTFOLIO_PARTNERS.map((partner, index) => (
        <PortfolioPlanet
          key={partner.id}
          index={index}
          partner={partner}
          preset={PLANET_PRESETS[partner.planet]}
          textures={byKind[partner.planet]}
          ringMap={ring}
          layout={layout}
          sphere={sphere}
          reduceMotion={reduceMotion}
        />
      ))}
      {labelsRoot ? <PlanetLabels layout={layout} labelsRoot={labelsRoot} /> : null}
    </>
  );
}
