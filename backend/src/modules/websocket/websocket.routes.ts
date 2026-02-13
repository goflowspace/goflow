import "reflect-metadata";
import { Router } from "express";
import { WebSocketSystem } from "./di-container.inversify";
import { WEBSOCKET_TYPES } from "./di.types";
import { ICollaborationService, IWebSocketManager } from "./interfaces/websocket.interfaces";
import { authenticateJWT } from "@middlewares/auth.middleware";
import { asyncHandler } from "@middlewares/asyncHandler";
import { CollaborationEventType } from "../../types/websocket.types";

const router = Router();

// Используем синглтон WebSocket системы для получения сервисов
const wsSystem = WebSocketSystem.getInstance();
const collaborationService = wsSystem.get<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService);
const wsManager = wsSystem.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);

/**
 * Получение активных участников проекта
 */
router.get('/projects/:projectId/participants', authenticateJWT, asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // TODO: Проверить права доступа к проекту
  
  const sessions = await collaborationService.getProjectSessions(projectId);
  const participants = sessions.map(session => ({
    userId: session.userId,
    userName: session.awareness.userName,
    cursor: session.awareness.cursor,
    selection: session.awareness.selection,
    joinedAt: session.joinedAt,
    lastActivity: session.lastActivity
  }));

  res.json({
    success: true,
    data: {
      participants,
      count: participants.length
    }
  });
}));

/**
 * Получение статистики WebSocket соединений
 */
router.get('/stats', authenticateJWT, asyncHandler(async (_req, res) => {
  const totalConnections = wsManager.getIO().engine.clientsCount;
  
  res.json({
    success: true,
    data: {
      totalConnections,
      timestamp: Date.now()
    }
  });
}));

/**
 * Тестовый endpoint для проверки WebSocket соединений (AI события)
 * POST /api/websocket/test-ai-event
 */
router.post('/test-ai-event', asyncHandler(async (req, res) => {
  const { projectId } = req.body;
  
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  console.log(`🧪 Testing AI event emission for project: ${projectId}`);

  // Получаем WebSocket manager
  const wsSystem = WebSocketSystem.getInstance();
  const wsManager = wsSystem.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);

  // УЛУЧШЕНИЕ: Проверяем наличие сокетов в комнате перед отправкой
  const io = wsManager.getIO();
  const room = `project:${projectId}`;
  const roomSockets = io.sockets.adapter.rooms.get(room);
  const socketCount = roomSockets ? roomSockets.size : 0;
  
  console.log(`📊 Room ${room} has ${socketCount} connected sockets for AI event`);
  
  if (socketCount === 0) {
    console.warn(`⚠️ No sockets in room ${room}! Cannot send AI event.`);
    return res.status(400).json({ 
      error: 'No active connections in project room', 
      room,
      socketsInRoom: socketCount,
      message: 'Please ensure you have joined the project room before sending AI events'
    });
  }

  // Создаем тестовое AI событие
  const testEvent = {
    type: CollaborationEventType.AI_PIPELINE_PROGRESS,
    payload: {
      requestId: 'test-' + Date.now(),
      status: 'running',
      currentStep: 'test_step',
      stepName: 'Тестовый шаг',
      stepDescription: 'Проверка WebSocket соединения',
      progress: 50,
      startTime: new Date(),
      estimatedTimeRemaining: 30000
    },
    userId: 'test-user',
    projectId,
    timestamp: Date.now()
  };

  // Отправляем событие всем участникам проекта
  wsManager.emitToProject(projectId, testEvent);

  console.log(`✅ Test AI event sent successfully for project: ${projectId}`);
  
  res.json({ 
    success: true, 
    message: 'Test AI event sent successfully',
    event: testEvent,
    socketsInRoom: socketCount
  });
}));

/**
 * Простой тест WebSocket - отправка базового события
 */
router.post('/test-simple', asyncHandler(async (req, res) => {
  const { projectId } = req.body;
  
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  console.log(`🧪 Testing SIMPLE WebSocket event for project: ${projectId}`);

  // Получаем WebSocket manager
  const wsSystem = WebSocketSystem.getInstance();
  const wsManager = wsSystem.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);

  // Получаем IO instance для прямой отправки
  const io = wsManager.getIO();
  const room = `project:${projectId}`;
  
  // УЛУЧШЕНИЕ: Проверяем наличие сокетов в комнате перед отправкой
  const roomSockets = io.sockets.adapter.rooms.get(room);
  const socketCount = roomSockets ? roomSockets.size : 0;
  
  console.log(`📊 Room ${room} has ${socketCount} connected sockets`);
  
  if (socketCount === 0) {
    console.warn(`⚠️ No sockets in room ${room}! Cannot send event.`);
    return res.status(400).json({ 
      error: 'No active connections in project room', 
      room,
      socketsInRoom: socketCount,
      message: 'Please ensure you have joined the project room before sending events'
    });
  }
  
  console.log(`📡 Sending simple 'test_message' to room ${room} (${socketCount} sockets)`);
  
  // Отправляем простое событие напрямую
  io.to(room).emit('test_message', { 
    message: 'Hello from WebSocket!', 
    timestamp: Date.now(),
    projectId 
  });
  
  console.log(`✅ Simple test event sent to room ${room}`);
  
  res.json({ 
    success: true, 
    message: 'Simple test event sent successfully',
    room,
    eventName: 'test_message',
    socketsInRoom: socketCount,
    socketIds: roomSockets ? Array.from(roomSockets) : []
  });
}));

export default router;