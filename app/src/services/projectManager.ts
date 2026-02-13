import {useGraphStore} from '../store/useGraphStore';
import {useProjectStore} from '../store/useProjectStore';
import {api} from './api';
import {ProjectDataService} from './projectDataService';

export type ProjectStatus = 'loading' | 'ready' | 'error' | 'not-found';

export interface ProjectState {
  status: ProjectStatus;
  error?: string;
  isInitialized: boolean;
}

/**
 * ProjectManager - единая точка управления проектом
 * Инкапсулирует всю логику загрузки, сохранения, синхронизации
 * Предоставляет простой API для компонентов
 */
export class ProjectManager {
  private static instance: ProjectManager | null = null;
  private currentProjectId: string | null = null;
  private listeners: Set<(state: ProjectState) => void> = new Set();
  private state: ProjectState = {
    status: 'loading',
    isInitialized: false
  };

  private constructor() {}

  /**
   * Singleton паттерн для глобального доступа
   */
  static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  /**
   * Инициализация проекта
   * Единая точка входа для загрузки проекта
   */
  async initializeProject(projectId: string): Promise<void> {
    // Проверяем, действительно ли проект уже инициализирован
    // Если состояние графа было сброшено, нужно перезагрузить данные
    const graphStore = useGraphStore.getState();
    const hasValidData = graphStore.hasLoadedFromStorage && Object.keys(graphStore.layers).length > 0;

    if (this.currentProjectId === projectId && this.state.isInitialized && hasValidData) {
      // Проект действительно уже инициализирован и имеет данные
      return;
    }

    // Если данные отсутствуют, принудительно переинициализируем
    if (this.currentProjectId === projectId && this.state.isInitialized && !hasValidData) {
      console.log('ProjectManager: State mismatch detected, forcing reinitialization');
      this.cleanup();
    }

    this.currentProjectId = projectId;
    this.setState({status: 'loading', isInitialized: false});

    try {
      // Останавливаем предыдущее автосохранение если было
      ProjectDataService.cleanup();

      console.log('ProjectManager: Loading project metadata for', projectId);

      // 1. Сначала загружаем метаинформацию проекта для получения актуального названия
      try {
        const projects = await api.getProjects();
        const currentProject = projects.find((p) => p.id === projectId);

        if (currentProject) {
          // Устанавливаем актуальное название проекта из API
          useProjectStore.getState().setProjectName(currentProject.name);
          console.log('ProjectManager: Project name loaded from API:', currentProject.name);
        }
      } catch (metadataError) {
        console.warn('ProjectManager: Failed to load project metadata:', metadataError);
        // Продолжаем загрузку даже если не удалось получить метаданные
      }

      // 2. Затем загружаем данные графа
      console.log('ProjectManager: Loading project graph data for', projectId);
      await useGraphStore.getState().loadFromServer(projectId);

      // Проект успешно загружен
      this.setState({
        status: 'ready',
        isInitialized: true,
        error: undefined
      });

      console.log('ProjectManager: Project initialized successfully');
    } catch (error) {
      console.error('ProjectManager: Failed to initialize project:', error);

      try {
        // Fallback к IndexedDB
        console.log('ProjectManager: Trying fallback to IndexedDB');
        await useGraphStore.getState().loadFromDb();

        this.setState({
          status: 'ready',
          isInitialized: true,
          error: undefined
        });
      } catch (fallbackError) {
        console.error('ProjectManager: Fallback failed:', fallbackError);
        this.setState({
          status: 'error',
          isInitialized: false,
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Навигация к слою с валидацией
   */
  async navigateToLayer(layerId: string): Promise<boolean> {
    if (!this.state.isInitialized) {
      console.warn('ProjectManager: Cannot navigate - project not initialized');
      return false;
    }

    const graphStore = useGraphStore.getState();
    const layers = graphStore.layers;

    // Проверяем существование слоя
    if (layerId !== 'root' && !layers[layerId]) {
      console.warn(`ProjectManager: Layer ${layerId} does not exist`);
      return false;
    }

    // Переходим к слою
    graphStore.enterGraph(layerId);
    return true;
  }

  /**
   * Получение текущего состояния проекта
   */
  getState(): ProjectState {
    return {...this.state};
  }

  /**
   * Подписка на изменения состояния проекта
   */
  subscribe(listener: (state: ProjectState) => void): () => void {
    this.listeners.add(listener);

    // Возвращаем функцию отписки
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Принудительное сохранение проекта
   */
  async saveProject(): Promise<boolean> {
    if (!this.currentProjectId || !this.state.isInitialized) {
      console.warn('ProjectManager: Cannot save - project not initialized');
      return false;
    }

    try {
      await useGraphStore.getState().forceSaveToServer(this.currentProjectId);
      console.log('ProjectManager: Project saved successfully');
      return true;
    } catch (error) {
      console.error('ProjectManager: Failed to save project:', error);
      return false;
    }
  }

  /**
   * Очистка ресурсов проекта
   */
  cleanup(): void {
    console.log('ProjectManager: Cleaning up project resources');

    // Останавливаем автосохранение
    ProjectDataService.cleanup();

    // Сбрасываем состояние
    this.currentProjectId = null;
    this.setState({
      status: 'loading',
      isInitialized: false,
      error: undefined
    });

    // Очищаем слушателей
    this.listeners.clear();
  }

  /**
   * Получение ID текущего проекта
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Проверка готовности проекта
   */
  isReady(): boolean {
    return this.state.status === 'ready' && this.state.isInitialized;
  }

  /**
   * Обновление состояния с уведомлением слушателей
   */
  private setState(newState: Partial<ProjectState>): void {
    this.state = {...this.state, ...newState};

    // Уведомляем всех слушателей
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('ProjectManager: Error in state listener:', error);
      }
    });
  }

  /**
   * Инициализация обработчика beforeunload
   * Только если проект готов
   */
  initializeBeforeUnloadHandler(): (() => void) | null {
    if (!this.state.isInitialized) {
      return null;
    }

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (ProjectDataService.hasPendingChanges()) {
        await ProjectDataService.forceSaveCurrentData();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
}

// Экспортируем singleton экземпляр
export const projectManager = ProjectManager.getInstance();
