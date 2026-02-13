import {create} from 'zustand';

interface NotebookStore {
  isNotebookOpen: boolean;
  toggleNotebookPanel: () => void;
  openNotebookPanel: () => void;
  closeNotebookPanel: () => void;
}

export const useNotebookStore = create<NotebookStore>((set) => ({
  isNotebookOpen: false,
  toggleNotebookPanel: () => set((state) => ({isNotebookOpen: !state.isNotebookOpen})),
  openNotebookPanel: () => set({isNotebookOpen: true}),
  closeNotebookPanel: () => set({isNotebookOpen: false})
}));
