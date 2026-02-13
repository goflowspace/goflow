import 'reflect-metadata';
import { AwarenessEventHandler } from '../../../../../src/modules/websocket/event-handlers/awareness.handler';
import { ICollaborationService } from '../../../../../src/modules/websocket/interfaces/websocket.interfaces';
import { CollaborationEvent, CollaborationEventType, CollaborationSession } from '../../../../../src/types/websocket.types';
import { Socket } from 'socket.io';

describe('AwarenessEventHandler', () => {
  let handler: AwarenessEventHandler;
  let mockCollaborationService: jest.Mocked<ICollaborationService>;
  let mockSocket: jest.Mocked<Socket>;
  let mockSession: CollaborationSession;

  beforeEach(() => {
    // Создаем мок сессии
    mockSession = {
      id: 'session1',
      userId: 'user1',
      projectId: 'project1',
      socketId: 'socket1',
      awareness: {
        userId: 'user1',
        userName: 'Test User',
        lastSeen: Date.now()
      },
      joinedAt: Date.now(),
      lastActivity: Date.now()
    };

    // Создаем мок CollaborationService
    mockCollaborationService = {
      createSession: jest.fn(),
      endSession: jest.fn(),
      updateAwareness: jest.fn(),
      getProjectSessions: jest.fn(),
      getSessionBySocketId: jest.fn().mockReturnValue(mockSession),
      cleanupInactiveSessions: jest.fn()
    };

    // Создаем мок сокета
    mockSocket = {
      id: 'socket1',
      emit: jest.fn()
    } as any;

    // Создаем обработчик
    handler = new AwarenessEventHandler(mockCollaborationService);
  });

  describe('handle', () => {
    it('должен обрабатывать событие CURSOR_MOVE', async () => {
      const event: CollaborationEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: {
          cursor: {
            x: 100,
            y: 200,
            timelineId: 'timeline1',
            layerId: 'layer1'
          }
        },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      await handler.handle(mockSocket, event);

      expect(mockCollaborationService.updateAwareness).toHaveBeenCalledWith(
        mockSession.id,
        { cursor: event.payload.cursor }
      );
    });

    it('должен обрабатывать событие SELECTION_CHANGE', async () => {
      const event: CollaborationEvent = {
        type: CollaborationEventType.SELECTION_CHANGE,
        payload: {
          selection: {
            nodeIds: ['node1', 'node2'],
            timelineId: 'timeline1',
            layerId: 'layer1'
          }
        },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      await handler.handle(mockSocket, event);

      expect(mockCollaborationService.updateAwareness).toHaveBeenCalledWith(
        mockSession.id,
        { selection: event.payload.selection }
      );
    });

    it('должен игнорировать события без активной сессии', async () => {
      mockCollaborationService.getSessionBySocketId.mockReturnValue(undefined);

      const event: CollaborationEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: { cursor: { x: 100, y: 200, timelineId: 't1', layerId: 'l1' } },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      await handler.handle(mockSocket, event);

      expect(mockCollaborationService.updateAwareness).not.toHaveBeenCalled();
    });

    it('должен отправлять ошибку при невалидном событии', async () => {
      const invalidEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: {},
        // отсутствует userId
        projectId: 'project1',
        timestamp: Date.now()
      } as any;

      await handler.handle(mockSocket, invalidEvent);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Event must have userId',
        eventType: CollaborationEventType.CURSOR_MOVE
      });
    });

    it('должен отправлять ошибку для неподдерживаемого типа события', async () => {
      const event: CollaborationEvent = {
        type: CollaborationEventType.OPERATION_BROADCAST, // не awareness событие
        payload: {},
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      await handler.handle(mockSocket, event);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Unsupported awareness event type: OPERATION_BROADCAST',
        eventType: CollaborationEventType.OPERATION_BROADCAST
      });
    });
  });

  describe('validateEvent', () => {
    it('должен проходить валидацию для корректного события', async () => {
      const event: CollaborationEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: { cursor: { x: 100, y: 200, timelineId: 't1', layerId: 'l1' } },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      await expect(handler.handle(mockSocket, event)).resolves.not.toThrow();
    });

    it('должен выбрасывать ошибку для события без type', async () => {
      const event = {
        payload: {},
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      } as any;

      await handler.handle(mockSocket, event);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Event must have type',
        eventType: undefined
      });
    });

    it('должен выбрасывать ошибку для события без payload', async () => {
      const event = {
        type: CollaborationEventType.CURSOR_MOVE,
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      } as any;

      await handler.handle(mockSocket, event);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Event must have payload',
        eventType: CollaborationEventType.CURSOR_MOVE
      });
    });

    it('должен выбрасывать ошибку для события с невалидным timestamp', async () => {
      const event = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: {},
        userId: 'user1',
        projectId: 'project1',
        timestamp: 'invalid'
      } as any;

      await handler.handle(mockSocket, event);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Event must have valid timestamp',
        eventType: CollaborationEventType.CURSOR_MOVE
      });
    });
  });
}); 