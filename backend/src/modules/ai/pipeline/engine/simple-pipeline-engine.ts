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
 * Простая реализация Pipeline Engine
 * Следует принципу KISS - простое последовательное выполнение
 */
export class SimplePipelineEngine implements PipelineEngine {
  private executionStatuses = new Map<string, PipelineExecutionStatus>();

  constructor(private wsManager?: IWebSocketManager) {}

  async execute(
    pipeline: AIPipeline, 
    input: PipelineInput, 
    context: ExecutionContext
  ): Promise<PipelineResult> {
    console.log('🎯 SimplePipelineEngine.execute started with context:', {
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

      // 2. Сортируем шаги по зависимостям (топологическая сортировка)
      const sortedSteps = this.topologicalSort(pipeline.steps);

      // 3. Выполняем шаги последовательно
      for (let i = 0; i < sortedSteps.length; i++) {
        const step = sortedSteps[i];
        const progress = Math.round(((i + 1) / sortedSteps.length) * 100);

        // Обновляем статус
        this.updateStatus(context.requestId, {
          requestId: context.requestId,
          projectId: context.projectId,
          userId: context.userId,
          status: 'running',
          currentStep: step.id,
          progress,
          startTime: context.startTime
        });

        // Проверяем условие выполнения (если есть)
        if (step.condition && !step.condition(context, stepResults)) {
          console.log(`⏭️ Skipping step ${step.id} due to condition`);
          continue;
        }

        // Подготавливаем контекст для операции
        const operationContext: ExecutionContext = {
          ...context,
          previousResults: stepResults
        };

        // Выполняем операцию
        console.log(`🔄 Executing step: ${step.id} (${step.operation.name})`);
        
        // Применяем трансформацию входных данных если она определена
        const stepInput = step.inputTransform ? step.inputTransform(input, operationContext, stepResults) : input;
        
        const stepResult = await step.operation.execute(stepInput, operationContext);
        stepResults.set(step.id, stepResult);

        if (!stepResult.success) {
          const error = `Step ${step.id} failed: ${stepResult.error}`;
          console.error(`❌ ${error}`);
          
          this.updateStatus(context.requestId, {
            requestId: context.requestId,
            projectId: context.projectId,
            userId: context.userId,
            status: 'failed',
            currentStep: step.id,
            progress,
            startTime: context.startTime,
            endTime: new Date()
          });

          return {
            success: false,
            steps: stepResults,
            totalCost: totalCost + (stepResult.metadata.cost || 0),
            totalTime: Date.now() - startTime,
            error
          };
        }

        // Добавляем стоимость
        totalCost += stepResult.metadata.cost || 0;

        // Сохраняем результат в shared data для следующих операций
        if (stepResult.data) {
          context.sharedData.set(step.id, stepResult.data);
        }

        // Сохраняем объяснение и контент для завершенного шага
        const currentStatus = this.executionStatuses.get(context.requestId);
        if (currentStatus && stepResult.data) {
          // Сохраняем объяснение
          if (stepResult.data.explanation) {
            if (!currentStatus.completedStepsExplanations) {
              currentStatus.completedStepsExplanations = {};
            }
            currentStatus.completedStepsExplanations[step.id] = stepResult.data.explanation;
          }
          
          // Сохраняем сгенерированный контент
          if (stepResult.data.content) {
            if (!currentStatus.completedStepsContent) {
              currentStatus.completedStepsContent = {};
            }
            currentStatus.completedStepsContent[step.id] = stepResult.data.content;
          }
          
          // Обновляем статус с новыми данными
          this.updateStatus(context.requestId, {
            completedStepsExplanations: currentStatus.completedStepsExplanations,
            completedStepsContent: currentStatus.completedStepsContent
          });
        }

        console.log(`✅ Step ${step.id} completed in ${stepResult.metadata.executionTime}ms`);
      }

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
      });

      console.log(`🎉 Pipeline ${pipeline.id} completed successfully in ${totalTime}ms`);

      return {
        success: true,
        steps: stepResults,
        totalCost,
        totalTime
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Pipeline ${pipeline.id} failed:`, error);

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
        totalCost,
        totalTime,
        error: errorMessage
      };
    }
  }

  async getStatus(requestId: string): Promise<PipelineExecutionStatus> {
    const status = this.executionStatuses.get(requestId);
    
    if (!status) {
      throw new Error(`No execution found for request ${requestId}`);
    }

    return status;
  }

  /**
   * Топологическая сортировка шагов по зависимостям
   * Простая реализация без проверки циклов (пока)
   */
  private topologicalSort(steps: PipelineStep[]): PipelineStep[] {
    const result: PipelineStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const stepMap = new Map<string, PipelineStep>();

    // Создаем карту шагов
    steps.forEach(step => stepMap.set(step.id, step));

    const visit = (stepId: string) => {
      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected involving step: ${stepId}`);
      }
      
      if (visited.has(stepId)) {
        return;
      }

      const step = stepMap.get(stepId);
      if (!step) {
        throw new Error(`Step not found: ${stepId}`);
      }

      visiting.add(stepId);

      // Сначала посещаем все зависимости
      step.dependencies.forEach(depId => visit(depId));

      visiting.delete(stepId);
      visited.add(stepId);
      result.push(step);
    };

    // Посещаем все шаги
    steps.forEach(step => {
      if (!visited.has(step.id)) {
        visit(step.id);
      }
    });

    return result;
  }

  /**
   * Обновление статуса выполнения
   */
  private updateStatus(requestId: string, status: Partial<PipelineExecutionStatus>) {
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
      currentStep: updatedStatus.currentStep
    });

    // Эмитим WebSocket события только если есть wsManager и projectId в контексте
    if (this.wsManager && status.projectId) {
      console.log('🚀 Calling emitAIProgressEvent...');
      this.emitAIProgressEvent(status.projectId, updatedStatus);
    } else {
      console.warn('⚠️ Skipping emitAIProgressEvent:', {
        hasWsManager: !!this.wsManager,
        hasProjectId: !!status.projectId
      });
    }
  }

  /**
   * Эмиссия AI прогресса через WebSocket
   */
  private async emitAIProgressEvent(projectId: string, status: PipelineExecutionStatus) {
    try {
      if (!this.wsManager) {
        console.warn('⚠️ Cannot emit AI progress event - wsManager is null');
        return;
      }

      console.log(`🎯 Preparing to emit AI progress event for project ${projectId}:`, {
        requestId: status.requestId,
        status: status.status,
        currentStep: status.currentStep,
        progress: status.progress
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
        completedStepsContent: status.completedStepsContent
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
      'generate_target_audience': 'Target Audience',
      'generate_main_themes': 'Main Themes',
      
      // Group B - atmosphere and features
      'generate_atmosphere': 'Project Atmosphere',
      'generate_unique_features': 'Unique Features',
      
      // Group C - message and constraints
      'generate_message': 'Project Message',
      'generate_references': 'References and Influences',
      'generate_constraints': 'Constraints and Framework',
      
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
      'generate_target_audience': 'Определяем целевую аудиторию проекта',
      'generate_main_themes': 'Выявляем ключевые темы и сообщения',
      
      // Группа B - атмосфера и особенности
      'generate_atmosphere': 'Создаем уникальную атмосферу и настроение',
      'generate_unique_features': 'Выделяем особенности, которые делают проект уникальным',
      
      // Группа C - послание и ограничения
      'generate_message': 'Формулируем основное послание и идею проекта',
      'generate_references': 'Подбираем вдохновляющие референсы и влияния',
      'generate_constraints': 'Определяем творческие рамки и ограничения',
      
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