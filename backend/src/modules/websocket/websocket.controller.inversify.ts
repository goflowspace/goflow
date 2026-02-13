import { injectable, inject } from "inversify";
import { Socket } from "socket.io";
import { CollaborationEvent, CollaborationEventType } from "../../types/websocket.types";
import { IWebSocketManager, ICollaborationService, IWebSocketController, IPresenceService } from "./interfaces/websocket.interfaces";
import { WEBSOCKET_TYPES, EVENT_HANDLER_TYPES } from "./di.types";
import { EventHandler } from "./event-handlers/base.handler";
import { logger } from "@config/logger";
import jwt from "jsonwebtoken";
import { env } from "@config/env";
import { prisma } from "@config/prisma";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userPicture?: string;
}

/**
 * WebSocket Controller - координирует работу WebSocket
 * Версия для Inversify DI
 */
@injectable()
export class WebSocketController implements IWebSocketController {
  private eventHandlers: Map<CollaborationEventType, EventHandler> = new Map();
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor(
    @inject(WEBSOCKET_TYPES.WebSocketManager) private wsManager: IWebSocketManager,
    @inject(WEBSOCKET_TYPES.CollaborationService) private collaborationService: ICollaborationService,
    @inject(WEBSOCKET_TYPES.PresenceService) private presenceService: IPresenceService,
    @inject(EVENT_HANDLER_TYPES.AwarenessEventHandler) private awarenessHandler: EventHandler,
    @inject(EVENT_HANDLER_TYPES.OperationEventHandler) private operationHandler: EventHandler,
    @inject(EVENT_HANDLER_TYPES.AIEventHandler) private aiHandler: EventHandler
  ) {
    this.initializeEventHandlers();
    this.setupCleanupJob();
  }

  /**
   * Инициализация обработчиков событий
   * Принцип Open/Closed: легко добавлять новые обработчики
   */
  private initializeEventHandlers(): void {
    // Регистрируем обработчики awareness событий
    this.eventHandlers.set(CollaborationEventType.CURSOR_MOVE, this.awarenessHandler); // Legacy support
    this.eventHandlers.set(CollaborationEventType.LAYER_CURSOR_UPDATE, this.awarenessHandler); // New layer-aware API
    this.eventHandlers.set(CollaborationEventType.SELECTION_CHANGE, this.awarenessHandler);
    this.eventHandlers.set(CollaborationEventType.AWARENESS_UPDATE, this.awarenessHandler);
    this.eventHandlers.set(CollaborationEventType.NODE_DRAG_PREVIEW, this.awarenessHandler);
    
    // Регистрируем обработчик операций
    this.eventHandlers.set(CollaborationEventType.OPERATION_BROADCAST, this.operationHandler);
    
    // Регистрируем обработчики AI событий
    this.eventHandlers.set(CollaborationEventType.AI_PIPELINE_STARTED, this.aiHandler);
    this.eventHandlers.set(CollaborationEventType.AI_PIPELINE_PROGRESS, this.aiHandler);
    this.eventHandlers.set(CollaborationEventType.AI_PIPELINE_STEP_COMPLETED, this.aiHandler);
    this.eventHandlers.set(CollaborationEventType.AI_PIPELINE_COMPLETED, this.aiHandler);
    this.eventHandlers.set(CollaborationEventType.AI_PIPELINE_ERROR, this.aiHandler);
    
    // LAYER_CURSOR_* события обрабатываются и рассылаются PresenceService напрямую
    // Не нужно их дополнительно обрабатывать в awareness handler
  }

  /**
   * Настройка обработчиков подключений
   */
  setupConnectionHandlers(): void {
    const io = this.wsManager.getIO();

    // Middleware для аутентификации
    io.use(this.authenticateSocket.bind(this));

    io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Middleware для аутентификации WebSocket соединений
   */
  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      logger.debug(`🔐 WebSocket auth attempt: socketId=${socket.id}, hasToken=${!!token}`);
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, env.jwtSecret) as any;
      
      // Получаем актуальные данные пользователя из БД
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.userId = user.id;
      socket.userName = user.name || user.email;
      (socket as any).userPicture = user.picture; // Добавляем аватарку
      
      logger.info(`✅ WebSocket auth success: socketId=${socket.id}, userId=${socket.userId}, userName=${socket.userName}`);
      
      next();
    } catch (error) {
      logger.error(`❌ WebSocket auth error:`, error);
      next(new Error('Invalid authentication token'));
    }
  }

  /**
   * Обработка нового подключения
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    logger.info(`WebSocket connected: ${socket.id} for user ${socket.userId}`);
    
    // Регистрируем подключение
    this.wsManager.registerConnection(socket.id, socket);

    // Настраиваем обработчики событий
    this.setupSocketEventHandlers(socket);

    // Обработка отключения
      socket.on('disconnect', async () => {
        await this.handleDisconnection(socket);
      });
  }

  /**
   * Настройка обработчиков событий для сокета
   */
  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    // Подключение к проекту
    socket.on('join_project', async (data: { projectId: string, teamId: string }) => {
      logger.info(`🎯 join_project received: socketId=${socket.id}, projectId=${data.projectId}, userId=${socket.userId}`);
      await this.handleJoinProject(socket, data.projectId, data.teamId);
    });

    // Покидание проекта
    socket.on('leave_project', async (data: { projectId: string }) => {
      await this.handleLeaveProject(socket, data.projectId);
    });

    // Обработка событий коллаборации
    socket.on('collaboration_event', async (event: CollaborationEvent) => {
      await this.handleCollaborationEvent(socket, event);
    });

    // Универсальный обработчик для разных типов событий
    Object.values(CollaborationEventType).forEach(eventType => {
      socket.on(eventType, async (event: CollaborationEvent) => {
        await this.handleCollaborationEvent(socket, { ...event, type: eventType });
      });
    });
  }

  /**
   * Подключение к проекту
   */
  private async handleJoinProject(socket: AuthenticatedSocket, projectId: string, teamId: string): Promise<void> {
    logger.debug('🎯 [WebSocketController] handleJoinProject called:', {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName,
      projectId
    });
    
    if (!socket.userId || !socket.userName) {
      logger.warn(`❌ handleJoinProject FAILED: Missing userId or userName`, {
        socketId: socket.id,
        hasUserId: !!socket.userId,
        hasUserName: !!socket.userName
      });
      socket.emit('join_project_error', { 
        error: 'Authentication required',
        projectId
      });
      return;
    }

    try {
      // Проверяем права доступа к команде
      const hasAccess = await this.checkProjectAccess(socket.userId, teamId);
      
      if (!hasAccess) {
        logger.warn(`❌ Access denied to project ${projectId} for user ${socket.userId}`);
        socket.emit('join_project_error', { 
          error: 'Access denied to project',
          projectId
        });
        return;
      }

      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: присоединяем к комнате проекта
      logger.debug('🏠 [WebSocketController] Joining project room:', { socketId: socket.id, projectId });
      this.wsManager.joinProjectRoom(socket.id, projectId);
      
      // Проверяем что действительно присоединились
      const roomClientsCount = await this.wsManager.getProjectClientsCount(projectId);
      logger.debug('🏠 [WebSocketController] Room status after join:', { 
        projectId, 
        clientsCount: roomClientsCount,
        socketId: socket.id 
      });

      // Создаем сессию коллаборации
      logger.debug('👥 [WebSocketController] Creating collaboration session');
      const session = await this.collaborationService.createSession(
        socket.userId,
        socket.userName,
        projectId,
        socket.id
      );
      
      // Обновляем сессию с аватаркой пользователя
      if (socket.userPicture && session) {
        await this.collaborationService.updateAwareness(session.id, {
          userPicture: socket.userPicture
        });
      }

      // Отправляем текущих участников
      const activeSessions = await this.collaborationService.getProjectSessions(projectId);
      logger.debug('👥 [WebSocketController] Active sessions:', {
        projectId,
        sessionCount: activeSessions.length,
        userIds: activeSessions.map(s => s.userId)
      });
      
      socket.emit('project_users', {
        users: activeSessions.map(s => s.awareness)
      });

      // Отправляем подтверждение успешного присоединения к комнате
      socket.emit('join_project_success', {
        projectId,
        userId: socket.userId,
        timestamp: Date.now(),
        success: true,
        message: 'Successfully joined project room',
        roomClients: roomClientsCount
      });

      logger.info(`✅ User ${socket.userId} successfully joined project ${projectId}. Room now has ${roomClientsCount} clients.`);
    } catch (error) {
      logger.error('❌ [WebSocketController] Error in handleJoinProject:', error);
      logger.error('Error joining project:', error);
      socket.emit('join_project_error', { 
        error: 'Failed to join project',
        projectId,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Проверка доступа пользователя к проекту
   */
  private async checkProjectAccess(userId: string, teamId: string): Promise<boolean> {
    // Проверяем права доступа - только админы и владельцы
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        OR: [
          { role: 'ADMINISTRATOR' },
          { role: 'MANAGER' },
          { role: 'MEMBER' },
          { role: 'OBSERVER' },
          { 
            team: {
              ownerId: userId
            }
          }
        ]
      },
    });

    if (!teamMember) {
      return false;
    }

    return true;
  }

  /**
   * Покидание проекта
   */
  private async handleLeaveProject(socket: AuthenticatedSocket, projectId: string): Promise<void> {
    try {
      // Покидаем комнату проекта
      this.wsManager.leaveProjectRoom(socket.id, projectId);

      // Завершаем сессию коллаборации
      const session = await this.collaborationService.getSessionBySocketId(socket.id);
      if (session) {
        await this.collaborationService.endSession(session.id);
      }

      logger.info(`User ${socket.userId} left project ${projectId}`);
    } catch (error) {
      logger.error('Error leaving project:', error);
    }
  }

  /**
   * Обработка события коллаборации
   */
  private async handleCollaborationEvent(socket: Socket, event: CollaborationEvent): Promise<void> {
    try {
      const handler = this.eventHandlers.get(event.type);
      if (!handler) {
        logger.warn(`No handler found for event type: ${event.type}`);
        return;
      }

      await handler.handle(socket, event);
    } catch (error) {
      logger.error(`Error handling collaboration event ${event.type}:`, error);
      socket.emit('error', { 
        message: 'Failed to process event',
        eventType: event.type 
      });
    }
  }

  /**
   * Обработка отключения
   */
  private async handleDisconnection(socket: AuthenticatedSocket): Promise<void> {
    logger.info(`WebSocket disconnected: ${socket.id} for user ${socket.userId}`);

    // Завершаем все сессии пользователя
    const session = await this.collaborationService.getSessionBySocketId(socket.id);
    if (session) {
        await this.collaborationService.endSession(session.id);
    }

    // Удаляем подключение
    this.wsManager.unregisterConnection(socket.id);
  }

  /**
   * Настройка периодической очистки неактивных сессий
   */
  private setupCleanupJob(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.collaborationService.cleanupInactiveSessions();
    }, 60000); // Каждую минуту
  }

  /**
   * Остановка периодической очистки
   */
  public stopCleanupJob(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
    
    // Останавливаем PresenceService
    this.presenceService.stop();
  }
} 