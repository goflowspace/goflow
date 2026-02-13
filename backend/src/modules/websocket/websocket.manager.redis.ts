import { injectable } from "inversify";
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { logger } from "@config/logger";
import { CollaborationEvent } from "../../types/websocket.types";
import { IWebSocketManager } from "./interfaces/websocket.interfaces";
import { RedisService, getRedisService } from "../../services/redis.service";
import { env } from "@config/env";

/**
 * Redis WebSocket Manager - масштабируемая версия для нескольких инстансов
 * 
 * Принципы SOLID:
 * - Single Responsibility: управление WebSocket подключениями с Redis Pub/Sub
 * - Open/Closed: расширяемый для дополнительных типов событий
 * - Dependency Inversion: зависит от Redis абстракции
 */
@injectable()
export class RedisWebSocketManager implements IWebSocketManager {
  private io?: SocketIOServer;
  private connectedSockets: Map<string, Socket> = new Map();
  private readonly redisService: RedisService;
  private readonly instanceId: string;
  
  // Подписки на каналы Redis
  private subscribedProjects: Set<string> = new Set();

  constructor() {
    this.redisService = getRedisService();
    this.instanceId = `instance_${process.pid}_${Date.now()}`;
    
    // Настраиваем обработчики Redis Pub/Sub при создании
    this.setupRedisPubSubHandlers();
  }

  /**
   * Инициализация WebSocket сервера
   */
  initialize(httpServer: HTTPServer): void {
    console.log('🔌 Initializing Redis-enabled Socket.IO server...');
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    console.log('✅ Redis Socket.IO server successfully initialized');
    logger.info("Redis WebSocket server initialized");
  }

  /**
   * Получение IO инстанса
   */
  getIO(): SocketIOServer {
    if (!this.io) {
      console.error('❌ Redis WebSocket server not initialized when getIO() called');
      throw new Error("Redis WebSocket server not initialized");
    }
    return this.io;
  }

  /**
   * Регистрация подключения
   */
  registerConnection(socketId: string, socket: Socket): void {
    console.log('🔌 [RedisWebSocketManager] registerConnection:', { 
      socketId, 
      instanceId: this.instanceId,
      totalConnectedSockets: this.connectedSockets.size 
    });
    
    this.connectedSockets.set(socketId, socket);
    logger.debug(`Redis Socket connected: ${socketId}. Total: ${this.connectedSockets.size} on instance ${this.instanceId}`);
  }

  /**
   * Удаление подключения
   */
  unregisterConnection(socketId: string): void {
    this.connectedSockets.delete(socketId);
    logger.debug(`Redis Socket disconnected: ${socketId} from instance ${this.instanceId}`);
  }

  /**
   * Отправка события конкретному сокету (локальная операция)
   */
  emitToSocket(socketId: string, event: CollaborationEvent): boolean {
    const socket = this.connectedSockets.get(socketId);
    if (socket) {
      socket.emit(event.type, event);
      logger.debug(`📤 [RedisWebSocketManager] Emitted to local socket ${socketId}: ${event.type}`);
      return true;
    }
    
    logger.debug(`⚠️ [RedisWebSocketManager] Socket ${socketId} not found on instance ${this.instanceId}`);
    return false;
  }

  /**
   * Отправка события всем участникам проекта (через Redis Pub/Sub для масштабирования)
   */
  emitToProject(projectId: string, event: CollaborationEvent, excludeSocketId?: string): void {
    logger.debug('📡 [RedisWebSocketManager] emitToProject via Redis:', {
      projectId,
      eventType: event.type,
      excludeSocketId,
      instanceId: this.instanceId
    });

    try {
      // Отправляем через Redis Pub/Sub для cross-instance broadcasting
      const redisEvent = {
        ...event,
        excludeSocketId,
        sourceInstanceId: this.instanceId, // Помечаем откуда пришло
        timestamp: Date.now()
      };

      // Публикуем в Redis для других инстансов
      this.redisService.publishToProject(projectId, redisEvent);
      
      // Отправляем локально на текущем инстансе (НЕ дублируем - это для локальных клиентов)
      this.emitToProjectLocally(projectId, event, excludeSocketId);
      
      logger.debug(`📡 [RedisWebSocketManager] Event published to Redis and sent locally for project ${projectId}: ${event.type}`);
    } catch (error) {
      logger.error('❌ Error publishing to Redis, falling back to local only:', error);
      // Fallback to local emission only
      this.emitToProjectLocally(projectId, event, excludeSocketId);
    }
  }

  /**
   * Локальная отправка события проекту (без Redis)
   */
  private emitToProjectLocally(projectId: string, event: CollaborationEvent, excludeSocketId?: string): void {
    if (!this.io) {
      console.warn('⚠️ Cannot emit to project locally - Socket.IO not initialized');
      return;
    }

    const room = `project:${projectId}`;
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    const socketCount = roomSockets ? roomSockets.size : 0;
    
    logger.debug('📡 [RedisWebSocketManager] emitToProjectLocally:', {
      projectId,
      room,
      eventType: event.type,
      socketCount,
      excludeSocketId,
      instanceId: this.instanceId
    });
    
    const socketToExclude = excludeSocketId ? this.connectedSockets.get(excludeSocketId) : null;
    
    if (socketToExclude) {
      socketToExclude.to(room).emit(event.type, event);
    } else {
      this.io.to(room).emit(event.type, event);
    }
    
    if (socketCount > 0) {
      logger.debug(`✅ [RedisWebSocketManager] Event sent locally to ${socketCount} sockets in room ${room}`);
    }
  }

  /**
   * Добавление сокета в комнату проекта
   */
  joinProjectRoom(socketId: string, projectId: string): void {
    logger.debug('🏠 [RedisWebSocketManager] joinProjectRoom called:', { 
      socketId, 
      projectId, 
      instanceId: this.instanceId 
    });
    
    const socket = this.connectedSockets.get(socketId);
    if (socket) {
      const roomName = `project:${projectId}`;
      
      // Присоединяемся к локальной комнате
      socket.join(roomName);
      
      // Подписываемся на Redis канал проекта (если еще не подписаны)
      if (!this.subscribedProjects.has(projectId)) {
        this.subscribeToProjectRedis(projectId);
        this.subscribedProjects.add(projectId);
      }
      
      const isInRoom = socket.rooms.has(roomName);
      logger.debug('🏠 [RedisWebSocketManager] Join result:', { 
        socketId, 
        roomName, 
        isInRoom,
        socketRooms: Array.from(socket.rooms),
        instanceId: this.instanceId
      });
    } else {
      logger.error(`❌ [RedisWebSocketManager] Socket ${socketId} not found on instance ${this.instanceId}`);
    }
  }

  /**
   * Удаление сокета из комнаты проекта
   */
  leaveProjectRoom(socketId: string, projectId: string): void {
    const socket = this.connectedSockets.get(socketId);
    if (socket) {
      const roomName = `project:${projectId}`;
      socket.leave(roomName);
      
      // Проверяем, остались ли еще сокеты в этой комнате на данном инстансе
      this.checkAndUnsubscribeProject(projectId);
      
      logger.debug('🚪 [RedisWebSocketManager] Socket left room:', { 
        socketId, 
        roomName, 
        instanceId: this.instanceId 
      });
    }
  }

  /**
   * Получение количества подключенных клиентов в проекте (только локальные)
   */
  async getProjectClientsCount(projectId: string): Promise<number> {
    if (!this.io) return 0;
    
    const room = this.io.sockets.adapter.rooms.get(`project:${projectId}`);
    const localCount = room ? room.size : 0;
    
    // TODO: В будущем можно добавить cross-instance подсчет через Redis
    logger.debug(`📊 [RedisWebSocketManager] Local clients in project ${projectId}: ${localCount}`);
    
    return localCount;
  }

  /**
   * Настройка обработчиков Redis Pub/Sub
   */
  private setupRedisPubSubHandlers(): void {
    logger.debug('📡 [RedisWebSocketManager] Setting up Redis Pub/Sub handlers');
    
    // Здесь будем настраивать глобальные обработчики Redis событий
    // Конкретные подписки на проекты будут происходить в joinProjectRoom
  }

  /**
   * Подписка на Redis канал проекта
   */
  private async subscribeToProjectRedis(projectId: string): Promise<void> {
    try {
      // Подписываемся на основные события проекта
      await this.redisService.subscribeToProject(projectId, (event) => {
        this.handleRedisProjectEvent(projectId, event);
      });

      // Подписываемся на события комментариев проекта
      await this.redisService.subscribeToProjectComments(projectId, (commentEvent) => {
        this.handleRedisCommentEvent(projectId, commentEvent);
      });
      
      logger.debug(`📡 [RedisWebSocketManager] Subscribed to Redis events and comments for project ${projectId}`);
    } catch (error) {
      logger.error(`❌ Error subscribing to Redis project ${projectId}:`, error);
    }
  }

  /**
   * Обработка события проекта из Redis
   */
  private handleRedisProjectEvent(projectId: string, event: any): void {
    // Не обрабатываем события от самого себя
    if (event.sourceInstanceId === this.instanceId) {
      logger.debug('🔄 [RedisWebSocketManager] Ignoring own event from Redis:', event.type);
      return;
    }

    logger.debug('📨 [RedisWebSocketManager] Received Redis event for project:', {
      projectId,
      eventType: event.type,
      sourceInstance: event.sourceInstanceId,
      thisInstance: this.instanceId
    });

    // Отправляем локально всем клиентам проекта
    const { excludeSocketId, sourceInstanceId, ...cleanEvent } = event;
    this.emitToProjectLocally(projectId, cleanEvent, excludeSocketId);
  }

  /**
   * Обработка события комментария из Redis
   */
  private handleRedisCommentEvent(projectId: string, commentEvent: any): void {
    logger.debug('💬 [RedisWebSocketManager] Received Redis comment event for project:', {
      projectId,
      eventType: commentEvent.type,
      userId: commentEvent.userId,
      thisInstance: this.instanceId
    });

    if (!this.io) {
      logger.warn('⚠️ Cannot emit comment event - Socket.IO not initialized');
      return;
    }

    // Отправляем в соответствующий канал проекта
    const projectChannel = `flow:comments_events:project:${projectId}`;
    this.io.to(`project:${projectId}`).emit(projectChannel, commentEvent);
    
    // Если это персональное уведомление, отправляем также в персональные каналы
    if (commentEvent.type === 'comment:mention' && commentEvent.data?.mentionedUserId) {
      const userChannel = `flow:comment_notifications:${commentEvent.data.mentionedUserId}`;
      this.io.emit(userChannel, commentEvent);
    }

    // Если это обновление счетчика непрочитанных, отправляем персонально
    if (commentEvent.type === 'unread_count:updated' && commentEvent.data?.userId) {
      const unreadChannel = `flow:comment_notifications:${commentEvent.data.userId}`;
      this.io.emit(unreadChannel, commentEvent);
    }

    logger.debug(`💬 [RedisWebSocketManager] Comment event ${commentEvent.type} broadcasted to project ${projectId}`);
  }

  /**
   * Проверка и отписка от проекта если нет локальных клиентов
   */
  private async checkAndUnsubscribeProject(projectId: string): Promise<void> {
    if (!this.io) return;
    
    const room = this.io.sockets.adapter.rooms.get(`project:${projectId}`);
    const hasLocalClients = room && room.size > 0;
    
    if (!hasLocalClients && this.subscribedProjects.has(projectId)) {
      try {
        await this.redisService.unsubscribeFromProject(projectId);
        this.subscribedProjects.delete(projectId);
        
        logger.debug(`📡 [RedisWebSocketManager] Unsubscribed from Redis project ${projectId} - no local clients`);
      } catch (error) {
        logger.error(`❌ Error unsubscribing from Redis project ${projectId}:`, error);
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Отписываемся от всех проектов
      for (const projectId of this.subscribedProjects) {
        await this.redisService.unsubscribeFromProject(projectId);
      }
      this.subscribedProjects.clear();
      
      logger.debug(`✅ [RedisWebSocketManager] Instance ${this.instanceId} shutdown completed`);
    } catch (error) {
      logger.error('❌ Error during Redis WebSocket Manager shutdown:', error);
    }
  }
}
