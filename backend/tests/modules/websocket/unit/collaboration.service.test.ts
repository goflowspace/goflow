import 'reflect-metadata';
import { CollaborationService } from '../../../../src/modules/websocket/collaboration.service.inversify';
import { IWebSocketManager } from '../../../../src/modules/websocket/interfaces/websocket.interfaces';
import { UserAwareness, CollaborationEventType } from '../../../../src/types/websocket.types';

// Мокаем crypto.randomUUID
let sessionCounter = 0;
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => `test-session-id-${++sessionCounter}`)
}));

describe('CollaborationService', () => {
  let collaborationService: CollaborationService;
  let mockWsManager: jest.Mocked<IWebSocketManager>;

  beforeEach(() => {
    // Сбрасываем все моки
    jest.clearAllMocks();
    // Сбрасываем счетчик сессий
    sessionCounter = 0;

    // Создаем мок WebSocketManager
    mockWsManager = {
      initialize: jest.fn(),
      getIO: jest.fn(),
      registerConnection: jest.fn(),
      unregisterConnection: jest.fn(),
      emitToSocket: jest.fn(),
      emitToProject: jest.fn(),
      joinProjectRoom: jest.fn(),
      leaveProjectRoom: jest.fn(),
      getProjectClientsCount: jest.fn()
    };

    // Создаем экземпляр сервиса
    collaborationService = new CollaborationService(mockWsManager);
  });

  describe('createSession', () => {
    it('должен создавать новую сессию коллаборации', async () => {
      const userId = 'user1';
      const userName = 'Test User';
      const projectId = 'project1';
      const socketId = 'socket1';

      const session = await collaborationService.createSession(userId, userName, projectId, socketId);

      expect(session).toMatchObject({
        id: expect.stringMatching(/^test-session-id-\d+$/),
        userId,
        projectId,
        socketId,
        awareness: {
          userId,
          userName,
          lastSeen: expect.any(Number)
        },
        joinedAt: expect.any(Number),
        lastActivity: expect.any(Number)
      });

      // Проверяем, что был отправлен broadcast о подключении
      expect(mockWsManager.emitToProject).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          type: CollaborationEventType.USER_JOIN,
          userId,
          projectId
        }),
        socketId
      );
    });

    it('должен возвращать существующую сессию для того же сокета', async () => {
      const userId = 'user1';
      const userName = 'Test User';
      const projectId = 'project1';
      const socketId = 'socket1';

      const session1 = await collaborationService.createSession(userId, userName, projectId, socketId);
      const session2 = await collaborationService.createSession(userId, userName, projectId, socketId);

      expect(session1).toBe(session2);
      // Broadcast должен быть отправлен только один раз
      expect(mockWsManager.emitToProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('endSession', () => {
    it('должен завершать сессию и отправлять уведомление', async () => {
      const userId = 'user1';
      const userName = 'Test User';
      const projectId = 'project1';
      const socketId = 'socket1';

      const session = await collaborationService.createSession(userId, userName, projectId, socketId);
      await collaborationService.endSession(session.id);

      // Проверяем, что сессия удалена
      const sessions = collaborationService.getProjectSessions(projectId);
      expect(sessions).toHaveLength(0);

      // Проверяем broadcast об отключении
      expect(mockWsManager.emitToProject).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          type: CollaborationEventType.USER_LEAVE,
          userId,
          projectId
        }),
        socketId
      );
    });

    it('не должен выбрасывать ошибку для несуществующей сессии', async () => {
      await expect(collaborationService.endSession('non-existent')).resolves.not.toThrow();
    });
  });

  describe('updateAwareness', () => {
    it('должен обновлять awareness и отправлять уведомление', async () => {
      const userId = 'user1';
      const userName = 'Test User';
      const projectId = 'project1';
      const socketId = 'socket1';

      const session = await collaborationService.createSession(userId, userName, projectId, socketId);
      
      const newAwareness: Partial<UserAwareness> = {
        cursor: {
          x: 100,
          y: 200,
          timelineId: 'timeline1',
          layerId: 'layer1'
        }
      };

      await collaborationService.updateAwareness(session.id, newAwareness);

      // Проверяем broadcast обновления
      expect(mockWsManager.emitToProject).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          type: CollaborationEventType.AWARENESS_UPDATE,
          payload: expect.objectContaining({
            awareness: expect.objectContaining({
              cursor: newAwareness.cursor
            })
          })
        }),
        socketId
      );
    });

    it('не должен отправлять уведомление для несуществующей сессии', async () => {
      const initialCallCount = mockWsManager.emitToProject.mock.calls.length;
      
      await collaborationService.updateAwareness('non-existent', {});
      
      expect(mockWsManager.emitToProject).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('getProjectSessions', () => {
    it('должен возвращать все активные сессии проекта', async () => {
      const projectId = 'project1';
      
      // Создаем несколько сессий
      await collaborationService.createSession('user1', 'User 1', projectId, 'socket1');
      await collaborationService.createSession('user2', 'User 2', projectId, 'socket2');
      await collaborationService.createSession('user3', 'User 3', 'project2', 'socket3'); // другой проект

      const sessions = collaborationService.getProjectSessions(projectId);
      
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.userId)).toEqual(['user1', 'user2']);
    });

    it('должен возвращать пустой массив для проекта без сессий', () => {
      const sessions = collaborationService.getProjectSessions('empty-project');
      expect(sessions).toEqual([]);
    });
  });

  describe('getSessionBySocketId', () => {
    it('должен находить сессию по socketId', async () => {
      const socketId = 'socket1';
      const createdSession = await collaborationService.createSession('user1', 'User 1', 'project1', socketId);
      
      const foundSession = collaborationService.getSessionBySocketId(socketId);
      
      expect(foundSession).toBe(createdSession);
    });

    it('должен возвращать undefined для несуществующего socketId', () => {
      const session = collaborationService.getSessionBySocketId('non-existent');
      expect(session).toBeUndefined();
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('должен удалять неактивные сессии', async () => {
      jest.useFakeTimers();
      
      const projectId = 'project1';
      await collaborationService.createSession('user1', 'User 1', projectId, 'socket1');
      
      // Продвигаем время на 6 минут
      jest.advanceTimersByTime(6 * 60 * 1000);
      
      // Создаем новую активную сессию
      await collaborationService.createSession('user2', 'User 2', projectId, 'socket2');
      
      // Очищаем неактивные сессии (таймаут по умолчанию 5 минут)
      collaborationService.cleanupInactiveSessions();
      
      const sessions = collaborationService.getProjectSessions(projectId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe('user2');
      
      jest.useRealTimers();
    });

    it('должен использовать кастомный таймаут', async () => {
      jest.useFakeTimers();
      
      const projectId = 'project1';
      await collaborationService.createSession('user1', 'User 1', projectId, 'socket1');
      
      // Продвигаем время на 2 минуты
      jest.advanceTimersByTime(2 * 60 * 1000);
      
      // Очищаем с таймаутом 1 минута
      collaborationService.cleanupInactiveSessions(60 * 1000);
      
      const sessions = collaborationService.getProjectSessions(projectId);
      expect(sessions).toHaveLength(0);
      
      jest.useRealTimers();
    });

    it('не должен удалять активные сессии', async () => {
      jest.useFakeTimers();
      
      const projectId = 'project1';
      const session = await collaborationService.createSession('user1', 'User 1', projectId, 'socket1');
      
      // Продвигаем время на 4 минуты
      jest.advanceTimersByTime(4 * 60 * 1000);
      
      // Обновляем awareness (обновляет lastActivity)
      await collaborationService.updateAwareness(session.id, { cursor: { x: 100, y: 100, timelineId: 't1', layerId: 'l1' } });
      
      // Продвигаем еще на 4 минуты (всего 8 минут с создания, но 4 с последней активности)
      jest.advanceTimersByTime(4 * 60 * 1000);
      
      // Очищаем неактивные сессии
      collaborationService.cleanupInactiveSessions();
      
      const sessions = collaborationService.getProjectSessions(projectId);
      expect(sessions).toHaveLength(1);
      
      jest.useRealTimers();
    });
  });
}); 