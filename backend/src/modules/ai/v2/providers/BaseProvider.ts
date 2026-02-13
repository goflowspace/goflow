// backend/src/modules/ai/v2/providers/BaseProvider.ts
import { ModelConfig } from '../shared/types';

/**
 * Стандартизированный ответ от любого AI-провайдера.
 */
export interface AIProviderResponse {
  // Сгенерированный контент
  content: string;
  // Информация об использованных токенах, полученная от провайдера
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Интерфейс, который должен реализовывать каждый класс-провайдер.
 */
export interface IAIProvider {
  generate(
    modelConfig: ModelConfig,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<AIProviderResponse>;
}

