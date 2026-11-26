import { create } from 'zustand';
import {
  STARTER_HOUSE_PROJECT,
  migrateProject,
  type EnvironmentSettings,
  type Project,
} from '@/domain';

interface ProjectState {
  project: Project;
  isDirty: boolean;
  setProject: (project: Project, markDirty?: boolean) => void;
  loadProjectFromJson: (raw: unknown) => void;
  resetToStarter: () => void;
  updateEnvironment: (patch: Partial<EnvironmentSettings>) => void;
  updateProjectMeta: (patch: Partial<Pick<Project, 'name' | 'description' | 'unit' | 'gridSize'>>) => void;
  markClean: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: STARTER_HOUSE_PROJECT,
  isDirty: false,
  setProject: (project, markDirty = true) => set({ project, isDirty: markDirty }),
  loadProjectFromJson: (raw) => {
    const migrated = migrateProject(raw);
    set({ project: migrated, isDirty: false });
  },
  resetToStarter: () => set({ project: STARTER_HOUSE_PROJECT, isDirty: false }),
  updateEnvironment: (patch) =>
    set((state) => ({
      isDirty: true,
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        environment: { ...state.project.environment, ...patch },
      },
    })),
  updateProjectMeta: (patch) =>
    set((state) => ({
      isDirty: true,
      project: {
        ...state.project,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    })),
  markClean: () => set({ isDirty: false }),
}));
