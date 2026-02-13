import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { ITimelineService } from './interfaces/timeline.interfaces';
import { TYPES } from './di.types';

import { createError } from '@middlewares/errorHandler';

@injectable()
export class TimelineController {
  constructor(
    @inject(TYPES.TimelineService) private timelineService: ITimelineService
  ) {}

  /**
   * Создать новый таймлайн
   * POST /api/projects/:projectId/timelines
   */
  async createTimeline(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { name, description, order } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const timeline = await this.timelineService.createTimeline(userId, {
      projectId,
      name,
      description,
      order
    });

    res.status(201).json(timeline);
  }

  /**
   * Получить список таймлайнов проекта
   * GET /api/projects/:projectId/timelines
   */
  async getProjectTimelines(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { limit, offset, orderBy, sortDirection } = req.query;

    const timelines = await this.timelineService.getProjectTimelines({
      projectId,
      limit: limit as number | undefined,
      offset: offset as number | undefined,
      orderBy: orderBy as any,
      sortDirection: sortDirection as any
    });

    res.json(timelines);
  }

  /**
   * Получить таймлайн по ID
   * GET /api/timelines/:timelineId
   */
  async getTimeline(req: Request, res: Response): Promise<void> {
    const { timelineId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const timeline = await this.timelineService.getTimeline(timelineId, userId);
    res.json(timeline);
  }

  /**
   * Обновить таймлайн
   * PUT /api/timelines/:timelineId
   */
  async updateTimeline(req: Request, res: Response): Promise<void> {
    const { timelineId } = req.params;
    const { name, description, order, isActive } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const timeline = await this.timelineService.updateTimeline(timelineId, userId, {
      name,
      description,
      order,
      isActive
    });

    res.json(timeline);
  }

  /**
   * Удалить таймлайн
   * DELETE /api/timelines/:timelineId
   */
  async deleteTimeline(req: Request, res: Response): Promise<void> {
    const { timelineId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    await this.timelineService.deleteTimeline(timelineId, userId);
    res.status(204).send();
  }

  /**
   * Дублировать таймлайн
   * POST /api/timelines/:timelineId/duplicate
   */
  async duplicateTimeline(req: Request, res: Response): Promise<void> {
    const { timelineId } = req.params;
    const { name } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const newTimeline = await this.timelineService.duplicateTimeline(timelineId, userId, name);
    res.status(201).json(newTimeline);
  }

  /**
   * Переключить активный таймлайн
   * POST /api/timelines/:timelineId/activate
   */
  async switchActiveTimeline(req: Request, res: Response): Promise<void> {
    const { timelineId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    await this.timelineService.switchActiveTimeline(timelineId, userId);
    res.status(204).send();
  }
}
