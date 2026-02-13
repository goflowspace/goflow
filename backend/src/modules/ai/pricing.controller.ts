// backend/src/modules/ai/pricing.controller.ts
import { Request, Response } from 'express';
import { PipelinePricingService } from './v2/services/PipelinePricingService';
import { QualityLevel } from './v2/shared/types';

/**
 * Контроллер для работы с ценами пайплайнов
 */
export class PricingController {

  /**
   * GET /api/ai/pricing/pipelines
   * Получает конфигурацию цен всех пайплайнов для клиента
   */
  static async getPipelinesPricing(_req: Request, res: Response) {
    try {
      const clientConfig = PipelinePricingService.createClientPricingConfig();
      
      res.json({
        success: true,
        data: clientConfig
      });
    } catch (error) {
      console.error('Error getting pipelines pricing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pipelines pricing'
      });
    }
  }

  /**
   * GET /api/ai/pricing/pipelines/:pipelineId
   * Получает детальную информацию о ценах конкретного пайплайна
   */
  static async getPipelinePricing(req: Request, res: Response) {
    try {
      const { pipelineId } = req.params;
      
      const pricingInfo = PipelinePricingService.getPipelinePricingInfo(pipelineId);
      
      if (!pricingInfo) {
        return res.status(404).json({
          success: false,
          error: `Pipeline ${pipelineId} not found`
        });
      }

      res.json({
        success: true,
        data: pricingInfo
      });
    } catch (error) {
      console.error('Error getting pipeline pricing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pipeline pricing'
      });
    }
  }

  /**
   * GET /api/ai/pricing/pipelines/:pipelineId/calculate
   * Рассчитывает стоимость пайплайна для определенного уровня качества
   */
  static async calculatePipelineCost(req: Request, res: Response) {
    try {
      const { pipelineId } = req.params;
      const { qualityLevel = QualityLevel.STANDARD } = req.query;

      // Валидация уровня качества
      if (!Object.values(QualityLevel).includes(qualityLevel as QualityLevel)) {
        return res.status(400).json({
          success: false,
          error: `Invalid quality level. Must be one of: ${Object.values(QualityLevel).join(', ')}`
        });
      }

      const cost = PipelinePricingService.calculatePipelineCost(pipelineId);
      
      if (!cost) {
        return res.status(404).json({
          success: false,
          error: `Pipeline ${pipelineId} not found`
        });
      }

      res.json({
        success: true,
        data: cost
      });
    } catch (error) {
      console.error('Error calculating pipeline cost:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate pipeline cost'
      });
    }
  }

  /**
   * GET /api/ai/pricing/single-field/:fieldOperationId
   * Рассчитывает стоимость генерации одного поля библии
   */
  static async calculateSingleFieldCost(req: Request, res: Response) {
    try {
      const { fieldOperationId } = req.params;
      const { qualityLevel = QualityLevel.STANDARD } = req.query;

      // Валидация уровня качества
      if (!Object.values(QualityLevel).includes(qualityLevel as QualityLevel)) {
        return res.status(400).json({
          success: false,
          error: `Invalid quality level. Must be one of: ${Object.values(QualityLevel).join(', ')}`
        });
      }

      const cost = PipelinePricingService.calculateSingleFieldBibleCost(
        fieldOperationId
      );
      
      if (!cost) {
        return res.status(400).json({
          success: false,
          error: `Invalid field operation: ${fieldOperationId}`
        });
      }

      res.json({
        success: true,
        data: cost
      });
    } catch (error) {
      console.error('Error calculating single field cost:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate single field cost'
      });
    }
  }

  /**
   * GET /api/ai/pricing/categories/:category
   * Получает цены пайплайнов определенной категории
   */
  static async getPipelinesPricingByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      
      const pricingInfos = PipelinePricingService.getPipelinesPricingByCategory(category);
      
      res.json({
        success: true,
        data: {
          category,
          pipelines: pricingInfos,
          count: pricingInfos.length
        }
      });
    } catch (error) {
      console.error('Error getting pipelines pricing by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pipelines pricing by category'
      });
    }
  }

  /**
   * GET /api/ai/pricing/statistics
   * Получает статистику по ценам всех пайплайнов
   */
  static async getPricingStatistics(_req: Request, res: Response) {
    try {
      const statistics = PipelinePricingService.getPricingStatistics();
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting pricing statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pricing statistics'
      });
    }
  }

  /**
   * GET /api/ai/pricing/health
   * Проверка работоспособности сервиса ценообразования
   */
  static async healthCheck(_req: Request, res: Response) {
    try {
      const allPipelines = PipelinePricingService.getAllPipelinesPricing();
      const statistics = PipelinePricingService.getPricingStatistics();
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          pipelinesCount: allPipelines.length,
          categoriesCount: statistics.categories.length,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in pricing health check:', error);
      res.status(500).json({
        success: false,
        error: 'Pricing service is unhealthy'
      });
    }
  }
}
