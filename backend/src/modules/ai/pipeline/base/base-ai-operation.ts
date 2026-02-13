import { BaseOperation } from './base-operation';
import { 
  AIOperationInterface,
  AIOperationConfig,
  PromptMetadata,
  AIOperationResult
} from '../interfaces/ai-operation.interface';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  OperationRequirements 
} from '../interfaces/operation.interface';
import { AIProviderFactory } from '../../providers/ai-provider.factory';
import { AIProvider } from '@prisma/client';

/**
 * Абстрактный базовый класс для AI операций
 * Следует принципам SOLID:
 * - SRP: Отвечает только за AI-специфичную логику
 * - OCP: Легко расширяется новыми AI операциями
 * - DIP: Зависит от абстракций (интерфейсов), а не от конкретных реализаций
 */
export abstract class BaseAIOperation extends BaseOperation implements AIOperationInterface {
  
  // Приватное поле для хранения заполненного промпта
  private _interpolatedPrompt?: string;

  constructor(
    id: string,
    name: string,
    version: string,
    category: AIOperationCategory,
    complexity: ComplexityLevel,
    requirements: OperationRequirements
  ) {
    super(id, name, version, category, complexity, requirements);
  }

  /**
   * Переопределенный метод выполнения для AI операций
   */
  protected async executeOperation(
    input: any, 
    context: ExecutionContext
  ): Promise<{ data: any; tokensUsed?: number; model?: string }> {
    
    // Если операция не требует AI, выполняем обычную логику
    if (!this.requiresAI()) {
      const result = await this.executeNonAIOperation(input, context);
      return {
        data: result,
        model: 'non-ai-operation'
      };
    }

    // Получаем конфигурацию AI
    const aiConfig = this.getAIConfig(context, context.userSettings);
    
    // Создаем провайдера
    const provider = AIProviderFactory.create(aiConfig.preferredProvider);
    
    // Получаем промпты
    const promptMetadata = this.getPromptMetadata(input, context);
    
    try {
      // Выполняем AI операцию
      const aiResult = await this.callAIProvider(
        provider, 
        promptMetadata, 
        aiConfig, 
        input, 
        context
      );

      // Обрабатываем результат
      const processedData = this.processAIResult(aiResult, input, context);

      // Добавляем метаданные AI в результат
      const aiMetadata = {
        provider: aiConfig.preferredProvider,
        model: aiResult.model || aiConfig.preferredModel,
        prompt: this._interpolatedPrompt || promptMetadata.userPromptTemplate, // Используем заполненный промпт
        systemPrompt: promptMetadata.systemPrompt,
        tokensUsed: aiResult.tokensUsed || 0,
        temperature: aiConfig.temperature || 0.7,
        maxTokens: aiConfig.maxTokens || 4000,
        generatedAt: new Date().toISOString(),
        ...(aiResult.metadata || {})
      };

      // Если processedData это объект, добавляем в него metadata
      // Если это примитив, оборачиваем в объект
      let finalData;
      if (typeof processedData === 'object' && processedData !== null) {
        finalData = {
          ...processedData,
          metadata: {
            ...(processedData.metadata || {}),
            ...aiMetadata
          }
        };
      } else {
        finalData = {
          content: processedData,
          metadata: aiMetadata
        };
      }

      return {
        data: finalData,
        tokensUsed: aiResult.tokensUsed,
        model: aiResult.model || aiConfig.preferredModel
      };

    } catch (error) {
      console.error(`❌ AI operation ${this.id} failed:`, error);
      throw new Error(`AI operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Очищаем промпт после выполнения для предотвращения утечки памяти
      this._interpolatedPrompt = undefined;
    }
  }

  /**
   * Вызов AI провайдера с единообразной логикой
   */
  private async callAIProvider(
    provider: any,
    promptMetadata: PromptMetadata,
    config: AIOperationConfig,
    _input: any,
    _context: ExecutionContext
  ): Promise<AIOperationResult> {
    
    // Подставляем переменные в пользовательский промпт
    const userPrompt = this.interpolatePrompt(
      promptMetadata.userPromptTemplate, 
      promptMetadata.variables || {}
    );

    // Сохраняем заполненный промпт для метаданных
    this._interpolatedPrompt = userPrompt;

    // Определяем метод вызова на основе типа операции
    const callMethod = this.getProviderCallMethod();
    
    if (callMethod === 'generateSuggestions') {
      const suggestions = await provider.generateSuggestions({
        context: `${promptMetadata.systemPrompt}\n\n${userPrompt}`,
        userSettings: {
          creativityLevel: config.creativityLevel || 0.5,
          preferredModel: config.preferredModel
        },
        suggestionType: this.getSuggestionType(),
        maxTokens: config.maxTokens
      });

      return {
        data: suggestions,
        tokensUsed: this.estimateTokenUsage(promptMetadata.systemPrompt, userPrompt),
        model: config.preferredModel || 'default',
        provider: config.preferredProvider
      };

    } else if (callMethod === 'callAIWithMetadata') {
      const response = await provider.callAIWithMetadata(
        promptMetadata.systemPrompt,
        userPrompt,
        config.creativityLevel || 0.5,
        {
          model: config.preferredModel,
          maxTokens: config.maxTokens,
          temperature: config.temperature
        }
      );

      return {
        data: response.content,
        tokensUsed: response.metadata.tokensUsed,
        model: response.metadata.model,
        provider: config.preferredProvider,
        metadata: response.metadata
      };

    } else {
      throw new Error(`Unsupported provider call method: ${callMethod}`);
    }
  }

  /**
   * Подстановка переменных в промпт
   */
  private interpolatePrompt(template: string, variables: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }

  /**
   * Оценка использования токенов (упрощенная)
   */
  private estimateTokenUsage(systemPrompt: string, userPrompt: string): number {
    // Примерный расчет: ~4 символа = 1 токен
    const totalChars = systemPrompt.length + userPrompt.length;
    return Math.ceil(totalChars / 4);
  }

  // ===== АБСТРАКТНЫЕ МЕТОДЫ =====

  /**
   * Получение конфигурации AI (по умолчанию)
   */
  getAIConfig(_context: ExecutionContext, userSettings?: any): AIOperationConfig {
    return {
      preferredProvider: userSettings?.preferredProvider || AIProvider.GEMINI,
      preferredModel: userSettings?.preferredModel || this.getDefaultModel(),
      creativityLevel: userSettings?.creativityLevel || this.getDefaultCreativityLevel(),
      maxTokens: this.requirements.maxTokens || 4000,
      temperature: 0.7
    };
  }

  /**
   * Получение полных метаданных промпта
   */
  getPromptMetadata(input: any, context: ExecutionContext): PromptMetadata {
    return {
      systemPrompt: this.getSystemPrompt(input, context),
      userPromptTemplate: this.getUserPrompt(input, context),
      variables: this.getPromptVariables(input, context)
    };
  }

  /**
   * Проверяет, требует ли операция AI провайдера (по умолчанию true)
   */
  requiresAI(): boolean {
    return true;
  }

  // ===== МЕТОДЫ ДЛЯ ПЕРЕОПРЕДЕЛЕНИЯ =====

  /**
   * Системный промпт для операции
   */
  abstract getSystemPrompt(input: any, context: ExecutionContext): string;

  /**
   * Пользовательский промпт для операции
   */
  abstract getUserPrompt(input: any, context: ExecutionContext): string;

  /**
   * Обработка результата от AI провайдера
   */
  abstract processAIResult(aiResult: any, input: any, context: ExecutionContext): any;

  /**
   * Выполнение операции без AI (для операций, которые могут работать и без AI)
   */
  protected async executeNonAIOperation(_input: any, _context: ExecutionContext): Promise<any> {
    throw new Error('This operation requires AI provider');
  }

  /**
   * Переменные для подстановки в промпт
   */
  protected getPromptVariables(input: any, context: ExecutionContext): Record<string, any> {
    return {
      input: JSON.stringify(input, null, 2),
      userId: context.userId,
      projectId: context.projectId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Метод вызова провайдера
   */
  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'generateSuggestions';
  }

  /**
   * Тип предложений для generateSuggestions
   */
  protected getSuggestionType(): string {
    return 'STRUCTURE_ONLY';
  }

  /**
   * Модель по умолчанию для операции
   */
  protected getDefaultModel(): string {
    return 'gemini-2.5-flash-lite';
  }

  /**
   * Уровень креативности по умолчанию
   */
  protected getDefaultCreativityLevel(): number {
    return 0.5;
  }
}