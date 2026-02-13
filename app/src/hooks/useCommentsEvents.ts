import {useCallback, useEffect, useRef} from 'react';

import {useWebSocket} from '../contexts/WebSocketContext';
import useUserStore from '../store/useUserStore';
import {useCurrentProject} from './useCurrentProject';

/**
 * События комментариев, поступающие через WebSocket
 */
export interface CommentEvent {
  type:
    | 'comment:created'
    | 'comment:updated'
    | 'comment:deleted'
    | 'thread:created'
    | 'thread:updated'
    | 'thread:resolved'
    | 'thread:opened'
    | 'thread:deleted'
    | 'comment:read'
    | 'unread_count:updated'
    | 'comment:mention';
  timestamp: number;
  userId: string;
  projectId: string;
  data: any;
}

export interface CommentEventCallbacks {
  onCommentCreated?: (event: CommentEvent) => void;
  onCommentUpdated?: (event: CommentEvent) => void;
  onCommentDeleted?: (event: CommentEvent) => void;
  onThreadCreated?: (event: CommentEvent) => void;
  onThreadUpdated?: (event: CommentEvent) => void;
  onThreadResolved?: (event: CommentEvent) => void;
  onThreadOpened?: (event: CommentEvent) => void;
  onThreadDeleted?: (event: CommentEvent) => void;
  onCommentRead?: (event: CommentEvent) => void;
  onUnreadCountUpdated?: (event: CommentEvent) => void;
  onCommentMention?: (event: CommentEvent) => void;
}

interface UseCommentsEventsOptions {
  callbacks?: CommentEventCallbacks;
  enabled?: boolean;
}

/**
 * Хук для подписки на события комментариев через WebSocket
 */
export const useCommentsEvents = ({callbacks = {}, enabled = true}: UseCommentsEventsOptions = {}) => {
  const {socket, isConnected} = useWebSocket();
  const {projectId} = useCurrentProject();
  const {user} = useUserStore();

  // Храним callbacks в ref, чтобы избежать пересоздания подписок
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  /**
   * Обработчик событий комментариев
   */
  const handleCommentEvent = useCallback(
    (event: CommentEvent) => {
      try {
        // Игнорируем события из других проектов
        if (projectId && event.projectId !== projectId) {
          return;
        }

        // Выполняем соответствующий callback
        const {
          onCommentCreated,
          onCommentUpdated,
          onCommentDeleted,
          onThreadCreated,
          onThreadUpdated,
          onThreadResolved,
          onThreadOpened,
          onThreadDeleted,
          onCommentRead,
          onUnreadCountUpdated,
          onCommentMention
        } = callbacksRef.current;

        switch (event.type) {
          case 'comment:created':
            onCommentCreated?.(event);
            break;
          case 'comment:updated':
            onCommentUpdated?.(event);
            break;
          case 'comment:deleted':
            onCommentDeleted?.(event);
            break;
          case 'thread:created':
            onThreadCreated?.(event);
            break;
          case 'thread:updated':
            onThreadUpdated?.(event);
            break;
          case 'thread:resolved':
            onThreadResolved?.(event);
            break;
          case 'thread:opened':
            onThreadOpened?.(event);
            break;
          case 'thread:deleted':
            onThreadDeleted?.(event);
            break;
          case 'comment:read':
            onCommentRead?.(event);
            break;
          case 'unread_count:updated':
            onUnreadCountUpdated?.(event);
            break;
          case 'comment:mention':
            onCommentMention?.(event);
            break;
          default:
            console.warn('Unknown comment event type:', event.type);
        }
      } catch (error) {
        console.error('Error handling comment event:', error);
      }
    },
    [projectId]
  );

  /**
   * Подписка на события комментариев проекта
   */
  useEffect(() => {
    if (!enabled || !socket || !isConnected || !projectId) {
      return;
    }

    console.log('📡 Subscribing to project comment events:', projectId);

    // Подписываемся на события комментариев проекта
    const projectChannel = `flow:comments_events:project:${projectId}`;
    socket.on(projectChannel, handleCommentEvent);

    // Cleanup
    return () => {
      socket.off(projectChannel, handleCommentEvent);
      console.log('📡 Unsubscribed from project comment events:', projectId);
    };
  }, [enabled, socket, isConnected, projectId, handleCommentEvent]);

  /**
   * Подписка на персональные уведомления о комментариях
   */
  useEffect(() => {
    if (!enabled || !socket || !isConnected || !user?.id) {
      return;
    }

    console.log('🔔 Subscribing to personal comment notifications:', user.id);

    // Подписываемся на персональные уведомления
    const userChannel = `flow:comment_notifications:${user.id}`;
    const userCommentsChannel = `flow:comments_events:user:${user.id}`;

    socket.on(userChannel, handleCommentEvent);
    socket.on(userCommentsChannel, handleCommentEvent);

    // Cleanup
    return () => {
      socket.off(userChannel, handleCommentEvent);
      socket.off(userCommentsChannel, handleCommentEvent);
      console.log('🔔 Unsubscribed from personal comment notifications:', user.id);
    };
  }, [enabled, socket, isConnected, user?.id, handleCommentEvent]);

  return {
    isConnected,
    projectId
  };
};

/**
 * Хук для подписки только на изменения счетчика непрочитанных комментариев
 */
export const useUnreadCommentsUpdates = (onUpdate?: (count: number) => void) => {
  return useCommentsEvents({
    callbacks: {
      onUnreadCountUpdated: (event) => {
        if (event.data?.unreadCount !== undefined) {
          onUpdate?.(event.data.unreadCount);
        }
      },
      onCommentCreated: () => {
        // При создании нового комментария обновляем счетчик
        // Точное значение придет через onUnreadCountUpdated
      },
      onCommentMention: () => {
        // При упоминании также обновляем счетчик
      }
    }
  });
};

/**
 * Хук для подписки на события комментариев с автообновлением UI
 */
export const useCommentsRealtimeUpdates = (onThreadsUpdate?: () => void, onUnreadCountUpdate?: (count: number) => void) => {
  return useCommentsEvents({
    callbacks: {
      onCommentCreated: () => {
        console.log('💬 New comment created, refreshing threads');
        onThreadsUpdate?.();
      },
      onCommentUpdated: () => {
        console.log('✏️ Comment updated, refreshing threads');
        onThreadsUpdate?.();
      },
      onCommentDeleted: () => {
        console.log('🗑️ Comment deleted, refreshing threads');
        onThreadsUpdate?.();
      },
      onThreadCreated: () => {
        console.log('📝 New thread created, refreshing threads');
        onThreadsUpdate?.();
      },
      onThreadUpdated: () => {
        console.log('📝 Thread updated, refreshing threads');
        onThreadsUpdate?.();
      },
      onThreadResolved: () => {
        console.log('✅ Thread resolved status changed, refreshing threads');
        onThreadsUpdate?.();
      },
      onThreadOpened: (event) => {
        console.log('👁️ Thread opened by:', event.data?.openedBy);
        // Можно добавить индикатор того, что кто-то просматривает тред
      },
      onThreadDeleted: () => {
        console.log('🗑️ Thread deleted, refreshing threads');
        onThreadsUpdate?.();
      },
      onCommentRead: () => {
        console.log('👁️ Comment read status changed, refreshing threads');
        onThreadsUpdate?.();
      },
      onUnreadCountUpdated: (event) => {
        if (event.data?.unreadCount !== undefined) {
          console.log('🔢 Unread count updated:', event.data.unreadCount);
          onUnreadCountUpdate?.(event.data.unreadCount);
        }
      },
      onCommentMention: (event) => {
        console.log('🔔 Comment mention received');
        // Можно добавить toast уведомление или другую реакцию на упоминание
      }
    }
  });
};
