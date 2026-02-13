// backend/src/modules/ai/v2/core/PipelineEngine.ts
import { AIPipeline } from './AIPipeline';
import { OperationOutput, ExecutionContext } from '../shared/types';
import { PipelineStep } from '../shared/pipeline-types';
import { aiLogger } from '../logging';
import { PipelineStorageAdapter } from '../storage/PipelineStorageAdapter';
import { getPipelineStorageService } from '../storage';
import { StorageContext } from '../storage/StorageContext';
import { ErrorClassifier, ErrorClassification } from './ErrorClassification';
import { prisma } from '../../../../config/prisma';

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

export interface PipelineStateUpdate {
  progress: number;
  stepStates: Map<string, StepStatus>;
  results: Map<string, OperationOutput>;
  lastChangedStep?: {
    id: string;
    status: StepStatus;
  };
}

export type OnPipelineUpdateCallback = (update: PipelineStateUpdate) => void;

export class StreamingPipelineEngine {
  private results: Map<string, OperationOutput>;
  private stepPromises: Map<string, Promise<void>>;
  private stepStates: Map<string, StepStatus>;
  private pipeline: AIPipeline | null = null;
  private pipelineInput: any = null;
  private context: ExecutionContext | null = null;
  private onPipelineUpdate: OnPipelineUpdateCallback | null = null;
  private storageAdapter: PipelineStorageAdapter | null = null;

  constructor(enableStorage: boolean = true, tolerateStorageErrors: boolean = false) {
    this.results = new Map();
    this.stepPromises = new Map();
    this.stepStates = new Map();
    
    if (enableStorage) {
      try {
        const storageService = getPipelineStorageService(prisma);
        this.storageAdapter = new PipelineStorageAdapter(storageService);

      } catch (error) {
        console.error('❌ CRITICAL: Failed to initialize pipeline storage adapter:', error);
        console.error('❌ This will result in pipeline execution data NOT being saved to database!');
        
        if (tolerateStorageErrors) {
          console.warn('⚠️ Continuing without storage adapter due to tolerateStorageErrors=true');
          this.storageAdapter = null;
        } else {
          // Вместо silent fail, выбрасываем ошибку
          throw new Error(`Pipeline storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  public async execute(
    pipeline: AIPipeline,
    pipelineInput: any,
    context: ExecutionContext,
    onPipelineUpdate?: OnPipelineUpdateCallback,
  ): Promise<Map<string, OperationOutput>> {
    this.pipeline = pipeline;
    this.pipelineInput = pipelineInput;
    this.context = context;
    this.onPipelineUpdate = onPipelineUpdate || null;
    
    this.stepStates.clear();
    this.pipeline.steps.forEach(step => this.stepStates.set(step.id, 'pending'));

    const startTime = Date.now();
    
    aiLogger.getBaseLogger().info(`🚀 Pipeline started: ${pipeline.name}`, {
      userId: context.userId,
      projectId: context.projectId,
      requestId: context.requestId,
      pipelineId: pipeline.id
    }, {
      totalSteps: pipeline.steps.length
    });

    if (this.storageAdapter) {
      try {
        this.storageAdapter.initializePipelineExecution(pipeline, pipelineInput, context);
      } catch (error) {
        console.warn('Failed to initialize pipeline execution data collection:', error);
      }
    }

    try {
      const allPromises = this.pipeline.steps.map(step => this._executeStep(step.id));
      await Promise.all(allPromises);
      
      const totalDuration = Date.now() - startTime;
      const stepsCompleted = Array.from(this.results.values()).filter(r => !r.skipped && !r.error).length;
      const stepsSkipped = Array.from(this.results.values()).filter(r => r.skipped).length;
      const stepsFailed = Array.from(this.results.values()).filter(r => r.error).length;
      
      aiLogger.pipelineComplete(
        pipeline.id,
        context,
        totalDuration,
        stepsCompleted,
        stepsSkipped,
        stepsFailed
      );

      if (this.storageAdapter) {
        try {
          const executionId = await this.storageAdapter.finalizePipelineExecution(this.results);
          console.log(`📊 Pipeline execution data saved: ${executionId}`);
        } catch (error) {
          console.error('Failed to save pipeline execution data:', error);
          throw error;
        }
      }
      
      return this.results;
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      aiLogger.getBaseLogger().error(`❌ Pipeline failed: ${pipeline.name}`, {
        userId: context.userId,
        projectId: context.projectId,
        requestId: context.requestId,
        pipelineId: pipeline.id
      }, {
        totalDuration,
        error: {
          name: (error as Error).name,
          message: (error as Error).message
        }
      });

      if (this.storageAdapter) {
        try {
          const executionId = await this.storageAdapter.finalizePipelineExecution(this.results, error as Error);
          console.log(`📊 Pipeline execution data saved with error: ${executionId}`);
        } catch (storageError) {
          console.error('Failed to save pipeline execution data:', storageError);
        }
      }

      throw error;
    }
  }

  private _notifyUpdate(lastChangedStep?: { id: string, status: StepStatus }) {
    if (!this.onPipelineUpdate || !this.pipeline) return;

    const completedCount = Array.from(this.stepStates.values()).filter(
      s => s === 'completed' || s === 'skipped' || s === 'failed'
    ).length;
    const progress = Math.round((completedCount / this.pipeline.steps.length) * 100);

    const update: PipelineStateUpdate = {
      progress,
      stepStates: new Map(this.stepStates),
      results: new Map(this.results),
      lastChangedStep,
    };

    this.onPipelineUpdate(update);
  }

  private async _executeStep(stepId: string): Promise<void> {
    if (this.stepPromises.has(stepId)) {
      return this.stepPromises.get(stepId);
    }

    const step = this.pipeline!.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step with id ${stepId} not found in pipeline.`);
    }

    const stepPromise = (async () => {
      const dependencyPromises = (step.dependencies || []).map(depId => this._executeStep(depId));
      await Promise.all(dependencyPromises);

      if (this.stepStates.get(stepId) !== 'pending') {
        return;
      }

      // Проверяем, что все зависимости завершились успешно
      const failedDependencies = (step.dependencies || []).filter(depId => {
        const depResult = this.results.get(depId);
        return depResult && depResult.error;
      });

      if (failedDependencies.length > 0) {
        const output = { 
          skipped: true, 
          reason: `Dependency failures: ${failedDependencies.join(', ')}`,
          failedDependencies 
        };
        this.results.set(step.id, output);
        this.stepStates.set(step.id, 'skipped');
        this._notifyUpdate({ id: step.id, status: 'skipped' });
        console.warn(`⏭️ Skipping step ${step.id} due to failed dependencies: ${failedDependencies.join(', ')}`);
        return;
      }

      if (step.condition && !step.condition(this.results)) {
        const output = { skipped: true, reason: 'Condition not met' };
        this.results.set(step.id, output);
        this.stepStates.set(step.id, 'skipped');
        this._notifyUpdate({ id: step.id, status: 'skipped' });
        return;
      }

      this.stepStates.set(step.id, 'active');
      this._notifyUpdate({ id: step.id, status: 'active' });

      let operationInput = step.mapInput
        ? step.mapInput(this.results, this.pipelineInput)
        : (step.dependencies || []).reduce((acc, depId) => ({ ...acc, ...this.results.get(depId) }), { ...this.pipelineInput });

      // Добавляем customPrompt из шага в operationInput, если он указан
      if (step.customPrompt) {
        const resolvedCustomPrompt = step.customPrompt(this.results, this.pipelineInput);
        
        if (resolvedCustomPrompt && resolvedCustomPrompt.trim() !== '') {
          operationInput = {
            ...operationInput,
            customPrompt: resolvedCustomPrompt.trim()
          };
        }
      }

      if (this.storageAdapter) {
        this.storageAdapter.updateStepInput(step.id, operationInput);
      }

      // Выполняем шаг с повторными попытками
      await this._executeStepWithRetries(step, operationInput);
    })();

    this.stepPromises.set(step.id, stepPromise);
    return stepPromise;
  }

  /**
   * Выполняет шаг с поддержкой повторных попыток
   */
  private async _executeStepWithRetries(step: PipelineStep, operationInput: any): Promise<void> {
    // Получаем конфигурацию повторных попыток
    const retryConfig = this._getRetryConfig(step);
    
    let lastError: Error | null = null;
    let attempt = 0;
    const maxAttempts = (retryConfig.maxRetries || 0) + 1; // +1 для первой попытки
    
    while (attempt < maxAttempts) {
      attempt++;
      
      try {
        // Логируем попытку
        if (attempt > 1) {
          console.log(`🔄 Retry attempt ${attempt}/${maxAttempts} for step: ${step.id}`);
          aiLogger.getBaseLogger().info(`🔄 Retrying step: ${step.id}`, {
            userId: this.context!.userId,
            projectId: this.context!.projectId,
            requestId: this.context!.requestId
          }, {
            stepId: step.id,
            attempt,
            maxAttempts,
            previousError: lastError?.message
          });
        }
        
        // Инициализируем storage адаптер
        if (this.storageAdapter) {
          StorageContext.getInstance().setStorageAdapter(this.storageAdapter);
          StorageContext.getInstance().setCurrentStepId(step.id);
          
          // Уведомляем адаптер о начале выполнения шага (только для первой попытки)
          if (attempt === 1) {
            this.storageAdapter.onStepStart(step.id, { input: operationInput }, {
              operationType: step.operation.type,
              qualityLevel: step.qualityLevel || this.context!.qualityLevel
            });
          }
        }
        
        // Создаем контекст для шага
        const stepContext: ExecutionContext = {
          ...this.context!,
          qualityLevel: step.qualityLevel || this.context!.qualityLevel,
        };
        
        // Выполняем операцию
        const output = await step.operation.execute(operationInput, stepContext);
        
        // Успешное выполнение
        this.results.set(step.id, output);
        this.stepStates.set(step.id, 'completed');
        
        // Логируем успешное выполнение
        const logMessage = attempt > 1 
          ? `✅ Step completed after ${attempt} attempts: ${step.id}`
          : `✅ Step completed: ${step.id}`;
          
        aiLogger.getBaseLogger().info(logMessage, {
          userId: stepContext.userId,
          projectId: stepContext.projectId,
          requestId: stepContext.requestId
        }, attempt > 1 ? { stepId: step.id, attemptsRequired: attempt } : { stepId: step.id });
        
        if (this.storageAdapter) {
          this.storageAdapter.onStepComplete(step.id, output);
        }
        
        this._notifyUpdate({ id: step.id, status: 'completed' });
        return; // Успешно завершили, выходим
        
      } catch (error) {
        lastError = error as Error;
        
        // Классифицируем ошибку
        const errorClassification = ErrorClassifier.classifyError(lastError);
        
        // Проверяем, можно ли повторить
        const shouldRetry = this._shouldRetryError(errorClassification, retryConfig, attempt, maxAttempts);
        
        if (shouldRetry) {
          // Вычисляем задержку
          const retryDelay = ErrorClassifier.calculateRetryDelay(
            attempt, 
            errorClassification.retryDelayMs || retryConfig.retryDelayMs || 1000,
            retryConfig.exponentialBackoff !== false
          );
          
          console.warn(`⚠️ Step ${step.id} failed (attempt ${attempt}/${maxAttempts}), retrying in ${retryDelay}ms...`);
          console.warn(`Error: ${lastError.message}`);
          console.warn(`Classification: ${errorClassification.type} (${errorClassification.reason})`);
          
          // Ожидаем перед повторной попыткой
          if (retryDelay > 0) {
            await this._delay(retryDelay);
          }
          
          continue; // Переходим к следующей попытке
        } else {
          // Не можем повторить - завершаем с ошибкой
          console.error(`❌ Step ${step.id} failed permanently after ${attempt} attempts`);
          console.error(`Final error: ${lastError.message}`);
          console.error(`Classification: ${errorClassification.type} (${errorClassification.reason})`);
          break;
        }
      } finally {
        if (this.storageAdapter) {
          StorageContext.getInstance().setCurrentStepId(null);
        }
      }
    }
    
    // Если мы дошли сюда, значит все попытки исчерпаны
    const output = { 
      error: true, 
      message: lastError?.message || 'Unknown error',
      attempts: attempt,
      maxAttempts: maxAttempts
    };
    
    this.results.set(step.id, output);
    this.stepStates.set(step.id, 'failed');
    
    // Логируем финальную ошибку
    aiLogger.getBaseLogger().error(`❌ Step failed permanently: ${step.id}`, {
      userId: this.context!.userId,
      projectId: this.context!.projectId,
      requestId: this.context!.requestId
    }, {
      stepId: step.id,
      attempts: attempt,
      maxAttempts: maxAttempts,
      finalError: lastError?.message
    });
    
    if (this.storageAdapter) {
      this.storageAdapter.onStepComplete(step.id, output, lastError || new Error('Unknown error'));
    }
    
    this._notifyUpdate({ id: step.id, status: 'failed' });
    
    // Не прерываем выполнение всего пайплайна при ошибке одного шага
    console.warn(`⚠️ Step ${step.id} failed permanently, but continuing pipeline execution`);
  }

  /**
   * Получает конфигурацию повторных попыток для шага
   */
  private _getRetryConfig(step: PipelineStep) {
    // Приоритет: конфигурация шага > конфигурация контекста > значения по умолчанию
    const contextConfig = this.context?.pipelineRetryConfig || {};
    const stepConfig = step.retryConfig || {};
    
    return {
      maxRetries: stepConfig.maxRetries ?? contextConfig.maxRetries ?? 0,
      retryDelayMs: stepConfig.retryDelayMs ?? contextConfig.retryDelayMs ?? 1000,
      exponentialBackoff: stepConfig.exponentialBackoff ?? contextConfig.exponentialBackoff ?? true,
      retryableErrorTypes: stepConfig.retryableErrorTypes ?? contextConfig.retryableErrorTypes ?? []
    };
  }

  /**
   * Определяет, нужно ли повторить ошибку
   */
  private _shouldRetryError(
    classification: ErrorClassification, 
    retryConfig: any, 
    currentAttempt: number, 
    maxAttempts: number
  ): boolean {
    // Если больше нет попыток
    if (currentAttempt >= maxAttempts) {
      return false;
    }
    
    // Если ошибка не подлежит повтору согласно классификации
    if (!classification.retryable) {
      return false;
    }
    
    // Если указаны конкретные типы ошибок для повтора
    if (retryConfig.retryableErrorTypes && retryConfig.retryableErrorTypes.length > 0) {
      return retryConfig.retryableErrorTypes.includes(classification.type);
    }
    
    // По умолчанию повторяем только временные ошибки и rate limit
    return classification.type === 'temporary' || classification.type === 'rate_limit';
  }

  /**
   * Утилита для создания задержки
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
