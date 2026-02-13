// Pipeline Execution Data Collector
// Собирает данные о выполнении пайплайна в памяти для последующего сохранения

import { AIPipeline } from '../core/AIPipeline';
import { ExecutionContext, AIOperationOutput } from '../shared/types';
import { AIPipelineStatus, AIPipelineStepStatus } from '@prisma/client';

interface StepExecutionData {
  stepId: string;
  stepIndex: number;
  operationId: string;
  operationName: string;
  operationVersion: string;
  dependencies: string[];
  
  // Входные данные
  input?: any;
  
  // Промпты
  systemPrompt?: string;
  userPrompt?: string;
  
  // Конфигурация модели
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  qualityLevel?: string;
  
  // Временные метрики
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  
  // Валидация
  validationDuration?: number;
  validationErrors?: string[];
  
  // Вызов провайдера
  providerCallDuration?: number;
  inputTokens?: number;
  outputTokens?: number;
  realCostUSD?: number;
  creditsCharged?: number;
  rawAIResponse?: string;
  
  // Результат
  result?: any;
  status: AIPipelineStepStatus;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  errorStep?: 'validation' | 'provider-call' | 'parsing';
  
  // Дополнительная информация
  skipped?: boolean;
  skipReason?: string;
  suspiciousContent?: {
    reasons: string[];
    detected: boolean;
  };
}

/**
 * Собирает данные о выполнении пайплайна в памяти
 */
export class PipelineExecutionCollector {
  private pipelineData: {
    pipelineId: string;
    pipelineName: string;
    version: string;
    userId: string;
    projectId: string;
    requestId?: string;
    sessionId?: string;
    traceId?: string;
    input: any;
    qualityLevel: string;
    startedAt: Date;
    completedAt?: Date;
    totalDuration?: number;
    status: AIPipelineStatus;
    error?: {
      name: string;
      message: string;
      stack?: string;
    };
  } | null = null;

  private stepsData: Map<string, StepExecutionData> = new Map();
  private stepStartTimes: Map<string, number> = new Map();
  private pipelineStartTime: number = 0;

  /**
   * Инициализирует сбор данных для пайплайна
   */
  initializePipeline(
    pipeline: AIPipeline,
    pipelineInput: any,
    context: ExecutionContext
  ): void {
    this.pipelineStartTime = Date.now();
    
    this.pipelineData = {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      version: pipeline.version,
      userId: context.userId,
      projectId: context.projectId,
      requestId: context.requestId,
      sessionId: context.sessionId,
      traceId: context.traceId,
      input: pipelineInput,
      qualityLevel: context.qualityLevel,
      startedAt: new Date(),
      status: AIPipelineStatus.RUNNING
    };

    // Инициализируем данные для всех шагов
    pipeline.steps.forEach((step, index) => {
      this.stepsData.set(step.id, {
        stepId: step.id,
        stepIndex: index,
        operationId: step.operation.id,
        operationName: step.operation.name,
        operationVersion: step.operation.version,
        dependencies: step.dependencies || [],
        status: AIPipelineStepStatus.PENDING
      });
    });
  }

  /**
   * Обновляет входные данные для шага
   */
  updateStepInput(stepId: string, input: any): void {
    const stepData = this.stepsData.get(stepId);
    if (stepData) {
      stepData.input = input;
    }
  }

  /**
   * Отмечает начало выполнения шага
   */
  startStep(
    stepId: string,
    prompts: { system: string; user: string },
    modelConfig: { provider: string; model: string; temperature?: number; maxTokens?: number; qualityLevel?: string }
  ): void {
    const stepData = this.stepsData.get(stepId);
    if (stepData) {
      stepData.startedAt = new Date();
      stepData.systemPrompt = prompts.system;
      stepData.userPrompt = prompts.user;
      stepData.provider = modelConfig.provider;
      stepData.model = modelConfig.model;
      stepData.temperature = modelConfig.temperature;
      stepData.maxTokens = modelConfig.maxTokens;
      stepData.qualityLevel = modelConfig.qualityLevel;
      stepData.status = AIPipelineStepStatus.RUNNING;
      
      this.stepStartTimes.set(stepId, Date.now());
    }
  }

  /**
   * Записывает результаты валидации
   */
  recordValidation(stepId: string, validationDuration: number, validationErrors?: string[]): void {
    const stepData = this.stepsData.get(stepId);
    if (stepData) {
      stepData.validationDuration = validationDuration;
      stepData.validationErrors = validationErrors;
    }
  }

  /**
   * Записывает информацию о подозрительном контенте
   */
  recordSuspiciousContent(stepId: string, reasons: string[]): void {
    const stepData = this.stepsData.get(stepId);
    if (stepData) {
      stepData.suspiciousContent = {
        detected: true,
        reasons
      };
    }
  }

  /**
   * Записывает результаты вызова провайдера
   */
  recordProviderCall(
    stepId: string,
    providerCallDuration: number,
    inputTokens: number,
    outputTokens: number,
    realCostUSD: number,
    creditsCharged: number,
    rawAIResponse: string
  ): void {
    const stepData = this.stepsData.get(stepId);
    if (stepData) {
      stepData.providerCallDuration = providerCallDuration;
      stepData.inputTokens = inputTokens;
      stepData.outputTokens = outputTokens;
      stepData.realCostUSD = realCostUSD;
      stepData.creditsCharged = creditsCharged;
      stepData.rawAIResponse = rawAIResponse;
    }
  }

  /**
   * Завершает выполнение шага
   */
  completeStep(stepId: string, output: AIOperationOutput, error?: Error): void {
    const stepData = this.stepsData.get(stepId);
    const startTime = this.stepStartTimes.get(stepId);
    
    if (!stepData || !startTime) {
      return;
    }
    
    stepData.completedAt = new Date();
    stepData.duration = Date.now() - startTime;
    
    if (error) {
      stepData.status = AIPipelineStepStatus.FAILED;
      stepData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      
      // Определяем этап ошибки
      if (error.message.includes('Validation failed')) {
        stepData.errorStep = 'validation';
      } else if (error.message.includes('Suspicious content')) {
        stepData.errorStep = 'validation';
      } else if (error.message.includes('provider') || error.message.includes('API')) {
        stepData.errorStep = 'provider-call';
      } else {
        stepData.errorStep = 'parsing';
      }
    } else if (output.skipped) {
      stepData.status = AIPipelineStepStatus.SKIPPED;
      stepData.skipped = true;
      stepData.skipReason = output.message || 'Condition not met';
    } else if ((output as any).error) {
      stepData.status = AIPipelineStepStatus.FAILED;
      stepData.error = {
        name: 'OutputError',
        message: (output as any).message || 'Unknown error from output'
      };
    } else {
      stepData.status = AIPipelineStepStatus.COMPLETED;
      stepData.result = output;
    }
    
    this.stepStartTimes.delete(stepId);
  }

  /**
   * Завершает выполнение пайплайна
   */
  completePipeline(_results: Map<string, AIOperationOutput>, error?: Error): void {
    if (!this.pipelineData) return;

    this.pipelineData.completedAt = new Date();
    this.pipelineData.totalDuration = Date.now() - this.pipelineStartTime;
    
    if (error) {
      this.pipelineData.status = AIPipelineStatus.FAILED;
      this.pipelineData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else {
      this.pipelineData.status = AIPipelineStatus.COMPLETED;
    }
  }

  /**
   * Отменяет выполнение пайплайна
   */
  cancelPipeline(reason?: string): void {
    if (!this.pipelineData) return;

    this.pipelineData.completedAt = new Date();
    this.pipelineData.totalDuration = Date.now() - this.pipelineStartTime;
    this.pipelineData.status = AIPipelineStatus.CANCELLED;
    this.pipelineData.error = reason ? {
      name: 'PipelineCancelled',
      message: reason
    } : undefined;

    // Отмечаем все незавершенные шаги как отмененные
    for (const stepData of this.stepsData.values()) {
      if (stepData.status === AIPipelineStepStatus.PENDING || stepData.status === AIPipelineStepStatus.RUNNING) {
        stepData.status = AIPipelineStepStatus.FAILED;
        stepData.completedAt = new Date();
        stepData.error = {
          name: 'PipelineCancelled',
          message: 'Pipeline was cancelled'
        };
      }
    }
  }

  /**
   * Получает собранные данные для сохранения в БД
   */
  getCollectedData() {
    if (!this.pipelineData) {
      return null;
    }

    const steps = Array.from(this.stepsData.values());
    
    // Агрегируем метрики
    const completedSteps = steps.filter(s => s.status === AIPipelineStepStatus.COMPLETED).length;
    const skippedSteps = steps.filter(s => s.status === AIPipelineStepStatus.SKIPPED).length;
    const failedSteps = steps.filter(s => s.status === AIPipelineStepStatus.FAILED).length;
    
    const totalInputTokens = steps.reduce((sum, step) => sum + (step.inputTokens || 0), 0);
    const totalOutputTokens = steps.reduce((sum, step) => sum + (step.outputTokens || 0), 0);
    const totalRealCostUSD = steps.reduce((sum, step) => sum + (step.realCostUSD || 0), 0);
    const totalCreditsCharged = steps.reduce((sum, step) => sum + (step.creditsCharged || 0), 0);

    // Собираем финальный результат
    const finalResult: Record<string, any> = {};
    for (const step of steps) {
      if (step.result && step.status === AIPipelineStepStatus.COMPLETED) {
        const contentKey = Object.keys(step.result).find(k => k !== 'metadata');
        if (contentKey) {
          finalResult[step.stepId] = step.result[contentKey];
        }
      }
    }

    return {
      pipeline: {
        ...this.pipelineData,
        totalSteps: steps.length,
        completedSteps,
        skippedSteps,
        failedSteps,
        totalInputTokens,
        totalOutputTokens,
        totalRealCostUSD,
        totalCreditsCharged,
        result: Object.keys(finalResult).length > 0 ? finalResult : null
      },
      steps: steps.sort((a, b) => a.stepIndex - b.stepIndex)
    };
  }

  /**
   * Сбрасывает собранные данные
   */
  reset(): void {
    this.pipelineData = null;
    this.stepsData.clear();
    this.stepStartTimes.clear();
    this.pipelineStartTime = 0;
  }
}
