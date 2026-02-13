// backend/src/modules/ai/v2/logging/StructuredLogger.ts
import { LogLevel, LogContext, LogMetadata, LogEntry, Logger, LoggerConfig } from './types';

export class StructuredLogger implements Logger {
  private config: LoggerConfig;
  private static instance: StructuredLogger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      pretty: process.env.NODE_ENV === 'development',
      includeStack: false,
      maxMessageLength: 1000,
      ...config
    };
  }

  /**
   * Получить singleton инстанс логгера
   */
  static getInstance(config?: Partial<LoggerConfig>): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger(config);
    }
    return StructuredLogger.instance;
  }

  debug(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  info(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  warn(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  error(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.log(LogLevel.ERROR, message, context, metadata);
  }

  /**
   * Основной метод логирования
   */
  private log(level: LogLevel, message: string, context?: LogContext, metadata?: LogMetadata): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message: this.truncateMessage(message),
      timestamp: new Date().toISOString(),
      context: context || {},
      metadata: this.sanitizeMetadata(metadata)
    };

    if (this.config.pretty) {
      this.logPretty(entry);
    } else {
      this.logJson(entry);
    }
  }

  /**
   * Проверить, нужно ли логировать сообщение данного уровня
   */
  private shouldLog(level: LogLevel): boolean {
    const levelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3
    };

    return levelPriority[level] >= levelPriority[this.config.level];
  }

  /**
   * Обрезать сообщение до максимальной длины
   */
  private truncateMessage(message: string): string {
    if (message.length <= this.config.maxMessageLength) {
      return message;
    }
    return message.substring(0, this.config.maxMessageLength - 3) + '...';
  }

  /**
   * Очистить метаданные от чувствительной информации
   */
  private sanitizeMetadata(metadata?: LogMetadata): LogMetadata | undefined {
    if (!metadata) return undefined;

    const sanitized = { ...metadata };
    
    // Удаляем потенциально чувствительные данные
    const sensitiveFields = ['password', 'token', 'apikey', 'secret', 'credential'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Красивый вывод для разработки
   */
  private logPretty(entry: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m'  // Red
    };
    
    const reset = '\x1b[0m';
    const color = colors[entry.level];
    
    const contextStr = Object.keys(entry.context).length > 0 
      ? ` [${Object.entries(entry.context).map(([k, v]) => `${k}=${v}`).join(' ')}]`
      : '';

    const metadataStr = entry.metadata && Object.keys(entry.metadata).length > 0
      ? `\n  ${JSON.stringify(entry.metadata, null, 2)}`
      : '';

    console.log(
      `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}${reset}${contextStr}: ${entry.message}${metadataStr}`
    );
  }

  /**
   * JSON вывод для продакшена
   */
  private logJson(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }

  /**
   * Создать дочерний логгер с предустановленным контекстом
   */
  child(context: LogContext) {
    const { ContextualLogger } = require('./ContextualLogger');
    return new ContextualLogger(this, context);
  }
}
