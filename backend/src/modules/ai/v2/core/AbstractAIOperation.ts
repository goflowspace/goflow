// backend/src/modules/ai/v2/core/AbstractAIOperation.ts
import {
  AIOperationInput,
  AIOperationOutput,
  BaseAIOperation,
  ExecutionContext,
  ModelConfig,
  OperationAIConfig,
  OperationType,
} from '../shared/types';
import { ModelSelector } from './ModelSelector';
import { OperationCreditConfig } from '../config/OperationCreditConfig';
import { TokenizerService } from '../services/TokenizerService';
import { CostService } from '../services/CostService';
import { aiProviderService } from '../services/AIProviderService';
import { InputValidator } from '../validation/InputValidator';
import { ValidationSchema } from '../validation/ValidationTypes';
import { InputSanitizer } from '../validation/InputSanitizer';
import { aiLogger, PerformanceTracker } from '../logging';
import { StorageContext } from '../storage/StorageContext';
import { JSONRepairer, JSONRepairResult } from '../utils/JSONRepairer';

// import { AIProviderService } from '../../services/AIProviderService';

export abstract class AbstractAIOperation<
  TInput extends AIOperationInput,
  TOutput extends AIOperationOutput
> implements BaseAIOperation {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly aiConfig: OperationAIConfig;
  readonly type = OperationType.AI;

  // Methods to be implemented by each concrete operation
  protected abstract getSystemPrompt(context: ExecutionContext): string;
  protected abstract getUserPrompt(input: TInput, context: ExecutionContext): string;

  // Final method that combines the prompts. Not intended to be overridden.
  public getPrompt(input: TInput, context: ExecutionContext): { system: string; user: string } {
    const baseUserPrompt = this.getUserPrompt(input, context);
    const userPromptWithCustom = this.appendCustomPrompt(baseUserPrompt, input);
    
    return {
      system: this.getSystemPrompt(context),
      user: userPromptWithCustom,
    };
  }

  /**
   * Добавляет кастомный промпт к пользовательскому промпту, если он указан.
   * Этот метод автоматически вызывается в getPrompt для всех AI операций.
   * @param baseUserPrompt Базовый пользовательский промпт
   * @param input Входные данные операции
   * @returns Пользовательский промпт с добавленным кастомным промптом
   */
  private appendCustomPrompt(baseUserPrompt: string, input: TInput): string {
    if (!input.customPrompt || input.customPrompt.trim() === '') {
      return baseUserPrompt;
    }

    return `${baseUserPrompt}

<custom_instructions>
${input.customPrompt.trim()}
</custom_instructions>`;
  }

  abstract parseResult(aiResult: string, input: TInput, realCostUSD: number, creditsCharged: number): TOutput;

  /**
   * Возвращает список обязательных полей для валидации JSON структуры.
   * Операции могут переопределить этот метод для специфических требований.
   */
  protected getRequiredJSONFields(): string[] {
    return [];
  }

  /**
   * Умный парсинг JSON с автоматическим восстановлением поврежденных структур.
   * Рекомендуется использовать вместо прямого JSON.parse() в операциях.
   */
  protected safeParseJSON(jsonString: string, operationName?: string): JSONRepairResult {
    const repairResult = JSONRepairer.safeParseJSON(jsonString);
    
    if (!repairResult.success) {
      // Логируем неудачную попытку восстановления
      console.error(`❌ JSON repair failed for ${operationName || this.name}:`, repairResult.originalError?.message);
      return repairResult;
    }

    // Валидируем структуру восстановленного JSON
    const requiredFields = this.getRequiredJSONFields();
    if (requiredFields.length > 0 && !JSONRepairer.validateStructure(repairResult.result, requiredFields)) {
      console.warn(`⚠️ Restored JSON missing required fields for ${operationName || this.name}, using fallback structure`);
      const fallbackStructure = JSONRepairer.createFallbackStructure(requiredFields);
      Object.assign(repairResult.result, fallbackStructure);
    }
    
    if (repairResult.repaired) {
      console.log(`🔧 JSON was automatically repaired for ${operationName || this.name}:`, repairResult.repairActions);
    }

    return repairResult;
  }

  /**
   * Упрощенный метод для получения только результата парсинга.
   * Выбрасывает ошибку если парсинг не удался.
   */
  protected parseJSONSafely(jsonString: string, operationName?: string): any {
    const repairResult = this.safeParseJSON(jsonString, operationName);
    
    if (!repairResult.success) {
      throw new Error(`Failed to parse JSON even after repair attempts: ${repairResult.originalError?.message}`);
    }
    
    return repairResult.result;
  }

  /**
   * Получить схему валидации для операции.
   * Подклассы могут переопределить для специфической валидации.
   */
  protected getValidationSchema(): ValidationSchema | null {
    return null;
  }

  /**
   * Дополнительная валидация для подклассов.
   * Этот метод вызывается после основной валидации по схеме.
   */
  protected validateAdditional(_input: TInput): string[] {
    return [];
  }

  /**
   * Основной метод валидации с интеграцией новой системы
   */
  validate(input: TInput): string[] {
    const errors: string[] = [];

    // 1. Базовая валидация по схеме (если определена)
    const schema = this.getValidationSchema();
    if (schema) {
      const validationResult = InputValidator.validate(input, schema);
      if (!validationResult.isValid) {
        errors.push(...validationResult.errors.map(error => 
          `${error.field}: ${error.message}`
        ));
      }
    }

    // 2. Дополнительная валидация от подкласса
    const additionalErrors = this.validateAdditional(input);
    errors.push(...additionalErrors);

    return errors;
  }

  /**
   * Валидация и санитизация входных данных
   */
  protected validateAndSanitize(input: TInput): { 
    isValid: boolean; 
    errors: string[]; 
    sanitizedInput?: TInput 
  } {
    const schema = this.getValidationSchema();
    
    if (!schema) {
      // Если схемы нет, используем старую валидацию
      const errors = this.validate(input);
      return {
        isValid: errors.length === 0,
        errors,
        sanitizedInput: errors.length === 0 ? input : undefined
      };
    }

    const validationResult = InputValidator.validate(input, schema);
    const additionalErrors = this.validateAdditional(input);
    
    const allErrors = [
      ...validationResult.errors.map(e => `${e.field}: ${e.message}`),
      ...additionalErrors
    ];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedInput: allErrors.length === 0 ? validationResult.sanitizedInput as TInput : undefined
    };
  }

  protected getFullModelConfig(context: ExecutionContext): ModelConfig {
    return ModelSelector.getConfigForOperation(this, context);
  }

  async execute(input: TInput, context: ExecutionContext): Promise<TOutput> {
    const tracker = new PerformanceTracker(`${this.name} (${this.id})`, context);
    const storageContext = StorageContext.getInstance();
    const storageAdapter = storageContext.getStorageAdapter();
    const currentStepId = storageContext.getCurrentStepId();
    
    // Логируем начало операции
    aiLogger.operationStart(this.id, this.name, context, {
      version: this.version,
      qualityLevel: context.qualityLevel
    });

    try {
      // Валидация и санитизация входных данных
      const validationStartTime = Date.now();
      const validation = this.validateAndSanitize(input);
      const validationDuration = Date.now() - validationStartTime;
      
      aiLogger.validation(this.id, context, validation.isValid, validation.errors, {
        validationDuration
      });

      // Записываем результаты валидации
      if (storageAdapter && currentStepId) {
        storageAdapter.onStepValidation(
          currentStepId,
          validationDuration,
          validation.errors.length > 0 ? validation.errors : undefined
        );
      }
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Используем санитизированные данные если они есть, иначе оригинальные
      const sanitizedInput = validation.sanitizedInput || input;

      tracker.checkpoint('validation-complete');

      const modelConfig = this.getFullModelConfig(context);
      const { system, user } = this.getPrompt(sanitizedInput, context);

      // Записываем начало выполнения шага
      if (storageAdapter && currentStepId) {
        storageAdapter.onStepStart(currentStepId, { system, user }, {
          ...modelConfig,
          qualityLevel: context.qualityLevel
        });
      }

      // Дополнительная санитизация промптов перед отправкой в AI
      const sanitizedSystem = InputSanitizer.sanitizeAIPrompt(system);
      const sanitizedUser = InputSanitizer.sanitizeAIPrompt(user);

      // Проверка промптов на подозрительный контент
      const systemCheck = InputSanitizer.detectSuspiciousContent(sanitizedSystem);
      const userCheck = InputSanitizer.detectSuspiciousContent(sanitizedUser);
      
      if (systemCheck.isSuspicious || userCheck.isSuspicious) {
        const reasons = [...systemCheck.reasons, ...userCheck.reasons];
        aiLogger.suspiciousContent(this.id, context, reasons);
        
        // Записываем информацию о подозрительном контенте
        if (storageAdapter && currentStepId) {
          storageAdapter.onSuspiciousContent(currentStepId, reasons);
        }
        
        throw new Error(`Suspicious content detected in prompts: ${reasons.join(', ')}`);
      }

      tracker.checkpoint('prompts-prepared');

      // Логируем вызов провайдера
      aiLogger.providerCall(modelConfig.provider, modelConfig.model, context, {
        inputTokens: TokenizerService.count(sanitizedSystem + sanitizedUser),
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens
      });

      const providerStartTime = Date.now();
      const aiResponse = await aiProviderService.call(modelConfig, sanitizedSystem, sanitizedUser);
      const providerDuration = Date.now() - providerStartTime;
      const aiResult = aiResponse.content;

      const creditsCharged = (OperationCreditConfig[this.id] || OperationCreditConfig.default)[context.qualityLevel];
      const inputTokens = TokenizerService.count(sanitizedSystem + sanitizedUser);
      const outputTokens = aiResponse.usage.outputTokens > 0 
          ? aiResponse.usage.outputTokens 
          : TokenizerService.count(aiResult);

      const realCostUSD = CostService.calculateRealCost(modelConfig, inputTokens, outputTokens);

      // Записываем данные о вызове провайдера
      if (storageAdapter && currentStepId) {
        storageAdapter.onProviderCall(
          currentStepId,
          providerDuration,
          inputTokens,
          outputTokens,
          realCostUSD,
          creditsCharged,
          aiResult
        );
      }

      // Логируем ответ провайдера
      aiLogger.providerResponse(
        modelConfig.provider, 
        modelConfig.model, 
        context,
        providerDuration,
        inputTokens,
        outputTokens,
        realCostUSD,
        {
          creditsCharged,
          responseLength: aiResult.length
        }
      );

      tracker.checkpoint('ai-response-received');

      // Централизованная обработка markdown обрамления для всех AI операций
      let cleanedAiResult = aiResult.trim();
      if (cleanedAiResult.startsWith('```json')) {
        cleanedAiResult = cleanedAiResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedAiResult.startsWith('```')) {
        cleanedAiResult = cleanedAiResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedOutput = this.parseResult(cleanedAiResult.trim(), sanitizedInput, realCostUSD, creditsCharged);
      
      const totalDuration = tracker.finish({
        inputTokens,
        outputTokens,
        realCostUSD,
        creditsCharged,
        provider: modelConfig.provider,
        model: modelConfig.model,
        success: true
      });

      // Логируем успешное завершение
      aiLogger.operationSuccess(this.id, this.name, context, totalDuration, {
        inputTokens,
        outputTokens,
        realCostUSD,
        creditsCharged,
        provider: modelConfig.provider,
        model: modelConfig.model
      });

      return parsedOutput;
    } catch (error) {
      const duration = tracker.finish({
        provider: this.getFullModelConfig(context).provider,
        success: false
      });

      // Логируем ошибку
      aiLogger.operationError(this.id, this.name, context, error as Error, duration);
      
      throw error;
    }
  }

  async estimateCost(input: TInput, context: ExecutionContext): Promise<{realCostUSD: number, credits: number}> {
    const { system, user } = this.getPrompt(input, context);
    const modelConfig = this.getFullModelConfig(context);
    
    const inputTokens = TokenizerService.count(system + user);
    const estimatedOutputTokens = modelConfig.maxTokens / 2; // Rough estimate
    
    const realCostUSD = CostService.calculateRealCost(modelConfig, inputTokens, estimatedOutputTokens);
    const credits = (OperationCreditConfig[this.id] || OperationCreditConfig.default)[context.qualityLevel];

    return { realCostUSD, credits };
  }
}
