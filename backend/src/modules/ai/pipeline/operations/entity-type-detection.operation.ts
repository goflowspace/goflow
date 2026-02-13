import { BaseOperation } from '../base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../interfaces/operation.interface';
import { AIProviderFactory } from '../../providers/ai-provider.factory';
import { AIProvider } from '@prisma/client';

/**
 * Входные данные для определения типа сущности
 */
interface EntityTypeDetectionInput {
  userDescription: string;
  availableEntityTypes: Array<{
    id: string;
    type: string;
    name: string;
    description?: string;
    parameters: Array<{
      id: string;
      name: string;
      valueType: string;
      required: boolean;
    }>;
  }>;
  projectContext?: {
    synopsis?: string;
    genres?: string[];
    atmosphere?: string;
  };
  preferredEntityType?: string; // Если пользователь явно указал тип
}

/**
 * Результат определения типа сущности
 */
interface EntityTypeDetectionOutput {
  selectedEntityType: {
    id: string;
    type: string;
    name: string;
    description?: string;
    parameters: Array<{
      id: string;
      name: string;
      valueType: string;
      required: boolean;
    }>;
  };
  confidence: number; // 0-1, уверенность в выборе
  reasoning: string; // Объяснение выбора
  alternatives?: Array<{
    type: string;
    name: string;
    confidence: number;
    reason: string;
  }>; // Альтернативные варианты
  content?: string; // Для pipeline engine
  explanation?: string; // Для pipeline engine
}

/**
 * Операция для определения типа сущности на основе описания пользователя
 */
export class EntityTypeDetectionOperation extends BaseOperation {
  constructor() {
    super(
      'entity_type_detection',
      'Entity Type Detection',
      '1.0.0',
      AIOperationCategory.CONTENT_ANALYSIS,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: ['text_analysis', 'classification'],
        maxTokens: 2000,
        timeout: 15000
      }
    );
  }

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input) {
      errors.push('Input is required');
    }

    if (!input.userDescription || typeof input.userDescription !== 'string') {
      errors.push('User description is required and must be a string');
    }

    if (!input.availableEntityTypes || !Array.isArray(input.availableEntityTypes)) {
      errors.push('Available entity types are required and must be an array');
    }

    if (input.availableEntityTypes && input.availableEntityTypes.length === 0) {
      errors.push('At least one entity type must be available');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(
    input: EntityTypeDetectionInput,
    _context: ExecutionContext
  ): Promise<{ data: EntityTypeDetectionOutput; tokensUsed?: number; model?: string }> {
    const { userDescription, availableEntityTypes, projectContext, preferredEntityType } = input;

    try {
      console.log(`🎯 Detecting entity type for description: "${userDescription.substring(0, 100)}..."`);

      // Если пользователь явно указал предпочтительный тип, проверяем его существование
      if (preferredEntityType) {
        const preferredType = availableEntityTypes.find(
          type => type.type === preferredEntityType || type.id === preferredEntityType
        );
        
        if (preferredType) {
          console.log(`✅ Using preferred entity type: ${preferredType.name}`);
          return {
            data: {
              selectedEntityType: preferredType,
              confidence: 1.0,
              reasoning: `Пользователь явно указал тип сущности: ${preferredType.name}`
            },
            tokensUsed: 0,
            model: 'user-preference'
          };
        }
      }

      // Используем AI для анализа
      const provider = AIProviderFactory.create(AIProvider.GEMINI);

      // Построение промпта для классификации
      const prompt = this.buildClassificationPrompt(userDescription, availableEntityTypes, projectContext);

      console.log(`🤖 Requesting AI classification for entity type`);

      // Используем метод классификации для правильного формата ответа
      const response = await (provider as any).classifyText(prompt, 0.2);

      // Парсим результат AI
      const result = this.parseAIResponse(response.content || '{}', availableEntityTypes);

      console.log(`✅ Entity type detected: ${result.selectedEntityType.name} (confidence: ${result.confidence})`);

      return {
        data: {
          ...result,
          content: `Определён тип сущности: ${result.selectedEntityType.name}`,
          explanation: `Выбран тип сущности "${result.selectedEntityType.name}" с уровнем уверенности ${Math.round(result.confidence * 100)}%. ${result.reasoning}`
        },
        tokensUsed: response.metadata.tokensUsed || this.estimateTokenUsage(prompt, response.content || ''),
        model: response.metadata.model
      };

    } catch (error) {
      console.error('❌ Entity type detection failed:', error);
      throw new Error(`Entity type detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Построение промпта для классификации типа сущности
   */
  private buildClassificationPrompt(
    userDescription: string, 
    availableTypes: EntityTypeDetectionInput['availableEntityTypes'],
    projectContext?: EntityTypeDetectionInput['projectContext']
  ): string {
    const typesDescription = availableTypes.map(type => 
      `- ${type.name} (${type.type}): ${type.description || 'Нет описания'}\n  Параметры: ${type.parameters.map(p => p.name).join(', ')}`
    ).join('\n');

    const contextInfo = projectContext ? `
Контекст проекта:
- Синопсис: ${projectContext.synopsis || 'Не указан'}
- Жанры: ${projectContext.genres?.join(', ') || 'Не указаны'}
- Атмосфера: ${projectContext.atmosphere || 'Не указана'}
` : '';

    return `Ты эксперт по анализу и классификации сущностей в творческих проектах.

ЗАДАЧА: Определи наиболее подходящий тип сущности для описания пользователя.

ОПИСАНИЕ ПОЛЬЗОВАТЕЛЯ:
"${userDescription}"

${contextInfo}

ДОСТУПНЫЕ ТИПЫ СУЩНОСТЕЙ:
${typesDescription}

ТРЕБОВАНИЯ К ОТВЕТУ:
1. Выбери ОДИН наиболее подходящий тип сущности
2. Оцени уверенность в выборе (0.0-1.0)
3. Дай краткое объяснение выбора
4. Предложи до 2 альтернативных вариантов с обоснованием

Ответь СТРОГО в формате JSON:
{
  "selectedType": "тип_сущности",
  "confidence": 0.95,
  "reasoning": "Краткое объяснение выбора",
  "alternatives": [
    {
      "type": "альтернативный_тип",
      "confidence": 0.3,
      "reason": "Причина рассмотрения этого варианта"
    }
  ]
}`;
  }

  /**
   * Парсинг ответа AI и приведение к нужному формату
   */
  private parseAIResponse(
    aiResponse: string, 
    availableTypes: EntityTypeDetectionInput['availableEntityTypes']
  ): EntityTypeDetectionOutput {
    try {
      // Пытаемся извлечь JSON из ответа
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response does not contain valid JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Находим выбранный тип сущности
      const selectedType = availableTypes.find(
        type => type.type === parsed.selectedType || type.name === parsed.selectedType
      );

      if (!selectedType) {
        throw new Error(`Selected entity type "${parsed.selectedType}" not found in available types`);
      }

      // Обрабатываем альтернативы
      const alternatives = (parsed.alternatives || [])
        .map((alt: any) => {
          const altType = availableTypes.find(
            type => type.type === alt.type || type.name === alt.type
          );
          if (altType) {
            return {
              type: altType.type,
              name: altType.name,
              confidence: Math.max(0, Math.min(1, alt.confidence || 0)),
              reason: alt.reason || 'Не указана причина'
            };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 2); // Максимум 2 альтернативы

      return {
        selectedEntityType: selectedType,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'AI не предоставил объяснение',
        alternatives
      };

    } catch (error) {
      console.warn('Failed to parse AI response, using fallback:', error);
      
      // Fallback: выбираем первый доступный тип
      const fallbackType = availableTypes[0];
      return {
        selectedEntityType: fallbackType,
        confidence: 0.3,
        reasoning: 'Не удалось определить тип автоматически. Использован тип по умолчанию.'
      };
    }
  }

  /**
   * Оценка использования токенов
   */
  private estimateTokenUsage(prompt: string, response: string): number {
    // Приблизительная оценка: ~4 символа = 1 токен
    return Math.ceil((prompt.length + response.length) / 4);
  }

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    // Оценка стоимости на основе размера описания
    const descriptionLength = input.userDescription?.length || 0;
    const typesCount = input.availableEntityTypes?.length || 0;
    
    // Базовая стоимость + стоимость за объем данных
    return 5 + Math.ceil(descriptionLength / 100) + Math.ceil(typesCount / 10);
  }
}