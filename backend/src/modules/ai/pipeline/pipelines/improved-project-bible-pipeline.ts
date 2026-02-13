import { BasePipeline } from '../base/base-pipeline';
import { PipelineStep } from '../interfaces/pipeline.interface';
import { OperationRegistry } from '../factory/operation-registry';
import { ImprovedProjectBibleGenerationOperation } from '../operations/improved-project-bible-generation.operation';
import { SimplePipelineEngine } from '../engine/simple-pipeline-engine';

/**
 * Улучшенный пайплайн для генерации контента библии проекта
 * Использует новую SOLID архитектуру с улучшенными операциями
 */
export class ImprovedProjectBiblePipeline extends BasePipeline {
  constructor() {
    // Регистрируем улучшенную операцию для генерации библии проекта
    if (!OperationRegistry.isRegistered('improved_project_bible_generation')) {
      OperationRegistry.register('improved_project_bible_generation', () => new ImprovedProjectBibleGenerationOperation());
    }

    const steps: PipelineStep[] = [
      {
        id: 'generate_bible_content',
        operation: OperationRegistry.create('improved_project_bible_generation'),
        dependencies: [],
        condition: (_context, _previousResults) => true,
        inputTransform: (input) => {
          // Адаптируем входные данные под новый API
          return {
            fieldType: input.fieldType,
            projectContext: input.projectContext || input.baseDescription,
            userSettings: input.userSettings,
            additionalContext: {
              existingFields: input.existingFields,
              projectGenres: input.projectGenres,
              targetAudience: input.targetAudience
            }
          };
        }
      }
    ];

    super(
      'improved_project_bible_pipeline',
      'Improved Project Bible Generation Pipeline',
      'Улучшенный пайплайн для генерации контента библии проекта с SOLID архитектурой',
      '2.0.0',
      steps
    );
  }

  /**
   * Helper метод для подготовки входных данных
   * @param fieldType - тип поля библии проекта
   * @param projectContext - контекст проекта
   * @param userSettings - настройки пользователя
   * @param additionalContext - дополнительный контекст
   */
  static createInput(
    fieldType: string,
    projectContext: string,
    userSettings?: any,
    additionalContext?: {
      existingFields?: Record<string, any>;
      projectGenres?: string[];
      targetAudience?: string;
    }
  ) {
    return {
      fieldType,
      projectContext,
      userSettings: userSettings || {},
      additionalContext: additionalContext || {}
    };
  }

  /**
   * Helper метод для извлечения результатов из выполненного пайплайна
   * @param result - результат выполнения пайплайна
   * @returns извлеченные данные или null в случае ошибки
   */
  static extractResult(result: any): { 
    content: string; 
    explanation?: string; 
    generationMetadata?: any; 
    metadata: any 
  } | null {
    if (!result.success || !result.steps.has('generate_bible_content')) {
      return null;
    }

    const step = result.steps.get('generate_bible_content');
    if (!step.success || !step.data) {
      return null;
    }

    return {
      content: step.data.fieldContent || '',
      explanation: step.data.explanation,
      generationMetadata: step.data.generationMetadata || {},
      metadata: {
        tokensUsed: step.metadata?.tokensUsed || 0,
        cost: step.metadata?.cost || 0,
        model: step.metadata?.model,
        provider: step.metadata?.provider,
        processingTime: step.metadata?.processingTime || 0,
        ...step.metadata
      }
    };
  }

  /**
   * Метод для быстрой генерации одного поля библии
   */
  async generateField(
    fieldType: string,
    projectContext: string,
    userSettings?: any,
    additionalContext?: any
  ) {
    const input = ImprovedProjectBiblePipeline.createInput(
      fieldType,
      projectContext,
      userSettings,
      additionalContext
    );

    // Используем engine для выполнения
    const engine = new SimplePipelineEngine();
    const result = await engine.execute(this, input, {
      userId: 'system',
      projectId: 'temp',
      priority: 'normal',
      userTier: 'business',
      requestId: `temp_${Date.now()}`,
      startTime: new Date(),
      sharedData: new Map(),
      previousResults: new Map()
    });

    return result;
  }

  /**
   * Реализация абстрактного метода для структуры пайплайна
   */
  getPipelineStructure() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      groups: [{
        id: 'bible_generation',
        name: 'Генерация библии проекта',
        type: 'sequential' as const,
        steps: [{
          id: 'generate_bible_content',
          name: 'Генерация контента',
          description: 'Создание контента для поля библии проекта',
          dependencies: [],
          isOptional: false
        }]
      }]
    };
  }

  /**
   * Метод для генерации нескольких полей последовательно
   */
  async generateMultipleFields(
    fields: Array<{
      fieldType: string;
      projectContext: string;
      userSettings?: any;
      additionalContext?: any;
    }>,
    executionContext: any
  ) {
    const results = [];

    for (const field of fields) {
      try {
        const input = ImprovedProjectBiblePipeline.createInput(
          field.fieldType,
          field.projectContext,
          field.userSettings,
          field.additionalContext
        );
        
        const engine = new SimplePipelineEngine();
        const result = await engine.execute(this, input, executionContext);
        results.push({
          fieldType: field.fieldType,
          success: result.success,
          data: result.steps?.get('generate_bible_content')?.data,
          metadata: { cost: result.totalCost || 0 }
        });

        // Небольшая задержка между запросами для избежания rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error generating field ${field.fieldType}:`, error);
        results.push({
          fieldType: field.fieldType,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      totalFields: fields.length,
      successfulFields: results.filter(r => r.success).length,
      failedFields: results.filter(r => !r.success).length,
      results
    };
  }

  // ===== INSTANCE МЕТОДЫ ИЗ ИНТЕРФЕЙСА AIPIPELINE =====

  /**
   * Подготовка входных данных для пайплайна
   */
  prepareInput(
    fieldType: string,
    projectContext: string,
    baseDescription?: string,
    userSettings?: any,
    additionalContext?: string
  ): any {
    return {
      fieldType,
      projectContext,
      baseDescription,
      userSettings,
      additionalContext,
      forceRegeneration: false
    };
  }

  /**
   * Трансформация результата пайплайна в удобный формат
   */
  transformResult(pipelineResult: any, startTime: Date): any {
    const processingTime = Date.now() - startTime.getTime();
    const stepResult = pipelineResult.steps?.get('generate_bible_content');
    
    return {
      success: pipelineResult.success,
      fieldContent: stepResult?.data?.fieldContent || '',
      metadata: {
        processingTime,
        tokensUsed: stepResult?.metadata?.tokensUsed || 0,
        cost: pipelineResult.totalCost || 0,
        model: stepResult?.metadata?.model,
        provider: stepResult?.metadata?.provider
      },
      generationMetadata: stepResult?.data?.generationMetadata || {},
      error: pipelineResult.error
    };
  }

  /**
   * Получение детального отчета о выполнении пайплайна
   */
  getDetailedReport(pipelineResult: any): string {
    const stepResult = pipelineResult.steps?.get('generate_bible_content');
    const report: string[] = ['📊 Отчет о генерации поля библии проекта:', ''];

    if (pipelineResult.success) {
      report.push('✅ Генерация: успешно');
      if (stepResult?.data?.fieldContent) {
        const contentLength = stepResult.data.fieldContent.length;
        report.push(`   📝 Длина контента: ${contentLength} символов`);
      }
      if (stepResult?.metadata?.tokensUsed) {
        report.push(`   📊 Токенов использовано: ${stepResult.metadata.tokensUsed}`);
      }
      if (stepResult?.metadata?.model) {
        report.push(`   🤖 Модель: ${stepResult.metadata.model}`);
      }
    } else {
      report.push('❌ Генерация: ошибка');
      if (pipelineResult.error) {
        report.push(`   ⚠️ ${pipelineResult.error}`);
      }
    }

    report.push('');
    report.push(`⏱️ Время выполнения: ${pipelineResult.totalTime || 0}мс`);
    report.push(`💰 Стоимость: ${pipelineResult.totalCost || 0} кредитов`);
    report.push('🚀 Использует улучшенную SOLID архитектуру');

    return report.join('\n');
  }
}