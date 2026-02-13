import { BasePipeline } from '../base/base-pipeline';
import { PipelineStep } from '../interfaces/pipeline.interface';
import { OperationRegistry } from '../factory/operation-registry';
import { ProjectBibleGenerationOperation } from '../operations/project-bible-generation.operation';
import { SimplePipelineEngine } from '../engine/simple-pipeline-engine';

/**
 * Пайплайн для генерации контента библии проекта
 */
export class ProjectBiblePipeline extends BasePipeline {
  constructor() {
    // Регистрируем операцию для генерации библии проекта
    if (!OperationRegistry.isRegistered('project_bible_generation')) {
      OperationRegistry.register('project_bible_generation', () => new ProjectBibleGenerationOperation());
    }

    const steps: PipelineStep[] = [
      {
        id: 'generate_bible_content',
        operation: OperationRegistry.create('project_bible_generation'),
        dependencies: [],
        condition: (_context, _previousResults) => true,
        inputTransform: (input) => {
          // Трансформируем входные данные для операции
          return {
            fieldType: input.fieldType,
            projectContext: input.projectContext,
            baseDescription: input.baseDescription,
            userSettings: input.userSettings
          };
        }
      }
    ];

    super(
      'project_bible_pipeline',
      'Project Bible Generation Pipeline',
      'Пайплайн для генерации контента библии проекта',
      '1.0.0',
      steps
    );
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
   * Helper метод для подготовки входных данных
   */
  static prepareInput(
    fieldType: string,
    projectContext: string,
    baseDescription?: string,
    userSettings?: any
  ): any {
    return {
      fieldType,
      projectContext,
      baseDescription,
      userSettings
    };
  }

  /**
   * Helper метод для извлечения результатов
   */
  static extractResult(result: any): { content: string; explanation?: string; metadata: any } | null {
    if (!result.success || !result.steps.has('generate_bible_content')) {
      return null;
    }

    const step = result.steps.get('generate_bible_content');
    if (!step.success || !step.data) {
      return null;
    }

    return {
      content: step.data.content,
      explanation: step.data.explanation,
      metadata: step.data.metadata || {}
    };
  }

  /**
   * Быстрый метод для генерации библии проекта
   */
  static async generateProjectBibleQuick(
    fieldType: string,
    projectContext: string,
    baseDescription?: string,
    userSettings?: any
  ): Promise<{ content: string; metadata: any }> {    
    const pipeline = new ProjectBiblePipeline();
    const engine = new SimplePipelineEngine();
    
    const input = ProjectBiblePipeline.prepareInput(
      fieldType, 
      projectContext, 
      baseDescription,
      userSettings
    );

    const context = {
      userId: 'system',
      projectId: 'temp',
      requestId: `project-bible-${Date.now()}`,
      startTime: new Date(),
      sharedData: new Map(),
      previousResults: new Map()
    };

    const result = await engine.execute(pipeline, input, context);
    
    if (!result.success) {
      throw new Error(result.error || 'Pipeline execution failed');
    }

    const extracted = ProjectBiblePipeline.extractResult(result);
    if (!extracted) {
      throw new Error('Failed to extract result from pipeline');
    }

    return extracted;
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
    // Статический метод принимает только 4 параметра, additionalContext можно добавить отдельно
    const baseInput = ProjectBiblePipeline.prepareInput(
      fieldType,
      projectContext,
      baseDescription,
      userSettings
    );
    
    return {
      ...baseInput,
      additionalContext
    };
  }

  /**
   * Трансформация результата пайплайна в удобный формат
   */
  transformResult(pipelineResult: any, startTime: Date): any {
    // Используем базовую реализацию и добавляем специфичную информацию
    const baseResult = super.transformResult(pipelineResult, startTime);
    const extracted = ProjectBiblePipeline.extractResult(pipelineResult);
    
    return {
      ...baseResult,
      content: extracted?.content || '',
      explanation: extracted?.explanation,
      fieldMetadata: extracted?.metadata || {}
    };
  }

  /**
   * Получение детального отчета о выполнении пайплайна
   */
  getDetailedReport(pipelineResult: any): string {
    // Используем базовую реализацию
    return super.getDetailedReport(pipelineResult);
  }
} 