import { create } from 'zustand';

export type SelectableEntityType =
  | 'wall'
  | 'room'
  | 'opening'
  | 'furniture'
  | 'light'
  | 'floor';

interface SelectionState {
  selectedId: string | null;
  selectedType: SelectableEntityType | null;
  hoveredId: string | null;
  hoveredType: SelectableEntityType | null;
  select: (type: SelectableEntityType, id: string) => void;
  clearSelection: () => void;
  setHovered: (type: SelectableEntityType | null, id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedId: null,
  selectedType: null,
  hoveredId: null,
  hoveredType: null,
  select: (type, id) => set({ selectedType: type, selectedId: id }),
  clearSelection: () => set({ selectedType: null, selectedId: null }),
  setHovered: (type, id) => set({ hoveredType: type, hoveredId: id }),
}));
