export const MAX_MODEL_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_TEXTURE_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export interface ImportedAsset {
  id: string;
  name: string;
  url: string;
  format: 'glb' | 'gltf';
  sizeBytes: number;
  createdAt: string;
}

export type ImportModelResult =
  | { ok: true; asset: ImportedAsset }
  | { ok: false; error: string };

export type ImportTextureResult =
  | { ok: true; url: string; name: string }
  | { ok: false; error: string };

const ALLOWED_TEXTURE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp'];

function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

export async function importModelAsset(file: File): Promise<ImportModelResult> {
  if (!file) {
    return { ok: false, error: 'No model file provided.' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'Model file is empty.' };
  }

  if (file.size > MAX_MODEL_FILE_SIZE_BYTES) {
    const limitMb = Math.round(MAX_MODEL_FILE_SIZE_BYTES / (1024 * 1024));
    return { ok: false, error: `Model file exceeds the ${limitMb} MB size limit.` };
  }

  const lower = file.name.toLowerCase();
  let format: 'glb' | 'gltf' | null = null;
  if (lower.endsWith('.glb')) format = 'glb';
  else if (lower.endsWith('.gltf')) format = 'gltf';

  if (!format) {
    return { ok: false, error: 'Unsupported model format. Please select a .glb or .gltf file.' };
  }

  const url = URL.createObjectURL(file);
  const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    ok: true,
    asset: {
      id,
      name: stripExtension(file.name),
      url,
      format,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function importTextureAsset(file: File): Promise<ImportTextureResult> {
  if (!file) {
    return { ok: false, error: 'No texture file provided.' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'Texture file is empty.' };
  }

  if (file.size > MAX_TEXTURE_FILE_SIZE_BYTES) {
    const limitMb = Math.round(MAX_TEXTURE_FILE_SIZE_BYTES / (1024 * 1024));
    return { ok: false, error: `Texture file exceeds the ${limitMb} MB size limit.` };
  }

  const lower = file.name.toLowerCase();
  const hasValidExt = ALLOWED_TEXTURE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const hasImageMime = file.type.startsWith('image/');

  if (!hasValidExt && !hasImageMime) {
    return {
      ok: false,
      error: 'Unsupported texture format. Please select a PNG, JPG, WebP, AVIF, or BMP image.',
    };
  }

  const url = URL.createObjectURL(file);
  return {
    ok: true,
    url,
    name: stripExtension(file.name),
  };
}
