import 'reflect-metadata';
import { Request, Response } from 'express';
import { SyncController } from '../../../../src/modules/sync/sync.controller.inversify';
import { ISyncService, ISyncRepository } from '../../../../src/modules/sync/interfaces/sync.interfaces';
import { 
  OperationBatch, 
  SyncResult, 
  SnapshotResult, 
  OperationsResult
} from '../../../../src/modules/sync/sync.types';

describe('SyncController', () => {
  let syncController: SyncController;
  let mockSyncService: jest.Mocked<ISyncService>;
  let mockSyncRepository: jest.Mocked<ISyncRepository>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Создаем моки для Response
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };

    // Создаем мок SyncService
    mockSyncService = {
      processOperationsBatch: jest.fn(),
      getGraphSnapshot: jest.fn(),
      getOperationsSince: jest.fn()
    };

    // Создаем мок SyncRepository
    mockSyncRepository = {
      checkUserAccess: jest.fn(),
      // Моки для других методов репозитория, если они понадобятся
    } as any;

    // Создаем экземпляр контроллера
    syncController = new SyncController(mockSyncService, mockSyncRepository);

    // Базовый мок Request
    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: { id: 'test-user-id' }
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOperations', () => {
    const validBatch: OperationBatch = {
      operations: [
        {
          id: 'op1',
          type: 'UPDATE_NODE',
          timelineId: 'timeline1',
          layerId: 'layer1',
          payload: { x: 100 },
          timestamp: Date.now(),
          deviceId: 'device1'
        }
      ],
      projectId: 'project1',
      lastSyncVersion: 1,
      deviceId: 'device1'
    };

    it('должен успешно обрабатывать операции', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.body = validBatch;

      const mockResult: SyncResult = {
        success: true,
        syncVersion: 2,
        appliedOperations: ['op1']
      };

      mockSyncService.processOperationsBatch.mockResolvedValue(mockResult);

      await syncController.processOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(mockSyncService.processOperationsBatch).toHaveBeenCalledWith(
        'test-user-id',
        'project1',
        validBatch
      );
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it('должен возвращать 401 для неавторизованного пользователя', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { projectId: 'project1' };
      mockRequest.body = validBatch;

      await syncController.processOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      });
      expect(mockSyncService.processOperationsBatch).not.toHaveBeenCalled();
    });

    it('должен возвращать 400 если нет projectId', async () => {
      mockRequest.params = {};
      mockRequest.body = validBatch;

      await syncController.processOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Project ID is required'
      });
    });

    it('должен возвращать 400 если нет operations', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.body = { deviceId: 'device1' };

      await syncController.processOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Operations array is required'
      });
    });

    it('должен возвращать 400 если нет deviceId', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.body = { operations: [] };

      await syncController.processOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Device ID is required'
      });
    });

    it('должен возвращать 403 при ошибке доступа', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.body = validBatch;

      mockSyncService.processOperationsBatch.mockRejectedValue(
        new Error('Access denied')
      );

      await syncController.processOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });

    it('должен возвращать 404 если проект не найден', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.body = validBatch;

      mockSyncService.processOperationsBatch.mockRejectedValue(
        new Error('Project not found')
      );

      await syncController.processOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found'
      });
    });

    it('должен возвращать 500 при неизвестной ошибке', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.body = validBatch;

      mockSyncService.processOperationsBatch.mockRejectedValue(
        new Error('Unknown error')
      );

      await syncController.processOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('getSnapshot', () => {
    it('должен успешно возвращать снимок', async () => {
      mockRequest.params = { projectId: 'project1' };

      // Мокируем проверку доступа
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);

      const mockSnapshot: SnapshotResult = {
        version: 5,
        timestamp: Date.now(),
        snapshot: {
          timelines: {
            timeline1: {
              layers: {},
              metadata: {},
              variables: []
            }
          }
        }
      };

      mockSyncService.getGraphSnapshot.mockResolvedValue(mockSnapshot);

      await syncController.getSnapshot(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(mockSyncService.getGraphSnapshot).toHaveBeenCalledWith(
        'test-user-id',
        'project1'
      );
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        ...mockSnapshot
      });
    });

    it('должен возвращать 401 для неавторизованного пользователя', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { projectId: 'project1' };

      await syncController.getSnapshot(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      });
      expect(mockSyncService.getGraphSnapshot).not.toHaveBeenCalled();
    });

    it('должен возвращать 403 при ошибке доступа', async () => {
      mockRequest.params = { projectId: 'project1' };

      // Мокируем проверку доступа
      mockSyncRepository.checkUserAccess.mockResolvedValue(false);

      await syncController.getSnapshot(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });

    it('должен возвращать 404 если проект не найден', async () => {
      mockRequest.params = { projectId: 'project1' };

      // Мокируем проверку доступа
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);

      mockSyncService.getGraphSnapshot.mockRejectedValue(
        new Error('Project not found')
      );

      await syncController.getSnapshot(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found'
      });
    });

    it('должен возвращать 500 при неизвестной ошибке', async () => {
      mockRequest.params = { projectId: 'project1' };

      // Мокируем проверку доступа
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);

      mockSyncService.getGraphSnapshot.mockRejectedValue(
        new Error('Unknown error')
      );

      await syncController.getSnapshot(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('getOperations', () => {
    it('должен успешно возвращать операции', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.query = { since: '3' };

      const mockOperations: OperationsResult = {
        operations: [
          {
            id: 'op1',
            type: 'UPDATE_NODE',
            timelineId: 'timeline1',
            layerId: 'layer1',
            payload: {},
            timestamp: Date.now(),
            deviceId: 'device1'
          }
        ],
        currentVersion: 5
      };

      mockSyncService.getOperationsSince.mockResolvedValue(mockOperations);

      await syncController.getOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(mockSyncService.getOperationsSince).toHaveBeenCalledWith(
        'test-user-id',
        'project1',
        3
      );
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        ...mockOperations
      });
    });

    it('должен использовать версию 0 по умолчанию', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.query = {};

      const mockOperations: OperationsResult = {
        operations: [],
        currentVersion: 5
      };

      mockSyncService.getOperationsSince.mockResolvedValue(mockOperations);

      await syncController.getOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(mockSyncService.getOperationsSince).toHaveBeenCalledWith(
        'test-user-id',
        'project1',
        0
      );
    });

    it('должен возвращать 401 для неавторизованного пользователя', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { projectId: 'project1' };
      mockRequest.query = { since: '3' };

      await syncController.getOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      });
      expect(mockSyncService.getOperationsSince).not.toHaveBeenCalled();
    });

    it('должен возвращать 403 при ошибке доступа', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.query = { since: '3' };

      mockSyncService.getOperationsSince.mockRejectedValue(
        new Error('Access denied')
      );

      await syncController.getOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });

    it('должен возвращать 500 при неизвестной ошибке', async () => {
      mockRequest.params = { projectId: 'project1' };
      mockRequest.query = { since: '3' };

      mockSyncService.getOperationsSince.mockRejectedValue(
        new Error('Unknown error')
      );

      await syncController.getOperations(
        mockRequest as Request, 
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });
  });
}); 