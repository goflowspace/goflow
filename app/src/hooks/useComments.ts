import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {CommentsAPI} from '@services/comments.api';

import useUserStore from '@store/useUserStore';

import {Comment, CreateCommentDto, CreateThreadDto, Thread, ThreadContextData, ThreadContextType, ThreadFilters, ThreadWithReadStatus, UpdateCommentDto} from '../types/comments';
import {useCommentsRealtimeUpdates} from './useCommentsEvents';

interface UseCommentsOptions {
  projectId: string;
  filters?: ThreadFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useComments = ({projectId, filters = {}, autoRefresh = false, refreshInterval = 30000}: UseCommentsOptions) => {
  const [threads, setThreads] = useState<ThreadWithReadStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const {user} = useUserStore();

  // Подписываемся на real-time обновления комментариев
  useCommentsRealtimeUpdates(() => {
    console.log('🔄 Refreshing threads due to real-time event');
    refresh(); // Обновляем список тредов при изменениях
  });

  // Стабилизируем filters объект
  const stableFilters = useMemo(
    () => filters,
    [filters.contextType, filters.resolved, filters.creatorId, filters.mentionedUserId, filters.mentionedTeamId, filters.dateFrom?.toISOString(), filters.dateTo?.toISOString(), filters.search]
  );

  // Загрузка тредов - убираем page из зависимостей
  const fetchThreads = useCallback(
    async (resetPage = false) => {
      if (!projectId) return;

      setLoading(true);
      setError(null);

      try {
        const currentPage = resetPage ? 1 : page;
        const response = await CommentsAPI.getThreadsWithReadStatus(projectId, stableFilters, currentPage, 20);

        if (resetPage) {
          setThreads(response.data);
          setPage(1);
        } else {
          setThreads((prev) => [...prev, ...response.data]);
        }

        setHasMore(response.pagination ? response.pagination.page < response.pagination.pages : false);
        if (!resetPage) {
          setPage((prev) => prev + 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comments');
      } finally {
        setLoading(false);
      }
    },
    [projectId, stableFilters] // убрали page из зависимостей
  );

  // Создание нового треда
  const createThread = useCallback(
    async (contextType: ThreadContextType, contextData: ThreadContextData, firstCommentContent: string, mentions?: Array<{type: 'USER' | 'TEAM'; targetId: string}>) => {
      if (!projectId) {
        console.error('[useComments] No projectId for createThread');
        return;
      }

      try {
        const threadData: CreateThreadDto = {
          contextType,
          contextData,
          firstComment: {
            content: firstCommentContent,
            mentions
          }
        };

        const newThread = await CommentsAPI.createThread(projectId, threadData);

        // Добавляем новый тред в начало списка (приводим к ThreadWithReadStatus)
        const threadWithReadStatus: ThreadWithReadStatus = {
          ...newThread,
          unreadCommentsCount: 0, // новый тред создается текущим пользователем, поэтому для него он прочитан
          hasUnreadComments: false
        };
        setThreads((prev) => [threadWithReadStatus, ...prev]);

        return newThread;
      } catch (err) {
        console.error('[useComments] Error creating thread:', err);
        setError(err instanceof Error ? err.message : 'Failed to create thread');
        throw err;
      }
    },
    [projectId]
  );

  // Добавление комментария к треду
  const addComment = useCallback(
    async (threadId: string, content: string, mentions?: Array<{type: 'USER' | 'TEAM'; targetId: string}>) => {
      if (!projectId) return;

      try {
        const commentData: CreateCommentDto = {
          content,
          mentions
        };

        const newComment = await CommentsAPI.addComment(projectId, threadId, commentData);

        // Обновляем тред с новым комментарием
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  comments: [...(thread.comments || []), newComment],
                  updatedAt: new Date()
                }
              : thread
          )
        );

        return newComment;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add comment');
        throw err;
      }
    },
    [projectId]
  );

  // Обновление комментария
  const updateComment = useCallback(
    async (commentId: string, content: string, mentions?: Array<{type: 'USER' | 'TEAM'; targetId: string}>) => {
      if (!projectId) return;

      try {
        const updateData: UpdateCommentDto = {
          content,
          mentions
        };

        const updatedComment = await CommentsAPI.updateComment(projectId, commentId, updateData);

        // Обновляем комментарий в соответствующем треде
        setThreads((prev) =>
          prev.map((thread) => ({
            ...thread,
            comments: thread.comments?.map((comment) => (comment.id === commentId ? updatedComment : comment))
          }))
        );

        return updatedComment;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update comment');
        throw err;
      }
    },
    [projectId]
  );

  // Удаление комментария
  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!projectId) return;

      try {
        await CommentsAPI.deleteComment(projectId, commentId);

        // Помечаем комментарий как удаленный
        setThreads((prev) =>
          prev.map((thread) => ({
            ...thread,
            comments: thread.comments?.map((comment) => (comment.id === commentId ? {...comment, isDeleted: true, deletedAt: new Date()} : comment))
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete comment');
        throw err;
      }
    },
    [projectId]
  );

  // Закрытие/открытие треда
  const toggleThreadResolved = useCallback(
    async (threadId: string, resolved: boolean) => {
      if (!projectId) return;

      try {
        const updatedThread = await CommentsAPI.updateThread(projectId, threadId, {resolved});

        // Обновляем статус треда (приводим к ThreadWithReadStatus)
        const threadWithReadStatus: ThreadWithReadStatus = {
          ...updatedThread,
          unreadCommentsCount: 0, // предполагаем, что обновленный тред не имеет непрочитанных для текущего пользователя
          hasUnreadComments: false
        };
        setThreads((prev) => prev.map((thread) => (thread.id === threadId ? threadWithReadStatus : thread)));

        return updatedThread;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update thread status');
        throw err;
      }
    },
    [projectId]
  );

  // Загрузка дополнительных тредов (пагинация)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchThreads(false);
    }
  }, [loading, hasMore]); // убрали fetchThreads из зависимостей для избежания пересоздания

  // Обновление списка тредов
  const refresh = useCallback(() => {
    setPage(1);
    fetchThreads(true);
  }, []); // убрали fetchThreads из зависимостей

  // Получение треда по ID
  const getThread = useCallback(
    async (threadId: string, markAsRead: boolean = true) => {
      if (!projectId) return null;

      try {
        const thread = await CommentsAPI.getThread(projectId, threadId);

        // Если нужно отметить тред как прочитанный
        if (markAsRead) {
          try {
            await CommentsAPI.markThreadAsRead(projectId, threadId);
          } catch (markReadError) {
            console.warn('[useComments] Failed to mark thread as read:', markReadError);
            // Не прерываем выполнение, просто логируем предупреждение
          }
        }

        // Обновляем тред в локальном состоянии
        setThreads((prev) => prev.map((t) => (t.id === threadId ? {...thread, unreadCommentsCount: 0, hasUnreadComments: false} : t)));

        return thread;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load thread');
        return null;
      }
    },
    [projectId]
  );

  // Проверка, может ли пользователь редактировать комментарий
  const canEditComment = useCallback(
    (comment: Comment) => {
      return Boolean(user && comment.authorId === user.id);
    },
    [user]
  );

  // Первоначальная загрузка
  useEffect(() => {
    if (projectId) {
      fetchThreads(true);
    }
  }, [projectId, stableFilters, fetchThreads]);

  // Автообновление без циклических зависимостей
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Очищаем предыдущий интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!autoRefresh || !projectId) return;

    // Создаем новый интервал
    intervalRef.current = setInterval(async () => {
      try {
        setError(null);
        const response = await CommentsAPI.getThreadsWithReadStatus(projectId, stableFilters, 1, 20);
        setThreads(response.data || []);
        setHasMore(response.pagination ? response.pagination.page < response.pagination.pages : false);
        setPage(1);
      } catch (err) {
        console.error('Auto-refresh failed:', err);
      }
    }, refreshInterval) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, projectId, stableFilters]);

  return {
    threads,
    loading,
    error,
    hasMore,
    createThread,
    addComment,
    updateComment,
    deleteComment,
    toggleThreadResolved,
    loadMore,
    refresh,
    getThread,
    canEditComment,
    // Новый метод для отметки треда как прочитанного
    markThreadAsRead: useCallback(
      async (threadId: string) => {
        if (!projectId) return;

        try {
          await CommentsAPI.markThreadAsRead(projectId, threadId);

          // Обновляем локальное состояние - помечаем все комментарии в треде как прочитанные
          setThreads((prev) => prev.map((thread) => (thread.id === threadId ? {...thread, unreadCommentsCount: 0, hasUnreadComments: false} : thread)));
        } catch (err) {
          console.error('[useComments] Error marking thread as read:', err);
        }
      },
      [projectId]
    )
  };
};

// Хук для работы с одним тредом
export const useThread = (projectId: string, threadId: string, markAsRead: boolean = true) => {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    if (!projectId || !threadId) return;

    setLoading(true);
    setError(null);

    try {
      const threadData = await CommentsAPI.getThread(projectId, threadId);
      setThread(threadData);

      // Автоматически отмечаем тред как прочитанный при загрузке
      if (markAsRead) {
        try {
          await CommentsAPI.markThreadAsRead(projectId, threadId);
        } catch (markReadError) {
          console.warn('[useThread] Failed to mark thread as read:', markReadError);
          // Не прерываем выполнение, просто логируем предупреждение
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  }, [projectId, threadId, markAsRead]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  return {
    thread,
    loading,
    error,
    refresh: fetchThread,
    // Новый метод для явной отметки треда как прочитанного
    markAsRead: useCallback(async () => {
      if (!projectId || !threadId) return;

      try {
        await CommentsAPI.markThreadAsRead(projectId, threadId);
      } catch (err) {
        console.error('[useThread] Error marking thread as read:', err);
      }
    }, [projectId, threadId])
  };
};
