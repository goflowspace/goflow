import 'reflect-metadata';
import { WebSocketManager } from '../../../../src/modules/websocket/websocket.manager.inversify';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { CollaborationEvent, CollaborationEventType } from '../../../../src/types/websocket.types';

// Мокаем socket.io
jest.mock('socket.io');

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockHttpServer: HTTPServer;
  let mockIO: jest.Mocked<SocketIOServer>;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(() => {
    // Сбрасываем все моки
    jest.clearAllMocks();

    // Создаем экземпляр менеджера
    wsManager = new WebSocketManager();

    // Создаем мок HTTP сервера
    mockHttpServer = {} as HTTPServer;

    // Создаем мок Socket.IO сервера
    mockIO = {
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map()
        }
      }
    } as any;

    // Создаем мок сокета
    mockSocket = {
      id: 'test-socket-id',
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnThis()
    } as any;

    // Настраиваем мок конструктора SocketIOServer
    (SocketIOServer as jest.MockedClass<typeof SocketIOServer>).mockImplementation(() => mockIO);
  });

  describe('initialize', () => {
    it('должен инициализировать WebSocket сервер с правильными настройками', () => {
      wsManager.initialize(mockHttpServer);

      expect(SocketIOServer).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });
    });
  });

  describe('getIO', () => {
    it('должен возвращать IO инстанс после инициализации', () => {
      wsManager.initialize(mockHttpServer);
      const io = wsManager.getIO();
      
      expect(io).toBe(mockIO);
    });

    it('должен выбрасывать ошибку, если сервер не инициализирован', () => {
      expect(() => wsManager.getIO()).toThrow('WebSocket server not initialized');
    });
  });

  describe('registerConnection', () => {
    it('должен регистрировать новое подключение', () => {
      const socketId = 'test-socket-id';
      
      wsManager.registerConnection(socketId, mockSocket);
      
      // Проверяем через другие методы, что сокет зарегистрирован
      const event: CollaborationEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: {},
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };
      
      const result = wsManager.emitToSocket(socketId, event);
      expect(result).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith(event.type, event);
    });
  });

  describe('unregisterConnection', () => {
    it('должен удалять подключение', () => {
      const socketId = 'test-socket-id';
      
      // Сначала регистрируем
      wsManager.registerConnection(socketId, mockSocket);
      
      // Затем удаляем
      wsManager.unregisterConnection(socketId);
      
      // Проверяем, что сокет больше не доступен
      const event: CollaborationEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: {},
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };
      
      const result = wsManager.emitToSocket(socketId, event);
      expect(result).toBe(false);
    });
  });

  describe('emitToSocket', () => {
    it('должен отправлять событие конкретному сокету', () => {
      const socketId = 'test-socket-id';
      const event: CollaborationEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: { x: 100, y: 200 },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };
      
      wsManager.registerConnection(socketId, mockSocket);
      const result = wsManager.emitToSocket(socketId, event);
      
      expect(result).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith(event.type, event);
    });

    it('должен возвращать false для несуществующего сокета', () => {
      const event: CollaborationEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: {},
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };
      
      const result = wsManager.emitToSocket('non-existent', event);
      expect(result).toBe(false);
    });
  });

  describe('emitToProject', () => {
    beforeEach(() => {
      wsManager.initialize(mockHttpServer);
    });

    it('должен отправлять событие всем участникам проекта', () => {
      const projectId = 'project1';
      const event: CollaborationEvent = {
        type: CollaborationEventType.OPERATION_BROADCAST,
        payload: {},
        userId: 'user1',
        projectId,
        timestamp: Date.now()
      };
      
      wsManager.emitToProject(projectId, event);
      
      expect(mockIO.to).toHaveBeenCalledWith(`project:${projectId}`);
      expect(mockIO.emit).toHaveBeenCalledWith(event.type, event);
    });

    it('должен исключать указанный сокет при отправке', () => {
      const projectId = 'project1';
      const excludeSocketId = 'socket-to-exclude';
      const event: CollaborationEvent = {
        type: CollaborationEventType.OPERATION_BROADCAST,
        payload: {},
        userId: 'user1',
        projectId,
        timestamp: Date.now()
      };
      
      wsManager.registerConnection(excludeSocketId, mockSocket);
      wsManager.emitToProject(projectId, event, excludeSocketId);
      
      expect(mockSocket.to).toHaveBeenCalledWith(`project:${projectId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith(event.type, event);
    });
  });

  describe('joinProjectRoom', () => {
    it('должен добавлять сокет в комнату проекта', () => {
      const socketId = 'test-socket-id';
      const projectId = 'project1';
      
      wsManager.registerConnection(socketId, mockSocket);
      wsManager.joinProjectRoom(socketId, projectId);
      
      expect(mockSocket.join).toHaveBeenCalledWith(`project:${projectId}`);
    });

    it('не должен выбрасывать ошибку для несуществующего сокета', () => {
      expect(() => {
        wsManager.joinProjectRoom('non-existent', 'project1');
      }).not.toThrow();
    });
  });

  describe('leaveProjectRoom', () => {
    it('должен удалять сокет из комнаты проекта', () => {
      const socketId = 'test-socket-id';
      const projectId = 'project1';
      
      wsManager.registerConnection(socketId, mockSocket);
      wsManager.leaveProjectRoom(socketId, projectId);
      
      expect(mockSocket.leave).toHaveBeenCalledWith(`project:${projectId}`);
    });

    it('не должен выбрасывать ошибку для несуществующего сокета', () => {
      expect(() => {
        wsManager.leaveProjectRoom('non-existent', 'project1');
      }).not.toThrow();
    });
  });

  describe('getProjectClientsCount', () => {
    beforeEach(() => {
      wsManager.initialize(mockHttpServer);
    });

    it('должен возвращать количество клиентов в проекте', async () => {
      const projectId = 'project1';
      const roomName = `project:${projectId}`;
      const mockRoom = new Set(['socket1', 'socket2', 'socket3']);
      
      mockIO.sockets.adapter.rooms.set(roomName, mockRoom);
      
      const count = await wsManager.getProjectClientsCount(projectId);
      expect(count).toBe(3);
    });

    it('должен возвращать 0 для несуществующей комнаты', async () => {
      const count = await wsManager.getProjectClientsCount('non-existent');
      expect(count).toBe(0);
    });

    it('должен возвращать 0, если сервер не инициализирован', async () => {
      const newManager = new WebSocketManager();
      const count = await newManager.getProjectClientsCount('project1');
      expect(count).toBe(0);
    });
  });
}); 