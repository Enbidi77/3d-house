'use client';

import React from 'react';
import type { Floor } from '@/domain';

interface BuildingExtrasProps {
  floors: Floor[];
  hideRoof: boolean;
}

/**
 * Architectural details for the modern 2-story villa:
 * flat roof overhang with charcoal parapet fascia and structural steel columns.
 */
export function BuildingExtras({ floors, hideRoof }: BuildingExtrasProps) {
  if (floors.length === 0) return null;

  const sortedFloors = [...floors].sort((a, b) => a.level - b.level);
  const topFloor = sortedFloors[sortedFloors.length - 1];
  const roofElevation = topFloor.elevation + topFloor.height;

  return (
    <group>
      {/* Structural black steel columns supporting the cantilevered upper balcony */}
      {topFloor.level >= 1 && (
        <group>
          <mesh position={[-5.85, topFloor.elevation / 2, 5.05]} castShadow receiveShadow>
            <boxGeometry args={[0.16, topFloor.elevation, 0.16]} />
            <meshStandardMaterial color="#232629" roughness={0.35} metalness={0.85} />
          </mesh>
          <mesh position={[5.85, topFloor.elevation / 2, 5.05]} castShadow receiveShadow>
            <boxGeometry args={[0.16, topFloor.elevation, 0.16]} />
            <meshStandardMaterial color="#232629" roughness={0.35} metalness={0.85} />
          </mesh>
        </group>
      )}

      {/* Modern flat roof overhang + parapet fascia */}
      {!hideRoof && topFloor.visible && (
        <group position={[0, roofElevation, -0.6]}>
          {/* Main roof slab */}
          <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[13.2, 0.24, 9.6]} />
            <meshStandardMaterial color="#3f4246" roughness={0.8} metalness={0.08} />
          </mesh>
          {/* Warm wood soffit underside */}
          <mesh position={[0, -0.005, 0]} receiveShadow>
            <boxGeometry args={[13.0, 0.02, 9.4]} />
            <meshStandardMaterial color="#8f6b4a" roughness={0.65} metalness={0.02} />
          </mesh>
          {/* Parapet rim */}
          <mesh position={[0, 0.28, -4.7]} castShadow>
            <boxGeometry args={[13.2, 0.12, 0.18]} />
            <meshStandardMaterial color="#232629" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.28, 4.7]} castShadow>
            <boxGeometry args={[13.2, 0.12, 0.18]} />
            <meshStandardMaterial color="#232629" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
}
