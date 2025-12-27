import { create } from 'zustand';

import { LayoutMode } from '@/src/types/models';

type NotesUiState = {
  search: string;
  layout: LayoutMode;
  selectedLabelId: string | null;
  colorFilter: number | null;
  showPinnedOnly: boolean;
  sortBy: 'updatedAt' | 'createdAt';
  setSearch: (query: string) => void;
  setLayout: (layout: LayoutMode) => void;
  setSelectedLabelId: (labelId: string | null) => void;
  setColorFilter: (color: number | null) => void;
  setShowPinnedOnly: (value: boolean) => void;
  setSortBy: (sort: 'updatedAt' | 'createdAt') => void;
  resetFilters: () => void;
};

export const useNotesUiStore = create<NotesUiState>((set) => ({
  search: '',
  layout: 'grid',
  selectedLabelId: null,
  colorFilter: null,
  showPinnedOnly: false,
  sortBy: 'updatedAt',
  setSearch: (query) => set({ search: query }),
  setLayout: (layout) => set({ layout }),
  setSelectedLabelId: (labelId) => set({ selectedLabelId: labelId }),
  setColorFilter: (color) => set({ colorFilter: color }),
  setShowPinnedOnly: (value) => set({ showPinnedOnly: value }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () =>
    set({
      search: '',
      selectedLabelId: null,
      colorFilter: null,
      showPinnedOnly: false,
      sortBy: 'updatedAt',
    }),
}));
