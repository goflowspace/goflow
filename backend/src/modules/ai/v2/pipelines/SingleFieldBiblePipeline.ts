// backend/src/modules/ai/v2/pipelines/SingleFieldBiblePipeline.ts
import { IWebSocketManager } from '../../../websocket/interfaces/websocket.interfaces';
import { AIPipeline } from '../core/AIPipeline';
import { StreamingPipelineEngine, OnPipelineUpdateCallback, PipelineStateUpdate } from '../core/PipelineEngine';
import { ExecutionContext, QualityLevel } from '../shared/types';
import { LanguageDetectionOperation, LanguageDetectionInput } from '../operations/bible/LanguageDetectionOperation';
// Импортируем все специализированные операции
import { SynopsisGenerationOperation } from '../operations/bible/SynopsisGenerationOperation';
import { LoglineGenerationOperation } from '../operations/bible/LoglineGenerationOperation';
import { GenreGenerationOperation } from '../operations/bible/GenreGenerationOperation';
import { SettingGenerationOperation } from '../operations/bible/SettingGenerationOperation';
import { AtmosphereGenerationOperation } from '../operations/bible/AtmosphereGenerationOperation';
import { TargetAudienceGenerationOperation } from '../operations/bible/TargetAudienceGenerationOperation';
import { ThemeGenerationOperation } from '../operations/bible/ThemeGenerationOperation';
import { MessageGenerationOperation } from '../operations/bible/MessageGenerationOperation';
import { UniqueFeaturesGenerationOperation } from '../operations/bible/UniqueFeaturesGenerationOperation';
import { ReferencesGenerationOperation } from '../operations/bible/ReferencesGenerationOperation';
import { VisualStyleGenerationOperation } from '../operations/bible/VisualStyleGenerationOperation';
import { AbstractAIOperation } from '../core/AbstractAIOperation';
import { BibleGenerationInput } from '../core/AbstractBibleGenerationOperation';
import { PipelineStep } from '../shared/pipeline-types';
import { CollaborationEventType } from '../../../../types/websocket.types';
import { ConstraintsGenerationOperation } from '../operations/bible/ConstraintsGenerationOperation';

// Интерфейс для входных данных пайплайна
export interface SingleFieldBibleInput extends BibleGenerationInput {
  fieldType: string; // Тип поля для генерации
}

// Расширенный интерфейс для передачи в специализированные операции
export interface ExtendedBibleGenerationInput extends BibleGenerationInput {
  additionalContext?: {
    existingFields?: Record<string, any>;
    preferredLanguage?: string;
    [key: string]: any;
  };
}

// Фабрика для создания операций по типу поля
export function createFieldOperation(fieldType: string): AbstractAIOperation<any, any> {
  switch (fieldType) {
    case 'synopsis':
      return new SynopsisGenerationOperation();
    case 'logline':
      return new LoglineGenerationOperation();
    case 'genres':
      return new GenreGenerationOperation();
    case 'setting':
      return new SettingGenerationOperation();
    case 'atmosphere':
      return new AtmosphereGenerationOperation();
    case 'targetAudience':
      return new TargetAudienceGenerationOperation();
    case 'mainThemes':
      return new ThemeGenerationOperation();
    case 'message':
      return new MessageGenerationOperation();
    case 'uniqueFeatures':
      return new UniqueFeaturesGenerationOperation();
    case 'references':
      return new ReferencesGenerationOperation();
    case 'visualStyle':
      return new VisualStyleGenerationOperation();
    case 'constraints':
      return new ConstraintsGenerationOperation();
    default:
      throw new Error(`Unsupported field type: ${fieldType}. Supported types: synopsis, logline, genres, setting, atmosphere, targetAudience, mainThemes, message, uniqueFeatures, references, visualStyle`);
  }
}

// Функция для создания пайплайна для конкретного типа поля
export function createSingleFieldBiblePipeline(fieldType: string): AIPipeline {
  const fieldOperation = createFieldOperation(fieldType);
  
  const steps: PipelineStep[] = [
    {
      id: 'language_detection',
      operation: new LanguageDetectionOperation(),
      dependencies: [],
      qualityLevel: QualityLevel.FAST, // Быстрое определение языка
      mapInput: (_results, pipelineInput: SingleFieldBibleInput): LanguageDetectionInput => {
        return {
          projectContext: pipelineInput.projectContext,
          baseDescription: (pipelineInput.additionalContext as any)?.baseDescription,
          userSettings: pipelineInput.userSettings,
          userTier: pipelineInput.userTier,
          provider: pipelineInput.provider
        };
      },
    },
    {
      id: 'field_generation',
      operation: fieldOperation,
      dependencies: ['language_detection'],
      qualityLevel: QualityLevel.STANDARD, // Будет переопределено в контексте
      // Кастомный промпт на основе определенного языка
      customPrompt: (results, _pipelineInput) => {
        const languageResult = results.get('language_detection');
        const detectedLanguage = languageResult?.detectedLanguage || 'English';
        
        // Формируем простую инструкцию отвечать на определенном языке
        return `IMPORTANT: Answer only in ${detectedLanguage}.`;
      },
      mapInput: (results, pipelineInput: SingleFieldBibleInput) => {
        // Получаем результат определения языка из предыдущего шага
        const languageResult = results.get('language_detection');
        const detectedLanguage = languageResult?.detectedLanguage || 'English';
        
        // Создаем входные данные для специализированной операции
        const fieldInput: ExtendedBibleGenerationInput = {
          projectName: pipelineInput.projectName,
          projectContext: pipelineInput.projectContext,
          additionalContext: {
            ...(pipelineInput.additionalContext || {}),
            preferredLanguage: detectedLanguage // Передаем определенный язык
          },
          userSettings: pipelineInput.userSettings,
          userTier: pipelineInput.userTier,
          provider: pipelineInput.provider
        };
        
        return fieldInput;
      },
    }
  ];

  return new AIPipeline(
    `single-field-bible-v2-${fieldType}`,
    `Single Field Bible Generation Pipeline (v2) - ${fieldType}`,
    `Generates ${fieldType} field for a project bible using specialized operation with language detection.`,
    '2.0.0',
    steps,
  );
}

// Создаем дефолтный пайплайн для совместимости (будет заменен динамическим)
export const SingleFieldBiblePipeline = createSingleFieldBiblePipeline('synopsis');

/**
 * Выполняет генерацию одного поля библии с прогрессом.
 */
export async function executeSingleFieldGenerationWithProgress(
  input: ExtendedBibleGenerationInput,
  context: ExecutionContext,
  wsManager?: IWebSocketManager,
) {
  console.log(`🚀 Starting Single Field Generation Pipeline (v2) for field "${input.fieldType}" in project "${input.projectName}"...`);

  // Создаем специализированный пайплайн для данного типа поля
  const pipeline = createSingleFieldBiblePipeline(input.fieldType);
  const engine = new StreamingPipelineEngine();

  const onPipelineUpdate: OnPipelineUpdateCallback = (update: PipelineStateUpdate) => {
    if (!wsManager) return;
    
    const stepStates = Object.fromEntries(update.stepStates);
    
    const lastChangedStep = update.lastChangedStep 
      ? {
          id: update.lastChangedStep.id,
          status: update.lastChangedStep.status,
          name: pipeline.steps.find(s => s.id === update.lastChangedStep!.id)?.operation.name || 'Unknown Step'
        }
      : undefined;

    wsManager.emitToProject(context.projectId, {
      type: CollaborationEventType.AI_PIPELINE_PROGRESS,
      payload: {
        requestId: context.requestId,
        progress: update.progress,
        stepStates: stepStates,
        lastChangedStep,
        fieldType: input.fieldType,
      },
      userId: context.userId,
      projectId: context.projectId,
      timestamp: Date.now(),
    });
    
    if(lastChangedStep) {
        console.log(`[${update.progress}%] Single Field Pipeline update: Step '${lastChangedStep.id}' is now '${lastChangedStep.status}'`);
    }
  };

  const results = await engine.execute(pipeline, input, context, onPipelineUpdate);

  console.log('\n🏁 Single Field Generation Pipeline finished.');
  
  // Обрабатываем результат
  const stepResult = results.get('field_generation');
  
  if (!stepResult || stepResult.error) {
    throw new Error(`Single field generation failed: ${stepResult?.error || 'Unknown error'}`);
  }

  // Извлекаем контент поля - каждая операция возвращает свой ключ (logline, synopsis, genres и т.д.)
  // Ищем первый ключ, который не является 'metadata'
  const contentKey = Object.keys(stepResult).find(key => key !== 'metadata');
  const fieldContent = contentKey ? stepResult[contentKey] : null;
  
  if (!fieldContent) {
    console.error('❌ Field content not found in stepResult:', stepResult);
    throw new Error(`Generated content for field '${input.fieldType}' is empty or missing`);
  }

  const finalResult = {
    fieldType: input.fieldType,
    fieldContent: fieldContent,
    metadata: stepResult.metadata || {}
  };

  // Отправляем финальное уведомление
  if (wsManager) {
      wsManager.emitToProject(context.projectId, {
          type: CollaborationEventType.AI_PIPELINE_COMPLETED,
          payload: {
              requestId: context.requestId,
              progress: 100,
              stepStates: { field_generation: 'completed' },
              results: finalResult,
              fieldType: input.fieldType,
          },
          userId: context.userId,
          projectId: context.projectId,
          timestamp: Date.now()
      });
      console.log('✅ Sent final AI_PIPELINE_COMPLETED event for single field generation.');
  }

  return finalResult;
}

/**
 * Быстрая генерация одного поля без WebSocket уведомлений.
 */
export async function generateSingleFieldQuick(
  fieldType: string,
  projectName: string,
  projectContext: string,
  qualityLevel: QualityLevel = QualityLevel.STANDARD,
  additionalContext?: {
    existingFields?: Record<string, any>;
  }
): Promise<{
  fieldType: string;
  fieldContent: string | string[];
  metadata: any;
}> {
  const input: SingleFieldBibleInput = {
    fieldType,
    projectName,
    projectContext,
    additionalContext,
    userSettings: {},
    userTier: 'business',
    provider: 'gemini'
  };

  const context: ExecutionContext = {
    userId: 'system',
    projectId: 'temp',
    requestId: `single-field-${fieldType}-${Date.now()}`,
    startTime: new Date(),
    qualityLevel: qualityLevel
  };

  const result = await executeSingleFieldGenerationWithProgress(input, context);
  return result;
}

/**
 * Получение структуры пайплайна для API.
 */
export function getSingleFieldPipelineStructure(fieldType: string = 'synopsis') {
  const pipeline = createSingleFieldBiblePipeline(fieldType);
  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    version: pipeline.version,
    steps: [
      {
        id: 'language_detection',
        name: 'Language Detection',
        description: 'Detect preferred language for content generation',
        dependencies: [],
        isOptional: false,
        estimatedDuration: 5000, // ~5 seconds
      },
      {
        id: 'field_generation',
        name: `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Generation`,
        description: `Generate content for the ${fieldType} field using specialized operation`,
        dependencies: ['language_detection'],
        isOptional: false,
        estimatedDuration: 15000, // ~15 seconds
        supportedFields: [
          'synopsis', 'logline', 'genres', 'setting', 'atmosphere',
          'targetAudience', 'mainThemes', 'message', 'uniqueFeatures',
          'references', 'visualStyle'
        ]
      }
    ],
    metadata: {
      type: 'single_field_generation_v2',
      category: 'bible_generation',
      complexity: 'medium',
      estimatedCredits: 6, // +1 за языковое определение
      supportedQualityLevels: ['fast', 'standard', 'expert'],
      fieldType: fieldType
    }
  };
}
