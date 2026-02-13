import { Request, Response } from 'express';
import { NotebookService, CreateNoteDto, UpdateNoteDto, CreateTagDto, UpdateTagDto, NotesFilters } from './notebook.service';
import { PrismaClient } from '@prisma/client';

export class NotebookController {
  private notebookService: NotebookService;

  constructor() {
    const prisma = new PrismaClient();
    this.notebookService = new NotebookService(prisma);
  }

  // ========== NOTE ENDPOINTS ==========

  /**
   * POST /api/notebook/notes
   * Создание новой заметки
   */
  createNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const data: CreateNoteDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const note = await this.notebookService.createNote(userId, data);

      res.status(201).json({
        success: true,
        data: note,
        message: 'Note created successfully'
      });
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create note'
      });
    }
  };

  /**
   * GET /api/notebook/notes
   * Получение заметок пользователя с фильтрацией и пагинацией
   */
  getNotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        projectId,
        tagIds,
        isPublic,
        isPinned,
        search,
        offset = 0,
        limit = 20
      } = req.query;

      const filters: NotesFilters = {
        ...(projectId && { projectId: projectId as string }),
        ...(tagIds && { tagIds: (tagIds as string).split(',').filter(id => id.trim()) }),
        ...(isPublic !== undefined && { isPublic: isPublic === 'true' }),
        ...(isPinned !== undefined && { isPinned: isPinned === 'true' }),
        ...(search && { search: search as string })
      };

      const result = await this.notebookService.getNotes(
        userId,
        filters,
        parseInt(offset as string, 10),
        parseInt(limit as string, 10)
      );

      res.status(200).json({
        success: true,
        data: result.notes,
        pagination: {
          total: result.total,
          offset: parseInt(offset as string, 10),
          limit: parseInt(limit as string, 10)
        },
        message: 'Notes retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting notes:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get notes'
      });
    }
  };

  /**
   * GET /api/notebook/notes/:id
   * Получение конкретной заметки
   */
  getNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const note = await this.notebookService.getNote(userId, id);

      if (!note) {
        res.status(404).json({
          success: false,
          message: 'Note not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: note,
        message: 'Note retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting note:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get note'
      });
    }
  };

  /**
   * PATCH /api/notebook/notes/:id
   * Обновление заметки
   */
  updateNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const data: UpdateNoteDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const note = await this.notebookService.updateNote(userId, id, data);

      res.status(200).json({
        success: true,
        data: note,
        message: 'Note updated successfully'
      });
    } catch (error) {
      console.error('Error updating note:', error);
      if (error instanceof Error && error.message === 'Note not found or access denied') {
        res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update note'
        });
      }
    }
  };

  /**
   * DELETE /api/notebook/notes/:id
   * Удаление заметки
   */
  deleteNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const deleted = await this.notebookService.deleteNote(userId, id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Note not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Note deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete note'
      });
    }
  };

  /**
   * POST /api/notebook/notes/:id/toggle-pin
   * Переключение закрепления заметки
   */
  togglePinNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const note = await this.notebookService.togglePinNote(userId, id);

      res.status(200).json({
        success: true,
        data: note,
        message: `Note ${note.isPinned ? 'pinned' : 'unpinned'} successfully`
      });
    } catch (error) {
      console.error('Error toggling pin note:', error);
      if (error instanceof Error && error.message === 'Note not found or access denied') {
        res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to toggle pin note'
        });
      }
    }
  };

  // ========== TAG ENDPOINTS ==========

  /**
   * POST /api/notebook/tags
   * Создание нового тега
   */
  createTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const data: CreateTagDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const tag = await this.notebookService.createTag(userId, data);

      res.status(201).json({
        success: true,
        data: tag,
        message: 'Tag created successfully'
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(400).json({
          success: false,
          message: 'Tag with this name already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create tag'
        });
      }
    }
  };

  /**
   * GET /api/notebook/tags
   * Получение тегов пользователя
   */
  getTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const tags = await this.notebookService.getTags(userId);

      res.status(200).json({
        success: true,
        data: tags,
        message: 'Tags retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting tags:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get tags'
      });
    }
  };

  /**
   * GET /api/notebook/tags/:id
   * Получение конкретного тега
   */
  getTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const tag = await this.notebookService.getTag(userId, id);

      if (!tag) {
        res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: tag,
        message: 'Tag retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting tag:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get tag'
      });
    }
  };

  /**
   * PATCH /api/notebook/tags/:id
   * Обновление тега
   */
  updateTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const data: UpdateTagDto = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const tag = await this.notebookService.updateTag(userId, id, data);

      res.status(200).json({
        success: true,
        data: tag,
        message: 'Tag updated successfully'
      });
    } catch (error) {
      console.error('Error updating tag:', error);
      if (error instanceof Error && error.message === 'Tag not found or access denied') {
        res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      } else if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(400).json({
          success: false,
          message: 'Tag with this name already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update tag'
        });
      }
    }
  };

  /**
   * DELETE /api/notebook/tags/:id
   * Удаление тега
   */
  deleteTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const deleted = await this.notebookService.deleteTag(userId, id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Tag deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete tag'
      });
    }
  };

  // ========== UTILITY ENDPOINTS ==========

  /**
   * GET /api/notebook/stats
   * Получение статистики блокнота пользователя
   */
  getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const stats = await this.notebookService.getUserStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Stats retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get stats'
      });
    }
  };
}
