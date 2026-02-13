/**
 * Утилиты для работы с данными команды
 * Обеспечивают надежное получение teamId даже при сбросе store
 */
import {useTeamStore} from '@store/useTeamStore';

/**
 * Надежное получение teamId из нескольких источников
 * Порядок попыток:
 * 1. useTeamStore (если доступен)
 * 2. localStorage.getItem('currentTeamId')
 * 3. localStorage.getItem('currentTeam') (parse JSON)
 */
export const getReliableTeamId = (): string | null => {
  // Пытаемся получить из store
  try {
    const storeTeamId = useTeamStore.getState().currentTeam?.id;
    if (storeTeamId) {
      return storeTeamId;
    }
  } catch (error) {
    console.warn('Failed to get teamId from store:', error);
  }

  // Пытаемся получить из localStorage (direct)
  try {
    const directTeamId = localStorage.getItem('currentTeamId');
    if (directTeamId && directTeamId !== 'undefined' && directTeamId !== 'null') {
      return directTeamId;
    }
  } catch (error) {
    console.warn('Failed to get teamId from localStorage direct:', error);
  }

  // Пытаемся получить из localStorage (JSON)
  try {
    const savedTeam = localStorage.getItem('currentTeam');
    if (savedTeam) {
      const team = JSON.parse(savedTeam);
      if (team && team.id) {
        return team.id;
      }
    }
  } catch (error) {
    console.warn('Failed to get teamId from localStorage JSON:', error);
  }

  return null;
};

/**
 * Hook для надежного получения teamId (обновляется реактивно)
 */
export const useReliableTeamId = (): string | null => {
  const {currentTeam} = useTeamStore();

  // Если store доступен, используем его
  if (currentTeam?.id) {
    return currentTeam.id;
  }

  // Fallback на localStorage
  return getReliableTeamId();
};

/**
 * Сохранение teamId в localStorage (для дополнительной надежности)
 */
export const persistTeamId = (teamId: string | null): void => {
  try {
    if (teamId) {
      localStorage.setItem('currentTeamId', teamId);
    } else {
      localStorage.removeItem('currentTeamId');
    }
  } catch (error) {
    console.warn('Failed to persist teamId:', error);
  }
};
