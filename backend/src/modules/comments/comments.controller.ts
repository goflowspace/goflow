import { Request, Response } from 'express';
import { CommentsService } from './comments.service';
import { PrismaClient } from '@prisma/client';
import { CreateThreadDto, CreateCommentDto, UpdateCommentDto, UpdateThreadDto, ThreadFilters, NotificationFilters, MarkCommentsAsReadDto, UnreadCommentsFilters } from './comments.types';

export class CommentsController {
  private commentsService: CommentsService;

  constructor() {
    const prisma = new PrismaClient();
    this.commentsService = new CommentsService(prisma);
  }

  // ========== THREAD ENDPOINTS ==========

  /**
   * POST /api/projects/:projectId/comments/threads
   * Создание нового треда
   */
  createThread = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;
      const data: CreateThreadDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const thread = await this.commentsService.createThread(userId, projectId, data);

      res.status(201).json({
        success: true,
        data: thread,
        message: 'Thread created successfully'
      });
    } catch (error) {
      console.error('Error creating thread:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create thread'
      });
    }
  };

  /**
   * GET /api/projects/:projectId/comments/threads
   * Получение списка тредов с фильтрацией
   */
  getThreads = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const {
        contextType,
        resolved,
        creatorId,
        mentionedUserId,
        mentionedTeamId,
        dateFrom,
        dateTo,
        search,
        page = '1',
        limit = '20'
      } = req.query;

      const filters: ThreadFilters = {
        ...(contextType && { contextType: contextType as any }),
        ...(resolved !== undefined && { resolved: resolved === 'true' }),
        ...(creatorId && { creatorId: creatorId as string }),
        ...(mentionedUserId && { mentionedUserId: mentionedUserId as string }),
        ...(mentionedTeamId && { mentionedTeamId: mentionedTeamId as string }),
        ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
        ...(dateTo && { dateTo: new Date(dateTo as string) }),
        ...(search && { search: search as string }),
      };

      const result = await this.commentsService.getThreads(
        projectId,
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting threads:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get threads'
      });
    }
  };

  /**
   * GET /api/projects/:projectId/comments/threads/:threadId
   * Получение треда по ID со всеми комментариями
   */
  getThread = async (req: Request, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params;
      const userId = req.user?.id; // Получаем ID пользователя для события открытия треда

      const thread = await this.commentsService.getThreadById(threadId, userId);

      res.json({
        success: true,
        data: thread
      });
    } catch (error) {
      console.error('Error getting thread:', error);
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Thread not found'
      });
    }
  };

  /**
   * PATCH /api/projects/:projectId/comments/threads/:threadId
   * Обновление треда (закрытие/открытие, метаданные)
   */
  updateThread = async (req: Request, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params;
      const userId = req.user?.id;
      const data: UpdateThreadDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const thread = await this.commentsService.updateThread(threadId, userId, data);

      res.json({
        success: true,
        data: thread,
        message: 'Thread updated successfully'
      });
    } catch (error) {
      console.error('Error updating thread:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update thread'
      });
    }
  };

  // ========== COMMENT ENDPOINTS ==========

  /**
   * POST /api/projects/:projectId/comments/threads/:threadId/comments
   * Добавление комментария к треду
   */
  addComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params;
      const userId = req.user?.id;
      const data: CreateCommentDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const comment = await this.commentsService.addComment(threadId, userId, data);

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment added successfully'
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add comment'
      });
    }
  };

  /**
   * PATCH /api/projects/:projectId/comments/:commentId
   * Обновление комментария
   */
  updateComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;
      const data: UpdateCommentDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const comment = await this.commentsService.updateComment(commentId, userId, data);

      res.json({
        success: true,
        data: comment,
        message: 'Comment updated successfully'
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update comment'
      });
    }
  };

  /**
   * DELETE /api/projects/:projectId/comments/:commentId
   * Удаление комментария (soft delete)
   */
  deleteComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      await this.commentsService.deleteComment(commentId, userId);

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete comment'
      });
    }
  };

  // ========== NOTIFICATION ENDPOINTS ==========

  /**
   * GET /api/comments/notifications
   * Получение уведомлений пользователя
   */
  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const {
        read,
        type,
        dateFrom,
        dateTo,
        page = '1',
        limit = '20'
      } = req.query;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const filters: NotificationFilters = {
        ...(read !== undefined && { read: read === 'true' }),
        ...(type && { type: type as any }),
        ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
        ...(dateTo && { dateTo: new Date(dateTo as string) }),
      };

      const result = await this.commentsService.getNotifications(
        userId,
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        unreadCount: result.unreadCount
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get notifications'
      });
    }
  };

  /**
   * PATCH /api/comments/notifications/read
   * Отметка уведомлений как прочитанные
   */
  markNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { notificationIds } = req.body; // Опциональный массив ID уведомлений

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const result = await this.commentsService.markNotificationsAsRead(userId, notificationIds);

      res.json({
        success: true,
        data: { updatedCount: result.count },
        message: 'Notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark notifications as read'
      });
    }
  };

  // ========== READ STATUS ENDPOINTS ==========

  /**
   * POST /api/projects/:projectId/comments/threads/:threadId/read
   * Отметка треда как прочитанного
   */
  markThreadAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const readStatus = await this.commentsService.markThreadAsRead(userId, threadId);

      res.json({
        success: true,
        data: readStatus,
        message: 'Thread marked as read'
      });
    } catch (error) {
      console.error('Error marking thread as read:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark thread as read'
      });
    }
  };

  /**
   * POST /api/projects/:projectId/comments/:commentId/read
   * Отметка комментария как прочитанного
   */
  markCommentAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const readStatus = await this.commentsService.markCommentAsRead(userId, commentId);

      res.json({
        success: true,
        data: readStatus,
        message: 'Comment marked as read'
      });
    } catch (error) {
      console.error('Error marking comment as read:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark comment as read'
      });
    }
  };

  /**
   * POST /api/projects/:projectId/comments/read
   * Массовая отметка комментариев как прочитанных
   */
  markCommentsAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { commentIds }: MarkCommentsAsReadDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const result = await this.commentsService.markCommentsAsRead(userId, commentIds);

      res.json({
        success: true,
        data: result,
        message: 'Comments marked as read'
      });
    } catch (error) {
      console.error('Error marking comments as read:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark comments as read'
      });
    }
  };

  /**
   * GET /api/comments/unread-count
   * Получение количества непрочитанных комментариев для пользователя
   */
  getUnreadCommentsCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { projectIds, contextType } = req.query;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const filters: UnreadCommentsFilters = {
        ...(projectIds && { projectIds: typeof projectIds === 'string' ? [projectIds] : projectIds as string[] }),
        ...(contextType && { contextType: contextType as any }),
      };

      const unreadCount = await this.commentsService.getUnreadCommentsCount(userId, filters);

      res.json({
        success: true,
        data: { unreadCount },
        message: 'Unread comments count retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting unread comments count:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get unread comments count'
      });
    }
  };

  /**
   * GET /api/projects/:projectId/comments/threads/with-read-status
   * Получение тредов с информацией о статусе прочтения
   */
  getThreadsWithReadStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;
      const {
        contextType,
        resolved,
        creatorId,
        mentionedUserId,
        mentionedTeamId,
        dateFrom,
        dateTo,
        search,
        page = '1',
        limit = '20'
      } = req.query;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const filters: ThreadFilters = {
        ...(contextType && { contextType: contextType as any }),
        ...(resolved !== undefined && { resolved: resolved === 'true' }),
        ...(creatorId && { creatorId: creatorId as string }),
        ...(mentionedUserId && { mentionedUserId: mentionedUserId as string }),
        ...(mentionedTeamId && { mentionedTeamId: mentionedTeamId as string }),
        ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
        ...(dateTo && { dateTo: new Date(dateTo as string) }),
        ...(search && { search: search as string }),
      };

      const result = await this.commentsService.getThreadsWithReadStatus(
        userId,
        projectId,
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting threads with read status:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get threads with read status'
      });
    }
  };
}
