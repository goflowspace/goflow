import { BaseAIOperation } from '../../../../pipeline/base/base-ai-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../../../../pipeline/interfaces/operation.interface';
import { AIOperationConfig } from '../../../../pipeline/interfaces/ai-operation.interface';

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
  preferredEntityType?: string; // Если пользователь явно указал тип
}

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
 * Улучшенная операция определения типа сущности с SOLID архитектурой
 * Демонстрирует принципы:
 * - SRP: Фокус только на логике определения типа сущности
 * - OCP: Легко расширяется новыми алгоритмами определения
 * - DRY: AI логика вынесена в базовый класс
 */
export class ImprovedEntityTypeDetectionOperation extends BaseAIOperation {
  
  constructor() {
    super(
      'improved_entity_type_detection',
      'Improved Entity Type Detection',
      '2.0.0',
      AIOperationCategory.CONTENT_ANALYSIS,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: ['text_analysis', 'classification'],
        maxTokens: 2000,
        timeout: 15000
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

    if (!input.availableEntityTypes || !Array.isArray(input.availableEntityTypes)) {
      errors.push('Available entity types are required and must be an array');
    }

    if (input.availableEntityTypes && input.availableEntityTypes.length === 0) {
      errors.push('At least one entity type must be available');
    }

    if (input.userDescription && input.userDescription.length < 5) {
      errors.push('User description must be at least 5 characters long');
    }

    // Валидируем структуру типов сущностей
    if (input.availableEntityTypes && Array.isArray(input.availableEntityTypes)) {
      for (const entityType of input.availableEntityTypes) {
        if (!entityType.id || !entityType.type || !entityType.name) {
          errors.push('Each entity type must have id, type, and name');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== AI КОНФИГУРАЦИЯ =====

  getAIConfig(_context: ExecutionContext, userSettings?: any): AIOperationConfig {
    const baseConfig = super.getAIConfig(_context, userSettings);
    
    // Специфичная конфигурация для определения типа сущности
    return {
      ...baseConfig,
      creativityLevel: 0.2, // Низкая креативность для точной классификации
      preferredModel: userSettings?.preferredModel,
      maxTokens: 1500, // Достаточно для анализа и выбора
      temperature: 0.3 // Детерминированный выбор
    };
  }

  // ===== ПРОМПТЫ =====

  getSystemPrompt(_input: any, _context: ExecutionContext): string {
    
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

<confidence_guidelines>
High Confidence (0.8-1.0):
Clear indicators strongly point to one specific type
Medium Confidence (0.5-0.8):
Good match with some ambiguity, provide alternatives
Low Confidence (0.3-0.5):
Multiple types could work, list several alternatives
Very Low (<0.3):
Description unclear, request clarification or default to most general type
</confidence_guidelines>

<output_requirements>
Provide detailed reasoning for the primary choice
Include confidence score with explanation
Suggest alternatives when confidence is below 0.8
Consider project context in classification decisions
Respond in structured JSON format for consistent processing
</output_requirements>`;
  }

  getUserPrompt(input: EntityTypeDetectionInput, _context: ExecutionContext): string {

    const availableTypes = input.availableEntityTypes.map(type => `- ${type.name} (${type.type}): ${type.description || 'Описание отсутствует'}`).join('\n');
    
    return `<user_description>
"${input.userDescription}"
</user_description>

<available_entity_types>
${availableTypes}
</available_entity_types>

<project_context>
${input.projectContext?.synopsis}
</project_context>

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

<entity_type_indicators>
Characters/People:
Names, personalities, roles, relationships, actions, motivations
Locations:
Geographic features, buildings, rooms, environmental descriptions, spatial references
Objects/Items:
Physical properties, uses, materials, ownership, functionality
Organizations:
Groups, institutions, hierarchies, membership, collective goals
Events:
Temporal markers, consequences, participants, cause-and-effect relationships
Concepts:
Abstract ideas, systems, rules, principles, philosophies
Creatures:
Biological entities, behaviors, habitats, special abilities
</entity_type_indicators>

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
    "reasoning": "detailed explanation of why this type was chosen"
  },
  "confidence": 0.85,
  "alternatives": [
    {
      "type": "alternative_type_id",
      "confidence": 0.65,
      "reason": "explanation of why this type could also work"
    }
  ]
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

Analyze the provided description and project context to determine the most appropriate entity type with clear reasoning and appropriate confidence assessment.`;

  }

  protected getPromptVariables(input: any, _context: ExecutionContext): Record<string, any> {
    const typedInput = input as EntityTypeDetectionInput;
    const baseVariables = super.getPromptVariables(input, _context);
    
    // Форматируем доступные типы сущностей
    const availableTypesText = typedInput.availableEntityTypes
      .map(type => {
        const params = type.parameters
          .map(p => `${p.name} (${p.valueType}${p.required ? ', обязательное' : ''})`)
          .join(', ');
        
        return `- ${type.name} (${type.type}): ${type.description || 'Описание отсутствует'}
  Поля: ${params}`;
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
    
    return {
      ...baseVariables,
      userDescription: typedInput.userDescription,
      availableTypes: availableTypesText,
      projectContext: projectContextParts.length > 0 ? 
        projectContextParts.join('\n') : 'Контекст проекта не предоставлен',
      userPreference: typedInput.preferredEntityType || 'Предпочтения не указаны'
    };
  }

  // ===== ОБРАБОТКА РЕЗУЛЬТАТОВ =====

  processAIResult(aiResult: any, input: any, _context: ExecutionContext): EntityTypeDetectionOutput {
    const typedInput = input as EntityTypeDetectionInput;
    
    try {
      // Если есть явное предпочтение пользователя, используем его
      if (typedInput.preferredEntityType) {
        const preferredType = typedInput.availableEntityTypes.find(
          type => type.type === typedInput.preferredEntityType || 
                  type.id === typedInput.preferredEntityType
        );
        
        if (preferredType) {
          return {
            selectedEntityType: preferredType,
            confidence: 0.95,
            reasoning: 'Выбран тип, явно указанный пользователем',
            content: `Выбран тип сущности: ${preferredType.name}`,
            explanation: 'Пользователь указал предпочтительный тип сущности'
          };
        }
      }

      // Обрабатываем результат от AI
      // При callAIWithMetadata получаем сырой текст, при generateSuggestions - массив объектов
      let rawResponse: string;
      if (typeof aiResult.data === 'string') {
        rawResponse = aiResult.data;
      } else if (Array.isArray(aiResult.data)) {
        const firstSuggestion = aiResult.data[0];
        rawResponse = firstSuggestion?.description || firstSuggestion?.content || JSON.stringify(firstSuggestion);
      } else {
        rawResponse = aiResult.data?.description || aiResult.data?.content || JSON.stringify(aiResult.data);
      }

      if (!rawResponse) {
        throw new Error('No response content received from AI provider');
      }

      // Парсим JSON из ответа
      const result = this.parseAIResponse({ description: rawResponse }, typedInput.availableEntityTypes);
      
      return {
        selectedEntityType: result.selectedEntityType,
        confidence: result.confidence,
        reasoning: result.reasoning,
        alternatives: result.alternatives,
        content: `Выбран тип сущности: ${result.selectedEntityType.name}`,
        explanation: result.reasoning
      };

    } catch (error) {
      console.error('❌ Failed to process AI result for entity type detection:', error);
      
      // Fallback: возвращаем первый доступный тип
      const fallbackType = typedInput.availableEntityTypes[0];
      
      return {
        selectedEntityType: fallbackType,
        confidence: 0.1,
        reasoning: 'Ошибка анализа, выбран первый доступный тип по умолчанию',
        content: `Выбран тип сущности по умолчанию: ${fallbackType.name}`,
        explanation: 'Произошла ошибка при определении типа сущности'
      };
    }
  }

  // ===== КАСТОМНАЯ СТОИМОСТЬ =====

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    const typedInput = input as EntityTypeDetectionInput;
    
    // Увеличиваем стоимость для большого количества типов
    if (typedInput.availableEntityTypes && typedInput.availableEntityTypes.length > 10) {
      return 1.3;
    }
    
    // Увеличиваем стоимость для длинного описания
    if (typedInput.userDescription && typedInput.userDescription.length > 500) {
      return 1.2;
    }
    
    return 1.0;
  }

  // ===== ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ AI =====

  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'callAIWithMetadata';
  }

  protected getSuggestionType(): string {
    return 'STRUCTURE_ONLY';
  }



  protected getDefaultCreativityLevel(): number {
    return 0.2;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Парсинг ответа от AI и валидация результата
   */
  private parseAIResponse(suggestion: any, availableTypes: any[]): {
    selectedEntityType: any;
    confidence: number;
    reasoning: string;
    alternatives?: any[];
  } {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = suggestion.description?.match(/\{[\s\S]*\}/);
      let parsedData;
      
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
      
      // Валидируем и находим выбранный тип
      const selectedTypeId = parsedData.selectedEntityType?.id;
      const selectedType = availableTypes.find(type => 
        type.id === selectedTypeId || type.type === selectedTypeId
      );
      
      if (!selectedType) {
        throw new Error(`Selected entity type not found: ${selectedTypeId}`);
      }
      
      // Обрабатываем альтернативы
      const alternatives = parsedData.alternatives?.map((alt: any) => {
        const altType = availableTypes.find(type => 
          type.type === alt.type || type.id === alt.type
        );
        
        return {
          type: alt.type,
          name: altType?.name || alt.type,
          confidence: alt.confidence || 0.5,
          reason: alt.reason || 'Альтернативный вариант'
        };
      }).filter(Boolean) || [];
      
      return {
        selectedEntityType: selectedType,
        confidence: parsedData.confidence || 0.7,
        reasoning: parsedData.selectedEntityType?.reasoning || 
                  parsedData.reasoning || 
                  'Тип выбран на основе анализа описания',
        alternatives
      };
      
    } catch (error) {
      console.warn('⚠️ Failed to parse AI response, using heuristic selection');
      
      // Fallback: простая эвристика на основе ключевых слов
      return this.heuristicTypeSelection(suggestion.description || '', availableTypes);
    }
  }

  /**
   * Эвристический выбор типа сущности на основе ключевых слов
   */
  private heuristicTypeSelection(description: string, availableTypes: any[]): {
    selectedEntityType: any;
    confidence: number;
    reasoning: string;
  } {
    const lowerDescription = description.toLowerCase();
    
    // Простые эвристики для общих типов
    const heuristics = [
      { keywords: ['персонаж', 'герой', 'человек', 'характер'], types: ['character', 'person'] },
      { keywords: ['место', 'локация', 'город', 'дом', 'здание'], types: ['location', 'place'] },
      { keywords: ['предмет', 'вещь', 'объект', 'артефакт'], types: ['item', 'object'] },
      { keywords: ['событие', 'происшествие', 'случай'], types: ['event'] },
      { keywords: ['организация', 'группа', 'компания'], types: ['organization'] }
    ];
    
    for (const heuristic of heuristics) {
      const hasKeyword = heuristic.keywords.some(keyword => 
        lowerDescription.includes(keyword)
      );
      
      if (hasKeyword) {
        const matchingType = availableTypes.find(type => 
          heuristic.types.includes(type.type.toLowerCase())
        );
        
        if (matchingType) {
          return {
            selectedEntityType: matchingType,
            confidence: 0.6,
            reasoning: `Тип определен по ключевым словам: ${heuristic.keywords.join(', ')}`
          };
        }
      }
    }
    
    // Если ничего не найдено, возвращаем первый тип
    return {
      selectedEntityType: availableTypes[0],
      confidence: 0.3,
      reasoning: 'Тип не удалось определить автоматически, выбран первый доступный'
    };
  }
}