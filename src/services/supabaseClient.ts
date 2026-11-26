import { migrateProject, type Project } from '@/domain';
import { toProjectSummary, type ProjectSummary } from './indexedDb';

export type CloudResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; configured: boolean };

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ''), anonKey };
}

export function isCloudConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

function buildHeaders(anonKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

const UNCONFIGURED_ERROR =
  'Supabase cloud sync is not configured. Running in local-only mode.';

interface SupabaseProjectRow {
  id: string;
  name: string;
  description?: string | null;
  data: unknown;
  created_at?: string;
  updated_at?: string;
}

export async function saveProjectCloud(project: Project): Promise<CloudResult<ProjectSummary>> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return { ok: false, configured: false, error: UNCONFIGURED_ERROR };
  }

  try {
    const payload = {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      version: project.version,
      data: project,
      updated_at: project.updatedAt || new Date().toISOString(),
    };

    const res = await fetch(`${cfg.url}/rest/v1/projects?on_conflict=id`, {
      method: 'POST',
      headers: buildHeaders(cfg.anonKey, {
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return {
        ok: false,
        configured: true,
        error: `Cloud save failed (${res.status}): ${text}`,
      };
    }

    return { ok: true, data: toProjectSummary(project) };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Network error during cloud save.',
    };
  }
}

export async function listProjectsCloud(): Promise<CloudResult<ProjectSummary[]>> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return { ok: false, configured: false, error: UNCONFIGURED_ERROR };
  }

  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/projects?select=id,name,description,data,created_at,updated_at&order=updated_at.desc`,
      {
        method: 'GET',
        headers: buildHeaders(cfg.anonKey),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return {
        ok: false,
        configured: true,
        error: `Cloud list failed (${res.status}): ${text}`,
      };
    }

    const rows = (await res.json()) as SupabaseProjectRow[];
    const summaries: ProjectSummary[] = [];
    for (const row of rows) {
      try {
        const project = migrateProject(row.data);
        summaries.push(toProjectSummary(project));
      } catch {
        // Fallback summary if row.data cannot be migrated
        summaries.push({
          id: row.id,
          name: row.name,
          description: row.description ?? undefined,
          createdAt: row.created_at ?? new Date().toISOString(),
          updatedAt: row.updated_at ?? new Date().toISOString(),
          floorCount: 0,
          roomCount: 0,
          furnitureCount: 0,
        });
      }
    }

    return { ok: true, data: summaries };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Network error listing cloud projects.',
    };
  }
}

export async function loadProjectCloud(id: string): Promise<CloudResult<Project | null>> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return { ok: false, configured: false, error: UNCONFIGURED_ERROR };
  }

  try {
    const encodedId = encodeURIComponent(id);
    const res = await fetch(
      `${cfg.url}/rest/v1/projects?id=eq.${encodedId}&select=data&limit=1`,
      {
        method: 'GET',
        headers: buildHeaders(cfg.anonKey),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return {
        ok: false,
        configured: true,
        error: `Cloud load failed (${res.status}): ${text}`,
      };
    }

    const rows = (await res.json()) as Array<{ data: unknown }>;
    if (rows.length === 0) {
      return { ok: true, data: null };
    }

    const project = migrateProject(rows[0].data);
    return { ok: true, data: project };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Network error loading cloud project.',
    };
  }
}
