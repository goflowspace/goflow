import 'reflect-metadata';
import { Socket } from 'socket.io';
import { OperationEventHandler } from '../../../../../src/modules/websocket/event-handlers/operation.handler';
import { IWebSocketManager } from '../../../../../src/modules/websocket/interfaces/websocket.interfaces';
import { ISyncService } from '../../../../../src/modules/sync/interfaces/sync.interfaces';
import { CollaborationEvent, CollaborationEventType } from '../../../../../src/types/websocket.types';

describe('OperationEventHandler', () => {
  let handler: OperationEventHandler;
  let mockWsManager: jest.Mocked<IWebSocketManager>;
  let mockSyncService: jest.Mocked<ISyncService>;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(() => {
    // Создаем моки
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

    mockSyncService = {
      processOperationsBatch: jest.fn(),
      getGraphSnapshot: jest.fn(),
      getOperationsSince: jest.fn()
    };

    mockSocket = {
      id: 'socket1',
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn()
    } as any;

    // Создаем экземпляр handler
    handler = new OperationEventHandler(mockWsManager, mockSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('должен обрабатывать событие OPERATION_BROADCAST', async () => {
      const operation = {
        id: 'op1',
        type: 'CREATE_NODE',
        version: 1,
        deviceId: 'device1',
        data: { nodeId: 'node1' }
      };

      const event: CollaborationEvent = {
        type: CollaborationEventType.OPERATION_BROADCAST,
        payload: { operation },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      // Мокаем успешный ответ от SyncService
      mockSyncService.processOperationsBatch.mockResolvedValue({
        success: true,
        syncVersion: 2,
        appliedOperations: ['op1']
      });

      await handler.handle(mockSocket, event);

      // Проверяем вызов SyncService
      expect(mockSyncService.processOperationsBatch).toHaveBeenCalledWith(
        'user1',
        'project1',
        {
          operations: [operation],
          projectId: 'project1',
          lastSyncVersion: 1,
          deviceId: 'device1'
        }
      );

      // Проверяем отправку результата обратно отправителю
      expect(mockSocket.emit).toHaveBeenCalledWith('operation_result', {
        operationId: 'op1',
        success: true,
        syncVersion: 2,
        conflicts: undefined
      });

      // Проверяем broadcast другим участникам
      expect(mockWsManager.emitToProject).toHaveBeenCalledWith(
        'project1',
        expect.objectContaining({
          type: CollaborationEventType.OPERATION_BROADCAST,
          payload: expect.objectContaining({
            operation: expect.objectContaining({
              ...operation,
              version: 2
            }),
            syncVersion: 2
          })
        }),
        'socket1'
      );
    });

    it('должен обрабатывать ошибки SyncService', async () => {
      const operation = {
        id: 'op1',
        type: 'CREATE_NODE',
        version: 1,
        deviceId: 'device1',
        data: { nodeId: 'node1' }
      };

      const event: CollaborationEvent = {
        type: CollaborationEventType.OPERATION_BROADCAST,
        payload: { operation },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      // Мокаем ошибку от SyncService
      mockSyncService.processOperationsBatch.mockRejectedValue(
        new Error('Sync error')
      );

      await handler.handle(mockSocket, event);

      // Проверяем отправку ошибки отправителю
      expect(mockSocket.emit).toHaveBeenCalledWith('operation_error', {
        operationId: 'op1',
        error: 'Sync error'
      });

      // Проверяем что broadcast не был отправлен
      expect(mockWsManager.emitToProject).not.toHaveBeenCalled();
    });

    it('должен обрабатывать конфликты', async () => {
      const operation = {
        id: 'op1',
        type: 'CREATE_NODE',
        version: 1,
        deviceId: 'device1',
        data: { nodeId: 'node1' }
      };

      const event: CollaborationEvent = {
        type: CollaborationEventType.OPERATION_BROADCAST,
        payload: { operation },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      // Мокаем ответ с конфликтами от SyncService
      mockSyncService.processOperationsBatch.mockResolvedValue({
        success: false,
        syncVersion: 3,
        appliedOperations: [],
        conflicts: [operation],
        serverOperations: []
      });

      await handler.handle(mockSocket, event);

      // Проверяем вызов SyncService
      expect(mockSyncService.processOperationsBatch).toHaveBeenCalledWith(
        'user1',
        'project1',
        {
          operations: [operation],
          projectId: 'project1',
          lastSyncVersion: 1,
          deviceId: 'device1'
        }
      );

      // Проверяем отправку результата с конфликтами
      expect(mockSocket.emit).toHaveBeenCalledWith('operation_result', {
        operationId: 'op1',
        success: false,
        syncVersion: 3,
        conflicts: [operation]
      });

      // Проверяем broadcast с обновленной версией
      expect(mockWsManager.emitToProject).toHaveBeenCalledWith(
        'project1',
        expect.objectContaining({
          type: CollaborationEventType.OPERATION_BROADCAST,
          payload: expect.objectContaining({
            operation: expect.objectContaining({
              ...operation,
              version: 3
            }),
            syncVersion: 3
          })
        }),
        'socket1'
      );
    });

    it('должен выбрасывать ошибку для неподдерживаемых типов событий', async () => {
      const event: CollaborationEvent = {
        type: CollaborationEventType.CURSOR_MOVE, // Неподдерживаемый тип
        payload: {},
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      await handler.handle(mockSocket, event);

      // Проверяем отправку ошибки
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Unsupported operation event type: CURSOR_MOVE',
        eventType: 'CURSOR_MOVE'
      });
    });

    it('должен обрабатывать операции без версии', async () => {
      const operation = {
        id: 'op1',
        type: 'CREATE_NODE',
        deviceId: 'device1',
        data: { nodeId: 'node1' }
        // Нет version
      };

      const event: CollaborationEvent = {
        type: CollaborationEventType.OPERATION_BROADCAST,
        payload: { operation },
        userId: 'user1',
        projectId: 'project1',
        timestamp: Date.now()
      };

      mockSyncService.processOperationsBatch.mockResolvedValue({
        success: true,
        syncVersion: 1,
        appliedOperations: ['op1']
      });

      await handler.handle(mockSocket, event);

      // Проверяем что используется версия 0 по умолчанию
      expect(mockSyncService.processOperationsBatch).toHaveBeenCalledWith(
        'user1',
        'project1',
        {
          operations: [operation],
          projectId: 'project1',
          lastSyncVersion: 0,
          deviceId: 'device1'
        }
      );
    });
  });
}); 