// backend/src/modules/ai/v2/logging/index.ts

import { AILogger } from './AILogger';
import { StructuredLogger } from './StructuredLogger';
import { LogContext, LoggerConfig } from './types';

// Основные классы
export { StructuredLogger } from './StructuredLogger';
export { ContextualLogger } from './ContextualLogger';
export { AILogger } from './AILogger';
export { PerformanceTracker, trackPerformance, measureTime } from './PerformanceTracker';

// Типы и интерфейсы
export type {
  LogContext,
  LogMetadata,
  LogEntry,
  Logger,
  LoggerConfig
} from './types';

export { LogLevel } from './types';

// Готовые инстансы для удобства
export const logger = StructuredLogger.getInstance();
export const aiLogger = new AILogger();

// Утилиты для быстрого использования
export const createLogger = (config?: Partial<LoggerConfig>) => new StructuredLogger(config);
export const createContextLogger = (context: LogContext) => logger.child(context);
