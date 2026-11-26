import * as THREE from 'three';
import type { MaterialCategory, MaterialDef, Vector2Tuple } from '@/domain';

export interface ThreeMaterialProps {
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  transparent: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  map?: THREE.CanvasTexture;
  normalMap?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  bumpScale?: number;
  envMapIntensity?: number;
  side?: THREE.Side;
}

type ProceduralPattern =
  | 'wood'
  | 'concrete'
  | 'marble'
  | 'brick'
  | 'tile'
  | 'grass'
  | 'soil'
  | 'fabric'
  | 'leather'
  | 'plaster'
  | 'metal'
  | 'water'
  | 'glass';

const textureCache = new Map<string, THREE.CanvasTexture>();

function seededNoise(x: number, y: number, seed = 1337): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 200, g: 200, b: 200 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbStr(r: number, g: number, b: number, a = 1): string {
  return a < 1
    ? `rgba(${clampByte(r)},${clampByte(g)},${clampByte(b)},${a})`
    : `rgb(${clampByte(r)},${clampByte(g)},${clampByte(b)})`;
}

function createCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  repeat: Vector2Tuple,
  isColorMap: boolean,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function drawWoodPlanks(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(r, g, b);
  ctx.fillRect(0, 0, size, size);

  const plankCount = 4;
  const plankH = size / plankCount;

  for (let p = 0; p < plankCount; p++) {
    const y0 = p * plankH;
    const toneShift = (seededNoise(p, 2, 11) - 0.5) * 18;
    ctx.fillStyle = rgbStr(r + toneShift, g + toneShift * 0.9, b + toneShift * 0.75);
    ctx.fillRect(0, y0, size, plankH);

    // Wood grain streaks
    for (let i = 0; i < 42; i++) {
      const gy = y0 + seededNoise(i, p, 31) * plankH;
      const alpha = 0.04 + seededNoise(i, p, 47) * 0.08;
      const dark = seededNoise(i, p, 59) > 0.45 ? -22 : 14;
      ctx.strokeStyle = rgbStr(r + dark, g + dark, b + dark, alpha);
      ctx.lineWidth = 1 + seededNoise(i, p, 71) * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(
        size * 0.33,
        gy + (seededNoise(i, 1, 9) - 0.5) * 4,
        size * 0.66,
        gy + (seededNoise(i, 2, 9) - 0.5) * 4,
        size,
        gy,
      );
      ctx.stroke();
    }

    // Plank seam
    ctx.fillStyle = rgbStr(r - 45, g - 45, b - 45, 0.55);
    ctx.fillRect(0, y0, size, 1.5);

    // Staggered vertical joint
    const jointX = ((p * 0.37 + 0.21) % 1) * size;
    ctx.fillRect(jointX, y0, 1.5, plankH);
  }
}

function drawConcrete(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(r, g, b);
  ctx.fillRect(0, 0, size, size);

  // Subtle architectural formwork blotches
  for (let i = 0; i < 180; i++) {
    const x = seededNoise(i, 1, 101) * size;
    const y = seededNoise(i, 2, 101) * size;
    const rad = 6 + seededNoise(i, 3, 101) * 26;
    const delta = (seededNoise(i, 4, 101) - 0.5) * 22;
    ctx.fillStyle = rgbStr(r + delta, g + delta, b + delta, 0.08);
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine aggregate speckles
  for (let i = 0; i < 650; i++) {
    const x = seededNoise(i, 5, 211) * size;
    const y = seededNoise(i, 6, 211) * size;
    const delta = seededNoise(i, 7, 211) > 0.5 ? 18 : -18;
    ctx.fillStyle = rgbStr(r + delta, g + delta, b + delta, 0.14);
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Subtle panel seam
  ctx.strokeStyle = rgbStr(r - 25, g - 25, b - 25, 0.22);
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
}

function drawMarble(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(r, g, b);
  ctx.fillRect(0, 0, size, size);

  for (let v = 0; v < 8; v++) {
    const startY = seededNoise(v, 1, 307) * size;
    ctx.strokeStyle = rgbStr(r - 36, g - 36, b - 32, 0.18 + seededNoise(v, 2, 307) * 0.14);
    ctx.lineWidth = 1 + seededNoise(v, 3, 307) * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, startY);
    for (let x = 24; x <= size; x += 24) {
      const y = startY + Math.sin(x * 0.03 + v * 1.9) * 18 + (seededNoise(x, v, 311) - 0.5) * 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(205, 200, 192);
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const brickH = size / rows;
  const brickW = size / cols;
  const mortar = 3;

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 1 ? brickW * 0.5 : 0;
    for (let col = -1; col <= cols; col++) {
      const x = col * brickW + offset;
      const y = row * brickH;
      const shift = (seededNoise(col + 5, row, 401) - 0.5) * 28;
      ctx.fillStyle = rgbStr(r + shift, g + shift * 0.8, b + shift * 0.7);
      ctx.fillRect(x + mortar / 2, y + mortar / 2, brickW - mortar, brickH - mortar);
    }
  }
}

function drawTiles(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(r - 28, g - 28, b - 28);
  ctx.fillRect(0, 0, size, size);

  const grid = 4;
  const tileSize = size / grid;
  const grout = 2;

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const shift = (seededNoise(col, row, 503) - 0.5) * 10;
      ctx.fillStyle = rgbStr(r + shift, g + shift, b + shift);
      ctx.fillRect(
        col * tileSize + grout / 2,
        row * tileSize + grout / 2,
        tileSize - grout,
        tileSize - grout,
      );
    }
  }
}

function drawGrass(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(r, g, b);
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1200; i++) {
    const x = seededNoise(i, 1, 607) * size;
    const y = seededNoise(i, 2, 607) * size;
    const delta = (seededNoise(i, 3, 607) - 0.5) * 34;
    ctx.strokeStyle = rgbStr(r + delta * 0.6, g + delta, b + delta * 0.5, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (seededNoise(i, 4, 607) - 0.5) * 3, y - 3 - seededNoise(i, 5, 607) * 4);
    ctx.stroke();
  }
}

function drawSoil(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(r, g, b);
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 800; i++) {
    const x = seededNoise(i, 1, 701) * size;
    const y = seededNoise(i, 2, 701) * size;
    const rad = 1 + seededNoise(i, 3, 701) * 2.5;
    const delta = (seededNoise(i, 4, 701) - 0.5) * 32;
    ctx.fillStyle = rgbStr(r + delta, g + delta * 0.9, b + delta * 0.8, 0.35);
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFabric(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(r, g, b);
  ctx.fillRect(0, 0, size, size);

  const step = 4;
  for (let y = 0; y < size; y += step) {
    ctx.fillStyle = rgbStr(r + 10, g + 10, b + 10, 0.14);
    ctx.fillRect(0, y, size, 1.5);
  }
  for (let x = 0; x < size; x += step) {
    ctx.fillStyle = rgbStr(r - 12, g - 12, b - 12, 0.12);
    ctx.fillRect(x, 0, 1.5, size);
  }
}

function drawPlaster(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = rgbStr(r, g, b);
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 240; i++) {
    const x = seededNoise(i, 1, 809) * size;
    const y = seededNoise(i, 2, 809) * size;
    const rad = 4 + seededNoise(i, 3, 809) * 14;
    const delta = (seededNoise(i, 4, 809) - 0.5) * 10;
    ctx.fillStyle = rgbStr(r + delta, g + delta, b + delta, 0.1);
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWaterNormal(ctx: CanvasRenderingContext2D, size: number): void {
  // Neutral normal base (128, 128, 255) with subtle ripples
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const nx =
        Math.sin((x / size) * Math.PI * 8 + Math.cos((y / size) * Math.PI * 4)) * 18 +
        Math.cos((x / size) * Math.PI * 14 - (y / size) * Math.PI * 6) * 8;
      const ny =
        Math.cos((y / size) * Math.PI * 8 + Math.sin((x / size) * Math.PI * 4)) * 18 +
        Math.sin((y / size) * Math.PI * 12 + (x / size) * Math.PI * 6) * 8;
      ctx.fillStyle = rgbStr(128 + nx, 128 + ny, 245);
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function inferPattern(materialDef: MaterialDef): ProceduralPattern {
  const hint = `${materialDef.id} ${materialDef.name}`.toLowerCase();
  if (hint.includes('marble')) return 'marble';
  if (hint.includes('brick')) return 'brick';
  if (hint.includes('soil') || hint.includes('dirt')) return 'soil';
  if (hint.includes('leather')) return 'leather';

  const map: Record<MaterialCategory, ProceduralPattern> = {
    wood: 'wood',
    concrete: 'concrete',
    stone: 'marble',
    tile: 'tile',
    foliage: 'grass',
    fabric: 'fabric',
    plaster: 'plaster',
    metal: 'metal',
    water: 'water',
    glass: 'glass',
  };
  return map[materialDef.category] ?? 'plaster';
}

function getOrCreateTexture(
  key: string,
  repeat: Vector2Tuple,
  isColorMap: boolean,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
): THREE.CanvasTexture | undefined {
  const cacheKey = `${key}:${repeat[0]}:${repeat[1]}`;
  const existing = textureCache.get(cacheKey);
  if (existing) return existing;

  const created = createCanvas(256);
  if (!created) return undefined;
  const [canvas, ctx] = created;
  draw(ctx, 256);
  const texture = configureTexture(canvas, repeat, isColorMap);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates Three.js MeshStandardMaterial / MeshPhysicalMaterial-compatible properties
 * with procedural canvas textures and proper UV scaling.
 */
export function getMaterialProps(
  materialDef?: MaterialDef | null,
  repeatOverride?: Vector2Tuple,
): ThreeMaterialProps {
  if (!materialDef) {
    return {
      color: '#d8d5ce',
      roughness: 0.85,
      metalness: 0.02,
      opacity: 1,
      transparent: false,
    };
  }

  const pattern = inferPattern(materialDef);
  const repeat: Vector2Tuple = repeatOverride ?? materialDef.textureScale ?? [1, 1];
  const baseProps: ThreeMaterialProps = {
    color: materialDef.color,
    roughness: materialDef.roughness,
    metalness: materialDef.metalness,
    opacity: materialDef.opacity ?? 1,
    transparent: Boolean(materialDef.transparent || (materialDef.opacity !== undefined && materialDef.opacity < 1)),
    emissive: materialDef.emissive,
    emissiveIntensity: materialDef.emissiveIntensity,
  };

  if (pattern === 'glass') {
    return {
      ...baseProps,
      transparent: true,
      opacity: materialDef.opacity ?? 0.32,
      roughness: Math.min(materialDef.roughness, 0.12),
      envMapIntensity: 1.4,
    };
  }

  if (pattern === 'water') {
    const normalMap = getOrCreateTexture('water-normal', repeat, false, (ctx, size) =>
      drawWaterNormal(ctx, size),
    );
    return {
      ...baseProps,
      transparent: true,
      opacity: materialDef.opacity ?? 0.78,
      roughness: 0.08,
      metalness: 0.12,
      normalMap,
      envMapIntensity: 1.3,
    };
  }

  if (pattern === 'metal') {
    return {
      ...baseProps,
      envMapIntensity: 1.15,
    };
  }

  if (pattern === 'leather') {
    const map = getOrCreateTexture(`leather:${materialDef.color}`, repeat, true, (ctx, size) =>
      drawPlaster(ctx, size, materialDef.color),
    );
    return {
      ...baseProps,
      color: '#ffffff',
      map,
      roughness: Math.max(0.35, materialDef.roughness),
    };
  }

  const drawFns: Record<
    Exclude<ProceduralPattern, 'glass' | 'water' | 'metal' | 'leather'>,
    (ctx: CanvasRenderingContext2D, size: number, color: string) => void
  > = {
    wood: drawWoodPlanks,
    concrete: drawConcrete,
    marble: drawMarble,
    brick: drawBrick,
    tile: drawTiles,
    grass: drawGrass,
    soil: drawSoil,
    fabric: drawFabric,
    plaster: drawPlaster,
  };

  const drawFn = drawFns[pattern];
  const map = getOrCreateTexture(`${pattern}:${materialDef.color}`, repeat, true, (ctx, size) =>
    drawFn(ctx, size, materialDef.color),
  );

  return {
    ...baseProps,
    color: map ? '#ffffff' : materialDef.color,
    map,
    bumpMap: map,
    bumpScale: pattern === 'brick' || pattern === 'tile' ? 0.015 : pattern === 'wood' ? 0.008 : 0.004,
  };
}

/**
 * Returns the shared animated water normal texture for pool/water surfaces.
 */
export function getWaterNormalTexture(repeat: Vector2Tuple = [3, 2]): THREE.CanvasTexture | undefined {
  return getOrCreateTexture('water-normal', repeat, false, (ctx, size) => drawWaterNormal(ctx, size));
}

/**
 * Disposes all cached procedural textures.
 */
export function disposeMaterialCache(): void {
  for (const texture of textureCache.values()) {
    texture.dispose();
  }
  textureCache.clear();
}
