import { z } from 'zod';
import type { Project } from '../models';

export const Vector2TupleSchema = z.tuple([z.number().finite(), z.number().finite()]);
export const Vector3TupleSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);

export const OpeningSchema = z.object({
  id: z.string().min(1),
  wallId: z.string().min(1),
  type: z.enum(['door', 'window']),
  style: z
    .enum(['single', 'double', 'sliding', 'french', 'garage', 'fixed', 'casement', 'picture', 'skylight'])
    .optional(),
  offset: z.number().finite().nonnegative(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  sillHeight: z.number().finite().nonnegative(),
  hingeSide: z.enum(['left', 'right']).optional(),
  openAmount: z.number().finite().min(0).max(1).optional(),
});

export const WallSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  start: Vector2TupleSchema,
  end: Vector2TupleSchema,
  thickness: z.number().finite().positive(),
  height: z.number().finite().positive(),
  exteriorMaterialId: z.string().min(1),
  interiorMaterialId: z.string().min(1),
  isExterior: z.boolean().optional(),
  isRailing: z.boolean().optional(),
});

export const RoomSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum([
    'living',
    'kitchen',
    'dining',
    'bedroom',
    'bathroom',
    'hallway',
    'loft',
    'patio',
    'balcony',
    'garden',
    'pool',
    'garage',
    'office',
    'other',
  ]),
  polygon: z.array(Vector2TupleSchema).min(3),
  floorMaterialId: z.string().min(1),
  ceilingMaterialId: z.string().min(1).optional(),
  hasCeiling: z.boolean().optional(),
  elevationOffset: z.number().finite().optional(),
  labelPosition: Vector2TupleSchema.optional(),
});

export const FurnitureItemSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  catalogId: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    'seating',
    'table',
    'bed',
    'storage',
    'kitchen',
    'bathroom',
    'lighting',
    'decor',
    'outdoor',
    'stairs',
  ]),
  position: Vector3TupleSchema,
  rotation: Vector3TupleSchema,
  scale: Vector3TupleSchema,
  dimensions: Vector3TupleSchema,
  materialId: z.string().min(1).optional(),
  colorOverride: z.string().optional(),
  locked: z.boolean().optional(),
});

export const MaterialDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    'concrete',
    'wood',
    'glass',
    'metal',
    'stone',
    'fabric',
    'plaster',
    'tile',
    'water',
    'foliage',
  ]),
  color: z.string().min(1),
  roughness: z.number().finite().min(0).max(1),
  metalness: z.number().finite().min(0).max(1),
  opacity: z.number().finite().min(0).max(1).optional(),
  transparent: z.boolean().optional(),
  emissive: z.string().optional(),
  emissiveIntensity: z.number().finite().min(0).optional(),
  textureScale: Vector2TupleSchema.optional(),
});

export const LightConfigSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1).optional(),
  name: z.string().min(1),
  type: z.enum(['ambient', 'directional', 'point', 'spot', 'hemisphere']),
  position: Vector3TupleSchema,
  target: Vector3TupleSchema.optional(),
  color: z.string().min(1),
  intensity: z.number().finite().nonnegative(),
  castShadow: z.boolean().optional(),
  distance: z.number().finite().nonnegative().optional(),
  decay: z.number().finite().nonnegative().optional(),
  angle: z.number().finite().nonnegative().optional(),
  penumbra: z.number().finite().min(0).max(1).optional(),
  enabled: z.boolean(),
});

export const CameraPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: Vector3TupleSchema,
  target: Vector3TupleSchema,
  fov: z.number().finite().min(15).max(120).optional(),
  floorId: z.string().min(1).optional(),
});

export const FloorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.number().int(),
  elevation: z.number().finite(),
  height: z.number().finite().positive(),
  slabThickness: z.number().finite().nonnegative(),
  visible: z.boolean(),
});

export const EnvironmentSettingsSchema = z.object({
  timeOfDay: z.number().finite().min(0).max(24),
  sunAzimuth: z.number().finite().min(0).max(360),
  sunElevation: z.number().finite().min(-90).max(90),
  exposure: z.number().finite().positive(),
  weather: z.enum(['clear', 'overcast', 'sunset', 'night']),
});

export const ProjectSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  unit: z.enum(['metric', 'imperial']),
  gridSize: z.number().finite().positive(),
  floors: z.array(FloorSchema).min(1),
  rooms: z.array(RoomSchema),
  walls: z.array(WallSchema),
  openings: z.array(OpeningSchema),
  furniture: z.array(FurnitureItemSchema),
  materials: z.array(MaterialDefSchema),
  lights: z.array(LightConfigSchema),
  cameraPresets: z.array(CameraPresetSchema),
  environment: EnvironmentSettingsSchema,
});

export function parseProject(input: unknown): Project {
  return ProjectSchema.parse(input);
}

/**
 * Migrates older or unversioned project payloads to version 1 and validates against ProjectSchema.
 */
export function migrateProject(input: unknown): Project {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid project payload: expected an object');
  }

  const raw = { ...(input as Record<string, unknown>) };

  if (raw.version === undefined || raw.version === 0) {
    raw.version = 1;
    raw.unit ??= 'metric';
    raw.gridSize ??= 0.25;
    raw.createdAt ??= new Date().toISOString();
    raw.updatedAt ??= new Date().toISOString();
    raw.openings ??= [];
    raw.furniture ??= [];
    raw.materials ??= [];
    raw.lights ??= [];
    raw.cameraPresets ??= [];
    raw.environment ??= {
      timeOfDay: 14,
      sunAzimuth: 145,
      sunElevation: 48,
      exposure: 1,
      weather: 'clear',
    };
  } else if (raw.version !== 1) {
    throw new Error(`Unsupported project version: ${String(raw.version)}`);
  }

  return ProjectSchema.parse(raw);
}
