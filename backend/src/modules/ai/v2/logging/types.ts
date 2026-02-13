// backend/src/modules/ai/v2/logging/types.ts

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogContext {
  userId?: string;
  projectId?: string;
  requestId?: string;
  operationId?: string;
  sessionId?: string;
  traceId?: string;
  pipelineId?: string;
}

export interface LogMetadata {
  // Производительность
  duration?: number;
  timestamp?: string;
  
  // AI специфичные метрики
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  realCostUSD?: number;
  creditsCharged?: number;
  qualityLevel?: string;
  
  // Ошибки
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  
  // Дополнительные данные
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  metadata?: LogMetadata;
}

export interface Logger {
  debug(message: string, context?: LogContext, metadata?: LogMetadata): void;
  info(message: string, context?: LogContext, metadata?: LogMetadata): void;
  warn(message: string, context?: LogContext, metadata?: LogMetadata): void;
  error(message: string, context?: LogContext, metadata?: LogMetadata): void;
}

export interface LoggerConfig {
  level: LogLevel;
  pretty: boolean;
  includeStack: boolean;
  maxMessageLength: number;
}
