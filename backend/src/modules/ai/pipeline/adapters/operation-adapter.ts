/**
 * Адаптер для использования старых операций пайплайна с новой архитектурой V2
 * Позволяет использовать проверенные операции из старой архитектуры с StreamingPipelineEngine
 */

import { AbstractOperation } from '../../v2/core/AbstractOperation';
import { OperationInput, OperationOutput, ExecutionContext, OperationType, QualityLevel, ModelConfig, OperationAIConfig, AIProvider, GeminiModel } from '../../v2/shared/types';
import { BaseOperation } from '../base/base-operation';
import { BaseAIOperation } from '../base/base-ai-operation';
import { ValidationSchema } from '../../v2/validation/ValidationTypes';
import { AIOperationCategory, ComplexityLevel } from '../interfaces/operation.interface';
import { StorageContext } from '../../v2/storage/StorageContext';
import { ModelSelector } from '../../v2/core/ModelSelector';


/**
 * Адаптер для старых операций к новой архитектуре V2
 * Оборачивает старые операции (BaseOperation) в интерфейс AbstractOperation
 */
export class LegacyOperationAdapter<
  TInput extends OperationInput = any,
  TOutput extends OperationOutput = any
> extends AbstractOperation<TInput, TOutput> {
  
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: OperationType;
  readonly aiConfig?: OperationAIConfig;
  
  private legacyOperation: BaseOperation;
  
  constructor(legacyOperation: BaseOperation) {
    super();
    this.legacyOperation = legacyOperation;
    
    // Копируем метаданные из старой операции
    this.id = legacyOperation.id;
    this.name = legacyOperation.name;
    this.version = legacyOperation.version;
    
    // Определяем тип операции
    if (legacyOperation instanceof BaseAIOperation) {
      this.type = OperationType.AI;
      // Создаем базовую конфигурацию AI для старых операций
      this.aiConfig = this.createDefaultAIConfig();
    } else if (legacyOperation.category === AIOperationCategory.CONTENT_ANALYSIS && !this.requiresAI()) {
      this.type = OperationType.DATABASE;
    } else {
      // По умолчанию используем VALIDATION для non-AI операций
      this.type = OperationType.VALIDATION;
    }
  }
  
  /**
   * Проверяет, требует ли операция AI
   */
  private requiresAI(): boolean {
    // BaseAIOperation имеет метод requiresAI()
    if ('requiresAI' in this.legacyOperation && typeof this.legacyOperation.requiresAI === 'function') {
      return this.legacyOperation.requiresAI();
    }
    return false;
  }
  
  /**
   * Схема валидации - используем валидацию из старой операции
   */
  protected getValidationSchema(): ValidationSchema | null {
    // Старые операции используют свою валидацию
    return null;
  }
  
  /**
   * Дополнительная валидация - делегируем старой операции
   */
  protected async validateInput(input: TInput, context: ExecutionContext): Promise<void> {
    // Преобразуем контекст V2 в контекст старой архитектуры
    const legacyContext = this.adaptContextToLegacy(context);
    
    // Вызываем валидацию старой операции
    const validationResult = this.legacyOperation.validate(input, legacyContext);
    
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }
  }
  
  /**
   * Выполнение операции - делегируем старой операции
   */
  protected async executeOperation(input: TInput, context: ExecutionContext): Promise<TOutput> {
    // Преобразуем контекст V2 в контекст старой архитектуры
    const legacyContext = this.adaptContextToLegacy(context);
    
    // Запоминаем время начала для расчета длительности
    const startTime = Date.now();
    
    // Получаем storage adapter для записи метаданных
    const storageContext = StorageContext.getInstance();
    const storageAdapter = storageContext.getStorageAdapter();
    const currentStepId = storageContext.getCurrentStepId();

    // Записываем начало выполнения шага если есть storage
    if (storageAdapter && currentStepId) {
      // Получаем промпты если это AI операция
      const prompts = this.getPrompt(input, context);
      
      if (prompts && this.type === OperationType.AI) {
        // Для AI операций записываем промпты и конфигурацию модели
        storageAdapter.onStepStart(
          currentStepId,
          { 
            system: prompts.system, 
            user: prompts.user 
          },
          {
            operationType: OperationType.AI,
            provider: legacyContext.provider,
            model: legacyContext.model,
            temperature: legacyContext.temperature,
            maxTokens: legacyContext.maxTokens,
            qualityLevel: context.qualityLevel
          }
        );
      } else {
        // Для non-AI операций записываем только входные данные
        storageAdapter.onStepStart(
          currentStepId,
          { input },
          {
            operationType: this.type,
            qualityLevel: context.qualityLevel
          }
        );
      }
    }
    
    try {
      // Вызываем старую операцию
      const result = await this.legacyOperation.execute(input, legacyContext);
      
      if (!result.success) {
        throw new Error(result.error || 'Operation failed');
      }
      
      // Рассчитываем длительность
      const duration = Date.now() - startTime;
      
      // Записываем данные о выполнении операции если есть storage
      if (storageAdapter && currentStepId && this.type !== OperationType.AI) {
        storageAdapter.onOperationExecution(currentStepId, duration, result.data);
      }
      
      // Если это AI операция и есть метаданные о токенах, записываем их
      if (storageAdapter && currentStepId && this.type === OperationType.AI && result.metadata) {
        const metadata = result.metadata;
        if (metadata.tokensUsed || metadata.cost) {
          
          storageAdapter.onProviderCall(
            currentStepId,
            duration, // providerCallDuration
            metadata.inputTokens || 0,
            metadata.outputTokens || 0,
            metadata.cost || 0, // realCostUSD
            Math.ceil((metadata.cost || 0) * 1000), // creditsCharged
            JSON.stringify(result.data) // rawAIResponse
          );
        }
      }
      
      // Преобразуем результат в формат V2 с добавлением метаданных
      const v2Result = this.adaptResultToV2(result) as TOutput;
      
      // Добавляем метаданные для правильного сохранения в БД
      if (v2Result && typeof v2Result === 'object') {
        (v2Result as any).metadata = {
          ...(v2Result as any).metadata,
          duration,
          provider: legacyContext.provider,
          model: legacyContext.model,
          temperature: legacyContext.temperature,
          qualityLevel: context.qualityLevel,
          executionTime: duration
        };
      }
      
      return v2Result;
      
    } catch (error) {
      console.error(`Error in legacy operation ${this.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Оценка стоимости - делегируем старой операции если есть
   */
  async estimateCost(input: TInput, context: ExecutionContext): Promise<{realCostUSD: number, credits: number}> {
    const legacyContext = this.adaptContextToLegacy(context);
    
    // Если у старой операции есть метод estimateCost
    if ('estimateCost' in this.legacyOperation && typeof this.legacyOperation.estimateCost === 'function') {
      const cost = this.legacyOperation.estimateCost(input, legacyContext);
      return { 
        realCostUSD: cost, 
        credits: Math.ceil(cost * 1000) // Примерная конвертация в кредиты
      };
    }
    
    // Базовая оценка по сложности операции
    const complexityMultiplier: Record<ComplexityLevel, number> = {
      [ComplexityLevel.SIMPLE]: 1,
      [ComplexityLevel.MEDIUM]: 3,
      [ComplexityLevel.COMPLEX]: 5,
      [ComplexityLevel.HEAVY]: 10
    };
    
    const credits = complexityMultiplier[this.legacyOperation.complexity] || 1;
    
    return { 
      realCostUSD: credits / 1000, 
      credits 
    };
  }
  
  /**
   * Создает дефолтную конфигурацию AI для старых операций
   */
  private createDefaultAIConfig(): OperationAIConfig {
    // Создаем стандартную конфигурацию с учетом современных моделей
    const createConfig = (provider: AIProvider, model: string, temperature: number, maxTokens: number): ModelConfig => ({
      provider,
      model,
      temperature,
      maxTokens,
      timeout: 30000,
      retries: 1
    });

    return {
      modeConfigs: {
        [QualityLevel.FAST]: createConfig(AIProvider.GEMINI, GeminiModel.FLASH_LITE, 0.3, 2000),
        [QualityLevel.STANDARD]: createConfig(AIProvider.GEMINI, GeminiModel.FLASH, 0.7, 4000),
        [QualityLevel.EXPERT]: createConfig(AIProvider.GEMINI, GeminiModel.PRO, 0.9, 8000)
      }
    };
  }

  /**
   * Преобразование контекста из V2 в старый формат
   */
  private adaptContextToLegacy(context: ExecutionContext): any {
    // Получаем конфигурацию модели на основе качества и aiConfig
    let modelConfig: ModelConfig | null = null;
    
    if (this.aiConfig && this.type === OperationType.AI) {
      try {
        // Создаем псевдо-операцию для использования с ModelSelector
        const pseudoOperation = { aiConfig: this.aiConfig };
        modelConfig = ModelSelector.getConfigForOperation(pseudoOperation as any, context);
      } catch (error) {
        console.warn('Failed to get model config, using default:', error);
      }
    }
    
    // Если не удалось получить конфигурацию, используем дефолтные значения
    if (!modelConfig) {
      modelConfig = {
        provider: AIProvider.N_A,
        model: 'unknown',
        temperature: 0,
        maxTokens: 0
      };
    }
    
    return {
      projectId: context.projectId,
      userId: context.userId,
      requestId: context.requestId,
      // Используем конфигурацию из aiConfig
      provider: modelConfig.provider,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens
    };
  }
  
  /**
   * Преобразование результата из старого формата в V2
   */
  private adaptResultToV2(legacyResult: any): OperationOutput {
    // Если операция вернула ошибку
    if (!legacyResult.success) {
      return {
        error: true,
        message: legacyResult.error || 'Unknown error'
      };
    }
    
    // Преобразуем успешный результат
    const v2Result: any = {
      ...legacyResult.data,
      metadata: {
        ...legacyResult.metadata,
        executionTime: legacyResult.metadata?.executionTime,
        tokensUsed: legacyResult.metadata?.tokensUsed,
        model: legacyResult.metadata?.model,
        cost: legacyResult.metadata?.cost
      }
    };
    
    // Удаляем дублирующиеся поля
    if ('metadata' in v2Result && v2Result.metadata) {
      delete v2Result.metadata.operationId;
      delete v2Result.metadata.operationName;
      delete v2Result.metadata.operationVersion;
      delete v2Result.metadata.category;
      delete v2Result.metadata.complexity;
    }
    
    return v2Result;
  }
  
  /**
   * Получение промптов для AI операций (если это AI операция)
   */
  getPrompt(input: TInput, context: ExecutionContext): { system: string; user: string } | null {
    if (this.legacyOperation instanceof BaseAIOperation) {
      const legacyContext = this.adaptContextToLegacy(context);
      
      try {
        const systemPrompt = this.legacyOperation.getSystemPrompt(input, legacyContext);
        const userPrompt = this.legacyOperation.getUserPrompt(input, legacyContext);
        
        return {
          system: systemPrompt,
          user: userPrompt
        };
      } catch (error) {
        console.warn(`Could not get prompts for legacy AI operation ${this.id}:`, error);
        return null;
      }
    }
    
    return null;
  }
}

/**
 * Фабрика для создания адаптированных операций
 */
export class LegacyOperationFactory {
  /**
   * Создает адаптер для старой операции
   */
  static adapt<TInput extends OperationInput = any, TOutput extends OperationOutput = any>(
    legacyOperation: BaseOperation
  ): LegacyOperationAdapter<TInput, TOutput> {
    return new LegacyOperationAdapter<TInput, TOutput>(legacyOperation);
  }
  
  /**
   * Создает адаптеры для массива операций
   */
  static adaptMany(legacyOperations: BaseOperation[]): LegacyOperationAdapter[] {
    return legacyOperations.map(op => this.adapt(op));
  }
}
