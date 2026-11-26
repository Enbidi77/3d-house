import { calculatePolygonArea, calculatePolygonPerimeter, type Project } from '@/domain';

function escapeCsvCell(value: string | number | boolean | undefined): string {
  const str = value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(cells: Array<string | number | boolean | undefined>): string {
  return cells.map(escapeCsvCell).join(',');
}

function sanitizeSlug(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'house-project';
}

function triggerBlobDownload(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function buildRoomReportCsv(project: Project): string {
  const floorMap = new Map(project.floors.map((f) => [f.id, f.name]));
  const materialMap = new Map(project.materials.map((m) => [m.id, m.name]));

  const header = toCsvRow([
    'Room ID',
    'Name',
    'Type',
    'Floor',
    'Area (m2)',
    'Perimeter (m)',
    'Floor Material',
    'Has Ceiling',
  ]);

  const rows = project.rooms.map((room) => {
    const area = calculatePolygonArea(room.polygon);
    const perimeter = calculatePolygonPerimeter(room.polygon);
    return toCsvRow([
      room.id,
      room.name,
      room.type,
      floorMap.get(room.floorId) ?? room.floorId,
      area.toFixed(2),
      perimeter.toFixed(2),
      materialMap.get(room.floorMaterialId) ?? room.floorMaterialId,
      room.hasCeiling ?? true,
    ]);
  });

  return [header, ...rows].join('\n');
}

export function exportRoomReportCsv(project: Project): void {
  const csv = buildRoomReportCsv(project);
  triggerBlobDownload(csv, 'text/csv;charset=utf-8;', `${sanitizeSlug(project.name)}-rooms.csv`);
}

export function buildFurnitureInventoryCsv(project: Project): string {
  const floorMap = new Map(project.floors.map((f) => [f.id, f.name]));

  const header = toCsvRow([
    'Item ID',
    'Name',
    'Category',
    'Catalog ID',
    'Floor',
    'Width (m)',
    'Height (m)',
    'Depth (m)',
    'Pos X',
    'Pos Y',
    'Pos Z',
    'Locked',
  ]);

  const rows = project.furniture.map((item) => {
    const width = Math.abs(item.dimensions[0] * item.scale[0]);
    const height = Math.abs(item.dimensions[1] * item.scale[1]);
    const depth = Math.abs(item.dimensions[2] * item.scale[2]);
    return toCsvRow([
      item.id,
      item.name,
      item.category,
      item.catalogId,
      floorMap.get(item.floorId) ?? item.floorId,
      width.toFixed(2),
      height.toFixed(2),
      depth.toFixed(2),
      item.position[0].toFixed(2),
      item.position[1].toFixed(2),
      item.position[2].toFixed(2),
      item.locked ?? false,
    ]);
  });

  return [header, ...rows].join('\n');
}

export function exportFurnitureInventoryCsv(project: Project): void {
  const csv = buildFurnitureInventoryCsv(project);
  triggerBlobDownload(
    csv,
    'text/csv;charset=utf-8;',
    `${sanitizeSlug(project.name)}-furniture.csv`,
  );
}
