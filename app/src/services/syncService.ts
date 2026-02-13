import {IOperationBatch, ISyncConfig, ISyncResult, ISyncService, ISyncServiceDependencies, ISyncServiceEvents, ISyncStats, Operation, SyncStatus} from './interfaces/syncInterfaces';

/**
 * Конфигурация по умолчанию для сервиса синхронизации
 * KISS принцип: простые и разумные значения по умолчанию
 */
export const DEFAULT_SYNC_CONFIG: ISyncConfig = {
  batchSize: 50, // Операций за раз
  syncIntervalMs: 5000, // Синхронизация каждые 5 секунд
  maxRetries: 3, // Максимум 3 повтора
  retryDelayMs: 2000, // Начальная задержка 2 секунды
  backoffMultiplier: 2 // Экспоненциальное увеличение задержки
};

/**
 * Сервис для фоновой синхронизации операций
 *
 * Принципы:
 * - Single Responsibility: только синхронизация операций
 * - Open/Closed: расширяемый через интерфейсы и события
 * - Liskov Substitution: реализует ISyncService интерфейс
 * - Interface Segregation: четко разделенные интерфейсы зависимостей
 * - Dependency Inversion: зависит от абстракций, а не от конкретных реализаций
 */
export class SyncService implements ISyncService {
  private status: SyncStatus = 'stopped';
  private stats: ISyncStats = this.createInitialStats();
  private syncTimer: number | null = null;
  private retryTimer: number | null = null;
  private eventListeners: Partial<Record<keyof ISyncServiceEvents, ((...args: any[]) => void)[]>> = {};
  private isProcessing = false;
  private lastSyncVersion = 0;

  constructor(private dependencies: ISyncServiceDependencies) {
    this.validateDependencies();
    this.loadSyncVersion(); // Загружаем сохраненную версию
    this.dependencies.logger.info('SyncService initialized', {
      projectId: dependencies.projectId,
      deviceId: dependencies.deviceId,
      config: dependencies.config,
      lastSyncVersion: this.lastSyncVersion
    });
  }

  /**
   * Запускает сервис синхронизации
   */
  start(): void {
    if (this.status === 'running') {
      this.dependencies.logger.warn('SyncService already running');
      return;
    }

    this.dependencies.logger.info('Starting SyncService');
    this.setStatus('running');
    this.startSyncTimer();
    this.emit('syncStarted');
  }

  /**
   * Останавливает сервис синхронизации
   */
  stop(): void {
    this.dependencies.logger.info('Stopping SyncService');
    this.clearTimers();
    this.setStatus('stopped');
  }

  /**
   * Приостанавливает синхронизацию
   */
  pause(): void {
    if (this.status !== 'running') {
      this.dependencies.logger.warn('Cannot pause - service not running');
      return;
    }

    this.dependencies.logger.info('Pausing SyncService');
    this.clearTimers();
    this.setStatus('paused');
  }

  /**
   * Возобновляет синхронизацию после паузы
   */
  resume(): void {
    if (this.status !== 'paused') {
      this.dependencies.logger.warn('Cannot resume - service not paused');
      return;
    }

    this.dependencies.logger.info('Resuming SyncService');
    this.setStatus('running');
    this.startSyncTimer();
  }

  /**
   * Получает текущий статус сервиса
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Получает статистику работы сервиса
   */
  getStats(): ISyncStats {
    return {...this.stats};
  }

  /**
   * Принудительная синхронизация
   */
  async forceSync(): Promise<boolean> {
    this.dependencies.logger.info('Force sync requested');
    return this.triggerSync();
  }

  /**
   * Принудительно запускает цикл синхронизации.
   * Если сервис в состоянии ошибки, сбрасывает его.
   * @returns `true` если синхронизация была запущена, `false` если уже в процессе.
   */
  async triggerSync(): Promise<boolean> {
    if (this.isProcessing) {
      this.dependencies.logger.warn('Sync already in progress');
      return false;
    }

    // Если сервис в состоянии ошибки, сбрасываем его для новой попытки
    if (this.status === 'error') {
      this.dependencies.logger.info('Resetting from error state to retry sync.');
      this.stats.currentRetryCount = 0;
      this.setStatus('running');
    }

    // Запускаем основную логику синхронизации немедленно
    this.performSyncSafely();
    return true;
  }

  /**
   * Подписка на события
   */
  on<K extends keyof ISyncServiceEvents>(event: K, callback: ISyncServiceEvents[K]): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event]!.push(callback);
  }

  /**
   * Отписка от событий
   */
  off<K extends keyof ISyncServiceEvents>(event: K, callback: ISyncServiceEvents[K]): void {
    if (!this.eventListeners[event]) return;

    const index = this.eventListeners[event]!.indexOf(callback);
    if (index > -1) {
      this.eventListeners[event]!.splice(index, 1);
    }
  }

  /**
   * Запускает таймер синхронизации
   * DRY принцип: единое место управления таймером
   */
  private startSyncTimer(): void {
    this.clearTimers();

    const isWebSocketMode = this.dependencies.config.syncIntervalMs >= 30000; // WebSocket режим если интервал >= 30 сек

    this.dependencies.logger.info(`Starting sync timer with interval ${this.dependencies.config.syncIntervalMs}ms`, {
      mode: isWebSocketMode ? 'WebSocket (cleanup-only)' : 'REST (polling)',
      isWebSocketMode
    });

    // Выполняем первую синхронизацию сразу
    this.performSyncSafely();

    this.syncTimer = window.setInterval(() => {
      if (isWebSocketMode) {
        this.dependencies.logger.debug('WebSocket mode: cleanup sync tick');
      } else {
        this.dependencies.logger.debug('REST mode: sync timer tick');
      }
      this.performSyncSafely();
    }, this.dependencies.config.syncIntervalMs);
  }

  /**
   * Очищает все таймеры
   * DRY принцип: единое место очистки таймеров
   */
  private clearTimers(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Безопасное выполнение синхронизации с обработкой ошибок
   * KISS принцип: простая обертка для безопасности
   */
  private async performSyncSafely(): Promise<void> {
    try {
      await this.performSync();
    } catch (error) {
      this.handleSyncError(error as Error);
    }
  }

  /**
   * Основная логика синхронизации
   * Single Responsibility: только синхронизация
   */
  private async performSync(): Promise<void> {
    if (this.isProcessing || this.status !== 'running') {
      return;
    }

    await this.performSyncLogic();
  }

  /**
   * Основная логика синхронизации (общая для обычной и принудительной)
   */
  private async performSyncLogic(): Promise<void> {
    this.dependencies.logger.debug('performSyncLogic called');

    if (!this.dependencies.networkService.isOnline()) {
      this.dependencies.logger.debug('Network offline, skipping sync');
      return;
    }

    if (this.isProcessing) {
      this.dependencies.logger.debug('Sync already in progress, skipping');
      return;
    }
    this.isProcessing = true;

    try {
      let pendingOperations = await this.dependencies.storageService.getPendingOperations(this.dependencies.config.batchSize);

      if (pendingOperations.length === 0) {
        this.dependencies.logger.debug('No pending operations to sync');
        await this.handleEmptySync();
        return;
      }

      const originalStatus = this.status;
      this.setStatus('syncing');

      while (pendingOperations.length > 0) {
        this.dependencies.logger.info(`Syncing a batch of ${pendingOperations.length} operations`);
        const batch = this.createOperationBatch(pendingOperations);

        try {
          this.dependencies.logger.debug('Sending operations to server...', batch);
          const result = await this.dependencies.networkService.sendOperations(batch);
          this.dependencies.logger.debug('Server response:', result);

          await this.processSyncResult(batch, result);

          // Если синхронизация не удалась (например, из-за отставания клиента), прерываем цикл
          if (!result.success) {
            this.dependencies.logger.warn('Sync failed for batch, stopping current sync cycle.');
            break;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during batch sending';
          this.dependencies.logger.error(`Error sending batch, stopping current sync cycle. Error: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));

          // Проверяем на ошибку аутентификации
          if (errorMessage.includes('status: 401')) {
            this.setStatus('error');
            this.emit('syncFailed', 'Authentication failed. Please log in again.', this.getStats());
            this.stop(); // Останавливаем сервис, так как без аутентификации он бесполезен
            return; // Выходим из цикла
          }

          throw error; // Перебрасываем другие ошибки для стандартной обработки (retry)
        }

        // Получаем следующую порцию операций
        pendingOperations = await this.dependencies.storageService.getPendingOperations(this.dependencies.config.batchSize);
      }

      this.setStatus(originalStatus === 'syncing' ? 'running' : originalStatus);
    } catch (error) {
      this.dependencies.logger.error('Error in performSyncLogic:', error as Error);
      // Оставляем isProcessing = true, чтобы retry-логика сработала
      this.isProcessing = false; // Сбрасываем флаг, чтобы не блокировать будущие попытки
      throw error; // Передаем ошибку выше, чтобы сработал `handleSyncError`
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Опрашивает сервер на наличие новых операций
   */
  private async pollForUpdates(): Promise<void> {
    try {
      const result = await this.dependencies.networkService.getOperations(this.dependencies.projectId, this.lastSyncVersion);

      if (result.success && result.serverOperations && result.serverOperations.length > 0) {
        this.dependencies.logger.info(`Polling found ${result.serverOperations.length} new operations from server`);
        this.emit('serverOperationsReceived', result.serverOperations, result.syncVersion);

        if (result.syncVersion !== undefined) {
          this.lastSyncVersion = result.syncVersion;
          this.saveSyncVersion();
        }
      }
    } catch (error) {
      this.dependencies.logger.warn('Polling for updates failed', error);
    } finally {
      // В любом случае обновляем статистику и сбрасываем счетчик ошибок
      this.stats.lastSyncTime = Date.now();
      this.stats.currentRetryCount = 0;
      this.emit('syncCompleted', this.getStats());
    }
  }

  /**
   * Обрабатывает случай когда нет операций для синхронизации
   */
  private async handleEmptySync(): Promise<void> {
    // Обновляем количество ожидающих операций
    this.stats.pendingOperations = await this.dependencies.storageService.getOperationsCount();

    // Обновляем время последней синхронизации
    this.stats.lastSyncTime = Date.now();

    // Сбрасываем количество повторов
    this.stats.currentRetryCount = 0;

    // Не генерируем событие syncCompleted, если нет операций
    // Это избегает лишних логов и обработки событий
    this.dependencies.logger.debug('No operations to sync, skipping event');
  }

  /**
   * Создает пакет операций для отправки
   * DRY принцип: переиспользуемая логика создания пакета
   */
  private createOperationBatch(operations: Operation[]): IOperationBatch {
    return {
      id: this.generateBatchId(),
      operations,
      timestamp: Date.now(),
      projectId: this.dependencies.projectId,
      deviceId: this.dependencies.deviceId,
      lastSyncVersion: this.lastSyncVersion
    };
  }

  /**
   * Обрабатывает результат синхронизации
   * @returns `true`, если цикл синхронизации можно продолжать, `false` в противном случае.
   */
  private async processSyncResult(batch: IOperationBatch, result: ISyncResult): Promise<boolean> {
    if (result.success) {
      await this.handleSuccessfulSync(batch, result);
      return true;
    } else {
      return await this.handleFailedSync(batch, result);
    }
  }

  /**
   * Обрабатывает успешную синхронизацию
   */
  private async handleSuccessfulSync(batch: IOperationBatch, result: ISyncResult): Promise<void> {
    this.dependencies.logger.info(`Successfully synced batch ${batch.id}`, {
      processedCount: result.processedOperations.length,
      syncVersion: result.syncVersion
    });

    // Удаляем обработанные операции
    if (result.processedOperations.length > 0) {
      await this.dependencies.storageService.deleteOperations(result.processedOperations);
    }

    // Обновляем статистику
    this.stats.successfulSyncs++;
    this.stats.totalOperationsProcessed += result.processedOperations.length;
    this.stats.lastSyncTime = Date.now();
    this.stats.currentRetryCount = 0;
    this.stats.lastError = null;
    this.stats.lastErrorTime = null;

    // Обновляем версию синхронизации
    if (result.syncVersion !== undefined) {
      this.lastSyncVersion = result.syncVersion;
      this.saveSyncVersion(); // Сохраняем версию для следующих сессий
    }

    // Обновляем количество ожидающих операций
    this.stats.pendingOperations = await this.dependencies.storageService.getOperationsCount();

    // Генерируем события
    this.emit('batchProcessed', batch, result);
    this.emit('syncCompleted', this.getStats());
  }

  /**
   * Обрабатывает неуспешную синхронизацию
   * @returns `true`, если можно продолжать синхронизацию (например, после catch-up), `false` если нужно остановиться.
   */
  private async handleFailedSync(batch: IOperationBatch, result: ISyncResult): Promise<boolean> {
    const errorMessage = result.errors?.join(', ') || 'Unknown sync error';
    this.dependencies.logger.warn(`Sync failed for batch ${batch.id}`, new Error(errorMessage));

    // Умная обработка конфликта версий
    if (!result.success && result.syncVersion && result.syncVersion > this.lastSyncVersion) {
      this.dependencies.logger.info(`Version mismatch detected. Client: ${this.lastSyncVersion}, Server: ${result.syncVersion}. Starting catch-up...`);
      await this.catchUpAndRetry(result.syncVersion);
      // После успешного catch-up, мы хотим чтобы цикл продолжился и повторил отправку
      return true;
    }

    // Если есть серверные операции (старый механизм на всякий случай)
    if (result.serverOperations && result.serverOperations.length > 0) {
      this.dependencies.logger.info(`Received ${result.serverOperations.length} server operations due to version mismatch`);

      // Обновляем версию синхронизации
      if (result.syncVersion !== undefined) {
        this.dependencies.logger.info(`Updating client sync version from ${this.lastSyncVersion} to ${result.syncVersion}`);
        this.lastSyncVersion = result.syncVersion;
        this.saveSyncVersion(); // Сохраняем версию для следующих сессий
      }

      // Эмитируем событие с серверными операциями для их применения
      this.emit('serverOperationsReceived', result.serverOperations, result.syncVersion);

      // Помечаем конфликтующие операции клиента для повторной отправки
      if (result.conflicts && result.conflicts.length > 0) {
        this.dependencies.logger.info(`${result.conflicts.length} client operations will be retried after applying server operations`);
        // Здесь можно добавить логику для повторной обработки конфликтующих операций
      }

      // Обновляем статистику успешной синхронизации (получили серверные операции)
      this.stats.lastSyncTime = Date.now();
      this.stats.currentRetryCount = 0;
      this.stats.lastError = null;
      this.stats.lastErrorTime = null;

      this.emit('syncCompleted', this.getStats());
      return true;
    }

    // Обычная обработка ошибок (когда нет серверных операций)
    this.stats.failedSyncs++;
    this.stats.lastError = errorMessage;
    this.stats.lastErrorTime = Date.now();

    // Планируем повтор, если не превышен лимит
    if (this.stats.currentRetryCount < this.dependencies.config.maxRetries) {
      this.stats.currentRetryCount++;
      this.scheduleRetry();
    } else {
      this.dependencies.logger.error('Max retries exceeded, giving up on sync');
      this.setStatus('error');
      this.emit('syncFailed', errorMessage, this.getStats());
    }
    // В случае обычной ошибки или превышения ретраев, останавливаем цикл
    return false;
  }

  /**
   * Новый метод для "наверстывания"
   */
  private async catchUpAndRetry(serverVersion: number): Promise<void> {
    try {
      this.dependencies.logger.info(`Fetching operations since version ${this.lastSyncVersion}`);

      // 1. Получаем недостающие операции
      const serverResult = await this.dependencies.networkService.getOperations(this.dependencies.projectId, this.lastSyncVersion);

      // 2. Применяем серверные операции, если они есть
      if (serverResult.success && serverResult.serverOperations && serverResult.serverOperations.length > 0) {
        this.dependencies.logger.info(`Applying ${serverResult.serverOperations.length} new operations from server.`);
        this.emit('serverOperationsReceived', serverResult.serverOperations, serverResult.syncVersion);
      }

      // 3. В любом случае обновляем версию до той, что сказал сервер
      this.dependencies.logger.info(`Updating client sync version to ${serverVersion}`);
      this.lastSyncVersion = serverVersion;
      this.saveSyncVersion();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during catch-up';
      this.dependencies.logger.error('Failed to catch up with server.', new Error(errorMessage));
      // Передаем ошибку выше, чтобы сработала стандартная логика ретраев
      throw error;
    }
  }

  /**
   * Обрабатывает ошибки синхронизации
   */
  private handleSyncError(error: Error): void {
    this.dependencies.logger.error('Sync error occurred', error);

    // Обновляем статистику ошибок
    this.stats.failedSyncs++;
    this.stats.lastError = error.message;
    this.stats.lastErrorTime = Date.now();

    // Планируем повтор
    if (this.stats.currentRetryCount < this.dependencies.config.maxRetries) {
      this.stats.currentRetryCount++;
      this.scheduleRetry();
    } else {
      this.setStatus('error');
      this.emit('syncFailed', error.message, this.getStats());
    }
  }

  /**
   * Планирует повторную попытку синхронизации
   * Использует экспоненциальную задержку
   */
  private scheduleRetry(): void {
    const delay = this.dependencies.config.retryDelayMs * Math.pow(this.dependencies.config.backoffMultiplier, this.stats.currentRetryCount - 1);

    this.dependencies.logger.info(`Scheduling retry ${this.stats.currentRetryCount} in ${delay}ms`);

    this.retryTimer = window.setTimeout(() => {
      this.performSyncSafely();
    }, delay);
  }

  /**
   * Изменяет статус и генерирует событие
   */
  private setStatus(newStatus: SyncStatus): void {
    const oldStatus = this.status;
    this.status = newStatus;

    if (oldStatus !== newStatus) {
      this.emit('statusChanged', oldStatus, newStatus);
    }
  }

  /**
   * Генерирует событие
   * DRY принцип: единая точка генерации событий
   */
  private emit<K extends keyof ISyncServiceEvents>(event: K, ...args: Parameters<ISyncServiceEvents[K]>): void {
    const listeners = this.eventListeners[event];
    if (listeners?.length) {
      listeners.forEach((callback) => {
        try {
          (callback as any)(...args);
        } catch (error) {
          this.dependencies.logger.error(`Event handler error for ${event}`, error as Error);
        }
      });
    }
  }

  /**
   * Создает начальную статистику
   */
  private createInitialStats(): ISyncStats {
    return {
      totalOperationsProcessed: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null,
      lastErrorTime: null,
      lastError: null,
      currentRetryCount: 0,
      pendingOperations: 0
    };
  }

  /**
   * Генерирует уникальный ID пакета
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Сохраняет версию синхронизации в localStorage
   */
  private saveSyncVersion(): void {
    try {
      const key = `sync_version_${this.dependencies.projectId}`;
      localStorage.setItem(key, this.lastSyncVersion.toString());
      this.dependencies.logger.debug(`Saved sync version ${this.lastSyncVersion} for project ${this.dependencies.projectId}`);
    } catch (error) {
      this.dependencies.logger.warn('Failed to save sync version to localStorage:', error);
    }
  }

  /**
   * Загружает версию синхронизации из localStorage
   */
  private loadSyncVersion(): void {
    try {
      const key = `sync_version_${this.dependencies.projectId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const version = parseInt(saved, 10);
        if (!isNaN(version) && version >= 0) {
          this.lastSyncVersion = version;
          this.dependencies.logger.debug(`Loaded sync version ${this.lastSyncVersion} for project ${this.dependencies.projectId}`);
        }
      }
    } catch (error) {
      this.dependencies.logger.warn('Failed to load sync version from localStorage:', error);
    }
  }

  /**
   * Валидирует зависимости при создании
   * KISS принцип: простая проверка обязательных зависимостей
   */
  private validateDependencies(): void {
    const {storageService, networkService, logger, config, projectId, deviceId} = this.dependencies;

    if (!storageService || !networkService || !logger || !config || !projectId || !deviceId) {
      throw new Error('Missing required dependencies for SyncService');
    }

    if (config.batchSize <= 0 || config.syncIntervalMs <= 0 || config.maxRetries < 0) {
      throw new Error('Invalid configuration values for SyncService');
    }
  }
}
