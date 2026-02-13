import {
  PipelineEngine,
  AIPipeline,
  PipelineInput,
  PipelineResult,
  PipelineStep,
  PipelineExecutionStatus
} from '../interfaces/pipeline.interface';
import { ExecutionContext, OperationResult } from '../interfaces/operation.interface';
import { IWebSocketManager } from '../../../websocket/interfaces/websocket.interfaces';
import { CollaborationEventType, AIProgressStatus } from '../../../../types/websocket.types';

/**
 * Параллельный Pipeline Engine
 * Поддерживает параллельное выполнение шагов, которые не зависят друг от друга
 */
export class ParallelPipelineEngine implements PipelineEngine {
  private executionStatuses = new Map<string, PipelineExecutionStatus>();

  constructor(private wsManager?: IWebSocketManager) {}

  async execute(
    pipeline: AIPipeline, 
    input: PipelineInput, 
    context: ExecutionContext
  ): Promise<PipelineResult> {
    console.log('🚀 ParallelPipelineEngine.execute started with context:', {
      requestId: context.requestId,
      projectId: context.projectId,
      userId: context.userId,
      hasWsManager: !!this.wsManager
    });

    const startTime = Date.now();
    const stepResults = new Map<string, OperationResult>();
    let totalCost = 0;

    // Обновляем статус
    this.updateStatus(context.requestId, {
      requestId: context.requestId,
      projectId: context.projectId,
      userId: context.userId,
      status: 'running',
      progress: 0,
      startTime: context.startTime
    });

    try {
      // 1. Валидируем пайплайн
      const validation = pipeline.validate();
      if (!validation.isValid) {
        const error = `Pipeline validation failed: ${validation.errors.join(', ')}`;
        this.updateStatus(context.requestId, {
          requestId: context.requestId,
          projectId: context.projectId,
          userId: context.userId,
          status: 'failed',
          progress: 0,
          startTime: context.startTime,
          endTime: new Date()
        });
        
        return {
          success: false,
          steps: stepResults,
          totalCost: 0,
          totalTime: Date.now() - startTime,
          error
        };
      }

      // 2. Выполняем шаги с поддержкой параллельности
      const result = await this.executeStepsInParallel(pipeline.steps, input, context, stepResults);
      
      if (!result.success) {
        this.updateStatus(context.requestId, {
          requestId: context.requestId,
          projectId: context.projectId,
          userId: context.userId,
          status: 'failed',
          progress: 0,
          startTime: context.startTime,
          endTime: new Date()
        }, new Set(), []);
        
        return {
          success: false,
          steps: stepResults,
          totalCost: result.totalCost,
          totalTime: Date.now() - startTime,
          error: result.error
        };
      }

      totalCost = result.totalCost;
      const totalTime = Date.now() - startTime;

      // Успешное завершение
      this.updateStatus(context.requestId, {
        requestId: context.requestId,
        projectId: context.projectId,
        userId: context.userId,
        status: 'completed',
        progress: 100,
        startTime: context.startTime,
        endTime: new Date(),
        result: {
          success: true,
          steps: stepResults,
          totalCost,
          totalTime
        }
      }, new Set(stepResults.keys()), []);

      console.log(`🎉 Parallel Pipeline ${pipeline.id} completed successfully in ${totalTime}ms`);

      return {
        success: true,
        steps: stepResults,
        totalCost,
        totalTime
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Parallel Pipeline ${pipeline.id} failed:`, error);

      this.updateStatus(context.requestId, {
        requestId: context.requestId,
        projectId: context.projectId,
        userId: context.userId,
        status: 'failed',
        progress: 0,
        startTime: context.startTime,
        endTime: new Date()
      }, new Set(), []);

      return {
        success: false,
        steps: stepResults,
        totalCost,
        totalTime,
        error: errorMessage
      };
    }
  }

  /**
   * Выполнение шагов с поддержкой параллельности
   */
  private async executeStepsInParallel(
    steps: PipelineStep[], 
    input: PipelineInput, 
    context: ExecutionContext,
    stepResults: Map<string, OperationResult>
  ): Promise<{ success: boolean; totalCost: number; error?: string }> {
    let totalCost = 0;
    const executedSteps = new Set<string>();
    const allStepIds = new Set(steps.map(step => step.id));
    
    // Создаем карту шагов для быстрого доступа
    const stepMap = new Map<string, PipelineStep>();
    steps.forEach(step => stepMap.set(step.id, step));

    // Устанавливаем начальный статус
    this.updateStatus(context.requestId, {
      projectId: context.projectId,
      status: 'running',
      progress: 0
    }, new Set(), []);

    console.log('📋 Starting parallel execution of steps:', steps.map(s => s.id));
    console.log('🔗 Step dependencies:');
    steps.forEach(step => {
      console.log(`  ${step.id}: [${step.dependencies.join(', ')}]`);
    });

    while (executedSteps.size < steps.length) {
      // Находим шаги, готовые к выполнению (все зависимости выполнены)
      const readySteps = steps.filter(step => {
        if (executedSteps.has(step.id)) return false; // Уже выполнен
        
        // Проверяем, все ли зависимости выполнены
        const allDepsReady = step.dependencies.every(depId => executedSteps.has(depId));
        
        // Отладочный лог для понимания зависимостей
        if (!allDepsReady) {
          const missingDeps = step.dependencies.filter(depId => !executedSteps.has(depId));
          console.log(`🔍 Step ${step.id} not ready. Missing deps: [${missingDeps.join(', ')}]. Executed: [${Array.from(executedSteps).join(', ')}]`);
        }
        
        return allDepsReady;
      });

      if (readySteps.length === 0) {
        // Проверяем на циклические зависимости или недостающие шаги
        const missingDeps = new Set<string>();
        steps.forEach(step => {
          if (!executedSteps.has(step.id)) {
            step.dependencies.forEach(depId => {
              if (!allStepIds.has(depId) && !executedSteps.has(depId)) {
                missingDeps.add(depId);
              }
            });
          }
        });

        if (missingDeps.size > 0) {
          return {
            success: false,
            totalCost,
            error: `Missing dependencies: ${Array.from(missingDeps).join(', ')}`
          };
        }

        return {
          success: false,
          totalCost,
          error: 'Possible circular dependency detected'
        };
      }

      console.log(`🔄 Executing ${readySteps.length} steps in parallel:`, readySteps.map(s => s.id));

      // ✅ Отслеживаем активные шаги
      const activeSteps = new Set<string>(readySteps.map(s => s.id));

      // Обновляем статус с активными шагами ДО выполнения
      const currentProgress = Math.round((executedSteps.size / steps.length) * 100);
      this.updateStatus(context.requestId, {
        projectId: context.projectId,
        progress: currentProgress,
        completedStepsExplanations: this.executionStatuses.get(context.requestId)?.completedStepsExplanations,
        completedStepsContent: this.executionStatuses.get(context.requestId)?.completedStepsContent
      }, executedSteps, readySteps.map(s => s.id));

      // Выполняем готовые шаги параллельно
      const stepPromises = readySteps.map(async (step) => {
        // Проверяем условие выполнения (если есть)
        if (step.condition && !step.condition(context, stepResults)) {
          console.log(`⏭️ Skipping step ${step.id} due to condition`);
          
          // Сразу обновляем статус для пропущенного шага
          executedSteps.add(step.id);
          activeSteps.delete(step.id); // ✅ Убираем из активных
          this.updateStatusAfterStepCompletion(context, executedSteps, steps, activeSteps);
          
          return { step, result: null, skipped: true };
        }

        // Подготавливаем контекст для операции
        const operationContext: ExecutionContext = {
          ...context,
          previousResults: stepResults
        };

        console.log(`🔄 Executing step: ${step.id} (${step.operation.name})`);
        
        try {
          // Применяем трансформацию входных данных если она определена
          const stepInput = step.inputTransform ? step.inputTransform(input, operationContext, stepResults) : input;
          
          const stepResult = await step.operation.execute(stepInput, operationContext);
          
          // ✅ СРАЗУ после завершения шага обновляем статус
          stepResults.set(step.id, stepResult);
          executedSteps.add(step.id);
          totalCost += stepResult.metadata.cost || 0;
          
          // Сохраняем результат в shared data
          if (stepResult.data) {
            context.sharedData.set(step.id, stepResult.data);
          }
          
          // Сохраняем объяснения и контент
          this.saveStepExplanationAndContent(context.requestId, step.id, stepResult);
          
          // Обновляем статус сразу после завершения этого шага
          activeSteps.delete(step.id); // ✅ Убираем из активных
          this.updateStatusAfterStepCompletion(context, executedSteps, steps, activeSteps);
          
          console.log(`✅ Step ${step.id} completed in ${stepResult.metadata.executionTime}ms`);
          
          return { step, result: stepResult, skipped: false };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Error in operation ${step.id}:`, error);
          
          const stepResult = {
            success: false,
            error: errorMessage,
            data: null,
            metadata: { cost: 0, executionTime: 0 }
          };
          
          // Даже для ошибочных шагов обновляем статус
          stepResults.set(step.id, stepResult);
          executedSteps.add(step.id);
          activeSteps.delete(step.id); // ✅ Убираем из активных
          this.updateStatusAfterStepCompletion(context, executedSteps, steps, activeSteps);
          
          return { step, result: stepResult, skipped: false };
        }
      });

      // Ждем завершения всех параллельных шагов (статус уже обновляется по мере выполнения)
      const stepExecutions = await Promise.all(stepPromises);

      // Проверяем только на критические ошибки, которые должны остановить выполнение
      for (const execution of stepExecutions) {
        const { step, result, skipped } = execution;
        
        if (!skipped && result && !result.success) {
          const error = `Step ${step.id} failed: ${result.error}`;
          console.error(`❌ ${error}`);
          
          return {
            success: false,
            totalCost: totalCost + (result.metadata.cost || 0),
            error
          };
        }
      }
    }

    return { success: true, totalCost };
  }

  async getStatus(requestId: string): Promise<PipelineExecutionStatus> {
    const status = this.executionStatuses.get(requestId);
    
    if (!status) {
      throw new Error(`No execution found for request ${requestId}`);
    }

    return status;
  }

  /**
   * Обновление статуса выполнения
   */
  private updateStatus(requestId: string, status: Partial<PipelineExecutionStatus>, executedSteps?: Set<string>, activeSteps?: string[]) {
    const currentStatus = this.executionStatuses.get(requestId) || {
      requestId,
      status: 'pending' as const,
      progress: 0,
      startTime: new Date()
    };

    const updatedStatus = { ...currentStatus, ...status };
    this.executionStatuses.set(requestId, updatedStatus);

    console.log(`📊 UpdateStatus called for requestId ${requestId}:`, {
      wsManager: !!this.wsManager,
      projectId: status.projectId,
      status: updatedStatus.status,
      progress: updatedStatus.progress,
      currentStep: updatedStatus.currentStep,
      activeSteps: activeSteps?.length || 0,
      completedSteps: executedSteps?.size || 0
    });

    // Эмитим WebSocket события только если есть wsManager и projectId в контексте
    if (this.wsManager && status.projectId) {
      console.log('🚀 Calling emitAIProgressEvent...');
      this.emitAIProgressEvent(status.projectId, updatedStatus, executedSteps, activeSteps);
    } else {
      console.warn('⚠️ Skipping emitAIProgressEvent:', {
        hasWsManager: !!this.wsManager,
        hasProjectId: !!status.projectId
      });
    }
  }

  /**
   * Сохраняет объяснения и контент для завершенного шага
   */
  private saveStepExplanationAndContent(requestId: string, stepId: string, result: OperationResult) {
    const currentStatus = this.executionStatuses.get(requestId);
    if (currentStatus && result.data) {
      // Сохраняем объяснение
      if (result.data.explanation) {
        if (!currentStatus.completedStepsExplanations) {
          currentStatus.completedStepsExplanations = {};
        }
        currentStatus.completedStepsExplanations[stepId] = result.data.explanation;
      }
      
      // Сохраняем сгенерированный контент
      if (result.data.content) {
        if (!currentStatus.completedStepsContent) {
          currentStatus.completedStepsContent = {};
        }
        currentStatus.completedStepsContent[stepId] = result.data.content;
      }
    }
  }

  /**
   * Обновляет статус после завершения шага
   */
  private updateStatusAfterStepCompletion(context: ExecutionContext, executedSteps: Set<string>, allSteps: PipelineStep[], activeSteps: Set<string>) {
    const progress = Math.round((executedSteps.size / allSteps.length) * 100);
    this.updateStatus(context.requestId, {
      projectId: context.projectId,
      progress,
      completedStepsExplanations: this.executionStatuses.get(context.requestId)?.completedStepsExplanations,
      completedStepsContent: this.executionStatuses.get(context.requestId)?.completedStepsContent
    }, executedSteps, Array.from(activeSteps)); // ✅ Передаем текущие активные шаги
  }

  /**
   * Эмиссия AI прогресса через WebSocket
   */
  private async emitAIProgressEvent(projectId: string, status: PipelineExecutionStatus, executedSteps?: Set<string>, activeSteps?: string[]) {
    try {
      if (!this.wsManager) {
        console.warn('⚠️ Cannot emit AI progress event - wsManager is null');
        return;
      }

      console.log(`🎯 Preparing to emit AI progress event for project ${projectId}:`, {
        requestId: status.requestId,
        status: status.status,
        currentStep: status.currentStep,
        progress: status.progress,
        activeSteps: activeSteps?.length || 0,
        completedSteps: executedSteps?.size || 0
      });

      const aiProgressStatus: AIProgressStatus = {
        requestId: status.requestId,
        status: status.status,
        currentStep: status.currentStep,
        stepName: this.getStepDisplayName(status.currentStep),
        stepDescription: this.getStepDescription(status.currentStep),
        progress: status.progress,
        startTime: status.startTime,
        endTime: status.endTime,
        estimatedTimeRemaining: this.calculateEstimatedTime(status),
        tokensUsed: undefined, // TODO: добавить подсчет токенов в pipeline result
        cost: status.result?.totalCost,
        metadata: undefined, // TODO: добавить metadata в pipeline result
        completedStepsExplanations: status.completedStepsExplanations,
        completedStepsContent: status.completedStepsContent,
        activeSteps: activeSteps || [],
        completedSteps: executedSteps ? Array.from(executedSteps) : [],
        failedSteps: [] // TODO: добавить отслеживание неудачных шагов
      };

      const eventType = this.getEventTypeForStatus(status.status);
      
      console.log(`📡 Emitting AI progress event: ${eventType} with payload:`, aiProgressStatus);
      
      await this.wsManager!.emitToProject(projectId, {
        type: eventType,
        payload: aiProgressStatus,
        userId: status.userId || 'system',
        projectId,
        timestamp: Date.now()
      });

      console.log(`✅ Successfully emitted AI progress event: ${eventType} for project ${projectId}`);
    } catch (error) {
      console.error('❌ Failed to emit AI progress event:', error);
    }
  }

  /**
   * Получение типа события по статусу
   */
  private getEventTypeForStatus(status: string): CollaborationEventType {
    switch (status) {
      case 'running':
        return CollaborationEventType.AI_PIPELINE_PROGRESS;
      case 'completed':
        return CollaborationEventType.AI_PIPELINE_COMPLETED;
      case 'failed':
        return CollaborationEventType.AI_PIPELINE_ERROR;
      default:
        return CollaborationEventType.AI_PIPELINE_STARTED;
    }
  }

  /**
   * Получение читаемого названия шага
   */
  private getStepDisplayName(stepId?: string): string | undefined {
    if (!stepId) return undefined;
    
    const stepNames: Record<string, string> = {
      // Analysis and context
      'analyze_context': 'Context Analysis',
      'context_analysis': 'Context Analysis',
      
      // Base fields
      'generate_genres': 'Genre Definition',
      'generate_formats': 'Format Selection',
      'generate_logline': 'Logline Creation',
      'generate_synopsis': 'Synopsis Generation',
      'generate_setting': 'Setting Creation',
      
      // Group A - audience and themes
      'generate_targetAudience': 'Target Audience',
      'generate_mainThemes': 'Main Themes',
      
      // Group B - atmosphere and features
      'generate_atmosphere': 'Project Atmosphere',
      'generate_uniqueFeatures': 'Unique Features',
      
      // Group C - message and constraints
      'generate_message': 'Project Message',
      'generate_references': 'References and Influences',
      'generate_visualStyle': 'Visual Style',
      
      // Checks and finalization
      'check_consistency': 'Consistency Check',
      'consistency_check': 'Consistency Check',
      'project_bible_generation': 'Project Bible Generation',
      'content_analysis': 'Content Analysis',
      'finalize': 'Finalization'
    };

    return stepNames[stepId] || stepId;
  }

  /**
   * Получение описания шага
   */
  private getStepDescription(stepId?: string): string | undefined {
    if (!stepId) return undefined;
    
    const stepDescriptions: Record<string, string> = {
      // Анализ и контекст
      'analyze_context': 'Анализируем ваше описание и определяем стратегию генерации',
      'context_analysis': 'Анализируем существующий контент и определяем стратегию генерации',
      
      // Базовые поля
      'generate_genres': 'Определяем жанровые особенности и тональность проекта',
      'generate_formats': 'Выбираем подходящие форматы на основе жанра и идеи',
      'generate_logline': 'Формулируем главную идею в одном предложении',
      'generate_synopsis': 'Создаем краткое описание сюжета вашего проекта',
      'generate_setting': 'Строим мир и атмосферу, где происходит действие',
      
      // Группа A - аудитория и темы
      'generate_targetAudience': 'Определяем целевую аудиторию проекта',
      'generate_mainThemes': 'Выявляем ключевые темы и сообщения',
      
      // Группа B - атмосфера и особенности (теперь параллельно!)
      'generate_atmosphere': 'Создаем уникальную атмосферу и настроение',
      'generate_uniqueFeatures': 'Выделяем особенности, которые делают проект уникальным',
      
      // Группа C - послание и ограничения (параллельно!)
      'generate_message': 'Формулируем основное послание и идею проекта',
      'generate_references': 'Подбираем вдохновляющие референсы и влияния',
      'generate_visualStyle': 'Создаем описание визуального стиля проекта',
      
      // Проверки и финализация
      'check_consistency': 'Проверяем согласованность всех элементов библии',
      'consistency_check': 'Проверяем согласованность сгенерированного контента',
      'project_bible_generation': 'Генерируем недостающие поля библии проекта',
      'content_analysis': 'Анализируем качество сгенерированного контента',
      'finalize': 'Финализируем и сохраняем результат'
    };

    return stepDescriptions[stepId];
  }

  /**
   * Расчет оставшегося времени (простая эвристика)
   */
  private calculateEstimatedTime(status: PipelineExecutionStatus): number | undefined {
    if (status.status !== 'running' || status.progress === 0) return undefined;
    
    const elapsed = Date.now() - status.startTime.getTime();
    const estimatedTotal = (elapsed / status.progress) * 100;
    const remaining = estimatedTotal - elapsed;
    
    return Math.max(remaining, 0);
  }
}