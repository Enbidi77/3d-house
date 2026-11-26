'use client';

import { useEffect } from 'react';
import {
  deleteFloorCommand,
  deleteFurnitureCommand,
  deleteLightCommand,
  deleteOpeningCommand,
  deleteRoomCommand,
  deleteWallCommand,
  updateFurnitureCommand,
} from '@/domain';
import {
  useCameraStore,
  useHistoryStore,
  useProjectStore,
  useSelectionStore,
  useSimulationStore,
  useToolStore,
} from '@/stores';

interface UseKeyboardShortcutsOptions {
  onSave?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts({ onSave }: UseKeyboardShortcutsOptions = {}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Global save & undo/redo work even when canvas/buttons have focus (except text inputs for undo)
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      if (isEditableTarget(e.target)) return;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useHistoryStore.getState().redo();
        } else {
          useHistoryStore.getState().undo();
        }
        return;
      }

      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }

      const simMode = useSimulationStore.getState().mode;

      // In First-Person walk mode, let W/A/S/D pass through to the 3D controller
      if (simMode === 'walk' && ['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        return;
      }

      if (e.key === 'Escape') {
        useSelectionStore.getState().clearSelection();
        useToolStore.getState().setActiveTool('select');
        if (simMode === 'walk') {
          useSimulationStore.getState().setMode('orbit');
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedId, selectedType, clearSelection } = useSelectionStore.getState();
        if (!selectedId || !selectedType) return;
        const project = useProjectStore.getState().project;
        const execute = useHistoryStore.getState().execute;

        if (selectedType === 'wall') {
          const wall = project.walls.find((w) => w.id === selectedId);
          if (wall) execute(deleteWallCommand(wall));
        } else if (selectedType === 'room') {
          const room = project.rooms.find((r) => r.id === selectedId);
          if (room) execute(deleteRoomCommand(room));
        } else if (selectedType === 'opening') {
          const opening = project.openings.find((o) => o.id === selectedId);
          if (opening) execute(deleteOpeningCommand(opening));
        } else if (selectedType === 'furniture') {
          const item = project.furniture.find((f) => f.id === selectedId);
          if (item && !item.locked) execute(deleteFurnitureCommand(item));
        } else if (selectedType === 'light') {
          const light = project.lights.find((l) => l.id === selectedId);
          if (light) execute(deleteLightCommand(light));
        } else if (selectedType === 'floor' && project.floors.length > 1) {
          const floor = project.floors.find((f) => f.id === selectedId);
          if (floor) execute(deleteFloorCommand(floor));
        }
        clearSelection();
        return;
      }

      if (mod || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'v': {
          useToolStore.getState().setActiveTool('select');
          break;
        }
        case 'g': {
          const sim = useSimulationStore.getState();
          sim.setShowGrid(!sim.showGrid);
          break;
        }
        case 's': {
          const tool = useToolStore.getState();
          tool.setSnapToGrid(!tool.snapToGrid);
          break;
        }
        case 'r': {
          const { selectedId, selectedType } = useSelectionStore.getState();
          if (selectedType === 'furniture' && selectedId) {
            const item = useProjectStore
              .getState()
              .project.furniture.find((f) => f.id === selectedId);
            if (item && !item.locked) {
              const nextYaw = item.rotation[1] + Math.PI / 4;
              useHistoryStore.getState().execute(
                updateFurnitureCommand(
                  item.id,
                  { rotation: item.rotation },
                  { rotation: [item.rotation[0], nextYaw, item.rotation[2]] },
                  'Rotate furniture 45°',
                ),
              );
            }
          } else {
            const tool = useToolStore.getState();
            tool.setSnapToAngle(!tool.snapToAngle);
          }
          break;
        }
        case 'f': {
          const { selectedId, selectedType } = useSelectionStore.getState();
          const project = useProjectStore.getState().project;
          const camera = useCameraStore.getState();
          if (selectedType === 'furniture' && selectedId) {
            const item = project.furniture.find((f) => f.id === selectedId);
            if (item) {
              const [x, y, z] = item.position;
              camera.setCameraPose([x + 3.5, y + 2.5, z + 3.5], [x, y + 0.6, z]);
              return;
            }
          }
          if (selectedType === 'light' && selectedId) {
            const light = project.lights.find((l) => l.id === selectedId);
            if (light) {
              const [x, y, z] = light.position;
              camera.setCameraPose([x + 3.5, y + 2, z + 3.5], [x, y, z]);
              return;
            }
          }
          const hero = project.cameraPresets[0];
          if (hero) {
            camera.applyPreset(hero);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);
}
