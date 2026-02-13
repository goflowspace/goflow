import { Container } from "inversify";
import { IWebSocketManager, ICollaborationService } from "./interfaces/websocket.interfaces";
import { IEventOrderingService } from "./interfaces/event-ordering.interfaces";
import { WEBSOCKET_TYPES } from "./di.types";
import { env } from "@config/env";
import { logger } from "@config/logger";

// Sync types and interfaces
import { TYPES as SYNC_TYPES } from "../sync/di.types";
import { ISyncRepository, ISyncService, ISyncController } from "../sync/interfaces/sync.interfaces";

// Redis implementations
import { RedisWebSocketManager } from "./websocket.manager.redis";
import { RedisCollaborationService } from "./collaboration.service.redis";
import { RedisEventOrderingService } from "./services/event-ordering.service.redis";

// In-memory implementations (fallback)
import { WebSocketManager } from "./websocket.manager.inversify";
import { CollaborationService } from "./collaboration.service.inversify";
import { EventOrderingService } from "./services/event-ordering.service";
import { OperationEventHandler } from "./event-handlers/operation.handler";
import { AwarenessEventHandler } from "./event-handlers/awareness.handler";
import { PresenceService, IPresenceService } from "./services/presence.service";
import { RedisPresenceService } from "./services/presence.service.redis";
import { checkRedisHealth, closeRedisConnections } from "../../config/redis.config";
import { WebSocketController } from "./websocket.controller.inversify";

// Sync implementations
import { SyncRepository } from "../sync/sync.repository";
import { SyncService } from "../sync/sync.service";
import { SyncController } from "../sync/sync.controller.inversify";

// AI Event Handler
import { AIEventHandler } from "./event-handlers/ai.handler";

/**
 * Redis DI Container Factory
 * Выбирает между Redis и in-memory реализациями на основе feature flags
 * 
 * Принципы SOLID:
 * - Single Responsibility: только конфигурация DI
 * - Open/Closed: легко добавить новые implementations
 * - Dependency Inversion: использует абстракции
 */
export class RedisDIContainerFactory {
  
  /**
   * Создает контейнер с правильными реализациями
   */
  static async createContainer(): Promise<Container> {
    const container = new Container();
    
    logger.info('🔧 [RedisDI] Configuring WebSocket services...', {
      useRedisCollaboration: env.USE_REDIS_COLLABORATION,
      useRedisWebSockets: env.USE_REDIS_WEBSOCKETS,
      useRedisEventOrdering: env.USE_REDIS_EVENT_ORDERING
    });

    // === WebSocket Manager ===
    if (env.USE_REDIS_WEBSOCKETS) {
      logger.info('✅ [RedisDI] Using Redis WebSocket Manager');
      container.bind<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager)
        .to(RedisWebSocketManager)
        .inSingletonScope();
    } else {
      logger.info('📝 [RedisDI] Using in-memory WebSocket Manager');
      container.bind<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager)
        .to(WebSocketManager)
        .inSingletonScope();
    }

    // === Collaboration Service ===
    if (env.USE_REDIS_COLLABORATION) {
      logger.info('✅ [RedisDI] Using Redis Collaboration Service');
      container.bind<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService)
        .to(RedisCollaborationService)
        .inSingletonScope();
    } else {
      logger.info('📝 [RedisDI] Using in-memory Collaboration Service');
      container.bind<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService)
        .to(CollaborationService)
        .inSingletonScope();
    }

    // === Event Ordering Service ===
    if (env.USE_REDIS_EVENT_ORDERING) {
      logger.info('✅ [RedisDI] Using Redis Event Ordering Service');
      container.bind<IEventOrderingService>(WEBSOCKET_TYPES.EventOrderingService)
        .to(RedisEventOrderingService)
        .inSingletonScope();
    } else {
      logger.info('📝 [RedisDI] Using in-memory Event Ordering Service');
      container.bind<IEventOrderingService>(WEBSOCKET_TYPES.EventOrderingService)
        .to(EventOrderingService)
        .inSingletonScope();
    }

    // === WebSocket Controller ===
    container.bind(WEBSOCKET_TYPES.WebSocketController).to(WebSocketController);

    // === Sync Services (обязательны для EventOrderingService) ===
    await this.bindSyncServices(container);

    // === Event Handlers (остаются без изменений) ===
    await this.bindEventHandlers(container);

    // === Other Services ===
    await this.bindOtherServices(container, env.USE_REDIS_WEBSOCKETS);

    logger.info('🎯 [RedisDI] WebSocket DI container configured successfully');
    
    return container;
  }

  /**
   * Привязка Sync сервисов (требуются для EventOrderingService)
   */
  private static async bindSyncServices(container: Container): Promise<void> {
    container.bind<ISyncRepository>(SYNC_TYPES.SyncRepository).to(SyncRepository).inSingletonScope();
    container.bind<ISyncService>(SYNC_TYPES.SyncService).to(SyncService).inSingletonScope();
    container.bind<ISyncController>(SYNC_TYPES.SyncController).to(SyncController).inSingletonScope();
    
    logger.debug('✅ [RedisDI] Sync services bound successfully');
  }

  /**
   * Привязка обработчиков событий (не зависят от Redis)
   */
  private static async bindEventHandlers(container: Container): Promise<void> {
    // Используем динамические импорты для избежания circular dependencies    
    container.bind(WEBSOCKET_TYPES.OperationEventHandler).to(OperationEventHandler);
    container.bind(WEBSOCKET_TYPES.AwarenessEventHandler).to(AwarenessEventHandler);
    container.bind(WEBSOCKET_TYPES.AIEventHandler).to(AIEventHandler);
    
    logger.debug('✅ [RedisDI] Event handlers bound successfully');
  }

  /**
   * Привязка других сервисов (Presence, etc.)
   */
  private static async bindOtherServices(container: Container, useRedis: boolean): Promise<void> {
    // Используем динамические импорты для избежания circular dependencies
    
    // Presence Service - выбираем Redis или in-memory версию
    if (useRedis) {
      container.bind<IPresenceService>(WEBSOCKET_TYPES.PresenceService).to(RedisPresenceService).inSingletonScope();
    } else {
      container.bind<IPresenceService>(WEBSOCKET_TYPES.PresenceService).to(PresenceService).inSingletonScope();
    }
    
    logger.debug(`✅ [RedisDI] Presence service bound (Redis: ${useRedis})`);
  }

  /**
   * Получение конфигурации Redis
   */
  static getRedisConfig() {
    return {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
      sessionTTL: env.REDIS_SESSION_TTL,
      maxRetries: env.REDIS_MAX_RETRIES,
      retryDelay: env.REDIS_RETRY_DELAY,
      
      // Feature flags
      useRedisCollaboration: env.USE_REDIS_COLLABORATION,
      useRedisWebSockets: env.USE_REDIS_WEBSOCKETS,
      useRedisEventOrdering: env.USE_REDIS_EVENT_ORDERING,
    };
  }

  /**
   * Проверка доступности Redis
   */
  static async validateRedisConnection(): Promise<boolean> {
    if (!env.USE_REDIS_COLLABORATION && !env.USE_REDIS_WEBSOCKETS && !env.USE_REDIS_EVENT_ORDERING) {
      logger.info('🔧 [RedisDI] Redis features disabled, skipping validation');
      return true;
    }

    try {
      const isHealthy = await checkRedisHealth();
      
      if (isHealthy) {
        logger.info('✅ [RedisDI] Redis connection validated successfully');
        return true;
      } else {
        logger.error('❌ [RedisDI] Redis health check failed');
        return false;
      }
    } catch (error) {
      logger.error('❌ [RedisDI] Error validating Redis connection:', error);
      return false;
    }
  }

  /**
   * Graceful shutdown всех Redis сервисов
   */
  static async shutdownRedisServices(container: Container): Promise<void> {
    try {
      logger.info('🔄 [RedisDI] Shutting down Redis services...');

      // Shutdown WebSocket Manager
      if (env.USE_REDIS_WEBSOCKETS) {
        const wsManager = container.get<RedisWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);
        if (wsManager && typeof (wsManager as any).shutdown === 'function') {
          await (wsManager as any).shutdown();
        }
      }

      // Shutdown Collaboration Service
      if (env.USE_REDIS_COLLABORATION) {
        const collabService = container.get<RedisCollaborationService>(WEBSOCKET_TYPES.CollaborationService);
        if (collabService && typeof (collabService as any).shutdown === 'function') {
          await (collabService as any).shutdown();
        }
      }

      // Shutdown Event Ordering Service
      if (env.USE_REDIS_EVENT_ORDERING) {
        const eventOrderingService = container.get<RedisEventOrderingService>(WEBSOCKET_TYPES.EventOrderingService);
        if (eventOrderingService && typeof (eventOrderingService as any).shutdown === 'function') {
          await (eventOrderingService as any).shutdown();
        }
      }

      // Close Redis connections
      await closeRedisConnections();

      logger.info('✅ [RedisDI] Redis services shutdown completed');
    } catch (error) {
      logger.error('❌ [RedisDI] Error during Redis services shutdown:', error);
    }
  }
}

/**
 * Singleton instance
 */
let redisContainer: Container | null = null;

/**
 * Получить настроенный Redis DI контейнер
 */
export async function getRedisWebSocketContainer(): Promise<Container> {
  if (!redisContainer) {
    redisContainer = await RedisDIContainerFactory.createContainer();
  }
  return redisContainer;
}

/**
 * Сброс контейнера (для тестов)
 */
export function resetRedisWebSocketContainer(): void {
  redisContainer = null;
}
