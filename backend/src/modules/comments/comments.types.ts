import { ThreadContextType, MentionType, NotificationType } from '@prisma/client';

// DTO для создания нового треда
export interface CreateThreadDto {
  contextType: ThreadContextType;
  contextData: Record<string, any>;
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

// Параметры пагинации
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Ответы API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface NotificationsResponse extends PaginatedResponse<any[]> {
  unreadCount: number;
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
export interface CommentReadStatusResponse extends ApiResponse<{ updatedCount: number }> {}

// Расширенный интерфейс треда с информацией о прочтении
export interface ThreadWithReadStatus {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  creatorId: string;
  contextType: ThreadContextType;
  contextData: Record<string, any>;
  metadata: Record<string, any>;
  unreadCommentsCount: number; // Количество непрочитанных комментариев в треде
  hasUnreadComments: boolean; // Есть ли непрочитанные комментарии
  lastActivity?: Date; // Дата последней активности
}

// Расширенный интерфейс комментария с информацией о прочтении
export interface CommentWithReadStatus {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
  isRead?: boolean; // Прочитан ли комментарий текущим пользователем
  readAt?: Date; // Когда был прочитан
}

// Фильтры для статистики непрочитанных комментариев
export interface UnreadCommentsFilters {
  projectIds?: string[]; // Фильтр по проектам
  contextType?: ThreadContextType; // Фильтр по типу контекста
}
