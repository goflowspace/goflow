import {create} from 'zustand';
import {persist} from 'zustand/middleware';

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: true, // По умолчанию панель открыта
      toggleSidebar: () => set((state) => ({isSidebarOpen: !state.isSidebarOpen})),
      setSidebarOpen: (isOpen: boolean) => set({isSidebarOpen: isOpen})
    }),
    {
      name: 'ui-storage', // Ключ для localStorage
      partialize: (state) => ({isSidebarOpen: state.isSidebarOpen}) // Сохраняем только состояние панели
    }
  )
);
