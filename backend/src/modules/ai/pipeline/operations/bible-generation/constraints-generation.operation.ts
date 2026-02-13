import { BaseBibleGenerationOperation } from './base-bible-generation.operation';

/**
 * Операция генерации ограничений проекта
 */
export class ConstraintsGenerationOperation extends BaseBibleGenerationOperation {
  protected fieldType = 'constraints';
  protected defaultCreativityLevel = 0.5;
  protected defaultTemperature = 0.6;
  protected maxTokens = 10000;
  protected maxContentLength = 1500;

  constructor() {
    super('constraints_generation', 'Constraints Generation', '1.0.0');
  }

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Определение ограничений и оговорок для творческих проектов

Твоя экспертиза: продакшн, бюджеты, технические ограничения, цензура

Принципы: реалистичность, практичность, конкретность`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ОПРЕДЕЛИ ОГРАНИЧЕНИЯ:
- Бюджетные ограничения
- Технические ограничения
- Временные рамки
- Цензурные ограничения
- Платформенные требования
- Кастинг и локации
- Правовые ограничения

Будь реалистичным и практичным.

ВАЖНО: Максимальная длина описания ограничений - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(ограничения):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации ограничений.';
  }
}