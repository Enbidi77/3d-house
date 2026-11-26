'use client';

import React from 'react';
import type { FurnitureItem } from '@/domain';
import type { ThreeMaterialProps } from '../materials/materialFactory';

interface CatalogModelProps {
  item: FurnitureItem;
  matProps: ThreeMaterialProps;
}

function SofaLModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  const baseH = h * 0.42;
  const backH = h * 0.58;
  return (
    <group>
      {/* Main seat base */}
      <mesh position={[0, baseH / 2 + 0.06, -d * 0.22]} castShadow receiveShadow>
        <boxGeometry args={[w, baseH, d * 0.56]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Chaise extension */}
      <mesh position={[-w * 0.3, baseH / 2 + 0.06, d * 0.2]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.4, baseH, d * 0.58]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, baseH + backH / 2 + 0.04, -d * 0.43]} castShadow receiveShadow>
        <boxGeometry args={[w, backH, 0.2]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Armrests */}
      <mesh position={[-w / 2 + 0.1, h * 0.45, -d * 0.12]} castShadow>
        <boxGeometry args={[0.18, h * 0.6, d * 0.75]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2 - 0.1, h * 0.45, -d * 0.22]} castShadow>
        <boxGeometry args={[0.18, h * 0.6, d * 0.56]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Accent throw pillows */}
      <mesh position={[w * 0.28, baseH + 0.22, -d * 0.28]} rotation={[0.2, -0.3, 0]} castShadow>
        <boxGeometry args={[0.38, 0.34, 0.14]} />
        <meshStandardMaterial color="#8fa3b0" roughness={0.9} />
      </mesh>
      <mesh position={[-w * 0.32, baseH + 0.22, -d * 0.28]} rotation={[0.2, 0.25, 0]} castShadow>
        <boxGeometry args={[0.38, 0.34, 0.14]} />
        <meshStandardMaterial color="#c49a6c" roughness={0.9} />
      </mesh>
    </group>
  );
}

function ArmchairModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  return (
    <group>
      <mesh position={[0, h * 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.85, h * 0.34, d * 0.85]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, h * 0.58, -d * 0.36]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.85, h * 0.55, 0.16]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[-w * 0.42, h * 0.38, 0]} castShadow>
        <boxGeometry args={[0.14, h * 0.45, d * 0.82]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w * 0.42, h * 0.38, 0]} castShadow>
        <boxGeometry args={[0.14, h * 0.45, d * 0.82]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}

function TableModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  const topThick = Math.min(0.06, h * 0.12);
  const legW = 0.05;
  const legH = h - topThick;
  const ox = w / 2 - legW * 1.4;
  const oz = d / 2 - legW * 1.4;
  return (
    <group>
      <mesh position={[0, h - topThick / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, topThick, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {[
        [-ox, -oz],
        [ox, -oz],
        [-ox, oz],
        [ox, oz],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, legH / 2, lz]} castShadow receiveShadow>
          <boxGeometry args={[legW, legH, legW]} />
          <meshStandardMaterial color="#232629" roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function ChairModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  const seatY = h * 0.48;
  return (
    <group>
      <mesh position={[0, seatY, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.88, 0.05, d * 0.86]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, seatY + h * 0.25, -d * 0.38]} castShadow>
        <boxGeometry args={[w * 0.84, h * 0.48, 0.05]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {[
        [-w * 0.36, -d * 0.36],
        [w * 0.36, -d * 0.36],
        [-w * 0.36, d * 0.36],
        [w * 0.36, d * 0.36],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, seatY / 2, lz]} castShadow>
          <cylinderGeometry args={[0.018, 0.015, seatY, 8]} />
          <meshStandardMaterial color="#232629" roughness={0.3} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function BedModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  return (
    <group>
      {/* Timber platform */}
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.22, d]} />
        <meshStandardMaterial color="#5a3d2b" roughness={0.55} />
      </mesh>
      {/* Headboard */}
      <mesh position={[0, h * 0.52, -d / 2 + 0.08]} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.95, 0.14]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Mattress */}
      <mesh position={[0, 0.36, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.92, 0.24, d * 0.88]} />
        <meshStandardMaterial color="#f5f3ef" roughness={0.92} />
      </mesh>
      {/* Duvet */}
      <mesh position={[0, 0.4, d * 0.14]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.94, 0.18, d * 0.62]} />
        <meshStandardMaterial color="#d8d2c7" roughness={0.95} />
      </mesh>
      {/* Pillows */}
      <mesh position={[-w * 0.23, 0.52, -d * 0.3]} castShadow>
        <boxGeometry args={[w * 0.36, 0.12, 0.42]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[w * 0.23, 0.52, -d * 0.3]} castShadow>
        <boxGeometry args={[w * 0.36, 0.12, 0.42]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
    </group>
  );
}

function StorageModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  const isShelf = item.catalogId.includes('shelf');
  if (isShelf) {
    const levels = 4;
    return (
      <group>
        {/* Side uprights */}
        <mesh position={[-w / 2 + 0.025, h / 2, 0]} castShadow>
          <boxGeometry args={[0.04, h, d]} />
          <meshStandardMaterial color="#232629" roughness={0.35} metalness={0.8} />
        </mesh>
        <mesh position={[w / 2 - 0.025, h / 2, 0]} castShadow>
          <boxGeometry args={[0.04, h, d]} />
          <meshStandardMaterial color="#232629" roughness={0.35} metalness={0.8} />
        </mesh>
        {Array.from({ length: levels }).map((_, i) => (
          <mesh key={i} position={[0, 0.1 + (i / (levels - 1)) * (h - 0.16), 0]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.04, 0.035, d]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Subtle door seam */}
      <mesh position={[0, h / 2, d / 2 + 0.005]}>
        <boxGeometry args={[0.015, h * 0.92, 0.01]} />
        <meshStandardMaterial color="#1e2022" roughness={0.5} />
      </mesh>
    </group>
  );
}

function KitchenIslandModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  return (
    <group>
      {/* Cabinet body */}
      <mesh position={[0, (h - 0.06) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.96, h - 0.06, d * 0.92]} />
        <meshStandardMaterial color="#3f4246" roughness={0.65} />
      </mesh>
      {/* Waterfall stone countertop */}
      <mesh position={[0, h - 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Waterfall sides */}
      <mesh position={[-w / 2 + 0.03, h / 2, 0]} castShadow>
        <boxGeometry args={[0.06, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2 - 0.03, h / 2, 0]} castShadow>
        <boxGeometry args={[0.06, h, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Undermount sink basin */}
      <mesh position={[w * 0.18, h + 0.002, 0]}>
        <boxGeometry args={[0.62, 0.02, 0.44]} />
        <meshStandardMaterial color="#a1a1aa" roughness={0.25} metalness={0.85} />
      </mesh>
      {/* Faucet */}
      <mesh position={[w * 0.18, h + 0.16, -0.22]} castShadow>
        <cylinderGeometry args={[0.016, 0.02, 0.32, 10]} />
        <meshStandardMaterial color="#232629" roughness={0.25} metalness={0.9} />
      </mesh>
    </group>
  );
}

function BathroomModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  if (item.catalogId.includes('tub')) {
    return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#f5f5f4" roughness={0.18} metalness={0.05} />
        </mesh>
        <mesh position={[0, h + 0.005, 0]}>
          <boxGeometry args={[w * 0.84, 0.02, d * 0.78]} />
          <meshStandardMaterial color="#d4e9f2" roughness={0.1} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      {/* Vanity cabinet */}
      <mesh position={[0, h * 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.72, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Stone counter */}
      <mesh position={[0, h * 0.86, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.02, 0.06, d + 0.02]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.35} />
      </mesh>
      {/* Vessel basin */}
      <mesh position={[0, h * 0.94, 0.04]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.12, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} />
      </mesh>
    </group>
  );
}

function StairsModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  const steps = 13;
  const stepW = w / steps;
  const stepH = h / steps;
  return (
    <group>
      {/* Central steel stringer */}
      <mesh
        position={[0, h / 2, 0]}
        rotation={[0, 0, Math.atan2(h, w)]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[Math.hypot(w, h), 0.14, 0.14]} />
        <meshStandardMaterial color="#232629" roughness={0.35} metalness={0.85} />
      </mesh>
      {/* Floating oak treads */}
      {Array.from({ length: steps }).map((_, i) => {
        const x = -w / 2 + stepW * (i + 0.5);
        const y = stepH * (i + 1);
        return (
          <mesh key={i} position={[x, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[stepW * 1.15, 0.055, d]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        );
      })}
    </group>
  );
}

function OutdoorLoungerModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  return (
    <group>
      <mesh position={[0, h * 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.08, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Reclined backrest */}
      <mesh position={[0, h * 0.78, -d * 0.28]} rotation={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.94, 0.07, d * 0.38]} />
        <meshStandardMaterial color="#f5f0e6" roughness={0.9} />
      </mesh>
      {/* Cushion */}
      <mesh position={[0, h * 0.58, d * 0.15]} castShadow>
        <boxGeometry args={[w * 0.92, 0.06, d * 0.58]} />
        <meshStandardMaterial color="#f5f0e6" roughness={0.9} />
      </mesh>
    </group>
  );
}

function LightingFixtureModel({ item }: CatalogModelProps) {
  const [w, h] = item.dimensions;
  return (
    <group>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[w * 0.45, w * 0.5, 0.04, 16]} />
        <meshStandardMaterial color="#232629" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[0, h * 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, h * 0.85, 10]} />
        <meshStandardMaterial color="#232629" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[0, h * 0.88, 0]} castShadow>
        <cylinderGeometry args={[w * 0.35, w * 0.55, h * 0.22, 16]} />
        <meshStandardMaterial
          color="#fff4e0"
          emissive="#ffd699"
          emissiveIntensity={0.45}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}

function DecorModel({ item, matProps }: CatalogModelProps) {
  const [w, h, d] = item.dimensions;
  const hint = item.catalogId.toLowerCase();
  if (hint.includes('plant')) {
    return (
      <group>
        <mesh position={[0, h * 0.22, 0]} castShadow>
          <cylinderGeometry args={[w * 0.35, w * 0.26, h * 0.44, 14]} />
          <meshStandardMaterial color="#d6d3d1" roughness={0.75} />
        </mesh>
        <mesh position={[0, h * 0.65, 0]} castShadow>
          <dodecahedronGeometry args={[w * 0.45, 1]} />
          <meshStandardMaterial color="#4a7c44" roughness={0.85} />
        </mesh>
      </group>
    );
  }
  if (hint.includes('rug')) {
    return (
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    );
  }
  return (
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}

export function FurnitureCatalogModel({ item, matProps }: CatalogModelProps) {
  const cid = item.catalogId.toLowerCase();

  if (cid.includes('sofa')) return <SofaLModel item={item} matProps={matProps} />;
  if (cid.includes('armchair')) return <ArmchairModel item={item} matProps={matProps} />;
  if (cid.includes('chair') || cid.includes('stool')) return <ChairModel item={item} matProps={matProps} />;
  if (cid.includes('table') || cid.includes('desk')) return <TableModel item={item} matProps={matProps} />;
  if (cid.includes('bed')) return <BedModel item={item} matProps={matProps} />;
  if (cid.includes('island')) return <KitchenIslandModel item={item} matProps={matProps} />;
  if (cid.includes('stairs')) return <StairsModel item={item} matProps={matProps} />;
  if (cid.includes('lounger')) return <OutdoorLoungerModel item={item} matProps={matProps} />;

  switch (item.category) {
    case 'seating':
      return <SofaLModel item={item} matProps={matProps} />;
    case 'table':
      return <TableModel item={item} matProps={matProps} />;
    case 'bed':
      return <BedModel item={item} matProps={matProps} />;
    case 'storage':
      return <StorageModel item={item} matProps={matProps} />;
    case 'kitchen':
      return <KitchenIslandModel item={item} matProps={matProps} />;
    case 'bathroom':
      return <BathroomModel item={item} matProps={matProps} />;
    case 'lighting':
      return <LightingFixtureModel item={item} matProps={matProps} />;
    case 'outdoor':
      return <OutdoorLoungerModel item={item} matProps={matProps} />;
    case 'stairs':
      return <StairsModel item={item} matProps={matProps} />;
    case 'decor':
    default:
      return <DecorModel item={item} matProps={matProps} />;
  }
}
