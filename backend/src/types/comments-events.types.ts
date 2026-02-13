import { Comment, Thread, ThreadContextType } from '@prisma/client';

/**
 * Базовый интерфейс для всех событий комментариев
 */
export interface BaseCommentEvent {
  type: string;
  timestamp: number;
  userId: string;
  projectId: string;
}

/**
 * События, связанные с комментариями
 */
export interface CommentCreatedEvent extends BaseCommentEvent {
  type: 'comment:created';
  data: {
    comment: Comment & {
      author: {
        id: string;
        name: string;
        email: string;
      };
    };
    thread: {
      id: string;
      contextType: ThreadContextType;
      contextData: Record<string, any>;
    };
    mentions?: Array<{
      type: 'USER' | 'TEAM';
      targetId: string;
      displayName: string;
    }>;
  };
}

export interface CommentUpdatedEvent extends BaseCommentEvent {
  type: 'comment:updated';
  data: {
    comment: Comment & {
      author: {
        id: string;
        name: string;
        email: string;
      };
    };
    threadId: string;
    previousContent?: string;
  };
}

export interface CommentDeletedEvent extends BaseCommentEvent {
  type: 'comment:deleted';
  data: {
    commentId: string;
    threadId: string;
    authorId: string;
  };
}

export interface ThreadCreatedEvent extends BaseCommentEvent {
  type: 'thread:created';
  data: {
    thread: Thread & {
      creator: {
        id: string;
        name: string;
        email: string;
      };
      comments: Array<Comment & {
        author: {
          id: string;
          name: string;
          email: string;
        };
      }>;
    };
  };
}

export interface ThreadUpdatedEvent extends BaseCommentEvent {
  type: 'thread:updated';
  data: {
    thread: Thread;
    previousData?: Partial<Thread>;
  };
}

export interface ThreadResolvedEvent extends BaseCommentEvent {
  type: 'thread:resolved';
  data: {
    threadId: string;
    resolved: boolean;
    resolvedBy: string;
  };
}

export interface ThreadOpenedEvent extends BaseCommentEvent {
  type: 'thread:opened';
  data: {
    threadId: string;
    openedBy: string;
    contextType: ThreadContextType;
    contextData: Record<string, any>;
  };
}

export interface ThreadDeletedEvent extends BaseCommentEvent {
  type: 'thread:deleted';
  data: {
    threadId: string;
    deletedBy: string;
  };
}

export interface CommentReadEvent extends BaseCommentEvent {
  type: 'comment:read';
  data: {
    commentId?: string; // Если undefined - весь тред помечен как прочитанный
    threadId: string;
    readBy: string;
    readAt: Date;
  };
}

export interface UnreadCountUpdatedEvent extends BaseCommentEvent {
  type: 'unread_count:updated';
  data: {
    userId: string;
    projectId: string;
    unreadCount: number;
    contextType?: ThreadContextType;
  };
}

/**
 * Уведомления о упоминаниях в комментариях
 */
export interface CommentMentionEvent extends BaseCommentEvent {
  type: 'comment:mention';
  data: {
    mentionedUserId: string;
    mentionedTeamId?: string;
    comment: Comment & {
      author: {
        id: string;
        name: string;
        email: string;
      };
    };
    thread: {
      id: string;
      contextType: ThreadContextType;
      contextData: Record<string, any>;
    };
  };
}

/**
 * Объединенный тип всех событий комментариев
 */
export type CommentEvent = 
  | CommentCreatedEvent
  | CommentUpdatedEvent
  | CommentDeletedEvent
  | ThreadCreatedEvent
  | ThreadUpdatedEvent
  | ThreadResolvedEvent
  | ThreadOpenedEvent
  | ThreadDeletedEvent
  | CommentReadEvent
  | UnreadCountUpdatedEvent
  | CommentMentionEvent;

/**
 * Каналы Redis для разных типов событий
 */
export const COMMENT_CHANNELS = {
  PROJECT_COMMENTS: (projectId: string) => `flow:comments_events:project:${projectId}`,
  USER_COMMENTS: (userId: string) => `flow:comments_events:user:${userId}`,
  GLOBAL_COMMENTS: 'flow:comments_events:global',
  UNREAD_NOTIFICATIONS: (userId: string) => `flow:comment_notifications:${userId}`,
} as const;

/**
 * Вспомогательные типы для создания событий
 */
export interface CreateCommentEventPayload {
  comment: Comment & { author: { id: string; name: string; email: string; } };
  thread: { id: string; contextType: ThreadContextType; contextData: Record<string, any>; };
  mentions?: Array<{ type: 'USER' | 'TEAM'; targetId: string; displayName: string; }>;
}

export interface UpdateCommentEventPayload {
  comment: Comment & { author: { id: string; name: string; email: string; } };
  threadId: string;
  previousContent?: string;
}

export interface CreateThreadEventPayload {
  thread: Thread & {
    creator: { id: string; name: string; email: string; };
    comments: Array<Comment & { author: { id: string; name: string; email: string; } }>;
  };
}
