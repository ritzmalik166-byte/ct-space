# Space station asset credits (Section 3)

Regenerate everything with `node scripts/station-assets/build-station-assets.mjs`.

## NASA Gateway Core model

- File: `models/gateway-core.meshopt.glb`
- Source: [NASA 3D Resources, "Gateway Core"](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Gateway)
- License: NASA media is generally not subject to copyright in the United States
  ([NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)).
  Use does not imply NASA endorsement.
- Changes: meshopt geometry compression and 512 px WebP textures via `@gltf-transform/cli optimize` (66 MB → 2.3 MB).

## PBR texture sets (CC0)

Each set is resized to 1024 px and repacked as `albedo.jpg`, `normal.jpg` (OpenGL) and
`arm.jpg` (R = ambient occlusion, G = roughness, B = metalness).

| Folder | Source | License |
| --- | --- | --- |
| `textures/hull-panels/` | [ambientCG MetalPlates007](https://ambientcg.com/view?id=MetalPlates007) | [CC0 1.0](https://docs.ambientcg.com/license/) |
| `textures/wall-panels/` | [ambientCG MetalPlates004](https://ambientcg.com/view?id=MetalPlates004) | [CC0 1.0](https://docs.ambientcg.com/license/) |
| `textures/brushed-metal/` | [ambientCG Metal032](https://ambientcg.com/view?id=Metal032) | [CC0 1.0](https://docs.ambientcg.com/license/) |
| `textures/tread-plate/` | [Poly Haven "Metal Plate"](https://polyhaven.com/a/metal_plate) by Rob Tuytel | [CC0 1.0](https://polyhaven.com/license) |

## HDRI (CC0)

- File: `hdr/empty_warehouse_01_1k.hdr`
- Source: [Poly Haven "Empty Warehouse 01"](https://polyhaven.com/a/empty_warehouse_01) — [CC0 1.0](https://polyhaven.com/license)
- Used only as an interior reflection environment.

## Screen content (Contenaissance)

The videos configured in `features/(website)/home/lib/station/stationContent.ts` are
Contenaissance's own reels, streamed from `contenaissance.blob.core.windows.net/ct-assets/`.
Each thumbnail in `thumbs/` is a single frame of its video, centred over a blurred copy to fill 16:9.

| File | Video |
| --- | --- |
| `thumbs/brand-films.jpg` | `01.mp4` |
| `thumbs/commercials.jpg` | `02.MP4` |
| `thumbs/social-content.jpg` | `03.mp4` |
| `thumbs/documentary.jpg` | `09.mp4` |
| `thumbs/music-videos.jpg` | `05.MP4` |

The docking-gate display uses the existing brand mark `/assets/brand/contenaissance-mark.png`.

## Reused from Section 2

The Milky Way backdrop and the Earth seen through the observation window reuse
`/assets/space/textures/milky-way.jpg`, `earth-albedo.jpg` and `earth-clouds.jpg`
(Solar System Scope, CC BY 4.0 — see `public/assets/space/CREDITS.md`). The docking ship is
the existing `contenaissance-explorer` model and hull maps.

## Original (this project)

The hangar hull, bulkhead, bay doors, interior hall, landing pad, service arm, consoles,
projector, hologram and habitat ring are modelled procedurally in code
(`features/(website)/home/lib/station/` and `components/scene/station/`), textured with the CC0
sets above. Screen HUDs, console readouts and hazard stripes are canvas-generated.
