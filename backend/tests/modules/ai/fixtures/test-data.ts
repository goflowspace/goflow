import { 
  ExecutionContext,
  AIOperationCategory,
  ComplexityLevel
} from '../../../../src/modules/ai/pipeline/interfaces/operation.interface';
import { PipelineInput } from '../../../../src/modules/ai/pipeline/interfaces/pipeline.interface';

/**
 * Тестовые контексты выполнения
 */
export const TEST_CONTEXTS = {
  basic: {
    userId: 'test-user-123',
    projectId: 'test-project-456',
    requestId: 'test-request-789',
    startTime: new Date('2024-01-01T10:00:00Z'),
    sharedData: new Map(),
    previousResults: new Map()
  } as ExecutionContext,

  enterprise: {
    userId: 'enterprise-user-123',
    projectId: 'enterprise-project-456',
    userTier: 'enterprise' as const,
    priority: 'high' as const,
    requestId: 'enterprise-request-789',
    startTime: new Date('2024-01-01T10:00:00Z'),
    sharedData: new Map(),
    previousResults: new Map()
  } as ExecutionContext,

  business: {
    userId: 'business-user-123',
    projectId: 'business-project-456',
    userTier: 'business' as const,
    priority: 'normal' as const,
    requestId: 'business-request-789',
    startTime: new Date('2024-01-01T10:00:00Z'),
    sharedData: new Map(),
    previousResults: new Map()
  } as ExecutionContext
};

/**
 * Тестовый контент для анализа
 */
export const TEST_CONTENT = {
  short: 'Короткий тестовый текст.',
  
  medium: `
    В далекой галактике, где звезды танцевали в космической тишине, 
    жил храбрый исследователь по имени Алекс. Он путешествовал между 
    планетами в поисках древних артефактов, которые могли бы раскрыть 
    тайны прошлых цивилизаций. Каждое новое открытие приближало его 
    к разгадке великой космической загадки.
  `,
  
  long: `
    В эпоху великих открытий, когда человечество только начинало 
    познавать тайны вселенной, на далекой планете Кейплер-442b 
    происходили события, которые навсегда изменили ход истории.
    
    Капитан Сара Чен, опытный исследователь космоса, командовала 
    экспедицией из двенадцати ученых различных специальностей. 
    Их миссия была проста на первый взгляд: изучить атмосферу 
    и поверхность планеты, проверить пригодность для колонизации.
    
    Однако то, что они обнаружили, превзошло все ожидания. 
    Под поверхностью планеты скрывалась развитая подземная 
    цивилизация, которая существовала уже тысячи лет. 
    Их технологии намного превосходили человеческие, 
    особенно в области экологии и устойчивого развития.
    
    Первый контакт произошел случайно, когда геолог Дэвид Ким 
    провалился в подземную пещеру во время сбора образцов. 
    Вместо скал и минералов он обнаружил светящиеся коридоры 
    и странные механизмы, которые явно были созданы разумными 
    существами.
  `,
  
  technical: `
    Алгоритм машинного обучения для классификации текстов 
    использует сверточные нейронные сети (CNN) в сочетании 
    с рекуррентными нейронными сетями (RNN). Архитектура 
    включает слои эмбеддинга, свертки, пулинга и полносвязные 
    слои. Функция активации ReLU применяется для введения 
    нелинейности, а слой dropout предотвращает переобучение.
  `,
  
  emotional: `
    Сердце билось так быстро, что казалось, вот-вот выпрыгнет 
    из груди. Это был момент истины, момент, к которому она 
    готовилась всю жизнь. Зал затих в ожидании, сотни глаз 
    устремились на сцену. Одно неверное движение, и все 
    годы тренировок пойдут прахом. Но она была готова. 
    Глубокий вдох... и музыка заиграла.
  `,

  multilingual: `
    Hello, world! Привет, мир! Hola, mundo! Bonjour, le monde! 
    こんにちは世界！ 你好世界！ Hej världen! Hallo wereld! 
    This text contains multiple languages and scripts for testing 
    unicode and internationalization support in our pipeline.
  `,

  specialCharacters: `
    Тест со специальными символами: @#$%^&*()_+-=[]{}|;:'"<>?/~
    И эмодзи: 🚀🎯💡🔥⚡🌟🎪🎨🎭🎪 
    И математические символы: ∑∆√∞≠≤≥±∴∵∈∉⊂⊃
  `
};

/**
 * Ожидаемые результаты для тестового контента
 */
export const EXPECTED_RESULTS = {
  medium_analysis: {
    summary: expect.stringContaining('исследователь'),
    keywords: expect.arrayContaining(['галактика', 'исследователь', 'артефакты']),
    confidence: expect.any(Number),
    structure: {
      characters: expect.arrayContaining(['Алекс']),
      locations: expect.any(Array),
      themes: expect.any(Array)
    }
  },

  technical_analysis: {
    summary: expect.stringContaining('алгоритм'),
    keywords: expect.arrayContaining(['машинное обучение', 'нейронные сети']),
    confidence: expect.any(Number)
  }
};

/**
 * Mock данные для AI провайдеров
 */
export const MOCK_AI_RESPONSES = {
  summary: {
    title: 'Content Summary',
    description: 'Comprehensive summary of the provided content with key insights and main themes.',
    type: 'STRUCTURE_ONLY',
    confidence: 0.92,
    entities: []
  },

  keywords: {
    title: 'Key Topics',
    description: 'Main topics and themes extracted from the content',
    type: 'STRUCTURE_ONLY', 
    confidence: 0.85,
    entities: ['adventure', 'exploration', 'discovery', 'mystery', 'science fiction']
  },

  structure: {
    title: 'Structural Elements',
    description: 'Analysis of narrative structure and elements',
    type: 'STRUCTURE_ONLY',
    confidence: 0.88,
    entities: ['protagonist', 'setting', 'conflict', 'resolution', 'theme']
  },

  sentiment_positive: {
    title: 'Sentiment Analysis',
    description: 'Overall emotional tone: positive',
    type: 'STRUCTURE_ONLY',
    confidence: 0.89
  },

  sentiment_negative: {
    title: 'Sentiment Analysis', 
    description: 'Overall emotional tone: negative',
    type: 'STRUCTURE_ONLY',
    confidence: 0.91
  },

  sentiment_neutral: {
    title: 'Sentiment Analysis',
    description: 'Overall emotional tone: neutral',
    type: 'STRUCTURE_ONLY',
    confidence: 0.76
  }
};

/**
 * Тестовые входные данные для пайплайнов
 */
export const PIPELINE_INPUTS = {
  contentAnalysis: {
    analyze_summary: {
      content: TEST_CONTENT.medium,
      analysisType: 'summary'
    },
    analyze_keywords: {
      content: TEST_CONTENT.medium,
      analysisType: 'keywords'
    },
    analyze_structure: {
      content: TEST_CONTENT.medium,
      analysisType: 'structure'
    }
  } as PipelineInput,

  simpleTest: {
    content: TEST_CONTENT.short
  } as PipelineInput,

  complexTest: {
    content: TEST_CONTENT.long,
    options: {
      detailedAnalysis: true,
      includeMetrics: true
    }
  } as PipelineInput
};

/**
 * Ошибки для тестирования обработки исключений
 */
export const TEST_ERRORS = {
  validation: {
    message: 'Validation failed: Input data is invalid',
    code: 'VALIDATION_ERROR'
  },

  execution: {
    message: 'Operation execution failed: AI provider error',
    code: 'EXECUTION_ERROR'
  },

  timeout: {
    message: 'Operation timeout: Exceeded maximum execution time',
    code: 'TIMEOUT_ERROR'
  },

  dependency: {
    message: 'Dependency error: Required operation not completed',
    code: 'DEPENDENCY_ERROR'
  }
};

/**
 * Конфигурация производительности для тестов
 */
export const PERFORMANCE_LIMITS = {
  maxExecutionTime: 10000, // 10 секунд
  maxMemoryUsage: 100 * 1024 * 1024, // 100 MB
  maxConcurrentExecutions: 5,
  
  operations: {
    simple: { maxTime: 1000, maxCost: 2 },
    medium: { maxTime: 3000, maxCost: 5 },
    complex: { maxTime: 8000, maxCost: 12 },
    heavy: { maxTime: 15000, maxCost: 25 }
  }
};

/**
 * Утилиты для создания тестовых данных
 */
export class TestDataFactory {
  /**
   * Создает тестовый контекст с заданными параметрами
   */
  static createContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
    return {
      ...TEST_CONTEXTS.basic,
      ...overrides,
      requestId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      sharedData: new Map(),
      previousResults: new Map()
    };
  }

  /**
   * Создает тестовый контент заданной длины
   */
  static createContent(length: 'short' | 'medium' | 'long' | number): string {
    if (typeof length === 'string') {
      return TEST_CONTENT[length];
    }

    const baseText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
    const targetLength = length;
    let result = '';
    
    while (result.length < targetLength) {
      result += baseText;
    }
    
    return result.substring(0, targetLength);
  }

  /**
   * Создает mock ответ AI провайдера
   */
  static createAIResponse(type: keyof typeof MOCK_AI_RESPONSES, overrides: any = {}) {
    return {
      ...MOCK_AI_RESPONSES[type],
      ...overrides
    };
  }

  /**
   * Создает mock AI провайдер с настраиваемым поведением
   */
  static createMockProvider(behavior: {
    shouldFail?: boolean;
    delay?: number;
    responses?: any[];
  } = {}) {
    const { shouldFail = false, delay = 0, responses = [] } = behavior;
    
    return {
      generateSuggestions: jest.fn(async (data) => {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        if (shouldFail) {
          throw new Error('Mock AI provider error');
        }
        
        if (responses.length > 0) {
          return responses;
        }
        
        // Возвращаем ответ на основе контекста
        const context = data.context.toLowerCase();
        
        if (context.includes('summary')) {
          return [MOCK_AI_RESPONSES.summary];
        } else if (context.includes('keywords')) {
          return [MOCK_AI_RESPONSES.keywords];
        } else if (context.includes('structure')) {
          return [MOCK_AI_RESPONSES.structure];
        }
        
        return [MOCK_AI_RESPONSES.summary];
      })
    };
  }

  /**
   * Создает набор тестовых метрик
   */
  static createMetrics(overrides: any = {}) {
    return {
      executionTime: 1500,
      tokensUsed: 750,
      cost: 3,
      model: 'test-model',
      ...overrides
    };
  }
}

/**
 * Помощники для assertions в тестах
 */
export const TestAssertions = {
  /**
   * Проверяет структуру результата выполнения операции
   */
  expectOperationResult: (result: any) => {
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toHaveProperty('executionTime');
    expect(typeof result.metadata.executionTime).toBe('number');
    expect(result.metadata.executionTime).toBeGreaterThan(0);
    
    if (result.success) {
      expect(result).toHaveProperty('data');
    } else {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    }
  },

  /**
   * Проверяет структуру результата выполнения пайплайна
   */
  expectPipelineResult: (result: any) => {
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('steps');
    expect(result).toHaveProperty('totalCost');
    expect(result).toHaveProperty('totalTime');
    
    expect(typeof result.success).toBe('boolean');
    expect(result.steps).toBeInstanceOf(Map);
    expect(typeof result.totalCost).toBe('number');
    expect(typeof result.totalTime).toBe('number');
    expect(result.totalTime).toBeGreaterThan(0);
  },

  /**
   * Проверяет порядок выполнения шагов
   */
  expectExecutionOrder: (actualOrder: string[], expectedOrder: string[]) => {
    expect(actualOrder).toHaveLength(expectedOrder.length);
    
    for (let i = 0; i < expectedOrder.length; i++) {
      expect(actualOrder).toContain(expectedOrder[i]);
    }
  }
}; 