// backend/src/modules/ai/v2/pipelines/BibleGenerationPipeline.ts
import { IWebSocketManager } from '../../../websocket/interfaces/websocket.interfaces';
import { AIPipeline } from '../core/AIPipeline';
import { StreamingPipelineEngine, OnPipelineUpdateCallback, PipelineStateUpdate } from '../core/PipelineEngine';
import { ExecutionContext, QualityLevel } from '../shared/types';
import { BibleGenerationInput } from '../core/AbstractBibleGenerationOperation';
import { PipelineStep } from '../shared/pipeline-types';
import { CollaborationEventType } from '../../../../types/websocket.types';

// Importing all the new v2 operations
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
import { LanguageDetectionOperation } from '../operations/bible/LanguageDetectionOperation';

const languagePrompt = (results: Map<string, any>, _pipelineInput: any) => {
  const languageResult = results.get('language_detection');
  const detectedLanguage = languageResult?.detectedLanguage || 'English';
  return `IMPORTANT: Answer only in ${detectedLanguage}.`;
};

const steps: PipelineStep[] = [
  // Level 0: Language Detection
  {
    id: 'language_detection',
    operation: new LanguageDetectionOperation(),
    dependencies: [],
    qualityLevel: QualityLevel.FAST,
  },
  // Level 1: Core Content
  {
    id: 'synopsis',
    operation: new SynopsisGenerationOperation(),
    dependencies: ['language_detection'],
    qualityLevel: QualityLevel.STANDARD,
    customPrompt: languagePrompt
  },
  // Level 2: Based on Synopsis
  {
    id: 'logline',
    operation: new LoglineGenerationOperation(),
    dependencies: ['synopsis', 'language_detection'],
    qualityLevel: QualityLevel.FAST,
    customPrompt: languagePrompt
  },
  // Level 3: Based on Core Concept
  {
    id: 'genres',
    operation: new GenreGenerationOperation(),
    dependencies: ['synopsis', 'logline', 'language_detection'],
    qualityLevel: QualityLevel.FAST,
    customPrompt: languagePrompt
  },
  // Level 4: World & Audience
  {
    id: 'setting',
    operation: new SettingGenerationOperation(),
    dependencies: ['synopsis', 'genres', 'language_detection'],
    qualityLevel: QualityLevel.STANDARD,
    customPrompt: languagePrompt
  },
  {
    id: 'target_audience',
    operation: new TargetAudienceGenerationOperation(),
    dependencies: ['synopsis', 'genres', 'language_detection'],
    qualityLevel: QualityLevel.FAST,
    customPrompt: languagePrompt
  },
  // Level 5: Thematic Core
  {
    id: 'themes',
    operation: new ThemeGenerationOperation(),
    dependencies: ['synopsis', 'target_audience', 'language_detection'],
    qualityLevel: QualityLevel.STANDARD,
    customPrompt: languagePrompt
  },
  // Level 6: Parallel Details
  {
    id: 'atmosphere',
    operation: new AtmosphereGenerationOperation(),
    dependencies: ['setting', 'themes', 'language_detection'],
    qualityLevel: QualityLevel.STANDARD,
    customPrompt: languagePrompt
  },
  {
    id: 'message',
    operation: new MessageGenerationOperation(),
    dependencies: ['themes', 'language_detection'],
    qualityLevel: QualityLevel.STANDARD,
    customPrompt: languagePrompt
  },
  {
    id: 'unique_features',
    operation: new UniqueFeaturesGenerationOperation(),
    dependencies: ['synopsis', 'genres', 'themes', 'language_detection'],
    qualityLevel: QualityLevel.FAST,
    customPrompt: languagePrompt
  },
  {
    id: 'references',
    operation: new ReferencesGenerationOperation(),
    dependencies: ['genres', 'themes', 'language_detection'],
    qualityLevel: QualityLevel.STANDARD,
    customPrompt: languagePrompt
  },
  {
    id: 'visual_style',
    operation: new VisualStyleGenerationOperation(),
    dependencies: ['setting', 'atmosphere', 'language_detection'],
    qualityLevel: QualityLevel.FAST,
    customPrompt: languagePrompt
  }
];

// Attach mapInput to all steps to aggregate context
steps.forEach(step => {
  step.mapInput = (results, pipelineInput) => {
    const existingFields: Record<string, any> = {};
    for (const [stepId, value] of results.entries()) {
      if (value && !value.skipped && !value.error) {
        // The result of each operation is an object with a key (e.g., { logline: "..." })
        // We flatten this for the next operation's context.
        const contentKey = Object.keys(value).find(k => k !== 'metadata');
        if (contentKey) {
          existingFields[stepId] = value[contentKey];
        }
      }
    }
    
    return {
      ...pipelineInput,
      additionalContext: {
        ...(pipelineInput.additionalContext || {}),
        existingFields,
      },
    };
  };
});

export const BibleGenerationPipeline = new AIPipeline(
  'bible-generation-v2',
  'Full Bible Generation Pipeline (v2)',
  'Generates all fields for a project bible using specialized v2 operations.',
  '2.0.0',
  steps,
);

/**
 * Example of how to execute the pipeline with progress tracking.
 */
export async function executeBibleGenerationWithProgress(
  input: BibleGenerationInput,
  context: ExecutionContext,
  wsManager?: IWebSocketManager,
) {
  console.log(`🚀 Starting Bible Generation Pipeline (v2) for project "${input.projectName}"...`);

  const engine = new StreamingPipelineEngine();

  const onPipelineUpdate: OnPipelineUpdateCallback = (update: PipelineStateUpdate) => {
    if (!wsManager) return;
    
    const stepStates = Object.fromEntries(update.stepStates);
    
    const lastChangedStep = update.lastChangedStep 
      ? {
          id: update.lastChangedStep.id,
          status: update.lastChangedStep.status,
          name: BibleGenerationPipeline.steps.find(s => s.id === update.lastChangedStep!.id)?.operation.name || 'Unknown Step'
        }
      : undefined;

    wsManager.emitToProject(context.projectId, {
      type: CollaborationEventType.AI_PIPELINE_PROGRESS,
      payload: {
        requestId: context.requestId,
        progress: update.progress,
        stepStates: stepStates,
        lastChangedStep,
      },
      userId: context.userId,
      projectId: context.projectId,
      timestamp: Date.now(),
    });
    
    if(lastChangedStep) {
        console.log(`[${update.progress}%] Pipeline update: Step '${lastChangedStep.id}' is now '${lastChangedStep.status}'`);
    }
  };

  const results = await engine.execute(BibleGenerationPipeline, input, context, onPipelineUpdate);

  console.log('\n🏁 Bible Generation Pipeline finished.');
  
  // Process final results into a clean object and collect error information
  const finalBible: Record<string, any> = {};
  const errors: Record<string, string> = {};
  const skippedSteps: string[] = [];
  let successfulSteps = 0;
  let failedSteps = 0;

  for (const [stepId, value] of results.entries()) {
      if (value && value.skipped) {
          skippedSteps.push(stepId);
          // Логируем причину пропуска
          if (value.failedDependencies) {
              console.warn(`⏭️ Step ${stepId} skipped due to failed dependencies: ${value.failedDependencies.join(', ')}`);
          } else {
              console.warn(`⏭️ Step ${stepId} skipped: ${value.reason || 'Unknown reason'}`);
          }
      } else if (value && value.error) {
          errors[stepId] = value.message || 'Unknown error';
          failedSteps++;
      } else if (value && !value.error) {
          const contentKey = Object.keys(value).find(k => k !== 'metadata');
          if (contentKey) {
            finalBible[stepId] = value[contentKey];
            successfulSteps++;
          }
      }
  }

  console.log(`📊 Pipeline completion summary:`);
  console.log(`   ✅ Successful steps: ${successfulSteps}`);
  console.log(`   ❌ Failed steps: ${failedSteps}`);
  console.log(`   ⏭️ Skipped steps: ${skippedSteps.length}`);
  
  if (failedSteps > 0) {
      console.log(`   📋 Failed steps details:`, errors);
  }

  // Send final update with partial results information
  if (wsManager) {
      const finalStepStates = Object.fromEntries(
        Array.from(results.keys()).map(id => {
          const result = results.get(id);
          if (result?.skipped) return [id, 'skipped'];
          if (result?.error) return [id, 'failed'];
          return [id, 'completed'];
        })
      );

      wsManager.emitToProject(context.projectId, {
          type: CollaborationEventType.AI_PIPELINE_COMPLETED,
          payload: {
              requestId: context.requestId,
              progress: 100,
              stepStates: finalStepStates,
              results: finalBible,
              errors: failedSteps > 0 ? errors : undefined,
              summary: {
                  successfulSteps,
                  failedSteps,
                  skippedSteps: skippedSteps.length,
                  hasPartialFailure: failedSteps > 0
              }
          },
          userId: context.userId,
          projectId: context.projectId,
          timestamp: Date.now()
      });
      
      if (failedSteps > 0) {
          console.log(`⚠️ Sent AI_PIPELINE_COMPLETED event with partial failure (${successfulSteps}/${successfulSteps + failedSteps} successful).`);
      } else {
          console.log('✅ Sent final AI_PIPELINE_COMPLETED event.');
      }
  }

  // Возвращаем объект с подробной информацией о результатах
  return {
      success: failedSteps === 0,
      results: finalBible,
      errors: failedSteps > 0 ? errors : undefined,
      summary: {
          successfulSteps,
          failedSteps,
          skippedSteps: skippedSteps.length,
          hasPartialFailure: failedSteps > 0,
          totalSteps: successfulSteps + failedSteps + skippedSteps.length
      }
  };
}

