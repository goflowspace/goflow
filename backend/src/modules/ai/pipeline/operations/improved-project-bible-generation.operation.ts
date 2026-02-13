import { BaseAIOperation } from '../base/base-ai-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../interfaces/operation.interface';
import { AIOperationConfig } from '../interfaces/ai-operation.interface';
import { AIProvider } from '@prisma/client';

interface ProjectBibleGenerationInput {
  fieldType: string;
  projectContext: string;
  userSettings?: {
    preferredProvider?: AIProvider;
    preferredModel?: string;
    creativityLevel?: number;
  };
  additionalContext?: {
    existingFields?: Record<string, any>;
    projectGenres?: string[];
    targetAudience?: string;
  };
}

interface ProjectBibleGenerationOutput {
  fieldContent: string | string[];
  content: string | string[]; // Дублируем для интерфейса
  confidence: number;
  fieldType: string;
  explanation: string;
  metadata: {
    provider: string;
    model: string;
    tokensUsed: number;
    executionTime: number;
  };
}

/**
 * Улучшенная операция генерации библии проекта с SOLID архитектурой
 * Демонстрирует принципы:
 * - SRP: Фокус только на генерации контента библии
 * - OCP: Легко расширяется новыми типами полей
 * - DRY: AI логика вынесена в базовый класс
 */
export class ImprovedProjectBibleGenerationOperation extends BaseAIOperation {
  
  // Валидные типы полей библии проекта
  private readonly validFieldTypes = [
    'genres', 'formats', 'logline', 'synopsis', 'setting', 'targetAudience', 
    'mainThemes', 'message', 'references', 'uniqueFeatures',
    'atmosphere', 'visualStyle', 'constraints'
  ];

  constructor() {
    super(
      'improved_project_bible_generation',
      'Improved Project Bible Generation',
      '2.0.0',
      AIOperationCategory.CONTENT_GENERATION,
      ComplexityLevel.HEAVY,
      {
        requiredCapabilities: ['text_generation', 'context_understanding'],
        maxTokens: 10000,
        timeout: 30000
      }
    );
  }

  // ===== ВАЛИДАЦИЯ =====

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

    if (input.fieldType && !this.validFieldTypes.includes(input.fieldType)) {
      errors.push(`fieldType must be one of: ${this.validFieldTypes.join(', ')}`);
    }

    if (input.projectContext && input.projectContext.length < 20) {
      errors.push('projectContext must be at least 20 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== AI КОНФИГУРАЦИЯ =====

  getAIConfig(_context: ExecutionContext, userSettings?: any): AIOperationConfig {
    const baseConfig = super.getAIConfig(_context, userSettings);
    
    // Специфичная конфигурация для генерации библии проекта
    return {
      ...baseConfig,
      creativityLevel: userSettings?.creativityLevel || 0.7, // Высокая креативность для контента
      preferredModel: userSettings?.preferredModel,
      maxTokens: 10000, // Достаточно для детального контента
      temperature: 0.8 // Больше вариативности для творческого контента
    };
  }

  // ===== ПРОМПТЫ =====

  getSystemPrompt(input: any, _context: ExecutionContext): string {
    const typedInput = input as ProjectBibleGenerationInput;
    
    return `Ты эксперт по созданию библий творческих проектов и профессиональный сценарист.

Твоя задача - создать качественный контент для поля "${typedInput.fieldType}" библии проекта.

Принципы работы:
- Анализируй контекст проекта глубоко и внимательно
- Создавай контент, который органично вписывается в общую концепцию
- Используй профессиональную терминологию и подходы
- Делай контент конкретным, детальным и практически применимым
- Учитывай жанровые особенности и целевую аудиторию

Требования к ответу:
- Контент должен быть готов к использованию
- Избегай общих фраз и клише
- Фокусируйся на уникальных особенностях именно этого проекта
- Соблюдай тональность и стиль, соответствующий типу поля`;
  }

  getUserPrompt(input: any, _context: ExecutionContext): string {
    const typedInput = input as ProjectBibleGenerationInput;
    
    return `КОНТЕКСТ ПРОЕКТА:
{{projectContext}}

ТИП ПОЛЯ: {{fieldType}}

ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:
{{additionalInfo}}

${this.getFieldSpecificInstructions(typedInput.fieldType)}

Создай детальный и качественный контент для поля "${typedInput.fieldType}". 
Ответ должен быть готов к прямому использованию в библии проекта.`;
  }

  protected getPromptVariables(input: any, _context: ExecutionContext): Record<string, any> {
    const typedInput = input as ProjectBibleGenerationInput;
    const baseVariables = super.getPromptVariables(input, _context);
    
    // Формируем дополнительную информацию
    const additionalInfo = [];
    
    if (typedInput.additionalContext?.existingFields) {
      const existingFields = Object.entries(typedInput.additionalContext.existingFields)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      additionalInfo.push(`Существующие поля:\n${existingFields}`);
    }
    
    if (typedInput.additionalContext?.projectGenres?.length) {
      additionalInfo.push(`Жанры: ${typedInput.additionalContext.projectGenres.join(', ')}`);
    }
    
    if (typedInput.additionalContext?.targetAudience) {
      additionalInfo.push(`Целевая аудитория: ${typedInput.additionalContext.targetAudience}`);
    }
    
    return {
      ...baseVariables,
      projectContext: typedInput.projectContext,
      fieldType: typedInput.fieldType,
      additionalInfo: additionalInfo.length > 0 ? additionalInfo.join('\n\n') : 'Дополнительная информация отсутствует'
    };
  }

  // ===== ОБРАБОТКА РЕЗУЛЬТАТОВ =====

  processAIResult(aiResult: any, input: any, _context: ExecutionContext): ProjectBibleGenerationOutput {
    const typedInput = input as ProjectBibleGenerationInput;
    
    try {
      // aiResult.data содержит suggestions от провайдера
      const suggestions = Array.isArray(aiResult.data) ? aiResult.data : [aiResult.data];
      const firstSuggestion = suggestions[0];

      if (!firstSuggestion) {
        throw new Error('No suggestions returned from AI provider');
      }

      const fieldContent = firstSuggestion.description || firstSuggestion.content || '';
      
      if (!fieldContent.trim()) {
        throw new Error('Empty content generated');
      }

      let processedContent: string | string[] = fieldContent.trim();
      
      // Специальная обработка для жанров и форматов - извлекаем массивы
      if ((typedInput.fieldType === 'genres' || typedInput.fieldType === 'formats') && typeof processedContent === 'string') {
        console.log(`🔄 Converting ${typedInput.fieldType} from string to array`);
        processedContent = this.extractListFromText(processedContent, typedInput.fieldType as 'genres' | 'formats');
        console.log(`✅ Converted to:`, processedContent);
      }
      
      return {
        fieldContent: processedContent,
        content: processedContent, // Дублируем для интерфейса
        confidence: firstSuggestion.confidence || 0.8,
        fieldType: typedInput.fieldType,
        explanation: firstSuggestion.explanation || `Сгенерировано контент для поля "${typedInput.fieldType}" с учетом контекста проекта.`,
        metadata: {
          provider: aiResult.provider || 'unknown',
          model: aiResult.model || 'unknown',
          tokensUsed: aiResult.tokensUsed || 0,
          executionTime: Date.now()
        }
      };

    } catch (error) {
      console.error('❌ Failed to process AI result for project bible generation:', error);
      
      // Возвращаем базовый результат в случае ошибки
      const errorContent: string | string[] = (typedInput.fieldType === 'genres' || typedInput.fieldType === 'formats') 
        ? [`Ошибка генерации ${typedInput.fieldType}`]
        : `Ошибка генерации контента для поля "${typedInput.fieldType}". Попробуйте еще раз.`;
      
      return {
        fieldContent: errorContent,
        content: errorContent, // Дублируем для интерфейса
        confidence: 0.1,
        fieldType: typedInput.fieldType,
        explanation: `Произошла ошибка при генерации контента для поля "${typedInput.fieldType}".`,
        metadata: {
          provider: 'error',
          model: 'error',
          tokensUsed: 0,
          executionTime: 0
        }
      };
    }
  }

  // ===== КАСТОМНАЯ СТОИМОСТЬ =====

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    const typedInput = input as ProjectBibleGenerationInput;
    
    // Увеличиваем стоимость для сложных полей
    const complexFields = ['synopsis', 'setting', 'mainThemes', 'uniqueFeatures'];
    if (typedInput.fieldType && complexFields.includes(typedInput.fieldType)) {
      return 1.5;
    }
    
    // Увеличиваем стоимость для большого контекста
    if (typedInput.projectContext && typedInput.projectContext.length > 2000) {
      return 1.3;
    }
    
    return 1.0;
  }

  // ===== ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ AI =====

  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'generateSuggestions';
  }

  protected getSuggestionType(): string {
    return 'PROJECT_BIBLE';
  }



  protected getDefaultCreativityLevel(): number {
    return 0.7;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Извлекает список жанров или форматов из текста
   */
  private extractListFromText(content: string, fieldType: 'genres' | 'formats'): string[] {
    try {
      // Ищем нумерованные списки (1. Жанр, 2. Жанр и т.д.)
      const numberedMatches = content.match(/\d+\.\s*([^:\n]+)[\:\-]?/g);
      if (numberedMatches && numberedMatches.length > 0) {
        return numberedMatches
          .map(match => {
            // Извлекаем название после номера и до двоеточия/тире
            const cleanMatch = match.replace(/^\d+\.\s*/, '').replace(/[\:\-].*$/, '').trim();
            return cleanMatch;
          })
          .filter(item => item.length > 0 && item.length < 100)
          .slice(0, 5); // Ограничиваем до 5 элементов
      }

      // Ищем элементы через запятую
      const commaMatches = content.split(/[,\n;]/)
        .map(item => item.trim())
        .filter(item => item.length > 0 && item.length < 100)
        .slice(0, 5);

      if (commaMatches.length > 1) {
        return commaMatches;
      }

      // Если ничего не найдено, возвращаем дефолтные значения
      const defaultValues = {
        genres: ['Drama', 'Thriller'],
        formats: ['Feature Film', 'Series']
      };

      console.log(`⚠️ Could not parse ${fieldType} from content, using defaults`);
      return defaultValues[fieldType];

    } catch (error) {
      console.error(`❌ Error extracting ${fieldType} from content:`, error);
      return fieldType === 'genres' ? ['Drama'] : ['Feature Film'];
    }
  }

  /**
   * Получение специфичных инструкций для каждого типа поля
   */
  private getFieldSpecificInstructions(fieldType: string): string {
    const instructions = {
      genres: `ИНСТРУКЦИИ ДЛЯ ЖАНРОВ:
- Укажи основные и дополнительные жанры
- Объясни, как жанры проявляются в проекте
- Укажи особенности жанровых конвенций
- Добавь современные жанровые элементы если уместно`,

      logline: `ИНСТРУКЦИИ ДЛЯ ЛОГЛАЙНА:
- Создай краткое (1-2 предложения) описание
- Включи главного героя, конфликт и ставки
- Сделай интригующим и запоминающимся
- Избегай спойлеров концовки`,

      synopsis: `ИНСТРУКЦИИ ДЛЯ СИНОПСИСА:
- Создай структурированное описание сюжета
- Укажи основные сюжетные точки
- Опиши главных персонажей и их арки
- Раскрой центральный конфликт и его разрешение
- Объем: 2-4 абзаца`,

      setting: `ИНСТРУКЦИИ ДЛЯ СЕТТИНГА:
- Детально опиши время и место действия
- Укажи важные локации и их особенности
- Объясни, как сеттинг влияет на сюжет
- Добавь атмосферные детали`,

      targetAudience: `ИНСТРУКЦИИ ДЛЯ ЦЕЛЕВОЙ АУДИТОРИИ:
- Определи основную демографию
- Укажи психографические характеристики
- Объясни, что привлечет эту аудиторию
- Добавь вторичные аудитории если есть`,

      mainThemes: `ИНСТРУКЦИИ ДЛЯ ГЛАВНЫХ ТЕМ:
- Сформулируй 2-4 основные темы
- Объясни, как темы раскрываются в сюжете
- Покажи связь тем с современностью
- Укажи эмоциональное воздействие`,

      message: `ИНСТРУКЦИИ ДЛЯ ПОСЫЛА:
- Сформулируй центральную идею проекта
- Объясни, что зритель должен вынести
- Свяжи с актуальными социальными темами
- Сделай посыл конкретным и действенным`,

      atmosphere: `ИНСТРУКЦИИ ДЛЯ АТМОСФЕРЫ:
- Опиши общее настроение и тон
- Укажи визуальный и звуковой стиль
- Объясни эмоциональную палитру
- Добавь конкретные атмосферные элементы`,

      uniqueFeatures: `ИНСТРУКЦИИ ДЛЯ УНИКАЛЬНЫХ ОСОБЕННОСТЕЙ:
- Укажи, чем проект отличается от похожих
- Выдели инновационные элементы
- Объясни конкурентные преимущества
- Добавь запоминающиеся детали`
    };

    return instructions[fieldType as keyof typeof instructions] || 
           'Создай качественный контент для данного поля библии проекта.';
  }
}