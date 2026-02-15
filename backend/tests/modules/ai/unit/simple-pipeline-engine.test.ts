import { SimplePipelineEngine } from '../../../../src/modules/ai/pipeline/engine/simple-pipeline-engine';
import { 
  AIPipeline,
  PipelineStep,
  PipelineInput
} from '../../../../src/modules/ai/pipeline/interfaces/pipeline.interface';
import { 
  AIOperation,
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult,
  OperationResult
} from '../../../../src/modules/ai/pipeline/interfaces/operation.interface';

// Mock операция для тестирования
class MockOperation implements AIOperation {
  constructor(
    public readonly id: string,
    public readonly name: string = 'Mock Operation',
    public readonly version: string = '1.0.0',
    public readonly category: AIOperationCategory = AIOperationCategory.CONTENT_ANALYSIS,
    public readonly complexity: ComplexityLevel = ComplexityLevel.SIMPLE,
    public readonly requirements = { requiredCapabilities: ['test'] },
    private shouldFail = false,
    private executionDelay = 0
  ) {}

  validate(_input: any, _context: ExecutionContext): ValidationResult {
    return { isValid: true, errors: [] };
  }

  async execute(input: any, _context: ExecutionContext): Promise<OperationResult> {
    if (this.executionDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.executionDelay));
    }

    if (this.shouldFail) {
      return {
        success: false,
        error: `Operation ${this.id} failed`,
        metadata: { executionTime: this.executionDelay }
      };
    }

    return {
      success: true,
      data: { 
        operationId: this.id,
        input: input,
        timestamp: Date.now()
      },
      metadata: { 
        executionTime: this.executionDelay,
        cost: this.complexity,
        tokensUsed: 50
      }
    };
  }

  estimateCost(_input: any, _context: ExecutionContext): number {
    return this.complexity;
  }
}

// Mock пайплайн для тестирования
class MockPipeline implements AIPipeline {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly version: string,
    public readonly steps: PipelineStep[],
    private shouldFailValidation = false
  ) {}

  validate(): ValidationResult {
    if (this.shouldFailValidation) {
      return {
        isValid: false,
        errors: ['Mock pipeline validation failed']
      };
    }

    return { isValid: true, errors: [] };
  }

  estimateCost(input: PipelineInput, context: ExecutionContext): number {
    return this.steps.reduce((total, step) => total + step.operation.estimateCost(input, context), 0);
  }

  estimateTime(_input: PipelineInput, _context: ExecutionContext): number {
    return this.steps.length * 1000; // 1 секунда на шаг
  }

  getPipelineStructure() {
    return { id: this.id, name: this.name, description: this.description, groups: [] };
  }

  prepareInput(..._args: any[]) {
    return {};
  }

  transformResult(pipelineResult: any, _startTime: Date) {
    return pipelineResult;
  }

  getDetailedReport(_pipelineResult: any) {
    return 'Mock report';
  }
}

describe('SimplePipelineEngine', () => {
  let engine: SimplePipelineEngine;
  let context: ExecutionContext;

  beforeEach(() => {
    engine = new SimplePipelineEngine();
    context = {
      userId: 'test-user',
      projectId: 'test-project',
      requestId: 'test-request',
      startTime: new Date(),
      sharedData: new Map(),
      previousResults: new Map()
    };
  });

  describe('execute() - успешные сценарии', () => {
    it('should execute simple linear pipeline successfully', async () => {
      const operation1 = new MockOperation('op1');
      const operation2 = new MockOperation('op2');
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation1,
          dependencies: []
        },
        {
          id: 'step2',
          operation: operation2,
          dependencies: ['step1']
        }
      ];

      const pipeline = new MockPipeline('test-pipeline', 'Test Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      expect(result.steps.size).toBe(2);
      expect(result.steps.get('step1')?.success).toBe(true);
      expect(result.steps.get('step2')?.success).toBe(true);
      expect(result.totalCost).toBe(2); // Два SIMPLE операции
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should execute pipeline with parallel operations', async () => {
      const operation1 = new MockOperation('op1');
      const operation2 = new MockOperation('op2');
      const operation3 = new MockOperation('op3');
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation1,
          dependencies: []
        },
        {
          id: 'step2',
          operation: operation2,
          dependencies: ['step1'] // Зависит от step1
        },
        {
          id: 'step3',
          operation: operation3,
          dependencies: ['step1'] // Тоже зависит от step1 (параллельно с step2)
        }
      ];

      const pipeline = new MockPipeline('parallel-pipeline', 'Parallel Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      expect(result.steps.size).toBe(3);
      
      // Проверяем, что step1 выполнился первым
      const step1Result = result.steps.get('step1');
      const step2Result = result.steps.get('step2');
      const step3Result = result.steps.get('step3');
      
      expect(step1Result?.success).toBe(true);
      expect(step2Result?.success).toBe(true);
      expect(step3Result?.success).toBe(true);
    });

    it('should handle conditional steps correctly', async () => {
      const operation1 = new MockOperation('op1');
      const operation2 = new MockOperation('op2');
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation1,
          dependencies: []
        },
        {
          id: 'step2',
          operation: operation2,
          dependencies: ['step1'],
          condition: (_context, _previousResults) => false // Никогда не выполняется
        }
      ];

      const pipeline = new MockPipeline('conditional-pipeline', 'Conditional Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      expect(result.steps.size).toBe(1); // Только step1
      expect(result.steps.get('step1')?.success).toBe(true);
      expect(result.steps.has('step2')).toBe(false);
    });

    it('should pass data between operations via shared context', async () => {
      const operation1 = new MockOperation('op1');
      const operation2 = new MockOperation('op2');
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation1,
          dependencies: []
        },
        {
          id: 'step2',
          operation: operation2,
          dependencies: ['step1']
        }
      ];

      const pipeline = new MockPipeline('data-sharing-pipeline', 'Data Sharing Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      
      // Проверяем, что данные сохранились в sharedData
      expect(context.sharedData.has('step1')).toBe(true);
      expect(context.sharedData.has('step2')).toBe(true);
      
      const step1Data = context.sharedData.get('step1');
      expect(step1Data).toHaveProperty('operationId', 'op1');
    });
  });

  describe('execute() - обработка ошибок', () => {
    it('should fail when pipeline validation fails', async () => {
      const operation = new MockOperation('op1');
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation,
          dependencies: []
        }
      ];

      const invalidPipeline = new MockPipeline(
        'invalid-pipeline', 
        'Invalid Pipeline', 
        'Test', 
        '1.0.0', 
        steps, 
        true // shouldFailValidation = true
      );
      
      const input = { content: 'test input' };

      const result = await engine.execute(invalidPipeline, input, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Pipeline validation failed');
      expect(result.steps.size).toBe(0);
    });

    it('should stop execution when operation fails', async () => {
      const operation1 = new MockOperation('op1');
      const operation2 = new MockOperation('op2', 'Op2', '1.0.0', AIOperationCategory.CONTENT_ANALYSIS, ComplexityLevel.SIMPLE, { requiredCapabilities: ['test'] }, true); // shouldFail = true
      const operation3 = new MockOperation('op3');
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation1,
          dependencies: []
        },
        {
          id: 'step2',
          operation: operation2,
          dependencies: ['step1']
        },
        {
          id: 'step3',
          operation: operation3,
          dependencies: ['step2']
        }
      ];

      const pipeline = new MockPipeline('failing-pipeline', 'Failing Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Step step2 failed');
      expect(result.steps.size).toBe(2); // step1 и step2 (failed)
      expect(result.steps.get('step1')?.success).toBe(true);
      expect(result.steps.get('step2')?.success).toBe(false);
      expect(result.steps.has('step3')).toBe(false); // step3 не выполнился
    });

    it('should handle circular dependencies', async () => {
      const operation1 = new MockOperation('op1');
      const operation2 = new MockOperation('op2');
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation1,
          dependencies: ['step2'] // Циклическая зависимость
        },
        {
          id: 'step2',
          operation: operation2,
          dependencies: ['step1'] // Циклическая зависимость
        }
      ];

      const pipeline = new MockPipeline('circular-pipeline', 'Circular Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circular dependency detected');
    });

    it('should handle missing step dependencies', async () => {
      const operation1 = new MockOperation('op1');
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation1,
          dependencies: ['nonexistent_step'] // Несуществующая зависимость
        }
      ];

      const pipeline = new MockPipeline('missing-dep-pipeline', 'Missing Dependency Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Step not found: nonexistent_step');
    });

    it('should handle runtime exceptions gracefully', async () => {
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: null as any, // Null operation to cause error
          dependencies: []
        }
      ];

      const pipeline = new MockPipeline('error-pipeline', 'Error Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.totalTime).toBeGreaterThanOrEqual(0); // Может быть 0 при раннем исключении
    });
  });

  describe('getStatus()', () => {
    it('should return status for existing execution', async () => {
      const operation = new MockOperation('op1', 'Op1', '1.0.0', AIOperationCategory.CONTENT_ANALYSIS, ComplexityLevel.SIMPLE, { requiredCapabilities: ['test'] }, false, 100);
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation,
          dependencies: []
        }
      ];

      const pipeline = new MockPipeline('status-pipeline', 'Status Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      // Запускаем выполнение
      const executePromise = engine.execute(pipeline, input, context);
      
      // Сразу проверяем статус
      const status = await engine.getStatus(context.requestId);
      
      expect(status.requestId).toBe(context.requestId);
      expect(['pending', 'running']).toContain(status.status);
      expect(status.startTime).toBeInstanceOf(Date);
      expect(status.progress).toBeGreaterThanOrEqual(0);
      
      await executePromise; // Ждем завершения
    });

    it('should throw error for non-existent execution', async () => {
      await expect(engine.getStatus('non-existent-request'))
        .rejects
        .toThrow('No execution found for request non-existent-request');
    });
  });

  describe('topological sorting', () => {
    it('should execute operations in correct dependency order', async () => {
      const executionOrder: string[] = [];
      
      // Создаем операции, которые записывают порядок выполнения
      class OrderTrackingOperation extends MockOperation {
        async execute(input: any, context: ExecutionContext): Promise<OperationResult> {
          executionOrder.push(this.id);
          return super.execute(input, context);
        }
      }

      const operation1 = new OrderTrackingOperation('op1');
      const operation2 = new OrderTrackingOperation('op2');
      const operation3 = new OrderTrackingOperation('op3');
      
      const steps: PipelineStep[] = [
        {
          id: 'step3',
          operation: operation3,
          dependencies: ['step1', 'step2'] // Последний
        },
        {
          id: 'step1',
          operation: operation1,
          dependencies: [] // Первый
        },
        {
          id: 'step2',
          operation: operation2,
          dependencies: ['step1'] // Второй
        }
      ];

      const pipeline = new MockPipeline('order-pipeline', 'Order Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      expect(executionOrder).toEqual(['op1', 'op2', 'op3']);
    });
  });

  describe('execution metrics', () => {
    it('should track total cost and time correctly', async () => {
      const operation1 = new MockOperation('op1', 'Op1', '1.0.0', AIOperationCategory.CONTENT_ANALYSIS, ComplexityLevel.MEDIUM, { requiredCapabilities: ['test'] }, false, 50);
      const operation2 = new MockOperation('op2', 'Op2', '1.0.0', AIOperationCategory.CONTENT_ANALYSIS, ComplexityLevel.COMPLEX, { requiredCapabilities: ['test'] }, false, 75);
      
      const steps: PipelineStep[] = [
        {
          id: 'step1',
          operation: operation1,
          dependencies: []
        },
        {
          id: 'step2',
          operation: operation2,
          dependencies: ['step1']
        }
      ];

      const pipeline = new MockPipeline('metrics-pipeline', 'Metrics Pipeline', 'Test', '1.0.0', steps);
      const input = { content: 'test input' };

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      expect(result.totalCost).toBe(5); // MEDIUM (2) + COMPLEX (3)
      expect(result.totalTime).toBeGreaterThanOrEqual(125); // 50 + 75 + overhead
      expect(result.steps.size).toBe(2);
    });
  });
}); 