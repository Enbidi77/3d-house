'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Cloud,
  CloudOff,
  Download,
  FolderOpen,
  Home,
  Layers,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Project } from '@/domain';
import {
  deleteProjectLocal,
  listProjectsLocal,
  loadProjectLocal,
  saveProjectLocal,
} from '@/services/indexedDb';
import { downloadProjectFile, importProjectFile } from '@/services/projectIo';
import {
  isCloudConfigured,
  listProjectsCloud,
  loadProjectCloud,
} from '@/services/supabaseClient';
import { useHistoryStore, useProjectStore } from '@/stores';
import { Badge, Button, buttonVariants, Separator } from '@/components/ui';

interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  floorCount?: number;
  roomCount?: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const currentProject = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const resetToStarter = useProjectStore((s) => s.resetToStarter);
  const clearHistory = useHistoryStore((s) => s.clear);

  const [localProjects, setLocalProjects] = useState<ProjectSummary[]>([]);
  const [cloudProjects, setCloudProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshLists = useCallback(async () => {
    try {
      const local = await listProjectsLocal();
      setLocalProjects(local);
    } catch {
      setLocalProjects([]);
    }

    const configured = isCloudConfigured();
    setCloudReady(configured);
    if (configured) {
      try {
        const res = await listProjectsCloud();
        if (res.ok) {
          setCloudProjects(res.data);
        } else {
          setCloudProjects([]);
        }
      } catch {
        setCloudProjects([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await refreshLists();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshLists]);

  const handleLoadLocal = async (id: string) => {
    const loaded = await loadProjectLocal(id);
    if (!loaded) {
      setStatus('Project not found in local storage.');
      return;
    }
    setProject(loaded, false);
    clearHistory();
    router.push('/');
  };

  const handleLoadCloud = async (id: string) => {
    const res = await loadProjectCloud(id);
    if (!res.ok || !res.data) {
      setStatus(res.ok ? 'Project not found in cloud storage.' : res.error);
      return;
    }
    setProject(res.data, false);
    clearHistory();
    router.push('/');
  };

  const handleDeleteLocal = async (id: string) => {
    await deleteProjectLocal(id);
    setStatus('Removed project from local storage.');
    refreshLists();
  };

  const handleSaveCurrent = async () => {
    await saveProjectLocal(currentProject);
    setStatus(`Saved "${currentProject.name}" locally.`);
    refreshLists();
  };

  const handleNewStarter = () => {
    resetToStarter();
    clearHistory();
    router.push('/');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await importProjectFile(file);
    if (!res.ok) {
      setStatus(res.error);
      return;
    }
    const imported: Project = res.project;
    await saveProjectLocal(imported);
    setProject(imported, false);
    clearHistory();
    router.push('/');
  };

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
            <FolderOpen className="h-4 w-4 text-accent" />
            <h1 className="text-sm font-semibold">Projects Manager</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            Import JSON
          </Button>
          <Button variant="default" size="sm" onClick={handleNewStarter}>
            <Plus className="h-3.5 w-3.5" />
            New Starter Villa
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportJson}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        {status && (
          <div className="rounded-lg border border-border bg-surface-elevated px-3.5 py-2 text-xs text-foreground">
            {status}
          </div>
        )}

        {/* Active Project Card */}
        <section className="rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge>Active Session</Badge>
              <span className="text-sm font-semibold">{currentProject.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentProject.floors.length} floors · {currentProject.rooms.length} rooms ·{' '}
              {currentProject.walls.length} walls · {currentProject.furniture.length} furniture items
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => downloadProjectFile(currentProject)}>
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveCurrent}>
              Save Snapshot Locally
            </Button>
          </div>
        </section>

        {/* Local Projects (IndexedDB) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              Local Browser Projects (IndexedDB)
            </h2>
            <span className="text-xs text-muted">{localProjects.length} saved</span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-xs text-muted">
              Loading saved projects...
            </div>
          ) : localProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center space-y-2">
              <Layers className="h-6 w-6 mx-auto text-muted" />
              <p className="text-xs text-muted-foreground">
                No locally saved projects yet. Save your active project or import a JSON file.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {localProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium truncate">{proj.name}</div>
                    <div className="text-[11px] text-muted">
                      Updated {new Date(proj.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="soft" size="sm" onClick={() => handleLoadLocal(proj.id)}>
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete local project"
                      onClick={() => handleDeleteLocal(proj.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cloud Projects (Supabase) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              {cloudReady ? (
                <Cloud className="h-3.5 w-3.5 text-success" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 text-muted" />
              )}
              Cloud Projects (Supabase)
            </h2>
            <Badge variant={cloudReady ? 'success' : 'secondary'}>
              {cloudReady ? 'Connected' : 'Not Configured'}
            </Badge>
          </div>

          {!cloudReady ? (
            <div className="rounded-xl border border-border bg-surface p-5 text-xs text-muted-foreground">
              Optional cloud sync is disabled. Set{' '}
              <code className="font-mono text-foreground">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
              enable cross-device project storage.
            </div>
          ) : cloudProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-xs text-muted-foreground">
              No projects found in your Supabase workspace yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cloudProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium truncate">{proj.name}</div>
                    <div className="text-[11px] text-muted">
                      Updated {new Date(proj.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <Button variant="soft" size="sm" onClick={() => handleLoadCloud(proj.id)}>
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
