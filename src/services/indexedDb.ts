import { migrateProject, type Project } from '@/domain';

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  floorCount: number;
  roomCount: number;
  furnitureCount: number;
}

const DB_NAME = '3d-house-simul-db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_AUTOSAVE = 'autosave';
const AUTOSAVE_KEY = 'current-autosave';

const LS_PROJECTS_PREFIX = '3d-house-simul:project:';
const LS_AUTOSAVE_KEY = '3d-house-simul:autosave';

export function toProjectSummary(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    floorCount: project.floors.length,
    roomCount: project.rooms.length,
    furnitureCount: project.furniture.length,
  };
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUTOSAVE)) {
        db.createObjectStore(STORE_AUTOSAVE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = executor(store);

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction failed'));
        };
      }),
  );
}

function safeParseProject(raw: unknown): Project | null {
  if (!raw) return null;
  try {
    return migrateProject(raw);
  } catch {
    return null;
  }
}

function lsSaveProject(project: Project): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(`${LS_PROJECTS_PREFIX}${project.id}`, JSON.stringify(project));
}

function lsLoadProject(id: string): Project | null {
  if (!hasLocalStorage()) return null;
  const raw = localStorage.getItem(`${LS_PROJECTS_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return safeParseProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

function lsListProjects(): ProjectSummary[] {
  if (!hasLocalStorage()) return [];
  const summaries: ProjectSummary[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LS_PROJECTS_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const project = safeParseProject(JSON.parse(raw));
      if (project) summaries.push(toProjectSummary(project));
    } catch {
      // Ignore corrupted entries
    }
  }
  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function lsDeleteProject(id: string): void {
  if (!hasLocalStorage()) return;
  localStorage.removeItem(`${LS_PROJECTS_PREFIX}${id}`);
}

export async function saveProjectLocal(project: Project): Promise<void> {
  const normalized: Project = {
    ...project,
    updatedAt: project.updatedAt || new Date().toISOString(),
  };

  try {
    await runTransaction(STORE_PROJECTS, 'readwrite', (store) => store.put(normalized));
  } catch {
    lsSaveProject(normalized);
  }
}

export async function loadProjectLocal(id: string): Promise<Project | null> {
  try {
    const record = await runTransaction<unknown>(STORE_PROJECTS, 'readonly', (store) =>
      store.get(id),
    );
    return safeParseProject(record);
  } catch {
    return lsLoadProject(id);
  }
}

export async function listProjectsLocal(): Promise<ProjectSummary[]> {
  try {
    const records = await runTransaction<unknown[]>(STORE_PROJECTS, 'readonly', (store) =>
      store.getAll(),
    );
    const summaries: ProjectSummary[] = [];
    for (const rec of records) {
      const project = safeParseProject(rec);
      if (project) summaries.push(toProjectSummary(project));
    }
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return lsListProjects();
  }
}

export async function deleteProjectLocal(id: string): Promise<void> {
  try {
    await runTransaction(STORE_PROJECTS, 'readwrite', (store) => store.delete(id));
  } catch {
    lsDeleteProject(id);
  }
}

export async function saveAutosave(project: Project): Promise<void> {
  const payload = { key: AUTOSAVE_KEY, project, savedAt: new Date().toISOString() };
  try {
    await runTransaction(STORE_AUTOSAVE, 'readwrite', (store) => store.put(payload));
  } catch {
    if (hasLocalStorage()) {
      localStorage.setItem(LS_AUTOSAVE_KEY, JSON.stringify(payload));
    }
  }
}

export async function loadAutosave(): Promise<Project | null> {
  try {
    const record = await runTransaction<{ key: string; project: unknown } | undefined>(
      STORE_AUTOSAVE,
      'readonly',
      (store) => store.get(AUTOSAVE_KEY),
    );
    return safeParseProject(record?.project);
  } catch {
    if (!hasLocalStorage()) return null;
    const raw = localStorage.getItem(LS_AUTOSAVE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { project?: unknown };
      return safeParseProject(parsed?.project);
    } catch {
      return null;
    }
  }
}
