import { BaseOperation } from '../../../../src/modules/ai/pipeline/base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../../../../src/modules/ai/pipeline/interfaces/operation.interface';

// Тестовая реализация BaseOperation
class TestOperation extends BaseOperation {
  constructor(
    shouldFailValidation = false,
    shouldFailExecution = false,
    customCost = 1
  ) {
    super(
      'test_operation',
      'Test Operation',
      '1.0.0',
      AIOperationCategory.CONTENT_ANALYSIS,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: ['test_capability'],
        maxTokens: 1000,
        timeout: 5000
      }
    );
    
    this.shouldFailValidation = shouldFailValidation;
    this.shouldFailExecution = shouldFailExecution;
    this.customCost = customCost;
  }

  private shouldFailValidation: boolean;
  private shouldFailExecution: boolean;
  private customCost: number;

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    if (this.shouldFailValidation) {
      return {
        isValid: false,
        errors: ['Test validation error']
      };
    }

    const errors: string[] = [];
    
    if (!input || !input.testField) {
      errors.push('testField is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(input: any, _context: ExecutionContext) {
    if (this.shouldFailExecution) {
      throw new Error('Test execution error');
    }

    return {
      data: { 
        result: 'success',
        input: input.testField 
      },
      tokensUsed: 100,
      model: 'test-model'
    };
  }

  protected calculateCustomCost(_input: any, _context: ExecutionContext): number {
    return this.customCost;
  }
}

describe('BaseOperation', () => {
  let operation: TestOperation;
  let context: ExecutionContext;

  beforeEach(() => {
    operation = new TestOperation();
    context = {
      userId: 'test-user',
      projectId: 'test-project',
      requestId: 'test-request',
      startTime: new Date(),
      sharedData: new Map(),
      previousResults: new Map()
    };
  });

  describe('Constructor', () => {
    it('should create operation with correct properties', () => {
      expect(operation.id).toBe('test_operation');
      expect(operation.name).toBe('Test Operation');
      expect(operation.version).toBe('1.0.0');
      expect(operation.category).toBe(AIOperationCategory.CONTENT_ANALYSIS);
      expect(operation.complexity).toBe(ComplexityLevel.MEDIUM);
      expect(operation.requirements.requiredCapabilities).toEqual(['test_capability']);
    });
  });

  describe('validate()', () => {
    it('should pass validation with valid input', () => {
      const input = { testField: 'test value' };
      const result = operation.validate(input, context);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with invalid input', () => {
      const input = {};
      const result = operation.validate(input, context);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('testField is required');
    });

    it('should fail validation when no input provided', () => {
      const result = operation.validate(null, context);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input data is required');
    });

    it('should fail validation when userId is missing', () => {
      const input = { testField: 'test' };
      const invalidContext = { ...context, userId: '' };
      
      const result = operation.validate(input, invalidContext);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    it('should fail validation when projectId is missing', () => {
      const input = { testField: 'test' };
      const invalidContext = { ...context, projectId: '' };
      
      const result = operation.validate(input, invalidContext);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project ID is required');
    });

    it('should fail validation when custom validation fails', () => {
      const failingOperation = new TestOperation(true, false);
      const input = { testField: 'test' };
      
      const result = failingOperation.validate(input, context);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test validation error');
    });
  });

  describe('execute()', () => {
    it('should execute successfully with valid input', async () => {
      const input = { testField: 'test value' };
      
      const result = await operation.execute(input, context);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        result: 'success',
        input: 'test value'
      });
      expect(result.metadata.tokensUsed).toBe(100);
      expect(result.metadata.model).toBe('test-model');
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.cost).toBeGreaterThan(0);
    });

    it('should fail execution when validation fails', async () => {
      const input = {};
      
      const result = await operation.execute(input, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle execution errors gracefully', async () => {
      const failingOperation = new TestOperation(false, true);
      const input = { testField: 'test' };
      
      const result = await failingOperation.execute(input, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test execution error');
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should measure execution time', async () => {
      const input = { testField: 'test' };
      
      const result = await operation.execute(input, context);
      
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('estimateCost()', () => {
    it('should calculate base cost correctly', () => {
      const input = { testField: 'test' };
      
      const cost = operation.estimateCost(input, context);
      
      // Base complexity (2) * custom cost (1) = 2
      expect(cost).toBe(2);
    });

    it('should apply priority multiplier for high priority', () => {
      const input = { testField: 'test' };
      const highPriorityContext = { ...context, priority: 'high' as const };
      
      const cost = operation.estimateCost(input, highPriorityContext);
      
      // Base cost (2) * priority multiplier (1.5) = 3
      expect(cost).toBe(3);
    });

    it('should apply user tier discount for enterprise', () => {
      const input = { testField: 'test' };
      const enterpriseContext = { ...context, userTier: 'enterprise' as const };
      
      const cost = operation.estimateCost(input, enterpriseContext);
      
      // Base cost (2) * enterprise discount (0.8) = 1.6, rounded up to 2
      expect(cost).toBe(2);
    });

    it('should apply user tier discount for business', () => {
      const input = { testField: 'test' };
      const businessContext = { ...context, userTier: 'business' as const };
      
      const cost = operation.estimateCost(input, businessContext);
      
      // Base cost (2) * business discount (0.9) = 1.8, rounded up to 2  
      expect(cost).toBe(2);
    });

    it('should apply custom cost multiplier', () => {
      const expensiveOperation = new TestOperation(false, false, 2.5);
      const input = { testField: 'test' };
      
      const cost = expensiveOperation.estimateCost(input, context);
      
      // Base cost (2) * custom multiplier (2.5) = 5
      expect(cost).toBe(5);
    });

    it('should combine all multipliers correctly', () => {
      const expensiveOperation = new TestOperation(false, false, 1.5);
      const input = { testField: 'test' };
      const specialContext = { 
        ...context, 
        priority: 'high' as const,
        userTier: 'enterprise' as const 
      };
      
      const cost = expensiveOperation.estimateCost(input, specialContext);
      
      // Base cost (2) * priority (1.5) * enterprise (0.8) * custom (1.5) = 3.6, rounded up to 4
      expect(cost).toBe(4);
    });
  });
}); 