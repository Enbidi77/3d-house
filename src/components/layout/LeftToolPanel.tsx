'use client';

import React, { useMemo, useState } from 'react';
import {
  Armchair,
  Compass,
  DoorOpen,
  Eye,
  EyeOff,
  FolderTree,
  Hammer,
  Info,
  Lamp,
  Layers,
  Lock,
  MousePointer2,
  Paintbrush,
  PanelTop,
  Plus,
  Search,
  Square,
  Sun,
  Unlock,
} from 'lucide-react';
import {
  addFloorCommand,
  addFurnitureCommand,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  updateFloorCommand,
  updateFurnitureCommand,
  updateLightCommand,
  updateRoomCommand,
  updateWallCommand,
  type Floor,
  type WeatherPreset,
} from '@/domain';
import {
  FURNITURE_CATALOG,
  FURNITURE_UI_CATEGORIES,
  type FurnitureCatalogItem,
} from '@/lib/furnitureCatalog';
import {
  LIGHTING_PRESETS,
  QUALITY_PRESETS,
  formatTimeOfDay,
  type LightingPreset,
  type QualityPresetId,
} from '@/lib/lightingPresets';
import {
  useHistoryStore,
  useProjectStore,
  useSelectionStore,
  useSimulationStore,
  useToolStore,
  type EditorTool,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';

type LeftTab = 'build' | 'furniture' | 'materials' | 'lighting' | 'scene';

export function LeftToolPanel() {
  const [activeTab, setActiveTab] = useState<LeftTab>('build');
  const [furnitureQuery, setFurnitureQuery] = useState('');
  const [furnitureCategory, setFurnitureCategory] = useState<string>('All');
  const [sceneQuery, setSceneQuery] = useState('');
  const [qualityPreset, setQualityPreset] = useState<QualityPresetId>('high');

  const project = useProjectStore((s) => s.project);
  const updateEnvironment = useProjectStore((s) => s.updateEnvironment);
  const execute = useHistoryStore((s) => s.execute);

  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const snapToGrid = useToolStore((s) => s.snapToGrid);
  const setSnapToGrid = useToolStore((s) => s.setSnapToGrid);
  const snapToAngle = useToolStore((s) => s.snapToAngle);
  const setSnapToAngle = useToolStore((s) => s.setSnapToAngle);
  const snapToEndpoints = useToolStore((s) => s.snapToEndpoints);
  const setSnapToEndpoints = useToolStore((s) => s.setSnapToEndpoints);
  const defaultWallHeight = useToolStore((s) => s.defaultWallHeight);
  const setDefaultWallHeight = useToolStore((s) => s.setDefaultWallHeight);
  const defaultWallThickness = useToolStore((s) => s.defaultWallThickness);
  const setDefaultWallThickness = useToolStore((s) => s.setDefaultWallThickness);
  const activeMaterialId = useToolStore((s) => s.activeMaterialId);
  const setActiveMaterialId = useToolStore((s) => s.setActiveMaterialId);
  const setActiveFurnitureCatalogId = useToolStore((s) => s.setActiveFurnitureCatalogId);

  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedType = useSelectionStore((s) => s.selectedType);
  const select = useSelectionStore((s) => s.select);

  const activeFloorId = useSimulationStore((s) => s.activeFloorId);
  const setActiveFloorId = useSimulationStore((s) => s.setActiveFloorId);
  const timeOfDay = useSimulationStore((s) => s.timeOfDay);
  const setTimeOfDay = useSimulationStore((s) => s.setTimeOfDay);
  const sunAzimuth = useSimulationStore((s) => s.sunAzimuth);
  const sunElevation = useSimulationStore((s) => s.sunElevation);
  const setSunAngles = useSimulationStore((s) => s.setSunAngles);
  const weather = useSimulationStore((s) => s.weather);
  const setWeather = useSimulationStore((s) => s.setWeather);
  const setShadowsEnabled = useSimulationStore((s) => s.setShadowsEnabled);
  const setPostProcessingEnabled = useSimulationStore((s) => s.setPostProcessingEnabled);
  const setAmbientOcclusionEnabled = useSimulationStore((s) => s.setAmbientOcclusionEnabled);
  const setBloomEnabled = useSimulationStore((s) => s.setBloomEnabled);

  const currentFloorId = activeFloorId ?? project.floors[0]?.id ?? 'floor-ground';
  const currentFloorRooms = useMemo(
    () => project.rooms.filter((r) => r.floorId === currentFloorId),
    [project.rooms, currentFloorId],
  );

  const filteredFurniture = useMemo(() => {
    const q = furnitureQuery.trim().toLowerCase();
    return FURNITURE_CATALOG.filter((item) => {
      const catMatch = furnitureCategory === 'All' || item.uiCategory === furnitureCategory;
      const textMatch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.uiCategory.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [furnitureQuery, furnitureCategory]);

  const handleAddFloor = () => {
    const maxLevel = project.floors.reduce((m, f) => Math.max(m, f.level), -1);
    const nextLevel = maxLevel + 1;
    const prevTop = project.floors.reduce(
      (maxY, f) => Math.max(maxY, f.elevation + f.height + f.slabThickness),
      0,
    );
    const newFloor: Floor = {
      id: `floor-${Date.now()}`,
      name: nextLevel === 0 ? 'Ground Floor' : `Level ${nextLevel}`,
      level: nextLevel,
      elevation: Number(prevTop.toFixed(2)),
      height: 3.0,
      slabThickness: 0.25,
      visible: true,
    };
    execute(addFloorCommand(newFloor, `Add ${newFloor.name}`));
    setActiveFloorId(newFloor.id);
  };

  const handlePlaceFurniture = (item: FurnitureCatalogItem) => {
    setActiveFurnitureCatalogId(item.catalogId);
    setActiveTool('furniture');
    const id = `furn-${crypto.randomUUID().slice(0, 8)}`;
    execute(
      addFurnitureCommand(
        {
          id,
          floorId: currentFloorId,
          catalogId: item.catalogId,
          name: item.name,
          category: item.category,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: item.dimensions,
          materialId: item.defaultMaterialId,
          colorOverride: item.defaultColor,
        },
        `Place ${item.name}`,
      ),
    );
    select('furniture', id);
  };

  const handleSelectMaterial = (materialId: string) => {
    setActiveMaterialId(materialId);
    if (selectedType === 'wall' && selectedId) {
      const wall = project.walls.find((w) => w.id === selectedId);
      if (wall) {
        execute(
          updateWallCommand(
            wall.id,
            { interiorMaterialId: materialId },
            { interiorMaterialId: materialId },
            'Apply wall material',
          ),
        );
        return;
      }
    }
    if (selectedType === 'room' && selectedId) {
      const room = project.rooms.find((r) => r.id === selectedId);
      if (room) {
        execute(
          updateRoomCommand(
            room.id,
            { floorMaterialId: room.floorMaterialId },
            { floorMaterialId: materialId },
            'Apply floor material',
          ),
        );
        return;
      }
    }
    if (selectedType === 'furniture' && selectedId) {
      const item = project.furniture.find((f) => f.id === selectedId);
      if (item && !item.locked) {
        execute(
          updateFurnitureCommand(
            item.id,
            { materialId: item.materialId },
            { materialId },
            'Apply furniture material',
          ),
        );
        return;
      }
    }
    setActiveTool('paint');
  };

  const applyLightingPreset = (preset: LightingPreset) => {
    setTimeOfDay(preset.timeOfDay);
    setSunAngles(preset.sunAzimuth, preset.sunElevation);
    setWeather(preset.weather);
    updateEnvironment({
      timeOfDay: preset.timeOfDay,
      sunAzimuth: preset.sunAzimuth,
      sunElevation: preset.sunElevation,
      exposure: preset.exposure,
      weather: preset.weather,
    });
  };

  const applyQualityPreset = (id: QualityPresetId) => {
    setQualityPreset(id);
    const q = QUALITY_PRESETS.find((p) => p.id === id);
    if (!q) return;
    setShadowsEnabled(q.shadows);
    setPostProcessingEnabled(q.postProcessing);
    setAmbientOcclusionEnabled(q.ambientOcclusion);
    setBloomEnabled(q.bloom);
  };

  const sceneFilter = sceneQuery.trim().toLowerCase();

  return (
    <div className="flex h-full flex-col bg-surface">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as LeftTab)}
        className="flex h-full flex-col"
      >
        <div className="border-b border-border px-2 pt-2 pb-1.5">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="build" title="Build & Floors">
              <Hammer className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger value="furniture" title="Furniture Library">
              <Armchair className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger value="materials" title="Materials & Finishes">
              <Paintbrush className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger value="lighting" title="Lighting & Environment">
              <Sun className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger value="scene" title="Scene Hierarchy">
              <FolderTree className="h-3.5 w-3.5" />
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* TAB 1: BUILD MODE & ROOMS/FLOORS */}
          <TabsContent value="build" className="p-3 space-y-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Build Tools
                </h2>
                <Badge variant="secondary">{activeTool}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'select', label: 'Select (V)', icon: MousePointer2 },
                    { id: 'wall', label: 'Draw Wall', icon: Hammer },
                    { id: 'room', label: 'Draw Room', icon: Square },
                    { id: 'door', label: 'Place Door', icon: DoorOpen },
                    { id: 'window', label: 'Place Window', icon: PanelTop },
                    { id: 'paint', label: 'Paint Material', icon: Paintbrush },
                  ] as Array<{ id: EditorTool; label: string; icon: React.ElementType }>
                ).map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    variant={activeTool === id ? 'default' : 'secondary'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setActiveTool(id)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Button>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Precision & Snapping
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="snap-grid">Snap to Grid (S)</Label>
                  <Switch id="snap-grid" checked={snapToGrid} onCheckedChange={setSnapToGrid} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="snap-angle">Angle Snap (45°)</Label>
                  <Switch id="snap-angle" checked={snapToAngle} onCheckedChange={setSnapToAngle} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="snap-endpoints">Wall Endpoints</Label>
                  <Switch
                    id="snap-endpoints"
                    checked={snapToEndpoints}
                    onCheckedChange={setSnapToEndpoints}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="wall-h">Wall Height (m)</Label>
                  <Input
                    id="wall-h"
                    type="number"
                    step={0.1}
                    min={1.5}
                    max={8}
                    value={defaultWallHeight}
                    onChange={(e) => setDefaultWallHeight(Number(e.target.value) || 3.2)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wall-t">Thickness (m)</Label>
                  <Input
                    id="wall-t"
                    type="number"
                    step={0.05}
                    min={0.08}
                    max={0.8}
                    value={defaultWallThickness}
                    onChange={(e) => setDefaultWallThickness(Number(e.target.value) || 0.2)}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Floors Manager */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Floors ({project.floors.length})
                </h2>
                <Button variant="ghost" size="sm" onClick={handleAddFloor} className="h-6 px-2">
                  <Plus className="h-3 w-3" />
                  Add Floor
                </Button>
              </div>
              <div className="space-y-1">
                {project.floors.map((floor) => {
                  const isActive = floor.id === currentFloorId;
                  return (
                    <div
                      key={floor.id}
                      className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs transition-colors ${
                        isActive
                          ? 'border-accent bg-accent-soft text-foreground'
                          : 'border-border bg-surface-elevated hover:bg-surface-hover'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFloorId(floor.id);
                          select('floor', floor.id);
                        }}
                        className="flex flex-1 items-center gap-2 text-left min-w-0 cursor-pointer"
                      >
                        <Layers className="h-3.5 w-3.5 shrink-0 text-accent" />
                        <div className="truncate">
                          <div className="font-medium truncate">{floor.name}</div>
                          <div className="text-[10px] text-muted">
                            Elev {floor.elevation}m · H {floor.height}m
                          </div>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={floor.visible ? 'Hide floor' : 'Show floor'}
                        onClick={() =>
                          execute(
                            updateFloorCommand(
                              floor.id,
                              { visible: floor.visible },
                              { visible: !floor.visible },
                              floor.visible ? 'Hide floor' : 'Show floor',
                            ),
                          )
                        }
                      >
                        {floor.visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-muted" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Rooms List with Area & Perimeter */}
            <section className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Rooms on Floor ({currentFloorRooms.length})
              </h2>
              <div className="space-y-1">
                {currentFloorRooms.map((room) => {
                  const area = calculatePolygonArea(room.polygon);
                  const perimeter = calculatePolygonPerimeter(room.polygon);
                  const isSelected = selectedType === 'room' && selectedId === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => select('room', room.id)}
                      className={`w-full flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-accent bg-accent-soft'
                          : 'border-border bg-surface-elevated hover:bg-surface-hover'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{room.name}</div>
                        <div className="text-[10px] text-muted capitalize">{room.type}</div>
                      </div>
                      <div className="text-right font-mono text-[10px] text-muted-foreground shrink-0 ml-2">
                        <div>{area.toFixed(1)} m²</div>
                        <div>{perimeter.toFixed(1)} m</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </TabsContent>

          {/* TAB 2: SEARCHABLE FURNITURE LIBRARY (12 CATEGORIES) */}
          <TabsContent value="furniture" className="p-3 space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted" />
                <Input
                  value={furnitureQuery}
                  onChange={(e) => setFurnitureQuery(e.target.value)}
                  placeholder="Search furniture & fixtures..."
                  className="pl-8"
                  aria-label="Search furniture"
                />
              </div>

              <Select value={furnitureCategory} onValueChange={setFurnitureCategory}>
                <SelectTrigger aria-label="Furniture category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {FURNITURE_UI_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-[10px] text-muted">
              Click any item to place it on the active floor.
            </div>

            <div className="space-y-1.5">
              {filteredFurniture.map((item) => (
                <button
                  key={item.catalogId}
                  type="button"
                  onClick={() => handlePlaceFurniture(item)}
                  className="w-full flex items-center justify-between rounded-md border border-border bg-surface-elevated px-2.5 py-2 text-left hover:border-accent hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-medium text-foreground truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-muted truncate">{item.uiCategory}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {item.dimensions[0]}×{item.dimensions[2]}m
                    </div>
                    <span className="text-[10px] font-medium text-accent">+ Place</span>
                  </div>
                </button>
              ))}
              {filteredFurniture.length === 0 && (
                <p className="py-6 text-center text-xs text-muted">
                  No furniture matches &ldquo;{furnitureQuery}&rdquo;.
                </p>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: MATERIALS & FINISHES */}
          <TabsContent value="materials" className="p-3 space-y-3">
            <div className="space-y-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Materials & Finishes
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Select a material to apply to the selected wall, room floor, or furniture piece.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {project.materials.map((mat) => {
                const isActive = activeMaterialId === mat.id;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => handleSelectMaterial(mat.id)}
                    className={`flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'border-accent bg-accent-soft'
                        : 'border-border bg-surface-elevated hover:bg-surface-hover'
                    }`}
                  >
                    <span
                      className="h-7 w-7 shrink-0 rounded-md border border-border-strong shadow-inner"
                      style={{
                        backgroundColor: mat.color,
                        opacity: mat.opacity ?? 1,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate">
                        {mat.name}
                      </div>
                      <div className="text-[10px] text-muted capitalize">
                        {mat.category} · R {mat.roughness.toFixed(2)} · M {mat.metalness.toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 4: LIGHTING & ENVIRONMENT STUDIO */}
          <TabsContent value="lighting" className="p-3 space-y-4">
            <div className="rounded-lg border border-border bg-surface-elevated p-2.5 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Real-time lighting is a visual approximation for architectural massing and mood
                studies, not a calibrated photometric simulation.
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                7 Lighting Presets
              </h2>
              <div className="grid grid-cols-1 gap-1.5">
                {LIGHTING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyLightingPreset(preset)}
                    className="flex items-center justify-between rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-left hover:border-accent hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-foreground">{preset.name}</div>
                      <div className="text-[10px] text-muted truncate">{preset.description}</div>
                    </div>
                    <Badge variant="secondary" className="font-mono shrink-0">
                      {formatTimeOfDay(preset.timeOfDay)}
                    </Badge>
                  </button>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Time of Day</Label>
                <span className="font-mono text-[11px] text-foreground">
                  {formatTimeOfDay(timeOfDay)}
                </span>
              </div>
              <Slider
                min={0}
                max={23.75}
                step={0.25}
                value={[timeOfDay]}
                onValueChange={([v]) => {
                  setTimeOfDay(v);
                  updateEnvironment({ timeOfDay: v });
                }}
              />

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  <Compass className="h-3 w-3" /> Sun Azimuth
                </Label>
                <span className="font-mono text-[11px]">{sunAzimuth}°</span>
              </div>
              <Slider
                min={0}
                max={360}
                step={5}
                value={[sunAzimuth]}
                onValueChange={([v]) => {
                  setSunAngles(v, sunElevation);
                  updateEnvironment({ sunAzimuth: v });
                }}
              />

              <div className="flex items-center justify-between">
                <Label>Sun Elevation</Label>
                <span className="font-mono text-[11px]">{sunElevation}°</span>
              </div>
              <Slider
                min={-15}
                max={85}
                step={1}
                value={[sunElevation]}
                onValueChange={([v]) => {
                  setSunAngles(sunAzimuth, v);
                  updateEnvironment({ sunElevation: v });
                }}
              />

              <div className="flex items-center justify-between">
                <Label>Exposure</Label>
                <span className="font-mono text-[11px]">
                  {project.environment.exposure.toFixed(2)}
                </span>
              </div>
              <Slider
                min={0.5}
                max={1.8}
                step={0.05}
                value={[project.environment.exposure]}
                onValueChange={([v]) => updateEnvironment({ exposure: v })}
              />

              <div className="space-y-1">
                <Label>Sky / Weather</Label>
                <Select
                  value={weather}
                  onValueChange={(val) => {
                    const w = val as WeatherPreset;
                    setWeather(w);
                    updateEnvironment({ weather: w });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">Clear Sky</SelectItem>
                    <SelectItem value="overcast">Overcast Studio</SelectItem>
                    <SelectItem value="sunset">Sunset Glow</SelectItem>
                    <SelectItem value="night">Night Sky</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Render Quality Preset
              </h2>
              <div className="grid grid-cols-4 gap-1">
                {QUALITY_PRESETS.map((q) => (
                  <Button
                    key={q.id}
                    variant={qualityPreset === q.id ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => applyQualityPreset(q.id)}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* TAB 5: SCENE HIERARCHY TREE */}
          <TabsContent value="scene" className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted" />
              <Input
                value={sceneQuery}
                onChange={(e) => setSceneQuery(e.target.value)}
                placeholder="Filter scene objects..."
                className="pl-8"
                aria-label="Filter scene hierarchy"
              />
            </div>

            <div className="space-y-3 text-xs">
              {/* Floors & Rooms */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Floors & Rooms
                </div>
                {project.floors
                  .filter((f) => !sceneFilter || f.name.toLowerCase().includes(sceneFilter))
                  .map((floor) => (
                    <div
                      key={floor.id}
                      className={`flex items-center justify-between rounded px-2 py-1 ${
                        selectedType === 'floor' && selectedId === floor.id
                          ? 'bg-accent-soft text-accent'
                          : 'hover:bg-surface-elevated'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left truncate cursor-pointer font-medium"
                        onClick={() => select('floor', floor.id)}
                      >
                        {floor.name}
                      </button>
                      <button
                        type="button"
                        aria-label="Toggle floor visibility"
                        className="p-1 text-muted hover:text-foreground cursor-pointer"
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
                        {floor.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  ))}
                {project.rooms
                  .filter((r) => !sceneFilter || r.name.toLowerCase().includes(sceneFilter))
                  .map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => select('room', room.id)}
                      className={`w-full flex items-center justify-between rounded px-2 py-1 text-left cursor-pointer ${
                        selectedType === 'room' && selectedId === room.id
                          ? 'bg-accent-soft text-accent'
                          : 'hover:bg-surface-elevated'
                      }`}
                    >
                      <span className="truncate pl-2">Room: {room.name}</span>
                      <span className="text-[10px] text-muted">{room.type}</span>
                    </button>
                  ))}
              </div>

              {/* Walls */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Walls ({project.walls.length})
                </div>
                {project.walls
                  .filter((w) => !sceneFilter || w.id.toLowerCase().includes(sceneFilter))
                  .slice(0, 25)
                  .map((wall, idx) => (
                    <button
                      key={wall.id}
                      type="button"
                      onClick={() => select('wall', wall.id)}
                      className={`w-full flex items-center justify-between rounded px-2 py-1 text-left cursor-pointer ${
                        selectedType === 'wall' && selectedId === wall.id
                          ? 'bg-accent-soft text-accent'
                          : 'hover:bg-surface-elevated'
                      }`}
                    >
                      <span className="truncate">
                        {wall.isRailing ? 'Railing' : wall.isExterior ? 'Ext Wall' : 'Int Wall'} #
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-mono text-muted">
                        {wall.height.toFixed(1)}m
                      </span>
                    </button>
                  ))}
              </div>

              {/* Furniture */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Furniture ({project.furniture.length})
                </div>
                {project.furniture
                  .filter(
                    (f) =>
                      !sceneFilter ||
                      f.name.toLowerCase().includes(sceneFilter) ||
                      f.category.toLowerCase().includes(sceneFilter),
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded px-2 py-1 ${
                        selectedType === 'furniture' && selectedId === item.id
                          ? 'bg-accent-soft text-accent'
                          : 'hover:bg-surface-elevated'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left truncate cursor-pointer"
                        onClick={() => select('furniture', item.id)}
                      >
                        {item.name}
                      </button>
                      <button
                        type="button"
                        aria-label={item.locked ? 'Unlock item' : 'Lock item'}
                        className="p-1 text-muted hover:text-foreground cursor-pointer"
                        onClick={() =>
                          execute(
                            updateFurnitureCommand(
                              item.id,
                              { locked: item.locked },
                              { locked: !item.locked },
                            ),
                          )
                        }
                      >
                        {item.locked ? (
                          <Lock className="h-3 w-3 text-warning" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  ))}
              </div>

              {/* Lights */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Lights ({project.lights.length})
                </div>
                {project.lights
                  .filter((l) => !sceneFilter || l.name.toLowerCase().includes(sceneFilter))
                  .map((light) => (
                    <div
                      key={light.id}
                      className={`flex items-center justify-between rounded px-2 py-1 ${
                        selectedType === 'light' && selectedId === light.id
                          ? 'bg-accent-soft text-accent'
                          : 'hover:bg-surface-elevated'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-1.5 text-left truncate cursor-pointer"
                        onClick={() => select('light', light.id)}
                      >
                        <Lamp className="h-3 w-3 shrink-0 text-warning" />
                        <span className="truncate">{light.name}</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Toggle light"
                        className="p-1 text-muted hover:text-foreground cursor-pointer"
                        onClick={() =>
                          execute(
                            updateLightCommand(
                              light.id,
                              { enabled: light.enabled },
                              { enabled: !light.enabled },
                            ),
                          )
                        }
                      >
                        {light.enabled ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
