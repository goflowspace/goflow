import { AIOperation, ExecutionContext, OperationResult, ValidationResult } from './operation.interface';

/**
 * Шаг выполнения в пайплайне
 * Следует принципу Interface Segregation - минимальный интерфейс
 */
export interface PipelineStep {
  readonly id: string;
  readonly operation: AIOperation;
  readonly dependencies: string[]; // ID предыдущих шагов
  // Условие выполнения шага (опционально)
  condition?: (context: ExecutionContext, previousResults: Map<string, OperationResult>) => boolean;
  // Трансформация входных данных для шага (опционально)
  inputTransform?: (input: any, context: ExecutionContext, previousResults: Map<string, OperationResult>) => any;
}

/**
 * Результат выполнения пайплайна
 */
export interface PipelineResult {
  success: boolean;
  steps: Map<string, OperationResult>;
  totalCost: number;
  totalTime: number;
  error?: string;
  suggestionId?: string; // ID suggestion для кнопок accept/reject
}

/**
 * Входные данные для пайплайна
 */
export interface PipelineInput {
  [key: string]: any;
}

/**
 * Структура группы шагов пайплайна для UI
 */
export interface PipelineStepGroup {
  id: string;
  name: string;
  type: 'sequential' | 'parallel';
  steps: Array<{
    id: string;
    name: string;
    description: string;
    dependencies: string[];
    isOptional: boolean;
  }>;
}

/**
 * Структура пайплайна для отображения в UI
 */
export interface PipelineStructure {
  id: string;
  name: string;
  description: string;
  groups: PipelineStepGroup[];
}

/**
 * Интерфейс пайплайна
 * Следует принципу Open/Closed - расширяем без изменения
 */
export interface AIPipeline {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly steps: PipelineStep[];

  /**
   * Валидация пайплайна (проверка зависимостей, циклов и т.д.)
   */
  validate(): ValidationResult;

  /**
   * Оценка общей стоимости выполнения пайплайна
   * @param input - входные данные
   * @param context - контекст выполнения
   */
  estimateCost(input: PipelineInput, context: ExecutionContext): number;

  /**
   * Оценка времени выполнения пайплайна
   * @param input - входные данные
   * @param context - контекст выполнения
   */
  estimateTime(input: PipelineInput, context: ExecutionContext): number;

  /**
   * Получение структуры пайплайна для отображения в UI
   * Каждый пайплайн должен описать свою структуру для пользователя
   */
  getPipelineStructure(): PipelineStructure;

  /**
   * Подготовка входных данных для пайплайна
   * @param args - аргументы специфичные для каждого пайплайна
   */
  prepareInput(...args: any[]): PipelineInput;

  /**
   * Трансформация результата пайплайна в удобный формат
   * @param pipelineResult - результат выполнения пайплайна
   * @param startTime - время начала выполнения для расчета метрик
   */
  transformResult(pipelineResult: any, startTime: Date): any;

  /**
   * Получение детального отчета о выполнении пайплайна
   * @param pipelineResult - результат выполнения пайплайна
   */
  getDetailedReport(pipelineResult: any): string;
}



/**
 * Интерфейс движка для выполнения пайплайнов
 * Следует принципу Dependency Inversion - зависимость от абстракции
 */
export interface PipelineEngine {
  /**
   * Выполнение пайплайна
   * @param pipeline - пайплайн для выполнения
   * @param input - входные данные
   * @param context - контекст выполнения
   */
  execute(pipeline: AIPipeline, input: PipelineInput, context: ExecutionContext): Promise<PipelineResult>;

  /**
   * Получение статуса выполнения пайплайна (для асинхронных операций)
   * @param requestId - ID запроса
   */
  getStatus(requestId: string): Promise<PipelineExecutionStatus>;
}

/**
 * Статус выполнения пайплайна
 */
export interface PipelineExecutionStatus {
  requestId: string;
  projectId?: string; // Для WebSocket эмиссии
  userId?: string; // Для WebSocket эмиссии
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep?: string;
  progress: number; // 0-100%
  startTime: Date;
  endTime?: Date;
  result?: PipelineResult;
  completedStepsExplanations?: Record<string, string>; // stepId -> explanation
  completedStepsContent?: Record<string, any>; // stepId -> generated content
} 