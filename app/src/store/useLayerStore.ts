import {create} from 'zustand';

interface LayerState {
  currentLayer: string;
  isLayersPanelOpen: boolean;
  goToMainLayer: () => void;
  toggleLayersPanel: () => void;
}

export const useLayerStore = create<LayerState>()((set) => ({
  currentLayer: 'Главный слой',
  isLayersPanelOpen: true,

  goToMainLayer: () =>
    set(() => ({
      currentLayer: 'Главный слой'
    })),

  toggleLayersPanel: () => set((state) => ({isLayersPanelOpen: !state.isLayersPanelOpen}))
}));
