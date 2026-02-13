// backend/src/modules/ai/v2/logging/__tests__/AILogger.test.ts
import { AILogger } from '../AILogger';
import { ExecutionContext, QualityLevel } from '../../shared/types';

// Mock StructuredLogger
jest.mock('../StructuredLogger', () => ({
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }))
  }
}));

describe('AILogger', () => {
  let aiLogger: AILogger;
  let mockBaseLogger: any;
  
  const mockContext: ExecutionContext = {
    userId: 'user123',
    projectId: 'project456',
    requestId: 'req789',
    qualityLevel: QualityLevel.STANDARD,
    startTime: new Date()
  };

  beforeEach(() => {
    aiLogger = new AILogger();
    mockBaseLogger = aiLogger.getBaseLogger();
    jest.clearAllMocks();
  });

  describe('operation logging', () => {
    it('should log operation start', () => {
      aiLogger.operationStart('op123', 'Test Operation', mockContext, { version: '1.0.0' });
      
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        '🚀 Starting AI operation: Test Operation',
        {
          userId: 'user123',
          projectId: 'project456',
          requestId: 'req789',
          traceId: 'req789',
          operationId: 'op123'
        },
        {
          qualityLevel: 'standard',
          version: '1.0.0'
        }
      );
    });

    it('should log operation success', () => {
      aiLogger.operationSuccess('op123', 'Test Operation', mockContext, 1500, {
        inputTokens: 100,
        outputTokens: 150
      });
      
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        '✅ AI operation completed: Test Operation',
        expect.objectContaining({
          operationId: 'op123'
        }),
        expect.objectContaining({
          duration: 1500,
          inputTokens: 100,
          outputTokens: 150
        })
      );
    });

    it('should log operation error', () => {
      const error = new Error('Test error');
      
      aiLogger.operationError('op123', 'Test Operation', mockContext, error, 1000);
      
      expect(mockBaseLogger.error).toHaveBeenCalledWith(
        '❌ AI operation failed: Test Operation',
        expect.objectContaining({
          operationId: 'op123'
        }),
        expect.objectContaining({
          duration: 1000,
          error: {
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String)
          }
        })
      );
    });
  });

  describe('provider logging', () => {
    it('should log provider call', () => {
      aiLogger.providerCall('openai', 'gpt-4', mockContext, { temperature: 0.7 });
      
      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        '🔄 Calling AI provider: openai/gpt-4',
        expect.objectContaining({
          userId: 'user123'
        }),
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7
        })
      );
    });

    it('should log provider response', () => {
      aiLogger.providerResponse('openai', 'gpt-4', mockContext, 2000, 100, 150, 0.05);
      
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        '📨 AI provider response: openai/gpt-4',
        expect.any(Object),
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
          duration: 2000,
          inputTokens: 100,
          outputTokens: 150,
          realCostUSD: 0.05
        })
      );
    });

    it('should log provider error', () => {
      const error = new Error('Provider timeout');
      
      aiLogger.providerError('openai', 'gpt-4', mockContext, error, 5000);
      
      expect(mockBaseLogger.error).toHaveBeenCalledWith(
        '💥 AI provider error: openai/gpt-4',
        expect.any(Object),
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
          duration: 5000,
          error: {
            name: 'Error',
            message: 'Provider timeout',
            stack: expect.any(String)
          }
        })
      );
    });
  });

  describe('validation logging', () => {
    it('should log successful validation', () => {
      aiLogger.validation('op123', mockContext, true);
      
      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        '✔️ Validation passed for operation: op123',
        expect.objectContaining({
          operationId: 'op123'
        }),
        undefined
      );
    });

    it('should log failed validation', () => {
      const errors = ['Field required', 'Invalid format'];
      
      aiLogger.validation('op123', mockContext, false, errors);
      
      expect(mockBaseLogger.warn).toHaveBeenCalledWith(
        '⚠️ Validation failed for operation: op123',
        expect.objectContaining({
          operationId: 'op123'
        }),
        expect.objectContaining({
          validationErrors: errors
        })
      );
    });
  });

  describe('suspicious content logging', () => {
    it('should log suspicious content detection', () => {
      const reasons = ['Script tags detected', 'JavaScript protocol found'];
      
      aiLogger.suspiciousContent('op123', mockContext, reasons);
      
      expect(mockBaseLogger.warn).toHaveBeenCalledWith(
        '🚨 Suspicious content detected in operation: op123',
        expect.objectContaining({
          operationId: 'op123'
        }),
        expect.objectContaining({
          suspiciousReasons: reasons
        })
      );
    });
  });

  describe('pipeline logging', () => {
    it('should log pipeline progress', () => {
      aiLogger.pipelineProgress('pipeline123', mockContext, 50, 'step2', 4);
      
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        '📊 Pipeline progress: pipeline123',
        expect.any(Object),
        expect.objectContaining({
          pipelineId: 'pipeline123',
          progress: 50,
          currentStep: 'step2',
          totalSteps: 4
        })
      );
    });

    it('should log pipeline completion', () => {
      aiLogger.pipelineComplete('pipeline123', mockContext, 5000, 3, 1, 0);
      
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        '🏁 Pipeline completed: pipeline123',
        expect.any(Object),
        expect.objectContaining({
          pipelineId: 'pipeline123',
          totalDuration: 5000,
          stepsCompleted: 3,
          stepsSkipped: 1,
          stepsFailed: 0
        })
      );
    });
  });

  describe('performance logging', () => {
    it('should log performance metrics', () => {
      const metrics = {
        duration: 1500,
        memoryUsage: 1024000,
        cpuUsage: 15.5
      };
      
      aiLogger.performance('MyOperation', mockContext, metrics);
      
      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        '⚡ Performance metrics for: MyOperation',
        expect.any(Object),
        expect.objectContaining({
          operation: 'MyOperation',
          duration: 1500,
          memoryUsage: 1024000,
          cpuUsage: 15.5
        })
      );
    });
  });
});
