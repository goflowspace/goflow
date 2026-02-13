import * as dbService from '../dbService';
import {StorageServiceImpl} from '../implementations/storageServiceImpl';
import {Operation} from '../interfaces/syncInterfaces';

// Мокаем dbService
jest.mock('../dbService');

const mockedDbService = dbService as jest.Mocked<typeof dbService>;

describe('StorageServiceImpl', () => {
  let storageService: StorageServiceImpl;
  let mockOperationQueue: any;
  const testProjectId = 'test-project-id';

  beforeEach(() => {
    jest.clearAllMocks();
    storageService = new StorageServiceImpl(testProjectId);

    // Создаем полный мок для db.operationQueue
    mockOperationQueue = {
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0)
    };

    // Мокаем db
    mockedDbService.db = {
      operationQueue: mockOperationQueue
    } as any;
  });

  describe('getPendingOperations', () => {
    it('должен получать и преобразовывать операции из dbService', async () => {
      const mockOperations = [
        {
          id: 1,
          projectId: testProjectId,
          operation: {
            type: 'node.added',
            projectId: testProjectId,
            timelineId: 'timeline-1',
            payload: {nodeId: 'node-1'},
            timestamp: 1234567890,
            layerId: 'layer-1'
          },
          timestamp: 1234567890
        },
        {
          id: 2,
          projectId: testProjectId,
          operation: {
            type: 'node.updated',
            projectId: testProjectId,
            timelineId: 'timeline-1',
            payload: {nodeId: 'node-2'},
            timestamp: 1234567891
          },
          timestamp: 1234567891
        }
      ];

      mockOperationQueue.toArray.mockResolvedValue(mockOperations);

      const result = await storageService.getPendingOperations(10);

      expect(mockOperationQueue.where).toHaveBeenCalledWith('projectId');
      expect(mockOperationQueue.equals).toHaveBeenCalledWith(testProjectId);
      expect(mockOperationQueue.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        id: 1,
        type: 'node.added',
        projectId: testProjectId,
        timelineId: 'timeline-1',
        payload: {nodeId: 'node-1'},
        timestamp: 1234567890,
        layerId: 'layer-1',
        deviceId: 'unknown-device'
      });

      expect(result[1]).toEqual({
        id: 2,
        type: 'node.updated',
        projectId: testProjectId,
        timelineId: 'timeline-1',
        payload: {nodeId: 'node-2'},
        timestamp: 1234567891,
        layerId: undefined,
        deviceId: 'unknown-device'
      });
    });

    it('должен обрабатывать операции с неполными данными', async () => {
      const mockRawOperations = [
        {
          id: 1,
          projectId: testProjectId,
          operation: {
            someOtherData: 'test'
          }
        }
      ];

      mockOperationQueue.toArray.mockResolvedValue(mockRawOperations);

      const result = await storageService.getPendingOperations(5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        type: 'unknown',
        projectId: testProjectId,
        timelineId: 'base-timeline',
        payload: {someOtherData: 'test'},
        timestamp: expect.any(Number),
        layerId: undefined,
        deviceId: 'unknown-device'
      });
    });

    it('должен обрабатывать пустой массив операций', async () => {
      mockOperationQueue.toArray.mockResolvedValue([]);

      const result = await storageService.getPendingOperations(10);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('должен прокидывать ошибки от dbService', async () => {
      const error = new Error('Database error');
      mockOperationQueue.toArray.mockRejectedValue(error);

      await expect(storageService.getPendingOperations(10)).rejects.toThrow('Database error');
    });

    it('должен логировать ошибки в консоль', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Database error');
      mockOperationQueue.toArray.mockRejectedValue(error);

      try {
        await storageService.getPendingOperations(10);
      } catch (e) {
        // Ожидаем ошибку
      }

      expect(consoleSpy).toHaveBeenCalledWith('Failed to get pending operations:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('deleteOperations', () => {
    it('должен удалять операции через dbService', async () => {
      const operationIds = [1, 2, 3];
      mockedDbService.deleteOperations.mockResolvedValue();

      await storageService.deleteOperations(operationIds);

      expect(mockedDbService.deleteOperations).toHaveBeenCalledWith(operationIds);
    });

    it('должен обрабатывать пустой массив ID', async () => {
      const operationIds: number[] = [];
      mockedDbService.deleteOperations.mockResolvedValue();

      await storageService.deleteOperations(operationIds);

      expect(mockedDbService.deleteOperations).toHaveBeenCalledWith([]);
    });

    it('должен прокидывать ошибки от dbService', async () => {
      const error = new Error('Delete error');
      mockedDbService.deleteOperations.mockRejectedValue(error);

      await expect(storageService.deleteOperations([1, 2])).rejects.toThrow('Delete error');
    });

    it('должен логировать ошибки в консоль', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Delete error');
      mockedDbService.deleteOperations.mockRejectedValue(error);

      try {
        await storageService.deleteOperations([1, 2]);
      } catch (e) {
        // Ожидаем ошибку
      }

      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete operations:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('getOperationsCount', () => {
    it('должен возвращать количество операций', async () => {
      mockOperationQueue.count.mockResolvedValue(3);

      const result = await storageService.getOperationsCount();

      expect(result).toBe(3);
      expect(mockOperationQueue.where).toHaveBeenCalledWith('projectId');
      expect(mockOperationQueue.equals).toHaveBeenCalledWith(testProjectId);
      expect(mockOperationQueue.count).toHaveBeenCalled();
    });

    it('должен возвращать 0 для пустого списка операций', async () => {
      mockOperationQueue.count.mockResolvedValue(0);

      const result = await storageService.getOperationsCount();

      expect(result).toBe(0);
    });

    it('должен возвращать 0 при ошибке', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Count error');
      mockOperationQueue.count.mockRejectedValue(error);

      const result = await storageService.getOperationsCount();

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get operations count:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('mapToOperation (private method testing through public methods)', () => {
    it('должен правильно мапить операции с полными данными', async () => {
      const mockRawOperation = {
        id: 5,
        projectId: testProjectId,
        operation: {
          type: 'edge.added',
          projectId: 'test-project',
          timelineId: 'test-timeline',
          payload: {edgeId: 'edge-1', from: 'node-1', to: 'node-2'},
          timestamp: 9876543210,
          layerId: 'test-layer'
        }
      };

      mockOperationQueue.toArray.mockResolvedValue([mockRawOperation]);

      const result = await storageService.getPendingOperations(1);

      expect(result[0]).toEqual({
        id: 5,
        type: 'edge.added',
        projectId: 'test-project',
        timelineId: 'test-timeline',
        payload: {edgeId: 'edge-1', from: 'node-1', to: 'node-2'},
        timestamp: 9876543210,
        layerId: 'test-layer',
        deviceId: 'unknown-device'
      });
    });

    it('должен применять значения по умолчанию для отсутствующих полей', async () => {
      const mockRawOperation = {
        id: 10,
        projectId: testProjectId,
        // Отсутствуют обязательные поля
        customField: 'custom-value'
      };

      mockOperationQueue.toArray.mockResolvedValue([mockRawOperation]);

      const result = await storageService.getPendingOperations(1);

      expect(result[0]).toEqual({
        id: 10,
        type: 'unknown',
        projectId: testProjectId,
        timelineId: 'base-timeline',
        payload: {
          id: 10,
          projectId: testProjectId,
          customField: 'custom-value'
        },
        timestamp: expect.any(Number),
        layerId: undefined,
        deviceId: 'unknown-device'
      });

      // Проверяем, что timestamp был сгенерирован
      expect(result[0].timestamp).toBeGreaterThan(Date.now() - 1000);
    });

    it('должен использовать весь объект как payload если нет отдельного payload', async () => {
      const mockRawOperation = {
        id: 15,
        projectId: testProjectId,
        type: 'custom.operation',
        timelineId: 'timeline-x',
        timestamp: 1111111111,
        customData: {foo: 'bar'},
        moreData: 123
      };

      mockOperationQueue.toArray.mockResolvedValue([mockRawOperation]);

      const result = await storageService.getPendingOperations(1);

      expect(result[0].payload).toEqual({
        id: 15,
        projectId: testProjectId,
        type: 'custom.operation',
        timelineId: 'timeline-x',
        timestamp: 1111111111,
        customData: {foo: 'bar'},
        moreData: 123
      });
    });
  });
});
