// backend/src/modules/ai/v2/pipelines/EntityImageGenerationPipelineV2.ts
import { AIPipeline } from '../core/AIPipeline';
import { PipelineStep } from '../shared/pipeline-types';
import { QualityLevel, OperationOutput, ExecutionContext } from '../shared/types';
import { StreamingPipelineEngine, PipelineStateUpdate } from '../core/PipelineEngine';
import { IWebSocketManager } from '../../../websocket/interfaces/websocket.interfaces';
import { CollaborationEventType } from '../../../../types/websocket.types';

// Импорт операций
import { EntityContextAnalysisOperationV2 } from '../operations/entities/v2/EntityContextAnalysisOperationV2';
import { ImagePromptGenerationOperationV2 } from '../operations/entities/v2/ImagePromptGenerationOperationV2';
import { EntityImageGenerationOperationV2 } from '../operations/entities/v2/EntityImageGenerationOperationV2';

/**
 * Входные данные для пайплайна генерации изображений сущностей v2
 */
export interface EntityImageGenerationPipelineInputV2 {
  projectId: string;
  entityData: {
    name: string;
    description?: string;
    entityType: {
      id: string;
      name: string;
      type: string; // character, location, faction, event, rule
    };
    values: Record<string, any>; // параметры сущности (исключая изображения)
  };
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
    visualStyle?: string;
    constraints?: string;
  };
  userSettings?: {
    preferredProvider?: string;
    preferredModel?: string;
    creativityLevel?: number;
  };
  customPromptRequirements?: string[]; // Дополнительные требования пользователя
  imageProvider?: 'gemini' | 'openai'; // Провайдер для генерации изображения
  imageQuality?: 'low' | 'medium' | 'high'; // Качество изображения
  aspectRatio?: string; // Соотношение сторон
  stylePreference?: string; // Предпочтительный стиль
  processImage?: boolean; // Обрабатывать изображение (сжатие, оптимизация)
}

/**
 * Пайплайн генерации изображений сущностей v2
 * Использует новую архитектуру с централизованными провайдерами и StreamingPipelineEngine
 */
export class EntityImageGenerationPipelineV2 extends AIPipeline {
  
  constructor() {
    // Создаем экземпляры операций v2
    const contextAnalysisOperation = new EntityContextAnalysisOperationV2();
    const promptGenerationOperation = new ImagePromptGenerationOperationV2();
    const imageGenerationOperation = new EntityImageGenerationOperationV2();
    
    // Определяем шаги пайплайна
    const steps: PipelineStep[] = [
      // Шаг 1: Анализ контекста сущности и библии проекта
      {
        id: 'analyze_entity_context',
        operation: contextAnalysisOperation,
        dependencies: [],
        qualityLevel: QualityLevel.STANDARD, // Важный шаг, используем стандартное качество
        mapInput: (_results, pipelineInput: EntityImageGenerationPipelineInputV2) => ({
          projectId: pipelineInput.projectId,
          userDescription: `Генерация изображения для сущности "${pipelineInput.entityData.name}"`,
          entityData: pipelineInput.entityData,
          projectBible: pipelineInput.projectBible,
          userSettings: pipelineInput.userSettings,
          customPromptRequirements: pipelineInput.customPromptRequirements,
          additionalContext: {
            projectInfo: pipelineInput.projectBible
          }
        })
      },

      // Шаг 2: Генерация промпта для изображения
      {
        id: 'generate_image_prompt',
        operation: promptGenerationOperation,
        dependencies: ['analyze_entity_context'],
        qualityLevel: QualityLevel.STANDARD, // Качественный промпт критически важен для хорошего изображения
        condition: (results: Map<string, OperationOutput>) => {
          const contextAnalysis = results.get('analyze_entity_context');
          return contextAnalysis && !contextAnalysis.error && contextAnalysis.enrichedContext;
        },
        mapInput: (results, pipelineInput: EntityImageGenerationPipelineInputV2) => {
          const contextAnalysis = results.get('analyze_entity_context');
          return {
            projectId: pipelineInput.projectId,
            userDescription: `Создание промпта для изображения сущности "${pipelineInput.entityData.name}"`,
            enrichedContext: contextAnalysis?.enrichedContext,
            imageProvider: pipelineInput.imageProvider,
            imageQuality: pipelineInput.imageQuality,
            aspectRatio: pipelineInput.aspectRatio,
            stylePreference: pipelineInput.stylePreference,
            additionalRequirements: pipelineInput.customPromptRequirements,
            additionalContext: {
              projectInfo: pipelineInput.projectBible
            }
          };
        }
      },

      // Шаг 3: Генерация изображения
      {
        id: 'generate_entity_image',
        operation: imageGenerationOperation,
        dependencies: ['generate_image_prompt'],
        qualityLevel: QualityLevel.FAST, // Не AI операция, качество не влияет на скорость
        condition: (results: Map<string, OperationOutput>) => {
          const promptGeneration = results.get('generate_image_prompt');
          return promptGeneration && !promptGeneration.error && promptGeneration.imagePrompt?.mainPrompt;
        },
        mapInput: (results, pipelineInput: EntityImageGenerationPipelineInputV2) => {
          const promptGeneration = results.get('generate_image_prompt');
          return {
            imagePrompt: promptGeneration?.imagePrompt,
            imageProvider: pipelineInput.imageProvider,
            imageQuality: pipelineInput.imageQuality,
            processImage: pipelineInput.processImage !== false, // По умолчанию обрабатываем
            saveToDatabase: false // В пайплайне не сохраняем в БД автоматически
          };
        }
      }
    ];

    // Инициализируем пайплайн
    super(
      'entity-image-generation-pipeline-v2',
      'Entity Image Generation Pipeline V2',
      'Пайплайн генерации изображений сущностей с использованием архитектуры v2',
      '2.0.0',
      steps
    );
  }

  /**
   * Подготовка входных данных для пайплайна
   */
  public prepareInput(
    entityData: any,
    projectBible: any,
    userSettings?: any,
    customPromptRequirements?: string[],
    imageProvider?: string,
    imageQuality?: string,
    aspectRatio?: string,
    stylePreference?: string,
    processImage?: boolean
  ): EntityImageGenerationPipelineInputV2 {
    return {
      projectId: entityData.projectId || 'unknown',
      entityData: {
        name: entityData.name,
        description: entityData.description,
        entityType: entityData.entityType,
        values: entityData.values || {}
      },
      projectBible: projectBible || {},
      userSettings: userSettings || {},
      customPromptRequirements: customPromptRequirements || [],
      imageProvider: (imageProvider as 'gemini' | 'openai') || 'gemini',
      imageQuality: (imageQuality as 'low' | 'medium' | 'high') || 'medium',
      aspectRatio: aspectRatio || '1:1',
      stylePreference: stylePreference,
      processImage: processImage !== false
    };
  }

  /**
   * Обработка результатов пайплайна для внешнего использования
   * Этот метод можно вызвать извне для получения структурированного результата
   */
  public async processResultsPublic(pipelineResults: any): Promise<{
    finalImage: any;
    stepResults: any;
  }> {
    if (!pipelineResults.success || !pipelineResults.steps) {
      throw new Error('Pipeline results are not successful or missing steps');
    }

    const contextAnalysisStep = pipelineResults.steps.get('analyze_entity_context');
    const promptGenerationStep = pipelineResults.steps.get('generate_image_prompt');
    const imageGenerationStep = pipelineResults.steps.get('generate_entity_image');



    // Формируем финальное изображение - проверяем success в generationMetrics
    const finalImage = (imageGenerationStep?.generationMetrics?.success && imageGenerationStep?.imageData?.imageBase64) ? {
      imageBase64: imageGenerationStep.imageData.imageBase64,
      imageUrl: imageGenerationStep.imageData.imageUrl,
      processedImage: imageGenerationStep.imageData.processedImage,
      prompt: imageGenerationStep.imageData.originalPrompt,
      revisedPrompt: imageGenerationStep.imageData.revisedPrompt,
      metadata: imageGenerationStep.imageData.metadata
    } : null;

    // Формируем результаты шагов
    const stepResults = {
      contextAnalysis: contextAnalysisStep?.success ? {
        enrichedContext: contextAnalysisStep.enrichedContext,
        confidence: contextAnalysisStep.confidence,
        reasoning: contextAnalysisStep.reasoning
      } : null,
      promptGeneration: promptGenerationStep?.success ? {
        imagePrompt: promptGenerationStep.imagePrompt,
        promptMetadata: promptGenerationStep.promptMetadata,
        confidence: promptGenerationStep.confidence,
        reasoning: promptGenerationStep.reasoning
      } : null,
      imageGeneration: imageGenerationStep?.generationMetrics?.success ? {
        imageData: imageGenerationStep.imageData,
        generationMetrics: imageGenerationStep.generationMetrics
      } : null
    };

    return {
      finalImage,
      stepResults
    };
  }



  /**
   * Переопределяем названия шагов для более понятного отображения
   */
  protected getStepDisplayName(step: any): string {
    const stepNames: Record<string, string> = {
      'analyze_entity_context': 'Analyze entity and project bible',
      'generate_image_prompt': 'Generate prompt',
      'generate_entity_image': 'Generate image'
    };
    
    return stepNames[step.id] || step.operation.name;
  }

  /**
   * Переопределяем описания шагов для более понятного отображения
   */
  protected getStepDescription(step: any): string {
    const stepDescriptions: Record<string, string> = {
      'analyze_entity_context': 'Analyze entity data and project bible for image generation',
      'generate_image_prompt': 'Generate optimized prompt for image generation',
      'generate_entity_image': 'Generate entity image using AI'
    };
    
    return stepDescriptions[step.id] || 'Operation execution';
  }
}

// Создаем экземпляр пайплайна для экспорта
export const EntityImageGenerationPipelineV2Instance = new EntityImageGenerationPipelineV2();

/**
 * Функция для выполнения пайплайна генерации изображений с отслеживанием прогресса
 */
export async function executeEntityImageGenerationWithProgress(
  input: EntityImageGenerationPipelineInputV2,
  context: ExecutionContext,
  wsManager?: IWebSocketManager,
) {
  console.log(`🖼️ Starting Entity Image Generation Pipeline (v2) for entity "${input.entityData.name}"...`);

  const engine = new StreamingPipelineEngine();
  const pipeline = EntityImageGenerationPipelineV2Instance;

  // Отправляем событие о начале пайплайна
  if (wsManager) {
    wsManager.emitToProject(context.projectId, {
      type: CollaborationEventType.AI_PIPELINE_STARTED,
      payload: {
        requestId: context.requestId,
        status: 'started',
        currentStep: 'pipeline_started',
        stepName: 'Инициализация',
        stepDescription: `Начинаем генерацию изображения для сущности "${input.entityData.name}"`,
        progress: 0,
        startTime: context.startTime,
        stepStates: {
          'analyze_entity_context': 'pending',
          'generate_image_prompt': 'pending', 
          'generate_entity_image': 'pending'
        },
        metadata: {
          pipelineType: 'entity_image_generation',
          entityName: input.entityData.name,
          totalSteps: 3
        }
      },
      userId: context.userId,
      projectId: context.projectId,
      timestamp: Date.now()
    });
    console.log('✅ Sent AI_PIPELINE_STARTED event');
  }

  try {
    // Настройка callback для отслеживания прогресса
    const onPipelineUpdate = (update: PipelineStateUpdate) => {
      if (!wsManager) return;

      const { progress, stepStates, results, lastChangedStep } = update;
      
      if (lastChangedStep) {
        const stepDisplayNames = {
          'analyze_entity_context': 'Analyze entity and project bible',
          'generate_image_prompt': 'Generate prompt',
          'generate_entity_image': 'Generate image'
        };

        const stepDescriptions = {
          'analyze_entity_context': 'Analyze entity data and project bible for image generation',
          'generate_image_prompt': 'Generate optimized prompt for image generation',
          'generate_entity_image': 'Generate entity image using AI'
        };

        const stepName = stepDisplayNames[lastChangedStep.id as keyof typeof stepDisplayNames] || lastChangedStep.id;
        const stepDescription = stepDescriptions[lastChangedStep.id as keyof typeof stepDescriptions] || 'Выполнение операции';

        // Отправляем событие прогресса
        wsManager.emitToProject(context.projectId, {
          type: CollaborationEventType.AI_PIPELINE_PROGRESS,
          payload: {
            requestId: context.requestId,
            status: 'in_progress',
            currentStep: lastChangedStep.id,
            stepName,
            stepDescription,
            progress,
            startTime: context.startTime,
            stepStates: Object.fromEntries(stepStates),
            metadata: {
              pipelineType: 'entity_image_generation',
              entityName: input.entityData.name,
              lastChangedStep: {
                id: lastChangedStep.id,
                status: lastChangedStep.status
              }
            }
          },
          userId: context.userId,
          projectId: context.projectId,
          timestamp: Date.now()
        });

        // Отправляем событие о завершении шага
        if (lastChangedStep.status === 'completed') {
          const stepResult = results.get(lastChangedStep.id);
          
          wsManager.emitToProject(context.projectId, {
            type: CollaborationEventType.AI_PIPELINE_STEP_COMPLETED,
            payload: {
              requestId: context.requestId,
              status: 'step_completed',
              currentStep: lastChangedStep.id,
              stepName,
              stepDescription: `${stepName} завершен успешно`,
              progress,
              startTime: context.startTime,
              stepStates: Object.fromEntries(stepStates),
              stepResult: stepResult ? {
                confidence: stepResult.confidence,
                reasoning: stepResult.reasoning,
                metadata: stepResult.metadata
              } : null,
              metadata: {
                pipelineType: 'entity_image_generation',
                entityName: input.entityData.name,
                completedStep: {
                  id: lastChangedStep.id,
                  status: lastChangedStep.status
                }
              }
            },
            userId: context.userId,
            projectId: context.projectId,
            timestamp: Date.now()
          });

          console.log(`✅ Sent AI_PIPELINE_STEP_COMPLETED event for step: ${lastChangedStep.id}`);
        }

        console.log(`📊 Pipeline progress: ${progress}% - ${stepName} (${lastChangedStep.status})`);
      }
    };

    const results = await engine.execute(pipeline, input, context, onPipelineUpdate);

    console.log('\n🏁 Entity Image Generation Pipeline finished.');
    
    // Обрабатываем результаты
    const processedResults = await pipeline.processResultsPublic({
      success: true,
      steps: results
    });

    // Отправляем финальное обновление
    if (wsManager) {
      const finalStepStates = Object.fromEntries(
        Array.from(results.keys()).map(id => [id, 'completed'])
      );

      const imageGenerationStep = results.get('generate_entity_image');
      const hasImage = imageGenerationStep && imageGenerationStep.generationMetrics?.success && imageGenerationStep.imageData?.imageBase64;
      const imageSize = imageGenerationStep?.imageData?.metadata?.fileSize || 0;
      
      const contextAnalysisStep = results.get('analyze_entity_context');
      const contextConfidence = contextAnalysisStep?.confidence || 0;
      
      const promptGenerationStep = results.get('generate_image_prompt');
      const promptConfidence = promptGenerationStep?.confidence || 0;

      wsManager.emitToProject(context.projectId, {
        type: CollaborationEventType.AI_PIPELINE_COMPLETED,
        payload: {
          requestId: context.requestId,
          status: 'completed',
          currentStep: 'pipeline_completed',
          stepName: 'Генерация завершена',
          stepDescription: `Изображение для сущности "${input.entityData.name}" успешно создано!`,
          progress: 100,
          startTime: context.startTime,
          endTime: new Date(),
          stepStates: finalStepStates,
          results: processedResults,
          metadata: {
            pipelineType: 'entity_image_generation',
            entityName: input.entityData.name,
            executionTime: Date.now() - context.startTime.getTime(),
            hasImage: !!hasImage,
            imageSize: imageSize,
            contextConfidence: contextConfidence,
            promptConfidence: promptConfidence
          }
        },
        userId: context.userId,
        projectId: context.projectId,
        timestamp: Date.now()
      });
      console.log('✅ Sent final AI_PIPELINE_COMPLETED event for image generation.');
    }

    return processedResults;

  } catch (error) {
    console.error('❌ Entity Image Generation Pipeline failed:', error);
    
    // Отправляем сообщение об ошибке
    if (wsManager) {
      wsManager.emitToProject(context.projectId, {
        type: CollaborationEventType.AI_PIPELINE_ERROR,
        payload: {
          requestId: context.requestId,
          status: 'error',
          currentStep: 'pipeline_error',
          stepName: 'Ошибка выполнения',
          stepDescription: (error as Error).message || 'Ошибка генерации изображения',
          progress: 0,
          startTime: context.startTime,
          endTime: new Date(),
          stepStates: {
            'analyze_entity_context': 'failed',
            'generate_image_prompt': 'failed',
            'generate_entity_image': 'failed'
          },
          metadata: {
            pipelineType: 'entity_image_generation',
            entityName: input.entityData.name,
            error: (error as Error).message,
            errorStack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
          }
        },
        userId: context.userId,
        projectId: context.projectId,
        timestamp: Date.now()
      });
      console.log('✅ Sent AI_PIPELINE_ERROR event');
    }

    throw error;
  }
}
