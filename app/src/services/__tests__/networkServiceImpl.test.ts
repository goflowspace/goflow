import {api} from '../api';
import {NetworkServiceImpl} from '../implementations/networkServiceImpl';
import {IOperationBatch, ISyncResult, Operation} from '../interfaces/syncInterfaces';

// Мокаем fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Мокаем api
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

// Мокаем navigator
Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true
  },
  writable: true
});

describe('NetworkServiceImpl', () => {
  let networkService: NetworkServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    networkService = new NetworkServiceImpl();
    (global.navigator as any).onLine = true;
  });

  const createMockBatch = (): IOperationBatch => ({
    id: 'test-batch-1',
    operations: [
      {
        id: 1,
        type: 'node.added',
        projectId: 'test-project',
        timelineId: 'timeline-1',
        payload: {nodeId: 'node-1'},
        timestamp: Date.now(),
        layerId: 'layer-1',
        deviceId: 'test-device'
      },
      {
        id: 2,
        type: 'node.updated',
        projectId: 'test-project',
        timelineId: 'timeline-1',
        payload: {nodeId: 'node-2'},
        timestamp: Date.now(),
        deviceId: 'test-device'
      }
    ],
    timestamp: Date.now(),
    projectId: 'test-project',
    deviceId: 'test-device',
    lastSyncVersion: 5
  });

  describe('isOnline', () => {
    it('должен возвращать true когда navigator.onLine = true', () => {
      (global.navigator as any).onLine = true;
      expect(networkService.isOnline()).toBe(true);
    });

    it('должен возвращать false когда navigator.onLine = false', () => {
      (global.navigator as any).onLine = false;
      expect(networkService.isOnline()).toBe(false);
    });
  });

  describe('sendOperations', () => {
    it('должен успешно отправлять операции и преобразовывать ответ', async () => {
      const batch = createMockBatch();
      // Мокаем ответ в backend формате (не ISyncResult)
      const mockBackendResponse = {
        success: true,
        syncVersion: 10,
        appliedOperations: ['1', '2'],
        errors: [],
        conflicts: [],
        serverOperations: [
          {
            id: 999,
            type: 'node.deleted',
            projectId: 'test-project',
            timelineId: 'timeline-1',
            layerId: 'layer-1',
            payload: {nodeId: 'node-3'},
            timestamp: 1234567890,
            deviceId: 'server-device'
          }
        ]
      };

      mockedApi.syncOperations.mockResolvedValue(mockBackendResponse);

      const result = await networkService.sendOperations(batch);

      expect(mockedApi.syncOperations).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: 'node.added',
              timelineId: 'timeline-1',
              layerId: 'layer-1',
              payload: {nodeId: 'node-1'},
              deviceId: 'test-device',
              timestamp: expect.any(Number)
            }),
            expect.objectContaining({
              id: expect.any(String),
              type: 'node.updated',
              timelineId: 'timeline-1',
              layerId: 'base-layer',
              payload: {nodeId: 'node-2'},
              deviceId: 'test-device',
              timestamp: expect.any(Number)
            })
          ]),
          projectId: 'test-project',
          lastSyncVersion: 5,
          deviceId: 'test-device'
        })
      );

      expect(result).toEqual({
        success: true,
        processedOperations: [1, 2],
        syncVersion: 10,
        errors: [],
        conflicts: [],
        serverOperations: [
          {
            id: 999,
            type: 'node.deleted',
            projectId: 'test-project',
            timelineId: 'timeline-1',
            payload: {nodeId: 'node-3'},
            timestamp: 1234567890,
            layerId: 'layer-1',
            deviceId: 'server-device'
          }
        ]
      });
    });

    it('должен обрабатывать операции без ID, создавая временные ID', async () => {
      const batch: IOperationBatch = {
        ...createMockBatch(),
        operations: [
          {
            type: 'node.added',
            projectId: 'test-project',
            timelineId: 'timeline-1',
            payload: {nodeId: 'node-1'},
            timestamp: Date.now(),
            deviceId: 'test-device'
          }
        ]
      };

      const mockBackendResponse = {
        success: true,
        syncVersion: 10,
        appliedOperations: []
      };

      mockedApi.syncOperations.mockResolvedValue(mockBackendResponse);

      await networkService.sendOperations(batch);

      expect(mockedApi.syncOperations).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: 'node.added',
              timelineId: 'timeline-1',
              layerId: 'base-layer',
              payload: {nodeId: 'node-1'},
              deviceId: 'test-device',
              timestamp: expect.any(Number)
            })
          ]),
          projectId: 'test-project',
          deviceId: 'test-device'
        })
      );
    });

    it('должен фильтровать временные ID из обработанных операций', async () => {
      const batch = createMockBatch();
      const mockBackendResponse = {
        success: true,
        syncVersion: 10,
        appliedOperations: ['1', 'temp_123456_abc', '2', 'temp_789012_def']
      };

      mockedApi.syncOperations.mockResolvedValue(mockBackendResponse);

      const result = await networkService.sendOperations(batch);

      expect(result.processedOperations).toEqual([1, 2]);
    });

    it('должен обрабатывать некорректные ID в processedOperations', async () => {
      const batch = createMockBatch();
      const mockBackendResponse = {
        success: true,
        syncVersion: 10,
        appliedOperations: ['1', 'invalid-id', '2', 'NaN', '3']
      };

      mockedApi.syncOperations.mockResolvedValue(mockBackendResponse);

      const result = await networkService.sendOperations(batch);

      expect(result.processedOperations).toEqual([1, 2, 3]);
    });

    it('должен обрабатывать ответ без processedOperations', async () => {
      const batch = createMockBatch();
      const mockBackendResponse = {
        success: true,
        syncVersion: 10,
        appliedOperations: []
      };

      mockedApi.syncOperations.mockResolvedValue(mockBackendResponse);

      const result = await networkService.sendOperations(batch);

      expect(result.processedOperations).toEqual([]);
    });

    it('должен обрабатывать серверные операции', async () => {
      const batch = createMockBatch();
      const mockBackendResponse = {
        success: true,
        syncVersion: 10,
        appliedOperations: ['1'],
        serverOperations: [
          {
            id: 999,
            type: 'node.deleted',
            projectId: 'test-project',
            timelineId: 'timeline-2',
            layerId: 'layer-2',
            payload: {nodeId: 'node-999'},
            timestamp: 9876543210,
            deviceId: 'server-device'
          },
          {
            id: 998,
            type: 'edge.added',
            projectId: 'test-project',
            timelineId: 'timeline-3',
            payload: {edgeId: 'edge-1'},
            timestamp: 1111111111,
            deviceId: 'server-device'
          }
        ]
      };

      mockedApi.syncOperations.mockResolvedValue(mockBackendResponse);

      const result = await networkService.sendOperations(batch);

      expect(result.serverOperations).toEqual([
        {
          id: 999,
          type: 'node.deleted',
          projectId: 'test-project',
          timelineId: 'timeline-2',
          payload: {nodeId: 'node-999'},
          timestamp: 9876543210,
          layerId: 'layer-2',
          deviceId: 'server-device'
        },
        {
          id: 998,
          type: 'edge.added',
          projectId: 'test-project',
          timelineId: 'timeline-3',
          payload: {edgeId: 'edge-1'},
          timestamp: 1111111111,
          layerId: undefined,
          deviceId: 'server-device'
        }
      ]);
    });

    it('должен обрабатывать сетевые ошибки', async () => {
      const batch = createMockBatch();
      const networkError = new Error('Network error');

      mockedApi.syncOperations.mockRejectedValue(networkError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await networkService.sendOperations(batch);

      expect(result).toEqual({
        success: false,
        processedOperations: [],
        errors: ['Network error']
      });

      expect(consoleSpy).toHaveBeenCalledWith('Network sync failed:', networkError);
      consoleSpy.mockRestore();
    });

    it('должен обрабатывать строковые ошибки', async () => {
      const batch = createMockBatch();

      mockedApi.syncOperations.mockRejectedValue('String error');

      const result = await networkService.sendOperations(batch);

      expect(result).toEqual({
        success: false,
        processedOperations: [],
        errors: ['String error']
      });
    });

    it('должен обрабатывать объекты ошибок с message', async () => {
      const batch = createMockBatch();
      const errorObject = {message: 'Object error message', code: 500};

      mockedApi.syncOperations.mockRejectedValue(errorObject);

      const result = await networkService.sendOperations(batch);

      expect(result).toEqual({
        success: false,
        processedOperations: [],
        errors: ['Object error message']
      });
    });

    it('должен обрабатывать неопределенные типы ошибок', async () => {
      const batch = createMockBatch();

      mockedApi.syncOperations.mockRejectedValue(null);

      const result = await networkService.sendOperations(batch);

      expect(result).toEqual({
        success: false,
        processedOperations: [],
        errors: ['Unknown network error']
      });
    });
  });

  describe('convertFromBackendFormat', () => {
    it('должен правильно преобразовывать ответ от бэкенда', async () => {
      const batch = createMockBatch();
      const backendResponse = {
        success: true,
        syncVersion: 15,
        appliedOperations: ['1', '2'],
        errors: ['Warning message'],
        conflicts: [{operationId: '1', type: 'CONFLICT'}],
        serverOperations: [
          {
            id: 100,
            type: 'server.operation',
            projectId: 'test-project',
            timelineId: 'server-timeline',
            layerId: 'server-layer',
            payload: {data: 'server-data'},
            timestamp: 1111111111,
            deviceId: 'server-device'
          }
        ]
      };

      mockedApi.syncOperations.mockResolvedValue(backendResponse);

      const result = await networkService.sendOperations(batch);

      expect(result).toEqual({
        success: true,
        processedOperations: [1, 2],
        syncVersion: 15,
        errors: ['Warning message'],
        conflicts: [{operationId: '1', type: 'CONFLICT'}],
        serverOperations: [
          {
            id: 100,
            type: 'server.operation',
            projectId: 'test-project',
            timelineId: 'server-timeline',
            payload: {data: 'server-data'},
            timestamp: 1111111111,
            layerId: 'server-layer',
            deviceId: 'server-device'
          }
        ]
      });
    });

    it('должен обрабатывать ответ без необязательных полей', async () => {
      const batch = createMockBatch();
      const minimalResponse = {
        success: false,
        appliedOperations: []
      };

      mockedApi.syncOperations.mockResolvedValue(minimalResponse);

      const result = await networkService.sendOperations(batch);

      expect(result).toEqual({
        success: false,
        processedOperations: [],
        syncVersion: undefined,
        errors: [],
        conflicts: undefined,
        serverOperations: undefined
      });
    });
  });
});
