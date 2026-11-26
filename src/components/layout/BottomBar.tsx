'use client';

import React, { useState, useSyncExternalStore } from 'react';
import {
  AlertTriangle,
  Camera,
  Eye,
  Footprints,
  Grid3X3,
  Layers,
  Map,
  Orbit,
  Ruler,
  Scissors,
  Sun,
} from 'lucide-react';
import {
  getStoredCollisionWarnings,
  getStoredDevMode,
  setStoredCollisionWarnings,
} from '@/lib/appSettings';
import { formatTimeOfDay } from '@/lib/lightingPresets';
import { useCameraStore, useProjectStore, useSimulationStore } from '@/stores';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';

export interface PerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}

interface BottomBarProps {
  perfStats: PerfStats;
}

type CameraModeChoice = 'orbit' | 'walk' | 'floorplan' | 'exterior' | 'interior' | 'cutaway';

export function BottomBar({ perfStats }: BottomBarProps) {
  const floors = useProjectStore((s) => s.project.floors);
  const cameraPresets = useProjectStore((s) => s.project.cameraPresets);
  const updateEnvironment = useProjectStore((s) => s.updateEnvironment);

  const mode = useSimulationStore((s) => s.mode);
  const setMode = useSimulationStore((s) => s.setMode);
  const cutawayEnabled = useSimulationStore((s) => s.cutawayEnabled);
  const setCutawayEnabled = useSimulationStore((s) => s.setCutawayEnabled);
  const activeFloorId = useSimulationStore((s) => s.activeFloorId);
  const setActiveFloorId = useSimulationStore((s) => s.setActiveFloorId);
  const showGrid = useSimulationStore((s) => s.showGrid);
  const setShowGrid = useSimulationStore((s) => s.setShowGrid);
  const showDimensions = useSimulationStore((s) => s.showDimensions);
  const setShowDimensions = useSimulationStore((s) => s.setShowDimensions);
  const showRoomLabels = useSimulationStore((s) => s.showRoomLabels);
  const setShowRoomLabels = useSimulationStore((s) => s.setShowRoomLabels);
  const timeOfDay = useSimulationStore((s) => s.timeOfDay);
  const setTimeOfDay = useSimulationStore((s) => s.setTimeOfDay);

  const applyPreset = useCameraStore((s) => s.applyPreset);
  const setCameraPose = useCameraStore((s) => s.setCameraPose);

  const subscribeSettings = (cb: () => void) => {
    window.addEventListener('app-settings-changed', cb);
    return () => window.removeEventListener('app-settings-changed', cb);
  };
  const devMode = useSyncExternalStore(subscribeSettings, getStoredDevMode, () => false);
  const collisionWarnings = useSyncExternalStore(
    subscribeSettings,
    getStoredCollisionWarnings,
    () => true,
  );
  const [presetView, setPresetView] = useState<'exterior' | 'interior' | null>(null);

  const cameraChoice: CameraModeChoice =
    mode === 'walk'
      ? 'walk'
      : mode === 'floorplan'
        ? 'floorplan'
        : cutawayEnabled
          ? 'cutaway'
          : presetView ?? 'orbit';

  const handleCameraChoice = (choice: CameraModeChoice) => {
    if (choice === 'orbit') {
      setPresetView(null);
      setCutawayEnabled(false);
      setMode('orbit');
    } else if (choice === 'walk') {
      setPresetView(null);
      setCutawayEnabled(false);
      setMode('walk');
    } else if (choice === 'floorplan') {
      setPresetView(null);
      setCutawayEnabled(false);
      setMode('floorplan');
    } else if (choice === 'cutaway') {
      setPresetView(null);
      setMode('orbit');
      setCutawayEnabled(true);
    } else if (choice === 'exterior') {
      setPresetView('exterior');
      setCutawayEnabled(false);
      setMode('orbit');
      const extPreset =
        cameraPresets.find((p) => p.id.includes('exterior')) ?? cameraPresets[0];
      if (extPreset) applyPreset(extPreset);
      else setCameraPose([14, 9, 16], [0, 2, 0]);
    } else if (choice === 'interior') {
      setPresetView('interior');
      setCutawayEnabled(false);
      setMode('orbit');
      const intPreset =
        cameraPresets.find((p) => !p.id.includes('exterior')) ?? cameraPresets[1];
      if (intPreset) applyPreset(intPreset);
      else setCameraPose([2.5, 1.8, 3.5], [0, 1.4, -1]);
    }
  };

  return (
    <footer className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border bg-surface px-2.5 sm:px-3 text-xs z-20 overflow-x-auto">
      {/* Floor & Camera Mode */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-muted hidden sm:inline" />
          <Select
            value={activeFloorId ?? floors[0]?.id ?? ''}
            onValueChange={(val) => setActiveFloorId(val)}
          >
            <SelectTrigger className="h-7 w-28 sm:w-36 text-[11px]" aria-label="Active floor">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-5" />

        <div className="flex items-center gap-1">
          {(
            [
              { id: 'orbit', label: 'Orbit', icon: Orbit },
              { id: 'walk', label: 'Walk', icon: Footprints },
              { id: 'floorplan', label: 'Plan', icon: Map },
              { id: 'exterior', label: 'Exterior', icon: Camera },
              { id: 'interior', label: 'Interior', icon: Eye },
              { id: 'cutaway', label: 'Cutaway', icon: Scissors },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={cameraChoice === id ? 'soft' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => handleCameraChoice(id)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* View Toggles & Time Scrubber */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showGrid ? 'soft' : 'ghost'}
              size="icon-sm"
              onClick={() => setShowGrid(!showGrid)}
              aria-label="Toggle grid"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Grid (G)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showDimensions ? 'soft' : 'ghost'}
              size="icon-sm"
              onClick={() => setShowDimensions(!showDimensions)}
              aria-label="Toggle measurements"
            >
              <Ruler className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Measurements & Dimensions</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showRoomLabels ? 'soft' : 'ghost'}
              size="icon-sm"
              onClick={() => setShowRoomLabels(!showRoomLabels)}
              aria-label="Toggle ceiling and room labels"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ceiling & Room Labels</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={collisionWarnings ? 'soft' : 'ghost'}
              size="icon-sm"
              onClick={() => setStoredCollisionWarnings(!collisionWarnings)}
              aria-label="Toggle collision warnings"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Furniture Collision Warnings</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <div className="hidden sm:flex items-center gap-2 w-40">
          <Sun className="h-3.5 w-3.5 text-warning shrink-0" />
          <Slider
            min={0}
            max={23.75}
            step={0.25}
            value={[timeOfDay]}
            onValueChange={([val]) => {
              setTimeOfDay(val);
              updateEnvironment({ timeOfDay: val });
            }}
            aria-label="Time of day"
          />
          <span className="font-mono text-[11px] text-muted-foreground w-10 text-right">
            {formatTimeOfDay(timeOfDay)}
          </span>
        </div>

        {devMode && (
          <>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground bg-surface-elevated border border-border rounded px-2 py-0.5">
              <span>{perfStats.fps} FPS</span>
              <span>·</span>
              <span>{perfStats.drawCalls} DC</span>
              <span className="hidden xl:inline">·</span>
              <span className="hidden xl:inline">
                {(perfStats.triangles / 1000).toFixed(1)}k tris
              </span>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
