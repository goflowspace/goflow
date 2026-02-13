import { Router, Request, Response } from 'express';
import { authenticateJWT } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { asyncHandler } from '@middlewares/errorHandler';
import { LocalizationChangeType } from '@prisma/client';
import {
  LocalizationConfigSchema,
  AddLanguageSchema,
  TranslationUpdateSchema,
  BulkTranslationUpdateSchema,
  AITranslationOptionsSchema,
  ImportDataSchema,
  ProjectIdParamSchema,
  TimelineIdParamSchema,
  LocalizationIdParamSchema,
  LanguageParamSchema,
  BulkApproveSchema,
  BulkProtectSchema,
  BulkUnprotectSchema,
  BulkDeleteSchema
} from './localization.validation';
import { LocalizationService } from './localization.service';
import { prisma } from '@config/prisma';
import { z } from 'zod';

const router = Router();

// Initialize services
const localizationService = new LocalizationService(prisma);

// All routes require authentication
router.use(authenticateJWT);

// Helper function to extract IP address and user agent
function getRequestMetadata(req: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

// Query schemas
const timelineQuerySchema = z.object({
  timelineId: z.string().optional()
});

const languageQuerySchema = z.object({
  language: z.string().optional()
});

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv', 'xliff']).default('json'),
  language: z.string().optional()
});

// ============= PROJECT LOCALIZATION SETTINGS =============

// POST /localization/projects/:projectId - create or update project localization settings
router.post(
  '/projects/:projectId',
  validate(z.object({
    params: ProjectIdParamSchema,
    body: LocalizationConfigSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.createOrUpdateProjectLocalization(req.params.projectId, req.body);
    res.status(201).json({ success: true, data: result });
  })
);

// GET /localization/projects/:projectId - get project localization settings
router.get(
  '/projects/:projectId',
  validate(z.object({
    params: ProjectIdParamSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.getProjectLocalization(req.params.projectId);
    res.json({ success: true, data: result });
  })
);

// DELETE /localization/projects/:projectId - delete project localization settings
router.delete(
  '/projects/:projectId',
  validate(z.object({
    params: ProjectIdParamSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.deleteProjectLocalization(req.params.projectId);
    res.json({ success: true, data: result });
  })
);

// ============= LANGUAGE MANAGEMENT =============

// POST /localization/projects/:projectId/languages - add target language
router.post(
  '/projects/:projectId/languages',
  validate(z.object({
    params: ProjectIdParamSchema,
    body: AddLanguageSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.addTargetLanguage(req.params.projectId, req.body.language);
    res.status(201).json(result);
  })
);

// DELETE /localization/projects/:projectId/languages/:language - remove target language
router.delete(
  '/projects/:projectId/languages/:language',
  validate(z.object({
    params: ProjectIdParamSchema.merge(LanguageParamSchema)
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.removeTargetLanguage(req.params.projectId, req.params.language);
    res.json({ success: true, data: result });
  })
);

// ============= TIMELINE LOCALIZATION DATA =============

// GET /localization/projects/:projectId/timelines/summary - get timeline localization summary
router.get(
  '/projects/:projectId/timelines/summary',
  validate(z.object({
    params: ProjectIdParamSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.getTimelineLocalizationSummary(req.params.projectId);
    res.json({ success: true, data: result });
  })
);

// GET /localization/projects/:projectId/timelines/:timelineId/texts - get timeline texts
router.get(
  '/projects/:projectId/timelines/:timelineId/texts',
  validate(z.object({
    params: ProjectIdParamSchema.merge(TimelineIdParamSchema),
    query: languageQuerySchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.getTimelineTexts(
      req.params.projectId,
      req.params.timelineId,
      req.query.language as string | undefined
    );
    res.json({ success: true, data: result });
  })
);

// ============= SCANNING AND SYNCHRONIZATION =============

// POST /localization/projects/:projectId/scan - scan project for localizable texts
router.post(
  '/projects/:projectId/scan',
  validate(z.object({
    params: ProjectIdParamSchema,
    query: timelineQuerySchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.scanProjectTexts(
      req.params.projectId,
      req.query.timelineId as string | undefined
    );
    res.json({ success: true, data: result });
  })
);

// POST /localization/projects/:projectId/sync - sync translations with graph state
router.post(
  '/projects/:projectId/sync',
  validate(z.object({
    params: ProjectIdParamSchema,
    query: timelineQuerySchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.syncTranslations(
      req.params.projectId,
      req.query.timelineId as string | undefined
    );
    res.json({ success: true, data: result });
  })
);

// ============= TRANSLATION MANAGEMENT =============

// PUT /localization/translations/:localizationId - update a specific translation
router.put(
  '/translations/:localizationId',
  validate(z.object({
    params: LocalizationIdParamSchema,
    body: TranslationUpdateSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.updateTranslation(
      req.params.localizationId,
      req.body,
      req.user?.id
    );
    res.json({ success: true, data: result });
  })
);

// DELETE /localization/translations/:localizationId - delete a specific translation
router.delete(
  '/translations/:localizationId',
  validate(z.object({
    params: LocalizationIdParamSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.deleteTranslation(
      req.params.localizationId,
      req.user?.id
    );
    res.json({ success: true, data: result });
  })
);

// POST /localization/translations/:localizationId/approve - approve a translation
router.post(
  '/translations/:localizationId/approve',
  validate(z.object({
    params: LocalizationIdParamSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.approveTranslation(
      req.params.localizationId,
      req.user?.id
    );
    res.json({ success: true, data: result });
  })
);

// POST /localization/translations/:localizationId/protect - protect a translation
router.post(
  '/translations/:localizationId/protect',
  validate(z.object({
    params: LocalizationIdParamSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.protectTranslation(
      req.params.localizationId,
      req.user?.id
    );
    res.json({ success: true, data: result });
  })
);

// DELETE /localization/translations/:localizationId/protect - remove protection from a translation
router.delete(
  '/translations/:localizationId/protect',
  validate(z.object({
    params: LocalizationIdParamSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.unprotectTranslation(
      req.params.localizationId,
      req.user?.id
    );
    res.json({ success: true, data: result });
  })
);

// ============= BULK STATUS OPERATIONS =============

// POST /localization/bulk/approve - bulk approve translations
router.post(
  '/bulk/approve',
  validate(z.object({
    body: BulkApproveSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { ipAddress, userAgent } = getRequestMetadata(req);
    const result = await localizationService.bulkApproveTranslations(
      req.body.localizationIds,
      req.user?.id,
      ipAddress,
      userAgent
    );
    res.json({ success: true, data: result });
  })
);

// POST /localization/bulk/protect - bulk protect translations
router.post(
  '/bulk/protect',
  validate(z.object({
    body: BulkProtectSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { ipAddress, userAgent } = getRequestMetadata(req);
    const result = await localizationService.bulkProtectTranslations(
      req.body.localizationIds,
      req.user?.id,
      ipAddress,
      userAgent
    );
    res.json({ success: true, data: result });
  })
);

// DELETE /localization/bulk/protect - bulk unprotect translations
router.delete(
  '/bulk/protect',
  validate(z.object({
    body: BulkUnprotectSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { ipAddress, userAgent } = getRequestMetadata(req);
    const result = await localizationService.bulkUnprotectTranslations(
      req.body.localizationIds,
      req.user?.id,
      ipAddress,
      userAgent
    );
    res.json({ success: true, data: result });
  })
);

// DELETE /localization/bulk/delete - bulk delete translations
router.delete(
  '/bulk/delete',
  validate(z.object({
    body: BulkDeleteSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { ipAddress, userAgent } = getRequestMetadata(req);
    const result = await localizationService.bulkDeleteTranslations(
      req.body.localizationIds,
      req.user?.id,
      ipAddress,
      userAgent
    );
    res.json({ success: true, data: result });
  })
);

// POST /localization/projects/:projectId/translations/batch - bulk update translations
router.post(
  '/projects/:projectId/translations/batch',
  validate(z.object({
    params: ProjectIdParamSchema,
    body: BulkTranslationUpdateSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.bulkUpdateTranslations(
      req.body.updates,
      req.user?.id
    );
    res.json({ success: true, data: result });
  })
);

// ============= STATISTICS =============

// GET /localization/projects/:projectId/stats - get localization statistics
router.get(
  '/projects/:projectId/stats',
  validate(z.object({
    params: ProjectIdParamSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.getLocalizationStats(req.params.projectId);
    res.json({ success: true, data: result });
  })
);

// ============= AI TRANSLATION =============

// POST /localization/projects/:projectId/translations/ai-translate - start AI translation
router.post(
  '/projects/:projectId/translations/ai-translate',
  validate(z.object({
    params: ProjectIdParamSchema,
    body: AITranslationOptionsSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.startAITranslation(req.params.projectId, req.body);
    res.status(202).json({ success: true, data: result });
  })
);

// ============= EXPORT/IMPORT =============

// GET /localization/projects/:projectId/translations/export - export translations
router.get(
  '/projects/:projectId/translations/export',
  validate(z.object({
    params: ProjectIdParamSchema,
    query: exportQuerySchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.exportTranslations(
      req.params.projectId,
      req.query.format as 'json' | 'csv' | 'xliff' | undefined,
      req.query.language as string | undefined
    );
    res.json({ success: true, data: result });
  })
);

// POST /localization/projects/:projectId/translations/import - import translations
router.post(
  '/projects/:projectId/translations/import',
  validate(z.object({
    params: ProjectIdParamSchema,
    body: ImportDataSchema
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.importTranslations(
      req.params.projectId,
      req.body,
      req as any
    );
    res.json({ success: true, data: result });
  })
);

// ============= ИСТОРИЯ ИЗМЕНЕНИЙ =============

// GET /localization/translations/:localizationId/history - get history for specific localization
router.get(
  '/translations/:localizationId/history',
  validate(z.object({
    params: LocalizationIdParamSchema,
    query: z.object({
      limit: z.coerce.number().min(1).max(100).optional().default(50),
      offset: z.coerce.number().min(0).optional().default(0),
    })
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.getLocalizationHistory(
      req.params.localizationId,
      req.query.limit as unknown as number,
      req.query.offset as unknown as number
    );
    res.json({ success: true, data: result });
  })
);

// GET /localization/projects/:projectId/history - get project localization history
router.get(
  '/projects/:projectId/history',
  validate(z.object({
    params: ProjectIdParamSchema,
    query: z.object({
      limit: z.coerce.number().min(1).max(100).optional().default(50),
      offset: z.coerce.number().min(0).optional().default(0),
      changeType: z.nativeEnum(LocalizationChangeType).optional(),
      userId: z.string().optional(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    })
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.getProjectLocalizationHistory(
      req.params.projectId,
      {
        limit: req.query.limit as unknown as number,
        offset: req.query.offset as unknown as number,
        changeType: req.query.changeType as LocalizationChangeType,
        userId: req.query.userId as string,
        dateFrom: req.query.dateFrom as unknown as Date,
        dateTo: req.query.dateTo as unknown as Date,
      }
    );
    res.json({ success: true, data: result });
  })
);

// GET /localization/projects/:projectId/timelines/:timelineId/history - get timeline localization history
router.get(
  '/projects/:projectId/timelines/:timelineId/history',
  validate(z.object({
    params: ProjectIdParamSchema.merge(TimelineIdParamSchema),
    query: z.object({
      limit: z.coerce.number().min(1).max(100).optional().default(50),
      offset: z.coerce.number().min(0).optional().default(0),
      changeType: z.nativeEnum(LocalizationChangeType).optional(),
      targetLanguage: z.string().optional(),
    })
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.getTimelineLocalizationHistory(
      req.params.projectId,
      req.params.timelineId,
      {
        limit: req.query.limit as unknown as number,
        offset: req.query.offset as unknown as number,
        changeType: req.query.changeType as LocalizationChangeType,
        targetLanguage: req.query.targetLanguage as string,
      }
    );
    res.json({ success: true, data: result });
  })
);

// GET /localization/projects/:projectId/activity-stats - get localization activity statistics
router.get(
  '/projects/:projectId/activity-stats',
  validate(z.object({
    params: ProjectIdParamSchema,
    query: z.object({
      period: z.enum(['day', 'week', 'month']).optional().default('week'),
    })
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await localizationService.getLocalizationActivityStats(
      req.params.projectId,
      req.query.period as 'day' | 'week' | 'month'
    );
    res.json({ success: true, data: result });
  })
);

export default router;
