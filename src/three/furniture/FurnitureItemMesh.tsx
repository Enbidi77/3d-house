'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import {
  checkFurnitureClearance,
  type FurnitureItem,
  type MaterialDef,
} from '@/domain';
import { useSelectionStore } from '@/stores';
import { getMaterialProps } from '../materials/materialFactory';
import { FurnitureCatalogModel } from './FurnitureCatalogModels';
import { ImportedModel } from './ImportedModel';

interface FurnitureItemMeshProps {
  item: FurnitureItem;
  allFloorItems: FurnitureItem[];
  materialsById: Map<string, MaterialDef>;
  showCollisionWarnings?: boolean;
  registerRef?: (id: string, group: THREE.Group | null) => void;
}

function isCustomModelUrl(catalogId: string): boolean {
  return (
    catalogId.startsWith('http://') ||
    catalogId.startsWith('https://') ||
    catalogId.startsWith('blob:') ||
    catalogId.startsWith('data:')
  );
}

export function FurnitureItemMesh({
  item,
  allFloorItems,
  materialsById,
  showCollisionWarnings = true,
  registerRef,
}: FurnitureItemMeshProps) {
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedType = useSelectionStore((s) => s.selectedType);
  const hoveredId = useSelectionStore((s) => s.hoveredId);
  const select = useSelectionStore((s) => s.select);
  const setHovered = useSelectionStore((s) => s.setHovered);

  const isSelected = selectedType === 'furniture' && selectedId === item.id;
  const isHovered = hoveredId === item.id;

  const clearanceResult = useMemo(() => {
    if (!showCollisionWarnings || item.category === 'stairs') {
      return { valid: true, collidingIds: [] };
    }
    return checkFurnitureClearance(item, allFloorItems, 0);
  }, [item, allFloorItems, showCollisionWarnings]);

  const hasCollision = !clearanceResult.valid;

  const matDef = item.materialId ? materialsById.get(item.materialId) : undefined;
  const matProps = useMemo(() => {
    const base = getMaterialProps(matDef);
    if (item.colorOverride) {
      return { ...base, color: item.colorOverride, map: undefined };
    }
    return base;
  }, [matDef, item.colorOverride]);

  const [w, h, d] = item.dimensions;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    select('furniture', item.id);
  };

  return (
    <group
      ref={(node) => registerRef?.(item.id, node)}
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered('furniture', item.id);
      }}
      onPointerOut={() => setHovered(null, null)}
    >
      {isCustomModelUrl(item.catalogId) ? (
        <ImportedModel url={item.catalogId} dimensions={item.dimensions} />
      ) : (
        <FurnitureCatalogModel item={item} matProps={matProps} />
      )}

      {/* Selection / Hover / Collision bounding indicator */}
      {(isSelected || isHovered || hasCollision) && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.04, h + 0.04, d + 0.04]} />
          <meshBasicMaterial
            color={hasCollision ? '#ef4444' : isSelected ? '#38bdf8' : '#94a3b8'}
            wireframe
            transparent
            opacity={isSelected || hasCollision ? 0.85 : 0.45}
          />
        </mesh>
      )}

      {/* Lock badge when selected & locked */}
      {isSelected && item.locked && (
        <Html position={[0, h + 0.25, 0]} center distanceFactor={12}>
          <div className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950 shadow">
            Locked
          </div>
        </Html>
      )}
    </group>
  );
}
