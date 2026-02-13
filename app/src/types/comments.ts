// =============================================================
// ТИПЫ ДЛЯ СИСТЕМЫ КОММЕНТАРИЕВ
// Архитектура основана на Liveblocks threads
// =============================================================
import {User} from './user';

// Типы контекста для тредов
export type ThreadContextType =
  | 'CANVAS_POSITION' // Комментарий на пустом месте канваса
  | 'NODE' // Комментарий привязан к узлу
  | 'ENTITY' // Комментарий к сущности (для будущего)
  | 'BIBLE_SECTION' // Комментарий к разделу библии (для будущего)
  | 'GENERAL'; // Общий комментарий к проекту

// Типы упоминаний
export type MentionType = 'USER' | 'TEAM';

// Типы уведомлений
export type NotificationType =
  | 'NEW_COMMENT' // Новый комментарий в треде
  | 'COMMENT_MENTION' // Упоминание в комментарии
  | 'THREAD_MENTION' // Упоминание в треде
  | 'THREAD_RESOLVED' // Тред закрыт
  | 'THREAD_REOPENED'; // Тред переоткрыт

// Данные контекста для различных типов тредов
export interface CanvasPositionContext {
  x: number;
  y: number;
  zoom?: number; // Уровень масштабирования при создании
}

export interface NodeContext {
  nodeId: string;
  nodeType?: string;
  nodeTitle?: string;
}

export interface EntityContext {
  entityId: string;
  entityType?: string;
  entityName?: string;
}

export interface BibleSectionContext {
  sectionId: string;
  sectionType?: string;
  sectionName?: string;
}

// Union type для всех типов контекста
export type ThreadContextData = CanvasPositionContext | NodeContext | EntityContext | BibleSectionContext | Record<string, unknown>;

// Основные интерфейсы
export interface Thread {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  creatorId: string;
  contextType: ThreadContextType;
  contextData: ThreadContextData;
  metadata: Record<string, any>;

  // Связанные данные
  creator?: User;
  comments?: Comment[];
  mentions?: ThreadMention[];
  commentsCount?: number;
  unreadCount?: number;
  lastActivity?: Date;
}

export interface Comment {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  deletedAt?: Date;

  // Связанные данные
  author?: User;
  mentions?: CommentMention[];
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface ThreadMention {
  id: string;
  threadId: string;
  type: MentionType;
  targetId: string;
  createdAt: Date;
}

export interface CommentMention {
  id: string;
  commentId: string;
  type: MentionType;
  targetId: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  threadId?: string;
  commentId?: string;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;

  // Связанные данные
  thread?: Thread;
}

// DTO для создания нового треда
export interface CreateThreadDto {
  contextType: ThreadContextType;
  contextData: ThreadContextData;
  firstComment: {
    content: string;
    mentions?: Array<{
      type: MentionType;
      targetId: string;
    }>;
  };
  metadata?: Record<string, any>;
}

// DTO для создания комментария
export interface CreateCommentDto {
  content: string;
  mentions?: Array<{
    type: MentionType;
    targetId: string;
  }>;
}

// DTO для обновления комментария
export interface UpdateCommentDto {
  content: string;
  mentions?: Array<{
    type: MentionType;
    targetId: string;
  }>;
}

// DTO для обновления треда
export interface UpdateThreadDto {
  resolved?: boolean;
  metadata?: Record<string, any>;
}

// Ответы API
export interface ThreadResponse {
  success: boolean;
  data: Thread;
  message?: string;
}

export interface ThreadsResponse {
  success: boolean;
  data: Thread[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CommentResponse {
  success: boolean;
  data: Comment;
  message?: string;
}

export interface CommentsResponse {
  success: boolean;
  data: Comment[];
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount?: number;
}

// Фильтры для получения тредов
export interface ThreadFilters {
  contextType?: ThreadContextType;
  resolved?: boolean;
  creatorId?: string;
  mentionedUserId?: string;
  mentionedTeamId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Фильтры для получения уведомлений
export interface NotificationFilters {
  read?: boolean;
  type?: NotificationType;
  dateFrom?: Date;
  dateTo?: Date;
}

// Статистика комментариев для дашборда
export interface CommentStats {
  totalThreads: number;
  unresolvedThreads: number;
  commentsThisWeek: number;
  mentionsCount: number;
}

// События WebSocket для real-time обновлений
export interface CommentWebSocketEvents {
  'thread:created': Thread;
  'thread:updated': Thread;
  'thread:resolved': {threadId: string; resolved: boolean; userId: string};
  'comment:created': Comment;
  'comment:updated': Comment;
  'comment:deleted': {commentId: string; threadId: string; userId: string};
  'notification:created': Notification;
  'user:typing': {threadId: string; userId: string; userName: string};
}

// Хуки для UI состояния (будут использоваться во frontend)
export interface CommentUIState {
  selectedThreadId?: string;
  isCreatingComment: boolean;
  isCreatingThread: boolean;
  showResolved: boolean;
  filter: ThreadFilters;
  sortBy: 'createdAt' | 'updatedAt' | 'commentsCount';
  sortOrder: 'asc' | 'desc';
}

// DTO для отметки треда как прочитанного (все комментарии в нем)
export interface MarkThreadAsReadDto {
  threadId: string;
}

// DTO для отметки конкретного комментария как прочитанного
export interface MarkCommentAsReadDto {
  commentId: string;
}

// DTO для массовой отметки комментариев как прочитанных
export interface MarkCommentsAsReadDto {
  commentIds: string[];
}

// Ответ для статуса прочтения
export interface CommentReadStatusResponse {
  success: boolean;
  data: {updatedCount: number};
  message?: string;
}

// Расширенный интерфейс треда с информацией о прочтении
export interface ThreadWithReadStatus extends Thread {
  unreadCommentsCount: number; // Количество непрочитанных комментариев в треде
  hasUnreadComments: boolean; // Есть ли непрочитанные комментарии
}

// Расширенный интерфейс комментария с информацией о прочтении
export interface CommentWithReadStatus extends Comment {
  isRead?: boolean; // Прочитан ли комментарий текущим пользователем
  readAt?: Date; // Когда был прочитан
}

// Фильтры для статистики непрочитанных комментариев
export interface UnreadCommentsFilters {
  projectIds?: string[]; // Фильтр по проектам
  contextType?: ThreadContextType; // Фильтр по типу контекста
}

// Ответ с количеством непрочитанных комментариев
export interface UnreadCommentsCountResponse {
  success: boolean;
  data: {unreadCount: number};
  message?: string;
}
