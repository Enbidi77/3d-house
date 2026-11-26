'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cloud, CloudOff, Moon, Settings, Sun } from 'lucide-react';
import {
  getStoredAppName,
  getStoredCollisionWarnings,
  getStoredDevMode,
  setStoredAppName,
  setStoredCollisionWarnings,
  setStoredDevMode,
} from '@/lib/appSettings';
import { isCloudConfigured } from '@/services/supabaseClient';
import {
  useProjectStore,
  useSimulationStore,
  useToolStore,
  useUIStore,
} from '@/stores';
import {
  Badge,
  Button,
  buttonVariants,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from '@/components/ui';

export default function SettingsPage() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const project = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const snapToGrid = useToolStore((s) => s.snapToGrid);
  const setSnapToGrid = useToolStore((s) => s.setSnapToGrid);
  const snapToAngle = useToolStore((s) => s.snapToAngle);
  const setSnapToAngle = useToolStore((s) => s.setSnapToAngle);
  const snapToEndpoints = useToolStore((s) => s.snapToEndpoints);
  const setSnapToEndpoints = useToolStore((s) => s.setSnapToEndpoints);

  const shadowsEnabled = useSimulationStore((s) => s.shadowsEnabled);
  const setShadowsEnabled = useSimulationStore((s) => s.setShadowsEnabled);
  const postProcessingEnabled = useSimulationStore((s) => s.postProcessingEnabled);
  const setPostProcessingEnabled = useSimulationStore((s) => s.setPostProcessingEnabled);
  const ambientOcclusionEnabled = useSimulationStore((s) => s.ambientOcclusionEnabled);
  const setAmbientOcclusionEnabled = useSimulationStore((s) => s.setAmbientOcclusionEnabled);
  const bloomEnabled = useSimulationStore((s) => s.bloomEnabled);
  const setBloomEnabled = useSimulationStore((s) => s.setBloomEnabled);

  const subscribeSettings = (cb: () => void) => {
    window.addEventListener('app-settings-changed', cb);
    return () => window.removeEventListener('app-settings-changed', cb);
  };
  const appName = useSyncExternalStore(subscribeSettings, getStoredAppName, () => 'ArchStudio 3D');
  const devMode = useSyncExternalStore(subscribeSettings, getStoredDevMode, () => false);
  const collisionWarnings = useSyncExternalStore(
    subscribeSettings,
    getStoredCollisionWarnings,
    () => true,
  );
  const cloudReady = useSyncExternalStore(
    () => () => {},
    isCloudConfigured,
    () => false,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-accent" />
            <h1 className="text-sm font-semibold">Application Settings</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-6">
        {/* Branding & Appearance */}
        <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Branding & Appearance
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <Label htmlFor="app-name">Workspace / Studio Name</Label>
              <Input
                id="app-name"
                value={appName}
                onChange={(e) => setStoredAppName(e.target.value)}
                placeholder="ArchStudio 3D"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Interface Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'secondary'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'secondary'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Units & Precision */}
        <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Units & Precision
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Measurement System</Label>
              <Select
                value={project.unit}
                onValueChange={(v) => updateProjectMeta({ unit: v as 'metric' | 'imperial' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (meters / m²)</SelectItem>
                  <SelectItem value="imperial">Imperial (feet / sq ft)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="grid-size">Grid Increment (m)</Label>
              <Input
                id="grid-size"
                type="number"
                step={0.05}
                min={0.05}
                max={2}
                value={project.gridSize}
                onChange={(e) =>
                  updateProjectMeta({ gridSize: Math.max(0.05, Number(e.target.value) || 0.25) })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Snap to Grid</Label>
              <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Angle Snapping (45°)</Label>
              <Switch checked={snapToAngle} onCheckedChange={setSnapToAngle} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Wall Endpoint Snapping</Label>
              <Switch checked={snapToEndpoints} onCheckedChange={setSnapToEndpoints} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Furniture Collision Warnings</Label>
              <Switch
                checked={collisionWarnings}
                onCheckedChange={(v) => setStoredCollisionWarnings(v)}
              />
            </div>
          </div>
        </section>

        {/* Graphics & Developer Mode */}
        <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            3D Rendering & Developer Mode
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Real-Time Shadows</Label>
              <Switch checked={shadowsEnabled} onCheckedChange={setShadowsEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Post-Processing Pipeline</Label>
              <Switch checked={postProcessingEnabled} onCheckedChange={setPostProcessingEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ambient Occlusion (SSAO / N8AO)</Label>
              <Switch
                checked={ambientOcclusionEnabled}
                onCheckedChange={setAmbientOcclusionEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Subtle Bloom</Label>
              <Switch checked={bloomEnabled} onCheckedChange={setBloomEnabled} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Developer Mode (FPS & Draw-Call Stats)</Label>
                <p className="text-[11px] text-muted">
                  Shows real-time frame rate, draw calls, and triangle counts in the bottom bar.
                </p>
              </div>
              <Switch
                checked={devMode}
                onCheckedChange={(v) => setStoredDevMode(v)}
              />
            </div>
          </div>
        </section>

        {/* Cloud Sync Status */}
        <section className="rounded-xl border border-border bg-surface p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {cloudReady ? (
              <Cloud className="h-5 w-5 text-success" />
            ) : (
              <CloudOff className="h-5 w-5 text-muted" />
            )}
            <div>
              <div className="text-xs font-semibold">Supabase Cloud Storage</div>
              <div className="text-[11px] text-muted-foreground">
                {cloudReady
                  ? 'Connected and ready for project sync.'
                  : 'Running in local-only IndexedDB mode.'}
              </div>
            </div>
          </div>
          <Badge variant={cloudReady ? 'success' : 'secondary'}>
            {cloudReady ? 'Configured' : 'Local Only'}
          </Badge>
        </section>
      </main>
    </div>
  );
}
