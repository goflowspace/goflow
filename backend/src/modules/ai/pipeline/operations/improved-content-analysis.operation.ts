import { BaseAIOperation } from '../base/base-ai-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../interfaces/operation.interface';
import { AIOperationConfig } from '../interfaces/ai-operation.interface';

interface ContentAnalysisInput {
  content: string;
  analysisType?: 'summary' | 'keywords' | 'sentiment' | 'structure';
}

interface ContentAnalysisOutput {
  summary?: string;
  keywords?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  structure?: {
    characters: string[];
    locations: string[];
    themes: string[];
  };
  confidence: number;
}

/**
 * Улучшенная операция анализа контента с SOLID архитектурой
 * Демонстрирует принципы:
 * - SRP: Фокус только на бизнес-логике анализа контента
 * - OCP: Легко расширяется новыми типами анализа
 * - DRY: Общая AI логика вынесена в базовый класс
 */
export class ImprovedContentAnalysisOperation extends BaseAIOperation {
  
  constructor() {
    super(
      'improved_content_analysis',
      'Improved Content Analysis',
      '2.0.0',
      AIOperationCategory.CONTENT_ANALYSIS,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: ['text_analysis'],
        maxTokens: 10000,
        timeout: 30000
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

    const typedInput = input as ContentAnalysisInput;

    if (!typedInput.content || typeof typedInput.content !== 'string') {
      errors.push('Content must be a non-empty string');
    }

    if (typedInput.content && typedInput.content.length < 10) {
      errors.push('Content must be at least 10 characters long');
    }

    if (typedInput.content && typedInput.content.length > 50000) {
      errors.push('Content is too long (max 50,000 characters)');
    }

    if (typedInput.analysisType && 
        !['summary', 'keywords', 'sentiment', 'structure'].includes(typedInput.analysisType)) {
      errors.push('Invalid analysis type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== AI КОНФИГУРАЦИЯ =====

  getAIConfig(context: ExecutionContext, userSettings?: any): AIOperationConfig {
    const baseConfig = super.getAIConfig(context, userSettings);
    
    // Специфичная конфигурация для анализа контента
    return {
      ...baseConfig,
      creativityLevel: 0.3, // Низкая креативность для точного анализа
      preferredModel: userSettings?.preferredModel,
      maxTokens: 2000 // Анализ не требует длинных ответов
    };
  }

  // ===== ПРОМПТЫ =====

  getSystemPrompt(input: any, _context: ExecutionContext): string {
    const typedInput = input as ContentAnalysisInput;
    const analysisType = typedInput.analysisType || 'summary';

    return `Ты эксперт по анализу текстового контента. 
Твоя задача - провести ${this.getAnalysisTypeDescription(analysisType)} предоставленного контента.

Правила:
- Будь объективным и точным
- Отвечай только в формате JSON
- Используй русский язык для описаний
- Укажи уровень уверенности (0.0-1.0)

Формат ответа должен соответствовать схеме для типа анализа "${analysisType}".`;
  }

  getUserPrompt(input: any, _context: ExecutionContext): string {
    const typedInput = input as ContentAnalysisInput;
    const analysisType = typedInput.analysisType || 'summary';

    return `Проанализируй следующий контент:

"""
{{content}}
"""

Тип анализа: ${analysisType}

${this.getAnalysisInstructions(analysisType)}`;
  }

  protected getPromptVariables(input: any, context: ExecutionContext): Record<string, any> {
    const baseVariables = super.getPromptVariables(input, context);
    const typedInput = input as ContentAnalysisInput;
    
    return {
      ...baseVariables,
      content: typedInput.content,
      analysisType: typedInput.analysisType || 'summary',
      contentLength: typedInput.content.length
    };
  }

  // ===== ОБРАБОТКА РЕЗУЛЬТАТОВ =====

  processAIResult(aiResult: any, input: any, _context: ExecutionContext): ContentAnalysisOutput {
    const typedInput = input as ContentAnalysisInput;
    const analysisType = typedInput.analysisType || 'summary';

    try {
      // aiResult.data содержит suggestions от провайдера
      const suggestions = Array.isArray(aiResult.data) ? aiResult.data : [aiResult.data];
      const firstSuggestion = suggestions[0];

      if (!firstSuggestion) {
        throw new Error('No suggestions returned from AI provider');
      }

      // Парсим результат в зависимости от типа анализа
      return this.parseAnalysisResult(firstSuggestion, analysisType);

    } catch (error) {
      console.error('❌ Failed to process AI result:', error);
      
      // Возвращаем базовый результат в случае ошибки
      return {
        confidence: 0.1,
        ...(analysisType === 'summary' && { summary: 'Анализ не удался' }),
        ...(analysisType === 'keywords' && { keywords: [] }),
        ...(analysisType === 'sentiment' && { sentiment: 'neutral' as const }),
        ...(analysisType === 'structure' && { 
          structure: { characters: [], locations: [], themes: [] } 
        })
      };
    }
  }

  // ===== КАСТОМНАЯ СТОИМОСТЬ =====

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    const typedInput = input as ContentAnalysisInput;
    const contentLength = typedInput.content.length;

    // Увеличиваем стоимость для длинного контента
    if (contentLength > 10000) return 1.5;
    if (contentLength > 5000) return 1.2;
    
    return 1.0;
  }

  // ===== ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ AI =====

  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'generateSuggestions';
  }

  protected getSuggestionType(): string {
    return 'STRUCTURE_ONLY';
  }



  protected getDefaultCreativityLevel(): number {
    return 0.3;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  private getAnalysisTypeDescription(analysisType: string): string {
    const descriptions = {
      summary: 'краткий обзор и суммаризацию',
      keywords: 'извлечение ключевых тем и слов',
      sentiment: 'анализ эмоциональной окраски',
      structure: 'структурный анализ элементов'
    };
    
    return descriptions[analysisType as keyof typeof descriptions] || 'общий анализ';
  }

  private getAnalysisInstructions(analysisType: string): string {
    const instructions = {
      summary: `Верни JSON в формате:
{
  "summary": "Краткое изложение основного содержания",
  "confidence": 0.9
}`,
      keywords: `Верни JSON в формате:
{
  "keywords": ["ключевое_слово_1", "ключевое_слово_2", "тема_3"],
  "confidence": 0.8
}`,
      sentiment: `Верни JSON в формате:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.85
}`,
      structure: `Верни JSON в формате:
{
  "structure": {
    "characters": ["персонаж_1", "персонаж_2"],
    "locations": ["место_1", "место_2"],
    "themes": ["тема_1", "тема_2"]
  },
  "confidence": 0.8
}`
    };

    return instructions[analysisType as keyof typeof instructions] || 'Проведи общий анализ.';
  }

  private parseAnalysisResult(suggestion: any, analysisType: string): ContentAnalysisOutput {
    const baseResult: ContentAnalysisOutput = {
      confidence: suggestion.confidence || 0.5
    };

    try {
      // Пытаемся распарсить JSON из description
      const jsonMatch = suggestion.description?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        switch (analysisType) {
          case 'summary':
            return { ...baseResult, summary: parsedData.summary };
          case 'keywords':
            return { ...baseResult, keywords: parsedData.keywords || [] };
          case 'sentiment':
            return { ...baseResult, sentiment: parsedData.sentiment || 'neutral' };
          case 'structure':
            return { ...baseResult, structure: parsedData.structure || { characters: [], locations: [], themes: [] } };
          default:
            return { ...baseResult, summary: parsedData.summary || suggestion.description };
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse JSON result, using fallback');
    }

    // Fallback: используем description как summary
    return { ...baseResult, summary: suggestion.description || 'Анализ выполнен' };
  }
}