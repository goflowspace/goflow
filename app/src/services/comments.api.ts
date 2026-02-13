import {
  Comment,
  CommentReadStatusResponse,
  CommentResponse,
  CreateCommentDto,
  CreateThreadDto,
  MarkCommentAsReadDto,
  MarkCommentsAsReadDto,
  MarkThreadAsReadDto,
  Notification,
  NotificationFilters,
  NotificationsResponse,
  Thread,
  ThreadFilters,
  ThreadResponse,
  ThreadWithReadStatus,
  ThreadsResponse,
  UnreadCommentsCountResponse,
  UnreadCommentsFilters,
  UpdateCommentDto,
  UpdateThreadDto
} from '../types/comments';
import {getApiUrl} from '../utils/environment';
import {api} from './api';

// Базовый URL для API комментариев
const COMMENTS_BASE_URL = getApiUrl();

/**
 * API сервис для работы с комментариями
 */
export class CommentsAPI {
  // ========== THREAD METHODS ==========

  /**
   * Создание нового треда
   */
  static async createThread(projectId: string, data: CreateThreadDto): Promise<Thread> {
    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/threads`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.status} ${response.statusText}`);
    }

    const result: ThreadResponse = await response.json();
    return result.data;
  }

  /**
   * Получение списка тредов с фильтрацией
   */
  static async getThreads(projectId: string, filters: ThreadFilters = {}, page: number = 1, limit: number = 20): Promise<ThreadsResponse> {
    const params = new URLSearchParams();

    // Добавляем фильтры в query параметры
    if (filters.contextType) params.append('contextType', filters.contextType);
    if (filters.resolved !== undefined) params.append('resolved', filters.resolved.toString());
    if (filters.creatorId) params.append('creatorId', filters.creatorId);
    if (filters.mentionedUserId) params.append('mentionedUserId', filters.mentionedUserId);
    if (filters.mentionedTeamId) params.append('mentionedTeamId', filters.mentionedTeamId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
    if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());
    if (filters.search) params.append('search', filters.search);

    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/threads?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to get threads: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Получение треда по ID со всеми комментариями
   */
  static async getThread(projectId: string, threadId: string): Promise<Thread> {
    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/threads/${threadId}`);

    if (!response.ok) {
      throw new Error(`Failed to get thread: ${response.status} ${response.statusText}`);
    }

    const result: ThreadResponse = await response.json();
    return result.data;
  }

  /**
   * Обновление треда (закрытие/открытие, метаданные)
   */
  static async updateThread(projectId: string, threadId: string, data: UpdateThreadDto): Promise<Thread> {
    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/threads/${threadId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update thread: ${response.status} ${response.statusText}`);
    }

    const result: ThreadResponse = await response.json();
    return result.data;
  }

  /**
   * Закрытие треда
   */
  static async resolveThread(projectId: string, threadId: string): Promise<Thread> {
    return this.updateThread(projectId, threadId, {resolved: true});
  }

  /**
   * Открытие треда
   */
  static async reopenThread(projectId: string, threadId: string): Promise<Thread> {
    return this.updateThread(projectId, threadId, {resolved: false});
  }

  // ========== COMMENT METHODS ==========

  /**
   * Добавление комментария к треду
   */
  static async addComment(projectId: string, threadId: string, data: CreateCommentDto): Promise<Comment> {
    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/threads/${threadId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.status} ${response.statusText}`);
    }

    const result: CommentResponse = await response.json();
    return result.data;
  }

  /**
   * Обновление комментария
   */
  static async updateComment(projectId: string, commentId: string, data: UpdateCommentDto): Promise<Comment> {
    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update comment: ${response.status} ${response.statusText}`);
    }

    const result: CommentResponse = await response.json();
    return result.data;
  }

  /**
   * Удаление комментария
   */
  static async deleteComment(projectId: string, commentId: string): Promise<void> {
    await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/${commentId}`, {
      method: 'DELETE'
    });
  }

  // ========== NOTIFICATION METHODS ==========

  /**
   * Получение уведомлений пользователя
   */
  static async getNotifications(filters: NotificationFilters = {}, page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
    const params = new URLSearchParams();

    if (filters.read !== undefined) params.append('read', filters.read.toString());
    if (filters.type) params.append('type', filters.type);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
    if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());

    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/comments/notifications?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to get notifications: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Получение непрочитанных уведомлений
   */
  static async getUnreadNotifications(): Promise<NotificationsResponse> {
    return this.getNotifications({read: false}, 1, 50);
  }

  /**
   * Отметка уведомлений как прочитанные
   */
  static async markNotificationsAsRead(notificationIds?: string[]): Promise<{updatedCount: number}> {
    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/comments/notifications/read`, {
      method: 'PATCH',
      body: JSON.stringify({notificationIds})
    });

    if (!response.ok) {
      throw new Error(`Failed to mark notifications as read: ${response.status} ${response.statusText}`);
    }

    const result: {success: boolean; data: {updatedCount: number}} = await response.json();
    return result.data;
  }

  /**
   * Отметка всех уведомлений как прочитанные
   */
  static async markAllNotificationsAsRead(): Promise<{updatedCount: number}> {
    return this.markNotificationsAsRead();
  }

  // ========== UTILITY METHODS ==========

  /**
   * Поиск тредов по тексту
   */
  static async searchThreads(projectId: string, searchText: string, filters: Partial<ThreadFilters> = {}): Promise<ThreadsResponse> {
    return this.getThreads(projectId, {...filters, search: searchText});
  }

  /**
   * Получение тредов с упоминанием пользователя
   */
  static async getThreadsWithUserMentions(projectId: string, userId: string): Promise<ThreadsResponse> {
    return this.getThreads(projectId, {mentionedUserId: userId});
  }

  /**
   * Получение тредов с упоминанием команды
   */
  static async getThreadsWithTeamMentions(projectId: string, teamId: string): Promise<ThreadsResponse> {
    return this.getThreads(projectId, {mentionedTeamId: teamId});
  }

  /**
   * Получение активных (неразрешенных) тредов
   */
  static async getActiveThreads(projectId: string): Promise<ThreadsResponse> {
    return this.getThreads(projectId, {resolved: false});
  }

  /**
   * Получение тредов по типу контекста
   */
  static async getThreadsByContext(projectId: string, contextType: ThreadFilters['contextType']): Promise<ThreadsResponse> {
    return this.getThreads(projectId, {contextType});
  }

  // ========== READ STATUS METHODS ==========

  /**
   * Отметка треда как прочитанного (все комментарии в нем)
   */
  static async markThreadAsRead(projectId: string, threadId: string): Promise<CommentReadStatusResponse> {
    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/threads/${threadId}/read`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to mark thread as read: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Отметка конкретного комментария как прочитанного
   */
  static async markCommentAsRead(projectId: string, commentId: string): Promise<CommentReadStatusResponse> {
    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/${commentId}/read`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to mark comment as read: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Массовая отметка комментариев как прочитанных
   */
  static async markCommentsAsRead(projectId: string, commentIds: string[]): Promise<CommentReadStatusResponse> {
    const data: MarkCommentsAsReadDto = {commentIds};

    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/read`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to mark comments as read: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Получение количества непрочитанных комментариев
   */
  static async getUnreadCommentsCount(filters: UnreadCommentsFilters = {}): Promise<UnreadCommentsCountResponse> {
    const params = new URLSearchParams();

    if (filters.projectIds && filters.projectIds.length > 0) {
      filters.projectIds.forEach((projectId) => params.append('projectIds', projectId));
    }
    if (filters.contextType) params.append('contextType', filters.contextType);

    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/comments/unread-count?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to get unread comments count: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Получение тредов с информацией о статусе прочтения
   */
  static async getThreadsWithReadStatus(projectId: string, filters: ThreadFilters = {}, page: number = 1, limit: number = 20): Promise<{data: ThreadWithReadStatus[]; pagination: any}> {
    const params = new URLSearchParams();

    // Добавляем фильтры в query параметры
    if (filters.contextType) params.append('contextType', filters.contextType);
    if (filters.resolved !== undefined) params.append('resolved', filters.resolved.toString());
    if (filters.creatorId) params.append('creatorId', filters.creatorId);
    if (filters.mentionedUserId) params.append('mentionedUserId', filters.mentionedUserId);
    if (filters.mentionedTeamId) params.append('mentionedTeamId', filters.mentionedTeamId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
    if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());
    if (filters.search) params.append('search', filters.search);

    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.fetchWithAuth(`${COMMENTS_BASE_URL}/projects/${projectId}/comments/threads/with-read-status?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to get threads with read status: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      data: result.data,
      pagination: result.pagination
    };
  }
}

export default CommentsAPI;
