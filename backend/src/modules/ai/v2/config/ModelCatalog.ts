// backend/src/modules/ai/v2/config/ModelCatalog.ts
import { AIProvider, AnthropicModel, GeminiModel, OpenAIModel, ModelCostInfo } from '../shared/types';

interface CatalogModelConfig {
  temperature: number;
  maxTokens: number;
  timeout: number;
  retries: number;
}

// Это наш "прайс-лист" от провайдеров - только стоимость
export const ModelCostCatalog: Record<AIProvider, Record<string, ModelCostInfo>> = {
  [AIProvider.OPENAI]: {
    [OpenAIModel.GPT_4O_MINI]: { inputCostPerMillionTokens: 0.15, outputCostPerMillionTokens: 0.60 },
    [OpenAIModel.GPT_4O]: { inputCostPerMillionTokens: 5.00, outputCostPerMillionTokens: 15.00 },
    [OpenAIModel.O1_PREVIEW]: { inputCostPerMillionTokens: 10.00, outputCostPerMillionTokens: 30.00 },
  },
  [AIProvider.GEMINI]: {
     [GeminiModel.FLASH_LITE]: { inputCostPerMillionTokens: 0.15, outputCostPerMillionTokens: 0.30 },
     [GeminiModel.FLASH]: { inputCostPerMillionTokens: 0.35, outputCostPerMillionTokens: 0.70 },
     [GeminiModel.PRO]: { inputCostPerMillionTokens: 3.50, outputCostPerMillionTokens: 10.50 },
  },
  [AIProvider.ANTHROPIC]: {
     [AnthropicModel.SONNET]: { inputCostPerMillionTokens: 3.00, outputCostPerMillionTokens: 15.00 },
  },
  [AIProvider.N_A]: {
    ['unknown']: { inputCostPerMillionTokens: 0.00, outputCostPerMillionTokens: 0.00 },
  }
};

// Технические параметры моделей (без стоимости)
export const ModelCatalog: Record<AIProvider, Record<string, CatalogModelConfig>> = {
  [AIProvider.OPENAI]: {
    [OpenAIModel.GPT_4O_MINI]: { temperature: 0.7, maxTokens: 4096, timeout: 20000, retries: 1 },
    [OpenAIModel.GPT_4O]: { temperature: 0.6, maxTokens: 4096, timeout: 45000, retries: 1 },
    [OpenAIModel.O1_PREVIEW]: { temperature: 0.3, maxTokens: 8192, timeout: 90000, retries: 1 },
  },
  [AIProvider.GEMINI]: {
     [GeminiModel.FLASH_LITE]: { temperature: 0.8, maxTokens: 10000, timeout: 15000, retries: 1 },
     [GeminiModel.FLASH]: { temperature: 0.8, maxTokens: 10000, timeout: 15000, retries: 1 },
     [GeminiModel.PRO]: { temperature: 0.5, maxTokens: 10000, timeout: 50000, retries: 1 },
  },
  [AIProvider.ANTHROPIC]: {
     [AnthropicModel.SONNET]: { temperature: 0.5, maxTokens: 4096, timeout: 60000, retries: 1 },
  },
  [AIProvider.N_A]: {
    ['unknown']: { temperature: 0.0, maxTokens: 0, timeout: 0, retries: 0 },
  }
};

/**
 * Получает информацию о стоимости модели
 */
export function getModelCost(provider: AIProvider, model: string): ModelCostInfo | null {
  const providerCosts = ModelCostCatalog[provider];
  if (!providerCosts) {
    console.warn(`No cost information found for provider: ${provider}`);
    return null;
  }
  
  const modelCost = providerCosts[model];
  if (!modelCost) {
    console.warn(`No cost information found for model: ${model} from provider: ${provider}`);
    return null;
  }
  
  return modelCost;
}
