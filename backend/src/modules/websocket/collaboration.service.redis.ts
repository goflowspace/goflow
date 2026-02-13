import { injectable } from "inversify";
import { CollaborationSession, UserAwareness, CollaborationEvent, CollaborationEventType } from "../../types/websocket.types";
import { ICollaborationService } from "./interfaces/websocket.interfaces";
import { logger } from "@config/logger";
import { randomUUID } from "crypto";
import { RedisService, getRedisService } from "../../services/redis.service";

/**
 * Redis-based Collaboration Service
 * Замещает in-memory версию для горизонтального масштабирования
 * 
 * Принципы SOLID:
 * - Single Responsibility: управление сессиями коллаборации через Redis
 * - Dependency Inversion: зависит от Redis абстракции
 * - Open/Closed: расширяемый для дополнительных типов сессий
 */
@injectable()
export class RedisCollaborationService implements ICollaborationService {
  private readonly redisService: RedisService;

  constructor() {
    this.redisService = getRedisService();
  }

  /**
   * Создание новой сессии коллаборации
   */
  async createSession(
    userId: string,
    userName: string,
    projectId: string,
    socketId: string
  ): Promise<CollaborationSession> {
    // Проверяем, нет ли уже активной сессии для этого сокета
    const existingSession = await this.getSessionBySocketId(socketId);
    if (existingSession) {
      logger.warn(`Session already exists for socket ${socketId}`);
      return existingSession;
    }

    // КРИТИЧЕСКИ ВАЖНО: Удаляем все старые сессии этого пользователя в этом проекте
    await this.cleanupUserSessions(userId, projectId);

    const sessionId = randomUUID();
    const now = Date.now();

    const session: CollaborationSession = {
      id: sessionId,
      userId,
      projectId,
      socketId,
      awareness: {
        userId,
        userName,
        lastSeen: now
      },
      joinedAt: now,
      lastActivity: now
    };

    try {
      // Сохраняем сессию в Redis
      await this.redisService.saveSession(sessionId, session);
      
      // КРИТИЧЕСКИ ВАЖНО: Создаем обратный индекс socketId -> sessionId
      await this.redisService.setSocketSessionMapping(socketId, sessionId);

      logger.info(`✅ Redis collaboration session created: ${sessionId} for user ${userId} in project ${projectId}`);

      // Уведомляем других участников о подключении
      await this.broadcastUserJoined(session);

      return session;
    } catch (error) {
      logger.error('❌ Error creating Redis collaboration session:', error);
      throw error;
    }
  }

  /**
   * Завершение сессии
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        logger.warn(`Attempted to end non-existent session: ${sessionId}`);
        return;
      }

      // Уведомляем других участников об отключении ПЕРЕД удалением
      await this.broadcastUserLeft(session);

      // Удаляем из Redis
      await this.redisService.removeSession(sessionId);
      
      // Удаляем обратный индекс socketId -> sessionId
      await this.redisService.removeSocketSessionMapping(session.socketId);

      logger.info(`✅ Redis collaboration session ended: ${sessionId}`);
    } catch (error) {
      logger.error('❌ Error ending Redis collaboration session:', error);
      throw error;
    }
  }

  /**
   * Обновление awareness пользователя
   */
  async updateAwareness(sessionId: string, awareness: Partial<UserAwareness>): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        logger.warn(`Attempted to update awareness for non-existent session: ${sessionId}`);
        return;
      }

      // Обновляем данные
      session.awareness = { ...session.awareness, ...awareness, lastSeen: Date.now() };
      session.lastActivity = Date.now();

      // Сохраняем обновленную сессию в Redis
      await this.redisService.saveSession(sessionId, session);

      // Уведомляем других участников
      await this.broadcastAwarenessUpdate(session);

      logger.debug(`🔄 Updated awareness for session ${sessionId}`);
    } catch (error) {
      logger.error('❌ Error updating awareness in Redis:', error);
      throw error;
    }
  }

  /**
   * Получение активных сессий проекта
   */
  async getProjectSessions(projectId: string): Promise<CollaborationSession[]> {
    try {
      const sessionIds = await this.redisService.getProjectSessions(projectId);
      
      // Получаем все сессии параллельно
      const sessions = await Promise.all(
        sessionIds.map(sessionId => this.getSession(sessionId))
      );
      
      // Фильтруем null значения (удаленные или истекшие сессии)
      return sessions.filter(session => session !== null) as CollaborationSession[];
    } catch (error) {
      logger.error('❌ Error getting project sessions from Redis:', error);
      return [];
    }
  }

  /**
   * Получение сессии по ID
   */
  private async getSession(sessionId: string): Promise<CollaborationSession | null> {
    try {
      return await this.redisService.getSession(sessionId);
    } catch (error) {
      logger.error(`❌ Error getting session ${sessionId} from Redis:`, error);
      return null;
    }
  }

  /**
   * Получение сессии по socketId
   * Используем обратный индекс для быстрого поиска
   */
  async getSessionBySocketId(socketId: string): Promise<CollaborationSession | undefined> {
    try {
      // Получаем sessionId по socketId из индекса
      const sessionId = await this.redisService.getSessionIdBySocket(socketId);
      if (!sessionId) {
        return undefined;
      }
      
      // Получаем сессию по sessionId  
      const session = await this.getSession(sessionId);
      return session || undefined;
    } catch (error) {
      logger.error('❌ Error getting session by socketId from Redis:', error);
      return undefined;
    }
  }

  /**
   * Broadcast события через Redis Pub/Sub
   */
  private async broadcastUserJoined(session: CollaborationSession): Promise<void> {
    try {
      const event: CollaborationEvent = {
        type: CollaborationEventType.USER_JOIN,
        payload: {
          user: session.awareness,
          sessionId: session.id
        },
        userId: session.userId,
        projectId: session.projectId,
        timestamp: Date.now()
      };

      // Публикуем через Redis вместо прямой эмиссии
      await this.redisService.publishToProject(session.projectId, {
        ...event,
        excludeSocketId: session.socketId // Исключаем самого отправителя
      });

      logger.debug(`📡 Broadcast USER_JOIN for project ${session.projectId} via Redis`);
    } catch (error) {
      logger.error('❌ Error broadcasting user joined via Redis:', error);
    }
  }

  private async broadcastUserLeft(session: CollaborationSession): Promise<void> {
    try {
      const event: CollaborationEvent = {
        type: CollaborationEventType.USER_LEAVE,
        payload: {
          userId: session.userId,
          sessionId: session.id
        },
        userId: session.userId,
        projectId: session.projectId,
        timestamp: Date.now()
      };

      // Публикуем через Redis
      await this.redisService.publishToProject(session.projectId, {
        ...event,
        excludeSocketId: session.socketId
      });

      logger.debug(`📡 Broadcast USER_LEAVE for project ${session.projectId} via Redis`);
    } catch (error) {
      logger.error('❌ Error broadcasting user left via Redis:', error);
    }
  }

  private async broadcastAwarenessUpdate(session: CollaborationSession): Promise<void> {
    try {
      const event: CollaborationEvent = {
        type: CollaborationEventType.AWARENESS_UPDATE,
        payload: {
          awareness: session.awareness,
          sessionId: session.id
        },
        userId: session.userId,
        projectId: session.projectId,
        timestamp: Date.now()
      };

      // Публикуем через Redis
      await this.redisService.publishToProject(session.projectId, {
        ...event,
        excludeSocketId: session.socketId
      });

      logger.debug(`📡 Broadcast AWARENESS_UPDATE for project ${session.projectId} via Redis`);
    } catch (error) {
      logger.error('❌ Error broadcasting awareness update via Redis:', error);
    }
  }

  /**
   * Очистка неактивных сессий
   * В Redis версии используем TTL, но все равно можем запускать периодическую очистку
   */
  async cleanupInactiveSessions(_timeoutMs: number = 5 * 60 * 1000): Promise<void> {
    try {
      // Redis автоматически удаляет сессии с истекшим TTL
      // Но можем добавить дополнительную логику очистки индексов если нужно
      
      await this.redisService.cleanup();
      
      logger.debug('🧹 Redis collaboration sessions cleanup completed');
    } catch (error) {
      logger.error('❌ Error during Redis collaboration sessions cleanup:', error);
    }
  }

  /**
   * Получение статистики сессий
   */
  async getSessionsStats(): Promise<any> {
    try {
      // Можем добавить статистику Redis
      const info = await this.redisService.getInfo();
      
      return {
        redisConnected: await this.redisService.healthCheck(),
        redisInfo: info
      };
    } catch (error) {
      logger.error('❌ Error getting sessions stats from Redis:', error);
      return { redisConnected: false };
    }
  }

  /**
   * Очистка всех старых сессий пользователя в проекте (предотвращает дублирование)
   */
  private async cleanupUserSessions(userId: string, projectId: string): Promise<void> {
    try {
      // Получаем все сессии этого пользователя
      const userSessionIds = await this.redisService.getUserSessions(userId);
      
      for (const sessionId of userSessionIds) {
        const session = await this.getSession(sessionId);
        if (session && session.projectId === projectId) {
          // Удаляем старую сессию этого пользователя в том же проекте
          logger.info(`🧹 Cleaning up old session: ${sessionId} for user ${userId} in project ${projectId}`);
          await this.endSession(sessionId);
        }
      }
    } catch (error) {
      logger.error('❌ Error cleaning up user sessions:', error);
      // Не бросаем ошибку - это не критично для создания новой сессии
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      await this.redisService.shutdown();
      logger.info('✅ Redis collaboration service shutdown completed');
    } catch (error) {
      logger.error('❌ Error during Redis collaboration service shutdown:', error);
    }
  }
}
