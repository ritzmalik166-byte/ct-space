"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { HERO_VIDEO_SRC, INTRO_DONE_EVENT, motion, mulberry32, scene, view } from "@/features/home/lib/store";

/** Distance in front of the camera at which the tile wall exactly fills the viewport. */
const DIST = 10;

const vertexShader = /* glsl */ `
uniform vec2 uSize;
uniform vec2 uGrid;
uniform float uProgress;
uniform float uReduced;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
attribute vec2 aCenter;
attribute vec2 aCorner;
attribute vec3 aRand;
varying vec2 vUv;
varying vec2 vLocal;
varying float vT;
varying float vAlpha;

mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }

void main(){
  // Tiles nearest the centre break first and the wave runs outwards, with a little jitter.
  float delay = length(aCenter) * 0.9 + aRand.x * 0.25;
  float t = clamp((uProgress - delay * 0.45) / 0.55, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  t *= 1.0 - uReduced;

  vec2 cell = uSize / uGrid;
  vec3 p = vec3(aCorner * cell, 0.0);
  p = rotY((aRand.y - 0.5) * 7.0 * t) * rotX((aRand.z - 0.5) * 7.0 * t) * p;
  p *= 1.0 - t * 0.35;

  vec2 center = aCenter * uSize;
  p.xy += center + center * t * (0.6 + aRand.z * 1.4);
  // Flying towards and past the viewer: the wall sits at -DIST, so +z brings tiles closer.
  p.z += -${DIST.toFixed(1)} + t * (6.0 + aRand.x * 9.0);

  vUv = (aCenter + 0.5 + aCorner / uGrid) * uUvScale + uUvOffset;
  vLocal = aCorner;
  vT = t;
  vAlpha = mix(1.0 - smoothstep(0.55, 1.0, t), 1.0 - uProgress, uReduced);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec2 vLocal;
varying float vT;
varying float vAlpha;

void main(){
  vec3 color = texture2D(uMap, vUv).rgb;
  // Gold seams light up along each tile's edges as the wall cracks apart.
  float edge = smoothstep(0.42, 0.5, max(abs(vLocal.x), abs(vLocal.y)));
  float crack = smoothstep(0.0, 0.15, vT) * (1.0 - smoothstep(0.6, 1.0, vT));
  color = mix(color * (1.0 - vT * 0.45), vec3(0.95, 0.75, 0.35), edge * crack * 0.85);
  gl_FragColor = vec4(color, vAlpha);
}
`;

/** Builds one quad per tile with its grid centre, corner offset and random seeds baked into attributes. */
function buildTiles(cols: number, rows: number) {
  const count = cols * rows;
  const positions = new Float32Array(count * 4 * 3);
  const centers = new Float32Array(count * 4 * 2);
  const corners = new Float32Array(count * 4 * 2);
  const rands = new Float32Array(count * 4 * 3);
  const index = new Uint32Array(count * 6);
  const rand = mulberry32(7);
  const quad = [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5];

  for (let r = 0, i = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, i++) {
      const cx = (c + 0.5) / cols - 0.5;
      const cy = (r + 0.5) / rows - 0.5;
      const seeds = [rand(), rand(), rand()];
      for (let v = 0; v < 4; v++) {
        const k = i * 4 + v;
        centers.set([cx, cy], k * 2);
        corners.set([quad[v * 2], quad[v * 2 + 1]], k * 2);
        rands.set(seeds, k * 3);
      }
      index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aCenter", new THREE.BufferAttribute(centers, 2));
  geometry.setAttribute("aCorner", new THREE.BufferAttribute(corners, 2));
  geometry.setAttribute("aRand", new THREE.BufferAttribute(rands, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  return geometry;
}

/**
 * The hero video as a wall of tiles locked to the camera. On load the tiles fly in and assemble;
 * scrolling out of the hero shatters them past the viewer, revealing the network behind.
 */
export function HeroShatter({ cols }: { cols: number }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const assemble = useRef({ value: 0 });
  const playing = useRef(false);

  const rows = Math.max(4, Math.round(cols / aspect));
  const geometry = useMemo(() => buildTiles(cols, rows), [cols, rows]);

  const video = useMemo(() => {
    const el = document.createElement("video");
    el.src = HERO_VIDEO_SRC;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    return el;
  }, []);
  const texture = useMemo(() => {
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, [video]);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uSize: { value: new THREE.Vector2(1, 1) },
      uGrid: { value: new THREE.Vector2(cols, rows) },
      uProgress: { value: 1 },
      uReduced: { value: 0 },
      uUvScale: { value: new THREE.Vector2(1, 1) },
      uUvOffset: { value: new THREE.Vector2(0, 0) },
    }),
    [texture, cols, rows],
  );

  useEffect(() => {
    let tween: gsap.core.Tween | undefined;
    const run = () => {
      tween = gsap.to(assemble.current, {
        value: 1,
        duration: motion.reduced ? 0.6 : 2.2,
        ease: "power3.out",
      });
    };
    if (scene.introDone) run();
    else window.addEventListener(INTRO_DONE_EVENT, run, { once: true });
    return () => {
      window.removeEventListener(INTRO_DONE_EVENT, run);
      tween?.kill();
    };
  }, []);

  useEffect(
    () => () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture.dispose();
    },
    [video, texture],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera }) => {
    const g = group.current;
    const mat = material.current;
    if (!g || !mat) return;
    const u = mat.uniforms;
    const progress = Math.max(Math.min(view.dive * 1.15, 1), 1 - assemble.current.value);
    const visible = progress < 0.999;
    g.visible = visible;

    const wantPlay = visible && !motion.reduced;
    if (wantPlay !== playing.current) {
      playing.current = wantPlay;
      if (wantPlay) video.play().catch(() => (playing.current = false));
      else video.pause();
    }
    if (!visible) return;

    // Lock the wall to the camera and size it to the current frustum, which widens during the dive.
    const cam = camera as THREE.PerspectiveCamera;
    g.position.copy(cam.position);
    g.quaternion.copy(cam.quaternion);
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * DIST;
    u.uSize.value.set(height * cam.aspect, height);
    u.uProgress.value = progress;
    u.uReduced.value = motion.reduced ? 1 : 0;

    // object-fit: cover for the video inside the viewport.
    if (video.videoWidth) {
      const ratio = cam.aspect / (video.videoWidth / video.videoHeight);
      const sx = ratio < 1 ? ratio : 1;
      const sy = ratio < 1 ? 1 : 1 / ratio;
      u.uUvScale.value.set(sx, sy);
      u.uUvOffset.value.set((1 - sx) / 2, (1 - sy) / 2);
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={geometry} frustumCulled={false} renderOrder={10}>
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
