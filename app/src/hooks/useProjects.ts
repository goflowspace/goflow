'use client';

import {useEffect, useState} from 'react';

import {type Project, api} from '@services/api';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import {isOSS} from '../utils/edition';
import {useTeamSwitch} from './useTeamSwitch';

interface UseProjectsOptions {
  /**
   * Автоматически загружать проекты при инициализации
   * @default true
   */
  autoLoad?: boolean;

  /**
   * Загружать проекты при смене команды
   * @default true
   */
  reloadOnTeamSwitch?: boolean;
}

interface UseProjectsReturn {
  /** Список проектов */
  projects: Project[];
  /** Флаг загрузки */
  isLoading: boolean;
  /** Ошибка загрузки */
  error: string | null;
  /** Функция для принудительной перезагрузки */
  reload: () => Promise<void>;
  /** Функция для установки проектов извне */
  setProjects: (projects: Project[]) => void;
}

/**
 * Хук для загрузки проектов с учетом текущей команды
 *
 * Автоматически:
 * - Загружает проекты команды, если выбрана команда
 * - Загружает личные проекты, если команда не выбрана
 * - Перезагружает проекты при смене команды
 * - Обрабатывает ошибки (например, удаление команды)
 */
export const useProjects = (options: UseProjectsOptions = {}): UseProjectsReturn => {
  const {autoLoad = true, reloadOnTeamSwitch = true} = options;

  const {user} = useUserStore();
  const {currentTeam, isInitialized} = useTeamStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Функция загрузки проектов
  const loadProjects = async (): Promise<void> => {
    if (!user || !isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);
      let data: Project[] = [];

      if (currentTeam && !isOSS()) {
        // Загружаем проекты команды (cloud mode)
        try {
          const teamProjects = await api.getTeamProjects(currentTeam.id);
          // Адаптируем данные команды к формату Project[]
          data = teamProjects.map((tp) => ({
            id: tp.project.id,
            name: tp.project.name,
            createdAt: tp.project.createdAt,
            updatedAt: tp.project.updatedAt,
            creatorId: tp.project.creator.id,
            version: 1, // Значение по умолчанию
            projectInfo: tp.project.projectInfo,
            members: [
              {
                id: `${tp.project.creator.id}-owner`,
                projectId: tp.project.id,
                userId: tp.project.creator.id,
                role: 'OWNER' as const,
                createdAt: tp.project.createdAt,
                user: {
                  id: tp.project.creator.id,
                  name: tp.project.creator.name,
                  email: tp.project.creator.email
                }
              }
            ]
          }));
        } catch (teamError) {
          console.warn('Failed to load team projects:', teamError);
          if (teamError instanceof Error && teamError.message.includes('404')) {
            data = await api.getProjects();
          } else {
            data = [];
          }
        }
      } else {
        // OSS mode or no team — загружаем личные проекты пользователя
        data = await api.getProjects();
      }

      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить проекты';
      setError(errorMessage);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Используем хук переключения команд, если включен автоматический перезагрузка
  if (reloadOnTeamSwitch) {
    useTeamSwitch(loadProjects);
  }

  // Автоматическая загрузка при инициализации
  useEffect(() => {
    if (autoLoad && user && isInitialized) {
      loadProjects();
    }
  }, [user, isInitialized, currentTeam?.id, autoLoad]);

  return {
    projects,
    isLoading,
    error,
    reload: loadProjects,
    setProjects
  };
};
