import {useCallback, useEffect, useState} from 'react';

import {ProjectState, ProjectStatus, projectManager} from '../services/projectManager';

/**
 * React хук для работы с ProjectManager
 * Предоставляет простой API для компонентов
 */
export function useProject(projectId?: string) {
  const [state, setState] = useState<ProjectState>(() => projectManager.getState());

  // Подписываемся на изменения состояния проекта
  useEffect(() => {
    const unsubscribe = projectManager.subscribe(setState);
    // Получаем актуальное состояние при подписке
    setState(projectManager.getState());
    return unsubscribe;
  }, []);

  // Инициализация проекта при изменении projectId
  useEffect(() => {
    if (projectId && projectId !== projectManager.getCurrentProjectId()) {
      projectManager.initializeProject(projectId);
    }
  }, [projectId]);

  // Очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      // Не очищаем проект при размонтировании компонента,
      // так как другие компоненты могут его использовать
      // projectManager.cleanup();
    };
  }, []);

  const navigateToLayer = useCallback(async (layerId: string): Promise<boolean> => {
    return projectManager.navigateToLayer(layerId);
  }, []);

  const saveProject = useCallback(async (): Promise<boolean> => {
    return projectManager.saveProject();
  }, []);

  const reinitializeProject = useCallback(async (): Promise<void> => {
    if (projectId) {
      // Принудительная повторная инициализация
      const currentProjectId = projectManager.getCurrentProjectId();
      if (currentProjectId) {
        projectManager.cleanup();
      }
      await projectManager.initializeProject(projectId);
    }
  }, [projectId]);

  return {
    // Состояние
    status: state.status,
    error: state.error,
    isInitialized: state.isInitialized,
    isReady: state.status === 'ready' && state.isInitialized,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',

    // Методы
    navigateToLayer,
    saveProject,
    reinitializeProject,

    // Утилиты
    currentProjectId: projectManager.getCurrentProjectId()
  };
}

/**
 * Хук для инициализации beforeunload обработчика
 * Используется в корневых компонентах
 */
export function useProjectBeforeUnload() {
  useEffect(() => {
    const cleanup = projectManager.initializeBeforeUnloadHandler();
    return cleanup || undefined;
  }, []);
}
