import { BaseAIOperation } from '../../../../pipeline/base/base-ai-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../../../../pipeline/interfaces/operation.interface';
import { isValidObjectId } from '../../../../../../utils/mongodb';

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
      optionsTranslations?: any;
    }>;
  };
  projectContext?: {
    synopsis?: string;
    logline?: string;
    genres?: string[];
    formats?: string[];
    targetAudience?: string;
    mainThemes?: string;
    atmosphere?: string;
    uniqueFeatures?: string;
    keyMessage?: string;
    referenceWorks?: string;
    creativeConstraints?: string;
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
  customInstructions?: string; // Дополнительные инструкции от пользователя
}

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
 * Улучшенная операция генерации полей сущности с SOLID архитектурой
 * Демонстрирует принципы:
 * - SRP: Фокус только на генерации полей сущности
 * - OCP: Легко расширяется новыми типами полей и логикой
 * - DRY: AI логика вынесена в базовый класс
 */
export class ImprovedEntityFieldGenerationOperation extends BaseAIOperation {
  
  constructor() {
    super(
      'improved_entity_field_generation',
      'Improved Entity Field Generation',
      '2.0.0',
      AIOperationCategory.CONTENT_GENERATION,
      ComplexityLevel.HEAVY,
      {
        requiredCapabilities: ['text_generation', 'context_understanding'],
        maxTokens: 10000, // Увеличено для Gemini
        timeout: 45000
      }
    );
  }

  // ===== ВАЛИДАЦИЯ =====

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input) {
      errors.push('Input is required');
      return { isValid: false, errors };
    }

    if (!input.userDescription || typeof input.userDescription !== 'string') {
      errors.push('User description is required and must be a string');
    }

    if (!input.selectedEntityType) {
      errors.push('Selected entity type is required');
    }

    if (input.selectedEntityType && !input.selectedEntityType.parameters) {
      errors.push('Entity type must have parameters array');
    }

    if (input.userDescription && input.userDescription.length < 10) {
      errors.push('User description must be at least 10 characters long');
    }

    // Валидируем структуру типа сущности
    if (input.selectedEntityType) {
      const entityType = input.selectedEntityType;
      if (!entityType.id || !entityType.type || !entityType.name) {
        errors.push('Entity type must have id, type, and name');
      }

      if (!Array.isArray(entityType.parameters)) {
        errors.push('Entity type parameters must be an array');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== ПРОМПТЫ =====

  getSystemPrompt(_input: any, _context: ExecutionContext): string {
    
    return `<role>
You are a master entity creator and world-building specialist with deep expertise in character development, location design, and narrative element creation. You excel at generating detailed, authentic entities that seamlessly integrate into creative projects while maintaining consistency with established world rules and thematic elements.
</role>

<context>
You are creating comprehensive entity profiles for creative projects including characters, locations, objects, factions, and other narrative elements. These entities must feel authentic, serve the story's needs, and maintain consistency with the project's established world, themes, and existing entities.
</context>

<objective>
Generate detailed, well-rounded entity fields that bring the user's vision to life while ensuring thematic coherence, avoiding clichés, and creating memorable elements that enhance the overall narrative experience.
</objective>

<core_principles>
Deep Analysis:
Thoroughly analyze user descriptions to extract nuanced details and underlying intentions
Organic Integration:
Create content that naturally fits within the project's established world and themes
Genre Awareness:
Adapt entity characteristics to match the project's genre, atmosphere, and style conventions
Memorable Authenticity:
Design entities that feel real, unique, and memorable while avoiding stereotypes
Relationship Consciousness:
Consider connections with existing project elements and suggest meaningful relationships
Consistency Maintenance:
Ensure all generated fields work together harmoniously to support a unified concept
</core_principles>

<critical_constraints>
For SINGLE_ENTITY and MULTI_ENTITY field types:
USE ONLY NAMES OF EXISTING ENTITIES from the "EXISTING ENTITIES" list
If no suitable existing entities are available, leave the field empty or null
DO NOT CREATE new entity names for relationship fields
For SINGLE_ENTITY: use one existing entity name as a string
For MULTI_ENTITY: use an array of existing entity names only
For SINGLE_SELECT and MULTI_SELECT field types:
USE ONLY OPTIONS FROM THE PROVIDED LISTS
For SINGLE_SELECT: choose one appropriate option from the list
For MULTI_SELECT: choose multiple appropriate options from the list as an array
DO NOT CREATE custom options not specified in the lists
</critical_constraints>

<quality_requirements>
Each field must be detailed, specific, and concrete
All fields must be coherent and complementary to each other
Entity name must fit the project context and genre conventions
Description should be vivid, characteristic, and concise
All elements must serve the overall narrative concept
Avoid generic descriptions and strive for distinctive, memorable details
</quality_requirements>

<output_format>
Respond in JSON format with comprehensive field explanations and relationship suggestions when appropriate. Ensure all generated content enhances the project's creative vision and maintains professional quality standards.
</output_format>`;
  }

  getUserPrompt(input: EntityFieldGenerationInput, _context: ExecutionContext): string {
    const fieldsToFill = input.selectedEntityType.parameters
      .sort((a, b) => a.order - b.order)
      .map(param => `- ${param.name} (${param.id})${param.required ? ' (ОБЯЗАТЕЛЬНОЕ)' : ' (опционально)'}: ${this.getFieldTypeDescription(param.valueType)}`)
      .join('\n');

    const existingEntitiesText = input.existingEntities?.length ? 
      input.existingEntities
        .map(entity => `- ${entity.name} (${entity.entityType.name}): ${entity.description || 'без описания'}`)
        .join('\n') : 'Существующие сущности отсутствуют';

    return `<input_data>

<user_description>
"${input.userDescription}"
</user_description>

<entity_type>
${input.selectedEntityType.name}
</entity_type>

<fields_to_generate>
${fieldsToFill}
</fields_to_generate>

<project_context>
${JSON.stringify(input.projectContext)}
</project_context>

<existing_entities>
${existingEntitiesText}
</existing_entities>

<custom_instructions>
${input.customInstructions || 'Дополнительные инструкции отсутствуют'}
</custom_instructions>

</input_data>

<task_definition>
<primary_task>
Create a comprehensive entity with all necessary fields that brings the user's description to life while maintaining perfect consistency with the project's established world, themes, and existing entities.
</primary_task>

<field_generation_strategy>
Analyze Context:
Deep dive into the user description, project themes, and genre conventions
Establish Identity:
Create a strong, memorable identity that serves the narrative
Build Relationships:
Identify logical connections with existing entities when appropriate
Maintain Consistency:
Ensure all fields support a unified, coherent entity concept
Add Distinction:
Include unique details that make this entity memorable and valuable
</field_generation_strategy>
</task_definition>

<constraints>
<hard_constraints>
Generate ALL required fields without exception
Use only existing entity names for relationship fields (SINGLE_ENTITY, MULTI_ENTITY)
Use only provided options for selection fields (SINGLE_SELECT, MULTI_SELECT)
Maintain thematic consistency with project context
Ensure entity name fits genre and world conventions
Provide specific, actionable explanations for each field choice
</hard_constraints>

<relationship_guidelines>
Only suggest relationships with entities that logically connect to this new entity
Provide clear explanations for why relationships make narrative sense
Consider both obvious and subtle potential connections
Avoid forcing relationships that don't serve the story
</relationship_guidelines>
</constraints>

<output_specification>

<format> 

Return results in JSON format with the following structure:
{
  "entityName": "Подходящее имя для сущности",
  "entityDescription": "Краткое, но яркое описание сущности",
  "generatedFields": {
    "field_id_1": "значение поля 1",
    "field_id_2": "значение поля 2"
  },
  "fieldExplanations": {
    "field_id_1": "почему выбрано именно это значение",
    "field_id_2": "обоснование выбора"
  },
  "suggestedRelationships": [
    {
      "relatedEntityName": "имя связанной сущности",
      "relationType": "тип связи",
      "explanation": "почему эта связь логична"
    }
  ],
  "confidence": 0.85
}
</format>

<validation_criteria>
All required fields are populated with appropriate values
Entity name is distinctive and fits the project's world
All fields work together to create a coherent, memorable entity
Explanations provide clear reasoning for creative choices
Suggested relationships enhance rather than complicate the narrative
Overall entity serves and enhances the project's creative vision
</validation_criteria>

</output_specification>

Based on the provided context and requirements, create a detailed entity that brings the user's vision to life while maintaining perfect consistency with the established project world.`;
  }

  protected getPromptVariables(input: any, _context: ExecutionContext): Record<string, any> {
    const typedInput = input as EntityFieldGenerationInput;
    const baseVariables = super.getPromptVariables(input, _context);
    
    // Форматируем поля для заполнения
    const fieldsText = typedInput.selectedEntityType.parameters
      .sort((a, b) => a.order - b.order)
      .map(param => {
        const requiredText = param.required ? ' (ОБЯЗАТЕЛЬНОЕ)' : ' (опционально)';
        const typeText = this.getFieldTypeDescription(param.valueType);
        
        // Добавляем опции для SELECT полей
        let optionsText = '';
        if (param.valueType === 'SINGLE_SELECT' || param.valueType === 'MULTI_SELECT') {
          optionsText = this.formatSelectOptions(param.optionsTranslations);
        }
        
        return `- ${param.name} (${param.id})${requiredText}: ${typeText}${optionsText}`;
      })
      .join('\n');
    
    // Форматируем контекст проекта
    const projectContextParts = [];
    if (typedInput.projectContext?.synopsis) {
      projectContextParts.push(`Синопсис: ${typedInput.projectContext.synopsis}`);
    }
    if (typedInput.projectContext?.logline) {
      projectContextParts.push(`Логлайн: ${typedInput.projectContext.logline}`);
    }
    if (typedInput.projectContext?.genres?.length) {
      projectContextParts.push(`Жанры: ${typedInput.projectContext.genres.join(', ')}`);
    }
    if (typedInput.projectContext?.formats?.length) {
      projectContextParts.push(`Форматы: ${typedInput.projectContext.formats.join(', ')}`);
    }
    if (typedInput.projectContext?.targetAudience) {
      projectContextParts.push(`Целевая аудитория: ${typedInput.projectContext.targetAudience}`);
    }
    if (typedInput.projectContext?.mainThemes) {
      projectContextParts.push(`Основные темы: ${typedInput.projectContext.mainThemes}`);
    }
    if (typedInput.projectContext?.atmosphere) {
      projectContextParts.push(`Атмосфера: ${typedInput.projectContext.atmosphere}`);
    }
    if (typedInput.projectContext?.uniqueFeatures) {
      projectContextParts.push(`Уникальные особенности: ${typedInput.projectContext.uniqueFeatures}`);
    }
    if (typedInput.projectContext?.keyMessage) {
      projectContextParts.push(`Ключевое сообщение: ${typedInput.projectContext.keyMessage}`);
    }
    if (typedInput.projectContext?.referenceWorks) {
      projectContextParts.push(`Референсы: ${typedInput.projectContext.referenceWorks}`);
    }
    if (typedInput.projectContext?.creativeConstraints) {
      projectContextParts.push(`Творческие ограничения: ${typedInput.projectContext.creativeConstraints}`);
    }
    
    // Форматируем существующие сущности
    const existingEntitiesText = typedInput.existingEntities?.length ? 
      typedInput.existingEntities
        .map(entity => `- ${entity.name} (${entity.entityType.name}): ${entity.description || 'без описания'}`)
        .join('\n') : 'Существующие сущности отсутствуют';
    
    return {
      ...baseVariables,
      userDescription: typedInput.userDescription,
      entityTypeName: typedInput.selectedEntityType.name,
      fieldsToFill: fieldsText,
      projectContext: projectContextParts.length > 0 ? 
        projectContextParts.join('\n') : 'Контекст проекта не предоставлен',
      existingEntities: existingEntitiesText,
      customInstructions: typedInput.customInstructions || 'Дополнительные инструкции отсутствуют'
    };
  }

  // ===== ОБРАБОТКА РЕЗУЛЬТАТОВ =====

  processAIResult(aiResult: any, input: any, _context: ExecutionContext): EntityFieldGenerationOutput {
    const typedInput = input as EntityFieldGenerationInput;
    
    try {
      // aiResult.data содержит строку JSON напрямую от BaseAIOperation
      const responseContent = aiResult.data || aiResult;
      
      if (!responseContent) {
        throw new Error('No response content returned from AI provider');
      }

      // Создаем объект для совместимости с parseAIResponse
      const aiResponseObject = {
        content: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent)
      };

      // Парсим JSON из ответа, передавая информацию о существующих сущностях
      const existingEntitiesForValidation = typedInput.existingEntities?.map(entity => ({
        id: entity.id,
        name: entity.name
      }));
      
      const parsedResult = this.parseAIResponse(aiResponseObject, typedInput.selectedEntityType.parameters, existingEntitiesForValidation);
      
      // Подсчитываем статистику
      const totalFields = typedInput.selectedEntityType.parameters.length;
      const filledFields = Object.keys(parsedResult.generatedFields).length;
      const skippedFields = typedInput.selectedEntityType.parameters
        .filter(param => !parsedResult.generatedFields[param.id])
        .map(param => param.id);
      
      return {
        entityName: parsedResult.entityName,
        entityDescription: parsedResult.entityDescription,
        generatedFields: parsedResult.generatedFields,
        fieldExplanations: parsedResult.fieldExplanations,
        suggestedRelationships: parsedResult.suggestedRelationships,
        generationMetadata: {
          totalFields,
          filledFields,
          skippedFields,
          confidence: parsedResult.confidence
        },
        content: `Создана сущность "${parsedResult.entityName}" с ${filledFields} полями`,
        explanation: `Сгенерированы поля для сущности типа ${typedInput.selectedEntityType.name}`
      };

    } catch (error) {
      console.error('❌ Failed to process AI result for entity field generation:', error);
      console.error('Raw AI result:', aiResult);
      
      // Fallback: создаем базовую сущность
      const fallbackFields: Record<string, any> = {};
      const fallbackExplanations: Record<string, string> = {};
      
      // Заполняем только обязательные поля базовыми значениями
      typedInput.selectedEntityType.parameters
        .filter(param => param.required)
        .forEach(param => {
          fallbackFields[param.id] = this.getDefaultFieldValue(param);
          fallbackExplanations[param.id] = 'Значение по умолчанию из-за ошибки генерации';
        });
      
      return {
        entityName: 'Сущность без имени',
        entityDescription: 'Ошибка генерации описания',
        generatedFields: fallbackFields,
        fieldExplanations: fallbackExplanations,
        generationMetadata: {
          totalFields: typedInput.selectedEntityType.parameters.length,
          filledFields: Object.keys(fallbackFields).length,
          skippedFields: typedInput.selectedEntityType.parameters
            .filter(param => !fallbackFields[param.id])
            .map(param => param.id),
          confidence: 0.1
        },
        content: 'Ошибка генерации сущности',
        explanation: `Произошла ошибка при генерации полей сущности: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      };
    }
  }

  // ===== КАСТОМНАЯ СТОИМОСТЬ =====

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    const typedInput = input as EntityFieldGenerationInput;
    
    let costMultiplier = 1.0;
    
    // Увеличиваем стоимость для большого количества полей
    if (typedInput.selectedEntityType?.parameters) {
      const fieldCount = typedInput.selectedEntityType.parameters.length;
      if (fieldCount > 15) costMultiplier += 0.5;
      else if (fieldCount > 10) costMultiplier += 0.3;
      else if (fieldCount > 5) costMultiplier += 0.2;
    }
    
    // Увеличиваем стоимость для сложного контекста
    if (typedInput.projectContext?.synopsis && typedInput.projectContext.synopsis.length > 1000) {
      costMultiplier += 0.2;
    }
    
    // Увеличиваем стоимость при наличии многих существующих сущностей
    if (typedInput.existingEntities && typedInput.existingEntities.length > 10) {
      costMultiplier += 0.3;
    }
    
    return costMultiplier;
  }

  // ===== ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ AI =====

  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'callAIWithMetadata';
  }



  protected getDefaultCreativityLevel(): number {
    return 0.7;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Получение описания типа поля для пользователя
   */
  private getFieldTypeDescription(valueType: string): string {
    const descriptions = {
      'TEXT': 'текстовое поле',
      'SHORT_TEXT': 'короткий текст', 
      'NUMBER': 'числовое значение',
      'BOOLEAN': 'да/нет',
      'DATE': 'дата',
      'SINGLE_SELECT': 'выбор одного варианта',
      'MULTI_SELECT': 'выбор нескольких вариантов',
      'SINGLE_ENTITY': 'ссылка на одну сущность',
      'MULTI_ENTITY': 'ссылки на несколько сущностей',
      'MEDIA': 'медиафайл',
      'JSON': 'структурированные данные'
    };
    
    return descriptions[valueType as keyof typeof descriptions] || valueType;
  }

  /**
   * Форматирование опций для SELECT полей
   */
  private formatSelectOptions(optionsTranslations?: any): string {
    if (!optionsTranslations) {
      return '';
    }

    // Приоритет: ru > en > первый доступный язык
    const options = optionsTranslations.ru || 
                   optionsTranslations.en || 
                   Object.values(optionsTranslations)[0];

    if (!Array.isArray(options) || options.length === 0) {
      return '';
    }

    return `[${options.join(', ')}]`;
  }



  /**
   * Валидация и трансформация значения в зависимости от типа параметра
   */
  private validateAndTransformValue(
    value: any, 
    parameter: { valueType: string; optionsTranslations?: any }, 
    existingEntities?: Array<{ id: string; name: string }>
  ): any {
    if (value === null || value === undefined) {
      return null;
    }

    switch (parameter.valueType) {
      case 'TEXT':
      case 'SHORT_TEXT':
        return typeof value === 'string' ? value.trim() : String(value);

      case 'NUMBER':
        const num = Number(value);
        return isNaN(num) ? null : num;

      case 'SINGLE_SELECT':
        if (typeof value !== 'string') return null;
        // Если есть опции, проверяем их наличие
        if (parameter.optionsTranslations) {
          const options = parameter.optionsTranslations?.ru || parameter.optionsTranslations?.en || [];
          return options.includes(value) ? value : null;
        }
        // Если опций нет, принимаем любое строковое значение
        return value;

      case 'MULTI_SELECT':
        if (!Array.isArray(value)) return null;
        // Если есть опции, фильтруем по ним
        if (parameter.optionsTranslations) {
          const multiOptions = parameter.optionsTranslations?.ru || parameter.optionsTranslations?.en || [];
          const validValues = value.filter(v => multiOptions.includes(v));
          return validValues.length > 0 ? validValues : null;
        }
        // Если опций нет, принимаем массив как есть
        return value;

      case 'SINGLE_ENTITY':
        if (typeof value === 'object' && value.entityId) {
          // Проверяем, что entityId является валидным ObjectID
          if (isValidObjectId(value.entityId)) {
            return { entityId: value.entityId };
          }
          console.warn(`⚠️ Invalid ObjectID for SINGLE_ENTITY: ${value.entityId}`);
          return null;
        }
        if (typeof value === 'string') {
          // Сначала проверяем, является ли это валидным ObjectID
          if (isValidObjectId(value)) {
            return { entityId: value };
          }
          
          // Если это не ObjectID, ищем среди существующих сущностей по имени
          if (existingEntities) {
            const foundEntity = existingEntities.find(entity => 
              entity.name.toLowerCase() === value.toLowerCase()
            );
            if (foundEntity) {
              console.log(`✅ Found existing entity by name: "${value}" -> ${foundEntity.id}`);
              return { entityId: foundEntity.id };
            }
          }
          
          console.warn(`⚠️ Entity not found for SINGLE_ENTITY: "${value}". Use existing entity names or valid ObjectIDs.`);
          return null;
        }
        return null;

      case 'MULTI_ENTITY':
        if (Array.isArray(value)) {
          // Обрабатываем каждый элемент массива
          const validIds: string[] = [];
          
          value.forEach((item: any) => {
            if (typeof item === 'string') {
              // Сначала проверяем, является ли это валидным ObjectID
              if (isValidObjectId(item)) {
                validIds.push(item);
                return;
              }
              
              // Если это не ObjectID, ищем среди существующих сущностей по имени
              if (existingEntities) {
                const foundEntity = existingEntities.find(entity => 
                  entity.name.toLowerCase() === item.toLowerCase()
                );
                if (foundEntity) {
                  console.log(`✅ Found existing entity by name: "${item}" -> ${foundEntity.id}`);
                  validIds.push(foundEntity.id);
                  return;
                }
              }
              
              console.warn(`⚠️ Entity not found for MULTI_ENTITY: "${item}". Use existing entity names or valid ObjectIDs.`);
            }
          });
          
          // Дополнительно фильтруем undefined значения для безопасности
          const safeValidIds = validIds.filter(id => id != null && id !== undefined);
          return safeValidIds.length > 0 ? { entityIds: safeValidIds } : null;
        }
        if (typeof value === 'object' && Array.isArray(value.entityIds)) {
          // Применяем ту же логику к объекту с entityIds
          const validIds: string[] = [];
          
          value.entityIds.forEach((item: any) => {
            if (typeof item === 'string') {
              if (isValidObjectId(item)) {
                validIds.push(item);
                return;
              }
              
              if (existingEntities) {
                const foundEntity = existingEntities.find(entity => 
                  entity.name.toLowerCase() === item.toLowerCase()
                );
                if (foundEntity) {
                  console.log(`✅ Found existing entity by name: "${item}" -> ${foundEntity.id}`);
                  validIds.push(foundEntity.id);
                  return;
                }
              }
              
              console.warn(`⚠️ Entity not found for MULTI_ENTITY: "${item}"`);
            }
          });
          
          // Дополнительно фильтруем undefined значения для безопасности
          const safeValidIds = validIds.filter(id => id != null && id !== undefined);
          return safeValidIds.length > 0 ? { entityIds: safeValidIds } : null;
        }
        return null;

      default:
        return value;
    }
  }

  /**
   * Парсинг ответа от AI
   */
  private parseAIResponse(suggestion: any, parameters: any[], existingEntities?: Array<{ id: string; name: string }>): {
    entityName: string;
    entityDescription?: string;
    generatedFields: Record<string, any>;
    fieldExplanations: Record<string, string>;
    suggestedRelationships?: any[];
    confidence: number;
  } {
    try {
      // Пытаемся найти JSON в ответе
      const content = suggestion.content || suggestion.description || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Валидируем основные поля
      const entityName = parsedData.entityName || 'Безымянная сущность';
      const entityDescription = parsedData.entityDescription || '';
      const generatedFields = parsedData.generatedFields || {};
      const fieldExplanations = parsedData.fieldExplanations || {};
      const suggestedRelationships = parsedData.suggestedRelationships || [];
      const confidence = parsedData.confidence || 0.7;
      
      // Проверяем и трансформируем поля согласно их типам
      const validFields: Record<string, any> = {};
      const validExplanations: Record<string, string> = {};
      
      parameters.forEach(param => {
        if (generatedFields[param.id] !== undefined) {
          // Валидируем и трансформируем значение, передавая контекст существующих сущностей
          const transformedValue = this.validateAndTransformValue(generatedFields[param.id], param, existingEntities);
          if (transformedValue !== null) {
            validFields[param.id] = transformedValue;
            validExplanations[param.id] = fieldExplanations[param.id] || 'Объяснение отсутствует';
          } else {
            console.warn(`⚠️ Invalid value for parameter ${param.name}: ${JSON.stringify(generatedFields[param.id])}`);
          }
        }
      });
      
      return {
        entityName,
        entityDescription,
        generatedFields: validFields,
        fieldExplanations: validExplanations,
        suggestedRelationships,
        confidence
      };
      
    } catch (error) {
      console.warn('⚠️ Failed to parse AI response, using fallback parsing');
      
      // Fallback: пытаемся извлечь хотя бы имя из текста
      const content = suggestion.content || suggestion.description || '';
      const nameMatch = content.match(/имя[:\s]*["']?([^"'\n]+)["']?/i);
      const entityName = nameMatch ? nameMatch[1].trim() : 'Неопределенная сущность';
      
      return {
        entityName,
        generatedFields: {},
        fieldExplanations: {},
        confidence: 0.3
      };
    }
  }

  /**
   * Получение значения по умолчанию для поля
   */
  private getDefaultFieldValue(parameter: any): any {
    switch (parameter.valueType) {
      case 'text':
      case 'longText':
        return 'Значение по умолчанию';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'select':
      case 'multiSelect':
        return parameter.optionsTranslations ? Object.keys(parameter.optionsTranslations)[0] : '';
      case 'json':
        return {};
      default:
        return 'Неопределенное значение';
    }
  }
}