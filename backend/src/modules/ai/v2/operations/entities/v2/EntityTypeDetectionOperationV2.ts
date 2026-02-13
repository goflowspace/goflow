// backend/src/modules/ai/v2/operations/entities/EntityTypeDetectionOperationV2.ts
import { 
  EntityGenerationInput, 
  AbstractEntityGenerationOperation 
} from '../../../core/AbstractEntityGenerationOperation';
import { AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../../shared/types';

/**
 * Входные данные для определения типа сущности v2
 */
export interface EntityTypeDetectionInputV2 extends EntityGenerationInput {
  synopsis: string;
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
  preferredEntityType?: string;
}

/**
 * Выходные данные определения типа сущности v2
 */
export interface EntityTypeDetectionOutputV2 extends AIOperationOutput {
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
}

/**
 * Операция определения типа сущности v2
 * Использует новую архитектуру с централизованными провайдерами
 */
export class EntityTypeDetectionOperationV2 extends AbstractEntityGenerationOperation<
  EntityTypeDetectionInputV2,
  EntityTypeDetectionOutputV2
> {
  readonly id = 'entity-type-detection-v2';
  readonly name = 'Entity Type Detection V2';
  readonly version = '2.0.0';

  // Конфигурация AI для разных уровней качества
  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.3,
        maxTokens: 1500,
        retries: 1,
        timeout: 20000
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.3,
        maxTokens: 2000,
        retries: 1,
        timeout: 25000
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.2,
        maxTokens: 2500,
        retries: 1,
        timeout: 40000
      }
    }
  };

  /**
   * Дополнительная валидация входных данных
   */
  protected validateAdditional(input: EntityTypeDetectionInputV2): string[] {
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

    if (!input.availableEntityTypes || !Array.isArray(input.availableEntityTypes)) {
      errors.push('availableEntityTypes обязателен и должен быть массивом');
    }

    if (input.availableEntityTypes && input.availableEntityTypes.length === 0) {
      errors.push('Должен быть доступен хотя бы один тип сущности');
    }

    // Валидируем структуру типов сущностей
    if (input.availableEntityTypes && Array.isArray(input.availableEntityTypes)) {
      for (const entityType of input.availableEntityTypes) {
        if (!entityType.id || !entityType.type || !entityType.name) {
          errors.push('Каждый тип сущности должен иметь id, type и name');
          break;
        }
      }
    }

    return errors;
  }

  /**
   * Генерация системного промпта
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are an expert content analyst and entity classification specialist with deep knowledge of narrative structures, world-building elements, and creative project components. You excel at analyzing descriptions and accurately categorizing entities into their most appropriate types based on function, characteristics, and narrative role.
</role>

<context>
You are analyzing user descriptions to determine the most suitable entity type from a predefined list of available options. This classification will determine which fields and properties will be used to fully develop the entity, making accurate categorization critical for proper entity development.
</context>

<objective>
Analyze the user's description and project context to identify the single most appropriate entity type from the available options, providing clear reasoning for the choice and alternative options when confidence is moderate.
</objective>

<analysis_principles>
Functional Analysis:
Determine what role this entity serves in the narrative
Characteristic Recognition:
Identify key traits that align with specific entity types
Context Integration:
Consider how the entity fits within the project's genre, themes, and world
Purpose Identification:
Understand the entity's intended function and impact on the story
Type Differentiation:
Distinguish between similar entity types based on nuanced differences
</analysis_principles>

<classification_approach>
Primary Function:
What is the entity's main role or purpose?
Physical Nature:
Is it a person, place, object, concept, or organization?
Narrative Impact:
How does it influence story progression or world-building?
Interactive Potential:
How do characters or players interact with this entity?
Scope and Scale:
Is it individual, localized, or system-wide in influence?
</classification_approach>

<output_requirements>
Provide detailed reasoning for the primary choice
Include confidence score with explanation
Consider project context in classification decisions
Suggest only types that are existing in the available_entity_types
Respond in structured JSON format for consistent processing
</output_requirements>`;
  }

  /**
   * Генерация пользовательского промпта
   */
  protected getUserPrompt(input: EntityTypeDetectionInputV2, _context: ExecutionContext): string {
        // Строим контекст проекта
        const contextPrompt = this.buildContextPrompt(input);
    
        // Формируем список доступных типов
        const entityTypesInfo = input.availableEntityTypes.map(type => {
          const paramsInfo = type.parameters.map(p => 
            `    - ${p.name} (${p.valueType}${p.required ? ', required' : ''})`
          ).join('\n');
          
          return `• ${type.name} (${type.type})
      ID: ${type.id}
      Description: ${type.description || 'Not specified'}
      Parameters:
    ${paramsInfo}`;
        }).join('\n\n');    
    
      return `<user_description>
  "${input.userDescription}"
  </user_description>

  <project_context>
  ${contextPrompt}
  </project_context>
  
  <available_entity_types>
  ${entityTypesInfo}
  </available_entity_types>
  
  <task_definition>
  
  
  <analysis_steps>
  Extract Key Characteristics:
  Identify the fundamental nature and purpose of the described entity
  Evaluate Entity Types:
  Compare the description against each available type's characteristics
  Apply Context Filter:
  Consider how the project's genre, themes, and style influence type selection
  Assess Confidence:
  Determine certainty level based on clarity of indicators
  Identify Alternatives:
  When confidence is moderate, identify viable alternative types
  </analysis_steps>
  
  </task_definition>
  
  <classification_criteria>
  
  <ambiguity_resolution>
  When multiple types seem applicable:
  Prioritize the entity's primary narrative function
  Consider the most detailed or specific type available
  Choose the type that offers the most relevant field structure
  Default to more specific over more general classifications
  </ambiguity_resolution>
  
  </classification_criteria>
  
  <output_specification>
  
  <format>
  Return results in JSON format with the following structure:
  {
    "selectedEntityType": {
      "id": "selected_type_id",
      "type": "selected_type_name",
      "name": "selected_entity_name",
      "description": "selected_entity_description or null",
      "parameters": [array_of_parameters]
    }
  }
  </format>
  
  <quality_requirements>
  - Provide clear, detailed reasoning for the choice
  - Include confidence score with explanation
  - Suggest alternatives when confidence is below 0.8
  - Consider project context in classification decisions
  - Respond in structured JSON format for consistent processing
  </quality_requirements>
  
  </output_specification>
  
  Analyze the provided description and project context to determine the most appropriate entity type with clear reasoning and appropriate confidence assessment.
  </task_definition>
  `;
  }

  /**
   * Парсинг результата AI
   */
  parseResult(
    aiResult: string, 
    input: EntityTypeDetectionInputV2, 
    realCostUSD: number, 
    creditsCharged: number
  ): EntityTypeDetectionOutputV2 {
    try {
      const parsed = JSON.parse(aiResult.trim());

      // Валидируем структуру ответа
      if (!parsed.selectedEntityType) {
        throw new Error('Отсутствует selectedEntityType в ответе AI');
      }

      // Находим полную информацию о выбранном типе
      const selectedType = input.availableEntityTypes.find(
        type => type.id === parsed.selectedEntityType.id || 
                type.type === parsed.selectedEntityType.type
      );

      if (!selectedType) {
        throw new Error(`Выбранный тип сущности не найден среди доступных: ${parsed.selectedEntityType.type}`);
      }

      return {
        selectedEntityType: {
          id: selectedType.id,
          type: selectedType.type,
          name: selectedType.name,
          description: selectedType.description,
          parameters: selectedType.parameters
        },
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
}
