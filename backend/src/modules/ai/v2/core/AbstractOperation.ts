// backend/src/modules/ai/v2/core/AbstractOperation.ts
import {
  OperationInput,
  OperationOutput,
  BaseOperation,
  ExecutionContext,
  OperationType,
} from '../shared/types';
import { InputValidator } from '../validation/InputValidator';
import { ValidationSchema } from '../validation/ValidationTypes';
// import { InputSanitizer } from '../validation/InputSanitizer';
import { aiLogger, PerformanceTracker } from '../logging';
import { StorageContext } from '../storage/StorageContext';

/**
 * Базовый абстрактный класс для всех операций (AI и non-AI)
 * Следует принципам SOLID и DRY
 */
export abstract class AbstractOperation<
  TInput extends OperationInput,
  TOutput extends OperationOutput
> implements BaseOperation {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly type: OperationType;

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

  /**
   * Основной метод выполнения операции
   */
  async execute(input: TInput, context: ExecutionContext): Promise<TOutput> {
    const tracker = new PerformanceTracker(`${this.name} (${this.id})`, context);
    const storageContext = StorageContext.getInstance();
    const storageAdapter = storageContext.getStorageAdapter();
    const currentStepId = storageContext.getCurrentStepId();
    
    // Логируем начало операции
    aiLogger.operationStart(this.id, this.name, context, {
      version: this.version,
      type: this.type,
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

      // Записываем начало выполнения шага
      if (storageAdapter && currentStepId) {
        storageAdapter.onStepStart(currentStepId, { input: sanitizedInput }, {
          operationType: this.type,
          qualityLevel: context.qualityLevel
        });
      }

      tracker.checkpoint('execution-prepared');

      // Выполняем основную логику операции
      const executionStartTime = Date.now();
      const result = await this.executeOperation(sanitizedInput, context);
      const executionDuration = Date.now() - executionStartTime;

      // Записываем данные о выполнении операции
      if (storageAdapter && currentStepId) {
        storageAdapter.onOperationExecution(
          currentStepId,
          executionDuration,
          result
        );
      }

      tracker.checkpoint('operation-completed');

      const totalDuration = tracker.finish({
        type: this.type,
        success: true
      });

      // Логируем успешное завершение
      aiLogger.operationSuccess(this.id, this.name, context, totalDuration, {
        type: this.type,
        executionDuration
      });

      return result;
    } catch (error) {
      const duration = tracker.finish({
        type: this.type,
        success: false
      });

      // Логируем ошибку
      aiLogger.operationError(this.id, this.name, context, error as Error, duration);
      
      throw error;
    }
  }

  /**
   * Абстрактный метод для выполнения основной логики операции
   * Должен быть переопределен в подклассах
   */
  protected abstract executeOperation(input: TInput, context: ExecutionContext): Promise<TOutput>;

  /**
   * Оценка стоимости выполнения операции
   * Для non-AI операций может возвращать фиксированную стоимость
   */
  async estimateCost(_input: TInput, _context: ExecutionContext): Promise<{realCostUSD: number, credits: number}> {
    // Базовая реализация для non-AI операций
    return { realCostUSD: 0, credits: 1 };
  }
}
