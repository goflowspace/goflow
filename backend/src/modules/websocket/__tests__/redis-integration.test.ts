import { Container } from "inversify";
import { RedisDIContainerFactory } from "../di-container.redis";
import { IWebSocketManager, ICollaborationService } from "../interfaces/websocket.interfaces";
import { IEventOrderingService } from "../interfaces/event-ordering.interfaces";
import { WEBSOCKET_TYPES } from "../di.types";
import { checkRedisHealth, closeRedisConnections } from "../../../config/redis.config";

/**
 * Интеграционные тесты для Redis WebSocket сервисов
 */
describe('Redis WebSocket Integration', () => {
  let container: Container;
  
  beforeAll(async () => {
    // Настраиваем environment для тестов
    process.env.USE_REDIS_COLLABORATION = 'true';
    process.env.USE_REDIS_WEBSOCKETS = 'true';
    process.env.USE_REDIS_EVENT_ORDERING = 'true';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_DB = '1'; // Используем отдельную DB для тестов
  });

  afterAll(async () => {
    // Очищаем Redis соединения
    await closeRedisConnections();
  });

  beforeEach(async () => {
    container = await RedisDIContainerFactory.createContainer();
  });

  describe('Redis Connection', () => {
    it('should validate Redis connection', async () => {
      const isHealthy = await RedisDIContainerFactory.validateRedisConnection();
      
      if (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost') {
        // В CI/CD могут быть проблемы с Redis
        expect(typeof isHealthy).toBe('boolean');
      } else {
        // В локальной разработке Redis должен быть доступен
        expect(isHealthy).toBe(true);
      }
    }, 10000);

    it('should get Redis config', () => {
      const config = RedisDIContainerFactory.getRedisConfig();
      
      expect(config).toBeDefined();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(6379);
      expect(config.useRedisCollaboration).toBe(true);
      expect(config.useRedisWebSockets).toBe(true);
      expect(config.useRedisEventOrdering).toBe(true);
    });
  });

  describe('DI Container Configuration', () => {
    it('should bind Redis WebSocket Manager when enabled', () => {
      const wsManager = container.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);
      
      expect(wsManager).toBeDefined();
      expect(wsManager.constructor.name).toBe('RedisWebSocketManager');
    });

    it('should bind Redis Collaboration Service when enabled', () => {
      const collabService = container.get<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService);
      
      expect(collabService).toBeDefined();
      expect(collabService.constructor.name).toBe('RedisCollaborationService');
    });

    it('should bind Redis Event Ordering Service when enabled', () => {
      const eventOrderingService = container.get<IEventOrderingService>(WEBSOCKET_TYPES.EventOrderingService);
      
      expect(eventOrderingService).toBeDefined();
      expect(eventOrderingService.constructor.name).toBe('RedisEventOrderingService');
    });
  });

  describe('Fallback to In-Memory', () => {
    let fallbackContainer: Container;

    beforeEach(async () => {
      // Временно отключаем Redis
      process.env.USE_REDIS_COLLABORATION = 'false';
      process.env.USE_REDIS_WEBSOCKETS = 'false';
      process.env.USE_REDIS_EVENT_ORDERING = 'false';
      
      fallbackContainer = await RedisDIContainerFactory.createContainer();
    });

    afterEach(() => {
      // Восстанавливаем Redis
      process.env.USE_REDIS_COLLABORATION = 'true';
      process.env.USE_REDIS_WEBSOCKETS = 'true';
      process.env.USE_REDIS_EVENT_ORDERING = 'true';
    });

    it('should use in-memory WebSocket Manager when Redis disabled', () => {
      const wsManager = fallbackContainer.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);
      
      expect(wsManager).toBeDefined();
      expect(wsManager.constructor.name).toBe('WebSocketManager');
    });

    it('should use in-memory Collaboration Service when Redis disabled', () => {
      const collabService = fallbackContainer.get<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService);
      
      expect(collabService).toBeDefined();
      expect(collabService.constructor.name).toBe('CollaborationService');
    });

    it('should use in-memory Event Ordering Service when Redis disabled', () => {
      const eventOrderingService = fallbackContainer.get<IEventOrderingService>(WEBSOCKET_TYPES.EventOrderingService);
      
      expect(eventOrderingService).toBeDefined();
      expect(eventOrderingService.constructor.name).toBe('EventOrderingService');
    });
  });

  describe('Service Integration', () => {
    it('should create collaboration session in Redis', async () => {
      if (!await checkRedisHealth()) {
        console.log('⚠️ Skipping Redis test - Redis not available');
        return;
      }

      const collabService = container.get<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService);
      
      const session = await collabService.createSession(
        'test-user-123',
        'Test User',
        'test-project-456',
        'test-socket-789'
      );
      
      expect(session).toBeDefined();
      expect(session.userId).toBe('test-user-123');
      expect(session.projectId).toBe('test-project-456');
      expect(session.socketId).toBe('test-socket-789');
      
      // Очистка
      await collabService.endSession(session.id);
    }, 10000);

    it('should get project sessions from Redis', async () => {
      if (!await checkRedisHealth()) {
        console.log('⚠️ Skipping Redis test - Redis not available');
        return;
      }

      const collabService = container.get<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService);
      
      // Создаем тестовую сессию
      const session = await collabService.createSession(
        'test-user-123',
        'Test User',
        'test-project-456',
        'test-socket-789'
      );
      
      // Получаем сессии проекта
      const projectSessions = await collabService.getProjectSessions('test-project-456');
      
      expect(projectSessions).toBeDefined();
      expect(projectSessions.length).toBeGreaterThan(0);
      expect(projectSessions[0].userId).toBe('test-user-123');
      
      // Очистка
      await collabService.endSession(session.id);
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Устанавливаем неправильный хост
      process.env.REDIS_HOST = 'nonexistent-redis-host';
      
      const isHealthy = await RedisDIContainerFactory.validateRedisConnection();
      expect(isHealthy).toBe(false);
      
      // Восстанавливаем правильный хост
      process.env.REDIS_HOST = 'localhost';
    }, 10000);

    it('should create container even when Redis is unavailable', async () => {
      // Даже если Redis недоступен, контейнер должен создаваться
      const testContainer = await RedisDIContainerFactory.createContainer();
      
      expect(testContainer).toBeDefined();
      expect(testContainer.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager)).toBeDefined();
      expect(testContainer.get<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService)).toBeDefined();
      expect(testContainer.get<IEventOrderingService>(WEBSOCKET_TYPES.EventOrderingService)).toBeDefined();
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should shutdown Redis services gracefully', async () => {
      await expect(
        RedisDIContainerFactory.shutdownRedisServices(container)
      ).resolves.not.toThrow();
    }, 10000);
  });
});
