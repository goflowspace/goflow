import { 
  AIOperation, 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  OperationResult, 
  OperationRequirements,
  ValidationResult 
} from '../interfaces/operation.interface';

/**
 * Базовый абстрактный класс для всех AI операций
 * Следует принципу DRY - содержит общую логику для всех операций
 */
export abstract class BaseOperation implements AIOperation {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly version: string,
    public readonly category: AIOperationCategory,
    public readonly complexity: ComplexityLevel,
    public readonly requirements: OperationRequirements
  ) {}

  /**
   * Базовая валидация - может быть переопределена в наследниках
   */
  validate(input: any, context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    // Базовые проверки
    if (!input) {
      errors.push('Input data is required');
    }

    if (!context.userId) {
      errors.push('User ID is required');
    }

    if (!context.projectId) {
      errors.push('Project ID is required');
    }

    // Проверяем дополнительные требования
    const customValidation = this.validateInput(input, context);
    if (!customValidation.isValid) {
      errors.push(...customValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Основной метод выполнения с общей логикой и метриками
   */
  async execute(input: any, context: ExecutionContext): Promise<OperationResult> {
    const startTime = Date.now();
    const startDate = new Date();

    try {
      // Валидация перед выполнением
      const validation = this.validate(input, context);
      if (!validation.isValid) {
        const endTime = Date.now();
        const endDate = new Date();
        
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          startTime: startDate,
          endTime: endDate,
          metadata: {
            executionTime: endTime - startTime,
            operationId: this.id,
            operationName: this.name,
            validationErrors: validation.errors
          }
        };
      }

      // Выполняем основную логику
      const result = await this.executeOperation(input, context);
      
      const executionTime = Date.now() - startTime;
      const endDate = new Date();

      return {
        success: true,
        data: result.data,
        startTime: startDate,
        endTime: endDate,
        metadata: {
          executionTime,
          tokensUsed: result.tokensUsed,
          cost: this.estimateCost(input, context),
          model: result.model,
          operationId: this.id,
          operationName: this.name,
          operationVersion: this.version,
          category: this.category,
          complexity: this.complexity,
          // Передаем все метаданные из результата операции
          ...(result.data?.metadata || {})
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const endDate = new Date();
      
      console.error(`❌ Error in operation ${this.id}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        startTime: startDate,
        endTime: endDate,
        metadata: {
          executionTime,
          operationId: this.id,
          operationName: this.name,
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        }
      };
    }
  }

  /**
   * Базовая оценка стоимости на основе сложности
   */
  estimateCost(input: any, context: ExecutionContext): number {
    let baseCost = this.complexity;

    // Применяем множители
    if (context.priority === 'high') baseCost *= 1.5;
    if (context.userTier === 'enterprise') baseCost *= 0.8;
    if (context.userTier === 'business') baseCost *= 0.9;

    // Кастомная логика расчета стоимости
    const customCost = this.calculateCustomCost(input, context);
    
    return Math.ceil(baseCost * customCost);
  }

  /**
   * Абстрактные методы для переопределения в наследниках
   */

  /**
   * Специфичная валидация для конкретной операции
   */
  protected abstract validateInput(input: any, context: ExecutionContext): ValidationResult;

  /**
   * Основная логика выполнения операции
   */
  protected abstract executeOperation(input: any, context: ExecutionContext): Promise<{
    data: any;
    tokensUsed?: number;
    model?: string;
  }>;

  /**
   * Кастомная логика расчета стоимости (опционально)
   */
  protected calculateCustomCost(_input: any, _context: ExecutionContext): number {
    return 1; // Базовый множитель
  }
} 