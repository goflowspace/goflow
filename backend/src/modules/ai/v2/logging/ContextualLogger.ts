// backend/src/modules/ai/v2/logging/ContextualLogger.ts
import { LogContext, LogMetadata, Logger } from './types';
import { StructuredLogger } from './StructuredLogger';

/**
 * Контекстуальный логгер - удобная обертка для логирования с предустановленным контекстом
 */
export class ContextualLogger implements Logger {
  private parentLogger: StructuredLogger;
  private baseContext: LogContext;

  constructor(parentLogger: StructuredLogger, baseContext: LogContext) {
    this.parentLogger = parentLogger;
    this.baseContext = baseContext;
  }

  debug(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.parentLogger.debug(message, this.mergeContext(context), metadata);
  }

  info(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.parentLogger.info(message, this.mergeContext(context), metadata);
  }

  warn(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.parentLogger.warn(message, this.mergeContext(context), metadata);
  }

  error(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.parentLogger.error(message, this.mergeContext(context), metadata);
  }

  /**
   * Объединить базовый контекст с дополнительным
   */
  private mergeContext(additionalContext?: LogContext): LogContext {
    return {
      ...this.baseContext,
      ...additionalContext
    };
  }

  /**
   * Создать дочерний логгер с расширенным контекстом
   */
  child(additionalContext: LogContext): ContextualLogger {
    return new ContextualLogger(this.parentLogger, this.mergeContext(additionalContext));
  }
}
