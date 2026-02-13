import { Router, Request, Response } from 'express';
import { container } from './di-container.inversify';
import { TimelineController } from './timeline.controller';
import { TYPES } from './di.types';
import { authenticateJWT } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { asyncHandler } from '@middlewares/errorHandler';
import { z } from 'zod';

const router = Router();
const timelineController = container.get<TimelineController>(TYPES.TimelineController);

// Zod схемы для валидации
const projectIdParamSchema = z.object({
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID')
});

const timelineIdParamSchema = z.object({
  timelineId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid timeline ID')
});

const createTimelineSchema = z.object({
  params: projectIdParamSchema,
  body: z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().max(500).optional(),
    order: z.number().int().min(0).optional()
  })
});

const getProjectTimelinesSchema = z.object({
  params: projectIdParamSchema,
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    orderBy: z.enum(['order', 'createdAt', 'name']).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional()
  })
});

const updateTimelineSchema = z.object({
  params: timelineIdParamSchema,
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
  })
});

const duplicateTimelineSchema = z.object({
  params: timelineIdParamSchema,
  body: z.object({
    name: z.string().trim().min(1).max(100)
  })
});

const timelineIdSchema = z.object({
  params: timelineIdParamSchema
});

// Роуты для работы с таймлайнами проекта
router.post(
  '/projects/:projectId/timelines',
  authenticateJWT,
  validate(createTimelineSchema),
  asyncHandler((req: Request, res: Response) => timelineController.createTimeline(req, res))
);

router.get(
  '/projects/:projectId/timelines',
  authenticateJWT,
  validate(getProjectTimelinesSchema),
  asyncHandler((req: Request, res: Response) => timelineController.getProjectTimelines(req, res))
);

// Роуты для работы с конкретным таймлайном
router.get(
  '/timelines/:timelineId',
  authenticateJWT,
  validate(timelineIdSchema),
  asyncHandler((req: Request, res: Response) => timelineController.getTimeline(req, res))
);

router.put(
  '/timelines/:timelineId',
  authenticateJWT,
  validate(updateTimelineSchema),
  asyncHandler((req: Request, res: Response) => timelineController.updateTimeline(req, res))
);

router.delete(
  '/timelines/:timelineId',
  authenticateJWT,
  validate(timelineIdSchema),
  asyncHandler((req: Request, res: Response) => timelineController.deleteTimeline(req, res))
);

router.post(
  '/timelines/:timelineId/duplicate',
  authenticateJWT,
  validate(duplicateTimelineSchema),
  asyncHandler((req: Request, res: Response) => timelineController.duplicateTimeline(req, res))
);

router.post(
  '/timelines/:timelineId/activate',
  authenticateJWT,
  validate(timelineIdSchema),
  asyncHandler((req: Request, res: Response) => timelineController.switchActiveTimeline(req, res))
);

export { router as timelineRoutes };
