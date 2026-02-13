import {KEY_HAS_SEEN_WELCOME_MODAL, KEY_INCLUDE_WELCOME_STORY, StorageService} from 'src/services/storageService';
import {create} from 'zustand';

// Импортируем useGraphStore после создания useProjectStore
// для избежания циклических зависимостей
import {useGraphStore as importedGraphStore} from './useGraphStore';

// Интерфейс для состояния проекта
interface ProjectState {
  projectName: string;
  setProjectName: (name: string) => void;

  // Флаг для показа приветственного окна
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;

  // Флаг для добавления welcome-истории
  includeWelcomeStory: boolean;
  setIncludeWelcomeStory: (include: boolean) => void;
}

// Default project name - no longer from localStorage
const getInitialProjectName = (): string => {
  // Название проекта теперь всегда берется из бэкенда/IndexedDB,
  // здесь только дефолтное значение для инициализации
  return 'Untitled';
};

// Проверяем, нужно ли показывать приветственное окно
const getInitialShowWelcomeModal = (): boolean => {
  if (typeof window !== 'undefined') {
    const hasSeenWelcome = StorageService.getItem(KEY_HAS_SEEN_WELCOME_MODAL);
    return hasSeenWelcome !== 'true';
  }
  return true;
};

// Проверяем, нужно ли добавлять welcome-историю
const getInitialIncludeWelcomeStory = (): boolean => {
  if (typeof window !== 'undefined') {
    const includeWelcomeStory = StorageService.getItem(KEY_INCLUDE_WELCOME_STORY);
    return includeWelcomeStory !== 'false'; // По умолчанию true, если нет явного указания false
  }
  return true;
};

export const useProjectStore = create<ProjectState>()((set) => ({
  projectName: getInitialProjectName(),
  setProjectName: (name) => {
    set({projectName: name});
  },

  // Состояние для приветственного окна
  showWelcomeModal: getInitialShowWelcomeModal(),
  setShowWelcomeModal: (show) => {
    if (typeof window !== 'undefined' && !show) {
      StorageService.setItem(KEY_HAS_SEEN_WELCOME_MODAL, 'true');
    }
    set({showWelcomeModal: show});
  },

  // Состояние для флага welcome-истории
  includeWelcomeStory: getInitialIncludeWelcomeStory(),
  setIncludeWelcomeStory: (include) => {
    if (typeof window !== 'undefined') {
      StorageService.setItem(KEY_INCLUDE_WELCOME_STORY, include ? 'true' : 'false');
    }
    set({includeWelcomeStory: include});
  }
}));
