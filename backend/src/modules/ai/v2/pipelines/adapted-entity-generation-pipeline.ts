/**
 * Адаптированный пайплайн генерации сущностей для работы с StreamingPipelineEngine
 * Использует новые операции v2 с централизованными провайдерами
 */

import { AIPipeline } from '../core/AIPipeline';
import { PipelineStep } from '../shared/pipeline-types';
import { ExecutionContext, QualityLevel } from '../shared/types';
import { StreamingPipelineEngine, OnPipelineUpdateCallback, PipelineStateUpdate } from '../core/PipelineEngine';
import { IWebSocketManager } from '../../../websocket/interfaces/websocket.interfaces';
import { CollaborationEventType } from '../../../../types/websocket.types';

// Импортируем новые операции v2
import { ProjectContextAnalysisOperationV2 } from '../operations/entities/v2/ProjectContextAnalysisOperationV2';
import { EntityTypeDetectionOperationV2 } from '../operations/entities/v2/EntityTypeDetectionOperationV2';
import { EntityFieldGenerationOperationV2 } from '../operations/entities/v2/EntityFieldGenerationOperationV2';
import { EntityCreationOperationV2 } from '../operations/entities/v2/EntityCreationOperationV2';
import { LanguageDetectionOperation } from '../operations/bible/LanguageDetectionOperation';

/**
 * Входные данные для адаптированного пайплайна
 */
export interface AdaptedEntityGenerationInput {
  projectId: string;
  userDescription: string;
  preferredEntityType?: string;
  customInstructions?: string;
  includeProjectInfo?: boolean;
  includeExistingEntities?: boolean;
  userSettings?: {
    preferredProvider?: string;
    preferredModel?: string;
    creativityLevel?: number;
  };
  executionOptions?: {
    skipTypeDetection?: boolean;
    skipFieldGeneration?: boolean;
    createInDatabase?: boolean;
  };
}

/**
 * Адаптированный пайплайн генерации сущностей
 * Использует StreamingPipelineEngine и новые операции v2 с централизованными провайдерами
 */
export class AdaptedEntityGenerationPipeline extends AIPipeline {
  
  constructor() {
    // Создаем экземпляры новых операций v2
    const contextAnalysisOperation = new ProjectContextAnalysisOperationV2();
    const languageDetectionOperation = new LanguageDetectionOperation();
    const typeDetectionOperation = new EntityTypeDetectionOperationV2();
    const fieldGenerationOperation = new EntityFieldGenerationOperationV2();
    const entityCreationOperation = new EntityCreationOperationV2();
    
    // Определяем шаги пайплайна
    const steps: PipelineStep[] = [
      // Шаг 0: Анализ контекста проекта
      {
        id: 'analyze_project_context',
        operation: contextAnalysisOperation,
        dependencies: [],
        qualityLevel: QualityLevel.FAST, // Не требует AI
        mapInput: (_results, pipelineInput) => ({
          projectId: pipelineInput.projectId,
          userDescription: pipelineInput.userDescription, // Требуется для новой архитектуры
          includeProjectInfo: pipelineInput.includeProjectInfo ?? true,
          includeExistingEntities: pipelineInput.includeExistingEntities ?? true,
          additionalContext: {
            includeProjectInfo: pipelineInput.includeProjectInfo ?? true,
            includeExistingEntities: pipelineInput.includeExistingEntities ?? true
          }
        })
      },

      // Шаг 1: Определение языка
      {
        id: 'detect_language',
        operation: languageDetectionOperation,
        dependencies: ['analyze_project_context'],
        qualityLevel: QualityLevel.FAST,
        mapInput: (_results, pipelineInput) => ({
          projectContext: null,
          baseDescription: pipelineInput.userDescription
        })
      },
      
      // Шаг 2: Определение типа сущности (улучшенная версия)
      {
        id: 'detect_entity_type',
        operation: typeDetectionOperation,
        dependencies: ['analyze_project_context'],
        qualityLevel: QualityLevel.FAST,
        condition: (results) => {
          const contextAnalysis = results.get('analyze_project_context');
          const data = contextAnalysis?.result || contextAnalysis;
          return !!(data && data.availableEntityTypes?.length > 0);
        },
        mapInput: (results, pipelineInput) => {
          const contextAnalysis = results.get('analyze_project_context');
          const data = contextAnalysis?.result || contextAnalysis;
          return {
            projectId: pipelineInput.projectId,
            userDescription: pipelineInput.userDescription,
            availableEntityTypes: data?.availableEntityTypes || [],
            preferredEntityType: pipelineInput.preferredEntityType,
            additionalContext: {
              projectInfo: data?.projectInfo || {},
              existingEntities: data?.existingEntities || [],
              entityRelationships: data?.entityRelationships || []
            }
          };
        }
      },
      
      // Шаг 3: Генерация полей сущности (улучшенная версия)
      {
        id: 'generate_entity_fields',
        operation: fieldGenerationOperation,
        dependencies: ['analyze_project_context', 'detect_entity_type', 'detect_language'],
        qualityLevel: QualityLevel.FAST, 
        condition: (results) => {
          const typeDetection = results.get('detect_entity_type');
          return !!(typeDetection && 
                   typeDetection.selectedEntityType);
        },
        customPrompt: (results, _pipelineInput) => {
          const detectedLanguage = results.get('detect_language')?.detectedLanguage || 'English';
          return `Answer ONLY in ${detectedLanguage} language`;
        },
        mapInput: (results, pipelineInput) => {
          const contextAnalysis = results.get('analyze_project_context');
          const typeDetection = results.get('detect_entity_type');
          const contextData = contextAnalysis?.result || contextAnalysis;
          
          return {
            projectId: pipelineInput.projectId,
            userDescription: pipelineInput.userDescription,
            selectedEntityType: typeDetection?.selectedEntityType,
            availableEntityTypes: contextData?.availableEntityTypes || [],
            existingEntities: contextData?.existingEntities || [],
            entityRelationships: contextData?.entityRelationships || [],
            additionalContext: {
              projectInfo: contextData?.projectInfo || {},
              existingEntities: contextData?.existingEntities || [],
              entityRelationships: contextData?.entityRelationships || [],
              customInstructions: pipelineInput.customInstructions
            }
          };
        }
      },
      
      // Шаг 4: Создание сущности в базе данных
      {
        id: 'create_entity',
        operation: entityCreationOperation,
        dependencies: ['analyze_project_context', 'detect_entity_type', 'generate_entity_fields'],
        qualityLevel: QualityLevel.FAST, // Операция с БД, не требует AI
        condition: (results) => {
          const fieldGeneration = results.get('generate_entity_fields');
          // Проверяем, что генерация прошла успешно и есть имя сущности
          return !!(fieldGeneration && 
                   fieldGeneration.entityName);
        },
        mapInput: (results, pipelineInput) => {
          const typeDetection = results.get('detect_entity_type');
          const fieldGeneration = results.get('generate_entity_fields');
          
          return {
            projectId: pipelineInput.projectId,
            entityName: fieldGeneration?.entityName,
            entityDescription: fieldGeneration?.entityDescription,
            selectedEntityType: typeDetection?.selectedEntityType,
            generatedFields: fieldGeneration?.generatedFields || {},
            suggestedRelationships: fieldGeneration?.suggestedRelationships || []
          };
        }
      }
    ];
    
    // Вызываем конструктор родителя
    super(
      'adapted_entity_generation',
      'Adapted Entity Generation Pipeline',
      'Адаптированный пайплайн генерации сущностей с использованием проверенных операций',
      '0.3.0',
      steps
    );
  }
  
  /**
   * Переопределяем названия уровней для этого пайплайна
   */
  protected getLevelName(level: number): string {
    const levelNames = [
      'Load data',
      'Analyze context',
      'Detect type',
      'Generate content',
      'Save results'
    ];
    
    return levelNames[level] || `Level ${level + 1}`;
  }
  
  /**
   * Переопределяем названия шагов
   */
  protected getStepDisplayName(step: PipelineStep): string {
    const nameMap: Record<string, string> = {
      analyze_project_context: 'Analyze project context',
      detect_entity_type: 'Detect entity type',
      generate_entity_fields: 'Generate entity fields',
      create_entity: 'Create entity in database'
    };
    
    return nameMap[step.id] || step.id;
  }
  
  /**
   * Переопределяем описания шагов
   */
  protected getStepDescription(step: PipelineStep): string {
    const descriptionMap: Record<string, string> = {
      analyze_project_context: 'Loads information about the project, entity types, and existing entities',
      detect_entity_type: 'Uses AI to determine the most suitable entity type',
      generate_entity_fields: 'Generates all entity fields using AI based on the description',
      create_entity: 'Saves the generated entity to the database'
    };
    
    return descriptionMap[step.id] || `Execution of operation ${step.id}`;
  }
}

/**
 * Фабрика для создания экземпляра адаптированного пайплайна
 */
export function createAdaptedEntityGenerationPipeline(): AdaptedEntityGenerationPipeline {
  return new AdaptedEntityGenerationPipeline();
}

/**
 * Синглтон экземпляр пайплайна
 */
export const AdaptedEntityGenerationPipelineInstance = new AdaptedEntityGenerationPipeline();

/**
 * Выполнение адаптированного пайплайна с прогрессом через WebSocket
 */
export async function executeAdaptedEntityGenerationWithProgress(
  input: AdaptedEntityGenerationInput,
  context: ExecutionContext,
  wsManager?: IWebSocketManager,
) {
  console.log(`🚀 Starting Adapted Entity Generation Pipeline for project "${input.projectId}"...`);
  
  const engine = new StreamingPipelineEngine();
  
  // Callback для отправки обновлений через WebSocket
  const onPipelineUpdate: OnPipelineUpdateCallback = (update: PipelineStateUpdate) => {
    if (!wsManager) return;
    
    const stepStates = Object.fromEntries(update.stepStates);
    
    const lastChangedStep = update.lastChangedStep 
      ? {
          id: update.lastChangedStep.id,
          status: update.lastChangedStep.status,
          name: AdaptedEntityGenerationPipelineInstance.steps.find(s => s.id === update.lastChangedStep!.id)?.operation.name || 'Unknown Step'
        }
      : undefined;
    
    // Отправляем обновление прогресса
    wsManager.emitToProject(context.projectId, {
      type: CollaborationEventType.AI_PIPELINE_PROGRESS,
      payload: {
        requestId: context.requestId,
        progress: update.progress,
        stepStates: stepStates,
        lastChangedStep,
        pipelineType: 'entity_generation', // Используем правильный тип для UI
      },
      userId: context.userId,
      projectId: context.projectId,
      timestamp: Date.now(),
    });
  };
  
  try {
    // Выполняем пайплайн
    const results = await engine.execute(
      AdaptedEntityGenerationPipelineInstance, 
      input, 
      context, 
      onPipelineUpdate
    );
    
    // Обрабатываем финальные результаты
    const finalEntity: Record<string, any> = {};
    let createdEntity = null;
    
    for (const [key, value] of results.entries()) {
      if (value && !value.error) {
        finalEntity[key] = value;
        
        // Извлекаем созданную сущность
        if (key === 'create_entity' && value.createdEntity) {
          createdEntity = value.createdEntity;
        }
      }
    }
    
    // Отправляем финальное обновление
    if (wsManager) {
      const finalStepStates = Object.fromEntries(
        Array.from(results.keys()).map(id => [id, 'completed'])
      );
      
      wsManager.emitToProject(context.projectId, {
        type: CollaborationEventType.AI_PIPELINE_COMPLETED,
        payload: {
          requestId: context.requestId,
          progress: 100,
          stepStates: finalStepStates,
          results: {
            ...finalEntity,
            entity: createdEntity
          },
          pipelineType: 'entity_generation',
        },
        userId: context.userId,
        projectId: context.projectId,
        timestamp: Date.now()
      });
    }
    
    return {
      success: true,
      results: finalEntity,
      entity: createdEntity
    };
    
  } catch (error) {
    console.error('❌ Adapted Entity Generation Pipeline failed:', error);
    
    // Отправляем уведомление об ошибке
    if (wsManager) {
      wsManager.emitToProject(context.projectId, {
        type: CollaborationEventType.AI_PIPELINE_ERROR,
        payload: {
          requestId: context.requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          pipelineType: 'entity_generation',
        },
        userId: context.userId,
        projectId: context.projectId,
        timestamp: Date.now()
      });
    }
    
    throw error;
  }
}

/**
 * Вспомогательная функция для быстрого создания сущности
 */
export async function quickCreateEntity(
  projectId: string,
  userDescription: string,
  context: ExecutionContext,
  options?: {
    preferredEntityType?: string;
    customInstructions?: string;
    wsManager?: IWebSocketManager;
  }
) {
  const input: AdaptedEntityGenerationInput = {
    projectId,
    userDescription,
    preferredEntityType: options?.preferredEntityType,
    customInstructions: options?.customInstructions,
    includeProjectInfo: true,
    includeExistingEntities: true,
    executionOptions: {
      createInDatabase: true
    }
  };
  
  return executeAdaptedEntityGenerationWithProgress(
    input,
    context,
    options?.wsManager
  );
}
