// backend/src/modules/ai/v2/services/CostService.ts
import { ModelConfig } from '../shared/types';
import { getModelCost } from '../config/ModelCatalog';

export class CostService {
  /**
   * Рассчитывает реальную стоимость вызова AI на основе количества токенов.
   * @param modelConfig - Конфигурация модели (без информации о стоимости).
   * @param inputTokens - Количество входных токенов.
   * @param outputTokens - Количество выходных токенов.
   * @returns реальная стоимость в USD.
   */
  static calculateRealCost(
    modelConfig: ModelConfig,
    inputTokens: number,
    outputTokens: number
  ): number {
    const costInfo = getModelCost(modelConfig.provider, modelConfig.model);
    if (!costInfo) {
      console.warn(`No cost information available for ${modelConfig.provider}:${modelConfig.model}`);
      return 0;
    }
    
    const inputCost = (inputTokens / 1_000_000) * costInfo.inputCostPerMillionTokens;
    const outputCost = (outputTokens / 1_000_000) * costInfo.outputCostPerMillionTokens;
    return inputCost + outputCost;
  }

  /**
   * Рассчитывает маржинальность операции.
   * @param realCostUSD - Реальная стоимость в USD.
   * @param creditsCharged - Количество списанных кредитов.
   * @param usdPerCredit - Стоимость одного кредита в USD.
   * @returns Маржа в процентах.
   */
  static calculateMargin(
    realCostUSD: number,
    creditsCharged: number,
    usdPerCredit: number
  ): number {
    const revenueUSD = creditsCharged * usdPerCredit;
    if (revenueUSD === 0) return 0;

    const margin = ((revenueUSD - realCostUSD) / revenueUSD) * 100;
    return margin;
  }
}

