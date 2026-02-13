export enum ComplexityLevel {
  SIMPLE = 1,     // 1-2 кредита, < 2 сек
  MEDIUM = 2,     // 3-5 кредитов, 2-10 сек  
  COMPLEX = 3,    // 6-10 кредитов, 10-30 сек
  HEAVY = 4       // 11+ кредитов, 30+ сек
}

export enum AIOperationCategory {
  CONTENT_GENERATION = 'content_generation',
  CONTENT_ANALYSIS = 'content_analysis', 
  STRUCTURE_PLANNING = 'structure_planning',
  CONTENT_ENHANCEMENT = 'content_enhancement',
  QUALITY_ASSURANCE = 'quality_assurance'
}

export interface ExecutionContext {
  userId: string;
  projectId: string;
  nodeId?: string;
  priority?: 'low' | 'normal' | 'high';
  userTier?: 'basic' | 'business' | 'enterprise';
  requestId: string;
  startTime: Date;
  // Шаред данные между операциями в пайплайне
  sharedData: Map<string, any>;
  // Результаты предыдущих операций
  previousResults: Map<string, any>;
  // Настройки пользователя для AI операций
  userSettings?: {
    preferredProvider?: any;
    preferredModel?: string;
    creativityLevel?: number;
  };
}

export interface OperationResult {
  success: boolean;
  data?: any;
  error?: string;
  errorStack?: string;
  startTime?: Date;
  endTime?: Date;
  metadata: {
    executionTime: number;
    tokensUsed?: number;
    cost?: number;
    model?: string;
    operationId?: string;
    operationName?: string;
    operationVersion?: string;
    category?: string;
    complexity?: number;
    validationErrors?: string[];
    errorType?: string;
    // Поля для AI-специфичной информации 
    provider?: string;
    prompt?: string;
    context?: string;
    fullResponse?: string;
    promptTokens?: number;
    completionTokens?: number;
    temperature?: number;
    maxTokens?: number;
    responseTime?: number;
    generatedAt?: string;
    [key: string]: any; // Для дополнительных полей от операций
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface OperationRequirements {
  requiredCapabilities: string[];
  maxTokens?: number;
  timeout?: number;
}

/**
 * Базовый интерфейс для всех AI операций
 * Следует принципу Single Responsibility - каждая операция выполняет одну задачу
 */
export interface AIOperation {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly category: AIOperationCategory;
  readonly complexity: ComplexityLevel;
  readonly requirements: OperationRequirements;

  /**
   * Валидация входных данных
   * @param input - входные данные для операции
   * @param context - контекст выполнения
   */
  validate(input: any, context: ExecutionContext): ValidationResult;

  /**
   * Основная логика выполнения операции
   * @param input - входные данные
   * @param context - контекст выполнения
   */
  execute(input: any, context: ExecutionContext): Promise<OperationResult>;

  /**
   * Оценка стоимости выполнения операции
   * @param input - входные данные
   * @param context - контекст выполнения
   */
  estimateCost(input: any, context: ExecutionContext): number;
} 