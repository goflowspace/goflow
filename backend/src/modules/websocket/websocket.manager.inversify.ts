import { injectable } from "inversify";
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { logger } from "@config/logger";
import { CollaborationEvent } from "../../types/websocket.types";
import { IWebSocketManager } from "./interfaces/websocket.interfaces";
import { env } from "@config/env";

/**
 * WebSocket Manager - отвечает только за управление подключениями
 * Версия для Inversify DI
 */
@injectable()
export class WebSocketManager implements IWebSocketManager {
  private io?: SocketIOServer;
  private connectedSockets: Map<string, Socket> = new Map();

  /**
   * Инициализация WebSocket сервера
   */
  initialize(httpServer: HTTPServer): void {
    console.log('🔌 Initializing Socket.IO server...');
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    console.log('✅ Socket.IO server successfully initialized');
    logger.info("WebSocket server initialized");
  }

  /**
   * Получение IO инстанса
   */
  getIO(): SocketIOServer {
    if (!this.io) {
      console.error('❌ WebSocket server not initialized when getIO() called');
      throw new Error("WebSocket server not initialized");
    }
    console.log('✅ getIO() returning initialized Socket.IO server');
    return this.io;
  }

  /**
   * Регистрация подключения
   */
  registerConnection(socketId: string, socket: Socket): void {
    console.log('🔌 [WebSocketManager] registerConnection:', { 
      socketId, 
      totalConnectedSockets: this.connectedSockets.size 
    });
    
    this.connectedSockets.set(socketId, socket);
    logger.debug(`Socket connected: ${socketId}. Total: ${this.connectedSockets.size}`);
  }

  /**
   * Удаление подключения
   */
  unregisterConnection(socketId: string): void {
    this.connectedSockets.delete(socketId);
    logger.debug(`Socket disconnected: ${socketId}`);
  }

  /**
   * Отправка события конкретному сокету
   */
  emitToSocket(socketId: string, event: CollaborationEvent): boolean {
    const socket = this.connectedSockets.get(socketId);
    if (socket) {
      socket.emit(event.type, event);
      return true;
    }
    return false;
  }

  /**
   * Отправка события всем участникам проекта
   */
  emitToProject(projectId: string, event: CollaborationEvent, excludeSocketId?: string): void {
    if (!this.io) {
      console.warn('⚠️ Cannot emit to project - Socket.IO not initialized');
      return;
    }

    const room = `project:${projectId}`;
    
    // Получаем информацию о комнате
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    const socketCount = roomSockets ? roomSockets.size : 0;
    
    console.log('📡 [WebSocketManager] emitToProject:', {
      projectId,
      room,
      eventType: event.type,
      socketCount,
      socketsInRoom: roomSockets ? Array.from(roomSockets) : [],
      excludeSocketId,
      allRooms: Array.from(this.io.sockets.adapter.rooms.keys()),
      eventPayload: event.payload
    });
    
    const socketToExclude = excludeSocketId ? this.connectedSockets.get(excludeSocketId) : null;
    
    if (socketToExclude) {
      socketToExclude.to(room).emit(event.type, event);
      console.log('📡 [WebSocketManager] Emitted via excluded socket to room:', room);
    } else {
      this.io.to(room).emit(event.type, event);
      console.log('📡 [WebSocketManager] Emitted directly to room:', room);
    }
    
    if (socketCount === 0) {
      console.warn(`⚠️ WARNING: No sockets in room ${room}! Event will not be received.`);
    } else {
      console.log(`✅ [WebSocketManager] Event sent to ${socketCount} sockets in room ${room}`);
    }
  }

  /**
   * Добавление сокета в комнату проекта
   */
  joinProjectRoom(socketId: string, projectId: string): void {
    console.log('🏠 [WebSocketManager] joinProjectRoom called:', { socketId, projectId });
    
    const socket = this.connectedSockets.get(socketId);
    if (socket) {
      const roomName = `project:${projectId}`;
      
      console.log('🏠 [WebSocketManager] Joining room:', { socketId, roomName });
      socket.join(roomName);
      
      // Проверяем что присоединение прошло успешно
      const isInRoom = socket.rooms.has(roomName);
      console.log('🏠 [WebSocketManager] Join result:', { 
        socketId, 
        roomName, 
        isInRoom,
        socketRooms: Array.from(socket.rooms)
      });
      
      if (this.io) {
        const roomSockets = this.io.sockets.adapter.rooms.get(roomName);
        console.log('🏠 [WebSocketManager] Room state after join:', {
          roomName,
          socketsInRoom: roomSockets ? Array.from(roomSockets) : [],
          totalClientsInRoom: roomSockets ? roomSockets.size : 0
        });
      }
    } else {
      console.error(`❌ [WebSocketManager] Socket ${socketId} not found in connectedSockets`, {
        availableSockets: Array.from(this.connectedSockets.keys()),
        connectedSocketsCount: this.connectedSockets.size
      });
    }
  }

  /**
   * Удаление сокета из комнаты проекта
   */
  leaveProjectRoom(socketId: string, projectId: string): void {
    const socket = this.connectedSockets.get(socketId);
    if (socket) {
      socket.leave(`project:${projectId}`);
    }
  }

  /**
   * Получение количества подключенных клиентов в проекте
   */
  async getProjectClientsCount(projectId: string): Promise<number> {
    if (!this.io) return 0;
    
    const room = this.io.sockets.adapter.rooms.get(`project:${projectId}`);
    return room ? room.size : 0;
  }
} 