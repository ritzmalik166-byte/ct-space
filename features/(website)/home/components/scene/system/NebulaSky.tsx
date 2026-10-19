"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, type Mesh, type MeshBasicMaterial, type Texture } from "three";
import type { VoyageLayout } from "../../../lib/voyage/voyageLayout";

/**
 * Milky Way panorama on an inverted sphere. Tilted so the galactic band crosses
 * the upper right of the frame, dimmed so it reads as depth behind the system.
 */
export default function NebulaSky({ layout, map }: { layout: VoyageLayout; map: Texture }) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);

  useFrame(() => {
    if (!mesh.current || !material.current) return;
    mesh.current.visible = layout.reveal > 0.01;
    material.current.opacity = layout.reveal;
  });

  return (
    <mesh ref={mesh} rotation={[0.25, 2.25, -0.62]} renderOrder={-10} visible={false} frustumCulled={false}>
      <sphereGeometry args={[120, 64, 32]} />
      <meshBasicMaterial
        ref={material}
        map={map}
        side={BackSide}
        color="#d8c6a8"
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
