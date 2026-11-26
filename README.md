# 3D House Simulator — Architectural Visualization Studio

An interactive, browser-based 3D architectural visualization and interior simulation studio built with **Next.js (App Router)**, **React Three Fiber**, **Three.js**, **Zustand**, and **Tailwind CSS**.

Designed around a clean, local-first architecture, the studio ships with a 2-story procedural starter villa (**Villa Horizon — Modern Glass & Concrete**) and supports real-time lighting, PBR materials, floor-by-floor editing, furniture placement, first-person walkthroughs, and project import/export.

---

## Key Features

- **Interactive 3D Viewport**: Smooth **Orbit** inspection and **First-Person Walk** (`W A S D`) navigation with camera presets, focus-on-selection (`F`), cutaway view, and floor isolation.
- **Architectural & Interior Editing**:
  - Multi-floor support with walls, doors/windows (`Opening`), and polygon rooms with automatic area & perimeter calculation.
  - Transform gizmos, grid snapping (`S`), 45° angle snapping (`R`), furniture clearance/collision warnings, and full **Undo / Redo** command history (`Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z`).
- **Lighting & Atmosphere Studio**:
  - Real-time time-of-day sun arc, azimuth/elevation controls, and weather presets (`clear`, `overcast`, `sunset`, `night`).
  - Curated lighting presets (`Bright Morning`, `Midday`, `Golden Hour`, `Sunset`, `Nighttime`, `Warm Interior`, `Cool Interior`) and rendering quality tiers (`Low`, `Medium`, `High`, `Ultra` with shadows, bloom, and ACES Filmic tone mapping).
- **Procedural PBR Materials & Furniture Catalog**:
  - Canvas-generated procedural textures (wood planks, concrete, marble, brick, tile, fabric, plaster, glass, water, foliage) cached and shared across meshes.
  - Built-in furniture catalog across seating, tables, beds, storage, kitchen, bathroom, office, lighting, decor, outdoor, and stairs — plus client-side `.glb` / `.gltf` model import.
- **Local-First Persistence & Exports**:
  - Automatic draft recovery and project storage in **IndexedDB**, with optional **Supabase** cloud sync.
  - Export projects as JSON, room area/perimeter schedules as CSV, or high-resolution PNG viewport snapshots.

---

## Installation & Local Development

### Prerequisites

- **Node.js** `20+`
- **pnpm** `10+` (configured via `packageManager` in `package.json`)

### Setup

```bash
pnpm install
```

Copy `.env.example` to `.env.local` only if you want optional Supabase cloud sync (the app runs fully offline/locally without any environment variables):

```bash
cp .env.example .env.local
```

### Common Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start the Next.js development server at `http://localhost:3000` |
| `pnpm test` | Run Vitest unit & domain tests (`src/**/*.test.{ts,tsx}`) |
| `pnpm build` | Create an optimized production build |
| `pnpm lint` | Run ESLint across the codebase |
| `pnpm tsc --noEmit` | Run TypeScript typechecking |
| `pnpm exec playwright test` | Run Playwright end-to-end tests (`e2e/`) |

---

## Architecture & Directory Structure

```text
src/
├── domain/          # Pure TypeScript data models, Zod schemas, geometry math,
│                    # undoable command pattern, and starterHouse fixture
├── stores/          # Zustand state stores (project, selection, tool, camera,
│                    # simulation/lighting, history, UI layout)
├── three/           # React Three Fiber 3D scene, camera rig, procedural meshes,
│                    # PBR material factory, lighting studio, and gizmos
├── services/        # IndexedDB persistence, JSON/CSV/PNG exporters, GLB/GLTF
│                    # asset import, project I/O, and optional Supabase client
├── components/      # Editor shell (TopNavBar, LeftToolPanel, RightInspector,
│                    # BottomBar) and Radix/Tailwind UI primitives
├── hooks/           # Keyboard shortcuts and autosave hooks
├── lib/             # Furniture catalog, lighting presets, app settings, utils
└── app/             # Next.js App Router pages (/, /projects, /settings) & API routes
```

---

## Extending the Studio

### Adding New Furniture Models

1. **Register metadata** in `src/lib/furnitureCatalog.ts` by appending a `FurnitureCatalogItem` entry to `FURNITURE_CATALOG` (with a unique `catalogId`, `name`, `uiCategory`, `category`, `dimensions`, and `defaultMaterialId`).
2. **Add 3D geometry** in `src/three/furniture/FurnitureCatalogModels.tsx` by creating a model component and mapping your `catalogId` inside the catalog renderer switch/lookup.

### Adding Material Presets

1. **Define the material** using the `MaterialDef` shape (`id`, `name`, `category`, `color`, `roughness`, `metalness`, optional `opacity`/`transparent`/`emissive`) — e.g., in `src/domain/fixtures/starterHouse.ts` or added dynamically to a project's `materials` array.
2. **Customize procedural textures** (if adding a new visual pattern) in `src/three/materials/materialFactory.ts`, which maps `MaterialCategory` and material names to cached `THREE.CanvasTexture` generators.

### Adding Simulation Features

1. **State & actions**: Add new simulation state fields and setters in `src/stores/useSimulationStore.ts` (and `SimulationState` in `src/domain/models/types.ts`).
2. **Presets & rendering**: Add curated presets in `src/lib/lightingPresets.ts` and wire the 3D scene/post-processing behavior in `src/three/lighting/LightingStudio.tsx` or `src/three/scene/HouseCanvas.tsx`.
3. **Controls**: Expose toggles or sliders in `src/components/layout/RightInspector.tsx` or `src/components/layout/TopNavBar.tsx`.

---

## Implemented Features & Known Limitations

### Implemented
- Full 3D architectural editor with `Villa Horizon` starter project, multi-floor switching, cutaway mode, and live FPS/draw-call/triangle telemetry.
- Undo/redo command stack, snapping, clearance warnings, and keyboard shortcuts (`V`, `F`, `G`, `R`, `S`, `Delete`, `WASD`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+S`).
- Dynamic sun/sky/weather lighting, quality presets, procedural PBR textures, client-side `.glb`/`.gltf` import, IndexedDB local storage, and JSON/CSV/PNG export.

### Known Limitations
- **Visual lighting approximation**: Sun position, sky colors, and interior lights are designed for real-time visual feedback rather than certified photometric, lux, or solar-irradiance analysis.
- **Procedural starter assets**: The starter villa (`Villa Horizon`) and built-in catalog items use procedural Three.js geometry and canvas textures rather than high-poly external architectural `.glb` packs (though custom `.glb`/`.gltf` models can be imported at runtime).
- **Local-first & WebGL dependent**: Requires a browser with WebGL support; without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, projects are stored only in the local browser's IndexedDB.
