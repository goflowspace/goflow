import { BaseOperation } from '../base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../interfaces/operation.interface';
import { AIProviderFactory } from '../../providers/ai-provider.factory';
import { AIProvider } from '@prisma/client';

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
 * Операция анализа контента
 * Пример простой операции для демонстрации Pipeline архитектуры
 */
export class ContentAnalysisOperation extends BaseOperation {
  constructor() {
    super(
      'content_analysis',
      'Content Analysis',
      '1.0.0',
      AIOperationCategory.CONTENT_ANALYSIS,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: ['text_analysis'],
        maxTokens: 10000,
        timeout: 30000
      }
    );
  }

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

    protected async executeOperation(
    input: any,
    _context: ExecutionContext
  ): Promise<{ data: any; tokensUsed?: number; model?: string }> {
    const typedInput = input as ContentAnalysisInput;
    const analysisType = typedInput.analysisType || 'summary';

    try {
      // Используем существующую систему провайдеров
      const provider = AIProviderFactory.create(AIProvider.GEMINI);
      
      // Формируем промпт в зависимости от типа анализа
      const prompt = this.buildAnalysisPrompt(typedInput.content, analysisType);
      
      // Выполняем анализ через провайдера
      const suggestions = await provider.generateSuggestions({
        context: prompt,
        userSettings: { creativityLevel: 0.3 }, // Низкая креативность для анализа
        suggestionType: 'STRUCTURE_ONLY',
        maxTokens: 10000 // Ограничиваем токены для анализа контента
      });

      // Обрабатываем результат
      const result = this.parseAnalysisResult(suggestions, analysisType);

      return {
        data: result,
        tokensUsed: this.estimateTokenUsage(typedInput.content, prompt),
        model: 'claude-3-5-sonnet-20241022'
      };

    } catch (error) {
      console.error('❌ Content analysis failed:', error);
      throw new Error(`Content analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    const typedInput = input as ContentAnalysisInput;
    
    // Стоимость зависит от длины контента
    const contentLength = typedInput.content?.length || 0;
    
    if (contentLength > 10000) return 1.5;
    if (contentLength > 5000) return 1.2;
    
    return 1.0;
  }

  /**
   * Формирование промпта для анализа
   */
  private buildAnalysisPrompt(content: string, analysisType: string): string {
    const basePrompt = `Analyze the following content and provide insights in JSON format:\n\n${content}\n\n`;

    switch (analysisType) {
      case 'summary':
        return basePrompt + `Provide a concise summary in the following JSON format:
{
  "suggestions": [{
    "title": "Content Summary",
    "description": "Brief summary of the content",
    "type": "STRUCTURE_ONLY",
    "confidence": 0.9
  }]
}`;

      case 'keywords':
        return basePrompt + `Extract key topics and themes in the following JSON format:
{
  "suggestions": [{
    "title": "Key Topics",
    "description": "List of main topics and themes",
    "type": "STRUCTURE_ONLY",
    "confidence": 0.8,
    "entities": ["topic1", "topic2", "topic3"]
  }]
}`;

      case 'sentiment':
        return basePrompt + `Analyze the emotional tone in the following JSON format:
{
  "suggestions": [{
    "title": "Sentiment Analysis",
    "description": "Overall emotional tone: positive/negative/neutral",
    "type": "STRUCTURE_ONLY",
    "confidence": 0.85
  }]
}`;

      case 'structure':
        return basePrompt + `Identify characters, locations, and themes in the following JSON format:
{
  "suggestions": [{
    "title": "Structural Elements",
    "description": "Analysis of story structure",
    "type": "STRUCTURE_ONLY",
    "confidence": 0.8,
    "entities": ["character1", "location1", "theme1"]
  }]
}`;

      default:
        return basePrompt + 'Provide general analysis.';
    }
  }

  /**
   * Парсинг результата анализа
   */
  private parseAnalysisResult(suggestions: any[], analysisType: string): ContentAnalysisOutput {
    if (!suggestions || suggestions.length === 0) {
      return {
        confidence: 0,
        summary: 'No analysis could be performed'
      };
    }

    const suggestion = suggestions[0];
    const result: ContentAnalysisOutput = {
      confidence: suggestion.confidence || 0.5
    };

    switch (analysisType) {
      case 'summary':
        result.summary = suggestion.description;
        break;
      
      case 'keywords':
        result.keywords = suggestion.entities || [];
        break;
      
      case 'sentiment':
        result.sentiment = this.extractSentiment(suggestion.description);
        break;
      
      case 'structure':
        result.structure = this.extractStructure(suggestion.entities || []);
        break;
    }

    return result;
  }

  /**
   * Извлечение sentiment из описания
   */
  private extractSentiment(description: string): 'positive' | 'negative' | 'neutral' {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('positive')) return 'positive';
    if (lowerDesc.includes('negative')) return 'negative';
    
    return 'neutral';
  }

  /**
   * Извлечение структурных элементов
   */
  private extractStructure(entities: string[]): { characters: string[]; locations: string[]; themes: string[] } {
    // Простая эвристика для разделения сущностей
    return {
      characters: entities.filter(e => e.toLowerCase().includes('character') || /^[A-Z][a-z]+$/.test(e)),
      locations: entities.filter(e => e.toLowerCase().includes('location') || e.toLowerCase().includes('place')),
      themes: entities.filter(e => e.toLowerCase().includes('theme') || e.toLowerCase().includes('concept'))
    };
  }

  /**
   * Оценка использования токенов
   */
  private estimateTokenUsage(content: string, prompt: string): number {
    // Простая оценка: ~4 символа на токен
    return Math.ceil((content.length + prompt.length) / 4);
  }
} 