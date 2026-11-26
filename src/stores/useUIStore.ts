import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type InspectorTab = 'properties' | 'materials' | 'lighting' | 'environment';
export type CatalogTab = 'rooms' | 'architecture' | 'furniture' | 'materials';

interface UIState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  activeInspectorTab: InspectorTab;
  activeCatalogTab: CatalogTab;
  showHelpModal: boolean;
  showExportModal: boolean;
  theme: 'dark' | 'light';
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveInspectorTab: (tab: InspectorTab) => void;
  setActiveCatalogTab: (tab: CatalogTab) => void;
  setShowHelpModal: (open: boolean) => void;
  setShowExportModal: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      leftPanelOpen: true,
      rightPanelOpen: true,
      activeInspectorTab: 'properties',
      activeCatalogTab: 'architecture',
      showHelpModal: false,
      showExportModal: false,
      theme: 'dark',
      setLeftPanelOpen: (leftPanelOpen) => set({ leftPanelOpen }),
      setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
      setActiveInspectorTab: (activeInspectorTab) => set({ activeInspectorTab }),
      setActiveCatalogTab: (activeCatalogTab) => set({ activeCatalogTab }),
      setShowHelpModal: (showHelpModal) => set({ showHelpModal }),
      setShowExportModal: (showExportModal) => set({ showExportModal }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: '3d-house-ui-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        leftPanelOpen: state.leftPanelOpen,
        rightPanelOpen: state.rightPanelOpen,
        theme: state.theme,
      }),
    },
  ),
);
