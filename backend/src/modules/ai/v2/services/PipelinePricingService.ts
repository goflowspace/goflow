// backend/src/modules/ai/v2/services/PipelinePricingService.ts
import { QualityLevel } from '../shared/types';
import { OperationCreditConfig, USD_PER_CREDIT } from '../config/OperationCreditConfig';
import { 
  getPipelineConfig, 
  getAllPipelines,
  createSingleFieldBibleConfig 
} from '../config/PipelineConfig';

/**
 * Интерфейс для стоимости операции
 */
export interface OperationCost {
  operationId: string;
  qualityLevel: QualityLevel;
  credits: number;
  usd: number;
}

/**
 * Интерфейс для стоимости пайплайна
 */
export interface PipelineCost {
  pipelineId: string;
  pipelineName: string;
  qualityLevel: QualityLevel;
  totalCredits: number;
  totalUSD: number;
  operationBreakdown: OperationCost[];
  metadata: {
    operationsCount: number;
    category: string;
    complexity: string;
    estimatedDuration: number;
  };
}

/**
 * Интерфейс для полной информации о ценах пайплайна
 */
export interface PipelinePricingInfo {
  pipelineId: string;
  pipelineName: string;
  description: string;
  category: string;
  version: string;
  pricing: {
    [QualityLevel.FAST]: PipelineCost;
    [QualityLevel.STANDARD]: PipelineCost;
    [QualityLevel.EXPERT]: PipelineCost;
  };
  priceRange: {
    minCredits: number;
    maxCredits: number;
    minUSD: number;
    maxUSD: number;
  };
  metadata: {
    operationsCount: number;
    complexity: string;
    estimatedDuration: number;
    supportedQualityLevels: QualityLevel[];
    tags?: string[];
  };
}

/**
 * Сервис для расчета стоимости пайплайнов
 */
export class PipelinePricingService {
  
  /**
   * Рассчитывает стоимость операции в кредитах
   */
  static calculateOperationCost(operationId: string, qualityLevel: QualityLevel): number {
    const operationConfig = OperationCreditConfig[operationId] || OperationCreditConfig['default'];
    return operationConfig[qualityLevel] || operationConfig[QualityLevel.STANDARD] || 1;
  }

  /**
   * Рассчитывает стоимость операции с деталями
   */
  static calculateOperationCostDetails(operationId: string, qualityLevel: QualityLevel): OperationCost {
    const credits = this.calculateOperationCost(operationId, qualityLevel);
    return {
      operationId,
      qualityLevel,
      credits,
      usd: credits * USD_PER_CREDIT
    };
  }

  /**
   * Рассчитывает общую стоимость пайплайна для определенного уровня качества
   */
  static calculatePipelineCost(pipelineId: string): PipelineCost | null {
    const config = getPipelineConfig(pipelineId);
    if (!config) return null;

    const operationBreakdown: OperationCost[] = [];
    let totalCredits = 0;

    // Рассчитываем стоимость каждой операции
    config.operations.forEach(operation => {
      // Используем уровень качества операции из конфига или переданный уровень
      const operationQualityLevel = operation.qualityLevel || QualityLevel.STANDARD;
      const operationCost = this.calculateOperationCostDetails(operation.id, operationQualityLevel);
      
      operationBreakdown.push(operationCost);
      totalCredits += operationCost.credits;
    });

    return {
      pipelineId: config.id,
      pipelineName: config.name,
      qualityLevel: QualityLevel.STANDARD,  // FIXME: remove this
      totalCredits,
      totalUSD: totalCredits * USD_PER_CREDIT,
      operationBreakdown,
      metadata: {
        operationsCount: config.operations.length,
        category: config.category,
        complexity: config.metadata?.complexity || 'medium',
        estimatedDuration: config.metadata?.estimatedDuration || 60
      }
    };
  }

  /**
   * Получает полную информацию о ценах пайплайна для всех уровней качества
   */
  static getPipelinePricingInfo(pipelineId: string): PipelinePricingInfo | null {
    const config = getPipelineConfig(pipelineId);
    if (!config) return null;

    // Рассчитываем стоимость для всех уровней качества
    const fastCost = this.calculatePipelineCost(pipelineId);
    const standardCost = this.calculatePipelineCost(pipelineId);
    const expertCost = this.calculatePipelineCost(pipelineId);

    if (!fastCost || !standardCost || !expertCost) return null;

    const allCosts = [fastCost, standardCost, expertCost];
    const minCredits = Math.min(...allCosts.map(c => c.totalCredits));
    const maxCredits = Math.max(...allCosts.map(c => c.totalCredits));

    return {
      pipelineId: config.id,
      pipelineName: config.name,
      description: config.description,
      category: config.category,
      version: config.version,
      pricing: {
        [QualityLevel.FAST]: fastCost,
        [QualityLevel.STANDARD]: standardCost,
        [QualityLevel.EXPERT]: expertCost
      },
      priceRange: {
        minCredits,
        maxCredits,
        minUSD: minCredits * USD_PER_CREDIT,
        maxUSD: maxCredits * USD_PER_CREDIT
      },
      metadata: {
        operationsCount: config.operations.length,
        complexity: config.metadata?.complexity || 'medium',
        estimatedDuration: config.metadata?.estimatedDuration || 60,
        supportedQualityLevels: config.metadata?.supportedQualityLevels || [QualityLevel.FAST, QualityLevel.STANDARD, QualityLevel.EXPERT],
        tags: config.metadata?.tags
      }
    };
  }

  /**
   * Получает информацию о ценах для всех пайплайнов
   */
  static getAllPipelinesPricing(): PipelinePricingInfo[] {
    const allPipelines = getAllPipelines();
    const pricingInfos: PipelinePricingInfo[] = [];

    allPipelines.forEach(config => {
      const pricingInfo = this.getPipelinePricingInfo(config.id);
      if (pricingInfo) {
        pricingInfos.push(pricingInfo);
      }
    });

    return pricingInfos;
  }

  /**
   * Получает информацию о ценах для пайплайнов определенной категории
   */
  static getPipelinesPricingByCategory(category: string): PipelinePricingInfo[] {
    return this.getAllPipelinesPricing().filter(info => info.category === category);
  }

  /**
   * Рассчитывает стоимость для пайплайна генерации одного поля библии
   */
  static calculateSingleFieldBibleCost(fieldOperationId: string): PipelineCost | null {
    const config = createSingleFieldBibleConfig(fieldOperationId);
    
    const operationBreakdown: OperationCost[] = [];
    let totalCredits = 0;

    config.operations.forEach(operation => {
      const operationQualityLevel = operation.qualityLevel || QualityLevel.STANDARD;
      const operationCost = this.calculateOperationCostDetails(operation.id, operationQualityLevel);
      
      operationBreakdown.push(operationCost);
      totalCredits += operationCost.credits;
    });

    return {
      pipelineId: config.id,
      pipelineName: config.name,
      qualityLevel: QualityLevel.STANDARD,
      totalCredits,
      totalUSD: totalCredits * USD_PER_CREDIT,
      operationBreakdown,
      metadata: {
        operationsCount: config.operations.length,
        category: config.category,
        complexity: config.metadata?.complexity || 'low',
        estimatedDuration: config.metadata?.estimatedDuration || 20
      }
    };
  }

  /**
   * Получает статистику по ценам всех пайплайнов
   */
  static getPricingStatistics() {
    const allPricingInfos = this.getAllPipelinesPricing();
    
    const allCosts = allPricingInfos.flatMap(info => 
      Object.values(info.pricing).map(cost => cost.totalCredits)
    );

    const categories = [...new Set(allPricingInfos.map(info => info.category))];
    
    let cheapestPipeline: { pipelineId: string; credits: number } | null = null;
    let mostExpensivePipeline: { pipelineId: string; credits: number } | null = null;

    allPricingInfos.forEach(info => {
      const minCredits = info.priceRange.minCredits;
      const maxCredits = info.priceRange.maxCredits;

      if (!cheapestPipeline || minCredits < cheapestPipeline.credits) {
        cheapestPipeline = { pipelineId: info.pipelineId, credits: minCredits };
      }

      if (!mostExpensivePipeline || maxCredits > mostExpensivePipeline.credits) {
        mostExpensivePipeline = { pipelineId: info.pipelineId, credits: maxCredits };
      }
    });

    return {
      totalPipelines: allPricingInfos.length,
      categories,
      priceRange: {
        min: Math.min(...allCosts),
        max: Math.max(...allCosts),
        average: allCosts.reduce((sum, cost) => sum + cost, 0) / allCosts.length
      },
      cheapestPipeline,
      mostExpensivePipeline,
      usdPerCredit: USD_PER_CREDIT
    };
  }

  /**
   * Создает конфигурацию для клиента (упрощенная версия без внутренних деталей)
   */
  static createClientPricingConfig() {
    const allPricingInfos = this.getAllPipelinesPricing();
    const statistics = this.getPricingStatistics();

    return {
      version: new Date().toISOString(),
      generatedAt: Date.now(),
      pipelines: allPricingInfos.reduce((acc, info) => {
        // Используем стандартное качество как базовую цену пайплайна
        // поскольку качество задается на уровне операций
        const basePrice = info.pricing[QualityLevel.STANDARD].totalCredits;
        
        acc[info.pipelineId] = {
          id: info.pipelineId,
          // name: info.pipelineName,
          // description: info.description,
          category: info.category,
          credits: basePrice,
          metadata: {
            // complexity: info.metadata.complexity,
            estimatedDuration: info.metadata.estimatedDuration,
            operationsCount: info.metadata.operationsCount,
            // tags: info.metadata.tags
          }
        };
        return acc;
      }, {} as Record<string, any>),
      statistics: {
        totalPipelines: statistics.totalPipelines,
        categories: statistics.categories
      }
    };
  }
}
