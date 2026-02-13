import { OperationRegistry } from '../../../../src/modules/ai/pipeline/factory/operation-registry';
import { 
  AIOperation,
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../../../../src/modules/ai/pipeline/interfaces/operation.interface';

// Тестовая операция
class MockOperation implements AIOperation {
  constructor(
    public readonly id: string = 'mock_operation',
    public readonly name: string = 'Mock Operation',
    public readonly version: string = '1.0.0',
    public readonly category: AIOperationCategory = AIOperationCategory.CONTENT_ANALYSIS,
    public readonly complexity: ComplexityLevel = ComplexityLevel.SIMPLE,
    public readonly requirements = { requiredCapabilities: ['test'] }
  ) {}

  validate(_input: any, _context: ExecutionContext): ValidationResult {
    return { isValid: true, errors: [] };
  }

  async execute(_input: any, _context: ExecutionContext) {
    return {
      success: true,
      data: { result: 'mock' },
      metadata: { executionTime: 100 }
    };
  }

  estimateCost(_input: any, _context: ExecutionContext): number {
    return 1;
  }
}

// Фабрика для неисправной операции
const faultyOperationFactory = () => {
  throw new Error('Failed to create operation');
};

describe('OperationRegistry', () => {
  beforeEach(() => {
    // Очищаем реестр перед каждым тестом
    OperationRegistry.clear();
  });

  afterEach(() => {
    // Очищаем реестр после каждого теста
    OperationRegistry.clear();
  });

  describe('register()', () => {
    it('should register operation successfully', () => {
      const factory = () => new MockOperation();
      
      OperationRegistry.register('test_op', factory);
      
      expect(OperationRegistry.isRegistered('test_op')).toBe(true);
      expect(OperationRegistry.getRegisteredOperations()).toContain('test_op');
    });

    it('should warn when overwriting existing operation', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const factory1 = () => new MockOperation('op1');
      const factory2 = () => new MockOperation('op2');
      
      OperationRegistry.register('duplicate_op', factory1);
      OperationRegistry.register('duplicate_op', factory2);
      
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Operation duplicate_op is already registered. Overwriting...');
      
      consoleSpy.mockRestore();
    });

    it('should log successful registration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const factory = () => new MockOperation();
      
      OperationRegistry.register('logged_op', factory);
      
      expect(consoleSpy).toHaveBeenCalledWith('✅ Registered operation: logged_op');
      
      consoleSpy.mockRestore();
    });
  });

  describe('create()', () => {
    it('should create operation from registered factory', () => {
      const expectedId = 'created_operation';
      const factory = () => new MockOperation(expectedId);
      
      OperationRegistry.register('test_create', factory);
      const operation = OperationRegistry.create('test_create');
      
      expect(operation).toBeInstanceOf(MockOperation);
      expect(operation.id).toBe(expectedId);
    });

    it('should throw error for unregistered operation', () => {
      expect(() => {
        OperationRegistry.create('nonexistent_op');
      }).toThrow('Operation not found: nonexistent_op. Available operations: ');
    });

    it('should include available operations in error message', () => {
      OperationRegistry.register('op1', () => new MockOperation('op1'));
      OperationRegistry.register('op2', () => new MockOperation('op2'));
      
      expect(() => {
        OperationRegistry.create('nonexistent_op');
      }).toThrow('Operation not found: nonexistent_op. Available operations: op1, op2');
    });
  });

  describe('isRegistered()', () => {
    it('should return true for registered operation', () => {
      OperationRegistry.register('registered_op', () => new MockOperation());
      
      expect(OperationRegistry.isRegistered('registered_op')).toBe(true);
    });

    it('should return false for unregistered operation', () => {
      expect(OperationRegistry.isRegistered('unregistered_op')).toBe(false);
    });
  });

  describe('getRegisteredOperations()', () => {
    it('should return empty array when no operations registered', () => {
      expect(OperationRegistry.getRegisteredOperations()).toEqual([]);
    });

    it('should return array of registered operation IDs', () => {
      OperationRegistry.register('op1', () => new MockOperation('op1'));
      OperationRegistry.register('op2', () => new MockOperation('op2'));
      OperationRegistry.register('op3', () => new MockOperation('op3'));
      
      const registered = OperationRegistry.getRegisteredOperations();
      
      expect(registered).toHaveLength(3);
      expect(registered).toContain('op1');
      expect(registered).toContain('op2');
      expect(registered).toContain('op3');
    });
  });

  describe('clear()', () => {
    it('should clear all registered operations', () => {
      OperationRegistry.register('op1', () => new MockOperation('op1'));
      OperationRegistry.register('op2', () => new MockOperation('op2'));
      
      expect(OperationRegistry.getRegisteredOperations()).toHaveLength(2);
      
      OperationRegistry.clear();
      
      expect(OperationRegistry.getRegisteredOperations()).toHaveLength(0);
    });
  });

  describe('getOperationInfo()', () => {
    it('should return operation info without creating instance', () => {
      const factory = () => new MockOperation(
        'info_op',
        'Info Operation',
        '2.0.0',
        AIOperationCategory.CONTENT_GENERATION,
        ComplexityLevel.COMPLEX
      );
      
      OperationRegistry.register('info_op', factory);
      const info = OperationRegistry.getOperationInfo('info_op');
      
      expect(info).toEqual({
        id: 'info_op',
        name: 'Info Operation',
        category: AIOperationCategory.CONTENT_GENERATION,
        complexity: ComplexityLevel.COMPLEX
      });
    });

    it('should return null for unregistered operation', () => {
      const info = OperationRegistry.getOperationInfo('nonexistent');
      
      expect(info).toBeNull();
    });

    it('should handle factory errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      OperationRegistry.register('faulty_op', faultyOperationFactory);
      const info = OperationRegistry.getOperationInfo('faulty_op');
      
      expect(info).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to get info for operation faulty_op:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('registerBatch()', () => {
    it('should register multiple operations at once', () => {
      const operations = [
        { id: 'batch_op1', factory: () => new MockOperation('batch_op1') },
        { id: 'batch_op2', factory: () => new MockOperation('batch_op2') },
        { id: 'batch_op3', factory: () => new MockOperation('batch_op3') }
      ];
      
      OperationRegistry.registerBatch(operations);
      
      expect(OperationRegistry.getRegisteredOperations()).toHaveLength(3);
      expect(OperationRegistry.isRegistered('batch_op1')).toBe(true);
      expect(OperationRegistry.isRegistered('batch_op2')).toBe(true);
      expect(OperationRegistry.isRegistered('batch_op3')).toBe(true);
    });

    it('should handle empty batch registration', () => {
      OperationRegistry.registerBatch([]);
      
      expect(OperationRegistry.getRegisteredOperations()).toHaveLength(0);
    });
  });

  describe('Registry state management', () => {
    it('should maintain separate instances from factory calls', () => {
      const factory = () => new MockOperation('instance_test');
      
      OperationRegistry.register('instance_test', factory);
      
      const instance1 = OperationRegistry.create('instance_test');
      const instance2 = OperationRegistry.create('instance_test');
      
      expect(instance1).not.toBe(instance2); // Different instances
      expect(instance1.id).toBe(instance2.id); // Same ID
    });

    it('should handle concurrent registrations', () => {
      const operations = [];
      
      // Симулируем одновременную регистрацию
      for (let i = 0; i < 10; i++) {
        const id = `concurrent_op_${i}`;
        operations.push(() => {
          OperationRegistry.register(id, () => new MockOperation(id));
        });
      }
      
      // Выполняем все регистрации
      operations.forEach(fn => fn());
      
      expect(OperationRegistry.getRegisteredOperations()).toHaveLength(10);
      
      // Проверяем, что все операции можно создать
      for (let i = 0; i < 10; i++) {
        const id = `concurrent_op_${i}`;
        const operation = OperationRegistry.create(id);
        expect(operation.id).toBe(id);
      }
    });
  });
}); 