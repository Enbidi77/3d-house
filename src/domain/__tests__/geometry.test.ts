import { describe, expect, it } from 'vitest';
import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  calculatePolygonPerimeter,
  calculateWallAngle,
  calculateWallLength,
  calculateWallNormal,
  checkFurnitureClearance,
  checkFurnitureOverlap,
  isPointInPolygon,
  snapAngle,
  snapPointToGrid,
  snapToGrid,
  snapToWallEndpoints,
  type FurnitureItem,
  type Wall,
} from '@/domain';

describe('domain calculations', () => {
  it('computes area and perimeter for rectangular and L-shaped polygons', () => {
    const rect: [number, number][] = [
      [0, 0],
      [6, 0],
      [6, 4],
      [0, 4],
    ];
    expect(calculatePolygonArea(rect)).toBeCloseTo(24, 6);
    expect(calculatePolygonPerimeter(rect)).toBeCloseTo(20, 6);
    expect(calculatePolygonCentroid(rect)).toEqual([3, 2]);
    expect(isPointInPolygon([3, 2], rect)).toBe(true);
    expect(isPointInPolygon([7, 2], rect)).toBe(false);

    // L-shape: 4x4 minus 2x2 corner = 12 m²
    const lShape: [number, number][] = [
      [0, 0],
      [4, 0],
      [4, 2],
      [2, 2],
      [2, 4],
      [0, 4],
    ];
    expect(calculatePolygonArea(lShape)).toBeCloseTo(12, 6);
    expect(calculatePolygonPerimeter(lShape)).toBeCloseTo(16, 6);
  });

  it('snaps scalars, points, and angles accurately', () => {
    expect(snapToGrid(1.37, 0.25)).toBe(1.25);
    expect(snapToGrid(-0.02, 0.25)).toBe(0);
    expect(snapPointToGrid([2.14, -1.62], 0.25)).toEqual([2.25, -1.5]);

    const snapped45 = snapAngle([0, 0], [3.9, 4.1], 45);
    const angleDeg = (Math.atan2(snapped45[1], snapped45[0]) * 180) / Math.PI;
    expect(angleDeg).toBeCloseTo(45, 4);
  });

  it('computes wall length, angle, normal, and endpoint snapping', () => {
    const wall: Wall = {
      id: 'w1',
      floorId: 'f1',
      start: [0, 0],
      end: [4, 0],
      thickness: 0.2,
      height: 3,
      exteriorMaterialId: 'm1',
      interiorMaterialId: 'm2',
    };

    expect(calculateWallLength(wall)).toBe(4);
    expect(calculateWallAngle(wall)).toBe(0);
    expect(calculateWallNormal(wall)).toEqual([0, 1]);

    const snapHit = snapToWallEndpoints([4.12, 0.08], [wall], 0.25);
    expect(snapHit.snapped).toBe(true);
    expect(snapHit.point).toEqual([4, 0]);
    expect(snapHit.wallId).toBe('w1');

    const snapMiss = snapToWallEndpoints([4.5, 0.5], [wall], 0.25);
    expect(snapMiss.snapped).toBe(false);
  });

  it('detects furniture overlap and clearance violations', () => {
    const sofa: FurnitureItem = {
      id: 'f-sofa',
      floorId: 'floor-1',
      catalogId: 'sofa',
      name: 'Sofa',
      category: 'seating',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: [2, 0.8, 1],
    };

    const tableClose: FurnitureItem = {
      id: 'f-table',
      floorId: 'floor-1',
      catalogId: 'table',
      name: 'Table',
      category: 'table',
      position: [0, 0, 1.1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: [1.2, 0.4, 0.8],
    };

    // Without clearance: sofa z in [-0.5, 0.5], table z in [0.7, 1.5] -> no overlap
    expect(checkFurnitureOverlap(sofa, tableClose, 0)).toBe(false);
    // With 0.3m clearance -> violates clearance
    expect(checkFurnitureOverlap(sofa, tableClose, 0.3)).toBe(true);
    expect(checkFurnitureClearance(sofa, [sofa, tableClose], 0.3)).toEqual({
      valid: false,
      collidingIds: ['f-table'],
    });
  });
});
