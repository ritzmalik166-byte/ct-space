# Lee Perry-Smith head scan

Source mesh for the hero's particle human (`public/models/human-bust.bin`).

- **File:** `LeePerrySmith.glb` (9,279 vertices, 17,684 triangles)
- **Subject / scan:** Lee Perry-Smith, 3D scan by [Infinite Realities](https://ir-ltd.net/)
- **License:** [Creative Commons Attribution 3.0 (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/)
- **Obtained from:** the three.js example assets (r170),
  `https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb`

Attribution required by CC BY 3.0:
"Lee Perry-Smith head scan by Infinite Realities (ir-ltd.net), licensed under CC BY 3.0."

Only the geometry is used; textures are not shipped. The runtime asset is derived
from this file by:

```sh
node scripts/bake-human-bust.mjs
```

which writes positions, normals, baked ambient occlusion and indices to
`public/models/human-bust.bin`. The eyes are sculpted procedurally in
`lib/particles/humanShape.ts` because the scan's eyes are closed.
