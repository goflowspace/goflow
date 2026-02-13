// backend/src/modules/ai/v2/operations/entities/v2/EntityContextAnalysisOperationV2.ts
import { 
  EntityGenerationInput, 
  AbstractEntityGenerationOperation 
} from '../../../core/AbstractEntityGenerationOperation';
import { AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../../shared/types';

/**
 * Входные данные для анализа контекста сущности v2
 */
export interface EntityContextAnalysisInputV2 extends EntityGenerationInput {
  entityData: {
    name: string;
    description?: string;
    entityType: {
      id: string;
      name: string;
      type: string; // character, location, faction, event, rule
    };
    values: Record<string, any>; // параметры сущности (исключая изображения)
  };
  projectBible: {
    synopsis?: string;
    logline?: string;
    genres?: string[];
    setting?: string;
    atmosphere?: string;
    mainThemes?: string;
    targetAudience?: string;
    references?: string;
    uniqueFeatures?: string;
    visualStyle?: string;
    constraints?: string;
  };
  userSettings?: {
    preferredProvider?: string;
    preferredModel?: string;
    creativityLevel?: number;
  };
  customPromptRequirements?: string[]; // Дополнительные требования пользователя
}

/**
 * Выходные данные анализа контекста сущности v2
 */
export interface EntityContextAnalysisOutputV2 extends AIOperationOutput {
  enrichedContext: {
    // Основная информация о сущности
    entityInfo: {
      name: string;
      type: string;
      description: string;
      category: string;
    };
    
    // Структурированные параметры сущности
    entityAttributes: {
      [key: string]: string | Record<string, any> | undefined;
    };
    
    // Контекст из библии проекта
    projectContext: {
      worldSetting: string;
      visualStyle: string;
      atmosphere: string;
      genres: string[];
      themes: string;
    };
    
    // Рекомендации для генерации изображения
    imageGuidance: {
      suggestedAspectRatio: string;
      styleDirection: string;
      focusElements: string[];
      avoidElements: string[];
      userRequirements: string[]; // Дополнительные требования пользователя
    };
  };
}

/**
 * Операция анализа контекста сущности v2
 * Использует новую архитектуру с централизованными провайдерами
 */
export class EntityContextAnalysisOperationV2 extends AbstractEntityGenerationOperation<
  EntityContextAnalysisInputV2,
  EntityContextAnalysisOutputV2
> {
  readonly id = 'entity-context-analysis-v2';
  readonly name = 'Entity Context Analysis V2';
  readonly version = '2.0.0';

  // Конфигурация AI для разных уровней качества
  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.3,
        maxTokens: 3000,
        retries: 1,
        timeout: 20000
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.3,
        maxTokens: 4000,
        retries: 1,
        timeout: 25000
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.2,
        maxTokens: 5000,
        retries: 1,
        timeout: 40000
      }
    }
  };

  /**
   * Дополнительная валидация входных данных
   */
  protected validateAdditional(input: EntityContextAnalysisInputV2): string[] {
    const errors: string[] = [];
    
    if (!input.entityData) {
      errors.push('entityData is required');
    } else {
      if (!input.entityData.name || typeof input.entityData.name !== 'string') {
        errors.push('entityData.name must be a non-empty string');
      }
      
      if (!input.entityData.entityType || !input.entityData.entityType.type) {
        errors.push('entityData.entityType.type is required');
      }
    }
    
    if (!input.projectBible || typeof input.projectBible !== 'object') {
      errors.push('projectBible must be an object');
    }

    return errors;
  }

  /**
   * Генерация системного промпта
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are an expert entity context analyst specializing in image generation context structuring. You excel at analyzing entity data and project bibles to create structured, comprehensive context for image generation that captures both entity characteristics and project aesthetics.
</role>

<context>
You are processing entity data and project context to create enriched, structured information that will be used for generating high-quality entity images. Your analysis must balance entity-specific details with project-wide visual consistency and thematic coherence.
</context>

<objective>
Analyze entity data and project bible information to create a structured context that optimally supports image generation, ensuring all relevant visual information is extracted, categorized, and aligned with project aesthetics.
</objective>

<analysis_principles>
Visual Information Extraction:
Extract key visual elements that directly impact image appearance
Data Categorization:
Structure information into logical categories for systematic processing
Project Style Integration:
Ensure entity characteristics align with project visual style and atmosphere
Focus Element Identification:
Determine the most important visual elements for image prominence
Element Exclusion:
Identify elements that should be avoided or minimized in the image
</analysis_principles>

<entity_parameter_categories>
APPEARANCE:
Physical description, visual characteristics, distinctive features
PERSONALITY:
Character traits that influence pose, expression, and body language
BACKGROUND:
History and context that affects clothing style, environment, and atmosphere
RELATIONSHIPS:
Connections that may influence symbolism, positioning, or visual associations
ABILITIES:
Powers or skills that affect visual attributes, effects, or equipment
EQUIPMENT:
Gear, clothing, accessories, and carried items
LOCATION:
Setting, environment, and contextual surroundings
CULTURE:
Cultural elements affecting style, symbolism, and aesthetic choices
HISTORY:
Historical context influencing visual representation and period accuracy
</entity_parameter_categories>

<entity_type_considerations>
CHARACTER Entities:
Focus on physical appearance, clothing, pose, facial expression, and personality indicators
LOCATION Entities:
Emphasize architecture, landscape, atmosphere, environmental details, and spatial characteristics
FACTION Entities:
Highlight organizational symbols, style identity, group aesthetics, and representative elements
EVENT Entities:
Capture action dynamics, participant interactions, temporal context, and energy
RULE Entities:
Create conceptual representations, symbolic imagery, and abstract visualization approaches
</entity_type_considerations>

<project_bible_integration>
Visual Style Extraction:
Derive artistic direction from genres, themes, and stated visual preferences
Setting Contextualization:
Use world setting to determine era, location characteristics, and cultural influences
Atmospheric Alignment:
Integrate project atmosphere into mood, lighting, and emotional tone
Thematic Consistency:
Ensure entity representation supports and reinforces project themes
</project_bible_integration>

${this.buildStructuredOutputFormat()}`;
  }

  /**
   * Генерация пользовательского промпта
   */
  protected getUserPrompt(input: EntityContextAnalysisInputV2, _context: ExecutionContext): string {
    const entityContext = this.buildContextPrompt(input);
    
    return `<project_context>
${entityContext}
</project_context>

<entity_data>
Name: ${input.entityData.name}
Type: ${input.entityData.entityType.name} (${input.entityData.entityType.type})
Description: ${input.entityData.description || 'No description provided'}

Entity Parameters:
${this.formatEntityParameters(input.entityData.values)}
</entity_data>

<project_bible>
Genres: ${Array.isArray(input.projectBible.genres) ? input.projectBible.genres.join(', ') : (input.projectBible.genres || 'Not specified')}
Setting: ${input.projectBible.setting || 'Not specified'}
Atmosphere: ${input.projectBible.atmosphere || 'Not specified'}
Main Themes: ${input.projectBible.mainThemes || 'Not specified'}
Synopsis: ${input.projectBible.synopsis || 'Not specified'}
Visual Style: ${input.projectBible.visualStyle || 'Not specified'}
References: ${input.projectBible.references || 'Not specified'}
</project_bible>

${input.customPromptRequirements && input.customPromptRequirements.length > 0 ? `<additional_user_requirements>
${input.customPromptRequirements.map(req => `- ${req}`).join('\n')}
</additional_user_requirements>

` : ''}
<task>
Analyze the provided context and create structured data for entity image generation that optimally balances entity-specific characteristics with project visual requirements.
</task>`;
  }

  /**
   * Парсинг результата AI
   */
  parseResult(aiResult: string, input: EntityContextAnalysisInputV2, realCostUSD: number, creditsCharged: number): EntityContextAnalysisOutputV2 {
    const parsedData = this.parseStructuredResponse(aiResult);
    
    // Валидируем и дополняем результат
    const result: EntityContextAnalysisOutputV2 = {
      enrichedContext: {
        entityInfo: {
          name: parsedData.result?.enrichedContext?.entityInfo?.name || input.entityData.name,
          type: parsedData.result?.enrichedContext?.entityInfo?.type || input.entityData.entityType.name,
          description: parsedData.result?.enrichedContext?.entityInfo?.description || input.entityData.description || '',
          category: this.normalizeCategory(input.entityData.entityType.type)
        },
        entityAttributes: {
          ...parsedData.result?.enrichedContext?.entityAttributes
        },
        projectContext: {
          worldSetting: parsedData.result?.enrichedContext?.projectContext?.worldSetting || input.projectBible.setting || 'Современный мир',
          visualStyle: parsedData.result?.enrichedContext?.projectContext?.visualStyle || input.projectBible.visualStyle || 'Реалистичный',
          atmosphere: parsedData.result?.enrichedContext?.projectContext?.atmosphere || input.projectBible.atmosphere || 'Нейтральная',
          genres: Array.isArray(parsedData.result?.enrichedContext?.projectContext?.genres) 
            ? parsedData.result.enrichedContext.projectContext.genres 
            : (Array.isArray(input.projectBible.genres) ? input.projectBible.genres : []),
          themes: parsedData.result?.enrichedContext?.projectContext?.themes || input.projectBible.mainThemes || 'Не указано'
        },
        imageGuidance: {
          suggestedAspectRatio: '1:1', // Всегда квадратное для единообразия
          styleDirection: parsedData.result?.enrichedContext?.imageGuidance?.styleDirection || 'Стандартный стиль проекта',
          focusElements: Array.isArray(parsedData.result?.enrichedContext?.imageGuidance?.focusElements) 
            ? parsedData.result.enrichedContext.imageGuidance.focusElements 
            : [input.entityData.name],
          avoidElements: Array.isArray(parsedData.result?.enrichedContext?.imageGuidance?.avoidElements) 
            ? parsedData.result.enrichedContext.imageGuidance.avoidElements 
            : [],
          userRequirements: input.customPromptRequirements || []
        }
      },
      realCostUSD,
      creditsCharged
    };

    return result;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  private formatEntityParameters(values: Record<string, any>): string {
    if (!values || Object.keys(values).length === 0) {
      return 'No parameters specified';
    }

    return Object.entries(values)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${this.formatParameterValue(value)}`)
      .join('\n');
  }

  private formatParameterValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object' && value !== null) {
      // Проверяем на наличие base64 изображений в объекте
      const jsonStr = JSON.stringify(value);
      if (jsonStr.length > 1000 || jsonStr.includes('data:image/') || jsonStr.includes('base64,')) {
        return '[Media content excluded]';
      }
      return jsonStr;
    }
    
    // Проверяем строки на наличие base64 изображений
    const stringValue = String(value);
    if (stringValue.length > 1000 || stringValue.includes('data:image/') || stringValue.includes('base64,')) {
      return '[Media content excluded]';
    }
    
    return stringValue;
  }

  private normalizeCategory(type: string): 'character' | 'location' | 'faction' | 'event' | 'rule' {
    const normalized = type.toLowerCase();
    if (['character', 'location', 'faction', 'event', 'rule'].includes(normalized)) {
      return normalized as 'character' | 'location' | 'faction' | 'event' | 'rule';
    }
    return 'character'; // fallback
  }
}
