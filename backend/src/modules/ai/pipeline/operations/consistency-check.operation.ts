import { BaseOperation } from '../base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../interfaces/operation.interface';

/**
 * Операция для проверки согласованности сгенерированного контента библии проекта
 */
export class ConsistencyCheckOperation extends BaseOperation {
  constructor() {
    super(
      'consistency_check',
      'Content Consistency Check',
      '1.0.0',
      AIOperationCategory.QUALITY_ASSURANCE,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: ['context_understanding', 'content_analysis'],
        maxTokens: 10000,
        timeout: 15000
      }
    );
  }

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      errors.push('Input must be an object');
      return { isValid: false, errors };
    }

    if (!input.generatedContent || typeof input.generatedContent !== 'object') {
      errors.push('generatedContent is required and must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(
    input: any, 
    context: ExecutionContext
  ): Promise<{
    data: any;
    tokensUsed?: number;
    model?: string;
  }> {
    const { originalContext } = input;
    
    // Собираем сгенерированный контент из результатов предыдущих шагов
    const generatedContent = this.collectGeneratedContentFromContext(context.previousResults);

    try {
      console.log('🔍 Checking content consistency...');

      // Проводим локальные проверки согласованности
      const consistencyResults = this.performConsistencyChecks(generatedContent);
      
      // Проверяем соответствие контексту
      const contextAlignment = this.checkContextAlignment(generatedContent, originalContext);
      
      // Проверяем качество длин полей
      const lengthValidation = this.validateFieldLengths(generatedContent);
      
      // Формируем рекомендации
      const recommendations = this.generateConsistencyRecommendations(
        consistencyResults, 
        contextAlignment, 
        lengthValidation
      );

      // Вычисляем общий скор согласованности
      const overallScore = this.calculateConsistencyScore(consistencyResults, contextAlignment, lengthValidation);

      console.log(`✅ Consistency check completed. Score: ${overallScore}/100`);
      
      return {
        data: {
          consistencyScore: overallScore,
          consistencyResults,
          contextAlignment,
          lengthValidation,
          recommendations,
          isConsistent: overallScore >= 70, // Порог для приемлемой согласованности
          metadata: {
            checkedAt: new Date().toISOString(),
            checkedFields: Object.keys(generatedContent).length
          }
        },
        tokensUsed: 100, // Локальная операция с минимальным использованием AI
        model: 'local-consistency-check'
      };

    } catch (error) {
      console.error('Consistency check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to check content consistency: ${errorMessage}`);
    }
  }

  /**
   * Выполняет основные проверки согласованности между полями
   */
  private performConsistencyChecks(content: any) {
    const checks = {
      genreLoglineAlignment: this.checkGenreLoglineAlignment(content),
      synopsisLoglineAlignment: this.checkSynopsisLoglineAlignment(content),
      settingGenreAlignment: this.checkSettingGenreAlignment(content),
      atmosphereGenreAlignment: this.checkAtmosphereGenreAlignment(content),
      themesContentAlignment: this.checkThemesContentAlignment(content)
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    return {
      score,
      checks,
      passedChecks,
      totalChecks
    };
  }

  /**
   * Проверяет соответствие жанров и логлайна
   */
  private checkGenreLoglineAlignment(content: any): boolean {
    if (!content.genres || !content.logline) return true; // Нет данных для проверки

    const genres = Array.isArray(content.genres) ? content.genres : [content.genres];
    const logline = content.logline.toLowerCase();

    // Простые проверки соответствия
    const genreKeywords = {
      horror: ['страх', 'ужас', 'монстр', 'призрак', 'смерть', 'тьма'],
      comedy: ['смех', 'юмор', 'комедия', 'веселье', 'шутка'],
      romance: ['любовь', 'отношения', 'сердце', 'чувства', 'роман'],
      fantasy: ['магия', 'волшебство', 'эльф', 'дракон', 'заклинание'],
      sci_fi: ['космос', 'будущее', 'технология', 'робот', 'планета']
    };

    return genres.some((genre: string) => {
      const keywords = genreKeywords[genre as keyof typeof genreKeywords];
      return !keywords || keywords.some(keyword => logline.includes(keyword));
    });
  }

  /**
   * Проверяет соответствие синопсиса и логлайна
   */
  private checkSynopsisLoglineAlignment(content: any): boolean {
    if (!content.synopsis || !content.logline) return true;

    const synopsis = content.synopsis.toLowerCase();
    const logline = content.logline.toLowerCase();

    // Извлекаем ключевые слова из логлайна
    const loglineWords = logline.split(' ').filter((word: string) => word.length > 3);
    
    // Проверяем, содержит ли синопсис хотя бы половину ключевых слов логлайна
    const matchingWords = loglineWords.filter((word: string) => synopsis.includes(word));
    
    return matchingWords.length >= loglineWords.length * 0.3; // 30% совпадение
  }

  /**
   * Проверяет соответствие сеттинга и жанров
   */
  private checkSettingGenreAlignment(content: any): boolean {
    if (!content.setting || !content.genres) return true;

    // Логика проверки соответствия сеттинга жанрам
    // В MVP версии - простая проверка наличия сеттинга
    return content.setting.trim().length > 20;
  }

  /**
   * Проверяет соответствие атмосферы и жанров
   */
  private checkAtmosphereGenreAlignment(content: any): boolean {
    if (!content.atmosphere || !content.genres) return true;

    // Простая проверка наличия описания атмосферы
    return content.atmosphere.trim().length > 15;
  }

  /**
   * Проверяет соответствие тем основному контенту
   */
  private checkThemesContentAlignment(content: any): boolean {
    if (!content.mainThemes) return true;

    // Проверяем, что темы не просто перечисление, а содержательное описание
    return content.mainThemes.trim().length > 20 && 
           !content.mainThemes.split(',').every((theme: string) => theme.trim().length < 10);
  }

  /**
   * Проверяет соответствие оригинальному контексту
   */
  private checkContextAlignment(content: any, originalContext?: string): { score: number; issues: string[] } {
    if (!originalContext) {
      return { score: 100, issues: [] };
    }

    const issues: string[] = [];
    let score = 100;

    // Простые проверки контекстного соответствия
    const contextLower = originalContext.toLowerCase();
    
    if (content.logline && !this.hasContextualConnection(content.logline, contextLower)) {
      issues.push('Логлайн может не соответствовать исходному описанию');
      score -= 20;
    }

    if (content.synopsis && !this.hasContextualConnection(content.synopsis, contextLower)) {
      issues.push('Синопсис может отходить от исходной идеи');
      score -= 15;
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Проверяет наличие контекстуальной связи между текстами
   */
  private hasContextualConnection(generatedText: string, originalContext: string): boolean {
    const generated = generatedText.toLowerCase();
    const original = originalContext.toLowerCase();
    
    // Извлекаем ключевые слова из оригинального контекста
    const originalWords = original.split(' ')
      .filter(word => word.length > 4)
      .slice(0, 10); // Берем первые 10 значимых слов
    
    // Проверяем наличие совпадений
    const matches = originalWords.filter(word => generated.includes(word));
    
    return matches.length >= Math.min(2, originalWords.length * 0.2); // Минимум 2 совпадения или 20%
  }

  /**
   * Валидирует длины полей
   */
  private validateFieldLengths(content: any): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    const fieldConfigs = {
      logline: { min: 20, max: 120, optimal: 80 },
      synopsis: { min: 300, max: 1500, optimal: 800 },
      setting: { min: 50, max: 500, optimal: 200 },
      targetAudience: { min: 20, max: 200, optimal: 100 },
      mainThemes: { min: 30, max: 300, optimal: 150 },
      atmosphere: { min: 20, max: 200, optimal: 100 }
    };

    Object.entries(fieldConfigs).forEach(([field, config]) => {
      if (content[field]) {
        const length = content[field].trim().length;
        
        if (length < config.min) {
          issues.push(`${field} слишком короткий (${length} символов, минимум ${config.min})`);
          score -= 10;
        } else if (length > config.max) {
          issues.push(`${field} слишком длинный (${length} символов, максимум ${config.max})`);
          score -= 5;
        }
      }
    });

    return { score: Math.max(0, score), issues };
  }

  /**
   * Генерирует рекомендации по улучшению согласованности
   */
  private generateConsistencyRecommendations(
    consistencyResults: any, 
    contextAlignment: any, 
    lengthValidation: any
  ): string[] {
    const recommendations: string[] = [];

    if (consistencyResults.score < 80) {
      recommendations.push('Рекомендуется проверить соответствие между жанрами и основным контентом');
    }

    if (contextAlignment.score < 70) {
      recommendations.push('Сгенерированный контент может отходить от исходной идеи проекта');
    }

    if (lengthValidation.issues.length > 0) {
      recommendations.push('Необходимо скорректировать длину некоторых полей');
    }

    if (recommendations.length === 0) {
      recommendations.push('Контент выглядит согласованным и качественным');
    }

    return recommendations;
  }

  /**
   * Вычисляет общий скор согласованности
   */
  private calculateConsistencyScore(
    consistencyResults: any, 
    contextAlignment: any, 
    lengthValidation: any
  ): number {
    const weights = {
      consistency: 0.5,
      contextAlignment: 0.3,
      lengthValidation: 0.2
    };

    return Math.round(
      consistencyResults.score * weights.consistency +
      contextAlignment.score * weights.contextAlignment +
      lengthValidation.score * weights.lengthValidation
    );
  }

  protected calculateCustomCost(_input: any, _context: ExecutionContext): number {
    // Операция анализа с минимальным использованием AI
    return 2;
  }

  /**
   * Собирает сгенерированный контент из результатов предыдущих шагов
   */
  private collectGeneratedContentFromContext(previousResults: Map<string, any>): any {
    const generatedContent: any = {};
    
    const fieldMappings = {
      'generate_genres': 'genres',
      'generate_logline': 'logline', 
      'generate_synopsis': 'synopsis',
      'generate_setting': 'setting',
      'generate_target_audience': 'targetAudience',
      'generate_main_themes': 'mainThemes',
      'generate_atmosphere': 'atmosphere',
      'generate_unique_features': 'uniqueFeatures',
      'generate_message': 'message',
      'generate_references': 'references',
      'generate_constraints': 'constraints'
    };

    Object.entries(fieldMappings).forEach(([stepId, fieldName]) => {
      const result = previousResults.get(stepId);
      if (result?.success && result.data?.content) {
        generatedContent[fieldName] = result.data.content;
      }
    });

    return generatedContent;
  }
} 