import type { FurnitureItem, Vector2Tuple, Vector3Tuple, Wall } from '../models';

/**
 * Computes the area of a simple 2D polygon using the shoelace formula.
 */
export function calculatePolygonArea(polygon: Vector2Tuple[]): number {
  if (polygon.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/**
 * Computes the closed perimeter of a 2D polygon in meters.
 */
export function calculatePolygonPerimeter(polygon: Vector2Tuple[]): number {
  if (polygon.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    perimeter += Math.hypot(x2 - x1, y2 - y1);
  }
  return perimeter;
}

/**
 * Computes the geometric centroid of a 2D polygon.
 */
export function calculatePolygonCentroid(polygon: Vector2Tuple[]): Vector2Tuple {
  if (polygon.length === 0) return [0, 0];
  let cx = 0;
  let cz = 0;
  for (const [x, z] of polygon) {
    cx += x;
    cz += z;
  }
  return [cx / polygon.length, cz / polygon.length];
}

/**
 * Ray-casting point-in-polygon test in 2D.
 */
export function isPointInPolygon(point: Vector2Tuple, polygon: Vector2Tuple[]): boolean {
  if (polygon.length < 3) return false;
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Snaps a scalar value to the nearest grid increment.
 */
export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  const snapped = Math.round(value / gridSize) * gridSize;
  return Object.is(snapped, -0) ? 0 : Number(snapped.toFixed(6));
}

/**
 * Snaps a 2D point to the nearest grid intersection.
 */
export function snapPointToGrid(point: Vector2Tuple, gridSize: number): Vector2Tuple {
  return [snapToGrid(point[0], gridSize), snapToGrid(point[1], gridSize)];
}

/**
 * Snaps the segment (start -> end) to the nearest angle increment while preserving length.
 */
export function snapAngle(
  start: Vector2Tuple,
  end: Vector2Tuple,
  angleStepDeg = 45,
): Vector2Tuple {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const len = Math.hypot(dx, dz);
  if (len === 0 || angleStepDeg <= 0) return end;

  const stepRad = (angleStepDeg * Math.PI) / 180;
  const rawAngle = Math.atan2(dz, dx);
  const snappedAngle = Math.round(rawAngle / stepRad) * stepRad;

  return [
    Number((start[0] + Math.cos(snappedAngle) * len).toFixed(6)),
    Number((start[1] + Math.sin(snappedAngle) * len).toFixed(6)),
  ];
}

/**
 * Returns the length of a wall in meters.
 */
export function calculateWallLength(wall: Pick<Wall, 'start' | 'end'>): number {
  return Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
}

/**
 * Returns the angle of a wall in radians relative to +X.
 */
export function calculateWallAngle(wall: Pick<Wall, 'start' | 'end'>): number {
  return Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0]);
}

/**
 * Returns the unit normal vector perpendicular to the wall direction (left-hand normal).
 */
export function calculateWallNormal(wall: Pick<Wall, 'start' | 'end'>): Vector2Tuple {
  const dx = wall.end[0] - wall.start[0];
  const dz = wall.end[1] - wall.start[1];
  const len = Math.hypot(dx, dz);
  if (len === 0) return [0, 1];
  const nx = -dz / len;
  const nz = dx / len;
  return [Object.is(nx, -0) ? 0 : nx, Object.is(nz, -0) ? 0 : nz];
}

/**
 * Snaps a 2D point to the nearest existing wall endpoint within `threshold` meters.
 */
export function snapToWallEndpoints(
  point: Vector2Tuple,
  walls: Wall[],
  threshold = 0.25,
  excludeWallId?: string,
): { point: Vector2Tuple; snapped: boolean; wallId?: string } {
  let bestDist = threshold;
  let bestPoint: Vector2Tuple = point;
  let snappedWallId: string | undefined;

  for (const wall of walls) {
    if (wall.id === excludeWallId) continue;
    for (const endpoint of [wall.start, wall.end]) {
      const dist = Math.hypot(point[0] - endpoint[0], point[1] - endpoint[1]);
      if (dist <= bestDist) {
        bestDist = dist;
        bestPoint = [endpoint[0], endpoint[1]];
        snappedWallId = wall.id;
      }
    }
  }

  return {
    point: bestPoint,
    snapped: snappedWallId !== undefined,
    wallId: snappedWallId,
  };
}

/**
 * Computes the shortest distance from a 2D point to a line segment [a, b].
 */
export function distancePointToSegment(
  point: Vector2Tuple,
  a: Vector2Tuple,
  b: Vector2Tuple,
): { distance: number; closest: Vector2Tuple; t: number } {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    return { distance: Math.hypot(point[0] - a[0], point[1] - a[1]), closest: a, t: 0 };
  }
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / lenSq));
  const closest: Vector2Tuple = [a[0] + t * dx, a[1] + t * dz];
  return {
    distance: Math.hypot(point[0] - closest[0], point[1] - closest[1]),
    closest,
    t,
  };
}

/**
 * Computes an axis-aligned bounding box for a furniture item, accounting for Y-axis rotation and scale.
 */
export function getFurnitureAABB(item: FurnitureItem): { min: Vector3Tuple; max: Vector3Tuple } {
  const w = Math.abs(item.dimensions[0] * item.scale[0]);
  const h = Math.abs(item.dimensions[1] * item.scale[1]);
  const d = Math.abs(item.dimensions[2] * item.scale[2]);

  const yaw = item.rotation[1];
  const cos = Math.abs(Math.cos(yaw));
  const sin = Math.abs(Math.sin(yaw));

  const halfX = (w * cos + d * sin) / 2;
  const halfZ = (w * sin + d * cos) / 2;

  const [px, py, pz] = item.position;
  return {
    min: [px - halfX, py, pz - halfZ],
    max: [px + halfX, py + h, pz + halfZ],
  };
}

/**
 * Checks whether two furniture items overlap (including an optional clearance margin in meters).
 */
export function checkFurnitureOverlap(
  a: FurnitureItem,
  b: FurnitureItem,
  clearance = 0,
): boolean {
  if (a.floorId !== b.floorId) return false;
  const boxA = getFurnitureAABB(a);
  const boxB = getFurnitureAABB(b);

  const overlapX = boxA.min[0] - clearance < boxB.max[0] && boxA.max[0] + clearance > boxB.min[0];
  const overlapY = boxA.min[1] < boxB.max[1] && boxA.max[1] > boxB.min[1];
  const overlapZ = boxA.min[2] - clearance < boxB.max[2] && boxA.max[2] + clearance > boxB.min[2];

  return overlapX && overlapY && overlapZ;
}

/**
 * Checks a furniture item against all other items on the same floor for clearance violations.
 */
export function checkFurnitureClearance(
  item: FurnitureItem,
  others: FurnitureItem[],
  clearance = 0,
): { valid: boolean; collidingIds: string[] } {
  const collidingIds: string[] = [];
  for (const other of others) {
    if (other.id === item.id) continue;
    if (checkFurnitureOverlap(item, other, clearance)) {
      collidingIds.push(other.id);
    }
  }
  return {
    valid: collidingIds.length === 0,
    collidingIds,
  };
}
