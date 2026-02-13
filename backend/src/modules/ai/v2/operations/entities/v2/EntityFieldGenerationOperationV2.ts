// backend/src/modules/ai/v2/operations/entities/EntityFieldGenerationOperationV2.ts
import { 
  EntityGenerationInput, 
  AbstractEntityGenerationOperation 
} from '../../../core/AbstractEntityGenerationOperation';
import { AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../../shared/types';

/**
 * Входные данные для генерации полей сущности v2
 */
export interface EntityFieldGenerationInputV2 extends EntityGenerationInput {
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
      order?: number;
      options?: String[];
    }>;
  };
  availableEntityTypes?: Array<{
    id: string;
    type: string;
    name: string;
    description?: string;
    parameters: Array<{
      id: string;
      name: string;
      valueType: string;
      required: boolean;
      order?: number;
      options?: String[];
    }>;
  }>;
  existingEntities?: Array<{
    id: string;
    name: string;
    description?: string;
    entityTypeId: string;
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
 * Выходные данные генерации полей сущности v2
 */
export interface EntityFieldGenerationOutputV2 extends AIOperationOutput {
  entityName: string;
  entityDescription?: string;
  generatedFields: Record<string, any>;
  suggestedRelationships?: Array<{
    targetEntityId: string;
    targetEntityName: string;
    relationType: string;
    reason: string;
  }>;
  fieldsExplanation: string;
  warnings?: string[];
}

/**
 * Операция генерации полей сущности v2
 * Использует новую архитектуру с централизованными провайдерами
 */
export class EntityFieldGenerationOperationV2 extends AbstractEntityGenerationOperation<
  EntityFieldGenerationInputV2,
  EntityFieldGenerationOutputV2
> {
  readonly id = 'entity-field-generation-v2';
  readonly name = 'Entity Field Generation V2';
  readonly version = '2.0.0';

  // Конфигурация AI для разных уровней качества
  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.7,
        maxTokens: 3000,
        retries: 1,
        timeout: 30000
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.8,
        maxTokens: 4000,
        retries: 1,
        timeout: 35000
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.9,
        maxTokens: 5000,
        retries: 1,
        timeout: 50000
      }
    }
  };

  /**
   * Дополнительная валидация входных данных
   */
  protected validateAdditional(input: EntityFieldGenerationInputV2): string[] {
    const errors: string[] = [];

    if (!input.projectId || typeof input.projectId !== 'string') {
      errors.push('projectId обязателен и должен быть строкой');
    }

    if (!input.userDescription || typeof input.userDescription !== 'string') {
      errors.push('userDescription обязателен и должен быть строкой');
    }

    if (input.userDescription && input.userDescription.length < 5) {
      errors.push('userDescription должен быть не менее 5 символов');
    }

    if (!input.selectedEntityType) {
      errors.push('selectedEntityType обязателен');
    }

    if (!input.availableEntityTypes || !Array.isArray(input.availableEntityTypes)) {
      errors.push('availableEntityTypes обязателен и должен быть массивом');
    }

    if (input.selectedEntityType && input.availableEntityTypes) {
      const foundType = input.availableEntityTypes.find(et => et.id === input.selectedEntityType.id);
      if (!foundType) {
        errors.push('selectedEntityType не найден в availableEntityTypes');
      }
      if (foundType && (!foundType.parameters || !Array.isArray(foundType.parameters))) {
        errors.push('selectedEntityType должен содержать параметры');
      }
    }

    return errors;
  }

  /**
   * Генерация системного промпта
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
Ты - эксперт по созданию контента для творческих проектов. Твоя задача - сгенерировать все поля сущности на основе описания пользователя и типа сущности.

Твои основные принципы:
1. Создавай оригинальный и качественный контент
2. Учитывай контекст проекта и его стиль
3. Заполняй все обязательные поля и подходящие опциональные
4. Создавай логичные связи с существующими сущностями
5. Следуй требованиям типов данных полей
6. Будь креативным, но последовательным
</role>

<guidelines>
1. Внимательно изучи описание пользователя
2. Проанализируй тип сущности и его параметры
3. Учти контекст проекта и существующие сущности
4. Заполни все обязательные поля
5. Добавь подходящие опциональные поля
6. Создай имя и описание сущности
7. Предложи связи с другими сущностями (если уместно)
8. Объясни логику заполнения полей
</guidelines>

<field_types>
- SHORT_TEXT: Короткий текст
- TEXT: Длинный текст/описание
- NUMBER: Числовое значение
- BOOLEAN: true/false/да/нет
- SINGLE_SELECT: Выбор из предопределенных опций
- MULTI_SELECT: Множественный выбор из опций
- SINGLE_ENTITY: Ссылка на одну сущность
- MULTI_ENTITY: Ссылки на несколько сущностей
</field_types>

<output_format>
Отвечай ТОЛЬКО в формате JSON без дополнительного текста:

🚨 КРИТИЧЕСКИ ВАЖНО: В объекте "generatedFields" используй ТОЛЬКО ID параметров (указанные в скобках), НЕ их имена!

{
  "entityName": "Название сущности",
  "entityDescription": "Описание сущности (опционально)",
  "generatedFields": {
    "ID_ПАРАМЕТРА_1": "значение_поля_1",
    "ID_ПАРАМЕТРА_2": ["массив", "для", "multi_select"],
    "ID_ПАРАМЕТРА_3": {
      "entityId": "id_сущности"  // для SINGLE_ENTITY
    },
    "ID_ПАРАМЕТРА_4": {
      "entityIds": ["id1", "id2"]  // для MULTI_ENTITY
    }
  },
  "suggestedRelationships": [
    {
      "targetEntityId": "id_сущности",
      "targetEntityName": "название_сущности",
      "relationType": "тип_связи",
      "reason": "объяснение связи"
    }
  ],
  "fieldsExplanation": "Объяснение логики заполнения полей",
  "warnings": ["предупреждения_если_есть"]
}

❌ НЕПРАВИЛЬНО: "owner": {...} (использование имени)
✅ ПРАВИЛЬНО: "param_owner_123": {...} (использование ID)
</output_format>`;
  }

  /**
   * Генерация пользовательского промпта
   */
  protected getUserPrompt(input: EntityFieldGenerationInputV2, _context: ExecutionContext): string {    
    // Строим контекст проекта
    const contextPrompt = this.buildContextPrompt(input);
    
    // Информация о выбранном типе сущности
    const entityTypeInfo = `Тип сущности: ${input.selectedEntityType.name} (${input.selectedEntityType.type})
ID: ${input.selectedEntityType.id}
Описание: ${input.selectedEntityType.description || 'Не указано'}

Параметры для заполнения:`;

    const selectedEntityType = input.availableEntityTypes?.find(et => et.id === input.selectedEntityType?.id);
    const parametersInfo = selectedEntityType?.parameters
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(param => {
        let paramInfo = `🔑 ID: "${param.id}" — ${param.name}
  Тип: ${param.valueType}
  Обязательный: ${param.required ? 'Да' : 'Нет'}
  ⚠️ В JSON используй ИМЕННО ID: "${param.id}"`;

        // Добавляем информацию об опциях для SINGLE_SELECT/MULTI_SELECT
        if (param.options && (param.valueType === 'SINGLE_SELECT' || param.valueType === 'MULTI_SELECT')) {
          const availableOptions = param.options;
          if (availableOptions.length > 0) {
            paramInfo += `\n  📋 ОБЯЗАТЕЛЬНО используй ТОЛЬКО эти опции: ${availableOptions.join(', ')}`;
          }
        }

        return paramInfo;
      }).join('\n\n');

    // Информация о существующих сущностях
    const existingEntitiesInfo = input.existingEntities && input.existingEntities.length > 0
      ? `\n<existing_entities>
Существующие сущности в проекте:
${input.existingEntities.map(entity => 
  `• ${entity.name} (${entity.entityType.name}) - ID: ${entity.id}${entity.description ? '\n  Описание: ' + entity.description : ''}`
).join('\n')}
</existing_entities>`
      : '';

    // Кастомные инструкции
    const customInstructions = input.additionalContext?.customInstructions
      ? `\n<custom_instructions>
${input.additionalContext.customInstructions}
</custom_instructions>`
      : '';

    return `${contextPrompt}

<task>
Создай сущность на основе следующего описания:

"${input.userDescription}"

${entityTypeInfo}
${parametersInfo}
${existingEntitiesInfo}
${customInstructions}

🚨 КРИТИЧЕСКИ ВАЖНЫЕ ТРЕБОВАНИЯ:

🔑 САМОЕ ГЛАВНОЕ: В generatedFields используй ТОЛЬКО ID параметров (🔑 ID: "param_xxx"), НЕ их имена!

1. Придумай подходящее название сущности
2. Создай краткое описание (если уместно)
3. Заполни все обязательные поля
4. Добавь подходящие опциональные поля
5. Для SINGLE_ENTITY/MULTI_ENTITY полей предложи связи с существующими сущностями
6. Убедись, что значения соответствуют типам полей

⚠️ ДЛЯ SINGLE_SELECT/MULTI_SELECT ПОЛЕЙ:
- ЗАПРЕЩЕНО придумывать новые опции
- ОБЯЗАТЕЛЬНО используй ТОЛЬКО опции из списка "Доступные опции"
- Если подходящей опции нет, оставь поле пустым (null)
- НЕ создавай вариации или переводы существующих опций

7. Объясни логику заполнения

🚨 ПОВТОРЯЮ: Ключи в generatedFields = ID параметров, НЕ имена!

Будь креативным, но логичным. Создавай контент, который хорошо впишется в контекст проекта.
</task>`;
  }

  /**
   * Парсинг результата AI
   */
  parseResult(
    aiResult: string, 
    input: EntityFieldGenerationInputV2, 
    realCostUSD: number, 
    creditsCharged: number
  ): EntityFieldGenerationOutputV2 {
    try {
      const parsed = JSON.parse(aiResult.trim());

      // Валидируем структуру ответа
      if (!parsed.entityName || typeof parsed.entityName !== 'string') {
        throw new Error('Отсутствует или некорректное название сущности (entityName)');
      }

      if (!parsed.generatedFields || typeof parsed.generatedFields !== 'object') {
        throw new Error('Отсутствуют или некорректные сгенерированные поля (generatedFields)');
      }

      if (!parsed.fieldsExplanation || typeof parsed.fieldsExplanation !== 'string') {
        throw new Error('Отсутствует объяснение полей (fieldsExplanation)');
      }

            // Находим правильный тип сущности с параметрами
      const selectedEntityType = input.availableEntityTypes?.find(et => et.id === input.selectedEntityType?.id);
      if (!selectedEntityType) {
        throw new Error('Не найден выбранный тип сущности в availableEntityTypes');
      }

      // Валидируем, что все обязательные поля заполнены
      const requiredParams = selectedEntityType.parameters.filter(p => p.required);
      const missingRequired = requiredParams.filter(param => 
        !(param.id in parsed.generatedFields) || 
        parsed.generatedFields[param.id] === null || 
        parsed.generatedFields[param.id] === undefined ||
        parsed.generatedFields[param.id] === ''
      );

      if (missingRequired.length > 0) {
        throw new Error(`Не заполнены обязательные поля: ${missingRequired.map(p => p.name).join(', ')}`);
      }
        
      // Валидируем типы полей
      const warnings: string[] = [];
      const validatedFields: Record<string, any> = {};

      for (const [paramId, value] of Object.entries(parsed.generatedFields)) {
        const param = selectedEntityType.parameters.find(p => p.id === paramId);
        
        if (!param) {
          warnings.push(`Неизвестный параметр: ${paramId}`);
          continue;
        }

        // Валидация по типам
        const validationResult = this.validateFieldValue(param, value);
        if (validationResult.isValid) {
          validatedFields[paramId] = validationResult.value;
        } else {
          warnings.push(`Поле ${param.name}: ${validationResult.error}`);
        }
      }

      return {
        entityName: parsed.entityName.trim(),
        entityDescription: parsed.entityDescription || undefined,
        generatedFields: validatedFields,
        suggestedRelationships: parsed.suggestedRelationships || [],
        fieldsExplanation: parsed.fieldsExplanation,
        warnings: [...(parsed.warnings || []), ...warnings],
        metadata: {
          executionTime: 0, // Будет заполнено в AbstractAIOperation
          realCostUSD,
          creditsCharged,
          aiProvider: '', // Будет заполнено в AbstractAIOperation
          model: '', // Будет заполнено в AbstractAIOperation
          tokensUsed: {
            input: 0, // Будет заполнено в AbstractAIOperation
            output: 0 // Будет заполнено в AbstractAIOperation
          }
        }
      };

    } catch (error) {
      throw new Error(`Ошибка парсинга ответа AI: ${(error as Error).message}. Ответ: ${aiResult}`);
    }
  }

  /**
   * Валидация значения поля по его типу
   */
  private validateFieldValue(param: any, value: any): { isValid: boolean; value?: any; error?: string } {
    if (value === null || value === undefined) {
      if (param.required) {
        return { isValid: false, error: 'Обязательное поле не может быть пустым' };
      }
      return { isValid: true, value: null };
    }

    switch (param.valueType) {
      case 'SHORT_TEXT':
      case 'TEXT':
        if (typeof value !== 'string') {
          return { isValid: false, error: 'Должно быть строкой' };
        }
        return { isValid: true, value: value.trim() };

      case 'NUMBER':
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) {
          return { isValid: false, error: 'Должно быть числом' };
        }
        return { isValid: true, value: num };

      case 'BOOLEAN':
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (['true', '1', 'yes', 'да'].includes(lower)) {
            return { isValid: true, value: true };
          }
          if (['false', '0', 'no', 'нет'].includes(lower)) {
            return { isValid: true, value: false };
          }
          return { isValid: false, error: 'Должно быть булевым значением' };
        }
        return { isValid: true, value: Boolean(value) };

      case 'SINGLE_SELECT':
        if (typeof value !== 'string') {
          return { isValid: false, error: 'Должно быть строкой' };
        }
        if (param.options && Array.isArray(param.options)) {
          if (!param.options.includes(value)) {
            return { isValid: false, error: `Должно быть одним из: ${param.options.join(', ')}` };
          }
        }
        return { isValid: true, value };

      case 'MULTI_SELECT':
        if (!Array.isArray(value)) {
          return { isValid: false, error: 'Должно быть массивом' };
        }
        if (param.options && Array.isArray(param.options)) {
          const invalidOptions = value.filter(v => !param.options.includes(v));
          if (invalidOptions.length > 0) {
            return { isValid: false, error: `Недопустимые опции: ${invalidOptions.join(', ')}. Доступные: ${param.options.join(', ')}` };
          }
        }
        return { isValid: true, value };

      case 'SINGLE_ENTITY':
        if (typeof value !== 'object' || !value.entityId) {
          return { isValid: false, error: 'Должно быть объектом с entityId' };
        }
        return { isValid: true, value };

      case 'MULTI_ENTITY':
        if (typeof value !== 'object' || !Array.isArray(value.entityIds)) {
          return { isValid: false, error: 'Должно быть объектом с массивом entityIds' };
        }
        return { isValid: true, value };

      default:
        return { isValid: true, value };
    }
  }
}
