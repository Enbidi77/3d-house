'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  calculateWallAngle,
  calculateWallLength,
  updateOpeningCommand,
  updateWallCommand,
  type Floor,
  type MaterialDef,
  type Opening,
  type Wall,
} from '@/domain';
import {
  useHistoryStore,
  useSelectionStore,
  useSimulationStore,
  useToolStore,
} from '@/stores';
import { getMaterialProps } from '../materials/materialFactory';

interface WallMeshProps {
  wall: Wall;
  floor: Floor;
  openings: Opening[];
  materialsById: Map<string, MaterialDef>;
  cutawayHeight?: number;
}

interface DoorPanelProps {
  opening: Opening;
  wallThickness: number;
  isSelected: boolean;
  onSelect: (e: ThreeEvent<MouseEvent>) => void;
  onToggleOpen: (e: ThreeEvent<MouseEvent>) => void;
}

function DoorPanel({
  opening,
  wallThickness,
  isSelected,
  onSelect,
  onToggleOpen,
}: DoorPanelProps) {
  const leafRef = useRef<THREE.Group>(null);
  const slideRef = useRef<THREE.Group>(null);
  const currentOpen = useRef(opening.openAmount ?? 0);

  const isSliding = opening.style === 'sliding';
  const isDouble = opening.style === 'double' || opening.style === 'french';
  const hingeSign = opening.hingeSide === 'right' ? 1 : -1;
  const frameDepth = wallThickness + 0.03;
  const jambThickness = 0.05;
  const innerW = Math.max(0.2, opening.width - jambThickness * 2);
  const innerH = Math.max(0.4, opening.height - jambThickness);

  useFrame((_, delta) => {
    const target = opening.openAmount ?? 0;
    currentOpen.current = THREE.MathUtils.lerp(
      currentOpen.current,
      target,
      Math.min(1, delta * 8),
    );

    if (isSliding && slideRef.current) {
      slideRef.current.position.x = currentOpen.current * (innerW * 0.45);
    } else if (leafRef.current) {
      leafRef.current.rotation.y = hingeSign * currentOpen.current * (Math.PI * 0.48);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(e);
    onToggleOpen(e);
  };

  const frameColor = isSelected ? '#38bdf8' : '#232629';

  return (
    <group position={[opening.offset, opening.sillHeight, 0]}>
      {/* Left jamb */}
      <mesh position={[-opening.width / 2 + jambThickness / 2, opening.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[jambThickness, opening.height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Right jamb */}
      <mesh position={[opening.width / 2 - jambThickness / 2, opening.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[jambThickness, opening.height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Top header */}
      <mesh position={[0, opening.height - jambThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[opening.width, jambThickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.75} />
      </mesh>

      {isSliding ? (
        <group>
          {/* Fixed glass panel */}
          <mesh position={[-innerW * 0.25, innerH / 2, -0.02]} castShadow>
            <boxGeometry args={[innerW * 0.52, innerH - 0.04, 0.025]} />
            <meshPhysicalMaterial
              color="#cbe5f0"
              roughness={0.05}
              metalness={0.1}
              transparent
              opacity={0.35}
            />
          </mesh>
          {/* Sliding glass panel */}
          <group ref={slideRef} position={[0, 0, 0.02]} onClick={handleClick}>
            <mesh position={[innerW * 0.25, innerH / 2, 0]} castShadow>
              <boxGeometry args={[innerW * 0.52, innerH - 0.04, 0.03]} />
              <meshPhysicalMaterial
                color="#cbe5f0"
                roughness={0.05}
                metalness={0.1}
                transparent
                opacity={0.38}
              />
            </mesh>
            {/* Vertical pull bar */}
            <mesh position={[0.04, innerH * 0.48, 0.025]}>
              <boxGeometry args={[0.025, 0.45, 0.025]} />
              <meshStandardMaterial color="#1e2226" roughness={0.25} metalness={0.9} />
            </mesh>
          </group>
        </group>
      ) : (
        <group
          ref={leafRef}
          position={[
            opening.hingeSide === 'right' ? innerW / 2 : -innerW / 2,
            0,
            0,
          ]}
          onClick={handleClick}
        >
          <mesh
            position={[
              opening.hingeSide === 'right' ? -innerW / 2 : innerW / 2,
              innerH / 2,
              0,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[innerW, innerH - 0.01, 0.045]} />
            <meshStandardMaterial
              color={isDouble ? '#d8d2c8' : '#7b5438'}
              roughness={0.55}
              metalness={0.08}
            />
          </mesh>
          {/* Door handle */}
          <mesh
            position={[
              opening.hingeSide === 'right' ? -innerW + 0.1 : innerW - 0.1,
              innerH * 0.46,
              0.035,
            ]}
          >
            <boxGeometry args={[0.11, 0.025, 0.04]} />
            <meshStandardMaterial color="#d4d4d8" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}

interface WindowFrameProps {
  opening: Opening;
  wallThickness: number;
  isSelected: boolean;
  onSelect: (e: ThreeEvent<MouseEvent>) => void;
}

function WindowFrame({ opening, wallThickness, isSelected, onSelect }: WindowFrameProps) {
  const frameDepth = wallThickness + 0.035;
  const bar = 0.045;
  const innerW = Math.max(0.15, opening.width - bar * 2);
  const innerH = Math.max(0.15, opening.height - bar * 2);
  const frameColor = isSelected ? '#38bdf8' : '#232629';

  return (
    <group
      position={[opening.offset, opening.sillHeight, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
    >
      {/* Bottom sill */}
      <mesh position={[0, bar / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[opening.width + 0.04, bar, frameDepth + 0.03]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Top header */}
      <mesh position={[0, opening.height - bar / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[opening.width, bar, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Left & right */}
      <mesh position={[-opening.width / 2 + bar / 2, opening.height / 2, 0]} castShadow>
        <boxGeometry args={[bar, opening.height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.75} />
      </mesh>
      <mesh position={[opening.width / 2 - bar / 2, opening.height / 2, 0]} castShadow>
        <boxGeometry args={[bar, opening.height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Center mullion for casement/sliding */}
      {(opening.style === 'casement' || opening.style === 'sliding') && (
        <mesh position={[0, opening.height / 2, 0]}>
          <boxGeometry args={[0.03, innerH, frameDepth * 0.7]} />
          <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.75} />
        </mesh>
      )}
      {/* Glass pane */}
      <mesh position={[0, opening.height / 2, 0]}>
        <boxGeometry args={[innerW, innerH, 0.018]} />
        <meshPhysicalMaterial
          color="#cbe5f0"
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.3}
          envMapIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

export function WallMesh({
  wall,
  floor,
  openings,
  materialsById,
  cutawayHeight,
}: WallMeshProps) {
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedType = useSelectionStore((s) => s.selectedType);
  const hoveredId = useSelectionStore((s) => s.hoveredId);
  const select = useSelectionStore((s) => s.select);
  const setHovered = useSelectionStore((s) => s.setHovered);

  const activeTool = useToolStore((s) => s.activeTool);
  const activeMaterialId = useToolStore((s) => s.activeMaterialId);
  const mode = useSimulationStore((s) => s.mode);
  const execute = useHistoryStore((s) => s.execute);

  const length = calculateWallLength(wall);
  const angle = calculateWallAngle(wall);
  const effectiveHeight =
    cutawayHeight !== undefined ? Math.min(wall.height, cutawayHeight) : wall.height;

  const isSelected = selectedType === 'wall' && selectedId === wall.id;
  const isHovered = hoveredId === wall.id;

  const extMatDef = materialsById.get(wall.exteriorMaterialId);
  const intMatDef = materialsById.get(wall.interiorMaterialId);
  const materialProps = useMemo(
    () => getMaterialProps(extMatDef ?? intMatDef, [Math.max(1, length / 2.5), Math.max(1, effectiveHeight / 2.5)]),
    [extMatDef, intMatDef, length, effectiveHeight],
  );

  const wallGeometry = useMemo(() => {
    if (length < 0.05 || effectiveHeight < 0.05) return null;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(length, 0);
    shape.lineTo(length, effectiveHeight);
    shape.lineTo(0, effectiveHeight);
    shape.closePath();

    if (!wall.isRailing) {
      for (const op of openings) {
        const u0 = Math.max(0.04, op.offset - op.width / 2);
        const u1 = Math.min(length - 0.04, op.offset + op.width / 2);
        const y0 = Math.max(0, op.sillHeight);
        const y1 = Math.min(effectiveHeight - 0.04, op.sillHeight + op.height);
        if (u1 - u0 > 0.05 && y1 - y0 > 0.05) {
          const hole = new THREE.Path();
          hole.moveTo(u0, y0);
          hole.lineTo(u1, y0);
          hole.lineTo(u1, y1);
          hole.lineTo(u0, y1);
          hole.closePath();
          shape.holes.push(hole);
        }
      }
    }

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: wall.thickness,
      bevelEnabled: false,
    });
    geom.translate(0, 0, -wall.thickness / 2);

    // Normalize UVs to meters
    const uvAttr = geom.attributes.uv;
    if (uvAttr) {
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setXY(i, uvAttr.getX(i) / 2.5, uvAttr.getY(i) / 2.5);
      }
      uvAttr.needsUpdate = true;
    }
    geom.computeVertexNormals();
    return geom;
  }, [length, effectiveHeight, wall.thickness, wall.isRailing, openings]);

  useEffect(() => {
    return () => {
      wallGeometry?.dispose();
    };
  }, [wallGeometry]);

  if (!wallGeometry) return null;

  const handleWallClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (activeTool === 'paint' && activeMaterialId) {
      execute(
        updateWallCommand(
          wall.id,
          { exteriorMaterialId: wall.exteriorMaterialId },
          { exteriorMaterialId: activeMaterialId },
          'Paint wall',
        ),
      );
      return;
    }
    select('wall', wall.id);
  };

  if (wall.isRailing) {
    const postCount = Math.max(2, Math.ceil(length / 1.5) + 1);
    return (
      <group
        position={[wall.start[0], floor.elevation, wall.start[1]]}
        rotation={[0, -angle, 0]}
        onClick={handleWallClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered('wall', wall.id);
        }}
        onPointerOut={() => setHovered(null, null)}
      >
        {/* Glass balustrade panel */}
        <mesh position={[length / 2, effectiveHeight / 2, 0]} castShadow>
          <boxGeometry args={[Math.max(0.05, length - 0.04), Math.max(0.1, effectiveHeight - 0.08), 0.025]} />
          <meshPhysicalMaterial
            color={isSelected ? '#7dd3fc' : '#cbe5f0'}
            roughness={0.05}
            metalness={0.1}
            transparent
            opacity={0.34}
          />
        </mesh>
        {/* Top handrail */}
        <mesh position={[length / 2, effectiveHeight - 0.025, 0]} castShadow>
          <boxGeometry args={[length + 0.04, 0.045, 0.06]} />
          <meshStandardMaterial color={isSelected ? '#38bdf8' : '#232629'} roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Bottom shoe */}
        <mesh position={[length / 2, 0.025, 0]} castShadow>
          <boxGeometry args={[length, 0.05, 0.05]} />
          <meshStandardMaterial color="#232629" roughness={0.35} metalness={0.85} />
        </mesh>
        {/* Posts */}
        {Array.from({ length: postCount }).map((_, idx) => {
          const x = (idx / (postCount - 1)) * length;
          return (
            <mesh key={idx} position={[x, effectiveHeight / 2, 0]} castShadow>
              <boxGeometry args={[0.04, effectiveHeight, 0.04]} />
              <meshStandardMaterial color="#232629" roughness={0.35} metalness={0.85} />
            </mesh>
          );
        })}
      </group>
    );
  }

  return (
    <group
      position={[wall.start[0], floor.elevation, wall.start[1]]}
      rotation={[0, -angle, 0]}
    >
      <mesh
        geometry={wallGeometry}
        castShadow
        receiveShadow
        onClick={handleWallClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered('wall', wall.id);
        }}
        onPointerOut={() => setHovered(null, null)}
      >
        <meshStandardMaterial
          {...materialProps}
          emissive={isSelected ? '#0284c7' : isHovered ? '#38bdf8' : materialProps.emissive ?? '#000000'}
          emissiveIntensity={isSelected ? 0.25 : isHovered ? 0.12 : materialProps.emissiveIntensity ?? 0}
        />
      </mesh>

      {openings.map((opening) => {
        const opSelected = selectedType === 'opening' && selectedId === opening.id;
        if (opening.sillHeight >= effectiveHeight) return null;

        if (opening.type === 'door') {
          return (
            <DoorPanel
              key={opening.id}
              opening={opening}
              wallThickness={wall.thickness}
              isSelected={opSelected}
              onSelect={() => select('opening', opening.id)}
              onToggleOpen={() => {
                if (mode === 'walk' || mode === 'orbit' || activeTool === 'select') {
                  const nextOpen = (opening.openAmount ?? 0) > 0.1 ? 0 : 0.85;
                  execute(
                    updateOpeningCommand(
                      opening.id,
                      { openAmount: opening.openAmount ?? 0 },
                      { openAmount: nextOpen },
                      'Toggle door',
                    ),
                  );
                }
              }}
            />
          );
        }

        return (
          <WindowFrame
            key={opening.id}
            opening={opening}
            wallThickness={wall.thickness}
            isSelected={opSelected}
            onSelect={() => select('opening', opening.id)}
          />
        );
      })}
    </group>
  );
}
