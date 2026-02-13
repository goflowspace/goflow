import { Container } from "inversify";
import { Server as HTTPServer } from "http";
import { logger } from "@config/logger";
import { RedisDIContainerFactory, getRedisWebSocketContainer } from "./di-container.redis";
import { IWebSocketManager } from "./interfaces/websocket.interfaces";
import { WebSocketController } from "./websocket.controller.inversify";
import { WEBSOCKET_TYPES } from "./di.types";

/**
 * Redis WebSocket System
 * Высокоуровневая система для управления WebSocket с Redis масштабированием
 * 
 * Принципы SOLID:
 * - Single Responsibility: инициализация и управление Redis WebSocket системой
 * - Dependency Inversion: использует DI контейнер для создания сервисов
 * - Singleton: единственный инстанс системы
 */
export class RedisWebSocketSystem {
  private static instance: RedisWebSocketSystem | null = null;
  private container: Container | null = null;
  private wsController: WebSocketController | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * Получить единственный инстанс системы
   */
  static getInstance(): RedisWebSocketSystem {
    if (!this.instance) {
      this.instance = new RedisWebSocketSystem();
    }
    return this.instance;
  }

  /**
   * Инициализация Redis WebSocket системы
   */
  async initializeWebSocket(httpServer: HTTPServer): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Redis WebSocket system already initialized');
      return;
    }

    try {
      console.log('🚀 [RedisWebSocketSystem] Initializing Redis WebSocket system...');

      // Проверяем доступность Redis
      const redisAvailable = await RedisDIContainerFactory.validateRedisConnection();
      if (!redisAvailable) {
        throw new Error('Redis connection validation failed');
      }

      // Создаем Redis DI контейнер
      this.container = await getRedisWebSocketContainer();
      
      // Получаем WebSocket Manager из контейнера
      const wsManager = this.container.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);
      
      // Инициализируем WebSocket Manager
      wsManager.initialize(httpServer);
      
      // Создаем WebSocket Controller из контейнера
      this.wsController = this.container.get<WebSocketController>(WEBSOCKET_TYPES.WebSocketController);
      
      // Настраиваем обработчики подключений
      this.wsController.setupConnectionHandlers();
      
      this.isInitialized = true;
      
      console.log('✅ [RedisWebSocketSystem] Redis WebSocket system initialized successfully');
      logger.info('Redis WebSocket system ready for connections');
      
    } catch (error) {
      console.error('❌ [RedisWebSocketSystem] Failed to initialize Redis WebSocket system:', error);
      logger.error('Redis WebSocket system initialization failed:', error);
      throw error;
    }
  }

  /**
   * Получить DI контейнер
   */
  getContainer(): Container {
    if (!this.container) {
      throw new Error('Redis WebSocket system not initialized');
    }
    return this.container;
  }

  /**
   * Получить WebSocket Manager
   */
  getWebSocketManager(): IWebSocketManager {
    if (!this.container) {
      throw new Error('Redis WebSocket system not initialized');
    }
    return this.container.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);
  }

  /**
   * Проверка статуса инициализации
   */
  isReady(): boolean {
    return this.isInitialized && this.container !== null;
  }

  /**
   * Получение статистики Redis WebSocket системы
   */
  async getStats(): Promise<any> {
    if (!this.isReady()) {
      return { error: 'Redis WebSocket system not initialized' };
    }

    try {
      const redisConfig = RedisDIContainerFactory.getRedisConfig();
      const redisAvailable = await RedisDIContainerFactory.validateRedisConnection();
      
      return {
        initialized: this.isInitialized,
        redisAvailable,
        redisConfig: {
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db,
          useRedisCollaboration: redisConfig.useRedisCollaboration,
          useRedisWebSockets: redisConfig.useRedisWebSockets,
          useRedisEventOrdering: redisConfig.useRedisEventOrdering
        },
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error getting Redis WebSocket system stats:', error);
      return { error: 'Failed to get stats' };
    }
  }

  /**
   * Graceful shutdown Redis WebSocket системы
   */
  async dispose(): Promise<void> {
    try {
      console.log('🔄 [RedisWebSocketSystem] Shutting down Redis WebSocket system...');

      // Останавливаем WebSocket Controller
      if (this.wsController) {
        this.wsController.stopCleanupJob();
        this.wsController = null;
      }

      // Shutdown Redis сервисов
      if (this.container) {
        await RedisDIContainerFactory.shutdownRedisServices(this.container);
        this.container = null;
      }

      this.isInitialized = false;
      
      console.log('✅ [RedisWebSocketSystem] Redis WebSocket system shutdown completed');
      logger.info('Redis WebSocket system disposed');
      
    } catch (error) {
      console.error('❌ [RedisWebSocketSystem] Error during shutdown:', error);
      logger.error('Error disposing Redis WebSocket system:', error);
      throw error;
    }
  }

  /**
   * Перезапуск системы (для recovery)
   */
  async restart(httpServer: HTTPServer): Promise<void> {
    try {
      console.log('🔄 [RedisWebSocketSystem] Restarting Redis WebSocket system...');
      
      await this.dispose();
      await this.initializeWebSocket(httpServer);
      
      console.log('✅ [RedisWebSocketSystem] Redis WebSocket system restarted successfully');
      
    } catch (error) {
      console.error('❌ [RedisWebSocketSystem] Failed to restart Redis WebSocket system:', error);
      logger.error('Redis WebSocket system restart failed:', error);
      throw error;
    }
  }

  /**
   * Health check Redis WebSocket системы
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      if (!this.isReady()) {
        return { 
          healthy: false, 
          details: { error: 'System not initialized' } 
        };
      }

      const redisHealthy = await RedisDIContainerFactory.validateRedisConnection();
      
      return {
        healthy: redisHealthy,
        details: {
          initialized: this.isInitialized,
          redisConnected: redisHealthy,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      logger.error('Redis WebSocket system health check failed:', error);
      return { 
        healthy: false, 
        details: { error: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }
}
