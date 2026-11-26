import { create } from 'zustand';
import {
  createHistoryStack,
  executeOnHistory,
  redoOnHistory,
  undoOnHistory,
  type Command,
  type HistoryStack,
} from '@/domain';
import { useProjectStore } from './useProjectStore';

interface HistoryState extends HistoryStack {
  execute: (command: Command) => void;
  undo: () => Command | null;
  redo: () => Command | null;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  ...createHistoryStack(100),
  execute: (command) => {
    const projectStore = useProjectStore.getState();
    const result = executeOnHistory(projectStore.project, get(), command);
    projectStore.setProject(result.project, true);
    set({ past: result.history.past, future: result.history.future });
  },
  undo: () => {
    const projectStore = useProjectStore.getState();
    const result = undoOnHistory(projectStore.project, get());
    if (result.undone) {
      projectStore.setProject(result.project, true);
      set({ past: result.history.past, future: result.history.future });
    }
    return result.undone;
  },
  redo: () => {
    const projectStore = useProjectStore.getState();
    const result = redoOnHistory(projectStore.project, get());
    if (result.redone) {
      projectStore.setProject(result.project, true);
      set({ past: result.history.past, future: result.history.future });
    }
    return result.redone;
  },
  clear: () => set({ past: [], future: [] }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
