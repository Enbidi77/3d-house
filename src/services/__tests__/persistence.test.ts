import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STARTER_HOUSE_PROJECT, type Project } from '@/domain';
import {
  exportProjectJson,
  importProjectFile,
  MAX_PROJECT_FILE_SIZE_BYTES,
} from '@/services/projectIo';
import {
  buildFurnitureInventoryCsv,
  buildRoomReportCsv,
} from '@/services/exporters';
import {
  importModelAsset,
  importTextureAsset,
  MAX_MODEL_FILE_SIZE_BYTES,
  MAX_TEXTURE_FILE_SIZE_BYTES,
} from '@/services/assetImport';
import {
  deleteProjectLocal,
  listProjectsLocal,
  loadAutosave,
  loadProjectLocal,
  saveAutosave,
  saveProjectLocal,
} from '@/services/indexedDb';
import {
  isCloudConfigured,
  listProjectsCloud,
  loadProjectCloud,
  saveProjectCloud,
} from '@/services/supabaseClient';

function makeFile(content: BlobPart, name: string, type: string): File {
  return new File([content], name, { type });
}

describe('projectIo (export & import)', () => {
  it('exports and re-imports STARTER_HOUSE_PROJECT cleanly', async () => {
    const json = exportProjectJson(STARTER_HOUSE_PROJECT);
    const file = makeFile(json, 'villa-horizon.json', 'application/json');

    const result = await importProjectFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.id).toBe(STARTER_HOUSE_PROJECT.id);
      expect(result.project.name).toBe(STARTER_HOUSE_PROJECT.name);
      expect(result.project.floors.length).toBe(STARTER_HOUSE_PROJECT.floors.length);
      expect(result.project.rooms.length).toBe(STARTER_HOUSE_PROJECT.rooms.length);
    }
  });

  it('migrates a v0/unversioned project payload to version 1', async () => {
    const legacyPayload = {
      id: 'legacy-house-1',
      name: 'Legacy Cottage',
      floors: [
        {
          id: 'floor-1',
          name: 'Ground Floor',
          level: 0,
          elevation: 0,
          height: 2.8,
          slabThickness: 0.2,
          visible: true,
        },
      ],
      rooms: [],
      walls: [],
    };

    const file = makeFile(JSON.stringify(legacyPayload), 'legacy.json', 'application/json');
    const result = await importProjectFile(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.version).toBe(1);
      expect(result.project.unit).toBe('metric');
      expect(result.project.gridSize).toBe(0.25);
      expect(result.project.furniture).toEqual([]);
      expect(result.project.environment.weather).toBe('clear');
    }
  });

  it('rejects malformed JSON gracefully', async () => {
    const file = makeFile('{not-valid-json', 'broken.json', 'application/json');
    const result = await importProjectFile(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/malformed json/i);
    }
  });

  it('rejects project payloads that fail Zod schema validation', async () => {
    const invalidProject = {
      version: 1,
      id: '',
      name: 'Missing Floors',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      unit: 'metric',
      gridSize: 0.25,
      floors: [],
      rooms: [],
      walls: [],
      openings: [],
      furniture: [],
      materials: [],
      lights: [],
      cameraPresets: [],
      environment: {
        timeOfDay: 12,
        sunAzimuth: 180,
        sunElevation: 45,
        exposure: 1,
        weather: 'clear',
      },
    };

    const file = makeFile(JSON.stringify(invalidProject), 'invalid.json', 'application/json');
    const result = await importProjectFile(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid project field/i);
    }
  });

  it('rejects empty files and oversized files', async () => {
    const emptyFile = makeFile('', 'empty.json', 'application/json');
    const emptyRes = await importProjectFile(emptyFile);
    expect(emptyRes.ok).toBe(false);
    if (!emptyRes.ok) {
      expect(emptyRes.error).toMatch(/empty/i);
    }

    const hugeFile = {
      name: 'huge.json',
      type: 'application/json',
      size: MAX_PROJECT_FILE_SIZE_BYTES + 1,
      text: async () => '{}',
    } as unknown as File;
    const hugeRes = await importProjectFile(hugeFile);
    expect(hugeRes.ok).toBe(false);
    if (!hugeRes.ok) {
      expect(hugeRes.error).toMatch(/size limit/i);
    }
  });

  it('rejects non-JSON file types', async () => {
    const pngFile = makeFile('binary', 'photo.png', 'image/png');
    const res = await importProjectFile(pngFile);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/unsupported file type/i);
    }
  });
});

describe('exporters (CSV reports)', () => {
  const sampleProject: Project = {
    ...STARTER_HOUSE_PROJECT,
    floors: [
      {
        id: 'f1',
        name: 'Ground Floor',
        level: 0,
        elevation: 0,
        height: 3,
        slabThickness: 0.2,
        visible: true,
      },
    ],
    materials: [
      {
        id: 'm1',
        name: 'Oak, Natural',
        category: 'wood',
        color: '#b9895b',
        roughness: 0.5,
        metalness: 0,
      },
    ],
    rooms: [
      {
        id: 'r1',
        floorId: 'f1',
        name: 'Living "Main" Room',
        type: 'living',
        polygon: [
          [0, 0],
          [5, 0],
          [5, 4],
          [0, 4],
        ],
        floorMaterialId: 'm1',
        hasCeiling: true,
      },
    ],
    furniture: [
      {
        id: 'furn-1',
        floorId: 'f1',
        catalogId: 'sofa-01',
        name: 'Sectional, L-Shape',
        category: 'seating',
        position: [1.5, 0, 2.25],
        rotation: [0, 0, 0],
        scale: [2, 1, 1],
        dimensions: [1.2, 0.85, 0.9],
        locked: true,
      },
    ],
  };

  it('builds room report CSV with accurate area, perimeter, and CSV escaping', () => {
    const csv = buildRoomReportCsv(sampleProject);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'Room ID,Name,Type,Floor,Area (m2),Perimeter (m),Floor Material,Has Ceiling',
    );
    expect(lines[1]).toBe(
      'r1,"Living ""Main"" Room",living,Ground Floor,20.00,18.00,"Oak, Natural",true',
    );
  });

  it('builds furniture inventory CSV with scaled dimensions and escaping', () => {
    const csv = buildFurnitureInventoryCsv(sampleProject);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'Item ID,Name,Category,Catalog ID,Floor,Width (m),Height (m),Depth (m),Pos X,Pos Y,Pos Z,Locked',
    );
    expect(lines[1]).toBe(
      'furn-1,"Sectional, L-Shape",seating,sofa-01,Ground Floor,2.40,0.85,0.90,1.50,0.00,2.25,true',
    );
  });
});

describe('assetImport', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-asset-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts valid .glb and .gltf files', async () => {
    const glb = makeFile(new Uint8Array([1, 2, 3, 4]), 'modern-chair.glb', 'model/gltf-binary');
    const res = await importModelAsset(glb);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.asset.name).toBe('modern-chair');
      expect(res.asset.format).toBe('glb');
      expect(res.asset.url).toBe('blob:mock-asset-url');
      expect(res.asset.sizeBytes).toBe(4);
    }

    const gltf = makeFile('{"asset":{"version":"2.0"}}', 'lamp.gltf', 'model/gltf+json');
    const gltfRes = await importModelAsset(gltf);
    expect(gltfRes.ok).toBe(true);
    if (gltfRes.ok) {
      expect(gltfRes.asset.format).toBe('gltf');
    }
  });

  it('rejects unsupported or oversized model files', async () => {
    const obj = makeFile('v 0 0 0', 'mesh.obj', 'text/plain');
    const badExt = await importModelAsset(obj);
    expect(badExt.ok).toBe(false);

    const oversized = {
      name: 'huge.glb',
      size: MAX_MODEL_FILE_SIZE_BYTES + 1,
    } as File;
    const tooBig = await importModelAsset(oversized);
    expect(tooBig.ok).toBe(false);
  });

  it('accepts valid texture images and rejects invalid/oversized ones', async () => {
    const png = makeFile(new Uint8Array([137, 80, 78, 71]), 'oak-floor.png', 'image/png');
    const res = await importTextureAsset(png);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.name).toBe('oak-floor');
      expect(res.url).toBe('blob:mock-asset-url');
    }

    const txt = makeFile('hello', 'notes.txt', 'text/plain');
    const badRes = await importTextureAsset(txt);
    expect(badRes.ok).toBe(false);

    const oversized = {
      name: 'huge.png',
      type: 'image/png',
      size: MAX_TEXTURE_FILE_SIZE_BYTES + 1,
    } as File;
    const bigRes = await importTextureAsset(oversized);
    expect(bigRes.ok).toBe(false);
  });
});

describe('indexedDb localStorage fallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves, loads, lists, deletes projects and manages autosave via localStorage fallback', async () => {
    await saveProjectLocal(STARTER_HOUSE_PROJECT);

    const loaded = await loadProjectLocal(STARTER_HOUSE_PROJECT.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(STARTER_HOUSE_PROJECT.id);

    const list = await listProjectsLocal();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(STARTER_HOUSE_PROJECT.id);
    expect(list[0].floorCount).toBe(STARTER_HOUSE_PROJECT.floors.length);

    await saveAutosave({ ...STARTER_HOUSE_PROJECT, name: 'Autosaved Villa' });
    const autosaved = await loadAutosave();
    expect(autosaved?.name).toBe('Autosaved Villa');

    await deleteProjectLocal(STARTER_HOUSE_PROJECT.id);
    const afterDelete = await loadProjectLocal(STARTER_HOUSE_PROJECT.id);
    expect(afterDelete).toBeNull();
  });
});

describe('supabaseClient graceful fallback', () => {
  it('reports unconfigured and returns local-only fallback results when env vars are absent', async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
      expect(isCloudConfigured()).toBe(false);

      const listRes = await listProjectsCloud();
      expect(listRes.ok).toBe(false);
      if (!listRes.ok) expect(listRes.configured).toBe(false);

      const saveRes = await saveProjectCloud(STARTER_HOUSE_PROJECT);
      expect(saveRes.ok).toBe(false);
      if (!saveRes.ok) expect(saveRes.configured).toBe(false);

      const loadRes = await loadProjectCloud(STARTER_HOUSE_PROJECT.id);
      expect(loadRes.ok).toBe(false);
      if (!loadRes.ok) expect(loadRes.configured).toBe(false);
    } finally {
      if (originalUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    }
  });
});
