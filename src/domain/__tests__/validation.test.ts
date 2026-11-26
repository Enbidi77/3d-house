import { describe, expect, it } from 'vitest';
import {
  STARTER_HOUSE_PROJECT,
  migrateProject,
  parseProject,
  validateProject,
  validateRoomGeometry,
  validateWallGeometry,
  type Opening,
  type Room,
  type Wall,
} from '@/domain';

describe('domain validation and serialization', () => {
  it('validates the starter house project with zero geometry issues', () => {
    const parsed = parseProject(STARTER_HOUSE_PROJECT);
    expect(parsed.version).toBe(1);
    expect(parsed.floors).toHaveLength(2);

    const result = validateProject(parsed);
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('detects invalid wall lengths and overlapping or out-of-bounds openings', () => {
    const shortWall: Wall = {
      id: 'w-short',
      floorId: 'f1',
      start: [0, 0],
      end: [0.05, 0],
      thickness: 0.2,
      height: 3,
      exteriorMaterialId: 'm1',
      interiorMaterialId: 'm1',
    };
    expect(validateWallGeometry(shortWall).valid).toBe(false);

    const wall: Wall = {
      id: 'w-ok',
      floorId: 'f1',
      start: [0, 0],
      end: [5, 0],
      thickness: 0.2,
      height: 3,
      exteriorMaterialId: 'm1',
      interiorMaterialId: 'm1',
    };
    const openings: Opening[] = [
      { id: 'o1', wallId: 'w-ok', type: 'door', offset: 2.0, width: 1.2, height: 2.2, sillHeight: 0 },
      { id: 'o2', wallId: 'w-ok', type: 'window', offset: 2.8, width: 1.2, height: 1.2, sillHeight: 0.9 },
    ];
    const res = validateWallGeometry(wall, openings);
    expect(res.valid).toBe(false);
    expect(res.issues.some((i) => i.code === 'OPENING_OVERLAP')).toBe(true);
  });

  it('detects degenerate room polygons', () => {
    const tinyRoom: Room = {
      id: 'r-tiny',
      floorId: 'f1',
      name: 'Tiny',
      type: 'other',
      polygon: [
        [0, 0],
        [0.1, 0],
        [0.1, 0.1],
      ],
      floorMaterialId: 'm1',
    };
    expect(validateRoomGeometry(tinyRoom).valid).toBe(false);
  });

  it('migrates version 0 / unversioned project payloads to version 1', () => {
    const legacyPayload = {
      id: 'legacy-1',
      name: 'Legacy Home',
      floors: [
        {
          id: 'f1',
          name: 'Ground',
          level: 0,
          elevation: 0,
          height: 3,
          slabThickness: 0.2,
          visible: true,
        },
      ],
      rooms: [],
      walls: [],
    };

    const migrated = migrateProject(legacyPayload);
    expect(migrated.version).toBe(1);
    expect(migrated.unit).toBe('metric');
    expect(migrated.gridSize).toBe(0.25);

    expect(() => migrateProject({ version: 99, id: 'bad' })).toThrow(/Unsupported project version/);
  });
});
