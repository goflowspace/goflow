import { injectable, inject } from "inversify";
import { CollaborationSession, UserAwareness, CollaborationEvent, CollaborationEventType } from "../../types/websocket.types";
import { IWebSocketManager, ICollaborationService } from "./interfaces/websocket.interfaces";
import { WEBSOCKET_TYPES } from "./di.types";
import { logger } from "@config/logger";
import { randomUUID } from "crypto";

/**
 * Collaboration Service - управляет сессиями коллаборации
 * Версия для Inversify DI
 */
@injectable()
export class CollaborationService implements ICollaborationService {
  private sessions: Map<string, CollaborationSession> = new Map(); // sessionId -> session
  private userSessions: Map<string, string[]> = new Map(); // userId -> sessionIds[]
  private projectSessions: Map<string, string[]> = new Map(); // projectId -> sessionIds[]

  constructor(
    @inject(WEBSOCKET_TYPES.WebSocketManager) private wsManager: IWebSocketManager
  ) {}

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

    // Сохраняем сессию
    this.sessions.set(sessionId, session);

    // Индексируем по пользователю
    const userSessionIds = this.userSessions.get(userId) || [];
    userSessionIds.push(sessionId);
    this.userSessions.set(userId, userSessionIds);

    // Индексируем по проекту
    const projectSessionIds = this.projectSessions.get(projectId) || [];
    projectSessionIds.push(sessionId);
    this.projectSessions.set(projectId, projectSessionIds);

    logger.info(`Collaboration session created: ${sessionId} for user ${userId} in project ${projectId}`);

    // Уведомляем других участников о подключении
    await this.broadcastUserJoined(session);

    return session;
  }

  /**
   * Завершение сессии
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const { userId, projectId } = session;

    // Удаляем из основного хранилища
    this.sessions.delete(sessionId);

    // Удаляем из индекса пользователя
    const userSessionIds = this.userSessions.get(userId) || [];
    const filteredUserSessions = userSessionIds.filter(id => id !== sessionId);
    if (filteredUserSessions.length === 0) {
      this.userSessions.delete(userId);
    } else {
      this.userSessions.set(userId, filteredUserSessions);
    }

    // Удаляем из индекса проекта
    const projectSessionIds = this.projectSessions.get(projectId) || [];
    const filteredProjectSessions = projectSessionIds.filter(id => id !== sessionId);
    if (filteredProjectSessions.length === 0) {
      this.projectSessions.delete(projectId);
    } else {
      this.projectSessions.set(projectId, filteredProjectSessions);
    }

    logger.info(`Collaboration session ended: ${sessionId}`);

    // Уведомляем других участников об отключении
    await this.broadcastUserLeft(session);
  }

  /**
   * Обновление awareness пользователя
   */
  async updateAwareness(sessionId: string, awareness: Partial<UserAwareness>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Обновляем данные
    session.awareness = { ...session.awareness, ...awareness, lastSeen: Date.now() };
    session.lastActivity = Date.now();

    // Уведомляем других участников
    await this.broadcastAwarenessUpdate(session);
  }

  /**
   * Получение активных сессий проекта
   */
  async getProjectSessions(projectId: string): Promise<CollaborationSession[]> {
    const sessionIds = this.projectSessions.get(projectId) || [];
    return sessionIds
      .map(id => this.sessions.get(id))
      .filter(session => session !== undefined) as CollaborationSession[];
  }

  /**
   * Получение сессии по socketId
   */
  async getSessionBySocketId(socketId: string): Promise<CollaborationSession | undefined> {
    for (const session of this.sessions.values()) {
      if (session.socketId === socketId) {
        return session;
      }
    }
    
    return undefined;
  }

  /**
   * Broadcast события
   */
  private async broadcastUserJoined(session: CollaborationSession): Promise<void> {
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

    this.wsManager.emitToProject(
      session.projectId, 
      event, 
      session.socketId
    );
  }

  private async broadcastUserLeft(session: CollaborationSession): Promise<void> {
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

    this.wsManager.emitToProject(
      session.projectId, 
      event, 
      session.socketId
    );
  }

  private async broadcastAwarenessUpdate(session: CollaborationSession): Promise<void> {
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

    this.wsManager.emitToProject(
      session.projectId, 
      event, 
      session.socketId
    );
  }

  /**
   * Очистка неактивных сессий
   */
  cleanupInactiveSessions(timeoutMs: number = 5 * 60 * 1000): void {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > timeoutMs) {
        sessionsToRemove.push(sessionId);
      }
    }

    sessionsToRemove.forEach(sessionId => {
      this.endSession(sessionId);
    });

    if (sessionsToRemove.length > 0) {
      logger.info(`Cleaned up ${sessionsToRemove.length} inactive sessions`);
    }
  }
} 