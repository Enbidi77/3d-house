'use client';

import React, { useCallback, useState } from 'react';
import { AlertTriangle, Footprints, Keyboard } from 'lucide-react';
import { checkFurnitureClearance } from '@/domain';
import { useAutosave } from '@/hooks/useAutosave';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getStoredCollisionWarnings } from '@/lib/appSettings';
import { saveProjectLocal } from '@/services/indexedDb';
import { useProjectStore, useSelectionStore, useSimulationStore, useUIStore } from '@/stores';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  TooltipProvider,
} from '@/components/ui';
import { BottomBar, type PerfStats } from './BottomBar';
import { LeftToolPanel } from './LeftToolPanel';
import { RightInspector } from './RightInspector';
import { TopNavBar } from './TopNavBar';

interface EditorShellProps {
  children: (props: {
    onCanvasReady: (captureFn: () => string | null) => void;
    onPerfUpdate: (stats: PerfStats) => void;
  }) => React.ReactNode;
}

const SHORTCUTS = [
  { key: 'V', desc: 'Select tool' },
  { key: 'F', desc: 'Focus selected object / Reset camera' },
  { key: 'G', desc: 'Toggle 3D grid' },
  { key: 'R', desc: 'Rotate selected furniture 45° / Toggle angle snap' },
  { key: 'S', desc: 'Toggle grid snapping' },
  { key: 'Delete', desc: 'Delete selected element' },
  { key: 'Ctrl / Cmd + Z', desc: 'Undo' },
  { key: 'Ctrl / Cmd + Shift + Z', desc: 'Redo' },
  { key: 'Ctrl / Cmd + S', desc: 'Save project locally' },
  { key: 'Escape', desc: 'Clear selection / Exit walk mode' },
  { key: 'W A S D', desc: 'Move in First-Person Walk mode' },
];

export function EditorShell({ children }: EditorShellProps) {
  const [captureFn, setCaptureFn] = useState<(() => string | null) | null>(null);
  const [perfStats, setPerfStats] = useState<PerfStats>({
    fps: 60,
    drawCalls: 0,
    triangles: 0,
  });
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'success' | 'error' } | null>(
    null,
  );

  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const showHelpModal = useUIStore((s) => s.showHelpModal);
  const setShowHelpModal = useUIStore((s) => s.setShowHelpModal);

  const mode = useSimulationStore((s) => s.mode);
  const setMode = useSimulationStore((s) => s.setMode);

  const project = useProjectStore((s) => s.project);
  const markClean = useProjectStore((s) => s.markClean);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedType = useSelectionStore((s) => s.selectedType);

  const notify = useCallback((message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  }, []);

  const handleQuickSave = useCallback(async () => {
    try {
      await saveProjectLocal(useProjectStore.getState().project);
      markClean();
      notify('Project saved locally.', 'success');
    } catch {
      notify('Could not save project.', 'error');
    }
  }, [markClean, notify]);

  useKeyboardShortcuts({ onSave: handleQuickSave });
  const { draft, lastSavedAt, restoreDraft, dismissDraft } = useAutosave();

  const onCanvasReady = useCallback((fn: () => string | null) => {
    setCaptureFn(() => fn);
  }, []);

  const onPerfUpdate = useCallback((stats: PerfStats) => {
    setPerfStats(stats);
  }, []);

  // Check collision warning for selected furniture
  let hasCollision = false;
  if (selectedType === 'furniture' && selectedId && getStoredCollisionWarnings()) {
    const item = project.furniture.find((f) => f.id === selectedId);
    if (item) {
      const sameFloor = project.furniture.filter((f) => f.floorId === item.floorId);
      hasCollision = !checkFurnitureClearance(item, sameFloor, 0.02).valid;
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
        <TopNavBar
          onCaptureScreenshot={() => captureFn?.() ?? null}
          lastAutosavedAt={lastSavedAt}
          onNotify={notify}
          onOpenMobileLeft={() => setMobileLeftOpen(true)}
          onOpenMobileRight={() => setMobileRightOpen(true)}
        />

        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop Left Tool Panel */}
          {leftPanelOpen && (
            <aside className="hidden lg:block w-72 shrink-0 border-r border-border bg-surface overflow-hidden">
              <LeftToolPanel />
            </aside>
          )}

          {/* 3D Viewport Area */}
          <main className="relative flex-1 min-w-0 bg-[var(--canvas-bg)] overflow-hidden">
            {children({ onCanvasReady, onPerfUpdate })}

            {/* First-Person Mode W/A/S/D Notice */}
            {mode === 'walk' && (
              <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-border bg-surface/90 backdrop-blur px-3.5 py-1.5 text-xs shadow-lg">
                <Footprints className="h-3.5 w-3.5 text-accent" />
                <span>
                  First-Person Walk: Use <kbd className="font-mono font-semibold">W A S D</kbd> to
                  move, drag to look, <kbd className="font-mono font-semibold">Esc</kbd> to exit
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setMode('orbit')}
                >
                  Exit
                </Button>
              </div>
            )}

            {/* Furniture Collision Warning */}
            {hasCollision && (
              <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-md border border-warning/40 bg-surface/95 px-2.5 py-1.5 text-[11px] text-warning shadow-md">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Furniture clearance overlap detected</span>
              </div>
            )}

            {/* Toast Notification */}
            {toast && (
              <div
                role="status"
                className={`pointer-events-none absolute bottom-3 right-3 z-30 rounded-lg border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur ${
                  toast.tone === 'error'
                    ? 'border-danger/40 bg-danger/15 text-danger'
                    : toast.tone === 'success'
                      ? 'border-success/40 bg-surface/95 text-success'
                      : 'border-border bg-surface/95 text-foreground'
                }`}
              >
                {toast.message}
              </div>
            )}
          </main>

          {/* Desktop Right Inspector */}
          {rightPanelOpen && (
            <aside className="hidden lg:block w-72 shrink-0 border-l border-border bg-surface overflow-hidden">
              <RightInspector />
            </aside>
          )}
        </div>

        <BottomBar perfStats={perfStats} />

        {/* Mobile Left Drawer (< 1024px) */}
        <Sheet open={mobileLeftOpen} onOpenChange={setMobileLeftOpen}>
          <SheetContent side="left" className="p-0">
            <SheetHeader>
              <SheetTitle>Tools & Library</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <LeftToolPanel />
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Right Drawer (< 1024px) */}
        <Sheet open={mobileRightOpen} onOpenChange={setMobileRightOpen}>
          <SheetContent side="right" className="p-0">
            <SheetHeader>
              <SheetTitle>Properties Inspector</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <RightInspector />
            </div>
          </SheetContent>
        </Sheet>

        {/* Autosave Recovery Prompt */}
        <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && dismissDraft()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recover Unsaved Draft?</DialogTitle>
              <DialogDescription>
                An autosaved draft for <strong>{draft?.name}</strong> was found in your browser
                storage. Would you like to restore it?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={dismissDraft}>
                Discard Draft
              </Button>
              <Button
                onClick={() => {
                  restoreDraft();
                  notify('Autosaved draft restored.', 'success');
                }}
              >
                Restore Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts Help Modal */}
        <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-accent" />
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription>
                Quick navigation and editing controls for the 3D architectural studio.
              </DialogDescription>
            </DialogHeader>
            <div className="divide-y divide-border rounded-lg border border-border bg-surface-elevated">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{s.desc}</span>
                  <kbd className="rounded border border-border-strong bg-surface px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
