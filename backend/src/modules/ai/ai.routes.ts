import express from 'express';
import { z } from 'zod';
import { authenticateJWT } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { validate } from '../../middlewares/validation.middleware';
import pricingRoutes from './pricing.routes';
import {
  acceptSuggestion,
  rejectSuggestion,
  getAISettings,
  updateAISettings,
  getCreditsBalance,
  getSuggestionsHistory,
  getAverageResponseTime,
  generateProjectBibleFieldV2,
  generateComprehensiveBible,
  generateEntityV3,
  getAvailableEntityTypes,
  estimateEntityGeneration,
  getPipelineStructure,
  generateEntityImage,
  generateEntityImagePipeline,
  generateNarrativeText,
  generateNextNode,
  translateNodePipeline,
  estimateBatchTranslation,
  batchTranslateTimeline,
  cancelBatchTranslation
} from './ai.controller';
import {
  generateProjectBibleContentSchema,
  suggestionFeedbackSchema,
  updateAISettingsSchema,
  translateNodePipelineSchema,
  estimateBatchTranslationSchema,
  batchTranslateTimelineSchema,
  cancelBatchTranslationSchema
} from './ai.validation';



const router = express.Router();

// ===== PUBLIC PRICING ROUTES (без аутентификации) =====

// Подключаем роуты для ценообразования пайплайнов (публичные)
router.use('/pricing', pricingRoutes);

// Все остальные AI роуты требуют аутентификации
router.use(authenticateJWT);

// Управление предложениями
router.post('/suggestions/:id/accept', 
  validate(z.object({ body: suggestionFeedbackSchema })), 
  asyncHandler(acceptSuggestion)
);
router.post('/suggestions/:id/reject', 
  validate(z.object({ body: suggestionFeedbackSchema })), 
  asyncHandler(rejectSuggestion)
);
router.get('/suggestions/history', asyncHandler(getSuggestionsHistory));

// Настройки пользователя
router.get('/settings', asyncHandler(getAISettings));
router.put('/settings', 
  validate(z.object({ body: updateAISettingsSchema })), 
  asyncHandler(updateAISettings)
);

// Система кредитов
router.get('/credits', asyncHandler(getCreditsBalance));

// Статистика и метрики
router.get('/average-response-time', asyncHandler(getAverageResponseTime));

// Генерация отдельного поля библии проекта через v2 пайплайн
router.post('/project-bible-field-v2', 
  validate(z.object({ body: generateProjectBibleContentSchema })), 
  asyncHandler(generateProjectBibleFieldV2)
);

router.post(
  '/:projectId/generate-comprehensive-bible',
  authenticateJWT,
  asyncHandler(generateComprehensiveBible)
);

// Получение структуры пайплайна
router.get('/pipeline/structure', asyncHandler(getPipelineStructure));

// ===== ENTITY GENERATION ROUTES =====

// V3: Генерация сущности через адаптированный пайплайн с новым движком
router.post('/v3/entity/generate', asyncHandler(generateEntityV3));

// Получение доступных типов сущностей для проекта
router.get('/entity/types/:projectId', asyncHandler(getAvailableEntityTypes));

// Предварительная оценка генерации сущности
router.post('/entity/estimate', asyncHandler(estimateEntityGeneration));

// Генерация изображения для сущности
router.post('/entity/generate-image', asyncHandler(generateEntityImage));

// Генерация изображения для сущности с использованием пайплайна
router.post('/entity/generate-image-pipeline', asyncHandler(generateEntityImagePipeline));

// ===== NARRATIVE TEXT GENERATION ROUTES =====

// Генерация нарративного текста для узла с использованием пайплайна v2
router.post('/canvas/fill-text', asyncHandler(generateNarrativeText));

// Генерация следующего узла с использованием пайплайна v2
router.post('/canvas/next-node', asyncHandler(generateNextNode));

// ===== TRANSLATION ROUTES =====

// Перевод нарративного узла с использованием пайплайна v2
router.post('/translation/node-pipeline', 
  validate(z.object({ body: translateNodePipelineSchema })),
  asyncHandler(translateNodePipeline)
);

// Оценка стоимости пакетного перевода таймлайна
router.post('/translation/batch-estimate', 
  validate(z.object({ body: estimateBatchTranslationSchema })),
  asyncHandler(estimateBatchTranslation)
);

// Пакетный перевод таймлайна с использованием пайплайна v2
router.post('/translation/batch-timeline', 
  validate(z.object({ body: batchTranslateTimelineSchema })),
  asyncHandler(batchTranslateTimeline)
);

// POST /translation/batch-cancel - отменить пакетный перевод
router.post('/translation/batch-cancel', 
  validate(z.object({ body: cancelBatchTranslationSchema })),
  asyncHandler(cancelBatchTranslation)
);

export default router; 