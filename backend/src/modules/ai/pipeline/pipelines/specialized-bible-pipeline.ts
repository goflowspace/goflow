import { BasePipeline } from '../base/base-pipeline';
import { PipelineStep } from '../interfaces/pipeline.interface';
import { OperationRegistry } from '../factory/operation-registry';
import { ContextAnalysisOperation } from '../operations/context-analysis.operation';
import { ImprovedConsistencyCheckOperation } from '../operations/improved-consistency-check.operation';
import { ParallelPipelineEngine } from '../engine/parallel-pipeline-engine';

// Импортируем все новые специализированные операции
import {
  GenreGenerationOperation,
  LoglineGenerationOperation,
  SynopsisGenerationOperation,
  SettingGenerationOperation,
  AtmosphereGenerationOperation,
  TargetAudienceGenerationOperation,
  ThemeGenerationOperation,
  MessageGenerationOperation,
  UniqueFeaturesGenerationOperation,
  ReferencesGenerationOperation,
  VisualStyleGenerationOperation
} from '../operations/bible-generation';

/**
 * Специализированный пайплайн для генерации библии проекта
 * Использует отдельные операции для каждого типа поля (SOLID принципы)
 */
export class SpecializedBiblePipeline extends BasePipeline {
  
  // Порядок генерации полей по приоритету и зависимостям
  private readonly fieldGenerationOrder = [
    'synopsis', 'logline', 'genres', 'setting', 
    'targetAudience', 'mainThemes', 'atmosphere', 'uniqueFeatures',
    'message', 'references', 'visualStyle'
  ];

  // Маппинг полей на операции
  private readonly fieldToOperation = {
    synopsis: 'synopsis_generation',
    logline: 'logline_generation',
    genres: 'genre_generation',
    setting: 'setting_generation',
    atmosphere: 'atmosphere_generation',
    targetAudience: 'target_audience_generation',
    mainThemes: 'theme_generation',
    message: 'message_generation',
    uniqueFeatures: 'unique_features_generation',
    references: 'references_generation',
    visualStyle: 'visual_style_generation'
  };

  constructor() {
    // Сначала создаем шаги
    const steps = SpecializedBiblePipeline.createPipelineSteps();

    super(
      'specialized_bible_pipeline',
      'Specialized Bible Generation Pipeline',
      'Специализированный пайплайн для генерации библии проекта с отдельными операциями для каждого поля',
      '1.0.0',
      steps
    );

    // После super() можем инициализировать операции
    this.initializeOperations();
  }

  /**
   * Создание шагов пайплайна (статический метод)
   */
  private static createPipelineSteps(): PipelineStep[] {
    // Регистрируем общие операции
    if (!OperationRegistry.isRegistered('context_analysis')) {
      OperationRegistry.register('context_analysis', () => new ContextAnalysisOperation());
    }
    if (!OperationRegistry.isRegistered('improved_consistency_check')) {
      OperationRegistry.register('improved_consistency_check', () => new ImprovedConsistencyCheckOperation());
    }

    // Регистрируем специализированные операции
    SpecializedBiblePipeline.registerSpecializedOperations();

    const fieldGenerationOrder = [
      'synopsis', 'logline', 'genres', 'setting', 
      'targetAudience', 'mainThemes', 'atmosphere', 'uniqueFeatures',
      'message', 'references', 'visualStyle'
    ];

    const fieldToOperation = {
      genres: 'genre_generation',
      logline: 'logline_generation',
      synopsis: 'synopsis_generation',
      setting: 'setting_generation',
      atmosphere: 'atmosphere_generation',
      targetAudience: 'target_audience_generation',
      mainThemes: 'theme_generation',
      message: 'message_generation',
      uniqueFeatures: 'unique_features_generation',
      references: 'references_generation',
      visualStyle: 'visual_style_generation'
    };

    const steps: PipelineStep[] = [
      // 1. Анализ контекста (всегда выполняется первым)
      {
        id: 'analyze_context',
        operation: OperationRegistry.create('context_analysis'),
        dependencies: [],
        condition: (_context, _previousResults) => true,
        inputTransform: (input) => ({
          baseDescription: input.baseDescription,
          existingProjectInfo: input.existingProjectInfo,
          forceRegeneration: input.forceRegeneration
        })
      }
    ];

    // Создаем шаги для генерации каждого поля с специализированными операциями
    fieldGenerationOrder.forEach((fieldType) => {
      const dependencies = ['analyze_context'];
      
      // Определяем специфические зависимости для каждого поля
      // Не добавляем автоматическую зависимость от предыдущего поля
      SpecializedBiblePipeline.addFieldSpecificDependencies(fieldType, dependencies);

      const operationId = fieldToOperation[fieldType as keyof typeof fieldToOperation];

      steps.push({
        id: `generate_${fieldType}`,
        operation: OperationRegistry.create(operationId),
        dependencies,
        condition: (_context, previousResults) => {
          const analysis = previousResults.get('analyze_context');
          return analysis?.success && 
                 (analysis.data.generationPriorities.criticalFields.includes(fieldType) ||
                  analysis.data.generationPriorities.additionalFields.includes(fieldType));
        },
        inputTransform: (input, _context, previousResults) => {
          return SpecializedBiblePipeline.createFieldInputStatic(fieldType, input, previousResults, fieldGenerationOrder);
        }
      });
    });

    // Добавляем финальную проверку согласованности
    // steps.push({
    //   id: 'check_consistency',
    //   operation: OperationRegistry.create('improved_consistency_check'),
    //   dependencies: ['analyze_context', ...fieldGenerationOrder.map(field => `generate_${field}`)],
    //   condition: (_context, previousResults) => {
    //     const analysis = previousResults.get('analyze_context');
    //     return analysis?.success && analysis.data.generationPriorities.hasWork;
    //   },
    //   inputTransform: (_input, _context, previousResults) => {
    //     return SpecializedBiblePipeline.createConsistencyCheckInputStatic(previousResults, fieldGenerationOrder);
    //   }
    // });

    return steps;
  }

  /**
   * Инициализация операций после super()
   */
  private initializeOperations(): void {
    // Здесь можем выполнить дополнительную инициализацию если нужно
  }



  /**
   * Регистрация всех специализированных операций
   */
  private static registerSpecializedOperations(): void {
    const operations = [
      { id: 'genre_generation', class: GenreGenerationOperation },
      { id: 'logline_generation', class: LoglineGenerationOperation },
      { id: 'synopsis_generation', class: SynopsisGenerationOperation },
      { id: 'setting_generation', class: SettingGenerationOperation },
      { id: 'atmosphere_generation', class: AtmosphereGenerationOperation },
      { id: 'target_audience_generation', class: TargetAudienceGenerationOperation },
      { id: 'theme_generation', class: ThemeGenerationOperation },
      { id: 'message_generation', class: MessageGenerationOperation },
      { id: 'unique_features_generation', class: UniqueFeaturesGenerationOperation },
      { id: 'references_generation', class: ReferencesGenerationOperation },
      { id: 'visual_style_generation', class: VisualStyleGenerationOperation }
    ];

    operations.forEach(({ id, class: OperationClass }) => {
      if (!OperationRegistry.isRegistered(id)) {
        OperationRegistry.register(id, () => new OperationClass());
      }
    });
  }

  /**
   * Добавление специфических зависимостей для полей
   */
  private static addFieldSpecificDependencies(fieldType: string, dependencies: string[]): void {
    switch (fieldType) {
      case 'synopsis':
        // Synopsis генерируется первым, без зависимостей от других полей
        break;
      case 'logline':
        dependencies.push('generate_synopsis');
        break;
      case 'genres':
        dependencies.push('generate_synopsis', 'generate_logline');
        break;
      case 'setting':
        dependencies.push('generate_genres');
        break;
      case 'targetAudience':
        dependencies.push('generate_setting');
        break;
      case 'mainThemes':
        dependencies.push('generate_targetAudience');
        break;
      // Параллельная группа - все зависят только от mainThemes + дополнительных контекстов
      case 'atmosphere':
        dependencies.push('generate_setting', 'generate_mainThemes');
        break;
      case 'uniqueFeatures':
        dependencies.push('generate_genres', 'generate_setting', 'generate_mainThemes');
        break;
      case 'message':
        dependencies.push('generate_mainThemes');
        break;
      case 'references':
        dependencies.push('generate_genres', 'generate_mainThemes');
        break;
      case 'visualStyle':
        dependencies.push('generate_setting', 'generate_mainThemes');
        break;
    }
  }

  /**
   * Создание входных данных для поля (статическая версия для конструктора)
   */
  private static createFieldInputStatic(_fieldType: string, input: any, previousResults: Map<string, any>, fieldGenerationOrder: string[]): any {
    // Собираем уже сгенерированный контент для контекста
    const existingFields: Record<string, any> = {};
    
    fieldGenerationOrder.forEach(prevFieldType => {
      const stepResult = previousResults.get(`generate_${prevFieldType}`);
      if (stepResult?.success && stepResult.data?.fieldContent) {
        existingFields[prevFieldType] = stepResult.data.fieldContent;
      }
    });

    return {
      projectContext: input.baseDescription,
      userSettings: input.userSettings,
      additionalContext: {
        existingFields,
        projectGenres: existingFields.genres ? 
          (Array.isArray(existingFields.genres) ? existingFields.genres : [existingFields.genres]) : [],
        targetAudience: existingFields.targetAudience
      }
    };
  }

  /**
   * Создание входных данных для проверки согласованности (статическая версия для конструктора)
   * @deprecated Временно не используется, но сохранен для возможного будущего использования
   */
  // @ts-ignore - Метод сохранен для возможного будущего использования
  private static _createConsistencyCheckInputStatic(previousResults: Map<string, any>, fieldGenerationOrder: string[]): any {
    // Собираем все сгенерированные поля
    const generatedFields: Record<string, any> = {};
    
    fieldGenerationOrder.forEach(fieldType => {
      const stepResult = previousResults.get(`generate_${fieldType}`);
      if (stepResult?.success && stepResult.data?.fieldContent) {
        generatedFields[fieldType] = stepResult.data.fieldContent;
      }
    });

    // Создаем структуру для проверки согласованности
    return {
      projectData: {
        synopsis: generatedFields.synopsis,
        logline: generatedFields.logline,
        genres: Array.isArray(generatedFields.genres) ? generatedFields.genres : [generatedFields.genres],
        atmosphere: generatedFields.atmosphere,
        visualStyle: generatedFields.visualStyle,
        mainThemes: generatedFields.mainThemes,
        targetAudience: generatedFields.targetAudience
      },
      entities: [], // Для этого пайплайна сущности не используются
      checkTypes: ['thematic', 'logical', 'tone']
    };
  }

  /**
   * Реализация абстрактного метода для структуры пайплайна
   */
  getPipelineStructure() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      groups: [
        {
          id: 'context_analysis',
          name: 'Analyze context',
          type: 'sequential' as const,
          steps: [{
            id: 'analyze_context',
            name: 'Analyze project',
            description: 'Analyze project context and determine priorities',
            dependencies: [],
            isOptional: false
          }]
        },
        {
          id: 'conceptual_generation',
          name: 'Conceptual elements',
          type: 'sequential' as const,
          steps: [
            {
              id: 'generate_synopsis',
              name: 'Generate synopsis',
              description: 'Create a structured description of the plot',
              dependencies: ['analyze_context'],
              isOptional: false
            },
            {
              id: 'generate_logline',
              name: 'Generate logline',
              description: 'Create a short, engaging description of the project',
              dependencies: ['generate_synopsis'],
              isOptional: false
            },
            {
              id: 'generate_genres',
              name: 'Generate genres',
              description: 'Determine the main and additional genres of the project',
              dependencies: ['generate_synopsis', 'generate_logline'],
              isOptional: false
            }
          ]
        },
        {
          id: 'contextual_generation',
          name: 'Contextual elements',
          type: 'sequential' as const,
          steps: [
            {
              id: 'generate_setting',
              name: 'Generate setting',
              description: 'Create a description of the place and time of action',
              dependencies: ['generate_genres'],
              isOptional: false
            },
            {
              id: 'generate_targetAudience',
              name: 'Analyze target audience',
              description: 'Determine and describe the target audience of the project',
              dependencies: ['generate_setting'],
              isOptional: false
            },
            {
              id: 'generate_mainThemes',
              name: 'Generate main themes',
              description: 'Identify and formulate key thematic elements',
              dependencies: ['generate_targetAudience'],
              isOptional: false
            }
          ]
        },
        {
          id: 'parallel_generation',
          name: 'Parallel generation of stylistic elements',
          type: 'parallel' as const,
          steps: [
            {
              id: 'generate_atmosphere',
              name: 'Generate atmosphere',
              description: 'Create a description of the general mood and style',
              dependencies: ['generate_setting', 'generate_mainThemes'],
              isOptional: false
            },
            {
              id: 'generate_uniqueFeatures',
              name: 'Generate unique features',
              description: 'Determine distinctive features and competitive advantages',
              dependencies: ['generate_genres', 'generate_setting', 'generate_mainThemes'],
              isOptional: false
            },
            {
              id: 'generate_message',
              name: 'Formulate message',
              description: 'Create the central idea and message of the project',
              dependencies: ['generate_mainThemes'],
              isOptional: false
            },
            {
              id: 'generate_references',
              name: 'Select references',
              description: 'Determine relevant analogs and sources of inspiration',
              dependencies: ['generate_genres', 'generate_mainThemes'],
              isOptional: false
            },
            {
              id: 'generate_visualStyle',
              name: 'Generate visual style',
              description: 'Create a description of the graphical execution and visual concept',
              dependencies: ['generate_setting', 'generate_mainThemes'],
              isOptional: false
            }
          ]
        }
        // {
        //   id: 'validation',
        //   name: 'Validation',
        //   type: 'sequential' as const,
        //   steps: [
        //     {
        //       id: 'check_consistency',
        //       name: 'Check consistency',
        //       description: 'Analysis of the consistency of all generated content',
        //       dependencies: ['generate_atmosphere', 'generate_uniqueFeatures', 'generate_message', 'generate_references', 'generate_visualStyle'],
        //       isOptional: false
        //     }
        //   ]
        // }
      ]
    };
  }

  /**
   * Переопределенный метод выполнения с обработкой результатов
   */
  async execute(input: any, context: any) {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting specialized bible pipeline with dedicated operations...');
      
      // Используем параллельный engine для выполнения
      const engine = new ParallelPipelineEngine();
      const result = await engine.execute(this, input, context);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          metadata: {
            executionTime: Date.now() - startTime,
            fieldsGenerated: 0,
            operationsUsed: []
          }
        };
      }

      // Обрабатываем результаты
      const processedResults = this.processResults(result);
      
      return {
        success: true,
        data: processedResults,
        metadata: {
          executionTime: Date.now() - startTime,
          fieldsGenerated: Object.keys(processedResults.generatedContent).length,
          totalCost: processedResults.metadata.totalCost,
          consistencyScore: processedResults.consistencyData?.overallConsistency || 0,
          operationsUsed: this.fieldGenerationOrder.map(field => this.fieldToOperation[field as keyof typeof this.fieldToOperation])
        }
      };

    } catch (error) {
      console.error('❌ Specialized Bible Pipeline failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown pipeline error',
        metadata: {
          executionTime: Date.now() - startTime,
          fieldsGenerated: 0,
          operationsUsed: []
        }
      };
    }
  }

  /**
   * Обработка результатов пайплайна
   */
  private processResults(result: any) {
    const steps = result.steps || new Map();
    
    // Извлекаем анализ контекста
    const analysisStep = steps.get('analyze_context');
    const analysisData = analysisStep?.success ? analysisStep.data : null;

    // Извлекаем проверку согласованности
    const consistencyStep = steps.get('check_consistency');
    const consistencyData = consistencyStep?.success ? consistencyStep.data : null;

    // Собираем сгенерированный контент
    const generatedContent: Record<string, any> = {};
    const explanations: Record<string, string> = {};
    let totalCost = 0;

    this.fieldGenerationOrder.forEach(fieldType => {
      const stepResult = steps.get(`generate_${fieldType}`);
      if (stepResult?.success && stepResult.data?.fieldContent) {
        generatedContent[fieldType] = stepResult.data.fieldContent;
        explanations[fieldType] = stepResult.data.explanation || `Сгенерировано с помощью специализированной операции`;
        totalCost += stepResult.metadata?.cost || 0;
      }
    });

    // Собираем метаданные
    const metadata = {
      totalCost,
      fieldsGenerated: Object.keys(generatedContent).length,
      completedAt: new Date().toISOString(),
      pipelineType: 'specialized',
      operationsUsed: this.fieldGenerationOrder.map(field => this.fieldToOperation[field as keyof typeof this.fieldToOperation]),
      analysisData: analysisData ? {
        criticalFields: analysisData.generationPriorities?.criticalFields || [],
        hasWork: analysisData.generationPriorities?.hasWork || false
      } : null
    };

    return {
      generatedContent,
      explanations,
      analysisData,
      consistencyData,
      metadata
    };
  }

  /**
   * Быстрый метод для полной генерации библии проекта
   */
  async generateFullBible(
    projectId: string,
    userId: string,
    baseDescription: string,
    options?: {
      existingProjectInfo?: any;
      userSettings?: any;
      forceRegeneration?: boolean;
    }
  ) {
    const input = {
      baseDescription,
      existingProjectInfo: options?.existingProjectInfo || {},
      userSettings: options?.userSettings || {},
      forceRegeneration: options?.forceRegeneration || false
    };

    const context = {
      userId,
      projectId,
      requestId: `specialized-bible-${Date.now()}`,
      startTime: new Date(),
      priority: 'normal',
      userTier: 'business',
      metadata: {}
    };

    const result = await this.execute(input, context);
    
    if (!result.success) {
      throw new Error(result.error || 'Specialized pipeline execution failed');
    }

    return result.data;
  }

  // ===== МЕТОДЫ СОВМЕСТИМОСТИ С ОРИГИНАЛЬНЫМ API =====

  /**
   * Подготовка входных данных для пайплайна (совместимость)
   */
  prepareInput(
    baseDescription: string,
    existingProjectInfo?: any,
    userSettings?: any,
    forceRegeneration?: boolean
  ): any {
    return {
      baseDescription,
      existingProjectInfo: existingProjectInfo || {},
      userSettings: userSettings || {},
      forceRegeneration: forceRegeneration || false
    };
  }

  /**
   * Статический метод для подготовки входных данных (совместимость)
   */
  static prepareInput(
    baseDescription: string,
    existingProjectInfo?: any,
    userSettings?: any,
    forceRegeneration?: boolean
  ): any {
    return {
      baseDescription,
      existingProjectInfo: existingProjectInfo || {},
      userSettings: userSettings || {},
      forceRegeneration: forceRegeneration || false
    };
  }

  /**
   * Статический метод для извлечения результатов пайплайна (совместимость)
   */
  static extractResults(result: any): {
    generatedContent: any;
    explanations: any;
    analysisData: any;
    consistencyData: any;
    metadata: any;
  } | null {
    if (!result.success) {
      return null;
    }

    const steps = result.steps || new Map();
    
    // Извлекаем анализ контекста
    const analysisStep = steps.get('analyze_context');
    const analysisData = analysisStep?.success ? analysisStep.data : null;

    // Извлекаем проверку согласованности
    const consistencyStep = steps.get('check_consistency');
    const consistencyData = consistencyStep?.success ? consistencyStep.data : null;

    // Собираем сгенерированный контент
    const generatedContent: any = {};
    const explanations: any = {};
    const fieldMappings = {
      'generate_genres': 'genres',
      'generate_logline': 'logline', 
      'generate_synopsis': 'synopsis',
      'generate_setting': 'setting',
      'generate_targetAudience': 'targetAudience',
      'generate_mainThemes': 'mainThemes',
      'generate_atmosphere': 'atmosphere',
      'generate_uniqueFeatures': 'uniqueFeatures',
      'generate_message': 'message',
      'generate_references': 'references',
      'generate_visualStyle': 'visualStyle'
    };

    Object.entries(fieldMappings).forEach(([stepId, fieldName]) => {
      const stepResult = steps.get(stepId);
      if (stepResult?.success && stepResult.data?.fieldContent) {
        // Для жанров оставляем массивы как есть, для остальных - строки
        generatedContent[fieldName] = stepResult.data.fieldContent;
        explanations[fieldName] = stepResult.data.explanation || 'Сгенерировано с помощью специализированной операции';
      }
    });

    // Собираем метаданные
    const metadata = {
      totalCost: result.totalCost || 0,
      totalTime: result.totalTime || 0,
      fieldsGenerated: Object.keys(generatedContent).length,
      completedAt: new Date().toISOString(),
      pipelineType: 'specialized'
    };

    return {
      generatedContent,
      explanations,
      analysisData,
      consistencyData,
      metadata
    };
  }

  /**
   * Трансформация результата пайплайна в удобный формат (совместимость)
   */
  transformResult(pipelineResult: any, startTime: Date): any {
    const processingTime = Date.now() - startTime.getTime();
    
    // Собираем результаты генерации полей
    const generatedFields: Record<string, any> = {};
    let totalTokensUsed = 0;

    this.fieldGenerationOrder.forEach(fieldType => {
      const stepResult = pipelineResult.steps?.get(`generate_${fieldType}`);
      if (stepResult?.success && stepResult.data?.fieldContent) {
        generatedFields[fieldType] = stepResult.data.fieldContent;
        totalTokensUsed += stepResult.metadata?.tokensUsed || 0;
      }
    });

    // Анализ согласованности
    const consistencyResult = pipelineResult.steps?.get('check_consistency');
    
    return {
      success: pipelineResult.success,
      generatedFields,
      consistencyAnalysis: consistencyResult?.data || null,
      metadata: {
        processingTime,
        totalTokensUsed,
        totalCost: pipelineResult.totalCost || 0,
        fieldsGenerated: Object.keys(generatedFields).length,
        totalFieldsRequested: this.fieldGenerationOrder.length,
        pipelineType: 'specialized'
      },
      error: pipelineResult.error
    };
  }
}