import { BaseBibleGenerationOperation } from './base-bible-generation.operation';

/**
 * Операция генерации референсов и аналогов проекта
 */
export class ReferencesGenerationOperation extends BaseBibleGenerationOperation {
  protected fieldType = 'references';
  protected defaultCreativityLevel = 0.6;
  protected defaultTemperature = 0.7;
  protected maxTokens = 10000; // Увеличено в 2 раза для Gemini
  protected maxContentLength = 500;

  constructor() {
    super('references_generation', 'References Generation', '1.0.0');
  }

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Подбор референсов и аналогов для творческих проектов

Твоя экспертиза: кино/сериалы/книги/игры, жанровые конвенции, культурные влияния

Принципы: релевантность, разнообразие, объяснение связей`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ПОДБЕРИ РЕЛЕВАНТНЫЕ РЕФЕРЕНСЫ:
- 3-5 конкретных произведений
- Объясни сходства и различия
- Разные медиа (кино/книги/сериалы)
- Классика + современность
- Коммерческие ссылки

Формат: "Название (год) - объяснение сходства"

ВАЖНО: Максимальная длина описания референсов - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(референсы|аналоги):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации референсов.';
  }
}