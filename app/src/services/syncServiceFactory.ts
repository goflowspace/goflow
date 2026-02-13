import {HybridNetworkService, HybridNetworkServiceFactory} from './implementations/hybridNetworkService';
import {ConsoleLoggerImpl} from './implementations/loggerImpl';
import {NetworkServiceImpl} from './implementations/networkServiceImpl';
import {StorageServiceImpl} from './implementations/storageServiceImpl';
import {INetworkService, ISyncConfig, ISyncService, ISyncServiceDependencies} from './interfaces/syncInterfaces';
import {DEFAULT_SYNC_CONFIG, SyncService} from './syncService';

/**
 * Фабрика для создания SyncService
 * Инкапсулирует создание и настройку всех зависимостей
 *
 * Принципы:
 * - Single Responsibility: только создание и настройка SyncService
 * - Dependency Inversion: создает абстракции, а не конкретные реализации
 * - Factory Pattern: скрывает сложность создания объекта
 * - Open/Closed: расширен для поддержки WebSocket без изменения старого API
 */
export class SyncServiceFactory {
  /**
   * Создает полностью настроенный SyncService с REST
   * @param projectId ID проекта для синхронизации
   * @param config Конфигурация сервиса (опционально)
   * @returns Готовый к использованию SyncService
   */
  static create(projectId: string, config: Partial<ISyncConfig> = {}): ISyncService {
    return this.createWithNetworkService(projectId, new NetworkServiceImpl(), config);
  }

  /**
   * Создает SyncService с WebSocket поддержкой (гибридный режим)
   * НОВЫЙ МЕТОД для поддержки WebSocket
   *
   * @param projectId ID проекта для синхронизации
   * @param webSocketContext WebSocket контекст из useWebSocket()
   * @param config Конфигурация сервиса (опционально)
   * @param userId ID пользователя для правильной аутентификации
   * @returns SyncService с WebSocket + REST fallback
   */
  static createWithWebSocket(projectId: string, webSocketContext?: any, config: Partial<ISyncConfig> = {}, userId?: string): ISyncService {
    // Создаем оптимизированную конфигурацию для WebSocket
    const wsOptimizedConfig: Partial<ISyncConfig> = {
      syncIntervalMs: 60000, // 🚀 ИСПРАВЛЕНИЕ: Редкий polling в WebSocket режиме (только для cleanup)
      batchSize: 1, // Маленькие батчи для лучшей отзывчивости
      maxRetries: 3, // Меньше retry т.к. WebSocket быстрый
      retryDelayMs: 200, // Быстрые retry
      backoffMultiplier: 1.5,
      ...config // Пользовательские настройки приоритетнее
    };

    // Создаем гибридный network service (пока без callback)
    const hybridNetworkService = HybridNetworkServiceFactory.create(webSocketContext, userId);

    // Создаем SyncService
    const syncService = this.createWithNetworkService(projectId, hybridNetworkService, wsOptimizedConfig);

    // 🚀 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Устанавливаем callback ПОСЛЕ создания SyncService
    if (webSocketContext?.socket && hybridNetworkService) {
      const serverOperationCallback = (operations: any[]) => {
        console.log('🔄 [SyncServiceFactory] Received operations from other users:', {
          operationCount: operations.length,
          operationTypes: operations.map((op) => op.type),
          projectId
        });

        // Эмитим событие для SyncService чтобы он применил операции
        (syncService as any).emit('serverOperationsReceived', operations, operations[0]?.version);
      };

      // Получаем WebSocket сервис из Hybrid и устанавливаем callback
      const wsService = (hybridNetworkService as any).wsService;
      if (wsService && typeof wsService.setOnServerOperationCallback === 'function') {
        wsService.setOnServerOperationCallback(serverOperationCallback);
        console.log('✅ [SyncServiceFactory] Set up real-time operation callback for project:', projectId);
      }
    }

    return syncService;
  }

  /**
   * Универсальный метод создания SyncService с любым NetworkService
   * DRY принцип: общая логика создания
   *
   * @param projectId ID проекта
   * @param networkService Сервис для сетевых операций
   * @param config Конфигурация
   * @returns Настроенный SyncService
   */
  static createWithNetworkService(projectId: string, networkService: INetworkService, config: Partial<ISyncConfig> = {}): ISyncService {
    // Проверяем обязательные параметры
    if (!projectId || projectId.trim() === '') {
      throw new Error('ProjectId is required for SyncService');
    }

    // Генерируем уникальный deviceId для этого устройства
    const deviceId = this.getOrCreateDeviceId();

    // Объединяем конфигурацию с значениями по умолчанию
    const finalConfig: ISyncConfig = {
      ...DEFAULT_SYNC_CONFIG,
      ...config
    };

    // Создаем зависимости
    const dependencies: ISyncServiceDependencies = {
      storageService: new StorageServiceImpl(projectId),
      networkService: networkService, // 👈 Инжектируем любой NetworkService
      logger: new ConsoleLoggerImpl(`[SyncService:${projectId}]`),
      config: finalConfig,
      projectId,
      deviceId
    };

    // Создаем и возвращаем сервис
    return new SyncService(dependencies);
  }

  /**
   * Создает SyncService с кастомными зависимостями
   * Полезно для тестирования или специальных случаев
   * @param dependencies Зависимости для инъекции
   * @returns SyncService с переданными зависимостями
   */
  static createWithDependencies(dependencies: ISyncServiceDependencies): ISyncService {
    return new SyncService(dependencies);
  }

  /**
   * Получает или создает уникальный deviceId для этого устройства
   * @returns Уникальный ID устройства
   */
  private static getOrCreateDeviceId(): string {
    const DEVICE_ID_KEY = 'flow_device_id';

    // Пытаемся получить существующий ID
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Создаем новый ID если его нет
      deviceId = this.generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  }

  /**
   * Генерирует уникальный ID устройства
   * @returns Уникальный ID устройства
   */
  private static generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const browserInfo = this.getBrowserFingerprint();

    return `device_${timestamp}_${randomPart}_${browserInfo}`;
  }

  /**
   * Создает упрощенный отпечаток браузера для уникальности
   * @returns Строка с информацией о браузере
   */
  private static getBrowserFingerprint(): string {
    const nav = navigator;
    const screen = window.screen;

    const info = [
      nav.userAgent.slice(0, 50), // Первые 50 символов user agent
      screen.width,
      screen.height,
      nav.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|');

    // Простой хеш для компактности
    let hash = 0;
    for (let i = 0; i < info.length; i++) {
      const char = info.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Конвертируем в 32-битное число
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Создает конфигурацию для тестирования с более частой синхронизацией
   * @returns Конфигурация для тестирования
   */
  static createTestConfig(): ISyncConfig {
    return {
      batchSize: 10,
      syncIntervalMs: 1000, // Синхронизация каждую секунду
      maxRetries: 2,
      retryDelayMs: 500, // Быстрые повторы
      backoffMultiplier: 1.5
    };
  }

  /**
   * Создает конфигурацию для продакшена с оптимизированными настройками
   * @returns Конфигурация для продакшена
   */
  static createProductionConfig(): ISyncConfig {
    return {
      batchSize: 100,
      syncIntervalMs: 10000, // Синхронизация каждые 10 секунд
      maxRetries: 5,
      retryDelayMs: 3000, // Более длительные задержки
      backoffMultiplier: 2
    };
  }
}

/**
 * Глобальный реестр SyncService экземпляров
 * Позволяет избежать создания множественных экземпляров для одного проекта
 */
export class SyncServiceRegistry {
  private static instances = new Map<string, ISyncService>();

  /**
   * Получает или создает SyncService для проекта (REST версия)
   * @param projectId ID проекта
   * @param config Конфигурация (используется только при создании)
   * @returns Экземпляр SyncService для проекта
   */
  static getOrCreate(projectId: string, config?: Partial<ISyncConfig>): ISyncService {
    let instance = this.instances.get(projectId);

    if (!instance) {
      instance = SyncServiceFactory.create(projectId, config);
      this.instances.set(projectId, instance);
    }

    return instance;
  }

  /**
   * Получает или создает SyncService с WebSocket поддержкой
   * НОВЫЙ МЕТОД для WebSocket integration
   *
   * @param projectId ID проекта
   * @param webSocketContext WebSocket контекст
   * @param config Конфигурация (используется только при создании)
   * @returns Экземпляр SyncService с WebSocket поддержкой
   */
  static getOrCreateWithWebSocket(projectId: string, webSocketContext?: any, config?: Partial<ISyncConfig>, userId?: string): ISyncService {
    const wsKey = `${projectId}_ws`; // Отдельный key для WS версии
    let instance = this.instances.get(wsKey);

    if (!instance) {
      instance = SyncServiceFactory.createWithWebSocket(projectId, webSocketContext, config, userId);
      this.instances.set(wsKey, instance);
    } else {
      // Обновляем WebSocket контекст если изменился
      const networkService = (instance as any).dependencies?.networkService;
      if (networkService && typeof networkService.setWebSocketService === 'function') {
        // Создаем новый WS сервис если есть сокет
        if (webSocketContext?.socket) {
          // Используем динамический импорт для избежания циклических зависимостей
          import('./implementations/networkServiceWSImpl').then(({NetworkServiceWSImpl}) => {
            const wsService = new NetworkServiceWSImpl(webSocketContext.socket, userId);

            // 🚀 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Устанавливаем callback для операций от других пользователей
            const serverOperationCallback = (operations: any[]) => {
              console.log('🔄 [SyncServiceRegistry] Received operations from other users (existing instance):', {
                operationCount: operations.length,
                operationTypes: operations.map((op) => op.type),
                projectId
              });

              // Эмитим событие для SyncService
              (instance as any).emit('serverOperationsReceived', operations, operations[0]?.version);
            };

            wsService.setOnServerOperationCallback(serverOperationCallback);
            console.log('✅ [SyncServiceRegistry] Updated WebSocket service with new callback for project:', projectId);

            networkService.setWebSocketService(wsService);
          });
        } else {
          networkService.setWebSocketService(null);
        }
      }
    }

    return instance;
  }

  /**
   * Удаляет SyncService для проекта
   * @param projectId ID проекта
   */
  static remove(projectId: string): void {
    const instance = this.instances.get(projectId);
    if (instance) {
      instance.stop();
      this.instances.delete(projectId);
    }
  }

  /**
   * Останавливает и удаляет все SyncService экземпляры
   */
  static clear(): void {
    this.instances.forEach((instance, projectId) => {
      instance.stop();
    });
    this.instances.clear();
  }

  /**
   * Получает все активные экземпляры
   * @returns Массив всех активных SyncService
   */
  static getAll(): ISyncService[] {
    return Array.from(this.instances.values());
  }
}
