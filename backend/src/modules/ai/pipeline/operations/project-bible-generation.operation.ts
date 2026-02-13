import { BaseOperation } from '../base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../interfaces/operation.interface';
import { AIProviderFactory } from '../../providers/ai-provider.factory';
import { PromptBuilder } from '../../providers/prompt-builder';
import { AIProvider } from '@prisma/client';

/**
 * Операция для генерации контента библии проекта
 */
export class ProjectBibleGenerationOperation extends BaseOperation {
  constructor() {
    super(
      'project_bible_generation',
      'Project Bible Generation',
      '1.0.0',
      AIOperationCategory.CONTENT_GENERATION,
      ComplexityLevel.HEAVY,
      {
        requiredCapabilities: ['text_generation', 'context_understanding'],
        maxTokens: 10000,
        timeout: 30000
      }
    );
  }

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      errors.push('Input must be an object');
      return { isValid: false, errors };
    }

    if (!input.fieldType || typeof input.fieldType !== 'string') {
      errors.push('fieldType is required and must be a string');
    }

    if (!input.projectContext || typeof input.projectContext !== 'string') {
      errors.push('projectContext is required and must be a string');
    }

    // Проверяем валидные типы полей
    const validFieldTypes = [
      'genres', 'formats', 'logline', 'synopsis', 'setting', 'targetAudience', 
      'mainThemes', 'message', 'references', 'uniqueFeatures',
      'atmosphere', 'visualStyle', 'constraints'
    ];

    if (input.fieldType && !validFieldTypes.includes(input.fieldType)) {
      errors.push(`fieldType must be one of: ${validFieldTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(
    input: any, 
    _context: ExecutionContext
  ): Promise<{
    data: any;
    tokensUsed?: number;
    model?: string;
  }> {
    const { fieldType, projectContext, userSettings } = input;

    try {
      // Создаем AI Provider
      const aiProvider = AIProviderFactory.create(
        userSettings?.preferredProvider || AIProvider.GEMINI
      );

      // Строим детальный промпт для конкретного типа поля
      const prompt = PromptBuilder.getProjectBiblePrompt(fieldType, projectContext);
      
      console.log(`\n📖 =============== PROJECT BIBLE FIELD GENERATION ===============`);
      console.log(`🎯 Field Type: ${fieldType}`);
      console.log(`📝 Project Context: ${projectContext.substring(0, 150)}${projectContext.length > 150 ? '...' : ''}`);
      console.log(`🔧 User Settings:`, userSettings);
      console.log('===============================================================\n');

      // Генерируем контент, передавая детальный промпт
      const suggestions = await aiProvider.generateSuggestions({
        context: prompt, // Передаем детальный промпт вместо базового контекста
        userSettings: userSettings || {},
        suggestionType: 'PROJECT_BIBLE',
        maxTokens: this.requirements.maxTokens || 4000
      });

      if (!suggestions || suggestions.length === 0) {
        throw new Error('No content generated');
      }

      // Берем первое предложение как результат
      const result = suggestions[0];
      let content: string | string[] = result.description || result.title || '';
      const explanation: string = result.explanation || 'Объяснение недоступно';
      
      console.log(`\n🎉 ================ FIELD GENERATION RESULT ================`);
      console.log(`🎯 Field Type: ${fieldType}`);

      console.log(`📝 Raw Content: ${typeof content === 'string' ? content.substring(0, 200) : JSON.stringify(content)}${typeof content === 'string' && content.length > 200 ? '...' : ''}`);
      console.log(`💭 Explanation: ${explanation}`);
      console.log('=========================================================\n');
      
      // Специальная обработка для жанров и форматов - извлекаем массивы
      if ((fieldType === 'genres' || fieldType === 'formats') && typeof content === 'string') {
        content = this.extractListFromText(content, fieldType);
      }
      
      // Извлекаем метаданные от AI провайдера
      const aiMetadata = (result as any).metadata || {};
      
      const finalResult = {
        data: {
          content,
          explanation,
          fieldType,
          metadata: {
            generatedAt: new Date().toISOString(),
            provider: aiMetadata.provider || userSettings?.preferredProvider,
            model: aiMetadata.model || userSettings?.preferredModel,
            prompt: aiMetadata.prompt || prompt,
            context: aiMetadata.context || projectContext,
            fullResponse: aiMetadata.fullResponse || content,
            tokensUsed: aiMetadata.tokensUsed || 0,
            promptTokens: aiMetadata.promptTokens || 0,
            completionTokens: aiMetadata.completionTokens || 0,
            cost: aiMetadata.cost || 0,
            temperature: aiMetadata.temperature || 0.7,
            maxTokens: aiMetadata.maxTokens || 4000,
            responseTime: aiMetadata.responseTime || 0
          }
        },
        tokensUsed: aiMetadata.tokensUsed || 150, // Используем реальное значение или fallback
        model: aiMetadata.model || userSettings?.preferredModel
      };

      console.log(`\n✅ ================ FINAL OPERATION RESULT ================`);
      console.log(`🎯 Field Type: ${fieldType}`);
      console.log(`📝 Final Content Type: ${Array.isArray(content) ? 'Array' : typeof content}`);
      console.log(`📝 Final Content: ${Array.isArray(content) ? JSON.stringify(content) : content.substring(0, 200)}${!Array.isArray(content) && content.length > 200 ? '...' : ''}`);
      console.log(`💭 Explanation: ${explanation}`);
      console.log(`🔧 Provider: ${finalResult.data.metadata.provider}`);
      console.log(`🎲 Tokens Used: ${finalResult.tokensUsed}`);
      console.log(`💰 Cost: $${finalResult.data.metadata.cost.toFixed(6)}`);
      console.log('========================================================\n');

      return finalResult;

    } catch (error) {
      console.error('Project Bible Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate ${fieldType}: ${errorMessage}`);
    }
  }

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    // Стоимость зависит от типа поля и сложности
    const complexFields = ['synopsis', 'setting', 'atmosphere'];
    const baseMultiplier = complexFields.includes(input.fieldType) ? 3 : 2;
    
    return baseMultiplier * this.complexity;
  }

  /**
   * Извлекает список жанров или форматов из текста ответа AI
   */
  private extractListFromText(content: string, fieldType: 'genres' | 'formats'): string[] {
    const availableOptions = {
      genres: [
        'rpg', 'adventure', 'visual_novel', 'interactive_fiction', 'dating_sim', 
        'detective', 'horror', 'fantasy', 'sci_fi', 'historical',
        'comedy', 'drama', 'thriller', 'romance', 'educational'
      ],
      formats: [
        'visual_novel', 'interactive_fiction', 'dialogue_system', 'quest', 'branching_story',
        'adventure', 'text_adventure', 'chat_fiction', 'rpg_dialogue', 'cutscene_script',
        'game_tutorial', 'character_backstory', 'worldbuilding', 'interactive_lesson',
        'training_scenario', 'case_study', 'simulation_script', 'assessment_quest'
      ]
    };

    const options = availableOptions[fieldType];
    const defaultValue = fieldType === 'genres' ? ['fantasy'] : ['visual_novel'];

    try {
      // Первый способ: ищем формат "item1, item2, item3" в тексте
      const commaMatch = content.match(/([a-z_]+(?:,\s*[a-z_]+)*)/i);
      if (commaMatch) {
        const items = commaMatch[0].split(',').map(item => item.trim().toLowerCase());
        const validItems = items.filter(item => options.includes(item));
        if (validItems.length > 0) {
          return validItems.slice(0, 3);
        }
      }

      // Второй способ: ищем любые упоминания известных опций в тексте
      const lowerContent = content.toLowerCase();
      const foundItems = options.filter(option => {
        const optionWords = option.replace(/_/g, ' ');
        return lowerContent.includes(option) || lowerContent.includes(optionWords);
      });

      if (foundItems.length > 0) {
        return foundItems.slice(0, 3);
      }

      // Если ничего не найдено, возвращаем значение по умолчанию
      console.log(`⚠️ No valid ${fieldType} found in content, using default:`, defaultValue);
      return defaultValue;

    } catch (error) {
      console.error(`❌ Error extracting ${fieldType} from content:`, error);
      return defaultValue;
    }
  }
} 