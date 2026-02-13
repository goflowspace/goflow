// backend/src/modules/ai/pricing.routes.ts
import { Router } from 'express';
import { PricingController } from './pricing.controller';
import { asyncHandler } from '../../middlewares/asyncHandler';

const router = Router();

/**
 * Роуты для работы с ценами пайплайнов
 */

// Получить конфигурацию цен всех пайплайнов для клиента
router.get('/pipelines', asyncHandler(PricingController.getPipelinesPricing));

// Получить детальную информацию о ценах конкретного пайплайна
router.get('/pipelines/:pipelineId', asyncHandler(PricingController.getPipelinePricing));

// Рассчитать стоимость пайплайна для определенного уровня качества
router.get('/pipelines/:pipelineId/calculate', asyncHandler(PricingController.calculatePipelineCost));

// Рассчитать стоимость генерации одного поля библии
router.get('/single-field/:fieldOperationId', asyncHandler(PricingController.calculateSingleFieldCost));

// Получить цены пайплайнов определенной категории
router.get('/categories/:category', asyncHandler(PricingController.getPipelinesPricingByCategory));

// Получить статистику по ценам всех пайплайнов
router.get('/statistics', asyncHandler(PricingController.getPricingStatistics));

// Проверка работоспособности сервиса ценообразования
router.get('/health', asyncHandler(PricingController.healthCheck));

export default router;
