import { BaseBibleGenerationOperation } from './base-bible-generation.operation';

/**
 * Операция генерации уникальных особенностей проекта
 */
export class UniqueFeaturesGenerationOperation extends BaseBibleGenerationOperation {
  protected fieldType = 'uniqueFeatures';
  protected defaultCreativityLevel = 0.8;
  protected defaultTemperature = 0.8;
  protected maxTokens = 10000; // Увеличено в 2 раза для Gemini
  protected maxContentLength = 500;

  constructor() {
    super('unique_features_generation', 'Unique Features Generation', '1.0.0');
  }

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Определение уникальных особенностей творческих проектов

Твоя экспертиза: анализ конкурентов, инновации, дифференциация

Принципы: конкретность, инновационность, маркетинговая ценность`;
  }

  protected getFieldSpecificInstructions(): string {
    return `УКАЖИ ЧТО ДЕЛАЕТ ПРОЕКТ УНИКАЛЬНЫМ:
- Оригинальные элементы сюжета/мира
- Инновационные подходы к жанру
- Отличия от похожих проектов
- Конкурентные преимущества
- Запоминающиеся детали

ВАЖНО: Максимальная длина описания уникальных особенностей - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(уникальные особенности):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации уникальных особенностей.';
  }
}