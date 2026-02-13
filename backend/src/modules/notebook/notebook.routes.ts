import { Router } from 'express';
import { NotebookController } from './notebook.controller';
import { 
  CreateNoteSchema,
  UpdateNoteSchema,
  CreateTagSchema,
  UpdateTagSchema,
  GetNotesSchema,
  GetNoteSchema,
  UpdateNoteParamsSchema,
  DeleteNoteSchema,
  GetTagSchema,
  UpdateTagParamsSchema,
  DeleteTagSchema
} from './notebook.validation';
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
          message: 'Invalid request query'
        });
      }
    }
  };
};

export const createNotebookRoutes = (): Router => {
  const router = Router();
  const notebookController = new NotebookController();

// ========== NOTE ROUTES ==========

/**
 * POST /api/notebook/notes
 * Создание новой заметки
 */
router.post(
  '/notes',
  authenticateJWT,
  validateBody(CreateNoteSchema),
  notebookController.createNote
);

/**
 * GET /api/notebook/notes
 * Получение заметок пользователя с фильтрацией
 */
router.get(
  '/notes',
  authenticateJWT,
  validateQuery(GetNotesSchema),
  notebookController.getNotes
);

/**
 * GET /api/notebook/notes/:id
 * Получение конкретной заметки
 */
router.get(
  '/notes/:id',
  authenticateJWT,
  validateParams(GetNoteSchema),
  notebookController.getNote
);

/**
 * PATCH /api/notebook/notes/:id
 * Обновление заметки
 */
router.patch(
  '/notes/:id',
  authenticateJWT,
  validateParams(UpdateNoteParamsSchema),
  validateBody(UpdateNoteSchema),
  notebookController.updateNote
);

/**
 * DELETE /api/notebook/notes/:id
 * Удаление заметки
 */
router.delete(
  '/notes/:id',
  authenticateJWT,
  validateParams(DeleteNoteSchema),
  notebookController.deleteNote
);

/**
 * POST /api/notebook/notes/:id/toggle-pin
 * Переключение закрепления заметки
 */
router.post(
  '/notes/:id/toggle-pin',
  authenticateJWT,
  validateParams(GetNoteSchema),
  notebookController.togglePinNote
);

// ========== TAG ROUTES ==========

/**
 * POST /api/notebook/tags
 * Создание нового тега
 */
router.post(
  '/tags',
  authenticateJWT,
  validateBody(CreateTagSchema),
  notebookController.createTag
);

/**
 * GET /api/notebook/tags
 * Получение тегов пользователя
 */
router.get(
  '/tags',
  authenticateJWT,
  notebookController.getTags
);

/**
 * GET /api/notebook/tags/:id
 * Получение конкретного тега
 */
router.get(
  '/tags/:id',
  authenticateJWT,
  validateParams(GetTagSchema),
  notebookController.getTag
);

/**
 * PATCH /api/notebook/tags/:id
 * Обновление тега
 */
router.patch(
  '/tags/:id',
  authenticateJWT,
  validateParams(UpdateTagParamsSchema),
  validateBody(UpdateTagSchema),
  notebookController.updateTag
);

/**
 * DELETE /api/notebook/tags/:id
 * Удаление тега
 */
router.delete(
  '/tags/:id',
  authenticateJWT,
  validateParams(DeleteTagSchema),
  notebookController.deleteTag
);

// ========== UTILITY ROUTES ==========

/**
 * GET /api/notebook/stats
 * Получение статистики блокнота пользователя
 */
router.get(
  '/stats',
  authenticateJWT,
  notebookController.getUserStats
);

  return router;
};

export default createNotebookRoutes;
