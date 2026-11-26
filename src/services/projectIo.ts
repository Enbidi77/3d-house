import { ZodError } from 'zod';
import { migrateProject, ProjectSchema, type Project } from '@/domain';

export const MAX_PROJECT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export type ImportProjectResult =
  | { ok: true; project: Project }
  | { ok: false; error: string };

function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'house-project';
}

export function exportProjectJson(project: Project): string {
  ProjectSchema.parse(project);
  return JSON.stringify(project, null, 2);
}

export function downloadProjectFile(project: Project): void {
  const json = exportProjectJson(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(project.name)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatZodError(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Project data failed schema validation.';
  const path = first.path.length > 0 ? first.path.join('.') : 'root';
  return `Invalid project field "${path}": ${first.message}`;
}

export async function importProjectFile(file: File): Promise<ImportProjectResult> {
  if (!file) {
    return { ok: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'The selected file is empty.' };
  }

  if (file.size > MAX_PROJECT_FILE_SIZE_BYTES) {
    const limitMb = Math.round(MAX_PROJECT_FILE_SIZE_BYTES / (1024 * 1024));
    return { ok: false, error: `File exceeds the ${limitMb} MB size limit.` };
  }

  const lowerName = file.name.toLowerCase();
  const isJsonMime =
    file.type === '' ||
    file.type === 'application/json' ||
    file.type === 'text/json' ||
    file.type === 'text/plain';

  if (!lowerName.endsWith('.json') && !isJsonMime) {
    return { ok: false, error: 'Unsupported file type. Please select a .json project file.' };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Failed to read the selected file.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Malformed JSON: unable to parse project file.' };
  }

  try {
    const project = migrateProject(parsed);
    return { ok: true, project };
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, error: formatZodError(err) };
    }
    const message = err instanceof Error ? err.message : 'Invalid project format.';
    return { ok: false, error: message };
  }
}
