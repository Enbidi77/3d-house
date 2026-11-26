'use client';

import dynamic from 'next/dynamic';
import { EditorShell } from '@/components/layout/EditorShell';
import type { PerfStats } from '@/components/layout/BottomBar';

interface HouseCanvasProps {
  onCanvasReady?: (captureFn: () => string | null) => void;
  onPerfUpdate?: (stats: PerfStats) => void;
}

function ViewportSkeleton() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--canvas-bg)] text-muted-foreground">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
      <div className="text-center space-y-1">
        <p className="text-xs font-medium text-foreground">Initializing 3D Architectural Engine</p>
        <p className="text-[11px] text-muted">Loading scene geometry, materials, and lighting...</p>
      </div>
    </div>
  );
}

const HouseCanvas = dynamic<HouseCanvasProps>(
  () =>
    import('@/three/scene/HouseCanvas').then(
      (mod) => mod.HouseCanvas ?? mod.default,
    ),
  {
    ssr: false,
    loading: () => <ViewportSkeleton />,
  },
);

export default function EditorPage() {
  return (
    <EditorShell>
      {({ onCanvasReady, onPerfUpdate }) => (
        <HouseCanvas onCanvasReady={onCanvasReady} onPerfUpdate={onPerfUpdate} />
      )}
    </EditorShell>
  );
}
