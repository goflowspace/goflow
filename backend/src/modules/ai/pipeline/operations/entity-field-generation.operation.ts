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
 * Входные данные для генерации полей сущности
 */
interface EntityFieldGenerationInput {
  userDescription: string;
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
      order: number;
      options?: String[];
    }>;
  };
  projectContext?: {
    synopsis?: string;
    logline?: string;
    genres?: string[];
    atmosphere?: string;
    mainThemes?: string;
  };
  existingEntities?: Array<{
    id: string;
    name: string;
    description?: string;
    entityType: {
      type: string;
      name: string;
    };
  }>;
  entityRelationships?: Array<{
    fromEntityId: string;
    toEntityId: string;
    relationType: string;
  }>;
}

/**
 * Результат генерации полей сущности
 */
interface EntityFieldGenerationOutput {
  entityName: string;
  entityDescription?: string;
  generatedFields: Record<string, any>; // parameterId -> value
  fieldExplanations: Record<string, string>; // parameterId -> explanation
  suggestedRelationships?: Array<{
    relatedEntityId: string;
    relatedEntityName: string;
    relationType: string;
    explanation: string;
  }>;
  generationMetadata: {
    totalFields: number;
    filledFields: number;
    skippedFields: string[];
    confidence: number;
  };
  content?: string; // Для pipeline engine
  explanation?: string; // Для pipeline engine
}

/**
 * Операция для генерации значений полей сущности через ИИ
 */
export class EntityFieldGenerationOperation extends BaseOperation {
  constructor() {
    super(
      'entity_field_generation',
      'Entity Field Generation',
      '1.0.0',
      AIOperationCategory.CONTENT_GENERATION,
      ComplexityLevel.HEAVY,
      {
        requiredCapabilities: ['text_generation', 'context_understanding'],
        maxTokens: 10000, // Увеличено для Gemini
        timeout: 45000
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

    if (!input.selectedEntityType) {
      errors.push('Selected entity type is required');
    }

    if (!input.selectedEntityType?.parameters || !Array.isArray(input.selectedEntityType.parameters)) {
      errors.push('Entity type parameters are required and must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(
    input: EntityFieldGenerationInput,
    _context: ExecutionContext
  ): Promise<{ data: EntityFieldGenerationOutput; tokensUsed?: number; model?: string }> {
    const { userDescription, selectedEntityType, projectContext, existingEntities } = input;

    try {
      console.log(`🎨 Generating fields for entity type: ${selectedEntityType.name}`);
      console.log(`📝 User description: "${userDescription.substring(0, 100)}..."`);

      const provider = AIProviderFactory.create(AIProvider.GEMINI);

      // Построение комплексного промпта
      const prompt = this.buildGenerationPrompt(
        userDescription,
        selectedEntityType,
        projectContext,
        existingEntities
      );

      console.log(`🤖 Requesting AI generation for ${selectedEntityType.parameters.length} fields`);

      // Создаем правильные промпты для генерации сущности
      const systemPrompt = `Ты эксперт по созданию детальных персонажей, локаций и других элементов для творческих проектов.

Твоя задача - создать детальную сущность на основе описания пользователя.

Отвечай ТОЛЬКО в формате JSON.`;

      const response = await (provider as any).callAIWithMetadata(systemPrompt, prompt, 0.7);

      // Парсим и валидируем результат
      const result = this.parseGenerationResult(response.content || '{}', selectedEntityType);

      console.log(`✅ Generated ${result.generatedFields ? Object.keys(result.generatedFields).length : 0} fields`);
      console.log(`🎯 Generation confidence: ${result.generationMetadata.confidence}`);

      return {
        data: {
          ...result,
          content: `Сгенерирована сущность: ${result.entityName}`,
          explanation: `Создана сущность "${result.entityName}" с ${result.generationMetadata.filledFields} заполненными полями из ${result.generationMetadata.totalFields} возможных. Уровень уверенности: ${Math.round(result.generationMetadata.confidence * 100)}%`
        },
        tokensUsed: response.metadata.tokensUsed || this.estimateTokenUsage(prompt, response.content || ''),
        model: response.metadata.model
      };

    } catch (error) {
      console.error('❌ Entity field generation failed:', error);
      throw new Error(`Entity field generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Построение промпта для генерации полей сущности
   */
  private buildGenerationPrompt(
    userDescription: string,
    entityType: EntityFieldGenerationInput['selectedEntityType'],
    projectContext?: EntityFieldGenerationInput['projectContext'],
    existingEntities?: EntityFieldGenerationInput['existingEntities']
  ): string {
    // Описание параметров сущности
    const parametersDescription = entityType.parameters
      .sort((a, b) => a.order - b.order)
      .map(param => {
        let paramDesc = `- "${param.id}": ${param.name} (${param.valueType})`;
        if (param.required) paramDesc += ' [ОБЯЗАТЕЛЬНЫЙ]';
        
        // Добавляем варианты для SINGLE_SELECT и MULTI_SELECT
        if ((param.valueType === 'SINGLE_SELECT' || param.valueType === 'MULTI_SELECT') && param.options) {
          if (param.options.length > 0) {
            paramDesc += `\n  Варианты: ${param.options.join(', ')}`;
          }
        }
        
        return paramDesc;
      }).join('\n');

    // Контекст проекта
    const contextInfo = projectContext ? `
КОНТЕКСТ ПРОЕКТА:
- Синопсис: ${projectContext.synopsis || 'Не указан'}
- Логлайн: ${projectContext.logline || 'Не указан'}
- Жанры: ${projectContext.genres?.join(', ') || 'Не указаны'}
- Атмосфера: ${projectContext.atmosphere || 'Не указана'}
- Основные темы: ${projectContext.mainThemes || 'Не указаны'}
` : '';

    // Существующие сущности для связей
    const entitiesInfo = existingEntities && existingEntities.length > 0 ? `
СУЩЕСТВУЮЩИЕ СУЩНОСТИ В ПРОЕКТЕ:
${existingEntities.slice(0, 20).map(entity => 
  `- ${entity.name} (${entity.entityType.name}): ${entity.description || 'Без описания'}`
).join('\n')}
${existingEntities.length > 20 ? `\n... и еще ${existingEntities.length - 20} сущностей` : ''}
` : '';

    // Инструкции по связям
    const relationshipInstructions = `
ИНСТРУКЦИИ ПО СВЯЗЯМ:
- Для параметров типа SINGLE_ENTITY и MULTI_ENTITY предлагай связи с существующими сущностями
- Основывайся на синопсисе и логике проекта
- Связи должны быть логичными и обогащать повествование
- Если подходящих существующих сущностей нет, оставь поле пустым или предложи создать новую
`;

    return `Ты эксперт по созданию детальных персонажей, локаций и других элементов для творческих проектов.

ЗАДАЧА: Создай полную сущность типа "${entityType.name}" на основе описания пользователя.

ОПИСАНИЕ ПОЛЬЗОВАТЕЛЯ:
"${userDescription}"

${contextInfo}
${entitiesInfo}
${relationshipInstructions}

ПАРАМЕТРЫ ДЛЯ ЗАПОЛНЕНИЯ:
${parametersDescription}

ТРЕБОВАНИЯ К ОТВЕТУ:
1. Придумай подходящее имя для сущности
2. Создай краткое описание сущности (2-3 предложения)
3. Заполни ВСЕ возможные параметры творчески и детально
4. Для текстовых полей используй 2-4 предложения, богатые деталями
5. Для параметров-связей (SINGLE_ENTITY, MULTI_ENTITY) используй ID существующих сущностей, если они подходят
6. Дай краткое объяснение для каждого заполненного поля
7. Предложи логичные связи с существующими сущностями

ОСОБЕННОСТИ ПО ТИПАМ ПОЛЕЙ:
- TEXT/SHORT_TEXT: Детальные описания, избегай общих фраз
- NUMBER: Конкретные значения, соответствующие контексту
- SINGLE_SELECT/MULTI_SELECT: Выбирай из предложенных вариантов
- SINGLE_ENTITY: ID одной связанной сущности
- MULTI_ENTITY: Массив ID связанных сущностей

Ответь СТРОГО в формате JSON:
{
  "entityName": "Имя сущности",
  "entityDescription": "Краткое описание сущности",
  "fields": {
    // Используй ТОЛЬКО ID параметров из списка выше!
    // Например: "id_параметра": "значение"
  },
  "explanations": {
    // Используй те же ID параметров
    // "id_параметра": "Объяснение выбора"
  },
  "suggestedRelationships": [
    {
      "relatedEntityId": "id_сущности",
      "relatedEntityName": "Имя сущности",
      "relationType": "Тип связи",
      "explanation": "Объяснение связи"
    }
  ],
  "confidence": 0.95
}`;
  }

  /**
   * Парсинг результата генерации
   */
  private parseGenerationResult(
    aiResponse: string,
    entityType: EntityFieldGenerationInput['selectedEntityType']
  ): EntityFieldGenerationOutput {
    try {
      // Извлекаем JSON из ответа
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response does not contain valid JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const generatedFields: Record<string, any> = {};
      const fieldExplanations: Record<string, string> = {};
      const skippedFields: string[] = [];

      // Обрабатываем каждый параметр
      for (const param of entityType.parameters) {
        const fieldValue = parsed.fields?.[param.id];
        const explanation = parsed.explanations?.[param.id];

        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          // Валидируем и преобразуем значение в зависимости от типа
          const validatedValue = this.validateAndTransformValue(fieldValue, param);
          if (validatedValue !== null) {
            generatedFields[param.id] = validatedValue;
            if (explanation) {
              fieldExplanations[param.id] = explanation;
            }
          } else {
            skippedFields.push(param.name);
          }
        } else if (param.required) {
          // Для обязательных полей создаем значение по умолчанию
          const defaultValue = this.getDefaultValue(param);
          if (defaultValue !== null) {
            generatedFields[param.id] = defaultValue;
            fieldExplanations[param.id] = 'Значение по умолчанию для обязательного поля';
          } else {
            skippedFields.push(param.name);
          }
        } else {
          skippedFields.push(param.name);
        }
      }

      // Обрабатываем предложенные связи
      const suggestedRelationships = (parsed.suggestedRelationships || [])
        .filter((rel: any) => rel.relatedEntityId && rel.relationType)
        .map((rel: any) => ({
          relatedEntityId: rel.relatedEntityId,
          relatedEntityName: rel.relatedEntityName || 'Неизвестная сущность',
          relationType: rel.relationType,
          explanation: rel.explanation || 'Связь не объяснена'
        }));

      return {
        entityName: parsed.entityName || 'Новая сущность',
        entityDescription: parsed.entityDescription,
        generatedFields,
        fieldExplanations,
        suggestedRelationships,
        generationMetadata: {
          totalFields: entityType.parameters.length,
          filledFields: Object.keys(generatedFields).length,
          skippedFields,
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7))
        }
      };

    } catch (error) {
      console.warn('Failed to parse AI generation result:', error);
      
      // Fallback: создаем минимальную сущность
      return {
        entityName: 'Новая сущность',
        entityDescription: 'Описание не сгенерировано',
        generatedFields: {},
        fieldExplanations: {},
        generationMetadata: {
          totalFields: entityType.parameters.length,
          filledFields: 0,
          skippedFields: entityType.parameters.map(p => p.name),
          confidence: 0.1
        }
      };
    }
  }

  /**
   * Валидация и трансформация значения в зависимости от типа параметра
   */
  private validateAndTransformValue(value: any, parameter: { valueType: string; options?: String[] }): any {
    switch (parameter.valueType) {
      case 'TEXT':
      case 'SHORT_TEXT':
        return typeof value === 'string' ? value.trim() : String(value);

      case 'NUMBER':
        const num = Number(value);
        return isNaN(num) ? null : num;

      case 'SINGLE_SELECT':
        if (typeof value !== 'string') return null;
        const options = parameter.options || [];
        return options.includes(value) ? value : null;

      case 'MULTI_SELECT':
        if (!Array.isArray(value)) return null;
        const multiOptions = parameter.options || [];
        const validValues = value.filter(v => multiOptions.includes(v));
        return validValues.length > 0 ? validValues : null;

      case 'SINGLE_ENTITY':
        if (typeof value === 'object' && value.entityId) {
          return { entityId: value.entityId };
        }
        return typeof value === 'string' ? { entityId: value } : null;

      case 'MULTI_ENTITY':
        if (Array.isArray(value)) {
          return { entityIds: value };
        }
        if (typeof value === 'object' && Array.isArray(value.entityIds)) {
          return value;
        }
        return null;

      default:
        return value;
    }
  }

  /**
   * Получение значения по умолчанию для обязательного поля
   */
  private getDefaultValue(parameter: { valueType: string; name: string }): any {
    switch (parameter.valueType) {
      case 'TEXT':
      case 'SHORT_TEXT':
        return `Описание для ${parameter.name}`;
      case 'NUMBER':
        return 1;
      case 'SINGLE_SELECT':
      case 'MULTI_SELECT':
        return null; // Не можем создать значение по умолчанию без вариантов
      case 'SINGLE_ENTITY':
      case 'MULTI_ENTITY':
        return null; // Не можем создать связь без существующих сущностей
      default:
        return null;
    }
  }

  /**
   * Оценка использования токенов
   */
  private estimateTokenUsage(prompt: string, response: string): number {
    return Math.ceil((prompt.length + response.length) / 4);
  }

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    const parametersCount = input.selectedEntityType?.parameters?.length || 0;
    const descriptionLength = input.userDescription?.length || 0;
    const entitiesCount = input.existingEntities?.length || 0;
    
    // Базовая стоимость + стоимость за параметры + контекст
    return 15 + parametersCount * 2 + Math.ceil(descriptionLength / 50) + Math.ceil(entitiesCount / 10);
  }
}