'use client';

import React from 'react';
import {
  Camera,
  Copy,
  Eye,
  EyeOff,
  Lock,
  SlidersHorizontal,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  addFurnitureCommand,
  addLightCommand,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateWallLength,
  deleteFloorCommand,
  deleteFurnitureCommand,
  deleteLightCommand,
  deleteOpeningCommand,
  deleteRoomCommand,
  deleteWallCommand,
  updateFloorCommand,
  updateFurnitureCommand,
  updateLightCommand,
  updateMaterialCommand,
  updateOpeningCommand,
  updateRoomCommand,
  updateWallCommand,
  type Vector3Tuple,
} from '@/domain';
import {
  useCameraStore,
  useHistoryStore,
  useProjectStore,
  useSelectionStore,
} from '@/stores';
import {
  Badge,
  Button,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  Switch,
} from '@/components/ui';

function NumberField({
  label,
  value,
  step = 0.1,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{label}</Label>
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="h-7 font-mono text-[11px]"
      />
    </div>
  );
}

export function RightInspector() {
  const project = useProjectStore((s) => s.project);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedType = useSelectionStore((s) => s.selectedType);
  const select = useSelectionStore((s) => s.select);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const execute = useHistoryStore((s) => s.execute);
  const applyPreset = useCameraStore((s) => s.applyPreset);

  const totalArea = project.rooms.reduce(
    (sum, r) => sum + calculatePolygonArea(r.polygon),
    0,
  );

  // Empty selection -> Project Overview + Camera Presets
  if (!selectedId || !selectedType) {
    return (
      <div className="flex h-full flex-col bg-surface">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs font-semibold">Inspector</span>
          </div>
          <Badge variant="secondary">Overview</Badge>
        </div>

        <ScrollArea className="flex-1 p-3 space-y-4">
          <div className="rounded-lg border border-border bg-surface-elevated p-3 space-y-2">
            <div className="text-xs font-medium text-foreground">{project.name}</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div>Floors: {project.floors.length}</div>
              <div>Rooms: {project.rooms.length}</div>
              <div>Total Area: {totalArea.toFixed(1)} m²</div>
              <div>Walls: {project.walls.length}</div>
              <div>Furniture: {project.furniture.length}</div>
              <div>Lights: {project.lights.length}</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Camera Views
            </div>
            <div className="space-y-1.5">
              {project.cameraPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="w-full flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-2.5 py-2 text-left text-xs hover:border-accent hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="truncate font-medium">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted pt-2">
            Click any wall, room, door, window, furniture item, or light in the 3D scene or Scene
            Hierarchy to inspect and edit its properties.
          </p>
        </ScrollArea>
      </div>
    );
  }

  const renderMaterialSection = (materialId?: string) => {
    if (!materialId) return null;
    const mat = project.materials.find((m) => m.id === materialId);
    if (!mat) return null;
    return (
      <div className="space-y-2.5 pt-2">
        <Separator />
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Material Finish ({mat.name})
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label>Color</Label>
          <input
            type="color"
            value={mat.color}
            onChange={(e) =>
              execute(
                updateMaterialCommand(
                  mat.id,
                  { color: mat.color },
                  { color: e.target.value },
                  'Update material color',
                ),
              )
            }
            className="h-7 w-14 cursor-pointer rounded border border-border bg-transparent"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <Label>Roughness</Label>
            <span className="font-mono text-[10px]">{mat.roughness.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.02}
            value={[mat.roughness]}
            onValueChange={([v]) =>
              execute(
                updateMaterialCommand(
                  mat.id,
                  { roughness: mat.roughness },
                  { roughness: v },
                  'Update roughness',
                ),
              )
            }
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <Label>Metalness</Label>
            <span className="font-mono text-[10px]">{mat.metalness.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.02}
            value={[mat.metalness]}
            onValueChange={([v]) =>
              execute(
                updateMaterialCommand(
                  mat.id,
                  { metalness: mat.metalness },
                  { metalness: v },
                  'Update metalness',
                ),
              )
            }
          />
        </div>
      </div>
    );
  };

  // Resolve selected entity
  const floor = selectedType === 'floor' ? project.floors.find((f) => f.id === selectedId) : null;
  const room = selectedType === 'room' ? project.rooms.find((r) => r.id === selectedId) : null;
  const wall = selectedType === 'wall' ? project.walls.find((w) => w.id === selectedId) : null;
  const opening =
    selectedType === 'opening' ? project.openings.find((o) => o.id === selectedId) : null;
  const furniture =
    selectedType === 'furniture' ? project.furniture.find((f) => f.id === selectedId) : null;
  const light = selectedType === 'light' ? project.lights.find((l) => l.id === selectedId) : null;

  const entityMissing = !floor && !room && !wall && !opening && !furniture && !light;
  if (entityMissing) {
    return (
      <div className="p-4 text-xs text-muted">
        Selected object no longer exists.
        <Button variant="ghost" size="sm" onClick={clearSelection} className="mt-2">
          Clear Selection
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <SlidersHorizontal className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-xs font-semibold truncate">Properties</span>
        </div>
        <Badge className="capitalize">{selectedType}</Badge>
      </div>

      <ScrollArea className="flex-1 p-3 space-y-4">
        {/* FURNITURE INSPECTOR */}
        {furniture && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={furniture.name}
                disabled={furniture.locked}
                onChange={(e) =>
                  execute(
                    updateFurnitureCommand(
                      furniture.id,
                      { name: furniture.name },
                      { name: e.target.value },
                    ),
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Floor: {project.floors.find((f) => f.id === furniture.floorId)?.name}</span>
              <span className="capitalize">{furniture.category}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Position (m)</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                  <NumberField
                    key={axis}
                    label={axis}
                    value={furniture.position[idx]}
                    disabled={furniture.locked}
                    onChange={(val) => {
                      const next: Vector3Tuple = [...furniture.position] as Vector3Tuple;
                      next[idx] = val;
                      execute(
                        updateFurnitureCommand(
                          furniture.id,
                          { position: furniture.position },
                          { position: next },
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Rotation (°)</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                  <NumberField
                    key={axis}
                    label={axis}
                    step={15}
                    value={(furniture.rotation[idx] * 180) / Math.PI}
                    disabled={furniture.locked}
                    onChange={(deg) => {
                      const next: Vector3Tuple = [...furniture.rotation] as Vector3Tuple;
                      next[idx] = (deg * Math.PI) / 180;
                      execute(
                        updateFurnitureCommand(
                          furniture.id,
                          { rotation: furniture.rotation },
                          { rotation: next },
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Scale</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                  <NumberField
                    key={axis}
                    label={axis}
                    step={0.05}
                    min={0.2}
                    max={5}
                    value={furniture.scale[idx]}
                    disabled={furniture.locked}
                    onChange={(val) => {
                      const next: Vector3Tuple = [...furniture.scale] as Vector3Tuple;
                      next[idx] = Math.max(0.1, val);
                      execute(
                        updateFurnitureCommand(
                          furniture.id,
                          { scale: furniture.scale },
                          { scale: next },
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Material Preset</Label>
              <Select
                value={furniture.materialId ?? ''}
                disabled={furniture.locked}
                onValueChange={(matId) =>
                  execute(
                    updateFurnitureCommand(
                      furniture.id,
                      { materialId: furniture.materialId },
                      { materialId: matId },
                    ),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose material" />
                </SelectTrigger>
                <SelectContent>
                  {project.materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderMaterialSection(furniture.materialId)}

            <Separator />

            <div className="grid grid-cols-3 gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  execute(
                    updateFurnitureCommand(
                      furniture.id,
                      { locked: furniture.locked },
                      { locked: !furniture.locked },
                    ),
                  )
                }
              >
                {furniture.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {furniture.locked ? 'Locked' : 'Lock'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const dupId = `furn-${Date.now()}`;
                  execute(
                    addFurnitureCommand({
                      ...furniture,
                      id: dupId,
                      name: `${furniture.name} Copy`,
                      position: [
                        furniture.position[0] + 0.5,
                        furniture.position[1],
                        furniture.position[2] + 0.5,
                      ],
                      locked: false,
                    }),
                  );
                  select('furniture', dupId);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Clone
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={furniture.locked}
                onClick={() => {
                  execute(deleteFurnitureCommand(furniture));
                  clearSelection();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* WALL INSPECTOR */}
        {wall && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Length: <span className="font-mono text-foreground">{calculateWallLength(wall).toFixed(2)} m</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Height (m)"
                value={wall.height}
                min={0.5}
                max={10}
                onChange={(v) =>
                  execute(updateWallCommand(wall.id, { height: wall.height }, { height: v }))
                }
              />
              <NumberField
                label="Thickness (m)"
                value={wall.thickness}
                step={0.05}
                min={0.05}
                max={1}
                onChange={(v) =>
                  execute(
                    updateWallCommand(wall.id, { thickness: wall.thickness }, { thickness: v }),
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Interior Material</Label>
              <Select
                value={wall.interiorMaterialId}
                onValueChange={(v) =>
                  execute(
                    updateWallCommand(
                      wall.id,
                      { interiorMaterialId: wall.interiorMaterialId },
                      { interiorMaterialId: v },
                    ),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {project.materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Exterior Material</Label>
              <Select
                value={wall.exteriorMaterialId}
                onValueChange={(v) =>
                  execute(
                    updateWallCommand(
                      wall.id,
                      { exteriorMaterialId: wall.exteriorMaterialId },
                      { exteriorMaterialId: v },
                    ),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {project.materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderMaterialSection(wall.interiorMaterialId)}

            <Separator />
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                execute(deleteWallCommand(wall));
                clearSelection();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Wall
            </Button>
          </div>
        )}

        {/* ROOM INSPECTOR */}
        {room && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Room Name</Label>
              <Input
                value={room.name}
                onChange={(e) =>
                  execute(updateRoomCommand(room.id, { name: room.name }, { name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-surface-elevated p-2.5 text-xs">
              <div>
                <div className="text-[10px] text-muted">Area</div>
                <div className="font-mono font-semibold">
                  {calculatePolygonArea(room.polygon).toFixed(2)} m²
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted">Perimeter</div>
                <div className="font-mono font-semibold">
                  {calculatePolygonPerimeter(room.polygon).toFixed(2)} m
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Floor Material</Label>
              <Select
                value={room.floorMaterialId}
                onValueChange={(v) =>
                  execute(
                    updateRoomCommand(
                      room.id,
                      { floorMaterialId: room.floorMaterialId },
                      { floorMaterialId: v },
                    ),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {project.materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Has Ceiling</Label>
              <Switch
                checked={room.hasCeiling ?? true}
                onCheckedChange={(checked) =>
                  execute(
                    updateRoomCommand(
                      room.id,
                      { hasCeiling: room.hasCeiling },
                      { hasCeiling: checked },
                    ),
                  )
                }
              />
            </div>

            {renderMaterialSection(room.floorMaterialId)}

            <Separator />
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                execute(deleteRoomCommand(room));
                clearSelection();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Room
            </Button>
          </div>
        )}

        {/* OPENING INSPECTOR */}
        {opening && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Width (m)"
                value={opening.width}
                min={0.4}
                max={6}
                onChange={(v) =>
                  execute(updateOpeningCommand(opening.id, { width: opening.width }, { width: v }))
                }
              />
              <NumberField
                label="Height (m)"
                value={opening.height}
                min={0.4}
                max={4}
                onChange={(v) =>
                  execute(
                    updateOpeningCommand(opening.id, { height: opening.height }, { height: v }),
                  )
                }
              />
              <NumberField
                label="Sill Height (m)"
                value={opening.sillHeight}
                min={0}
                max={3}
                onChange={(v) =>
                  execute(
                    updateOpeningCommand(
                      opening.id,
                      { sillHeight: opening.sillHeight },
                      { sillHeight: v },
                    ),
                  )
                }
              />
              <NumberField
                label="Wall Offset (m)"
                value={opening.offset}
                min={0.2}
                onChange={(v) =>
                  execute(
                    updateOpeningCommand(opening.id, { offset: opening.offset }, { offset: v }),
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <Label>Open Amount</Label>
                <span className="font-mono text-[10px]">
                  {Math.round((opening.openAmount ?? 0) * 100)}%
                </span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[opening.openAmount ?? 0]}
                onValueChange={([v]) =>
                  execute(
                    updateOpeningCommand(
                      opening.id,
                      { openAmount: opening.openAmount },
                      { openAmount: v },
                    ),
                  )
                }
              />
            </div>

            <Separator />
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                execute(deleteOpeningCommand(opening));
                clearSelection();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {opening.type}
            </Button>
          </div>
        )}

        {/* LIGHT INSPECTOR */}
        {light && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Light Name</Label>
              <Input
                value={light.name}
                onChange={(e) =>
                  execute(
                    updateLightCommand(light.id, { name: light.name }, { name: e.target.value }),
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Enabled</Label>
              <Switch
                checked={light.enabled}
                onCheckedChange={(v) =>
                  execute(
                    updateLightCommand(light.id, { enabled: light.enabled }, { enabled: v }),
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Color</Label>
              <input
                type="color"
                value={light.color}
                onChange={(e) =>
                  execute(
                    updateLightCommand(light.id, { color: light.color }, { color: e.target.value }),
                  )
                }
                className="h-7 w-14 cursor-pointer rounded border border-border bg-transparent"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <Label>Intensity</Label>
                <span className="font-mono text-[10px]">{light.intensity.toFixed(1)}</span>
              </div>
              <Slider
                min={0}
                max={15}
                step={0.2}
                value={[light.intensity]}
                onValueChange={([v]) =>
                  execute(
                    updateLightCommand(light.id, { intensity: light.intensity }, { intensity: v }),
                  )
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Position (m)</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                  <NumberField
                    key={axis}
                    label={axis}
                    value={light.position[idx]}
                    onChange={(val) => {
                      const next: Vector3Tuple = [...light.position] as Vector3Tuple;
                      next[idx] = val;
                      execute(
                        updateLightCommand(
                          light.id,
                          { position: light.position },
                          { position: next },
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            </div>

            <Separator />
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const id = `light-${Date.now()}`;
                  execute(
                    addLightCommand({
                      ...light,
                      id,
                      name: `${light.name} Copy`,
                      position: [light.position[0] + 1, light.position[1], light.position[2]],
                    }),
                  );
                  select('light', id);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Clone
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  execute(deleteLightCommand(light));
                  clearSelection();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* FLOOR INSPECTOR */}
        {floor && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Floor Name</Label>
              <Input
                value={floor.name}
                onChange={(e) =>
                  execute(
                    updateFloorCommand(floor.id, { name: floor.name }, { name: e.target.value }),
                  )
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Elevation (m)"
                value={floor.elevation}
                onChange={(v) =>
                  execute(
                    updateFloorCommand(floor.id, { elevation: floor.elevation }, { elevation: v }),
                  )
                }
              />
              <NumberField
                label="Height (m)"
                value={floor.height}
                min={2}
                max={8}
                onChange={(v) =>
                  execute(updateFloorCommand(floor.id, { height: floor.height }, { height: v }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  execute(
                    updateFloorCommand(
                      floor.id,
                      { visible: floor.visible },
                      { visible: !floor.visible },
                    ),
                  )
                }
              >
                {floor.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {floor.visible ? 'Visible' : 'Hidden'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={project.floors.length <= 1}
                onClick={() => {
                  execute(deleteFloorCommand(floor));
                  clearSelection();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
