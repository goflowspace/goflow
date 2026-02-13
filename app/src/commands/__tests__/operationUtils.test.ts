import {addOperation} from '../../services/dbService';
import {Operation, generateAndSaveOperation, generateOperation, saveOperationToQueue} from '../operationUtils';

// Мокируем dbService
jest.mock('../../services/dbService', () => ({
  addOperation: jest.fn()
}));

const mockAddOperation = addOperation as jest.MockedFunction<typeof addOperation>;

// Мокируем localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('operationUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Мокируем Date.now для предсказуемых тестов
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    // Мокируем console для предотвращения шума в тестах
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    // Мокируем localStorage для возврата существующего deviceId
    localStorageMock.getItem.mockReturnValue('test-device-id');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateOperation', () => {
    it('should create a valid operation object with all required fields', () => {
      const result = generateOperation('node.added', {nodeId: 'test-node', data: 'test'}, 'project-123', 'timeline-456', 'layer-789');

      expect(result).toEqual({
        type: 'node.added',
        projectId: 'project-123',
        timelineId: 'timeline-456',
        payload: {nodeId: 'test-node', data: 'test'},
        timestamp: 1234567890,
        layerId: 'layer-789',
        deviceId: 'test-device-id'
      });
    });

    it('should use default layerId "root" when not provided', () => {
      const result = generateOperation('node.moved', {nodeId: 'test'}, 'project-123', 'timeline-456');

      expect(result.layerId).toBe('root');
    });

    it('should generate new deviceId when not in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = generateOperation('node.added', {nodeId: 'test'}, 'project-123', 'timeline-456');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('flow_device_id', expect.stringMatching(/^device_\d+_[a-z0-9]+$/));
      expect(result.deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
    });

    it('should throw error when projectId is empty string', () => {
      expect(() => {
        generateOperation('node.added', {test: 'data'}, '', 'timeline-456', 'layer-789');
      }).toThrow('No projectId provided for operation generation');
    });

    it('should throw error when projectId is not provided', () => {
      expect(() => {
        generateOperation('node.added', {test: 'data'}, null as any, 'timeline-456', 'layer-789');
      }).toThrow('No projectId provided for operation generation');
    });

    it('should throw error when timelineId is empty string', () => {
      expect(() => {
        generateOperation('node.added', {test: 'data'}, 'project-123', '', 'layer-789');
      }).toThrow('No timelineId provided for operation generation');
    });

    it('should throw error when timelineId is not provided', () => {
      expect(() => {
        generateOperation('node.added', {test: 'data'}, 'project-123', null as any, 'layer-789');
      }).toThrow('No timelineId provided for operation generation');
    });

    it('should preserve complex payload objects', () => {
      const complexPayload = {
        nodeId: 'test-node',
        oldData: {title: 'Old Title', text: 'Old Text'},
        newData: {title: 'New Title', text: 'New Text'},
        metadata: {
          timestamp: 123456,
          user: 'test-user',
          nested: {
            deep: {
              value: 'test'
            }
          }
        }
      };

      const result = generateOperation('node.updated', complexPayload, 'project-123', 'timeline-456', 'layer-789');

      expect(result.payload).toEqual(complexPayload);
    });
  });

  describe('saveOperationToQueue', () => {
    it('should call addOperation with the operation object', async () => {
      const operation: Operation = {
        type: 'node.added',
        projectId: 'project-123',
        timelineId: 'timeline-456',
        payload: {nodeId: 'test'},
        timestamp: 1234567890,
        layerId: 'layer-789',
        deviceId: 'test-device-id'
      };

      mockAddOperation.mockResolvedValueOnce(undefined);

      await saveOperationToQueue(operation);

      expect(mockAddOperation).toHaveBeenCalledWith(operation);
      expect(console.log).toHaveBeenCalledWith('Operation saved to queue:', 'node.added');
    });

    it('should handle and log errors from addOperation', async () => {
      const operation: Operation = {
        type: 'node.added',
        projectId: 'project-123',
        timelineId: 'timeline-456',
        payload: {nodeId: 'test'},
        timestamp: 1234567890,
        layerId: 'layer-789',
        deviceId: 'test-device-id'
      };

      const error = new Error('Database error');
      mockAddOperation.mockRejectedValueOnce(error);

      await saveOperationToQueue(operation);

      expect(mockAddOperation).toHaveBeenCalledWith(operation);
      expect(console.error).toHaveBeenCalledWith('Failed to save operation to queue:', error);
    });

    it('should not throw errors even if addOperation fails', async () => {
      const operation: Operation = {
        type: 'node.added',
        projectId: 'project-123',
        timelineId: 'timeline-456',
        payload: {nodeId: 'test'},
        timestamp: 1234567890,
        layerId: 'layer-789',
        deviceId: 'test-device-id'
      };

      mockAddOperation.mockRejectedValueOnce(new Error('Database error'));

      // Не должно выбрасывать исключение
      await expect(saveOperationToQueue(operation)).resolves.toBeUndefined();
    });
  });

  describe('generateAndSaveOperation', () => {
    it('should generate and save operation successfully', () => {
      mockAddOperation.mockResolvedValueOnce(undefined);

      generateAndSaveOperation('choice.added', {choiceId: 'choice-123', text: 'Test choice'}, 'project-123', 'timeline-456', 'layer-789');

      // Проверяем, что операция была создана и сохранена
      expect(mockAddOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'choice.added',
          projectId: 'project-123',
          timelineId: 'timeline-456',
          payload: {choiceId: 'choice-123', text: 'Test choice'},
          timestamp: 1234567890,
          layerId: 'layer-789',
          deviceId: 'test-device-id'
        })
      );
    });

    it('should use default layerId when not provided', () => {
      mockAddOperation.mockResolvedValueOnce(undefined);

      generateAndSaveOperation('edge.deleted', {edgeId: 'edge-123'}, 'project-123', 'timeline-456');

      expect(mockAddOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          layerId: 'root'
        })
      );
    });

    it('should handle errors in operation generation gracefully', () => {
      // Тест с пустым projectId, который должен вызвать ошибку
      generateAndSaveOperation(
        'node.moved',
        {nodeId: 'test'},
        '', // Пустой projectId
        'timeline-456',
        'layer-789'
      );

      // Операция не должна быть сохранена из-за ошибки генерации
      expect(mockAddOperation).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('Operation generation failed:', expect.any(Error));
    });

    it('should handle errors in saving gracefully', async () => {
      const saveError = new Error('Save failed');
      mockAddOperation.mockRejectedValueOnce(saveError);

      generateAndSaveOperation('note.updated', {noteId: 'note-123'}, 'project-123', 'timeline-456', 'layer-789');

      // Ждем завершения асинхронной операции
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAddOperation).toHaveBeenCalled();
      // Ошибка обрабатывается в saveOperationToQueue, а не в generateAndSaveOperation
      expect(console.error).toHaveBeenCalledWith('Failed to save operation to queue:', saveError);
    });

    it('should work with complex operation types and payloads', () => {
      mockAddOperation.mockResolvedValueOnce(undefined);

      const complexPayload = {
        edgeId: 'edge-456',
        oldConditions: [
          {
            type: 'variable',
            variableId: 'var1',
            operator: 'equals',
            value: 'test'
          }
        ],
        newConditions: [
          {
            type: 'variable',
            variableId: 'var1',
            operator: 'not_equals',
            value: 'updated'
          },
          {
            type: 'custom',
            expression: 'customFunction()'
          }
        ]
      };

      generateAndSaveOperation('edge.conditions_updated', complexPayload, 'project-123', 'timeline-456', 'layer-789');

      expect(mockAddOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'edge.conditions_updated',
          payload: complexPayload
        })
      );
    });

    it('should handle all supported operation types', () => {
      const operationTypes = [
        'node.added',
        'node.deleted',
        'node.moved',
        'node.updated',
        'choice.added',
        'choice.deleted',
        'choice.updated',
        'choice.moved',
        'note.added',
        'note.deleted',
        'note.moved',
        'note.updated',
        'note.color_changed',
        'layer.added',
        'layer.deleted',
        'layer.moved',
        'layer.updated',
        'edge.added',
        'edge.deleted',
        'edge.conditions_updated',
        'operation.deleted'
      ];

      mockAddOperation.mockResolvedValue(undefined);

      operationTypes.forEach((type) => {
        generateAndSaveOperation(type, {testData: `data-for-${type}`}, 'project-123', 'timeline-456', 'layer-789');
      });

      expect(mockAddOperation).toHaveBeenCalledTimes(operationTypes.length);
    });
  });

  describe('Operation interface compliance', () => {
    it('should generate operations that comply with Operation interface', () => {
      const operation = generateOperation('layer.added', {layerId: 'new-layer', name: 'Test Layer'}, 'project-123', 'timeline-456', 'layer-789');

      // Проверяем все обязательные поля
      expect(typeof operation.type).toBe('string');
      expect(typeof operation.projectId).toBe('string');
      expect(typeof operation.timelineId).toBe('string');
      expect(typeof operation.payload).toBe('object');
      expect(typeof operation.timestamp).toBe('number');
      expect(typeof operation.layerId).toBe('string');
      expect(typeof operation.deviceId).toBe('string');

      // Проверяем что layerId опциональное
      expect(operation.layerId).toBeDefined();
    });

    it('should handle undefined layerId correctly', () => {
      const operation = generateOperation(
        'test.operation',
        {test: 'data'},
        'project-123',
        'timeline-456'
        // layerId не передан
      );

      expect(operation.layerId).toBe('root');
    });
  });
});
