import { Redis } from 'ioredis';
import { getRedisClient, getRedisPubSubClient, REDIS_KEYS, REDIS_TTL } from '../config/redis.config';
import { logger } from '../config/logger';
import { CommentEvent, COMMENT_CHANNELS } from '../types/comments-events.types';

/**
 * Сервис для работы с Redis
 * 
 * Принципы SOLID:
 * - Single Responsibility: только Redis операции
 * - Open/Closed: легко расширяется для новых типов данных
 * - Dependency Inversion: абстракция над Redis клиентом
 */
export class RedisService {
  private readonly client: Redis;
  private readonly pubSubClient: Redis;

  constructor() {
    this.client = getRedisClient();
    this.pubSubClient = getRedisPubSubClient();
  }

  /**
   * Получить Redis client (для расширенных операций)
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * === SESSION MANAGEMENT ===
   */

  /**
   * Сохранить сессию коллаборации
   */
  async saveSession(sessionId: string, sessionData: any, ttl: number = REDIS_TTL.SESSION): Promise<void> {
    try {
      const key = `${REDIS_KEYS.SESSIONS}:${sessionId}`;
      
      // Сохраняем данные сессии (убеждаемся что числа правильно конвертированы)
      await this.client.hset(key, {
        'userId': sessionData.userId,
        'projectId': sessionData.projectId,
        'socketId': sessionData.socketId,
        'awareness': JSON.stringify(sessionData.awareness),
        'joinedAt': String(Number(sessionData.joinedAt)),
        'lastActivity': String(Number(sessionData.lastActivity))
      });
      
      // Устанавливаем TTL (убеждаемся что это число)
      await this.client.expire(key, Number(ttl));
      
      // Добавляем в индексы
      await Promise.all([
        this.client.sadd(`${REDIS_KEYS.USER_SESSIONS}:${sessionData.userId}`, sessionId),
        this.client.sadd(`${REDIS_KEYS.PROJECT_SESSIONS}:${sessionData.projectId}`, sessionId),
        
        // TTL для индексов тоже (убеждаемся что это числа)
        this.client.expire(`${REDIS_KEYS.USER_SESSIONS}:${sessionData.userId}`, Number(ttl)),
        this.client.expire(`${REDIS_KEYS.PROJECT_SESSIONS}:${sessionData.projectId}`, Number(ttl))
      ]);
      
      logger.debug(`📝 Session saved to Redis: ${sessionId}`);
    } catch (error) {
      logger.error('❌ Error saving session to Redis:', error);
      throw error;
    }
  }

  /**
   * Получить сессию коллаборации
   */
  async getSession(sessionId: string): Promise<any | null> {
    try {
      const key = `${REDIS_KEYS.SESSIONS}:${sessionId}`;
      const sessionData = await this.client.hgetall(key);
      
      if (!sessionData || Object.keys(sessionData).length === 0) {
        return null;
      }
      
      // Преобразуем обратно в объект
      return {
        id: sessionId,
        userId: sessionData.userId,
        projectId: sessionData.projectId,
        socketId: sessionData.socketId,
        awareness: JSON.parse(sessionData.awareness),
        joinedAt: Number(sessionData.joinedAt),
        lastActivity: Number(sessionData.lastActivity)
      };
    } catch (error) {
      logger.error('❌ Error getting session from Redis:', error);
      return null;
    }
  }

  /**
   * Удалить сессию коллаборации
   */
  async removeSession(sessionId: string): Promise<void> {
    try {
      // Сначала получаем данные сессии для очистки индексов
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) return;
      
      const key = `${REDIS_KEYS.SESSIONS}:${sessionId}`;
      
      // Удаляем сессию и очищаем индексы
      await Promise.all([
        this.client.del(key),
        this.client.srem(`${REDIS_KEYS.USER_SESSIONS}:${sessionData.userId}`, sessionId),
        this.client.srem(`${REDIS_KEYS.PROJECT_SESSIONS}:${sessionData.projectId}`, sessionId)
      ]);
      
      logger.debug(`🗑️ Session removed from Redis: ${sessionId}`);
    } catch (error) {
      logger.error('❌ Error removing session from Redis:', error);
      throw error;
    }
  }

  /**
   * Получить все сессии пользователя
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const sessionIds = await this.client.smembers(`${REDIS_KEYS.USER_SESSIONS}:${userId}`);
      return sessionIds;
    } catch (error) {
      logger.error('❌ Error getting user sessions from Redis:', error);
      return [];
    }
  }

  /**
   * Получить все сессии проекта
   */
  async getProjectSessions(projectId: string): Promise<string[]> {
    try {
      const sessionIds = await this.client.smembers(`${REDIS_KEYS.PROJECT_SESSIONS}:${projectId}`);
      return sessionIds;
    } catch (error) {
      logger.error('❌ Error getting project sessions from Redis:', error);
      return [];
    }
  }

  /**
   * === SOCKET MAPPING ===
   */

  /**
   * Создать mapping socketId -> sessionId
   */
  async setSocketSessionMapping(socketId: string, sessionId: string): Promise<void> {
    try {
      const key = `${REDIS_KEYS.SESSIONS}:socket_mapping:${socketId}`;
      await this.client.set(key, sessionId, 'EX', REDIS_TTL.SESSION);
      
      logger.debug(`🔗 Socket mapping created: ${socketId} -> ${sessionId}`);
    } catch (error) {
      logger.error('❌ Error creating socket mapping:', error);
      throw error;
    }
  }

  /**
   * Получить sessionId по socketId
   */
  async getSessionIdBySocket(socketId: string): Promise<string | null> {
    try {
      const key = `${REDIS_KEYS.SESSIONS}:socket_mapping:${socketId}`;
      const sessionId = await this.client.get(key);
      
      if (sessionId) {
        logger.debug(`🔍 Found session mapping: ${socketId} -> ${sessionId}`);
      }
      
      return sessionId;
    } catch (error) {
      logger.error('❌ Error getting session by socket ID:', error);
      return null;
    }
  }

  /**
   * Удалить mapping socketId -> sessionId
   */
  async removeSocketSessionMapping(socketId: string): Promise<void> {
    try {
      const key = `${REDIS_KEYS.SESSIONS}:socket_mapping:${socketId}`;
      await this.client.del(key);
      
      logger.debug(`❌ Socket mapping removed: ${socketId}`);
    } catch (error) {
      logger.error('❌ Error removing socket mapping:', error);
      throw error;
    }
  }

  /**
   * === PUB/SUB OPERATIONS ===
   */

  /**
   * Публиковать событие в канал проекта
   * Используем основной клиент для PUBLISH (pubSubClient только для SUBSCRIBE)
   */
  async publishToProject(projectId: string, event: any): Promise<void> {
    try {
      const channel = `${REDIS_KEYS.PROJECT_EVENTS}:${projectId}`;
      const message = JSON.stringify(event);
      
      // Используем основной клиент для PUBLISH, не pubSubClient
      await this.client.publish(channel, message);
      
      logger.debug(`📡 Published to project ${projectId}:`, event.type);
    } catch (error) {
      logger.error('❌ Error publishing to project channel:', error);
      throw error;
    }
  }

  /**
   * === COMMENTS PUB/SUB OPERATIONS ===
   */

  /**
   * Публиковать событие комментария в канал проекта
   */
  async publishCommentEvent(projectId: string, event: CommentEvent): Promise<void> {
    try {
      const channel = COMMENT_CHANNELS.PROJECT_COMMENTS(projectId);
      const message = JSON.stringify(event);
      
      await this.client.publish(channel, message);
      
      logger.debug(`💬 Published comment event to project ${projectId}:`, event.type);
    } catch (error) {
      logger.error('❌ Error publishing comment event:', error);
      throw error;
    }
  }

  /**
   * Публиковать событие комментария пользователю
   */
  async publishCommentEventToUser(userId: string, event: CommentEvent): Promise<void> {
    try {
      const channel = COMMENT_CHANNELS.USER_COMMENTS(userId);
      const message = JSON.stringify(event);
      
      await this.client.publish(channel, message);
      
      logger.debug(`👤 Published comment event to user ${userId}:`, event.type);
    } catch (error) {
      logger.error('❌ Error publishing comment event to user:', error);
      throw error;
    }
  }

  /**
   * Публиковать уведомление о непрочитанных комментариях
   */
  async publishUnreadNotification(userId: string, event: CommentEvent): Promise<void> {
    try {
      const channel = COMMENT_CHANNELS.UNREAD_NOTIFICATIONS(userId);
      const message = JSON.stringify(event);
      
      await this.client.publish(channel, message);
      
      logger.debug(`🔔 Published unread notification to user ${userId}:`, event.type);
    } catch (error) {
      logger.error('❌ Error publishing unread notification:', error);
      throw error;
    }
  }

  /**
   * Подписаться на события комментариев проекта
   */
  async subscribeToProjectComments(projectId: string, callback: (event: CommentEvent) => void): Promise<void> {
    try {
      const channel = COMMENT_CHANNELS.PROJECT_COMMENTS(projectId);
      
      await this.pubSubClient.subscribe(channel);
      
      this.pubSubClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const event = JSON.parse(message) as CommentEvent;
            callback(event);
          } catch (parseError) {
            logger.error('❌ Error parsing comment event message:', parseError);
          }
        }
      });
      
      logger.debug(`👂 Subscribed to project ${projectId} comment events`);
    } catch (error) {
      logger.error('❌ Error subscribing to project comment events:', error);
      throw error;
    }
  }

  /**
   * Подписаться на события комментариев пользователя
   */
  async subscribeToUserComments(userId: string, callback: (event: CommentEvent) => void): Promise<void> {
    try {
      const channel = COMMENT_CHANNELS.USER_COMMENTS(userId);
      
      await this.pubSubClient.subscribe(channel);
      
      this.pubSubClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const event = JSON.parse(message) as CommentEvent;
            callback(event);
          } catch (parseError) {
            logger.error('❌ Error parsing user comment event message:', parseError);
          }
        }
      });
      
      logger.debug(`👤 Subscribed to user ${userId} comment events`);
    } catch (error) {
      logger.error('❌ Error subscribing to user comment events:', error);
      throw error;
    }
  }

  /**
   * Подписаться на уведомления о непрочитанных комментариях
   */
  async subscribeToUnreadNotifications(userId: string, callback: (event: CommentEvent) => void): Promise<void> {
    try {
      const channel = COMMENT_CHANNELS.UNREAD_NOTIFICATIONS(userId);
      
      await this.pubSubClient.subscribe(channel);
      
      this.pubSubClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const event = JSON.parse(message) as CommentEvent;
            callback(event);
          } catch (parseError) {
            logger.error('❌ Error parsing unread notification message:', parseError);
          }
        }
      });
      
      logger.debug(`🔔 Subscribed to user ${userId} unread notifications`);
    } catch (error) {
      logger.error('❌ Error subscribing to unread notifications:', error);
      throw error;
    }
  }

  /**
   * === UNREAD COMMENTS CACHE ===
   */

  /**
   * Кэшировать количество непрочитанных комментариев пользователя
   */
  async cacheUnreadCommentsCount(userId: string, projectId: string, count: number): Promise<void> {
    try {
      const key = `${REDIS_KEYS.UNREAD_COMMENTS}:${userId}:${projectId}`;
      await this.client.setex(key, REDIS_TTL.UNREAD_COMMENTS_CACHE, count.toString());
      
      logger.debug(`💾 Cached unread comments count for user ${userId} in project ${projectId}: ${count}`);
    } catch (error) {
      logger.error('❌ Error caching unread comments count:', error);
      throw error;
    }
  }

  /**
   * Получить закэшированное количество непрочитанных комментариев
   */
  async getCachedUnreadCommentsCount(userId: string, projectId: string): Promise<number | null> {
    try {
      const key = `${REDIS_KEYS.UNREAD_COMMENTS}:${userId}:${projectId}`;
      const count = await this.client.get(key);
      
      if (count !== null) {
        const parsed = parseInt(count, 10);
        logger.debug(`📖 Retrieved cached unread comments count for user ${userId} in project ${projectId}: ${parsed}`);
        return parsed;
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Error getting cached unread comments count:', error);
      return null;
    }
  }

  /**
   * Инвалидировать кэш количества непрочитанных комментариев
   */
  async invalidateUnreadCommentsCache(userId: string, projectId?: string): Promise<void> {
    try {
      if (projectId) {
        // Инвалидируем кэш для конкретного проекта
        const key = `${REDIS_KEYS.UNREAD_COMMENTS}:${userId}:${projectId}`;
        await this.client.del(key);
        logger.debug(`🗑️ Invalidated unread comments cache for user ${userId} in project ${projectId}`);
      } else {
        // Инвалидируем все кэши пользователя
        const pattern = `${REDIS_KEYS.UNREAD_COMMENTS}:${userId}:*`;
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
          logger.debug(`🗑️ Invalidated all unread comments cache for user ${userId} (${keys.length} keys)`);
        }
      }
    } catch (error) {
      logger.error('❌ Error invalidating unread comments cache:', error);
      throw error;
    }
  }

  /**
   * Подписаться на события проекта
   */
  async subscribeToProject(projectId: string, callback: (event: any) => void): Promise<void> {
    try {
      const channel = `${REDIS_KEYS.PROJECT_EVENTS}:${projectId}`;
      
      await this.pubSubClient.subscribe(channel);
      
      this.pubSubClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const event = JSON.parse(message);
            callback(event);
          } catch (parseError) {
            logger.error('❌ Error parsing pub/sub message:', parseError);
          }
        }
      });
      
      logger.debug(`👂 Subscribed to project ${projectId} events`);
    } catch (error) {
      logger.error('❌ Error subscribing to project channel:', error);
      throw error;
    }
  }

  /**
   * Отписаться от событий проекта
   */
  async unsubscribeFromProject(projectId: string): Promise<void> {
    try {
      const channel = `${REDIS_KEYS.PROJECT_EVENTS}:${projectId}`;
      await this.pubSubClient.unsubscribe(channel);
      
      logger.debug(`👋 Unsubscribed from project ${projectId} events`);
    } catch (error) {
      logger.error('❌ Error unsubscribing from project channel:', error);
      throw error;
    }
  }

  /**
   * === HEALTH AND UTILITY ===
   */

  /**
   * Проверка здоровья соединения
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('❌ Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Получить информацию о Redis
   */
  async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('❌ Error getting Redis info:', error);
      return null;
    }
  }

  /**
   * Очистка истекших ключей (если нужно)
   */
  async cleanup(): Promise<void> {
    try {
      // Redis автоматически удаляет ключи с истекшим TTL,
      // но можем добавить дополнительную логику при необходимости
      logger.debug('🧹 Redis cleanup completed');
    } catch (error) {
      logger.error('❌ Error during Redis cleanup:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      await Promise.all([
        this.client.quit(),
        this.pubSubClient.quit()
      ]);
      logger.info('✅ Redis service shutdown completed');
    } catch (error) {
      logger.error('❌ Error during Redis service shutdown:', error);
    }
  }
}

/**
 * Singleton instance
 */
let redisServiceInstance: RedisService | null = null;

export function getRedisService(): RedisService {
  if (!redisServiceInstance) {
    redisServiceInstance = new RedisService();
  }
  return redisServiceInstance;
}
