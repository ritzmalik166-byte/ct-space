"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Color, Mesh, MeshBasicMaterial, PMREMGenerator, Scene, SphereGeometry } from "three";

/** Local environment map so the champagne-gold hull reflects light without a network asset. */
export default function SpaceEnvironment() {
  const gl = useThree((state) => state.gl);
  const get = useThree((state) => state.get);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = new Scene();
    env.background = new Color("#070914");
    const geometry = new SphereGeometry(1, 12, 10);
    const lights: Array<[string, number, number, number, number]> = [
      ["#ffe7c2", 6, 5, 4, 3.2],
      ["#d7e4ff", -7, 2, 3, 2.4],
      ["#fff1d4", 0, 8, 1, 2.8],
      ["#8ea4d8", -1, -4, 8, 2.2],
      ["#1c2744", 0, 0, -10, 6],
    ];
    const meshes = lights.map(([color, x, y, z, scale]) => {
      const material = new MeshBasicMaterial({ color, toneMapped: false });
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      env.add(mesh);
      return mesh;
    });
    const texture = pmrem.fromScene(env, 0.04).texture;
    gl.setRenderTarget(null);
    const scene = get().scene;
    scene.environment = texture;

    return () => {
      scene.environment = null;
      texture.dispose();
      pmrem.dispose();
      geometry.dispose();
      for (const mesh of meshes) {
        mesh.material.dispose();
      }
    };
  }, [gl, get]);

  return null;
}
