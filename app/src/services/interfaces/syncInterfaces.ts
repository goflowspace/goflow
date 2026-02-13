// Интерфейсы для SyncService
// Следуют принципам SOLID для обеспечения чистой архитектуры

/**
 * Базовый интерфейс операции для синхронизации
 * Соответствует структуре из commands/operationUtils.ts
 */
export interface Operation {
  id?: number; // ID из IndexedDB
  type: string; // Тип операции
  projectId: string; // ID проекта
  timelineId: string; // ID временной линии
  payload: object; // Данные операции
  timestamp: number; // Время создания
  layerId?: string; // ID слоя (опционально)
  deviceId: string; // ID устройства для отслеживания источника операции
}

/**
 * Конфигурация сервиса синхронизации
 * Single Responsibility: только настройки синхронизации
 */
export interface ISyncConfig {
  batchSize: number; // Размер пакета операций
  syncIntervalMs: number; // Интервал синхронизации в мс
  maxRetries: number; // Максимальное количество повторов
  retryDelayMs: number; // Задержка между повторами в мс
  backoffMultiplier: number; // Множитель для экспоненциального увеличения задержки
}

/**
 * Пакет операций для отправки на сервер
 */
export interface IOperationBatch {
  id: string; // Уникальный ID пакета
  operations: Operation[]; // Массив операций
  timestamp: number; // Время создания пакета
  projectId: string; // ID проекта
  deviceId: string; // ID устройства
  lastSyncVersion?: number; // Последняя известная версия синхронизации
}

/**
 * Результат синхронизации от сервера
 */
export interface ISyncResult {
  success: boolean; // Успешность операции
  processedOperations: number[]; // ID обработанных операций
  syncVersion?: number; // Новая версия синхронизации
  errors?: string[]; // Ошибки, если есть
  conflicts?: any[]; // Конфликты, если есть
  serverOperations?: Operation[]; // Операции с сервера
}

/**
 * Статус сервиса синхронизации
 */
export type SyncStatus = 'stopped' | 'running' | 'paused' | 'error' | 'syncing';

/**
 * Статистика работы сервиса
 */
export interface ISyncStats {
  totalOperationsProcessed: number; // Всего обработано операций
  successfulSyncs: number; // Успешных синхронизаций
  failedSyncs: number; // Неудачных синхронизаций
  lastSyncTime: number | null; // Время последней синхронизации
  lastErrorTime: number | null; // Время последней ошибки
  lastError: string | null; // Последняя ошибка
  currentRetryCount: number; // Текущее количество повторов
  pendingOperations: number; // Количество ожидающих операций
}

/**
 * Интерфейс для работы с хранилищем операций
 * Interface Segregation: только методы для работы с операциями
 */
export interface IStorageService {
  getPendingOperations(limit: number): Promise<Operation[]>;
  deleteOperations(operationIds: number[]): Promise<void>;
  getOperationsCount(): Promise<number>;
}

/**
 * Интерфейс для работы с сетью
 * Interface Segregation: только методы для сетевых операций
 */
export interface INetworkService {
  sendOperations(batch: IOperationBatch): Promise<ISyncResult>;
  getOperations(projectId: string, sinceVersion: number): Promise<ISyncResult>;
  isOnline(): boolean;
}

/**
 * Интерфейс для логирования
 * Interface Segregation: только методы логирования
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}

/**
 * Интерфейс событий сервиса синхронизации
 */
export interface ISyncServiceEvents {
  syncStarted: () => void;
  syncCompleted: (stats: ISyncStats) => void;
  syncFailed: (error: string, stats: ISyncStats) => void;
  batchProcessed: (batch: IOperationBatch, result: ISyncResult) => void;
  statusChanged: (oldStatus: SyncStatus, newStatus: SyncStatus) => void;
  serverOperationsReceived: (operations: Operation[], syncVersion?: number) => void;
}

/**
 * Основной интерфейс сервиса синхронизации
 * Single Responsibility: только управление синхронизацией
 */
export interface ISyncService {
  // Управление жизненным циклом
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;

  // Получение состояния
  getStatus: () => SyncStatus;
  getStats: () => ISyncStats;

  // Принудительная синхронизация
  forceSync: () => Promise<boolean>;

  // Подписка на события
  on: <K extends keyof ISyncServiceEvents>(event: K, callback: ISyncServiceEvents[K]) => void;
  off<K extends keyof ISyncServiceEvents>(event: K, callback: ISyncServiceEvents[K]): void;

  // Новый метод для синхронизации по триггеру
  triggerSync: () => Promise<boolean>;
}

/**
 * Зависимости для инъекции в SyncService
 * Dependency Inversion: зависим от абстракций, а не от конкретных реализаций
 */
export interface ISyncServiceDependencies {
  storageService: IStorageService;
  networkService: INetworkService;
  logger: ILogger;
  config: ISyncConfig;
  projectId: string;
  deviceId: string;
}
