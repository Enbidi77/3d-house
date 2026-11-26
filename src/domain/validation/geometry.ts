import { calculatePolygonArea, calculateWallLength } from '../calculations';
import type { Opening, Project, Room, Wall } from '../models';

export interface ValidationIssue {
  code: string;
  message: string;
  entityId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const MIN_WALL_LENGTH = 0.1;
const MIN_ROOM_AREA = 0.1;

/**
 * Validates wall dimensions and checks that all attached openings fit without overlapping.
 */
export function validateWallGeometry(wall: Wall, openings: Opening[] = []): ValidationResult {
  const issues: ValidationIssue[] = [];
  const length = calculateWallLength(wall);

  if (length < MIN_WALL_LENGTH) {
    issues.push({
      code: 'WALL_TOO_SHORT',
      message: `Wall "${wall.id}" length (${length.toFixed(2)}m) is below minimum (${MIN_WALL_LENGTH}m).`,
      entityId: wall.id,
    });
  }

  if (wall.thickness <= 0 || wall.height <= 0) {
    issues.push({
      code: 'WALL_INVALID_DIMENSIONS',
      message: `Wall "${wall.id}" must have positive thickness and height.`,
      entityId: wall.id,
    });
  }

  const wallOpenings = openings
    .filter((o) => o.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);

  for (let i = 0; i < wallOpenings.length; i++) {
    const opening = wallOpenings[i];
    const halfWidth = opening.width / 2;
    const startEdge = opening.offset - halfWidth;
    const endEdge = opening.offset + halfWidth;

    if (startEdge < 0 || endEdge > length) {
      issues.push({
        code: 'OPENING_OUT_OF_BOUNDS',
        message: `Opening "${opening.id}" extends outside wall "${wall.id}" bounds.`,
        entityId: opening.id,
      });
    }

    if (opening.sillHeight + opening.height > wall.height) {
      issues.push({
        code: 'OPENING_EXCEEDS_WALL_HEIGHT',
        message: `Opening "${opening.id}" top exceeds wall "${wall.id}" height.`,
        entityId: opening.id,
      });
    }

    if (i > 0) {
      const prev = wallOpenings[i - 1];
      const prevEnd = prev.offset + prev.width / 2;
      if (startEdge < prevEnd - 1e-4) {
        issues.push({
          code: 'OPENING_OVERLAP',
          message: `Openings "${prev.id}" and "${opening.id}" overlap on wall "${wall.id}".`,
          entityId: opening.id,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Validates room polygon vertex count, non-degenerate edges, and minimum area.
 */
export function validateRoomGeometry(room: Room): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (room.polygon.length < 3) {
    issues.push({
      code: 'ROOM_TOO_FEW_VERTICES',
      message: `Room "${room.name}" must have at least 3 vertices.`,
      entityId: room.id,
    });
    return { valid: false, issues };
  }

  for (let i = 0; i < room.polygon.length; i++) {
    const a = room.polygon[i];
    const b = room.polygon[(i + 1) % room.polygon.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-4) {
      issues.push({
        code: 'ROOM_DEGENERATE_EDGE',
        message: `Room "${room.name}" has duplicate consecutive vertices at index ${i}.`,
        entityId: room.id,
      });
    }
  }

  const area = calculatePolygonArea(room.polygon);
  if (area < MIN_ROOM_AREA) {
    issues.push({
      code: 'ROOM_AREA_TOO_SMALL',
      message: `Room "${room.name}" area (${area.toFixed(2)}m²) is below minimum (${MIN_ROOM_AREA}m²).`,
      entityId: room.id,
    });
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Runs geometry and referential integrity validation across an entire project.
 */
export function validateProject(project: Project): ValidationResult {
  const issues: ValidationIssue[] = [];
  const floorIds = new Set(project.floors.map((f) => f.id));

  for (const wall of project.walls) {
    if (!floorIds.has(wall.floorId)) {
      issues.push({
        code: 'WALL_UNKNOWN_FLOOR',
        message: `Wall "${wall.id}" references unknown floor "${wall.floorId}".`,
        entityId: wall.id,
      });
    }
    issues.push(...validateWallGeometry(wall, project.openings).issues);
  }

  for (const room of project.rooms) {
    if (!floorIds.has(room.floorId)) {
      issues.push({
        code: 'ROOM_UNKNOWN_FLOOR',
        message: `Room "${room.id}" references unknown floor "${room.floorId}".`,
        entityId: room.id,
      });
    }
    issues.push(...validateRoomGeometry(room).issues);
  }

  const wallIds = new Set(project.walls.map((w) => w.id));
  for (const opening of project.openings) {
    if (!wallIds.has(opening.wallId)) {
      issues.push({
        code: 'OPENING_UNKNOWN_WALL',
        message: `Opening "${opening.id}" references unknown wall "${opening.wallId}".`,
        entityId: opening.id,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}
