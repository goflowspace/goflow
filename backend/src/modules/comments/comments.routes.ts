import { Router } from 'express';
import { CommentsController } from './comments.controller';
import { 
  CreateThreadSchema,
  CreateCommentSchema,
  UpdateCommentSchema,
  UpdateThreadSchema,
  ThreadFiltersSchema,
  NotificationFiltersSchema,
  MarkNotificationsAsReadSchema,
  ProjectIdParamSchema,
  ThreadIdParamSchema,
  CommentIdParamSchema,
  validateContextData
} from './comments.validation';
import { z } from 'zod';
import { authenticateJWT } from '@middlewares/auth.middleware';

// Middleware для валидации данных
const validateBody = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid request data'
        });
      }
    }
  };
};

const validateParams = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: error.errors
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid request parameters'
        });
      }
    }
  };
};

const validateQuery = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters'
        });
      }
    }
  };
};

// Middleware для валидации контекстных данных
const validateThreadContext = (req: any, res: any, next: any) => {
  try {
    const { contextType, contextData } = req.body;
    if (contextType && contextData) {
      req.body.contextData = validateContextData(contextType, contextData);
    }
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid context data'
    });
  }
};

export const createCommentsRoutes = (): Router => {
  const router = Router();
  const commentsController = new CommentsController();

  // ========== THREAD ROUTES ==========

  // Создание треда
  router.post(
    '/projects/:projectId/comments/threads',
    authenticateJWT,
    validateParams(ProjectIdParamSchema),
    validateBody(CreateThreadSchema),
    validateThreadContext,
    commentsController.createThread
  );

  // Получение списка тредов
  router.get(
    '/projects/:projectId/comments/threads',
    authenticateJWT,
    validateParams(ProjectIdParamSchema),
    validateQuery(ThreadFiltersSchema),
    commentsController.getThreads
  );

  // Получение тредов с информацией о статусе прочтения (должен быть выше параметрического роута)
  router.get(
    '/projects/:projectId/comments/threads/with-read-status',
    authenticateJWT,
    validateParams(ProjectIdParamSchema),
    validateQuery(ThreadFiltersSchema),
    commentsController.getThreadsWithReadStatus
  );

  // Получение треда по ID
  router.get(
    '/projects/:projectId/comments/threads/:threadId',
    authenticateJWT,
    validateParams(ProjectIdParamSchema.merge(ThreadIdParamSchema)),
    commentsController.getThread
  );

  // Обновление треда
  router.patch(
    '/projects/:projectId/comments/threads/:threadId',
    authenticateJWT,
    validateParams(ProjectIdParamSchema.merge(ThreadIdParamSchema)),
    validateBody(UpdateThreadSchema),
    commentsController.updateThread
  );

  // ========== COMMENT ROUTES ==========

  // Добавление комментария
  router.post(
    '/projects/:projectId/comments/threads/:threadId/comments',
    authenticateJWT,
    validateParams(ProjectIdParamSchema.merge(ThreadIdParamSchema)),
    validateBody(CreateCommentSchema),
    commentsController.addComment
  );

  // Обновление комментария
  router.patch(
    '/projects/:projectId/comments/:commentId',
    authenticateJWT,
    validateParams(ProjectIdParamSchema.merge(CommentIdParamSchema)),
    validateBody(UpdateCommentSchema),
    commentsController.updateComment
  );

  // Удаление комментария
  router.delete(
    '/projects/:projectId/comments/:commentId',
    authenticateJWT,
    validateParams(ProjectIdParamSchema.merge(CommentIdParamSchema)),
    commentsController.deleteComment
  );

  // ========== NOTIFICATION ROUTES ==========

  // Получение уведомлений (глобальный эндпоинт, не привязанный к проекту)
  router.get(
    '/comments/notifications',
    authenticateJWT,
    validateQuery(NotificationFiltersSchema),
    commentsController.getNotifications
  );

  // Отметка уведомлений как прочитанные
  router.patch(
    '/comments/notifications/read',
    authenticateJWT,
    validateBody(MarkNotificationsAsReadSchema),
    commentsController.markNotificationsAsRead
  );

  // ========== READ STATUS ROUTES ==========

  // Отметка треда как прочитанного
  router.post(
    '/projects/:projectId/comments/threads/:threadId/read',
    authenticateJWT,
    validateParams(ProjectIdParamSchema.merge(ThreadIdParamSchema)),
    commentsController.markThreadAsRead
  );

  // Отметка комментария как прочитанного
  router.post(
    '/projects/:projectId/comments/:commentId/read',
    authenticateJWT,
    validateParams(ProjectIdParamSchema.merge(CommentIdParamSchema)),
    commentsController.markCommentAsRead
  );

  // Массовая отметка комментариев как прочитанных
  router.post(
    '/projects/:projectId/comments/read',
    authenticateJWT,
    validateParams(ProjectIdParamSchema),
    commentsController.markCommentsAsRead
  );

  // Получение количества непрочитанных комментариев
  router.get(
    '/comments/unread-count',
    authenticateJWT,
    commentsController.getUnreadCommentsCount
  );


  return router;
};

// Экспорт для подключения в основной app
export default createCommentsRoutes;
