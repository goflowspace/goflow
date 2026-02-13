// Pipeline Storage Adapter
// Адаптер для интеграции хранения результатов с PipelineEngine

import { PipelineStorageService } from './PipelineStorageService';
import { PipelineExecutionCollector } from './PipelineExecutionCollector';
import { AIPipeline } from '../core/AIPipeline';
import { ExecutionContext, OperationOutput, OperationType } from '../shared/types';

/**
 * Адаптер для интеграции системы хранения с PipelineEngine
 * Собирает данные в памяти и сохраняет их в БД в конце выполнения
 */
export class PipelineStorageAdapter {
  private storageService: PipelineStorageService;
  private collector: PipelineExecutionCollector;

  constructor(storageService: PipelineStorageService) {
    this.storageService = storageService;
    this.collector = new PipelineExecutionCollector();
  }

  /**
   * Инициализирует сбор данных о выполнении пайплайна
   */
  initializePipelineExecution(
    pipeline: AIPipeline,
    pipelineInput: any,
    context: ExecutionContext
  ): void {
    this.collector.initializePipeline(pipeline, pipelineInput, context);
  }

  /**
   * Обновляет входные данные для шага
   */
  updateStepInput(stepId: string, input: any): void {
    this.collector.updateStepInput(stepId, input);
  }

  /**
   * Отмечает начало выполнения шага (универсальное для всех типов операций)
   */
  onStepStart(
    stepId: string,
    data: { input?: any; system?: string; user?: string },
    config: { 
      operationType?: OperationType;
      provider?: string; 
      model?: string; 
      temperature?: number; 
      maxTokens?: number; 
      qualityLevel?: string;
    }
  ): void {
    if (config.operationType === OperationType.AI && data.system && data.user) {
      // Для AI операций используем старый формат
      this.collector.startStep(stepId, { system: data.system, user: data.user }, {
        provider: config.provider || 'unknown',
        model: config.model || 'unknown',
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        qualityLevel: config.qualityLevel
      });
    } else {
      // Для Non-AI операций просто устанавливаем startTime
      // Создаем фиктивные промпты для non-AI операций
      this.collector.startStep(stepId, { system: '', user: '' }, {
        provider: 'none',
        model: 'none',
        qualityLevel: config.qualityLevel || 'STANDARD'
      });
    }
  }

  /**
   * Записывает результаты валидации
   */
  onStepValidation(
    stepId: string,
    validationDuration: number,
    validationErrors?: string[]
  ): void {
    this.collector.recordValidation(stepId, validationDuration, validationErrors);
  }

  /**
   * Записывает результаты вызова AI провайдера
   */
  onProviderCall(
    stepId: string,
    providerCallDuration: number,
    inputTokens: number,
    outputTokens: number,
    realCostUSD: number,
    creditsCharged: number,
    rawAIResponse: string
  ): void {
    this.collector.recordProviderCall(
      stepId,
      providerCallDuration,
      inputTokens,
      outputTokens,
      realCostUSD,
      creditsCharged,
      rawAIResponse
    );
  }

  /**
   * Записывает информацию о подозрительном контенте
   */
  onSuspiciousContent(stepId: string, reasons: string[]): void {
    this.collector.recordSuspiciousContent(stepId, reasons);
  }

  /**
   * Записывает результаты выполнения non-AI операции
   */
  onOperationExecution(
    stepId: string,
    duration: number,
    result: any
  ): void {
    // TODO: Implement non-AI operation execution
    console.log(`Non-AI operation executed: ${stepId}`, { duration, result });
  }

  /**
   * Завершает выполнение шага
   */
  onStepComplete(stepId: string, output: OperationOutput, error?: Error): void {
    this.collector.completeStep(stepId, output, error);
  }

  /**
   * Завершает выполнение пайплайна и сохраняет все данные в БД
   */
  async finalizePipelineExecution(
    results: Map<string, OperationOutput>,
    error?: Error
  ): Promise<string | null> {
    // Завершаем сбор данных
    this.collector.completePipeline(results, error);
    
    // Получаем собранные данные
    const collectedData = this.collector.getCollectedData();
    if (!collectedData) {
      console.warn('No pipeline data collected for saving');
      return null;
    }

    try {
      // Сохраняем данные пайплайна
      const executionId = await this.storageService.createPipelineExecution({
        pipelineId: collectedData.pipeline.pipelineId,
        pipelineName: collectedData.pipeline.pipelineName,
        version: collectedData.pipeline.version,
        userId: collectedData.pipeline.userId,
        projectId: collectedData.pipeline.projectId,
        requestId: collectedData.pipeline.requestId,
        sessionId: collectedData.pipeline.sessionId,
        traceId: collectedData.pipeline.traceId,
        input: collectedData.pipeline.input,
        qualityLevel: collectedData.pipeline.qualityLevel,
        totalSteps: collectedData.pipeline.totalSteps
      });

      // Обновляем пайплайн с финальными данными
      await this.storageService.updatePipelineCompletion(executionId, {
        status: collectedData.pipeline.status,
        completedAt: collectedData.pipeline.completedAt!,
        totalDuration: collectedData.pipeline.totalDuration!,
        completedSteps: collectedData.pipeline.completedSteps,
        skippedSteps: collectedData.pipeline.skippedSteps,
        failedSteps: collectedData.pipeline.failedSteps,
        totalInputTokens: collectedData.pipeline.totalInputTokens,
        totalOutputTokens: collectedData.pipeline.totalOutputTokens,
        totalRealCostUSD: collectedData.pipeline.totalRealCostUSD,
        totalCreditsCharged: collectedData.pipeline.totalCreditsCharged,
        result: collectedData.pipeline.result,
        error: collectedData.pipeline.error
      });

      // Сохраняем данные шагов
      for (const stepData of collectedData.steps) {
        const stepExecutionId = await this.storageService.createStepExecution({
          executionId,
          stepId: stepData.stepId,
          stepIndex: stepData.stepIndex,
          operationId: stepData.operationId,
          operationName: stepData.operationName,
          operationVersion: stepData.operationVersion,
          dependencies: stepData.dependencies,
          input: stepData.input,
          qualityLevel: stepData.qualityLevel || 'STANDARD'
        });

        // Обновляем дополнительные данные шага СНАЧАЛА (если есть)
        if (stepData.startedAt || stepData.provider) {
          await this.storageService.updateStepStart(stepExecutionId, {
            systemPrompt: stepData.systemPrompt,
            userPrompt: stepData.userPrompt,
            provider: stepData.provider!,
            model: stepData.model!,
            temperature: stepData.temperature,
            maxTokens: stepData.maxTokens,
            qualityLevel: stepData.qualityLevel || 'STANDARD',
            startedAt: stepData.startedAt || new Date()
          });
        }

        // Обновляем шаг с финальными данными ПОСЛЕДНИМ (чтобы не перезаписать статус)
        await this.storageService.updateStepCompletion(stepExecutionId, {
          status: stepData.status,
          completedAt: stepData.completedAt || new Date(),
          duration: stepData.duration || 0,
          result: stepData.result,
          error: stepData.error,
          errorStep: stepData.errorStep,
          skipped: stepData.skipped,
          skipReason: stepData.skipReason
        });

        if (stepData.validationDuration !== undefined) {
          await this.storageService.updateStepValidation(stepExecutionId, {
            validationDuration: stepData.validationDuration,
            validationErrors: stepData.validationErrors
          });
        }

        if (stepData.providerCallDuration !== undefined) {
          await this.storageService.updateStepProviderCall(stepExecutionId, {
            providerCallDuration: stepData.providerCallDuration,
            inputTokens: stepData.inputTokens!,
            outputTokens: stepData.outputTokens!,
            realCostUSD: stepData.realCostUSD!,
            creditsCharged: stepData.creditsCharged!,
            rawAIResponse: stepData.rawAIResponse!
          });
        }

        if (stepData.suspiciousContent) {
          await this.storageService.updateStepSuspiciousContent(stepExecutionId, stepData.suspiciousContent);
        }
      }

      console.log(`📊 Pipeline execution data saved: ${executionId}`);
      return executionId;
    } catch (saveError) {
      console.error('Failed to save pipeline execution data:', saveError);
      return null;
    }
  }

  /**
   * Отменяет выполнение пайплайна
   */
  async cancelPipelineExecution(reason?: string): Promise<string | null> {
    this.collector.cancelPipeline(reason);
    
    // Сохраняем отмененный пайплайн
    const collectedData = this.collector.getCollectedData();
    if (!collectedData) return null;

    try {
      const executionId = await this.storageService.createPipelineExecution({
        pipelineId: collectedData.pipeline.pipelineId,
        pipelineName: collectedData.pipeline.pipelineName,
        version: collectedData.pipeline.version,
        userId: collectedData.pipeline.userId,
        projectId: collectedData.pipeline.projectId,
        requestId: collectedData.pipeline.requestId,
        sessionId: collectedData.pipeline.sessionId,
        traceId: collectedData.pipeline.traceId,
        input: collectedData.pipeline.input,
        qualityLevel: collectedData.pipeline.qualityLevel,
        totalSteps: collectedData.pipeline.totalSteps
      });

      await this.storageService.cancelPipelineExecution(executionId, reason);
      return executionId;
    } catch (error) {
      console.error('Failed to save cancelled pipeline execution:', error);
      return null;
    }
  }

  /**
   * Сбрасывает состояние адаптера
   */
  reset(): void {
    this.collector.reset();
  }
}
