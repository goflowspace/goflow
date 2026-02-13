import {useEffect, useRef} from 'react';

import {usePathname, useRouter} from 'next/navigation';

import {useTeamStore} from '@store/useTeamStore';

import {isInProjectWorkspace} from '../utils/routeHelpers';

export interface TeamSwitchOptions {
  /** Колбек для выполнения при смене команды */
  onTeamSwitch?: () => void | Promise<void>;
  /** Автоматически редиректить на /projects если пользователь находится в проекте */
  redirectFromProject?: boolean;
}

/**
 * Хук для обработки переключения команд с колбеками
 * Решает проблемы с race conditions при смене команды
 * Может автоматически редиректить с страниц проектов на /projects
 */
export const useTeamSwitch = (options?: TeamSwitchOptions | (() => void | Promise<void>)) => {
  const {currentTeam} = useTeamStore();
  const previousTeamId = useRef<string | null>(null);
  const isFirstRender = useRef(true);
  const pathname = usePathname();
  const router = useRouter();

  // Нормализуем параметры для обратной совместимости
  const normalizedOptions = typeof options === 'function' ? {onTeamSwitch: options, redirectFromProject: false} : options || {};

  useEffect(() => {
    // Пропускаем первый рендер
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousTeamId.current = currentTeam?.id || null;
      return;
    }

    const newTeamId = currentTeam?.id || null;

    // Если команда действительно изменилась
    if (previousTeamId.current !== newTeamId) {
      // Проверяем, нужно ли сделать редирект с проектной страницы
      // ВАЖНО: редиректим только если это НЕ инициализация из localStorage
      // и previousTeamId не был null (что означает первоначальную загрузку)
      const shouldRedirectFromProject = normalizedOptions.redirectFromProject && isInProjectWorkspace(pathname) && previousTeamId.current !== null; // Ключевое условие!

      // Увеличиваем задержку чтобы localStorage точно успел обновиться
      setTimeout(() => {
        // Сначала делаем редирект, если нужно
        if (shouldRedirectFromProject) {
          router.push('/projects');
        }

        // Затем выполняем колбек
        if (normalizedOptions.onTeamSwitch) {
          const result = normalizedOptions.onTeamSwitch();
          if (result && typeof result.catch === 'function') {
            result.catch((error: unknown) => {
              console.error('Error in team switch callback:', error);
            });
          }
        }
      }, 200);

      previousTeamId.current = newTeamId;
    }
  }, [currentTeam?.id, normalizedOptions.onTeamSwitch, normalizedOptions.redirectFromProject, pathname, router]);

  return {
    currentTeam,
    teamId: currentTeam?.id || null
  };
};
