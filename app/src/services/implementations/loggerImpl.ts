import {ILogger} from '../interfaces/syncInterfaces';

/**
 * Реализация интерфейса ILogger для консольного логирования
 *
 * Принципы:
 * - Single Responsibility: только логирование
 * - Interface Segregation: реализует только методы интерфейса ILogger
 */
export class ConsoleLoggerImpl implements ILogger {
  private readonly prefix: string;

  constructor(prefix: string = '[SyncService]') {
    this.prefix = prefix;
  }

  /**
   * Логирует отладочную информацию
   * @param message Сообщение
   * @param args Дополнительные аргументы
   */
  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  /**
   * Логирует информационные сообщения
   * @param message Сообщение
   * @param args Дополнительные аргументы
   */
  info(message: string, ...args: any[]): void {
    console.info(`${this.prefix} [INFO]`, message, ...args);
  }

  /**
   * Логирует предупреждения
   * @param message Сообщение
   * @param args Дополнительные аргументы
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} [WARN]`, message, ...args);
  }

  /**
   * Логирует ошибки
   * @param message Сообщение
   * @param error Объект ошибки (опционально)
   * @param args Дополнительные аргументы
   */
  error(message: string, error?: Error, ...args: any[]): void {
    if (error) {
      console.error(`${this.prefix} [ERROR]`, message, error, ...args);
    } else {
      console.error(`${this.prefix} [ERROR]`, message, ...args);
    }
  }
}
