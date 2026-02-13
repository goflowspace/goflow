import '../../../setup';
import { 
  SimpleContentPipeline,
  SimplePipelineEngine,
  OperationRegistry,
  ContentAnalysisOperation
} from '../../../../src/modules/ai/pipeline';
import { ExecutionContext } from '../../../../src/modules/ai/pipeline/interfaces/operation.interface';

// Mock для AI Provider Factory
jest.mock('../../../../src/modules/ai/providers/ai-provider.factory', () => ({
  AIProviderFactory: {
    create: jest.fn(() => ({
      generateSuggestions: jest.fn(async (data) => {
        // Возвращаем разные результаты в зависимости от промпта
        const context = data.context.toLowerCase();
        
        if (context.includes('summary')) {
          return [{
            title: 'Content Summary',
            description: 'This is a comprehensive summary of the provided content, highlighting key points and main themes.',
            type: 'STRUCTURE_ONLY',
            confidence: 0.9
          }];
        }
        
        if (context.includes('keywords')) {
          return [{
            title: 'Key Topics',
            description: 'Main topics extracted from content',
            type: 'STRUCTURE_ONLY',
            confidence: 0.8,
            entities: ['adventure', 'hero', 'journey', 'quest', 'fantasy']
          }];
        }
        
        if (context.includes('structure')) {
          return [{
            title: 'Structural Elements',
            description: 'Analysis of story structure',
            type: 'STRUCTURE_ONLY',
            confidence: 0.85,
            entities: ['Luke Skywalker', 'Tatooine', 'rebellion', 'empire', 'force']
          }];
        }
        
        // Default fallback
        return [{
          title: 'General Analysis',
          description: 'General content analysis completed',
          type: 'STRUCTURE_ONLY',
          confidence: 0.7
        }];
      })
    }))
  }
}));

describe('Content Analysis Pipeline Integration Tests', () => {
  let engine: SimplePipelineEngine;
  let context: ExecutionContext;

  beforeEach(() => {
    // Очищаем реестр операций
    OperationRegistry.clear();
    
    engine = new SimplePipelineEngine();
    context = {
      userId: 'integration-test-user',
      projectId: 'integration-test-project',
      requestId: `integration-test-${Date.now()}`,
      startTime: new Date(),
      sharedData: new Map(),
      previousResults: new Map()
    };
  });

  afterEach(() => {
    OperationRegistry.clear();
  });

  describe('SimpleContentPipeline', () => {
    it('should execute complete content analysis pipeline successfully', async () => {
      const pipeline = new SimpleContentPipeline();
      const input = SimpleContentPipeline.prepareInput(
        'В далекой галактике жил храбрый рыцарь по имени Люк. Он сражался против темных сил империи на планете Татуин, используя силу для защиты невинных.'
      );

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      expect(result.steps.size).toBe(3); // summary, keywords, structure
      
      // Проверяем результаты каждого шага
      const summaryStep = result.steps.get('analyze_summary');
      const keywordsStep = result.steps.get('analyze_keywords');
      const structureStep = result.steps.get('analyze_structure');

      expect(summaryStep?.success).toBe(true);
      expect(keywordsStep?.success).toBe(true);
      expect(structureStep?.success).toBe(true);

      // Проверяем общие метрики
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.totalTime).toBeGreaterThan(0);
      
      console.log('🎯 Pipeline execution completed:');
      console.log(`💰 Total cost: ${result.totalCost} credits`);
      console.log(`⏱️ Total time: ${result.totalTime}ms`);
    });

    it('should extract meaningful results from pipeline execution', async () => {
      const pipeline = new SimpleContentPipeline();
      const input = SimpleContentPipeline.prepareInput(
        'Эпическая история о приключениях героя в мире магии и драконов.'
      );

      const result = await engine.execute(pipeline, input, context);
      
      expect(result.success).toBe(true);
      
      // Извлекаем и проверяем результаты
      const extractedResults = SimpleContentPipeline.extractResults(result);
      
      expect(extractedResults).toHaveProperty('summary');
      expect(extractedResults).toHaveProperty('keywords');
      expect(extractedResults).toHaveProperty('structure');
      expect(extractedResults).toHaveProperty('confidence');

      expect(typeof extractedResults.summary).toBe('string');
      expect(Array.isArray(extractedResults.keywords)).toBe(true);
      expect(typeof extractedResults.confidence).toBe('number');

      console.log('📊 Extracted results:', extractedResults);
    });

    it('should handle sequential execution correctly', async () => {
      const pipeline = new SimpleContentPipeline();
      const input = SimpleContentPipeline.prepareInput(
        'Короткий тестовый текст для проверки последовательности выполнения операций.'
      );

      const executionOrder: string[] = [];
      
      // Мокаем console.log для отслеживания порядка выполнения
      const originalConsoleLog = console.log;
      console.log = jest.fn((message: string) => {
        if (message.includes('Executing step:')) {
          const stepMatch = message.match(/Executing step: (\w+)/);
          if (stepMatch) {
            executionOrder.push(stepMatch[1]);
          }
        }
        originalConsoleLog(message);
      });

      const result = await engine.execute(pipeline, input, context);

      // Восстанавливаем console.log
      console.log = originalConsoleLog;

      expect(result.success).toBe(true);
      
      // Проверяем порядок выполнения
      expect(executionOrder).toHaveLength(3);
      expect(executionOrder[0]).toBe('analyze_summary');
      
      // keywords и structure могут выполняться в любом порядке после summary
      expect(executionOrder.slice(1)).toEqual(
        expect.arrayContaining(['analyze_keywords', 'analyze_structure'])
      );
    });

    it('should handle empty content gracefully', async () => {
      const pipeline = new SimpleContentPipeline();
      const input = SimpleContentPipeline.prepareInput('');

      const result = await engine.execute(pipeline, input, context);

      // В зависимости от валидации, может завершиться успешно или с ошибкой
      if (result.success) {
        expect(result.steps.size).toBeGreaterThanOrEqual(1);
      } else {
        expect(result.error).toContain('Content must be a non-empty string');
      }
    });

    it('should handle very long content', async () => {
      const pipeline = new SimpleContentPipeline();
      const longContent = 'Lorem ipsum '.repeat(1000); // Около 12,000 символов
      const input = SimpleContentPipeline.prepareInput(longContent);

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      
      // Проверяем, что стоимость увеличилась из-за объема контента
      expect(result.totalCost).toBeGreaterThan(3); // Базовая стоимость + надбавка за объем
    });
  });

  describe('Operation Integration', () => {
    it('should create and register operations correctly', () => {
      // Создаем пайплайн для инициализации операций
      new SimpleContentPipeline();
      
      // Проверяем, что операция зарегистрирована
      expect(OperationRegistry.isRegistered('content_analysis')).toBe(true);
      
      // Проверяем, что можем создать операцию
      const operation = OperationRegistry.create('content_analysis');
      expect(operation).toBeInstanceOf(ContentAnalysisOperation);
      expect(operation.id).toBe('content_analysis');
    });

    it('should handle operation failures gracefully', async () => {
      // Мокаем провайдер так, чтобы он выдавал ошибку
      const mockFactory = require('../../../../src/modules/ai/providers/ai-provider.factory');
      mockFactory.AIProviderFactory.create.mockImplementationOnce(() => ({
        generateSuggestions: jest.fn(() => {
          throw new Error('AI Provider Error');
        })
      }));

      const pipeline = new SimpleContentPipeline();
      const input = SimpleContentPipeline.prepareInput('Test content for error handling');

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Step analyze_summary failed');
      expect(result.steps.size).toBe(1); // Только первый шаг, который завершился с ошибкой
    });
  });

  describe('Performance Tests', () => {
    it('should complete pipeline within reasonable time', async () => {
      const pipeline = new SimpleContentPipeline();
      const input = SimpleContentPipeline.prepareInput(
        'Средний по размеру текст для тестирования производительности пайплайна. Этот текст содержит достаточно контента для анализа, но не настолько большой, чтобы замедлить выполнение.'
      );

      const startTime = Date.now();
      const result = await engine.execute(pipeline, input, context);
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(10000); // Не более 10 секунд
      expect(result.totalTime).toBeLessThan(10000);

      console.log(`⚡ Performance test completed in ${executionTime}ms`);
    });

    it('should handle concurrent pipeline executions', async () => {
      const pipeline = new SimpleContentPipeline();
      const inputs = [
        'Первый текст для параллельного анализа.',
        'Второй текст для параллельного анализа.',
        'Третий текст для параллельного анализа.'
      ];

      const contexts = inputs.map((_, index) => ({
        ...context,
        requestId: `concurrent-test-${index}-${Date.now()}`
      }));

      const promises = inputs.map((content, index) => 
        engine.execute(
          pipeline, 
          SimpleContentPipeline.prepareInput(content), 
          contexts[index]
        )
      );

      const results = await Promise.all(promises);

      // Все выполнения должны завершиться успешно
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        console.log(`📈 Concurrent execution ${index + 1}: ${result.totalTime}ms, ${result.totalCost} credits`);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters and unicode', async () => {
      const pipeline = new SimpleContentPipeline();
      const input = SimpleContentPipeline.prepareInput(
        'Тест с эмодзи 🚀 и специальными символами: @#$%^&*()_+ "quotes" и unicode символы: ñáéíóú'
      );

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);
      expect(result.steps.size).toBe(3);
    });

    it('should maintain data consistency across steps', async () => {
      const pipeline = new SimpleContentPipeline();
      const testContent = 'Детальный тест для проверки консистентности данных между шагами пайплайна.';
      const input = SimpleContentPipeline.prepareInput(testContent);

      const result = await engine.execute(pipeline, input, context);

      expect(result.success).toBe(true);

      // Проверяем, что все шаги получили одинаковый входной контент
      const summaryData = context.sharedData.get('analyze_summary');
      const keywordsData = context.sharedData.get('analyze_keywords');
      const structureData = context.sharedData.get('analyze_structure');

      expect(summaryData).toBeDefined();
      expect(keywordsData).toBeDefined();
      expect(structureData).toBeDefined();

      // Каждый шаг должен содержать данные анализа
      expect(summaryData).toHaveProperty('summary');
      expect(keywordsData).toHaveProperty('keywords');
      expect(structureData).toHaveProperty('structure');
    });
  });
}); 