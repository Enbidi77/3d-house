'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Html, Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import {
  addFurnitureCommand,
  addRoomCommand,
  addWallCommand,
  checkFurnitureClearance,
  snapAngle,
  snapPointToGrid,
  snapToWallEndpoints,
  type FurnitureItem,
  type Vector2Tuple,
} from '@/domain';
import {
  useHistoryStore,
  useProjectStore,
  useSimulationStore,
  useToolStore,
} from '@/stores';

export function PlacementPreview() {
  const activeTool = useToolStore((s) => s.activeTool);
  const snapToGrid = useToolStore((s) => s.snapToGrid);
  const snapToAngle = useToolStore((s) => s.snapToAngle);
  const snapToEndpoints = useToolStore((s) => s.snapToEndpoints);
  const angleStepDeg = useToolStore((s) => s.angleStepDeg);
  const defaultWallHeight = useToolStore((s) => s.defaultWallHeight);
  const defaultWallThickness = useToolStore((s) => s.defaultWallThickness);
  const activeFurnitureCatalogId = useToolStore((s) => s.activeFurnitureCatalogId);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  const project = useProjectStore((s) => s.project);
  const activeFloorId = useSimulationStore((s) => s.activeFloorId);
  const execute = useHistoryStore((s) => s.execute);

  const activeFloor = useMemo(
    () => project.floors.find((f) => f.id === activeFloorId) ?? project.floors[0],
    [project.floors, activeFloorId],
  );
  const floorWalls = useMemo(
    () => project.walls.filter((w) => w.floorId === activeFloor?.id),
    [project.walls, activeFloor?.id],
  );
  const floorFurniture = useMemo(
    () => project.furniture.filter((f) => f.floorId === activeFloor?.id),
    [project.furniture, activeFloor?.id],
  );

  const [hoverPoint, setHoverPoint] = useState<Vector2Tuple | null>(null);
  const [wallStart, setWallStart] = useState<Vector2Tuple | null>(null);
  const [roomPoints, setRoomPoints] = useState<Vector2Tuple[]>([]);
  const [measurePoints, setMeasurePoints] = useState<Vector2Tuple[]>([]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWallStart(null);
        setRoomPoints([]);
        setMeasurePoints([]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const resolvePoint = (raw: Vector2Tuple, anchor?: Vector2Tuple | null): Vector2Tuple => {
    let pt = raw;
    if (snapToAngle && anchor) {
      pt = snapAngle(anchor, pt, angleStepDeg);
    }
    if (snapToEndpoints) {
      const ep = snapToWallEndpoints(pt, floorWalls, 0.3);
      if (ep.snapped) return ep.point;
    }
    if (snapToGrid) {
      pt = snapPointToGrid(pt, project.gridSize);
    }
    return pt;
  };

  if (!activeFloor) return null;
  const isDrawingTool =
    activeTool === 'wall' ||
    activeTool === 'room' ||
    activeTool === 'furniture' ||
    activeTool === 'measure';

  if (!isDrawingTool) return null;

  const y = activeFloor.elevation + 0.02;

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const raw: Vector2Tuple = [e.point.x, e.point.z];
    const anchor =
      activeTool === 'wall'
        ? wallStart
        : activeTool === 'room' && roomPoints.length > 0
          ? roomPoints[roomPoints.length - 1]
          : activeTool === 'measure' && measurePoints.length === 1
            ? measurePoints[0]
            : null;
    setHoverPoint(resolvePoint(raw, anchor));
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const raw: Vector2Tuple = [e.point.x, e.point.z];
    const pt = resolvePoint(raw, wallStart);

    if (activeTool === 'wall') {
      if (!wallStart) {
        setWallStart(pt);
      } else {
        const len = Math.hypot(pt[0] - wallStart[0], pt[1] - wallStart[1]);
        if (len >= 0.2) {
          execute(
            addWallCommand({
              id: `wall-${Date.now()}`,
              floorId: activeFloor.id,
              start: wallStart,
              end: pt,
              thickness: defaultWallThickness,
              height: defaultWallHeight,
              exteriorMaterialId: 'mat-concrete-arch',
              interiorMaterialId: 'mat-plaster-white',
              isExterior: false,
            }),
          );
        }
        setWallStart(null);
      }
      return;
    }

    if (activeTool === 'room') {
      if (roomPoints.length >= 3) {
        const first = roomPoints[0];
        if (Math.hypot(pt[0] - first[0], pt[1] - first[1]) < 0.4) {
          execute(
            addRoomCommand({
              id: `room-${Date.now()}`,
              floorId: activeFloor.id,
              name: `Room ${project.rooms.length + 1}`,
              type: 'other',
              polygon: roomPoints,
              floorMaterialId: 'mat-oak-warm',
              ceilingMaterialId: 'mat-plaster-white',
              hasCeiling: true,
            }),
          );
          setRoomPoints([]);
          return;
        }
      }
      setRoomPoints((prev) => [...prev, pt]);
      return;
    }

    if (activeTool === 'furniture') {
      const catalogId = activeFurnitureCatalogId ?? 'sofa-modern-l';
      const newItem: FurnitureItem = {
        id: `furn-${Date.now()}`,
        floorId: activeFloor.id,
        catalogId,
        name: catalogId.replace(/-/g, ' '),
        category: 'seating',
        position: [pt[0], activeFloor.elevation, pt[1]],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        dimensions: [1.6, 0.85, 0.9],
        materialId: 'mat-fabric-linen',
      };
      execute(addFurnitureCommand(newItem));
      setActiveTool('select');
      return;
    }

    if (activeTool === 'measure') {
      if (measurePoints.length === 0 || measurePoints.length === 2) {
        setMeasurePoints([pt]);
      } else {
        setMeasurePoints([measurePoints[0], pt]);
      }
    }
  };

  // Ghost furniture collision check
  const ghostItem: FurnitureItem | null =
    activeTool === 'furniture' && hoverPoint
      ? {
          id: 'ghost-preview',
          floorId: activeFloor.id,
          catalogId: activeFurnitureCatalogId ?? 'sofa-modern-l',
          name: 'Preview',
          category: 'seating',
          position: [hoverPoint[0], activeFloor.elevation, hoverPoint[1]],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: [1.6, 0.85, 0.9],
        }
      : null;

  const ghostValid = ghostItem ? checkFurnitureClearance(ghostItem, floorFurniture, 0).valid : true;

  const wallPreviewLen =
    wallStart && hoverPoint ? Math.hypot(hoverPoint[0] - wallStart[0], hoverPoint[1] - wallStart[1]) : 0;

  const measureA = measurePoints[0];
  const measureB = measurePoints[1] ?? (measurePoints.length === 1 ? hoverPoint : null);
  const measureLen =
    measureA && measureB ? Math.hypot(measureB[0] - measureA[0], measureB[1] - measureA[1]) : 0;

  return (
    <group>
      {/* Invisible floor raycast plane */}
      <mesh
        position={[0, y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Snap cursor ring */}
      {hoverPoint && (
        <mesh position={[hoverPoint[0], y + 0.01, hoverPoint[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.16, 20]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      )}

      {/* Wall drawing preview */}
      {activeTool === 'wall' && wallStart && hoverPoint && wallPreviewLen > 0.05 && (
        <group>
          <Line
            points={[
              [wallStart[0], y + 0.03, wallStart[1]],
              [hoverPoint[0], y + 0.03, hoverPoint[1]],
            ]}
            color="#38bdf8"
            lineWidth={3}
          />
          <mesh
            position={[
              (wallStart[0] + hoverPoint[0]) / 2,
              activeFloor.elevation + defaultWallHeight / 2,
              (wallStart[1] + hoverPoint[1]) / 2,
            ]}
            rotation={[0, -Math.atan2(hoverPoint[1] - wallStart[1], hoverPoint[0] - wallStart[0]), 0]}
          >
            <boxGeometry args={[wallPreviewLen, defaultWallHeight, defaultWallThickness]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.28} />
          </mesh>
          <Html
            position={[
              (wallStart[0] + hoverPoint[0]) / 2,
              y + defaultWallHeight + 0.3,
              (wallStart[1] + hoverPoint[1]) / 2,
            ]}
            center
          >
            <div className="rounded bg-slate-950/85 px-2 py-0.5 text-xs font-medium text-sky-300 shadow">
              {wallPreviewLen.toFixed(2)} m
            </div>
          </Html>
        </group>
      )}

      {/* Room polygon preview */}
      {activeTool === 'room' && roomPoints.length > 0 && (
        <Line
          points={[
            ...roomPoints.map(([x, z]) => [x, y + 0.04, z] as [number, number, number]),
            ...(hoverPoint ? [[hoverPoint[0], y + 0.04, hoverPoint[1]] as [number, number, number]] : []),
          ]}
          color="#34d399"
          lineWidth={2.5}
        />
      )}

      {/* Furniture ghost preview */}
      {activeTool === 'furniture' && ghostItem && (
        <mesh position={[ghostItem.position[0], activeFloor.elevation + 0.425, ghostItem.position[2]]}>
          <boxGeometry args={ghostItem.dimensions} />
          <meshBasicMaterial
            color={ghostValid ? '#34d399' : '#ef4444'}
            transparent
            opacity={0.4}
            wireframe={!ghostValid}
          />
        </mesh>
      )}

      {/* Measure tool preview */}
      {activeTool === 'measure' && measureA && measureB && (
        <group>
          <Line
            points={[
              [measureA[0], y + 0.05, measureA[1]],
              [measureB[0], y + 0.05, measureB[1]],
            ]}
            color="#f59e0b"
            lineWidth={3}
          />
          <Html
            position={[(measureA[0] + measureB[0]) / 2, y + 0.35, (measureA[1] + measureB[1]) / 2]}
            center
          >
            <div className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-slate-950 shadow">
              {measureLen.toFixed(2)} m
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
