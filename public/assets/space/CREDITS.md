# Space asset credits

Regenerate everything with `node scripts/space-assets/build-textures.mjs` and
`node scripts/space-assets/build-ship.mjs`.

## Solar System Scope textures (CC BY 4.0)

Source: https://www.solarsystemscope.com/textures/ — licensed under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
Based on NASA imagery. Resized, renamed and, where noted, processed into derived maps.

| File | Source map | Changes |
| --- | --- | --- |
| `textures/sun-surface.jpg` | `2k_sun.jpg` | resized |
| `textures/earth-albedo.jpg`, `earth-normal.jpg`, `earth-roughness.jpg` | `2k_earth_daymap.jpg` | normal / roughness derived |
| `textures/earth-clouds.jpg` | `2k_earth_clouds.jpg` | resized |
| `textures/mars-albedo.jpg`, `mars-normal.jpg`, `mars-roughness.jpg` | `2k_mars.jpg` | normal / roughness derived |
| `textures/gas-giant-albedo.jpg` | `2k_jupiter.jpg` | resized |
| `textures/ringed-planet-albedo.jpg` | `2k_saturn.jpg` | resized |
| `textures/rocky-planet-albedo.jpg`, `rocky-planet-normal.jpg`, `rocky-planet-roughness.jpg` | `2k_moon.jpg` | normal / roughness derived |
| `textures/planet-ring.png` | `2k_saturn_ring_alpha.png` | resized |
| `textures/milky-way.jpg` | `8k_stars_milky_way.jpg` | resized to 4096×2048 |

The `textures/1k/` copies and the `thumbs/` renders are derived from the same maps.

## Original assets (this project)

- `textures/volcanic-planet-*.jpg`, `textures/ice-planet-*.jpg`: procedurally generated (spherical 3D noise).
- `textures/ship-*.jpg`: procedurally generated hull panel maps.
- `models/contenaissance-explorer.meshopt.glb`: procedurally modelled in `build-ship.mjs`, meshopt-compressed with gltfpack.
