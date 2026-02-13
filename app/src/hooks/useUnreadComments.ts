import {useCallback, useEffect, useState} from 'react';

import {CommentsAPI} from '@services/comments.api';

import {ThreadContextType, UnreadCommentsFilters} from '../types/comments';
import {useUnreadCommentsUpdates} from './useCommentsEvents';
import {useCurrentProject} from './useCurrentProject';

interface UseUnreadCommentsOptions {
  filters?: UnreadCommentsFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Хук для работы с непрочитанными комментариями
 * Возвращает количество непрочитанных комментариев и методы для управления ими
 */
export const useUnreadComments = ({filters = {}, autoRefresh = true, refreshInterval = 30000}: UseUnreadCommentsOptions = {}) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {projectId} = useCurrentProject();

  // Подписываемся на real-time обновления счетчика
  useUnreadCommentsUpdates((newCount) => {
    console.log('📊 Real-time unread count update:', newCount);
    setUnreadCount(newCount);
  });

  // Стабилизируем filters объект
  const stableFilters = {
    projectIds: filters.projectIds || (projectId ? [projectId] : []),
    contextType: filters.contextType
  };

  // Загрузка количества непрочитанных комментариев
  const fetchUnreadCount = useCallback(async () => {
    if (stableFilters.projectIds.length === 0) {
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await CommentsAPI.getUnreadCommentsCount(stableFilters);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error('[useUnreadComments] Error fetching unread count:', err);
      setError(err instanceof Error ? err.message : 'Failed to load unread comments count');
    } finally {
      setLoading(false);
    }
  }, [stableFilters.projectIds.join(','), stableFilters.contextType]);

  // Отметка треда как прочитанного
  const markThreadAsRead = useCallback(
    async (threadId: string) => {
      if (!projectId) {
        console.error('[useUnreadComments] No projectId for markThreadAsRead');
        return;
      }

      try {
        const response = await CommentsAPI.markThreadAsRead(projectId, threadId);

        // Обновляем счетчик на количество фактически прочитанных комментариев
        const readCommentsCount = response.data?.updatedCount || 1;
        setUnreadCount((prev) => Math.max(0, prev - readCommentsCount));
      } catch (err) {
        console.error('[useUnreadComments] Error marking thread as read:', err);
        setError(err instanceof Error ? err.message : 'Failed to mark thread as read');
      }
    },
    [projectId]
  );

  // Массовая отметка тредов как прочитанных
  const markThreadsAsRead = useCallback(
    async (threadIds: string[]) => {
      if (!projectId || threadIds.length === 0) {
        console.error('[useUnreadComments] No projectId or empty threadIds for markThreadsAsRead');
        return;
      }

      try {
        let totalReadCount = 0;

        // Отмечаем каждый тред как прочитанный последовательно
        for (const threadId of threadIds) {
          const response = await CommentsAPI.markThreadAsRead(projectId, threadId);
          totalReadCount += response.data?.updatedCount || 1;
        }

        // Обновляем счетчик на количество фактически прочитанных комментариев
        setUnreadCount((prev) => Math.max(0, prev - totalReadCount));
      } catch (err) {
        console.error('[useUnreadComments] Error marking threads as read:', err);
        setError(err instanceof Error ? err.message : 'Failed to mark threads as read');
      }
    },
    [projectId]
  );

  // Обновление счетчика
  const refresh = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Первоначальная загрузка
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Автообновление
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchUnreadCount, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchUnreadCount]);

  return {
    unreadCount,
    loading,
    error,
    markThreadAsRead,
    markThreadsAsRead,
    refresh
  };
};

/**
 * Хук для получения общего количества непрочитанных комментариев по всем проектам
 */
export const useGlobalUnreadComments = () => {
  return useUnreadComments({
    filters: {}, // Без фильтра по проекту - покажет все непрочитанные комментарии пользователя
    autoRefresh: true,
    refreshInterval: 30000
  });
};

/**
 * Хук для получения количества непрочитанных комментариев по типу контекста
 */
export const useUnreadCommentsByContext = (contextType: ThreadContextType) => {
  return useUnreadComments({
    filters: {contextType},
    autoRefresh: true,
    refreshInterval: 30000
  });
};
