import 'reflect-metadata';
import { SyncService } from '../../../../src/modules/sync/sync.service';
import { ISyncRepository } from '../../../../src/modules/sync/interfaces/sync.interfaces';
import { 
  OperationBatch, 
  Operation, 
  GraphSnapshot
} from '../../../../src/modules/sync/sync.types';
import * as syncUtils from '../../../../src/modules/sync/sync.utils';

// Мокаем модуль sync.utils
jest.mock('../../../../src/modules/sync/sync.utils');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockSyncRepository: jest.Mocked<ISyncRepository>;
  let mockApplyOperationsToSnapshot: jest.MockedFunction<typeof syncUtils.applyOperationsToSnapshot>;

  beforeEach(() => {
    // Создаем мок репозитория
    mockSyncRepository = {
      getProjectSnapshot: jest.fn(),
      checkUserAccess: jest.fn(),
      getOperationsAfterVersion: jest.fn(),
      getProjectVersion: jest.fn(),
      saveChangesInTransaction: jest.fn()
    };

    // Создаем экземпляр сервиса
    syncService = new SyncService(mockSyncRepository);

    // Настраиваем мок для applyOperationsToSnapshot
    mockApplyOperationsToSnapshot = syncUtils.applyOperationsToSnapshot as jest.MockedFunction<typeof syncUtils.applyOperationsToSnapshot>;
    mockApplyOperationsToSnapshot.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOperationsBatch', () => {
    const userId = 'user1';
    const projectId = 'project1';
    const mockSnapshot: GraphSnapshot = {
      timelines: {
        timeline1: {
          layers: {},
          metadata: {},
          variables: []
        }
      }
    };
    const mockOperations: Operation[] = [
      {
        id: 'op1',
        type: 'UPDATE_NODE',
        timelineId: 'timeline1',
        layerId: 'layer1',
        payload: { x: 100 },
        timestamp: Date.now(),
        deviceId: 'device1'
      }
    ];
    const validBatch: OperationBatch = {
      operations: mockOperations,
      projectId,
      lastSyncVersion: 5,
      deviceId: 'device1'
    };

    it('должен успешно обрабатывать операции', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getProjectSnapshot.mockResolvedValue({
        snapshot: mockSnapshot,
        version: 5
      });
      
      const newSnapshot = { ...mockSnapshot, _lastModified: Date.now() };
      mockApplyOperationsToSnapshot.mockReturnValue(newSnapshot);

      const result = await syncService.processOperationsBatch(userId, projectId, validBatch);

      expect(mockSyncRepository.checkUserAccess).toHaveBeenCalledWith(userId, projectId);
      expect(mockSyncRepository.getProjectSnapshot).toHaveBeenCalledWith(projectId);
      expect(mockApplyOperationsToSnapshot).toHaveBeenCalledWith(mockSnapshot, mockOperations);
      expect(mockSyncRepository.saveChangesInTransaction).toHaveBeenCalledWith(
        projectId,
        newSnapshot,
        expect.arrayContaining([
          expect.objectContaining({
            ...mockOperations[0],
            userId,
            deviceId: 'device1'
          })
        ]),
        6
      );
      expect(result).toEqual({
        success: true,
        syncVersion: 6,
        appliedOperations: ['op1']
      });
    });

    it('должен выбрасывать ошибку при отсутствии доступа', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(false);

      await expect(
        syncService.processOperationsBatch(userId, projectId, validBatch)
      ).rejects.toThrow('Access denied');

      expect(mockSyncRepository.getProjectSnapshot).not.toHaveBeenCalled();
    });

    it('должен возвращать конфликты если клиент отстал', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getProjectSnapshot.mockResolvedValue({
        snapshot: mockSnapshot,
        version: 10 // Сервер впереди
      });

      const serverOperations: Operation[] = [
        {
          id: 'server-op1',
          type: 'UPDATE_NODE',
          timelineId: 'timeline1',
          layerId: 'layer1',
          payload: { y: 200 },
          timestamp: Date.now() - 1000,
          deviceId: 'device2'
        }
      ];
      mockSyncRepository.getOperationsAfterVersion.mockResolvedValue(serverOperations);

      const result = await syncService.processOperationsBatch(userId, projectId, validBatch);

      expect(mockSyncRepository.getOperationsAfterVersion).toHaveBeenCalledWith(projectId, 5);
      expect(mockApplyOperationsToSnapshot).not.toHaveBeenCalled();
      expect(mockSyncRepository.saveChangesInTransaction).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        syncVersion: 10,
        appliedOperations: [],
        conflicts: mockOperations,
        serverOperations
      });
    });

    it('должен обрабатывать ошибки репозитория', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getProjectSnapshot.mockRejectedValue(new Error('Database error'));

      await expect(
        syncService.processOperationsBatch(userId, projectId, validBatch)
      ).rejects.toThrow('Database error');
    });

    it('должен обрабатывать ошибки при сохранении', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getProjectSnapshot.mockResolvedValue({
        snapshot: mockSnapshot,
        version: 5
      });
      mockApplyOperationsToSnapshot.mockReturnValue(mockSnapshot);
      mockSyncRepository.saveChangesInTransaction.mockRejectedValue(new Error('Save failed'));

      await expect(
        syncService.processOperationsBatch(userId, projectId, validBatch)
      ).rejects.toThrow('Save failed');
    });
  });

  describe('getGraphSnapshot', () => {
    const userId = 'user1';
    const projectId = 'project1';
    const mockSnapshot: GraphSnapshot = {
      timelines: {
        timeline1: {
          layers: {},
          metadata: {},
          variables: []
        }
      }
    };

    it('должен успешно возвращать снимок', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getProjectSnapshot.mockResolvedValue({
        snapshot: mockSnapshot,
        version: 5
      });

      const result = await syncService.getGraphSnapshot(userId, projectId);

      expect(mockSyncRepository.checkUserAccess).toHaveBeenCalledWith(userId, projectId);
      expect(mockSyncRepository.getProjectSnapshot).toHaveBeenCalledWith(projectId);
      expect(result).toEqual({
        version: 5,
        timestamp: expect.any(Number),
        snapshot: mockSnapshot
      });
    });

    it('должен выбрасывать ошибку при отсутствии доступа', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(false);

      await expect(
        syncService.getGraphSnapshot(userId, projectId)
      ).rejects.toThrow('Access denied');

      expect(mockSyncRepository.getProjectSnapshot).not.toHaveBeenCalled();
    });

    it('должен обрабатывать ошибки репозитория', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getProjectSnapshot.mockRejectedValue(new Error('Database error'));

      await expect(
        syncService.getGraphSnapshot(userId, projectId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getOperationsSince', () => {
    const userId = 'user1';
    const projectId = 'project1';
    const sinceVersion = 3;
    const mockOperations: Operation[] = [
      {
        id: 'op1',
        type: 'UPDATE_NODE',
        timelineId: 'timeline1',
        layerId: 'layer1',
        payload: { x: 100 },
        timestamp: Date.now(),
        deviceId: 'device1'
      },
      {
        id: 'op2',
        type: 'CREATE_NODE',
        timelineId: 'timeline1',
        layerId: 'layer1',
        payload: { y: 200 },
        timestamp: Date.now() + 1000,
        deviceId: 'device2'
      }
    ];

    it('должен успешно возвращать операции', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getOperationsAfterVersion.mockResolvedValue(mockOperations);
      mockSyncRepository.getProjectVersion.mockResolvedValue(10);

      const result = await syncService.getOperationsSince(userId, projectId, sinceVersion);

      expect(mockSyncRepository.checkUserAccess).toHaveBeenCalledWith(userId, projectId);
      expect(mockSyncRepository.getOperationsAfterVersion).toHaveBeenCalledWith(projectId, sinceVersion);
      expect(mockSyncRepository.getProjectVersion).toHaveBeenCalledWith(projectId);
      expect(result).toEqual({
        operations: mockOperations,
        currentVersion: 10
      });
    });

    it('должен выбрасывать ошибку при отсутствии доступа', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(false);

      await expect(
        syncService.getOperationsSince(userId, projectId, sinceVersion)
      ).rejects.toThrow('Access denied');

      expect(mockSyncRepository.getOperationsAfterVersion).not.toHaveBeenCalled();
      expect(mockSyncRepository.getProjectVersion).not.toHaveBeenCalled();
    });

    it('должен возвращать пустой массив если нет новых операций', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getOperationsAfterVersion.mockResolvedValue([]);
      mockSyncRepository.getProjectVersion.mockResolvedValue(3);

      const result = await syncService.getOperationsSince(userId, projectId, sinceVersion);

      expect(result).toEqual({
        operations: [],
        currentVersion: 3
      });
    });

    it('должен обрабатывать ошибки репозитория', async () => {
      mockSyncRepository.checkUserAccess.mockResolvedValue(true);
      mockSyncRepository.getOperationsAfterVersion.mockRejectedValue(new Error('Database error'));

      await expect(
        syncService.getOperationsSince(userId, projectId, sinceVersion)
      ).rejects.toThrow('Database error');
    });
  });
}); 