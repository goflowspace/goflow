// backend/src/modules/ai/v2/logging/AILogger.ts
import { StructuredLogger } from './StructuredLogger';
import { LogContext, LogMetadata } from './types';
import { ExecutionContext } from '../shared/types';

/**
 * Специализированный логгер для AI операций с удобными методами
 */
export class AILogger {
  private logger: StructuredLogger;

  constructor() {
    this.logger = StructuredLogger.getInstance();
  }

  /**
   * Создать контекст логирования из ExecutionContext
   */
  private createLogContext(context: ExecutionContext): LogContext {
    return {
      userId: context.userId,
      projectId: context.projectId,
      requestId: context.requestId,
      traceId: context.requestId // Используем requestId как traceId
    };
  }

  /**
   * Логирование начала операции
   */
  operationStart(operationId: string, operationName: string, context: ExecutionContext, metadata?: LogMetadata): void {
    this.logger.info(`🚀 Starting AI operation: ${operationName}`, {
      ...this.createLogContext(context),
      operationId
    }, {
      qualityLevel: context.qualityLevel,
      ...metadata
    });
  }

  /**
   * Логирование успешного завершения операции
   */
  operationSuccess(
    operationId: string, 
    operationName: string, 
    context: ExecutionContext, 
    duration: number,
    metadata?: LogMetadata
  ): void {
    this.logger.info(`✅ AI operation completed: ${operationName}`, {
      ...this.createLogContext(context),
      operationId
    }, {
      duration,
      qualityLevel: context.qualityLevel,
      ...metadata
    });
  }

  /**
   * Логирование ошибки операции
   */
  operationError(
    operationId: string, 
    operationName: string, 
    context: ExecutionContext, 
    error: Error,
    duration?: number,
    metadata?: LogMetadata
  ): void {
    this.logger.error(`❌ AI operation failed: ${operationName}`, {
      ...this.createLogContext(context),
      operationId
    }, {
      duration,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      qualityLevel: context.qualityLevel,
      ...metadata
    });
  }

  /**
   * Логирование вызова AI провайдера
   */
  providerCall(
    provider: string, 
    model: string, 
    context: ExecutionContext,
    metadata?: LogMetadata
  ): void {
    this.logger.debug(`🔄 Calling AI provider: ${provider}/${model}`, {
      ...this.createLogContext(context)
    }, {
      provider,
      model,
      ...metadata
    });
  }

  /**
   * Логирование ответа от AI провайдера
   */
  providerResponse(
    provider: string, 
    model: string, 
    context: ExecutionContext,
    duration: number,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    metadata?: LogMetadata
  ): void {
    this.logger.info(`📨 AI provider response: ${provider}/${model}`, {
      ...this.createLogContext(context)
    }, {
      provider,
      model,
      duration,
      inputTokens,
      outputTokens,
      realCostUSD: cost,
      ...metadata
    });
  }

  /**
   * Логирование ошибки провайдера
   */
  providerError(
    provider: string, 
    model: string, 
    context: ExecutionContext,
    error: Error,
    duration?: number,
    metadata?: LogMetadata
  ): void {
    this.logger.error(`💥 AI provider error: ${provider}/${model}`, {
      ...this.createLogContext(context)
    }, {
      provider,
      model,
      duration,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...metadata
    });
  }

  /**
   * Логирование валидации
   */
  validation(
    operationId: string,
    context: ExecutionContext,
    isValid: boolean,
    errors?: string[],
    metadata?: LogMetadata
  ): void {
    if (isValid) {
      this.logger.debug(`✔️ Validation passed for operation: ${operationId}`, {
        ...this.createLogContext(context),
        operationId
      }, metadata);
    } else {
      this.logger.warn(`⚠️ Validation failed for operation: ${operationId}`, {
        ...this.createLogContext(context),
        operationId
      }, {
        validationErrors: errors,
        ...metadata
      });
    }
  }

  /**
   * Логирование подозрительного контента
   */
  suspiciousContent(
    operationId: string,
    context: ExecutionContext,
    reasons: string[],
    metadata?: LogMetadata
  ): void {
    this.logger.warn(`🚨 Suspicious content detected in operation: ${operationId}`, {
      ...this.createLogContext(context),
      operationId
    }, {
      suspiciousReasons: reasons,
      ...metadata
    });
  }

  /**
   * Логирование метрик пайплайна
   */
  pipelineProgress(
    pipelineId: string,
    context: ExecutionContext,
    progress: number,
    currentStep: string,
    totalSteps: number,
    metadata?: LogMetadata
  ): void {
    this.logger.info(`📊 Pipeline progress: ${pipelineId}`, {
      ...this.createLogContext(context)
    }, {
      pipelineId,
      progress,
      currentStep,
      totalSteps,
      ...metadata
    });
  }

  /**
   * Логирование завершения пайплайна
   */
  pipelineComplete(
    pipelineId: string,
    context: ExecutionContext,
    totalDuration: number,
    stepsCompleted: number,
    stepsSkipped: number,
    stepsFailed: number,
    metadata?: LogMetadata
  ): void {
    this.logger.info(`🏁 Pipeline completed: ${pipelineId}`, {
      ...this.createLogContext(context)
    }, {
      pipelineId,
      totalDuration,
      stepsCompleted,
      stepsSkipped,
      stepsFailed,
      ...metadata
    });
  }

  /**
   * Логирование производительности
   */
  performance(
    operation: string,
    context: ExecutionContext,
    metrics: {
      duration: number;
      memoryUsage?: number;
      cpuUsage?: number;
    },
    metadata?: LogMetadata
  ): void {
    this.logger.debug(`⚡ Performance metrics for: ${operation}`, {
      ...this.createLogContext(context)
    }, {
      operation,
      ...metrics,
      ...metadata
    });
  }

  /**
   * Получить базовый логгер для кастомного использования
   */
  getBaseLogger(): StructuredLogger {
    return this.logger;
  }
}
