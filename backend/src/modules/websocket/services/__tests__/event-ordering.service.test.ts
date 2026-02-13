import "reflect-metadata";
import { EventOrderingService } from "../event-ordering.service";
import { ISyncService } from "../../../sync/interfaces/sync.interfaces";
import { Operation, SyncResult } from "../../../sync/sync.types";

/**
 * Тесты для EventOrderingService
 * Проверяем что сервис действительно предотвращает race conditions
 */
describe('EventOrderingService', () => {
  let eventOrderingService: EventOrderingService;
  let mockSyncService: jest.Mocked<ISyncService>;

  beforeEach(() => {
    // Создаем мок SyncService
    mockSyncService = {
      processOperationsBatch: jest.fn(),
      getGraphSnapshot: jest.fn(),
      getOperationsSince: jest.fn()
    };

    // Создаем сервис с мок зависимостью
    eventOrderingService = new EventOrderingService(mockSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Sequential Operation Processing', () => {
    it('should process operations in sequence for the same project', async () => {
      const projectId = 'test-project-1';
      const userId = 'test-user-1';
      
      const operation1: Operation = {
        id: 'op1',
        type: 'CREATE_NODE',
        timelineId: 'base-timeline',
        layerId: 'root',
        payload: { node: { id: 'node1', type: 'narrative' } },
        timestamp: Date.now(),
        deviceId: 'device1'
      };

      const operation2: Operation = {
        id: 'op2',
        type: 'CREATE_NODE',
        timelineId: 'base-timeline',
        layerId: 'root',
        payload: { node: { id: 'node2', type: 'narrative' } },
        timestamp: Date.now(),
        deviceId: 'device1'
      };

      const mockResult: SyncResult = {
        success: true,
        syncVersion: 1,
        appliedOperations: ['op1']
      };

      // Настраиваем мок: первый вызов возвращает результат, второй тоже
      mockSyncService.processOperationsBatch
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ ...mockResult, syncVersion: 2, appliedOperations: ['op2'] });

      // Запускаем обе операции одновременно
      const [result1, result2] = await Promise.all([
        eventOrderingService.processOperation(projectId, userId, operation1),
        eventOrderingService.processOperation(projectId, userId, operation2)
      ]);

      // Проверяем что обе операции выполнились успешно
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Критически важно: операции должны быть выполнены последовательно
      expect(mockSyncService.processOperationsBatch).toHaveBeenCalledTimes(2);
      
      // Первый вызов должен быть с operation1
      expect(mockSyncService.processOperationsBatch.mock.calls[0][2].operations[0].id).toBe('op1');
      
      // Второй вызов должен быть с operation2
      expect(mockSyncService.processOperationsBatch.mock.calls[1][2].operations[0].id).toBe('op2');
    });

    it('should process operations in parallel for different projects', async () => {
      const project1 = 'test-project-1';
      const project2 = 'test-project-2';
      const userId = 'test-user-1';
      
      const operation1: Operation = {
        id: 'op1',
        type: 'CREATE_NODE',
        timelineId: 'base-timeline',
        layerId: 'root',
        payload: { node: { id: 'node1', type: 'narrative' } },
        timestamp: Date.now(),
        deviceId: 'device1'
      };

      const operation2: Operation = {
        id: 'op2',
        type: 'CREATE_NODE',
        timelineId: 'base-timeline',
        layerId: 'root',
        payload: { node: { id: 'node2', type: 'narrative' } },
        timestamp: Date.now(),
        deviceId: 'device1'
      };

      const mockResult: SyncResult = {
        success: true,
        syncVersion: 1,
        appliedOperations: []
      };

      mockSyncService.processOperationsBatch.mockResolvedValue(mockResult);

      // Запускаем операции для разных проектов одновременно
      const startTime = Date.now();
      const [result1, result2] = await Promise.all([
        eventOrderingService.processOperation(project1, userId, operation1),
        eventOrderingService.processOperation(project2, userId, operation2)
      ]);
      const endTime = Date.now();

      // Операции должны выполниться параллельно (быстро)
      expect(endTime - startTime).toBeLessThan(100); // Меньше 100мс
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Обе операции должны быть вызваны
      expect(mockSyncService.processOperationsBatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle operation errors gracefully', async () => {
      const projectId = 'test-project-1';
      const userId = 'test-user-1';
      
      const operation: Operation = {
        id: 'failing-op',
        type: 'CREATE_NODE',
        timelineId: 'base-timeline',
        layerId: 'root',
        payload: { node: { id: 'node1', type: 'narrative' } },
        timestamp: Date.now(),
        deviceId: 'device1'
      };

      // Мок возвращает ошибку
      mockSyncService.processOperationsBatch.mockRejectedValue(new Error('Sync failed'));

      const result = await eventOrderingService.processOperation(projectId, userId, operation);

      // Ошибка должна быть обработана и возвращен неуспешный результат
      expect(result.success).toBe(false);
      // В EventOrderingService ошибки логируются, но SyncResult может не иметь errors поля
    });

    it('should not break the queue when one operation fails', async () => {
      const projectId = 'test-project-1';
      const userId = 'test-user-1';
      
      const failingOperation: Operation = {
        id: 'failing-op',
        type: 'CREATE_NODE',
        timelineId: 'base-timeline',
        layerId: 'root',
        payload: { node: { id: 'node1', type: 'narrative' } },
        timestamp: Date.now(),
        deviceId: 'device1'
      };

      const successOperation: Operation = {
        id: 'success-op',
        type: 'CREATE_NODE',
        timelineId: 'base-timeline',
        layerId: 'root',
        payload: { node: { id: 'node2', type: 'narrative' } },
        timestamp: Date.now(),
        deviceId: 'device1'
      };

      const mockSuccessResult: SyncResult = {
        success: true,
        syncVersion: 1,
        appliedOperations: ['success-op']
      };

      // Первый вызов падает, второй успешен
      mockSyncService.processOperationsBatch
        .mockRejectedValueOnce(new Error('First operation failed'))
        .mockResolvedValueOnce(mockSuccessResult);

      // Запускаем операции последовательно
      const [failResult, successResult] = await Promise.all([
        eventOrderingService.processOperation(projectId, userId, failingOperation),
        eventOrderingService.processOperation(projectId, userId, successOperation)
      ]);

      // Первая операция должна быть неуспешной
      expect(failResult.success).toBe(false);
      
      // Вторая операция должна быть успешной (очередь не сломалась)
      expect(successResult.success).toBe(true);
      
      expect(mockSyncService.processOperationsBatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Statistics', () => {
    it('should provide queue statistics', async () => {
      const stats = eventOrderingService.getQueueStats();
      
      expect(stats).toHaveProperty('totalProjects');
      expect(stats).toHaveProperty('totalQueuedOperations');
      expect(stats).toHaveProperty('projectQueues');
      
      expect(typeof stats.totalProjects).toBe('number');
      expect(typeof stats.totalQueuedOperations).toBe('number');
      expect(typeof stats.projectQueues).toBe('object');
    });
  });
});
