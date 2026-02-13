// backend/src/modules/ai/v2/logging/PerformanceTracker.ts
import { AILogger } from './AILogger';
import { ExecutionContext } from '../shared/types';
import { LogMetadata } from './types';

/**
 * Утилита для отслеживания производительности операций
 */
export class PerformanceTracker {
  private startTime: number;
  private operationName: string;
  private context: ExecutionContext;
  private logger: AILogger;
  private metadata: LogMetadata;

  constructor(operationName: string, context: ExecutionContext, metadata: LogMetadata = {}) {
    this.operationName = operationName;
    this.context = context;
    this.logger = new AILogger();
    this.metadata = metadata;
    this.startTime = Date.now();
  }

  /**
   * Завершить отслеживание и залогировать результат
   */
  finish(additionalMetadata: LogMetadata = {}): number {
    const duration = Date.now() - this.startTime;
    
    this.logger.performance(this.operationName, this.context, {
      duration,
      memoryUsage: this.getMemoryUsage()
    }, {
      ...this.metadata,
      ...additionalMetadata
    });

    return duration;
  }

  /**
   * Получить текущую длительность без завершения трекинга
   */
  getCurrentDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Добавить промежуточную метку времени
   */
  checkpoint(name: string, metadata: LogMetadata = {}): number {
    const duration = this.getCurrentDuration();
    
    this.logger.getBaseLogger().debug(`⏱️ Checkpoint "${name}" in ${this.operationName}`, {
      userId: this.context.userId,
      projectId: this.context.projectId,
      requestId: this.context.requestId
    }, {
      checkpoint: name,
      duration,
      memoryUsage: this.getMemoryUsage(),
      ...metadata
    });

    return duration;
  }

  /**
   * Получить информацию об использовании памяти
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }
}

/**
 * Декоратор для автоматического отслеживания производительности методов
 */
export function trackPerformance(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const finalOperationName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      // Пытаемся найти ExecutionContext в аргументах
      const context = args.find(arg => arg && typeof arg === 'object' && arg.userId && arg.requestId) as ExecutionContext;
      
      if (!context) {
        // Если контекст не найден, выполняем метод без трекинга
        return originalMethod.apply(this, args);
      }

      const tracker = new PerformanceTracker(finalOperationName, context);
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = tracker.finish({ success: true });
        
        // Добавляем информацию о производительности в результат, если это возможно
        if (result && typeof result === 'object' && result.metadata) {
          result.metadata.duration = duration;
        }
        
        return result;
      } catch (error) {
        tracker.finish({ 
          success: false, 
          error: {
            name: (error as Error).name,
            message: (error as Error).message
          }
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Простая функция для измерения времени выполнения асинхронных операций
 */
export async function measureTime<T>(
  operation: () => Promise<T>,
  operationName: string,
  context: ExecutionContext,
  metadata: LogMetadata = {}
): Promise<{ result: T; duration: number }> {
  const tracker = new PerformanceTracker(operationName, context, metadata);
  
  try {
    const result = await operation();
    const duration = tracker.finish({ success: true });
    return { result, duration };
  } catch (error) {
    tracker.finish({ 
      success: false, 
      error: {
        name: (error as Error).name,
        message: (error as Error).message
      }
    });
    throw error;
  }
}
