'use client';

import React, { useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Box,
  Camera,
  Cloud,
  CloudOff,
  Download,
  FileJson,
  FileSpreadsheet,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Moon,
  PanelLeft,
  PanelRight,
  Redo2,
  Save,
  Settings,
  SlidersHorizontal,
  Sun,
  Undo2,
  Upload,
} from 'lucide-react';
import { addFurnitureCommand, addMaterialCommand } from '@/domain';
import { getStoredAppName } from '@/lib/appSettings';
import { importModelAsset, importTextureAsset } from '@/services/assetImport';
import {
  downloadDataUrl,
  exportFurnitureInventoryCsv,
  exportRoomReportCsv,
} from '@/services/exporters';
import { saveProjectLocal } from '@/services/indexedDb';
import { downloadProjectFile, importProjectFile } from '@/services/projectIo';
import { isCloudConfigured, saveProjectCloud } from '@/services/supabaseClient';
import {
  useHistoryStore,
  useProjectStore,
  useSelectionStore,
  useSimulationStore,
  useUIStore,
} from '@/stores';
import {
  Badge,
  Button,
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';

interface TopNavBarProps {
  onCaptureScreenshot: () => string | null;
  lastAutosavedAt: string | null;
  onNotify: (message: string, tone?: 'info' | 'success' | 'error') => void;
  onOpenMobileLeft?: () => void;
  onOpenMobileRight?: () => void;
}

export function TopNavBar({
  onCaptureScreenshot,
  lastAutosavedAt,
  onNotify,
  onOpenMobileLeft,
  onOpenMobileRight,
}: TopNavBarProps) {
  const project = useProjectStore((s) => s.project);
  const isDirty = useProjectStore((s) => s.isDirty);
  const setProject = useProjectStore((s) => s.setProject);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);
  const markClean = useProjectStore((s) => s.markClean);

  const pastCount = useHistoryStore((s) => s.past.length);
  const futureCount = useHistoryStore((s) => s.future.length);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const execute = useHistoryStore((s) => s.execute);
  const clearHistory = useHistoryStore((s) => s.clear);

  const activeFloorId = useSimulationStore((s) => s.activeFloorId);
  const select = useSelectionStore((s) => s.select);

  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const setShowHelpModal = useUIStore((s) => s.setShowHelpModal);
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const setLeftPanelOpen = useUIStore((s) => s.setLeftPanelOpen);
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen);

  const subscribeSettings = (cb: () => void) => {
    window.addEventListener('app-settings-changed', cb);
    return () => window.removeEventListener('app-settings-changed', cb);
  };
  const appName = useSyncExternalStore(subscribeSettings, getStoredAppName, () => 'ArchStudio 3D');
  const cloudReady = useSyncExternalStore(
    () => () => {},
    isCloudConfigured,
    () => false,
  );
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(project.name);
  const [saving, setSaving] = useState(false);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);

  const commitProjectName = () => {
    setEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== project.name) {
      updateProjectMeta({ name: trimmed });
    } else {
      setDraftName(project.name);
    }
  };

  const handleSaveLocal = async () => {
    setSaving(true);
    try {
      await saveProjectLocal(project);
      if (cloudReady) {
        await saveProjectCloud(project);
        onNotify('Saved locally and synced to cloud.', 'success');
      } else {
        onNotify('Project saved to local storage.', 'success');
      }
      markClean();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to save project.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await importProjectFile(file);
    if (!res.ok) {
      onNotify(res.error, 'error');
      return;
    }
    setProject(res.project, false);
    clearHistory();
    onNotify(`Imported "${res.project.name}".`, 'success');
  };

  const handleImportModel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await importModelAsset(file);
    if (!res.ok) {
      onNotify(res.error, 'error');
      return;
    }
    const { asset } = res;
    const floorId = activeFloorId ?? project.floors[0]?.id ?? 'floor-ground';
    const id = `furn-import-${Date.now()}`;
    execute(
      addFurnitureCommand(
        {
          id,
          floorId,
          catalogId: `custom:${asset.name}`,
          name: asset.name,
          category: 'decor',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: [1.2, 1.2, 1.2],
          materialId: project.materials[0]?.id,
        },
        `Import 3D model ${asset.name}`,
      ),
    );
    select('furniture', id);
    onNotify(`Imported 3D model "${asset.name}".`, 'success');
  };

  const handleImportTexture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await importTextureAsset(file);
    if (!res.ok) {
      onNotify(res.error, 'error');
      return;
    }
    const id = `mat-tex-${Date.now()}`;
    execute(
      addMaterialCommand(
        {
          id,
          name: res.name,
          category: 'plaster',
          color: '#e5e7eb',
          roughness: 0.65,
          metalness: 0.05,
          textureScale: [1, 1],
        },
        `Import texture ${res.name}`,
      ),
    );
    onNotify(`Added material preset from "${res.name}".`, 'success');
  };

  const handleScreenshot = () => {
    const dataUrl = onCaptureScreenshot();
    if (!dataUrl) {
      onNotify('3D viewport is still initializing.', 'error');
      return;
    }
    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadDataUrl(dataUrl, `${slug || 'house'}-render.png`);
    onNotify('Screenshot downloaded as PNG.', 'success');
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-2.5 sm:px-3 z-30">
      {/* Left: Brand, Panel Toggle & Inline Project Name */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onOpenMobileLeft}
          aria-label="Open tools panel"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden lg:inline-flex"
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          aria-label="Toggle left panel"
          title="Toggle Left Tool Panel"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-elevated transition-colors shrink-0"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-xs">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <span className="hidden sm:inline text-xs font-semibold tracking-tight text-foreground">
            {appName}
          </span>
        </Link>

        <span className="hidden sm:inline text-border-strong">/</span>

        {editingName ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitProjectName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitProjectName();
              if (e.key === 'Escape') {
                setDraftName(project.name);
                setEditingName(false);
              }
            }}
            className="h-7 w-40 sm:w-56 text-xs font-medium"
            aria-label="Project name"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftName(project.name);
              setEditingName(true);
            }}
            className="truncate max-w-[140px] sm:max-w-[240px] rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-elevated text-left cursor-text"
            title="Click to rename project"
          >
            {project.name}
          </button>
        )}

        <div className="hidden md:flex items-center gap-1.5">
          {isDirty ? (
            <Badge variant="warning">Unsaved</Badge>
          ) : (
            <Badge variant="success">Saved</Badge>
          )}
          {lastAutosavedAt && (
            <span className="text-[10px] text-muted hidden xl:inline">
              Autosaved {lastAutosavedAt}
            </span>
          )}
        </div>
      </div>

      {/* Center/Right: Undo/Redo, Save, Cloud, Import/Export, Nav Links, Theme */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pastCount === 0}
              onClick={() => undo()}
              aria-label="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={futureCount === 0}
              onClick={() => redo()}
              aria-label="Redo"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <Button
          variant="soft"
          size="sm"
          onClick={handleSaveLocal}
          disabled={saving}
          className="ml-1"
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden md:flex items-center gap-1 rounded-md border border-border bg-surface-elevated px-2 py-1 text-[11px] text-muted-foreground">
              {cloudReady ? (
                <>
                  <Cloud className="h-3.5 w-3.5 text-success" />
                  <span className="hidden lg:inline">Cloud Ready</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-3.5 w-3.5 text-muted" />
                  <span className="hidden lg:inline">Local Only</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {cloudReady
              ? 'Supabase cloud sync is configured'
              : 'Configure Supabase env vars for cloud sync'}
          </TooltipContent>
        </Tooltip>

        {/* Import / Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Import / Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Import</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => jsonInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              Import Project JSON...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => modelInputRef.current?.click()}>
              <Box className="h-3.5 w-3.5 text-muted-foreground" />
              Import 3D Model (.glb / .gltf)...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => textureInputRef.current?.click()}>
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Import Texture Image...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                downloadProjectFile(project);
                onNotify('Project JSON downloaded.', 'success');
              }}
            >
              <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
              Export Project JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleScreenshot}>
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              Export Screenshot (PNG)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportRoomReportCsv(project);
                onNotify('Room area report CSV downloaded.', 'success');
              }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
              Room Area Report (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportFurnitureInventoryCsv(project);
                onNotify('Furniture inventory CSV downloaded.', 'success');
              }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
              Furniture Inventory (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hidden file inputs */}
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportJson}
        />
        <input
          ref={modelInputRef}
          type="file"
          accept=".glb,.gltf"
          className="hidden"
          onChange={handleImportModel}
        />
        <input
          ref={textureInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleImportTexture}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/projects"
              aria-label="Projects"
              className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Projects Manager</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              aria-label="Settings"
              className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Application Settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Theme
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowHelpModal(true)}
              aria-label="Keyboard shortcuts"
              className="hidden sm:inline-flex"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard Shortcuts & Help</TooltipContent>
        </Tooltip>

        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onOpenMobileRight}
          aria-label="Open inspector"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden lg:inline-flex"
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          aria-label="Toggle right inspector"
          title="Toggle Properties Inspector"
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
