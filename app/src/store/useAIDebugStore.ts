import {create} from 'zustand';
import {persist} from 'zustand/middleware';

interface AIDebugState {
  isDebugEnabled: boolean;
  isDebugModalOpen: boolean;
  setDebugEnabled: (enabled: boolean) => void;
  toggleDebugModal: () => void;
  setDebugModalOpen: (isOpen: boolean) => void;
}

export const useAIDebugStore = create<AIDebugState>()(
  persist(
    (set) => ({
      isDebugEnabled: false,
      isDebugModalOpen: false,
      setDebugEnabled: (enabled: boolean) => set({isDebugEnabled: enabled}),
      toggleDebugModal: () => set((state) => ({isDebugModalOpen: !state.isDebugModalOpen})),
      setDebugModalOpen: (isOpen: boolean) => set({isDebugModalOpen: isOpen})
    }),
    {
      name: 'ai-debug-storage',
      partialize: (state) => ({isDebugEnabled: state.isDebugEnabled})
    }
  )
);
