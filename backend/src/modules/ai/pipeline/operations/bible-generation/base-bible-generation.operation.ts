import { BaseAIOperation } from '../../base/base-ai-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../../interfaces/operation.interface';
import { AIOperationConfig } from '../../interfaces/ai-operation.interface';
import { AIProvider } from '@prisma/client';

/**
 * Базовый интерфейс для входных данных генерации библии проекта
 */
export interface BaseBibleGenerationInput {
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

/**
 * Базовый интерфейс для выходных данных генерации библии проекта
 */
export interface BaseBibleGenerationOutput {
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
 * Базовый класс для операций генерации полей библии проекта
 * Содержит общую логику и интерфейс для всех операций генерации библии
 */
export abstract class BaseBibleGenerationOperation extends BaseAIOperation {
  
  protected abstract fieldType: string;
  protected abstract defaultCreativityLevel: number;
  protected abstract defaultTemperature: number;
  protected abstract maxTokens: number;
  protected abstract maxContentLength: number;

  constructor(
    operationId: string,
    name: string,
    version: string = '1.0.0'
  ) {
    super(
      operationId,
      name,
      version,
      AIOperationCategory.CONTENT_GENERATION,
      ComplexityLevel.HEAVY,
      {
        requiredCapabilities: ['text_generation', 'context_understanding'],
        maxTokens: 4000,
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

    if (!input.projectContext || typeof input.projectContext !== 'string') {
      errors.push('projectContext is required and must be a string');
    }

    if (input.projectContext && input.projectContext.length < 20) {
      errors.push('projectContext must be at least 20 characters long');
    }

    // Дополнительная валидация для конкретного типа поля
    const customErrors = this.validateFieldSpecificInput(input);
    errors.push(...customErrors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Дополнительная валидация для конкретного типа поля
   * Переопределяется в наследниках при необходимости
   */
  protected validateFieldSpecificInput(_input: any): string[] {
    return [];
  }

  // ===== AI КОНФИГУРАЦИЯ =====

  getAIConfig(_context: ExecutionContext, userSettings?: any): AIOperationConfig {
    const baseConfig = super.getAIConfig(_context, userSettings);
    
    return {
      ...baseConfig,
      creativityLevel: userSettings?.creativityLevel || this.defaultCreativityLevel,
      preferredModel: userSettings?.preferredModel || this.getDefaultModel(),
      maxTokens: this.maxTokens,
      temperature: this.defaultTemperature
    };
  }

  // ===== ПРОМПТЫ =====

  getSystemPrompt(_input: any, _context: ExecutionContext): string {    
    return `Ты эксперт по созданию библий творческих проектов и профессиональный сценарист.

Твоя задача - создать качественный контент для поля "${this.fieldType}" библии проекта.

Принципы работы:
- Анализируй контекст проекта глубоко и внимательно
- Создавай контент, который органично вписывается в общую концепцию
- Используй профессиональную терминологию и подходы
- Делай контент конкретным, детальным и практически применимым
- Учитывай жанровые особенности и целевую аудиторию

${this.getFieldSpecificSystemPrompt()}

Требования к ответу:
- Контент должен быть готов к использованию
- Избегай общих фраз и клише
- Фокусируйся на уникальных особенностях именно этого проекта
- Соблюдай тональность и стиль, соответствующий типу поля`;
  }

  getUserPrompt(_input: any, _context: ExecutionContext): string {
    return `КОНТЕКСТ ПРОЕКТА:
{{projectContext}}

ТИП ПОЛЯ: ${this.fieldType}

ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:
{{additionalInfo}}

${this.getFieldSpecificInstructions()}

Создай детальный и качественный контент для поля "${this.fieldType}". 
Ответ должен быть готов к прямому использованию в библии проекта.`;
  }

  protected getPromptVariables(input: any, _context: ExecutionContext): Record<string, any> {
    const typedInput = input as BaseBibleGenerationInput;
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
      additionalInfo: additionalInfo.length > 0 ? additionalInfo.join('\n\n') : 'Дополнительная информация отсутствует'
    };
  }

  // ===== ОБРАБОТКА РЕЗУЛЬТАТОВ =====

  processAIResult(aiResult: any, input: any, _context: ExecutionContext): BaseBibleGenerationOutput {
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
      
      // Специальная обработка для конкретного типа поля
      processedContent = this.processFieldContent(processedContent, input);
      
      // Применяем централизованное ограничение длины
      processedContent = this.truncateContent(processedContent);
      
      return {
        fieldContent: processedContent,
        content: processedContent, // Дублируем для интерфейса
        confidence: firstSuggestion.confidence || 0.8,
        fieldType: this.fieldType,
        explanation: firstSuggestion.explanation || `Сгенерирован контент для поля "${this.fieldType}" с учетом контекста проекта.`,
        metadata: {
          provider: aiResult.provider || 'unknown',
          model: aiResult.model || 'unknown',
          tokensUsed: aiResult.tokensUsed || 0,
          executionTime: Date.now()
        }
      };

    } catch (error) {
      console.error(`❌ Failed to process AI result for ${this.fieldType} generation:`, error);
      
      return {
        fieldContent: this.getErrorContent(),
        content: this.getErrorContent(), // Дублируем для интерфейса
        confidence: 0.1,
        fieldType: this.fieldType,
        explanation: `Произошла ошибка при генерации контента для поля "${this.fieldType}".`,
        metadata: {
          provider: 'error',
          model: 'error',
          tokensUsed: 0,
          executionTime: 0
        }
      };
    }
  }

  // ===== ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ AI =====

  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'generateSuggestions';
  }

  protected getSuggestionType(): string {
    return 'PROJECT_BIBLE';
  }



  protected getDefaultCreativityLevel(): number {
    return this.defaultCreativityLevel;
  }

  // ===== АБСТРАКТНЫЕ МЕТОДЫ =====

  /**
   * Получение специфичных инструкций для поля
   */
  protected abstract getFieldSpecificInstructions(): string;

  /**
   * Получение специфичной части системного промпта
   */
  protected abstract getFieldSpecificSystemPrompt(): string;

  /**
   * Обработка контента для конкретного типа поля
   */
  protected abstract processFieldContent(content: string | string[], input: any): string | string[];

  /**
   * Контент для возврата в случае ошибки
   */
  protected abstract getErrorContent(): string | string[];

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Централизованное обрезание контента по maxContentLength
   */
  protected truncateContent(content: string | string[]): string | string[] {
    if (Array.isArray(content)) {
      // Для массивов обрезаем каждый элемент
      return content.map(item => this.truncateStringContent(item));
    } else {
      // Для строк обрезаем напрямую
      return this.truncateStringContent(content);
    }
  }

  /**
   * Обрезание строкового контента
   */
  private truncateStringContent(content: string): string {
    if (content.length <= this.maxContentLength) {
      return content;
    }

    console.log(`⚠️ Content too long (${content.length} chars), truncating to ${this.maxContentLength} chars for field "${this.fieldType}"`);
    
    // Обрезаем по символам, но стараемся не разрывать слова
    let truncated = content.substring(0, this.maxContentLength);
    
    // Если обрезали посреди слова, найдем последний пробел
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > this.maxContentLength * 0.9) { // Если пробел в последних 10%
      truncated = truncated.substring(0, lastSpaceIndex);
    }
    
    // Убираем незавершенные предложения
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'), 
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > truncated.length * 0.8) { // Если знак препинания в последних 20%
      truncated = truncated.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated.trim();
  }

  /**
   * Извлекает список элементов из текста (для массивов)
   */
  protected extractListFromText(content: string, maxItems: number = 5): string[] {
    try {
      // Ищем нумерованные списки (1. Элемент, 2. Элемент и т.д.)
      const numberedMatches = content.match(/\d+\.\s*([^:\n]+)[\:\-]?/g);
      if (numberedMatches && numberedMatches.length > 0) {
        return numberedMatches
          .map(match => {
            // Извлекаем название после номера и до двоеточия/тире
            const cleanMatch = match.replace(/^\d+\.\s*/, '').replace(/[\:\-].*$/, '').trim();
            return cleanMatch;
          })
          .filter(item => item.length > 0 && item.length < 100)
          .slice(0, maxItems);
      }

      // Ищем элементы через запятую
      const commaMatches = content.split(/[,\n;]/)
        .map(item => item.trim())
        .filter(item => item.length > 0 && item.length < 100)
        .slice(0, maxItems);

      if (commaMatches.length > 1) {
        return commaMatches;
      }

      // Если ничего не найдено, пробуем извлечь строки через переносы
      const lineMatches = content.split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(item => item.length > 0 && item.length < 100)
        .slice(0, maxItems);

      return lineMatches.length > 0 ? lineMatches : [];

    } catch (error) {
      console.error(`❌ Error extracting list from content:`, error);
      return [];
    }
  }
}