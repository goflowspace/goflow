import { BasePipeline } from '../base/base-pipeline';
import { PipelineStep } from '../interfaces/pipeline.interface';
import { OperationRegistry } from '../factory/operation-registry';
import { ProjectContextAnalysisOperation } from '../../v2/operations/entities/v1/project-context-analysis.operation';
import { ImprovedEntityTypeDetectionOperation } from '../../v2/operations/entities/v1/improved-entity-type-detection.operation';
import { ImprovedEntityFieldGenerationOperation } from '../../v2/operations/entities/v1/improved-entity-field-generation.operation';
import { EntityCreationOperation } from '../../v2/operations/entities/v1/entity-creation.operation';
import { SimplePipelineEngine } from '../engine/simple-pipeline-engine';

/**
 * Входные данные для улучшенного пайплайна генерации сущностей
 */
export interface ImprovedEntityGenerationInput {
  projectId: string;
  userDescription: string;
  preferredEntityType?: string;
  customInstructions?: string; // Дополнительные инструкции от пользователя
  includeProjectInfo?: boolean;
  includeExistingEntities?: boolean;
  userSettings?: {
    preferredProvider?: string;
    preferredModel?: string;
    creativityLevel?: number;
  };
  executionOptions?: {
    skipTypeDetection?: boolean; // Пропустить автоопределение типа
    skipFieldGeneration?: boolean; // Пропустить генерацию полей через AI
    createInDatabase?: boolean; // Создавать ли сущность в БД
  };
}

/**
 * Результат выполнения улучшенного пайплайна генерации сущностей
 */
export interface ImprovedEntityGenerationOutput {
  success: boolean;
  data?: {
    projectContext: any;
    selectedEntityType: any;
    generatedFields: Record<string, any>;
    entityName?: string;
    entityDescription?: string;
    fieldExplanations: Record<string, string>;
    suggestedRelationships: Array<{
      relatedEntityId?: string;
      relatedEntityName: string;
      relationType: string;
      explanation: string;
    }>;
    generationMetadata?: {
      totalFields: number;
      filledFields: number;
      skippedFields: string[];
      confidence: number;
    };
    createdEntity?: any;
    executionSummary: {
      stepsCompleted: string[];
      totalExecutionTime: number;
      totalCost: number;
      confidence: number;
    };
  };
  warnings?: string[];
  errors?: string[];
}

/**
 * Улучшенный пайплайн для генерации сущностей с SOLID архитектурой
 * 
 * Последовательность операций:
 * 1. Анализ контекста проекта (типы сущностей, параметры, существующие сущности)
 * 2. Определение подходящего типа сущности на основе описания (улучшенная версия)
 * 3. Генерация значений всех параметров выбранного типа через ИИ (улучшенная версия)
 * 4. Создание сущности в базе данных со всеми связями
 */
export class ImprovedEntityGenerationPipeline extends BasePipeline {
  constructor() {
    // Регистрируем операции в фабрике
    if (!OperationRegistry.isRegistered('project_context_analysis')) {
      OperationRegistry.register('project_context_analysis', () => new ProjectContextAnalysisOperation());
    }
    if (!OperationRegistry.isRegistered('improved_entity_type_detection')) {
      OperationRegistry.register('improved_entity_type_detection', () => new ImprovedEntityTypeDetectionOperation());
    }
    if (!OperationRegistry.isRegistered('improved_entity_field_generation')) {
      OperationRegistry.register('improved_entity_field_generation', () => new ImprovedEntityFieldGenerationOperation());
    }
    if (!OperationRegistry.isRegistered('entity_creation')) {
      OperationRegistry.register('entity_creation', () => new EntityCreationOperation());
    }

    const steps: PipelineStep[] = [
      // Шаг 1: Анализ контекста проекта
      {
        id: 'analyze_project_context',
        operation: OperationRegistry.create('project_context_analysis'),
        dependencies: [],
        condition: (_context, _previousResults) => true,
        inputTransform: (input: ImprovedEntityGenerationInput) => ({
          projectId: input.projectId,
          includeProjectInfo: input.includeProjectInfo ?? true,
          includeExistingEntities: input.includeExistingEntities ?? true
        })
      },

      // Шаг 2: Определение типа сущности (улучшенная версия)
      {
        id: 'detect_entity_type',
        operation: OperationRegistry.create('improved_entity_type_detection'),
        dependencies: ['analyze_project_context'],
        condition: (_context, previousResults) => {
          // const input = context.input as ImprovedEntityGenerationInput;
          // TODO: получить input из metadata если необходимо
          
          const contextAnalysis = previousResults.get('analyze_project_context');
          return !!(contextAnalysis?.success && 
                   contextAnalysis.data?.availableEntityTypes?.length > 0);
        },
        inputTransform: (input, _context, previousResults) => {
          const contextAnalysis = previousResults.get('analyze_project_context');
          return {
            userDescription: input.userDescription,
            availableEntityTypes: contextAnalysis?.data?.availableEntityTypes || [],
            projectContext: contextAnalysis?.data?.projectInfo || {},
            preferredEntityType: input.preferredEntityType
          };
        }
      },

      // Шаг 3: Генерация полей сущности (улучшенная версия)
      {
        id: 'generate_entity_fields',
        operation: OperationRegistry.create('improved_entity_field_generation'),
        dependencies: ['analyze_project_context', 'detect_entity_type'],
        condition: (_context, previousResults) => {
          // TODO: получить input из metadata если необходимо
          
          const typeDetection = previousResults.get('detect_entity_type');
          return !!(typeDetection?.success && typeDetection.data?.selectedEntityType);
        },
        inputTransform: (input, _context, previousResults) => {
          const contextAnalysis = previousResults.get('analyze_project_context');
          const typeDetection = previousResults.get('detect_entity_type');
          
          return {
            userDescription: input.userDescription,
            selectedEntityType: typeDetection?.data?.selectedEntityType,
            projectContext: contextAnalysis?.data?.projectInfo || {},
            existingEntities: contextAnalysis?.data?.existingEntities || [],
            entityRelationships: contextAnalysis?.data?.entityRelationships || [],
            customInstructions: input.customInstructions
          };
        }
      },

      // Шаг 4: Создание сущности в базе данных
      {
        id: 'create_entity',
        operation: OperationRegistry.create('entity_creation'),
        dependencies: ['analyze_project_context', 'detect_entity_type', 'generate_entity_fields'],
        condition: (_context, previousResults) => {
          // TODO: получить input из metadata если необходимо
          
          const fieldGeneration = previousResults.get('generate_entity_fields');
          return !!(fieldGeneration?.success && fieldGeneration.data?.entityName);
        },
        inputTransform: (input, _context, previousResults) => {
          const typeDetection = previousResults.get('detect_entity_type');
          const fieldGeneration = previousResults.get('generate_entity_fields');
          
          return {
            projectId: input.projectId,
            entityName: fieldGeneration?.data?.entityName,
            entityDescription: fieldGeneration?.data?.entityDescription,
            selectedEntityType: typeDetection?.data?.selectedEntityType,
            generatedFields: fieldGeneration?.data?.generatedFields || {},
            suggestedRelationships: fieldGeneration?.data?.suggestedRelationships || []
          };
        }
      }
    ];

    super(
      'improved_entity_generation_pipeline',
      'Improved Entity Generation Pipeline',
      'Улучшенный пайплайн для генерации сущностей с SOLID архитектурой',
      '2.0.0',
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
        id: 'entity_generation',
        name: 'Entity generation',
        type: 'sequential' as const,
        steps: [
          {
            id: 'analyze_project_context',
            name: 'Analyze project context',
            description: 'Analyze project context and available entity types',
            dependencies: [],
            isOptional: false
          },
          {
            id: 'detect_entity_type',
            name: 'Detect entity type',
            description: 'Detect the most suitable entity type',
            dependencies: ['analyze_project_context'],
            isOptional: false
          },
          {
            id: 'generate_entity_fields',
            name: 'Generate entity fields',
            description: 'Generate entity field values using AI',
            dependencies: ['detect_entity_type'],
            isOptional: false
          },
          {
            id: 'create_entity',
            name: 'Create entity in database',
            description: 'Save entity to database',
            dependencies: ['generate_entity_fields'],
            isOptional: true
          }
        ]
      }]
    };
  }

  /**
   * Переопределенный метод выполнения с улучшенной обработкой результатов
   */
  async execute(input: ImprovedEntityGenerationInput, context: any): Promise<ImprovedEntityGenerationOutput> {
    const startTime = Date.now();
    const stepsCompleted: string[] = [];
    let totalCost = 0;
    let overallConfidence = 0;

    try {
      // Используем engine для выполнения
      const engine = new SimplePipelineEngine();
      const result = await engine.execute(this, input, context);
      
      if (!result.success) {
        return {
          success: false,
          errors: [result.error || 'Pipeline execution failed'],
          warnings: []
        };
      }

      // Собираем данные из всех шагов
      const projectContext = result.steps?.get('analyze_project_context')?.data;
      const selectedEntityType = result.steps?.get('detect_entity_type')?.data?.selectedEntityType;
      const fieldGenerationResult = result.steps?.get('generate_entity_fields')?.data;
      const createdEntity = result.steps?.get('create_entity')?.data?.createdEntity;

      // Подсчитываем метрики
      result.steps?.forEach((stepResult: any, stepId: string) => {
        if (stepResult.success) {
          stepsCompleted.push(stepId);
          totalCost += stepResult.metadata?.cost || 0;
        }
      });

      // Рассчитываем общую уверенность
      const confidenceValues = [];
      const detectionStep = result.steps?.get('detect_entity_type');
      if (detectionStep?.data?.confidence) {
        confidenceValues.push(detectionStep.data.confidence);
      }
      if (fieldGenerationResult?.generationMetadata?.confidence) {
        confidenceValues.push(fieldGenerationResult.generationMetadata.confidence);
      }
      overallConfidence = confidenceValues.length > 0 ? 
        confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length : 0.5;

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          projectContext,
          selectedEntityType,
          generatedFields: fieldGenerationResult?.generatedFields || {},
          entityName: fieldGenerationResult?.entityName,
          entityDescription: fieldGenerationResult?.entityDescription,
          fieldExplanations: fieldGenerationResult?.fieldExplanations || {},
          suggestedRelationships: fieldGenerationResult?.suggestedRelationships || [],
          generationMetadata: fieldGenerationResult?.generationMetadata,
          createdEntity,
          executionSummary: {
            stepsCompleted,
            totalExecutionTime: executionTime,
            totalCost,
            confidence: overallConfidence
          }
        }
      };

    } catch (error) {
      console.error('❌ Improved Entity Generation Pipeline failed:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown pipeline error']
      };
    }
  }

  /**
   * Быстрый метод для создания простой сущности
   */
  async createSimpleEntity(
    projectId: string,
    userDescription: string,
    executionContext: any,
    options?: {
      preferredEntityType?: string;
      customInstructions?: string;
      userSettings?: any;
    }
  ) {
    const input: ImprovedEntityGenerationInput = {
      projectId,
      userDescription,
      preferredEntityType: options?.preferredEntityType,
      customInstructions: options?.customInstructions,
      userSettings: options?.userSettings,
      includeProjectInfo: true,
      includeExistingEntities: true,
      executionOptions: {
        createInDatabase: true
      }
    };

    return await this.execute(input, executionContext);
  }

  /**
   * Метод для генерации сущности без создания в БД (preview режим)
   */
  async previewEntity(
    projectId: string,
    userDescription: string,
    executionContext: any,
    options?: {
      preferredEntityType?: string;
      customInstructions?: string;
      userSettings?: any;
    }
  ) {
    const input: ImprovedEntityGenerationInput = {
      projectId,
      userDescription,
      preferredEntityType: options?.preferredEntityType,
      customInstructions: options?.customInstructions,
      userSettings: options?.userSettings,
      includeProjectInfo: true,
      includeExistingEntities: true,
      executionOptions: {
        createInDatabase: false // Не создаем в БД
      }
    };

    return await this.execute(input, executionContext);
  }

  /**
   * Метод для определения только типа сущности без генерации полей
   */
  async detectEntityTypeOnly(
    projectId: string,
    userDescription: string,
    executionContext: any,
    preferredEntityType?: string
  ) {
    const input: ImprovedEntityGenerationInput = {
      projectId,
      userDescription,
      preferredEntityType,
      includeProjectInfo: true,
      includeExistingEntities: false,
      executionOptions: {
        skipFieldGeneration: true,
        createInDatabase: false
      }
    };

    return await this.execute(input, executionContext);
  }

  // ===== INSTANCE МЕТОДЫ ИЗ ИНТЕРФЕЙСА AIPIPELINE =====

  /**
   * Подготовка входных данных для пайплайна
   */
  prepareInput(
    projectId: string,
    userDescription: string,
    options: {
      preferredEntityType?: string;
      additionalContext?: string;
      includeProjectInfo?: boolean;
      includeExistingEntities?: boolean;
    } = {}
  ): ImprovedEntityGenerationInput {
    return {
      projectId,
      userDescription: userDescription.trim(),
      preferredEntityType: options.preferredEntityType,
      customInstructions: options.additionalContext, // Маппим additionalContext в customInstructions
      includeProjectInfo: options.includeProjectInfo ?? true,
      includeExistingEntities: options.includeExistingEntities ?? true,
      executionOptions: {
        skipTypeDetection: false,
        skipFieldGeneration: false,
        createInDatabase: true
      }
    };
  }

  /**
   * Трансформация результата пайплайна в удобный формат
   */
  transformResult(
    pipelineResult: any,
    startTime: Date
  ): any {
    const contextResult = pipelineResult.steps?.get('analyze_project_context');
    const typeResult = pipelineResult.steps?.get('detect_entity_type');
    const fieldsResult = pipelineResult.steps?.get('generate_entity_fields');
    const creationResult = pipelineResult.steps?.get('create_entity');

    const processingTime = Date.now() - startTime.getTime();
    const totalTokensUsed = Array.from(pipelineResult.steps?.values() || [])
      .reduce((sum: number, result: any) => sum + (result.metadata?.tokensUsed || 0), 0);

    // Подсчет предупреждений и ошибок
    const warnings: string[] = [];
    const errors: string[] = [];

    // Проверяем каждый шаг на проблемы
    if (contextResult && !contextResult.success) {
      errors.push(`Ошибка анализа контекста: ${contextResult.error}`);
    }
    if (typeResult && !typeResult.success) {
      errors.push(`Ошибка определения типа: ${typeResult.error}`);
    }
    if (fieldsResult && !fieldsResult.success) {
      errors.push(`Ошибка генерации полей: ${fieldsResult.error}`);
    }
    if (creationResult && !creationResult.success) {
      errors.push(`Ошибка создания сущности: ${creationResult.error}`);
    }

    // Добавляем предупреждения о пропущенных полях
    if (fieldsResult?.data?.generationMetadata?.skippedFields?.length > 0) {
      warnings.push(`Пропущены поля: ${fieldsResult.data.generationMetadata.skippedFields.join(', ')}`);
    }

    // Предупреждения о связях
    if (creationResult?.data?.appliedRelationships) {
      const failedRelationships = creationResult.data.appliedRelationships.filter((r: any) => r.status === 'failed');
      if (failedRelationships.length > 0) {
        warnings.push(`Не удалось создать ${failedRelationships.length} связей`);
      }
    }

    const result: any = {
      projectId: contextResult?.data?.projectId || '',
      createdEntity: {
        id: creationResult?.data?.createdEntity?.id || '',
        name: creationResult?.data?.createdEntity?.name || 'Неизвестная сущность',
        description: creationResult?.data?.createdEntity?.description,
        entityTypeId: creationResult?.data?.createdEntity?.entityTypeId || '',
        entityType: {
          type: typeResult?.data?.selectedEntityType?.type || 'unknown',
          name: typeResult?.data?.selectedEntityType?.name || 'Неизвестный тип'
        },
        createdAt: creationResult?.data?.createdEntity?.createdAt || new Date()
      },
      generationReport: {
        selectedType: {
          type: typeResult?.data?.selectedEntityType?.type || 'unknown',
          name: typeResult?.data?.selectedEntityType?.name || 'Неизвестный тип',
          confidence: typeResult?.data?.confidence || 0,
          reasoning: typeResult?.data?.reasoning || 'Причина не указана'
        },
        fieldsGeneration: {
          totalFields: fieldsResult?.data?.generationMetadata?.totalFields || 0,
          filledFields: fieldsResult?.data?.generationMetadata?.filledFields || 0,
          skippedFields: fieldsResult?.data?.generationMetadata?.skippedFields || [],
          confidence: fieldsResult?.data?.generationMetadata?.confidence || 0
        },
        relationships: {
          suggested: fieldsResult?.data?.suggestedRelationships?.length || 0,
          applied: creationResult?.data?.appliedRelationships?.filter((r: any) => r.status === 'applied').length || 0,
          failed: creationResult?.data?.appliedRelationships?.filter((r: any) => r.status === 'failed').length || 0
        },
        processingTime,
        tokensUsed: totalTokensUsed,
        estimatedCost: pipelineResult.totalCost || 0
      }
    };

    if (warnings.length > 0) result.warnings = warnings;
    if (errors.length > 0) result.errors = errors;

    return result;
  }

  /**
   * Получение детального отчета о выполнении пайплайна
   */
  getDetailedReport(pipelineResult: any): string {
    const steps = [
      'analyze_project_context',
      'detect_entity_type', 
      'generate_entity_fields',
      'create_entity'
    ];

    const stepNames = {
      'analyze_project_context': '🔍 Analyze project context',
      'detect_entity_type': '🎯 Detect entity type',
      'generate_entity_fields': '🎨 Generate entity fields',
      'create_entity': '💾 Create entity'
    };

    const report: string[] = ['📊 Report on the execution of the improved entity generation pipeline:', ''];

    for (const stepId of steps) {
      const stepResult = pipelineResult.steps?.get(stepId);
      const stepName = stepNames[stepId as keyof typeof stepNames] || stepId;
      
      if (stepResult) {
        if (stepResult.success) {
          report.push(`✅ ${stepName}: успешно`);
          if (stepResult.metadata?.tokensUsed) {
            report.push(`   📊 Токенов использовано: ${stepResult.metadata.tokensUsed}`);
          }
          if (stepResult.metadata?.executionTime) {
            report.push(`   ⏱️ Время выполнения: ${stepResult.metadata.executionTime}мс`);
          }
        } else {
          report.push(`❌ ${stepName}: ошибка`);
          report.push(`   ⚠️ ${stepResult.error}`);
        }
      } else {
        report.push(`⏭️ ${stepName}: пропущен`);
      }
    }

    report.push('');
    report.push(`⏱️ Общее время выполнения: ${pipelineResult.totalTime || 0}мс`);
    report.push(`💰 Общая стоимость: ${pipelineResult.totalCost || 0} кредитов`);
    report.push('🚀 Использует улучшенную SOLID архитектуру');

    return report.join('\n');
  }
}