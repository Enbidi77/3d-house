'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  updateRoomCommand,
  type Floor,
  type MaterialDef,
  type Room,
} from '@/domain';
import {
  useHistoryStore,
  useSelectionStore,
  useSimulationStore,
  useToolStore,
} from '@/stores';
import { getMaterialProps, getWaterNormalTexture } from '../materials/materialFactory';

interface RoomMeshProps {
  room: Room;
  floor: Floor;
  materialsById: Map<string, MaterialDef>;
  hideCeiling: boolean;
}

function PoolWaterSurface({
  geometry,
  elevation,
  materialDef,
}: {
  geometry: THREE.ExtrudeGeometry;
  elevation: number;
  materialDef?: MaterialDef;
}) {
  const waterMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const normalMap = useMemo(() => {
    const tex = getWaterNormalTexture([3, 2]);
    return tex ? tex.clone() : undefined;
  }, []);

  useEffect(() => {
    return () => {
      normalMap?.dispose();
    };
  }, [normalMap]);

  useFrame((_, delta) => {
    const map = waterMatRef.current?.normalMap;
    if (map) {
      map.offset.x = (map.offset.x + delta * 0.04) % 1;
      map.offset.y = (map.offset.y + delta * 0.025) % 1;
    }
  });

  return (
    <group>
      {/* Recessed pool basin floor */}
      <mesh
        geometry={geometry}
        position={[0, elevation - 0.85, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#165a72" roughness={0.45} metalness={0.05} />
      </mesh>
      {/* Animated water surface */}
      <mesh
        geometry={geometry}
        position={[0, elevation - 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial
          ref={waterMatRef}
          color={materialDef?.color ?? '#2596be'}
          roughness={0.06}
          metalness={0.1}
          transmission={0.35}
          transparent
          opacity={materialDef?.opacity ?? 0.8}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          envMapIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

export function RoomMesh({ room, floor, materialsById, hideCeiling }: RoomMeshProps) {
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedType = useSelectionStore((s) => s.selectedType);
  const select = useSelectionStore((s) => s.select);
  const activeTool = useToolStore((s) => s.activeTool);
  const activeMaterialId = useToolStore((s) => s.activeMaterialId);
  const showRoomLabels = useSimulationStore((s) => s.showRoomLabels);
  const execute = useHistoryStore((s) => s.execute);

  const isSelected = selectedType === 'room' && selectedId === room.id;
  const slabThickness = Math.max(0.08, floor.slabThickness);
  const elevation = floor.elevation + (room.elevationOffset ?? 0);

  const { floorGeo, ceilingGeo } = useMemo(() => {
    if (room.polygon.length < 3) return { floorGeo: null, ceilingGeo: null };

    const shape = new THREE.Shape();
    shape.moveTo(room.polygon[0][0], -room.polygon[0][1]);
    for (let i = 1; i < room.polygon.length; i++) {
      shape.lineTo(room.polygon[i][0], -room.polygon[i][1]);
    }
    shape.closePath();

    const fGeo = new THREE.ExtrudeGeometry(shape, {
      depth: slabThickness,
      bevelEnabled: false,
    });
    const uvAttr = fGeo.attributes.uv;
    if (uvAttr) {
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setXY(i, uvAttr.getX(i) / 3, uvAttr.getY(i) / 3);
      }
      uvAttr.needsUpdate = true;
    }
    fGeo.computeVertexNormals();

    const cGeo = new THREE.ShapeGeometry(shape);
    return { floorGeo: fGeo, ceilingGeo: cGeo };
  }, [room.polygon, slabThickness]);

  useEffect(() => {
    return () => {
      floorGeo?.dispose();
      ceilingGeo?.dispose();
    };
  }, [floorGeo, ceilingGeo]);

  const floorMatDef = materialsById.get(room.floorMaterialId);
  const ceilingMatDef = room.ceilingMaterialId ? materialsById.get(room.ceilingMaterialId) : undefined;
  const floorMatProps = useMemo(() => getMaterialProps(floorMatDef, [2, 2]), [floorMatDef]);
  const ceilingMatProps = useMemo(() => getMaterialProps(ceilingMatDef, [2, 2]), [ceilingMatDef]);

  const area = useMemo(() => calculatePolygonArea(room.polygon), [room.polygon]);
  const centroid = useMemo(
    () => room.labelPosition ?? calculatePolygonCentroid(room.polygon),
    [room.labelPosition, room.polygon],
  );

  if (!floorGeo) return null;

  const handleRoomClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (activeTool === 'paint' && activeMaterialId) {
      execute(
        updateRoomCommand(
          room.id,
          { floorMaterialId: room.floorMaterialId },
          { floorMaterialId: activeMaterialId },
          'Paint room floor',
        ),
      );
      return;
    }
    select('room', room.id);
  };

  return (
    <group>
      {room.type === 'pool' ? (
        <group onClick={handleRoomClick}>
          <PoolWaterSurface geometry={floorGeo} elevation={elevation} materialDef={floorMatDef} />
        </group>
      ) : (
        <mesh
          geometry={floorGeo}
          position={[0, elevation - slabThickness, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          castShadow
          onClick={handleRoomClick}
        >
          <meshStandardMaterial
            {...floorMatProps}
            emissive={isSelected ? '#0284c7' : floorMatProps.emissive ?? '#000000'}
            emissiveIntensity={isSelected ? 0.2 : floorMatProps.emissiveIntensity ?? 0}
          />
        </mesh>
      )}

      {room.hasCeiling && !hideCeiling && ceilingGeo && (
        <mesh
          geometry={ceilingGeo}
          position={[0, floor.elevation + floor.height - 0.02, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial {...ceilingMatProps} side={THREE.DoubleSide} />
        </mesh>
      )}

      {showRoomLabels && (
        <Html
          position={[centroid[0], elevation + 0.15, centroid[1]]}
          center
          distanceFactor={16}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="rounded-md bg-slate-950/75 px-2 py-0.5 text-center text-[11px] font-medium text-white shadow-sm backdrop-blur-xs border border-white/15 whitespace-nowrap">
            <span>{room.name}</span>
            <span className="ml-1.5 text-sky-300">{area.toFixed(1)} m²</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function StylizedTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.2, 2.2, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
      {/* Layered architectural canopy */}
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#4a7c44" roughness={0.85} />
      </mesh>
      <mesh position={[0.45, 2.2, 0.35]} castShadow>
        <dodecahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial color="#598c52" roughness={0.85} />
      </mesh>
      <mesh position={[-0.4, 2.35, -0.3]} castShadow>
        <dodecahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color="#3e6b39" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Shrub({ position, radius = 0.45 }: { position: [number, number, number]; radius?: number }) {
  return (
    <mesh position={[position[0], radius * 0.7, position[2]]} castShadow receiveShadow>
      <dodecahedronGeometry args={[radius, 1]} />
      <meshStandardMaterial color="#568249" roughness={0.9} />
    </mesh>
  );
}

export function LandscapedYard({ materialsById }: { materialsById: Map<string, MaterialDef> }) {
  const lawnMat = materialsById.get('mat-garden-lawn');
  const lawnProps = useMemo(
    () =>
      getMaterialProps(
        lawnMat ?? {
          id: 'yard-lawn',
          name: 'Lawn',
          category: 'foliage',
          color: '#4e7a47',
          roughness: 0.95,
          metalness: 0,
        },
        [18, 18],
      ),
    [lawnMat],
  );

  const steppingStones: [number, number][] = [
    [-2.75, -6.0],
    [-2.75, -7.1],
    [-2.75, -8.2],
    [-2.75, -9.3],
  ];

  return (
    <group>
      {/* Surrounding terrain lawn */}
      <mesh position={[0, -0.26, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[64, 64]} />
        <meshStandardMaterial {...lawnProps} />
      </mesh>

      {/* Architectural gravel/concrete driveway & entry walkway */}
      <mesh position={[-2.75, -0.24, -7.8]} receiveShadow>
        <boxGeometry args={[3.2, 0.02, 5.2]} />
        <meshStandardMaterial color="#a6a39c" roughness={0.9} />
      </mesh>

      {steppingStones.map(([x, z], i) => (
        <mesh key={i} position={[x, -0.21, z]} receiveShadow castShadow>
          <boxGeometry args={[1.3, 0.05, 0.75]} />
          <meshStandardMaterial color="#d4cfc5" roughness={0.75} />
        </mesh>
      ))}

      {/* Perimeter modern trees & shrubs */}
      <StylizedTree position={[-9.5, -0.25, -4]} scale={1.15} />
      <StylizedTree position={[-10.2, -0.25, 5.5]} scale={0.95} />
      <StylizedTree position={[9.8, -0.25, -3.5]} scale={1.05} />
      <StylizedTree position={[9.5, -0.25, 7.2]} scale={1.2} />
      <StylizedTree position={[-4.5, -0.25, 11.2]} scale={0.9} />

      <Shrub position={[-7.2, -0.25, -5.5]} radius={0.45} />
      <Shrub position={[-7.3, -0.25, -4.3]} radius={0.38} />
      <Shrub position={[7.2, -0.25, 4.0]} radius={0.42} />
      <Shrub position={[7.1, -0.25, 5.2]} radius={0.5} />
      <Shrub position={[-5.2, -0.25, 7.8]} radius={0.4} />
      <Shrub position={[-4.2, -0.25, 8.6]} radius={0.35} />
    </group>
  );
}
