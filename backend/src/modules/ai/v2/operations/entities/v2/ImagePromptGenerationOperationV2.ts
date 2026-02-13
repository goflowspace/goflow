// backend/src/modules/ai/v2/operations/entities/v2/ImagePromptGenerationOperationV2.ts
import { 
  EntityGenerationInput, 
  AbstractEntityGenerationOperation 
} from '../../../core/AbstractEntityGenerationOperation';
import { AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../../shared/types';
import { EntityContextAnalysisOutputV2 } from './EntityContextAnalysisOperationV2';

/**
 * Входные данные для генерации промпта изображения v2
 */
export interface ImagePromptGenerationInputV2 extends EntityGenerationInput {
  enrichedContext: EntityContextAnalysisOutputV2['enrichedContext']; // Результат анализа контекста
  imageProvider?: 'gemini' | 'openai' | 'stable-diffusion'; // Провайдер для генерации изображения
  imageQuality?: 'low' | 'medium' | 'high'; // Качество изображения
  aspectRatio?: string; // Соотношение сторон
  stylePreference?: string; // Предпочтительный стиль
  additionalRequirements?: string[]; // Дополнительные требования пользователя
}

/**
 * Выходные данные генерации промпта изображения v2
 */
export interface ImagePromptGenerationOutputV2 extends AIOperationOutput {
  imagePrompt: {
    mainPrompt: string; // Основной промпт для генерации
    negativePrompt?: string; // Негативный промпт (что исключить)
    styleModifiers: string[]; // Модификаторы стиля
    qualityKeywords: string[]; // Ключевые слова для качества
    aspectRatio: string; // Соотношение сторон
    suggestedSettings: {
      // Рекомендуемые настройки для провайдера
      steps?: number;
      guidanceScale?: number;
      strength?: number;
      seed?: number;
    };
  };
  promptMetadata: {
    complexity: 'simple' | 'medium' | 'complex'; // Сложность промпта
    focusAreas: string[]; // Области фокуса
    estimatedTokens: number; // Примерное количество токенов
    optimizedFor: string; // Для какого провайдера оптимизирован
  };  
}

/**
 * Операция генерации промпта изображения v2
 * Использует новую архитектуру с централизованными провайдерами
 */
export class ImagePromptGenerationOperationV2 extends AbstractEntityGenerationOperation<
  ImagePromptGenerationInputV2,
  ImagePromptGenerationOutputV2
> {
  readonly id = 'image-prompt-generation-v2';
  readonly name = 'Image Prompt Generation V2';
  readonly version = '2.0.0';

  // Конфигурация AI для разных уровней качества
  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.7,
        maxTokens: 1500,
        retries: 1,
        timeout: 20000
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.8,
        maxTokens: 1500,
        retries: 1,
        timeout: 25000
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.9,
        maxTokens: 1500,
        retries: 1,
        timeout: 40000
      }
    }
  };

  /**
   * Дополнительная валидация входных данных
   */
  protected validateAdditional(input: ImagePromptGenerationInputV2): string[] {
    const errors: string[] = [];
    
    if (!input.enrichedContext) {
      errors.push('enrichedContext is required');
    } else {
      if (!input.enrichedContext.entityInfo) {
        errors.push('enrichedContext.entityInfo is required');
      }
      if (!input.enrichedContext.projectContext) {
        errors.push('enrichedContext.projectContext is required');
      }
    }
    
    const validProviders = ['gemini', 'openai', 'stable-diffusion'];
    if (input.imageProvider && !validProviders.includes(input.imageProvider)) {
      errors.push(`imageProvider must be one of: ${validProviders.join(', ')}`);
    }
    
    const validQualities = ['low', 'medium', 'high'];
    if (input.imageQuality && !validQualities.includes(input.imageQuality)) {
      errors.push(`imageQuality must be one of: ${validQualities.join(', ')}`);
    }

    return errors;
  }

  /**
   * Генерация системного промпта
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are an expert image prompt engineer specializing in creating optimal prompts for AI image generators based on structured context. You excel at transforming entity descriptions and project contexts into highly effective, detailed prompts that produce consistent, high-quality visual outputs.
</role>

<context>
You are creating image generation prompts for creative project entities using enriched context data that includes entity information, project aesthetics, and specific visual guidance. Your prompts must be optimized for modern AI image generation models while respecting technical limitations and artistic requirements.
</context>

<objective>
Generate a comprehensive, well-structured image prompt that accurately represents the entity within its project context, incorporating all relevant visual elements while maintaining clarity, coherence, and technical compatibility with image generation systems.
</objective>

<prompt_engineering_principles>
Subject Clarity:
Provide clear, unambiguous description of the main subject and its key characteristics
Visual Specificity:
Include concrete visual details (appearance, clothing, poses, expressions)
Contextual Integration:
Seamlessly blend entity characteristics with environmental and atmospheric elements
Technical Optimization:
Structure prompts for maximum effectiveness with AI image generation models
Style Consistency:
Ensure visual style aligns with project aesthetics and genre requirements
Quality Enhancement:
Incorporate appropriate quality modifiers and technical specifications
</prompt_engineering_principles>

<optimal_prompt_structure>
Primary Subject:
Who or what is being depicted - clear identification of the main focus
Visual Details:
Appearance, clothing, attributes, distinctive features
Action and Pose:
What the subject is doing, body language, expression
Environment:
Background, location, contextual setting
Artistic Style:
Art style, technique, aesthetic approach
Quality Modifiers:
Detail level, resolution, craftsmanship indicators
Composition:
Camera angle, lighting, atmosphere, mood
</optimal_prompt_structure>

<entity_type_approaches>
CHARACTER Entities:
Focus on physical appearance, clothing, pose, facial expression, personality indicators
LOCATION Entities:
Emphasize architecture, landscape, atmosphere, environmental details, scale
EVENT Entities:
Capture action, dynamics, participants, temporal context, energy
RULE Entities:
Create conceptual representations, symbolic imagery, abstract visualization
</entity_type_approaches>

<quality_specifications>
Low Quality:
Simple prompts with basic details, minimal style modifiers
Medium Quality:
Moderate detail level with some style elements and quality keywords
High Quality:
Maximum detail, complex style solutions, extensive quality enhancements
</quality_specifications>

<technical_requirements>
- PROMPT MUST NOT EXCEED 2800 CHARACTERS (strict limitation)
- PROMPT MUST BE WRITTEN IN ENGLISH
- FOCUS ON KEY VISUAL ELEMENTS
- EXCLUDE REDUNDANT DETAILS IF PROMPT BECOMES TOO LONG
- STRUCTURE THE PROMPT FOR MAXIMUM EFFECTIVENESS WITH AI IMAGE GENERATORS
- ENSURE COHERENT INTEGRATION OF ENTITY CHARACTERISTICS WITH PROJECT CONTEXT
- LANGUAGE: All prompts must be in English
- NEGATIVE PROMPTS: Include appropriate negative prompts to exclude unwanted elements
</technical_requirements>

${this.buildStructuredOutputFormat()}`;
  }

  /**
   * Переопределяем формат вывода для специфической структуры промптов изображений
   */
  protected buildStructuredOutputFormat(): string {
    return `
<output_format>
Respond in JSON format with the following structure:
{
  "result": {
    "imagePrompt": {
      "mainPrompt": "Main image generation prompt in English",
      "negativePrompt": "Elements to exclude (optional)",
      "styleModifiers": ["style", "keywords"],
      "qualityKeywords": ["quality", "descriptors"],
      "aspectRatio": "1:1",
      "suggestedSettings": {
        "steps": 30,
        "guidanceScale": 7.5,
        "strength": 1.0
      }
    },
    "promptMetadata": {
      "complexity": "simple|medium|complex",
      "focusElements": ["key", "visual", "elements"],
      "estimatedTokens": 150,
      "optimizedFor": "gemini|openai|stable-diffusion"
    }
  },
}
</output_format>`;
  }

  /**
   * Генерация пользовательского промпта
   */
  protected getUserPrompt(input: ImagePromptGenerationInputV2, _context: ExecutionContext): string {
    const { enrichedContext } = input;
    
    return `<entity_context>
<entity_information>
Name: ${enrichedContext.entityInfo.name}
Type: ${enrichedContext.entityInfo.type}
Category: ${enrichedContext.entityInfo.category}
Description: ${enrichedContext.entityInfo.description}
</entity_information>

<entity_attributes>
${this.formatEntityAttributes(enrichedContext.entityAttributes)}
</entity_attributes>

<project_context>
World Setting: ${enrichedContext.projectContext.worldSetting}
Visual Style: ${enrichedContext.projectContext.visualStyle}
Atmosphere: ${enrichedContext.projectContext.atmosphere}
Genres: ${enrichedContext.projectContext.genres.join(', ')}
Themes: ${enrichedContext.projectContext.themes}
</project_context>

<image_guidance>
Suggested Aspect Ratio: ${enrichedContext.imageGuidance.suggestedAspectRatio}
Style Direction: ${enrichedContext.imageGuidance.styleDirection}
Focus Elements: ${enrichedContext.imageGuidance.focusElements.join(', ')}
Avoid Elements: ${enrichedContext.imageGuidance.avoidElements.join(', ')}
User Requirements: ${enrichedContext.imageGuidance.userRequirements.join(', ')}
</image_guidance>

<generation_settings>
Provider: ${input.imageProvider || 'gemini'}
Quality: ${input.imageQuality || 'medium'}
Aspect Ratio: ${input.aspectRatio || enrichedContext.imageGuidance.suggestedAspectRatio}
Style Preferences: ${input.stylePreference || 'Standard project style'}
</generation_settings>

${input.additionalRequirements && input.additionalRequirements.length > 0 ? `<additional_requirements>
${input.additionalRequirements.map(req => `- ${req}`).join('\n')}
</additional_requirements>

` : ''}
</entity_context>

<task>
Create an optimal image generation prompt for this entity, incorporating all provided data and context.

</task>`;
  }

  /**
   * Парсинг результата AI
   */
  parseResult(aiResult: string, input: ImagePromptGenerationInputV2, realCostUSD: number, creditsCharged: number): ImagePromptGenerationOutputV2 {
    const parsedData = this.parseStructuredResponse(aiResult);
    
    // Валидируем и дополняем результат
    const result: ImagePromptGenerationOutputV2 = {
      imagePrompt: {
        mainPrompt: this.limitPromptLength(parsedData.result?.imagePrompt?.mainPrompt || this.generateFallbackPrompt(input)),
        negativePrompt: parsedData.result?.imagePrompt?.negativePrompt,
        styleModifiers: Array.isArray(parsedData.result?.imagePrompt?.styleModifiers) 
          ? parsedData.result.imagePrompt.styleModifiers 
          : this.getDefaultStyleModifiers(input),
        qualityKeywords: Array.isArray(parsedData.result?.imagePrompt?.qualityKeywords) 
          ? parsedData.result.imagePrompt.qualityKeywords 
          : this.getDefaultQualityKeywords(input.imageQuality || 'medium'),
        aspectRatio: parsedData.result?.imagePrompt?.aspectRatio || input.aspectRatio || '1:1',
        suggestedSettings: {
          steps: parsedData.result?.imagePrompt?.suggestedSettings?.steps || this.getDefaultSteps(input.imageQuality || 'medium'),
          guidanceScale: parsedData.result?.imagePrompt?.suggestedSettings?.guidanceScale || 7.5,
          strength: parsedData.result?.imagePrompt?.suggestedSettings?.strength || 1.0,
          seed: parsedData.result?.imagePrompt?.suggestedSettings?.seed
        }
      },
      promptMetadata: {
        complexity: parsedData.result?.promptMetadata?.complexity || this.estimateComplexity(input),
        focusAreas: Array.isArray(parsedData.result?.promptMetadata?.focusAreas) 
          ? parsedData.result.promptMetadata.focusAreas 
          : input.enrichedContext.imageGuidance.focusElements,
        estimatedTokens: parsedData.result?.promptMetadata?.estimatedTokens || this.estimateTokens(parsedData.result?.imagePrompt?.mainPrompt || ''),
        optimizedFor: parsedData.result?.promptMetadata?.optimizedFor || input.imageProvider || 'gemini'
      },
      realCostUSD,
      creditsCharged
    };

    return result;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Безопасно ограничивает длину промпта до 3000 символов
   */
  private limitPromptLength(prompt: string, maxLength = 3000): string {
    if (!prompt || prompt.length <= maxLength) {
      return prompt;
    }

    console.log(`⚠️ Промпт превышает лимит: ${prompt.length} символов, ограничиваем до ${maxLength}`);

    // Пытаемся обрезать по предложениям
    const sentences = prompt.split(/[.!?]+/);
    let limitedPrompt = '';
    
    for (const sentence of sentences) {
      const nextPrompt = limitedPrompt + (limitedPrompt ? '. ' : '') + sentence.trim();
      if (nextPrompt.length > maxLength - 50) { // Оставляем запас
        break;
      }
      limitedPrompt = nextPrompt;
    }

    // Если не получилось обрезать по предложениям, обрезаем по словам
    if (!limitedPrompt || limitedPrompt.length < maxLength / 2) {
      const words = prompt.split(' ');
      limitedPrompt = '';
      
      for (const word of words) {
        const nextPrompt = limitedPrompt + (limitedPrompt ? ' ' : '') + word;
        if (nextPrompt.length > maxLength - 10) {
          break;
        }
        limitedPrompt = nextPrompt;
      }
    }

    // В крайнем случае просто обрезаем
    if (limitedPrompt.length > maxLength) {
      limitedPrompt = limitedPrompt.substring(0, maxLength - 3) + '...';
    }

    console.log(`✅ Промпт сокращен до ${limitedPrompt.length} символов`);
    return limitedPrompt;
  }

  private formatEntityAttributes(attributes: any): string {
    const parts: string[] = [];
    
    if (attributes.appearance) parts.push(`Appearance: ${attributes.appearance}`);
    if (attributes.personality) parts.push(`Personality: ${attributes.personality}`);
    if (attributes.background) parts.push(`Background: ${attributes.background}`);
    if (attributes.relationships) parts.push(`Relationships: ${attributes.relationships}`);
    if (attributes.abilities) parts.push(`Abilities: ${attributes.abilities}`);
    if (attributes.equipment) parts.push(`Equipment: ${attributes.equipment}`);
    if (attributes.location) parts.push(`Location: ${attributes.location}`);
    if (attributes.culture) parts.push(`Culture: ${attributes.culture}`);
    if (attributes.history) parts.push(`History: ${attributes.history}`);
    
    if (attributes.other && Object.keys(attributes.other).length > 0) {
      Object.entries(attributes.other).forEach(([key, value]) => {
        if (value) parts.push(`${key}: ${value}`);
      });
    }
    
    return parts.length > 0 ? parts.join('\n') : 'No attributes specified';
  }

  private generateFallbackPrompt(input: ImagePromptGenerationInputV2): string {
    const { entityInfo, projectContext } = input.enrichedContext;
    
    // Create a basic English prompt structure when AI parsing fails
    const fallbackPrompt = `${entityInfo.name}, character portrait, ${projectContext.visualStyle} art style, ${projectContext.atmosphere} mood, high quality, detailed illustration, professional artwork`;
    return this.limitPromptLength(fallbackPrompt);
  }

  private getDefaultStyleModifiers(input: ImagePromptGenerationInputV2): string[] {
    const { projectContext } = input.enrichedContext;
    const modifiers: string[] = [];
    
    // Добавляем стилевые модификаторы на основе жанров
    if (projectContext.genres.includes('fantasy')) {
      modifiers.push('fantasy art', 'magical');
    }
    if (projectContext.genres.includes('sci-fi')) {
      modifiers.push('futuristic', 'sci-fi');
    }
    if (projectContext.genres.includes('horror')) {
      modifiers.push('dark', 'ominous');
    }
    
    // Добавляем модификаторы на основе атмосферы
    if (projectContext.atmosphere.toLowerCase().includes('dark')) {
      modifiers.push('moody lighting', 'dramatic shadows');
    }
    if (projectContext.atmosphere.toLowerCase().includes('bright')) {
      modifiers.push('bright lighting', 'vibrant colors');
    }
    
    return modifiers.length > 0 ? modifiers : ['detailed', 'high quality'];
  }

  private getDefaultQualityKeywords(quality: string): string[] {
    const qualityMaps = {
      low: ['simple', 'clean'],
      medium: ['detailed', 'high quality'],
      high: ['ultra detailed', 'masterpiece', 'high resolution', '8k', 'professional']
    };
    
    return qualityMaps[quality as keyof typeof qualityMaps] || qualityMaps.medium;
  }

  private getDefaultSteps(quality: string): number {
    const stepMaps = {
      low: 20,
      medium: 30,
      high: 50
    };
    
    return stepMaps[quality as keyof typeof stepMaps] || stepMaps.medium;
  }

  private estimateComplexity(input: ImagePromptGenerationInputV2): 'simple' | 'medium' | 'complex' {
    const { entityAttributes, imageGuidance } = input.enrichedContext;
    
    let complexityScore = 0;
    
    // Считаем заполненные атрибуты
    Object.values(entityAttributes).forEach(value => {
      if (value && (typeof value === 'string' ? value.length > 0 : true)) {
        complexityScore++;
      }
    });
    
    // Добавляем за фокусные элементы
    complexityScore += imageGuidance.focusElements.length;
    
    // Добавляем за пользовательские требования
    complexityScore += imageGuidance.userRequirements.length;
    
    if (complexityScore <= 3) return 'simple';
    if (complexityScore <= 7) return 'medium';
    return 'complex';
  }

  private estimateTokens(text: string): number {
    // Простая оценка токенов (примерно 4 символа на токен)
    return Math.ceil(text.length / 4);
  }
}
