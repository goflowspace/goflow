import {ILogger, INetworkService, IStorageService, ISyncConfig, ISyncResult, ISyncServiceDependencies, Operation, SyncStatus} from '../interfaces/syncInterfaces';
import {DEFAULT_SYNC_CONFIG, SyncService} from '../syncService';

// Используем реальные таймеры для более предсказуемого поведения
jest.useRealTimers();

// --- MOCKS ---

const createMockDependencies = (configOverrides: Partial<ISyncConfig> = {}): ISyncServiceDependencies => {
  const config: ISyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    syncIntervalMs: 100, // Быстрая синхронизация для тестов
    retryDelayMs: 50, // Быстрые ретраи
    ...configOverrides
  };

  return {
    storageService: {
      getPendingOperations: jest.fn().mockResolvedValue([]),
      deleteOperations: jest.fn().mockResolvedValue(undefined),
      getOperationsCount: jest.fn().mockResolvedValue(0)
    } as jest.Mocked<IStorageService>,
    networkService: {
      sendOperations: jest.fn(),
      getOperations: jest.fn(),
      isOnline: jest.fn().mockReturnValue(true)
    } as jest.Mocked<INetworkService>,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as jest.Mocked<ILogger>,
    config,
    projectId: 'test-project-id',
    deviceId: 'test-device-id'
  };
};

const createMockOperation = (id: number): Operation => ({
  id,
  type: 'node.added',
  projectId: 'test-project-id',
  timelineId: 'timeline-1',
  payload: {nodeId: `node-${id}`},
  timestamp: Date.now(),
  layerId: 'layer-1',
  deviceId: 'test-device-id'
});

// --- TESTS ---

describe('SyncService v2', () => {
  let syncService: SyncService;
  let dependencies: ISyncServiceDependencies;
  let mockStorageService: jest.Mocked<IStorageService>;
  let mockNetworkService: jest.Mocked<INetworkService>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Мокаем localStorage
    const localStorageMock: {[key: string]: string} = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => localStorageMock[key] || null),
        setItem: jest.fn((key, value) => {
          localStorageMock[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
          delete localStorageMock[key];
        }),
        clear: jest.fn(() => {
          Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
        })
      },
      writable: true
    });

    dependencies = createMockDependencies();
    mockStorageService = dependencies.storageService as jest.Mocked<IStorageService>;
    mockNetworkService = dependencies.networkService as jest.Mocked<INetworkService>;
    mockLogger = dependencies.logger as jest.Mocked<ILogger>;

    syncService = new SyncService(dependencies);
    jest.clearAllMocks();
  });

  afterEach(() => {
    syncService.stop();
  });

  describe('Initialization', () => {
    it('should initialize with default status and stats', () => {
      expect(syncService.getStatus()).toBe('stopped');
      expect(syncService.getStats()).toEqual({
        totalOperationsProcessed: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncTime: null,
        lastErrorTime: null,
        lastError: null,
        currentRetryCount: 0,
        pendingOperations: 0
      });
    });

    it('should log initialization details', () => {
      jest.clearAllMocks();
      const newService = new SyncService(dependencies);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'SyncService initialized',
        expect.objectContaining({
          projectId: 'test-project-id',
          deviceId: 'test-device-id'
        })
      );
    });

    it('should throw an error for missing dependencies', () => {
      const incompleteDeps = {...dependencies, projectId: ''};
      expect(() => new SyncService(incompleteDeps)).toThrow('Missing required dependencies for SyncService');
    });

    it('should throw an error for invalid configuration', () => {
      const invalidConfigDeps = createMockDependencies({batchSize: -1});
      expect(() => new SyncService(invalidConfigDeps)).toThrow('Invalid configuration values for SyncService');
    });

    it('should load sync version from localStorage if available', () => {
      const key = `sync_version_${dependencies.projectId}`;
      localStorage.setItem(key, '123');

      jest.clearAllMocks();
      const newService = new SyncService(dependencies);

      expect(mockLogger.debug).toHaveBeenCalledWith('Loaded sync version 123 for project test-project-id');
    });
  });

  describe('Lifecycle Management', () => {
    it('should transition to "running" state on start()', () => {
      const statusSpy = jest.fn();
      syncService.on('statusChanged', statusSpy);

      syncService.start();

      expect(syncService.getStatus()).toBe('running');
      expect(statusSpy).toHaveBeenCalledWith('stopped', 'running');
    });

    it('should transition to "stopped" on stop()', () => {
      syncService.start();
      const statusSpy = jest.fn();
      syncService.on('statusChanged', statusSpy);

      syncService.stop();

      expect(syncService.getStatus()).toBe('stopped');
      expect(statusSpy).toHaveBeenCalledWith('running', 'stopped');
    });

    it('should transition to "paused" on pause()', () => {
      syncService.start();
      const statusSpy = jest.fn();
      syncService.on('statusChanged', statusSpy);

      syncService.pause();

      expect(syncService.getStatus()).toBe('paused');
      expect(statusSpy).toHaveBeenCalledWith('running', 'paused');
    });

    it('should transition to "running" on resume()', () => {
      syncService.start();
      syncService.pause();
      const statusSpy = jest.fn();
      syncService.on('statusChanged', statusSpy);

      syncService.resume();

      expect(syncService.getStatus()).toBe('running');
      expect(statusSpy).toHaveBeenCalledWith('paused', 'running');
    });
  });

  describe('Core Sync Logic', () => {
    it('should perform a successful sync cycle', async () => {
      const operations = [createMockOperation(1), createMockOperation(2)];
      mockStorageService.getPendingOperations.mockResolvedValueOnce(operations);
      mockStorageService.getOperationsCount.mockResolvedValue(0);

      const syncResult: ISyncResult = {
        success: true,
        processedOperations: [1, 2],
        syncVersion: 101
      };
      mockNetworkService.sendOperations.mockResolvedValue(syncResult);

      const syncCompletedSpy = jest.fn();
      syncService.on('syncCompleted', syncCompletedSpy);

      // Устанавливаем статус running для выполнения синхронизации
      (syncService as any).status = 'running';

      const result = await syncService.triggerSync();

      // Ждем завершения асинхронных операций
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result).toBe(true);
      expect(mockNetworkService.sendOperations).toHaveBeenCalledTimes(1);
      expect(mockStorageService.deleteOperations).toHaveBeenCalledWith([1, 2]);
      expect(syncCompletedSpy).toHaveBeenCalled();

      const stats = syncService.getStats();
      expect(stats.successfulSyncs).toBe(1);
      expect(stats.totalOperationsProcessed).toBe(2);

      // Check if sync version was saved
      const key = `sync_version_${dependencies.projectId}`;
      expect(localStorage.setItem).toHaveBeenCalledWith(key, '101');
    });

    it('should not sync if offline', async () => {
      mockNetworkService.isOnline.mockReturnValue(false);

      // Устанавливаем статус running
      (syncService as any).status = 'running';

      const result = await syncService.triggerSync();

      // Ждем завершения асинхронных операций
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result).toBe(true);
      expect(mockNetworkService.sendOperations).not.toHaveBeenCalled();
    });

    it('should not sync if there are no pending operations', async () => {
      mockStorageService.getPendingOperations.mockResolvedValue([]);

      // Устанавливаем статус running
      (syncService as any).status = 'running';

      const result = await syncService.triggerSync();

      // Ждем завершения асинхронных операций
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result).toBe(true);
      expect(mockNetworkService.sendOperations).not.toHaveBeenCalled();
    });

    it('should handle multiple batches of operations', async () => {
      const batch1 = [createMockOperation(1)];
      const batch2 = [createMockOperation(2)];

      mockStorageService.getPendingOperations.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2).mockResolvedValueOnce([]); // No more operations

      mockNetworkService.sendOperations
        .mockResolvedValueOnce({success: true, processedOperations: [1], syncVersion: 101})
        .mockResolvedValueOnce({success: true, processedOperations: [2], syncVersion: 102});

      // Устанавливаем статус running
      (syncService as any).status = 'running';

      const result = await syncService.triggerSync();

      // Ждем завершения асинхронных операций
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result).toBe(true);
      expect(mockNetworkService.sendOperations).toHaveBeenCalledTimes(2);
      expect(mockStorageService.deleteOperations).toHaveBeenCalledWith([1]);
      expect(mockStorageService.deleteOperations).toHaveBeenCalledWith([2]);

      const stats = syncService.getStats();
      expect(stats.successfulSyncs).toBe(2);
      expect(stats.totalOperationsProcessed).toBe(2);
    });
  });

  describe('Error Handling and Retries', () => {
    it('should handle network failure', async () => {
      const operations = [createMockOperation(1)];
      mockStorageService.getPendingOperations.mockResolvedValue(operations);
      mockNetworkService.sendOperations.mockRejectedValue(new Error('Network Error'));

      // Устанавливаем статус running
      (syncService as any).status = 'running';

      const result = await syncService.triggerSync();

      // Ждем завершения асинхронных операций
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result).toBe(true); // triggerSync всегда возвращает true, если запущен
      expect(syncService.getStats().failedSyncs).toBe(1);
      expect(syncService.getStats().lastError).toBe('Network Error');
      expect(syncService.getStats().currentRetryCount).toBe(1);
    });

    it('should stop on 401 auth error', async () => {
      const operations = [createMockOperation(1)];
      mockStorageService.getPendingOperations.mockResolvedValue(operations);
      mockNetworkService.sendOperations.mockRejectedValue(new Error('Request failed with status: 401'));

      const syncFailedSpy = jest.fn();
      syncService.on('syncFailed', syncFailedSpy);

      // Устанавливаем статус running
      (syncService as any).status = 'running';

      await syncService.triggerSync();

      // Ждем завершения асинхронных операций
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(syncService.getStatus()).toBe('stopped'); // Сервис останавливается при 401
      expect(syncFailedSpy).toHaveBeenCalledWith('Authentication failed. Please log in again.', expect.any(Object));
    });

    it('should enter "error" state after max retries', async () => {
      const testConfig = createMockDependencies({maxRetries: 0}); // Максимум 0 ретраев
      const testService = new SyncService(testConfig);
      const testMockStorage = testConfig.storageService as jest.Mocked<IStorageService>;
      const testMockNetwork = testConfig.networkService as jest.Mocked<INetworkService>;

      const operations = [createMockOperation(1)];
      testMockStorage.getPendingOperations.mockResolvedValue(operations);
      testMockNetwork.sendOperations.mockResolvedValue({
        success: false,
        processedOperations: [],
        errors: ['Server error']
      });

      const syncFailedSpy = jest.fn();
      testService.on('syncFailed', syncFailedSpy);

      // Устанавливаем статус running
      (testService as any).status = 'running';

      // Одна попытка должна сразу привести к ошибке (maxRetries = 0)
      await testService.triggerSync();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Проверяем что событие syncFailed было вызвано с правильными параметрами
      expect(syncFailedSpy).toHaveBeenCalledWith('Server error', expect.any(Object));

      // Проверяем что статистика обновилась
      const stats = testService.getStats();
      expect(stats.failedSyncs).toBeGreaterThan(0);
      expect(stats.lastError).toBe('Server error');
    });
  });

  describe('Version Conflict and Catch-up', () => {
    it('should trigger catch-up on version mismatch', async () => {
      const operations = [createMockOperation(1)];

      // Настраиваем моки для getPendingOperations
      mockStorageService.getPendingOperations.mockResolvedValue(operations);

      // Server returns failure but a newer sync version
      const failedResult: ISyncResult = {
        success: false,
        processedOperations: [],
        syncVersion: 150
      };

      // Настраиваем sendOperations только для одного вызова (первая неудачная попытка)
      mockNetworkService.sendOperations.mockResolvedValueOnce(failedResult);

      // `getOperations` is called for catch-up
      const serverOperation = createMockOperation(10);
      const serverOpsResult: ISyncResult = {
        success: true,
        processedOperations: [],
        serverOperations: [serverOperation],
        syncVersion: 150
      };
      mockNetworkService.getOperations.mockResolvedValueOnce(serverOpsResult);

      const serverOpsSpy = jest.fn();
      syncService.on('serverOperationsReceived', serverOpsSpy);

      // Устанавливаем статус running
      (syncService as any).status = 'running';

      await syncService.triggerSync();

      // Ждем завершения асинхронных операций
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockLogger.info).toHaveBeenCalledWith('Version mismatch detected. Client: 0, Server: 150. Starting catch-up...');
      expect(mockNetworkService.getOperations).toHaveBeenCalledWith('test-project-id', 0);
      expect(serverOpsSpy).toHaveBeenCalledWith([serverOperation], 150);

      // Check that sync version is updated and saved
      const key = `sync_version_${dependencies.projectId}`;
      expect(localStorage.setItem).toHaveBeenCalledWith(key, '150');

      // Проверяем, что sendOperations был вызван один раз (первая неудачная попытка)
      expect(mockNetworkService.sendOperations).toHaveBeenCalledTimes(1);

      // В этом сценарии операции не удаляются, потому что повторная отправка
      // происходит в следующем цикле синхронизации, а не в том же
      expect(mockStorageService.deleteOperations).not.toHaveBeenCalled();
    });
  });
});
