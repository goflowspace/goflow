import { BasePipeline } from '../base/base-pipeline';
import { PipelineStep } from '../interfaces/pipeline.interface';
import { OperationRegistry } from '../factory/operation-registry';
import { IWebSocketManager } from '../../../websocket/interfaces/websocket.interfaces';

// Импортируем операции
import { EntityContextAnalysisOperation } from '../operations/common/entity-context-analysis.operation';
import { PromptGenerationOperation } from '../operations/common/prompt-generation.operation';
import { ImageGenerationOperation } from '../operations/common/image-generation.operation';
import { SimplePipelineEngine } from '../engine/simple-pipeline-engine';
import { processImage } from 'utils/imageProcessing';

/**
 * Пайплайн для генерации изображений сущностей
 * Следует принципам SOLID и использует специализированные операции
 */
export class EntityImageGenerationPipeline extends BasePipeline {
  
  constructor() {
    // Сначала создаем шаги
    const steps = EntityImageGenerationPipeline.createPipelineSteps();

    super(
      'entity_image_generation_pipeline',
      'Entity Image Generation Pipeline',
      'Пайплайн для генерации изображений сущностей с анализом контекста и библии проекта',
      '1.0.0',
      steps
    );

    // После super() инициализируем операции
    this.initializeOperations();
  }

  /**
   * Создание шагов пайплайна (статический метод)
   */
  private static createPipelineSteps(): PipelineStep[] {
    // Регистрируем операции
    EntityImageGenerationPipeline.registerOperations();

    const steps: PipelineStep[] = [
      // 1. Анализ контекста сущности и библии проекта
      {
        id: 'analyze_entity_context',
        operation: OperationRegistry.create('entity_context_analysis'),
        dependencies: [],
        condition: (_context, _previousResults) => true,
        inputTransform: (input) => ({
          entityData: input.entityData,
          projectBible: input.projectBible,
          userSettings: input.userSettings,
          customPromptRequirements: input.customPromptRequirements
        })
      },

      // 2. Генерация промпта для изображения
      {
        id: 'generate_image_prompt',
        operation: OperationRegistry.create('prompt_generation'),
        dependencies: ['analyze_entity_context'],
        condition: (_context, previousResults) => {
          const contextAnalysis = previousResults.get('analyze_entity_context');
          return contextAnalysis?.success && contextAnalysis.data?.enrichedContext;
        },
        inputTransform: (_input, _context, previousResults) => {
          return EntityImageGenerationPipeline.createPromptGenerationInput(previousResults);
        }
      },

      // 3. Генерация изображения
      {
        id: 'generate_entity_image',
        operation: OperationRegistry.create('image_generation'),
        dependencies: ['generate_image_prompt'],
        condition: (_context, previousResults) => {
          const promptGeneration = previousResults.get('generate_image_prompt');
          return promptGeneration?.success && promptGeneration.data?.optimizedPrompt;
        },
        inputTransform: (input, _context, previousResults) => {
          return EntityImageGenerationPipeline.createImageGenerationInput(previousResults, input);
        }
      }
    ];

    return steps;
  }

  /**
   * Инициализация операций после super()
   */
  private initializeOperations(): void {
    // Здесь можем выполнить дополнительную инициализацию если нужно
  }

  /**
   * Регистрация всех необходимых операций
   */
  private static registerOperations(): void {
    const operations = [
      { id: 'entity_context_analysis', class: EntityContextAnalysisOperation },
      { id: 'prompt_generation', class: PromptGenerationOperation },
      { id: 'image_generation', class: ImageGenerationOperation }
    ];

    operations.forEach(({ id, class: OperationClass }) => {
      if (!OperationRegistry.isRegistered(id)) {
        OperationRegistry.register(id, () => new OperationClass());
      }
    });
  }

  /**
   * Создание входных данных для генерации промпта
   */
  private static createPromptGenerationInput(previousResults: Map<string, any>): any {
    const contextAnalysis = previousResults.get('analyze_entity_context');
    
    if (!contextAnalysis?.success || !contextAnalysis.data?.enrichedContext) {
      throw new Error('Context analysis failed or missing enriched context');
    }

    const enrichedContext = contextAnalysis.data.enrichedContext;
    const entityInfo = enrichedContext.entityInfo;
    const entityAttributes = enrichedContext.entityAttributes;
    const projectContext = enrichedContext.projectContext;
    const imageGuidance = enrichedContext.imageGuidance;

    // Формируем контекстные данные для промпта
    const contextData = {
      entityName: entityInfo.name,
      entityType: entityInfo.type,
      entityCategory: entityInfo.category,
      entityDescription: entityInfo.description,
      
      // Атрибуты сущности
      appearance: entityAttributes.appearance,
      personality: entityAttributes.personality,
      background: entityAttributes.background,
      abilities: entityAttributes.abilities,
      equipment: entityAttributes.equipment,
      location: entityAttributes.location,
      culture: entityAttributes.culture,
      
      // Контекст проекта
      worldSetting: projectContext.worldSetting,
      visualStyle: projectContext.visualStyle,
      atmosphere: projectContext.atmosphere,
      genres: projectContext.genres,
      themes: projectContext.themes,
      
      // Рекомендации по изображению
      focusElements: imageGuidance.focusElements,
      avoidElements: imageGuidance.avoidElements,
      styleDirection: imageGuidance.styleDirection
    };

    // Объединяем базовые требования с пользовательскими
    const baseRequirements = [
      'Учесть все визуальные детали сущности',
      'Соответствовать стилю и атмосфере проекта',
      'Фокус на ключевых элементах',
      'Избегать нежелательных элементов',
      'Квадратное соотношение сторон 1:1'
    ];
    
    const userRequirements = imageGuidance.userRequirements || [];
    const allRequirements = [...baseRequirements, ...userRequirements];

    return {
      contextData,
      taskDescription: `Создать детальный промпт для генерации изображения сущности "${entityInfo.name}" типа "${entityInfo.category}" в стиле проекта`,
      targetDomain: 'image_generation',
      outputFormat: 'Структурированный промпт для Gemini 2.5 Flash Image',
      additionalRequirements: allRequirements,
      customInstructions: `
        Сущность: ${entityInfo.category}
        Стиль проекта: ${projectContext.visualStyle}
        Атмосфера: ${projectContext.atmosphere}
        Жанры: ${projectContext.genres.join(', ')}
        ${userRequirements.length > 0 ? `\n        Дополнительные требования пользователя:\n        ${userRequirements.map((req: string) => `- ${req}`).join('\n        ')}` : ''}
      `,
      targetAudience: 'Создатели контента для творческих проектов',
      qualityLevel: 'expert'
    };
  }

  /**
   * Создание входных данных для генерации изображения
   */
  private static createImageGenerationInput(previousResults: Map<string, any>, originalInput?: any): any {
    const promptGeneration = previousResults.get('generate_image_prompt');
    
    if (!promptGeneration?.success || !promptGeneration.data?.optimizedPrompt) {
      throw new Error('Prompt generation failed or missing optimized prompt');
    }

    const optimizedPrompt = promptGeneration.data.optimizedPrompt;
    const suggestedParameters = promptGeneration.data.suggestedParameters || {};

    // Извлекаем параметры провайдера из оригинального input
    const imageProvider = originalInput?.imageProvider || 'gemini';
    const imageQuality = originalInput?.imageQuality || 'low';

    console.log('🎨 ============ IMAGE GENERATION INPUT ============');
    console.log('🎯 Optimized Prompt:', optimizedPrompt);
    console.log('🚀 Provider:', imageProvider);
    console.log('🎛️ Quality:', imageQuality);
    console.log('⚙️ Suggested Parameters:', JSON.stringify(suggestedParameters, null, 2));
    console.log('===============================================');

    // Определяем правильное значение personGeneration в зависимости от провайдера
    let personGeneration: 'dont_allow' | 'allow_adult' | 'allow_all';
    if (imageProvider === 'openai') {
      personGeneration = 'allow_all'; // OpenAI поддерживает allow_all
    } else {
      personGeneration = 'allow_adult'; // Gemini поддерживает allow_adult или dont_allow
    }

    return {
      prompt: optimizedPrompt,
      aspectRatio: '1:1', // Квадратное как требуется
      safetyFilterLevel: 'standard',
      personGeneration, // Зависит от провайдера
      provider: imageProvider, // Новый параметр провайдера
      quality: imageQuality, // Новый параметр качества для OpenAI
      // Используем рекомендованные параметры из генерации промпта если есть
      ...suggestedParameters
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
          name: 'Анализ контекста',
          type: 'sequential' as const,
          steps: [{
            id: 'analyze_entity_context',
            name: 'Analyze entity and project bible',
            description: 'Analyze entity data and project bible for image generation',
            dependencies: [],
            isOptional: false
          }]
        },
        {
          id: 'prompt_generation',
          name: 'Generate prompt',
          type: 'sequential' as const,
          steps: [{
            id: 'generate_image_prompt',
            name: 'Create prompt',
            description: 'Generate optimized prompt for image generation',
            dependencies: ['analyze_entity_context'],
            isOptional: false
          }]
        },
        {
          id: 'image_generation',
          name: 'Generate image',
          type: 'sequential' as const,
          steps: [{
            id: 'generate_entity_image',
            name: 'Generate image',
            description: 'Generate entity image using Gemini 2.5 Flash Image',
            dependencies: ['generate_image_prompt'],
            isOptional: false
          }]
        }
      ]
    };
  }

  /**
   * Переопределенный метод выполнения с обработкой результатов
   */
  async execute(input: any, context: any, wsManager?: IWebSocketManager) {
    const startTime = Date.now();
    
    try {
      console.log('🖼️ Starting entity image generation pipeline...');
      
      // Используем engine для выполнения
      const engine = new SimplePipelineEngine(wsManager);
      const result = await engine.execute(this, input, context);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          metadata: {
            executionTime: Date.now() - startTime,
            stepsCompleted: Array.from(result.steps?.keys() || []).length,
            operationsUsed: []
          }
        };
      }

      // Обрабатываем результаты
      const processedResults = await this.processResults(result);
      
      return {
        success: true,
        data: processedResults,
        metadata: {
          executionTime: Date.now() - startTime,
          stepsCompleted: Object.keys(processedResults.stepResults).length,
          totalCost: processedResults.metadata.totalCost,
          confidenceScore: processedResults.contextAnalysis?.confidence || 0,
          operationsUsed: ['entity_context_analysis', 'prompt_generation', 'image_generation']
        }
      };

    } catch (error) {
      console.error('❌ Entity Image Generation Pipeline failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown pipeline error',
        metadata: {
          executionTime: Date.now() - startTime,
          stepsCompleted: 0,
          operationsUsed: []
        }
      };
    }
  }

  /**
   * Публичный метод для обработки результатов пайплайна
   */
  async processResultsPublic(result: any) {
    return this.processResults(result);
  }

  /**
   * Обработка результатов пайплайна
   */
  private async processResults(result: any) {
    const steps = result.steps || new Map();
    
    // Извлекаем результаты каждого шага
    const contextAnalysisStep = steps.get('analyze_entity_context');
    const promptGenerationStep = steps.get('generate_image_prompt');
    const imageGenerationStep = steps.get('generate_entity_image');

    // Собираем данные
    const contextAnalysis = contextAnalysisStep?.success ? contextAnalysisStep.data : null;
    const promptData = promptGenerationStep?.success ? promptGenerationStep.data : null;
    const imageData = imageGenerationStep?.success ? imageGenerationStep.data : null;

    // Считаем общую стоимость
    let totalCost = 0;
    totalCost += contextAnalysisStep?.metadata?.cost || 0;
    totalCost += promptGenerationStep?.metadata?.cost || 0;
    totalCost += imageGenerationStep?.metadata?.cost || 0;

    // Основной результат - изображение с обработкой
    let finalImage = null;
    
    if (imageData?.imageBase64) {
      try {        
        const base64Data = imageData.imageBase64;
        
        // Добавляем data:image prefix если его нет
        const dataUrl = base64Data.startsWith('data:') 
          ? base64Data 
          : `data:image/png;base64,${base64Data}`;
          
        // Подготавливаем AI метаданные
        const aiMetadata = {
          isAIGenerated: true,
          aiProvider: 'gemini' as const, // старый пайплайн использует только Gemini
          aiModel: 'gemini-2.5-flash-image-preview',
          generatedAt: new Date()
        };
        
        // Обрабатываем изображение: создаем original и thumbnail
        const processedImage = await processImage(dataUrl, `ai-pipeline-${Date.now()}.png`, true, aiMetadata);
        
        finalImage = {
          imageBase64: imageData.imageBase64,
          imageUrl: imageData.imageUrl,
          prompt: imageData.prompt,
          revisedPrompt: imageData.revisedPrompt,
          processedImage, // Добавляем обработанное изображение с thumbnail
          metadata: {
            ...imageData.metadata,
            optimizedPrompt: promptData?.optimizedPrompt,
            promptConfidence: promptData?.confidence,
            contextConfidence: contextAnalysis?.confidence,
            entityInfo: contextAnalysis?.enrichedContext?.entityInfo
          }
        };
        
        console.log(`✅ Image processed in pipeline - Original: ${processedImage.original.metadata.width}x${processedImage.original.metadata.height}, Thumbnail: ${processedImage.thumbnail.metadata.width}x${processedImage.thumbnail.metadata.height}`);
        
      } catch (error) {
        console.error('❌ Error processing image in pipeline:', error);
        // Fallback: возвращаем без обработки
        finalImage = {
          imageBase64: imageData.imageBase64,
          imageUrl: imageData.imageUrl,
          prompt: imageData.prompt,
          revisedPrompt: imageData.revisedPrompt,
          metadata: {
            ...imageData.metadata,
            optimizedPrompt: promptData?.optimizedPrompt,
            promptConfidence: promptData?.confidence,
            contextConfidence: contextAnalysis?.confidence,
            entityInfo: contextAnalysis?.enrichedContext?.entityInfo
          }
        };
      }
    }

    // Результаты по шагам
    const stepResults = {
      contextAnalysis: contextAnalysisStep?.success ? {
        enrichedContext: contextAnalysis.enrichedContext,
        confidence: contextAnalysis.confidence,
        reasoning: contextAnalysis.reasoning
      } : null,
      
      promptGeneration: promptGenerationStep?.success ? {
        optimizedPrompt: promptData.optimizedPrompt,
        confidence: promptData.confidence,
        reasoning: promptData.reasoning,
        suggestedParameters: promptData.suggestedParameters,
        domainSpecificTips: promptData.domainSpecificTips
      } : null,
      
      imageGeneration: imageGenerationStep?.success ? {
        imageBase64: imageData.imageBase64,
        prompt: imageData.prompt,
        metadata: imageData.metadata
      } : null
    };

    // Собираем метаданные
    const metadata = {
      totalCost,
      stepsCompleted: Object.values(stepResults).filter(Boolean).length,
      totalSteps: 3,
      completedAt: new Date().toISOString(),
      pipelineType: 'entity_image_generation',
      operationsUsed: ['entity_context_analysis', 'prompt_generation', 'image_generation']
    };

    return {
      finalImage,
      stepResults,
      contextAnalysis,
      promptData,
      imageData,
      metadata
    };
  }

  /**
   * Быстрый метод для генерации изображения сущности
   */
  async generateEntityImage(
    entityId: string,
    projectId: string,
    userId: string,
    entityData: {
      name: string;
      description?: string;
      entityType: {
        id: string;
        name: string;
        type: string;
      };
      values: Record<string, any>;
    },
    projectBible: {
      synopsis?: string;
      logline?: string;
      genres?: string[];
      setting?: string;
      atmosphere?: string;
      mainThemes?: string;
      targetAudience?: string;
      references?: string;
      uniqueFeatures?: string;
      constraints?: string;
    },
    options?: {
      userSettings?: any;
      customPromptRequirements?: string[];
    }
  ) {
    const input = {
      entityData,
      projectBible,
      userSettings: options?.userSettings || {},
      customPromptRequirements: options?.customPromptRequirements || []
    };

    const context = {
      userId,
      projectId,
      entityId,
      requestId: `entity-image-${entityId}-${Date.now()}`,
      startTime: new Date(),
      priority: 'normal',
      userTier: 'business',
      metadata: {}
    };

    const result = await this.execute(input, context);
    
    if (!result.success) {
      throw new Error(result.error || 'Entity image generation pipeline execution failed');
    }

    return result.data;
  }

  // ===== МЕТОДЫ СОВМЕСТИМОСТИ =====

  /**
   * Подготовка входных данных для пайплайна
   */
  prepareInput(
    entityData: any,
    projectBible: any,
    userSettings?: any,
    customPromptRequirements?: string[],
    imageProvider?: 'gemini' | 'openai',
    imageQuality?: 'low' | 'medium' | 'high' | 'auto'
  ): any {
    return {
      entityData,
      projectBible: projectBible || {},
      userSettings: userSettings || {},
      customPromptRequirements: customPromptRequirements || [],
      imageProvider: imageProvider || 'gemini',
      imageQuality: imageQuality || 'low'
    };
  }

  /**
   * Статический метод для подготовки входных данных
   */
  static prepareInput(
    entityData: any,
    projectBible: any,
    userSettings?: any,
    customPromptRequirements?: string[],
    imageProvider?: 'gemini' | 'openai',
    imageQuality?: 'low' | 'medium' | 'high' | 'auto'
  ): any {
    return {
      entityData,
      projectBible: projectBible || {},
      userSettings: userSettings || {},
      customPromptRequirements: customPromptRequirements || [],
      imageProvider: imageProvider || 'gemini',
      imageQuality: imageQuality || 'low'
    };
  }

  /**
   * Статический метод для извлечения результатов пайплайна
   */
  static extractResults(result: any): {
    success: boolean;
    finalImage: any;
    stepResults: any;
    metadata: any;
    error?: string;
  } | null {
    if (!result.success) {
      return {
        success: false,
        finalImage: null,
        stepResults: null,
        metadata: result.metadata || {},
        error: result.error
      };
    }

    return {
      success: true,
      finalImage: result.data.finalImage,
      stepResults: result.data.stepResults,
      metadata: result.data.metadata
    };
  }

  /**
   * Трансформация результата пайплайна в удобный формат
   */
  transformResult(pipelineResult: any, startTime: Date): any {
    const processingTime = Date.now() - startTime.getTime();
    
    return {
      success: pipelineResult.success,
      image: pipelineResult.data?.finalImage || null,
      contextAnalysis: pipelineResult.data?.contextAnalysis || null,
      promptData: pipelineResult.data?.promptData || null,
      metadata: {
        processingTime,
        totalCost: pipelineResult.data?.metadata?.totalCost || 0,
        stepsCompleted: pipelineResult.data?.metadata?.stepsCompleted || 0,
        totalSteps: 3,
        pipelineType: 'entity_image_generation'
      },
      error: pipelineResult.error
    };
  }
}