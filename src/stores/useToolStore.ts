import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type EditorTool =
  | 'select'
  | 'wall'
  | 'room'
  | 'door'
  | 'window'
  | 'furniture'
  | 'measure'
  | 'paint';

interface ToolState {
  activeTool: EditorTool;
  snapToGrid: boolean;
  snapToAngle: boolean;
  snapToEndpoints: boolean;
  angleStepDeg: number;
  defaultWallHeight: number;
  defaultWallThickness: number;
  activeFurnitureCatalogId: string | null;
  activeMaterialId: string | null;
  setActiveTool: (tool: EditorTool) => void;
  setSnapToGrid: (enabled: boolean) => void;
  setSnapToAngle: (enabled: boolean) => void;
  setSnapToEndpoints: (enabled: boolean) => void;
  setAngleStepDeg: (deg: number) => void;
  setDefaultWallHeight: (height: number) => void;
  setDefaultWallThickness: (thickness: number) => void;
  setActiveFurnitureCatalogId: (catalogId: string | null) => void;
  setActiveMaterialId: (materialId: string | null) => void;
}

export const useToolStore = create<ToolState>()(
  persist(
    (set) => ({
      activeTool: 'select',
      snapToGrid: true,
      snapToAngle: true,
      snapToEndpoints: true,
      angleStepDeg: 45,
      defaultWallHeight: 3.2,
      defaultWallThickness: 0.2,
      activeFurnitureCatalogId: null,
      activeMaterialId: null,
      setActiveTool: (activeTool) => set({ activeTool }),
      setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
      setSnapToAngle: (snapToAngle) => set({ snapToAngle }),
      setSnapToEndpoints: (snapToEndpoints) => set({ snapToEndpoints }),
      setAngleStepDeg: (angleStepDeg) => set({ angleStepDeg }),
      setDefaultWallHeight: (defaultWallHeight) => set({ defaultWallHeight }),
      setDefaultWallThickness: (defaultWallThickness) => set({ defaultWallThickness }),
      setActiveFurnitureCatalogId: (activeFurnitureCatalogId) => set({ activeFurnitureCatalogId }),
      setActiveMaterialId: (activeMaterialId) => set({ activeMaterialId }),
    }),
    {
      name: '3d-house-tool-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        snapToGrid: state.snapToGrid,
        snapToAngle: state.snapToAngle,
        snapToEndpoints: state.snapToEndpoints,
        angleStepDeg: state.angleStepDeg,
        defaultWallHeight: state.defaultWallHeight,
        defaultWallThickness: state.defaultWallThickness,
      }),
    },
  ),
);
