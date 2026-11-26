'use client';

import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Grid } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { MaterialDef, Opening } from '@/domain';
import {
  useProjectStore,
  useSelectionStore,
  useSimulationStore,
} from '@/stores';
import { CameraRig } from '../camera/CameraRig';
import { FurnitureItemMesh } from '../furniture/FurnitureItemMesh';
import { BuildingExtras } from '../geometry/BuildingExtras';
import { LandscapedYard, RoomMesh } from '../geometry/RoomMesh';
import { WallMesh } from '../geometry/WallMesh';
import { PlacementPreview } from '../interactions/PlacementPreview';
import { TransformGizmo } from '../interactions/TransformGizmo';
import { LightingStudio } from '../lighting/LightingStudio';
import { disposeMaterialCache } from '../materials/materialFactory';

export interface PerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}

export interface HouseCanvasProps {
  onCanvasReady?: (captureFn: () => string | null) => void;
  onPerfUpdate?: (stats: PerfStats) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class CanvasErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'WebGL rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-200">
          <p className="text-sm font-semibold text-rose-400">3D Viewport Unavailable</p>
          <p className="mt-1 max-w-md text-xs text-slate-400">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function CanvasBridge({ onCanvasReady, onPerfUpdate }: HouseCanvasProps) {
  const { gl, scene, camera } = useThree();
  const frameCount = useRef(0);
  const lastReport = useRef(0);

  useEffect(() => {
    onCanvasReady?.(() => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    });
  }, [gl, scene, camera, onCanvasReady]);

  useFrame(() => {
    if (!onPerfUpdate) return;
    const now = performance.now();
    if (lastReport.current === 0) {
      lastReport.current = now;
      return;
    }
    frameCount.current += 1;
    const elapsed = now - lastReport.current;
    if (elapsed >= 500) {
      const fps = Math.round((frameCount.current * 1000) / elapsed);
      onPerfUpdate({
        fps,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      });
      frameCount.current = 0;
      lastReport.current = now;
    }
  });

  return null;
}

function HouseScene({ onCanvasReady, onPerfUpdate }: HouseCanvasProps) {
  const project = useProjectStore((s) => s.project);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedType = useSelectionStore((s) => s.selectedType);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const mode = useSimulationStore((s) => s.mode);
  const showGrid = useSimulationStore((s) => s.showGrid);
  const activeFloorId = useSimulationStore((s) => s.activeFloorId);
  const isolateActiveFloor = useSimulationStore((s) => s.isolateActiveFloor);
  const cutawayEnabled = useSimulationStore((s) => s.cutawayEnabled);

  const [isGizmoDragging, setIsGizmoDragging] = useState(false);
  const furnitureRefs = useRef<Map<string, THREE.Group>>(new Map());
  const [selectedGroup, setSelectedGroup] = useState<THREE.Group | null>(null);

  const registerFurnitureRef = useCallback((id: string, group: THREE.Group | null) => {
    if (group) {
      furnitureRefs.current.set(id, group);
    } else {
      furnitureRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (selectedType === 'furniture' && selectedId) {
      setSelectedGroup(furnitureRefs.current.get(selectedId) ?? null);
    } else {
      setSelectedGroup(null);
    }
  }, [selectedType, selectedId, project.furniture]);

  const materialsById = useMemo(() => {
    const map = new Map<string, MaterialDef>();
    for (const m of project.materials) {
      map.set(m.id, m);
    }
    return map;
  }, [project.materials]);

  const floorsById = useMemo(() => {
    const map = new Map(project.floors.map((f) => [f.id, f]));
    return map;
  }, [project.floors]);

  const openingsByWallId = useMemo(() => {
    const map = new Map<string, Opening[]>();
    for (const op of project.openings) {
      const list = map.get(op.wallId);
      if (list) list.push(op);
      else map.set(op.wallId, [op]);
    }
    return map;
  }, [project.openings]);

  const visibleFloorIds = useMemo(() => {
    const set = new Set<string>();
    for (const f of project.floors) {
      if (!f.visible) continue;
      if (isolateActiveFloor && activeFloorId && f.id !== activeFloorId) continue;
      set.add(f.id);
    }
    return set;
  }, [project.floors, isolateActiveFloor, activeFloorId]);

  const hideCeilings = cutawayEnabled || mode === 'floorplan';
  const selectedFurniture = useMemo(
    () =>
      selectedType === 'furniture' && selectedId
        ? project.furniture.find((f) => f.id === selectedId) ?? null
        : null,
    [selectedType, selectedId, project.furniture],
  );

  return (
    <>
      <CanvasBridge onCanvasReady={onCanvasReady} onPerfUpdate={onPerfUpdate} />
      <LightingStudio lights={project.lights} />
      <CameraRig isGizmoDragging={isGizmoDragging} />

      {showGrid && (
        <Grid
          position={[0, -0.23, 0]}
          args={[48, 48]}
          cellSize={project.gridSize}
          cellThickness={0.5}
          cellColor="#64748b"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#94a3b8"
          fadeDistance={36}
          fadeStrength={1.2}
          infiniteGrid
        />
      )}

      <group
        onPointerMissed={(e) => {
          if (e.type === 'click') clearSelection();
        }}
      >
        <LandscapedYard materialsById={materialsById} />

        {/* Rooms */}
        {project.rooms.map((room) => {
          if (!visibleFloorIds.has(room.floorId)) return null;
          const floor = floorsById.get(room.floorId);
          if (!floor) return null;
          return (
            <RoomMesh
              key={room.id}
              room={room}
              floor={floor}
              materialsById={materialsById}
              hideCeiling={hideCeilings}
            />
          );
        })}

        {/* Walls & Openings */}
        {project.walls.map((wall) => {
          if (!visibleFloorIds.has(wall.floorId)) return null;
          const floor = floorsById.get(wall.floorId);
          if (!floor) return null;
          return (
            <WallMesh
              key={wall.id}
              wall={wall}
              floor={floor}
              openings={openingsByWallId.get(wall.id) ?? []}
              materialsById={materialsById}
              cutawayHeight={cutawayEnabled ? 1.35 : undefined}
            />
          );
        })}

        {/* Roof & Structural Columns */}
        <BuildingExtras
          floors={project.floors.filter((f) => visibleFloorIds.has(f.id))}
          hideRoof={hideCeilings}
        />

        {/* Furniture */}
        {project.furniture.map((item) => {
          if (!visibleFloorIds.has(item.floorId)) return null;
          const floorItems = project.furniture.filter((f) => f.floorId === item.floorId);
          return (
            <FurnitureItemMesh
              key={item.id}
              item={item}
              allFloorItems={floorItems}
              materialsById={materialsById}
              registerRef={registerFurnitureRef}
            />
          );
        })}
      </group>

      <TransformGizmo
        targetObject={selectedGroup}
        item={selectedFurniture}
        onDragChange={setIsGizmoDragging}
      />

      <PlacementPreview key={activeFloorId ?? 'default'} />
    </>
  );
}

export function HouseCanvas({ onCanvasReady, onPerfUpdate }: HouseCanvasProps) {
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    return () => {
      disposeMaterialCache();
    };
  }, []);

  if (contextLost) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-200">
        <p className="text-sm font-semibold text-amber-400">WebGL Context Lost</p>
        <p className="mt-1 text-xs text-slate-400">
          Graphics context was interrupted. Click below to restore the 3D viewport.
        </p>
        <button
          type="button"
          onClick={() => setContextLost(false)}
          className="mt-3 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
        >
          Restore Viewport
        </button>
      </div>
    );
  }

  return (
    <CanvasErrorBoundary>
      <div className="relative h-full w-full select-none">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [13, 8.5, 16], fov: 45, near: 0.1, far: 180 }}
          gl={{
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
            canvas.addEventListener('webglcontextrestored', () => {
              setContextLost(false);
            });
          }}
        >
          <HouseScene onCanvasReady={onCanvasReady} onPerfUpdate={onPerfUpdate} />
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}

export default HouseCanvas;
