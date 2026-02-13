import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { CollaborationEvent, CollaborationSession, UserAwareness, LayerPresence, CursorPosition } from "../../../types/websocket.types";

/**
 * Интерфейс для управления WebSocket соединениями
 */
export interface IWebSocketManager {
  initialize(httpServer: HTTPServer): void;
  getIO(): SocketIOServer;
  registerConnection(socketId: string, socket: Socket): void;
  unregisterConnection(socketId: string): void;
  emitToSocket(socketId: string, event: CollaborationEvent): boolean;
  emitToProject(projectId: string, event: CollaborationEvent, excludeSocketId?: string): void;
  joinProjectRoom(socketId: string, projectId: string): void;
  leaveProjectRoom(socketId: string, projectId: string): void;
  getProjectClientsCount(projectId: string): Promise<number>;
}

/**
 * Интерфейс для управления сессиями коллаборации
 */
export interface ICollaborationService {
  createSession(userId: string, userName: string, projectId: string, socketId: string): Promise<CollaborationSession>;
  endSession(sessionId: string): Promise<void>;
  updateAwareness(sessionId: string, awareness: Partial<UserAwareness>): Promise<void>;
  getProjectSessions(projectId: string): Promise<CollaborationSession[]>;
  getSessionBySocketId(socketId: string): Promise<CollaborationSession | undefined>;
  cleanupInactiveSessions(timeoutMs?: number): void;
}

/**
 * Интерфейс для обработчиков событий
 */
export interface IEventHandler {
  handle(socket: Socket, event: CollaborationEvent): Promise<void>;
}

/**
 * Интерфейс для контроллера WebSocket
 */
export interface IWebSocketController {
  setupConnectionHandlers(): void;
  stopCleanupJob(): void;
}

/**
 * Интерфейс для Presence Service
 */
export interface IPresenceService {
  updateCursor(
    userId: string,
    userName: string,
    projectId: string,
    timelineId: string,
    layerId: string,
    cursor: CursorPosition,
    sessionId: string,
    userPicture?: string
  ): Promise<void>;
  
  leaveLayer(userId: string, projectId: string, timelineId: string, layerId: string): Promise<void>;
  getLayerPresence(projectId: string, timelineId: string, layerId: string): LayerPresence[];
  getUserColor(userId: string): string;
  cleanup(): void;
  stop(): void;
} 