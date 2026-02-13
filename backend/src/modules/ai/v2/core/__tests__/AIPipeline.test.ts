// backend/src/modules/ai/v2/core/__tests__/AIPipeline.test.ts
import { AIPipeline } from '../AIPipeline';
import { PipelineStep } from '../../shared/pipeline-types';
import { BaseAIOperation, AIOperationInput, ExecutionContext, AIOperationOutput, QualityLevel, AIProvider, GeminiModel, OperationType } from '../../shared/types';

// Mock operation for testing
class MockOperation implements BaseAIOperation {
  readonly id = 'mock-operation';
  readonly name = 'Mock Operation';
  readonly version = '1.0.0';
  readonly type = OperationType.AI;
  readonly aiConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.3,
        maxTokens: 50,
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.7,
        maxTokens: 100,
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.PRO,
        temperature: 0.7,
        maxTokens: 100,
      }
    }
  };

  getPrompt(_input: AIOperationInput, _context: ExecutionContext) {
    return { system: 'test', user: 'test' };
  }

  parseResult(_aiResult: string, _input: AIOperationInput, realCostUSD: number, creditsCharged: number): AIOperationOutput {
    return { metadata: { realCostUSD, creditsCharged, margin: 0 } };
  }

  validate(_input: AIOperationInput): string[] {
    return [];
  }

  async execute(_input: AIOperationInput, _context: ExecutionContext): Promise<AIOperationOutput> {
    return { metadata: { realCostUSD: 0, creditsCharged: 0, margin: 0 } };
  }

  async estimateCost(_input: AIOperationInput, _context: ExecutionContext): Promise<{realCostUSD: number, credits: number}> {
    return { realCostUSD: 0, credits: 0 };
  }
}

describe('AIPipeline', () => {
  const mockOperation = new MockOperation();

  describe('Cycle Detection', () => {
    it('should detect direct circular dependency (A -> B -> A)', () => {
      const steps: PipelineStep[] = [
        {
          id: 'step-a',
          operation: mockOperation,
          dependencies: ['step-b']
        },
        {
          id: 'step-b',
          operation: mockOperation,
          dependencies: ['step-a']
        }
      ];

      expect(() => {
        new AIPipeline('test-pipeline', 'Test Pipeline', 'Test description', '1.0.0', steps);
      }).toThrow('Pipeline "test-pipeline" contains a circular dependency: step-a -> step-b -> step-a');
    });

    it('should detect longer circular dependency (A -> B -> C -> A)', () => {
      const steps: PipelineStep[] = [
        {
          id: 'step-a',
          operation: mockOperation,
          dependencies: ['step-b']
        },
        {
          id: 'step-b',
          operation: mockOperation,
          dependencies: ['step-c']
        },
        {
          id: 'step-c',
          operation: mockOperation,
          dependencies: ['step-a']
        }
      ];

      expect(() => {
        new AIPipeline('test-pipeline', 'Test Pipeline', 'Test description', '1.0.0', steps);
      }).toThrow('Pipeline "test-pipeline" contains a circular dependency: step-a -> step-b -> step-c -> step-a');
    });

    it('should detect self-dependency (A -> A)', () => {
      const steps: PipelineStep[] = [
        {
          id: 'step-a',
          operation: mockOperation,
          dependencies: ['step-a']
        }
      ];

      expect(() => {
        new AIPipeline('test-pipeline', 'Test Pipeline', 'Test description', '1.0.0', steps);
      }).toThrow('Pipeline "test-pipeline" contains a circular dependency: step-a -> step-a');
    });

    it('should allow valid DAG (Directed Acyclic Graph)', () => {
      const steps: PipelineStep[] = [
        {
          id: 'step-a',
          operation: mockOperation,
          dependencies: []
        },
        {
          id: 'step-b',
          operation: mockOperation,
          dependencies: ['step-a']
        },
        {
          id: 'step-c',
          operation: mockOperation,
          dependencies: ['step-a']
        },
        {
          id: 'step-d',
          operation: mockOperation,
          dependencies: ['step-b', 'step-c']
        }
      ];

      expect(() => {
        new AIPipeline('test-pipeline', 'Test Pipeline', 'Test description', '1.0.0', steps);
      }).not.toThrow();
    });

    it('should handle pipeline with no dependencies', () => {
      const steps: PipelineStep[] = [
        {
          id: 'step-a',
          operation: mockOperation
        },
        {
          id: 'step-b',
          operation: mockOperation
        }
      ];

      expect(() => {
        new AIPipeline('test-pipeline', 'Test Pipeline', 'Test description', '1.0.0', steps);
      }).not.toThrow();
    });

    it('should detect complex cycle in larger graph', () => {
      const steps: PipelineStep[] = [
        {
          id: 'step-a',
          operation: mockOperation,
          dependencies: []
        },
        {
          id: 'step-b',
          operation: mockOperation,
          dependencies: ['step-a']
        },
        {
          id: 'step-c',
          operation: mockOperation,
          dependencies: ['step-b']
        },
        {
          id: 'step-d',
          operation: mockOperation,
          dependencies: ['step-c', 'step-f']  // This creates the cycle
        },
        {
          id: 'step-e',
          operation: mockOperation,
          dependencies: ['step-d']
        },
        {
          id: 'step-f',
          operation: mockOperation,
          dependencies: ['step-e']
        }
      ];

      expect(() => {
        new AIPipeline('test-pipeline', 'Test Pipeline', 'Test description', '1.0.0', steps);
      }).toThrow('contains a circular dependency');
    });
  });

  describe('Dependency Validation', () => {
    it('should detect non-existent dependency', () => {
      const steps: PipelineStep[] = [
        {
          id: 'step-a',
          operation: mockOperation,
          dependencies: ['non-existent-step']
        }
      ];

      expect(() => {
        new AIPipeline('test-pipeline', 'Test Pipeline', 'Test description', '1.0.0', steps);
      }).toThrow('Pipeline "test-pipeline" has an invalid dependency: step "step-a" depends on non-existent step "non-existent-step"');
    });
  });
});
