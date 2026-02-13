// backend/src/modules/ai/v2/pipelines/NarrativeTextGenerationPipelineV2.ts
import { AIPipeline } from '../core/AIPipeline';
import { PipelineStep } from '../shared/pipeline-types';
import { QualityLevel, OperationOutput, ExecutionContext } from '../shared/types';
import { StreamingPipelineEngine, PipelineStateUpdate } from '../core/PipelineEngine';
import { IWebSocketManager } from '../../../websocket/interfaces/websocket.interfaces';
import { CollaborationEventType } from '../../../../types/websocket.types';

// Import operations
import { NarrativeStyleAnalysisOperationV2 } from '../operations/narrative/v2/NarrativeStyleAnalysisOperationV2';
import { ProjectContextEnrichmentOperationV2 } from '../operations/narrative/v2/ProjectContextEnrichmentOperationV2';
import { NarrativeTextGenerationOperationV2 } from '../operations/narrative/v2/NarrativeTextGenerationOperationV2';
import { ContentSafetyValidationOperationV2 } from '../operations/narrative/v2/ContentSafetyValidationOperationV2';

// Import types
import { PrecedingNodeData } from '../types/PrecedingNodeData';

/**
 * Input data for narrative text generation pipeline v2
 */
export interface NarrativeTextGenerationPipelineInputV2 {
  projectId: string;
  
  // Current node data
  nodeData: {
    id: string;
    title: string;
    existingText?: string; 
    attachedEntities?: string[]; // IDs of attached entities
    position?: { x: number; y: number };
  };
  
  // Preceding nodes extracted from graph (optimized format)
  precedingNodes: PrecedingNodeData[];
  
  // Graph data for context analysis - DEPRECATED: Use precedingNodes instead
  // TODO: Remove in next version
  graphData?: {
    nodes: Array<{
      id: string;
      type: 'narrative' | 'choice' | 'layer';
      data: {
        title?: string;
        text?: string;
        choices?: Array<{ text: string }>; // For choice nodes
      };
      position: { x: number; y: number };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>;
  };
  
  // Project bible
  projectBible: {
    synopsis?: string;
    logline?: string;
    setting?: string;
    atmosphere?: string;
    mainThemes?: string;
    genres?: string[];
    targetAudience?: string;
    constraints?: string;
    visualStyle?: string;
    references?: string;
  };
  
  // Generation settings
  generationOptions: {
    targetLength?: 'auto' | 'short' | 'medium' | 'long'; // auto = based on previous nodes
    preferredTone?: 'auto' | 'dramatic' | 'comedic' | 'mysterious' | 'neutral' | 'action';
    preserveExistingStyle?: boolean; // true by default
    includeEntityReferences?: boolean; // true by default
    contentRating?: 'G' | 'PG' | 'PG-13' | 'R'; // For safety validation
  };
  
  // User settings
  userSettings?: {
    preferredProvider?: string;
    preferredModel?: string;
    creativityLevel?: number; // 0-100
  };
  
  // Additional requirements
  customPromptRequirements?: string[];
}

/**
 * Narrative text generation pipeline v2
 * Uses new architecture with centralized providers and StreamingPipelineEngine
 */
export class NarrativeTextGenerationPipelineV2 extends AIPipeline {
  
  constructor() {
    // Create operation instances
    const styleAnalysisOperation = new NarrativeStyleAnalysisOperationV2();
    const contextEnrichmentOperation = new ProjectContextEnrichmentOperationV2();
    const textGenerationOperation = new NarrativeTextGenerationOperationV2();
    const safetyValidationOperation = new ContentSafetyValidationOperationV2();
    
    // Define pipeline steps
    const steps: PipelineStep[] = [
      // Step 1: Analyze narrative style (using preceding nodes directly)
      {
        id: 'analyze_narrative_style',
        operation: styleAnalysisOperation,
        dependencies: [],
        qualityLevel: QualityLevel.STANDARD,
        mapInput: (_results, pipelineInput: NarrativeTextGenerationPipelineInputV2) => {
          return {
            projectId: pipelineInput.projectId,
            userDescription: `Style analysis for narrative text generation of node "${pipelineInput.nodeData.title}"`,
            precedingNodes: pipelineInput.precedingNodes,
            projectBible: pipelineInput.projectBible,
            targetLength: this.calculateAverageWordCount(pipelineInput.precedingNodes)
          };
        }
      },

      // Step 2: Enrich project context (using preceding nodes directly)
      {
        id: 'enrich_project_context',
        operation: contextEnrichmentOperation,
        dependencies: [],
        qualityLevel: QualityLevel.STANDARD,
        mapInput: (_results, pipelineInput: NarrativeTextGenerationPipelineInputV2) => {
          return {
            projectId: pipelineInput.projectId,
            userDescription: `Context enrichment for narrative text generation of node "${pipelineInput.nodeData.title}"`,
            currentNodeData: {
              title: pipelineInput.nodeData.title,
              attachedEntities: pipelineInput.nodeData.attachedEntities
            },
            projectBible: pipelineInput.projectBible,
            precedingContext: JSON.stringify(pipelineInput.precedingNodes)
          };
        }
      },

      // Step 3: Generate narrative text (depends on style and context enrichment)
      {
        id: 'generate_narrative_text',
        operation: textGenerationOperation,
        dependencies: ['analyze_narrative_style', 'enrich_project_context'],
        qualityLevel: QualityLevel.STANDARD,
        condition: (results: Map<string, OperationOutput>) => {
          const styleAnalysis = results.get('analyze_narrative_style');
          const contextEnrichment = results.get('enrich_project_context');
          return (styleAnalysis && contextEnrichment && !styleAnalysis.error && !contextEnrichment.error) || false;
        },
        mapInput: (results, pipelineInput: NarrativeTextGenerationPipelineInputV2) => {
          const styleAnalysis = results.get('analyze_narrative_style');
          const contextEnrichment = results.get('enrich_project_context');
          
          return {
            projectId: pipelineInput.projectId,
            userDescription: '',
            nodeData: {
              title: pipelineInput.nodeData.title || 'Untitled',
              existingText: pipelineInput.nodeData.existingText || ''
            },
            styleGuidelines: styleAnalysis?.detectedStyle || {},
            lengthRequirements: styleAnalysis?.recommendedLength || { min: 50, max: 200, target: 100 },
            enrichedContext: contextEnrichment?.enrichedContext || {},
            precedingNodes: pipelineInput.precedingNodes,
            constraints: contextEnrichment?.contextualConstraints || {},
            customPrompt: pipelineInput.customPromptRequirements?.join('\n')
          };
        }
      },

      // Step 4: Validate content safety (depends on text generation)
      {
        id: 'validate_content_safety',
        operation: safetyValidationOperation,
        dependencies: ['generate_narrative_text'],
        qualityLevel: QualityLevel.STANDARD,
        condition: (results: Map<string, OperationOutput>) => {
          const textGeneration = results.get('generate_narrative_text');
          return textGeneration && textGeneration.generatedText?.content && !textGeneration.error;
        },
        mapInput: (results, pipelineInput: NarrativeTextGenerationPipelineInputV2) => {
          const textGeneration = results.get('generate_narrative_text');
          return {
            projectId: pipelineInput.projectId,
            userDescription: `Content safety validation for node "${pipelineInput.nodeData.title}"`,
            generatedText: textGeneration?.generatedText?.content || '',
            contentGuidelines: {
              allowedRating: pipelineInput.generationOptions.contentRating || 'PG-13',
              restrictedTopics: []
            }
          };
        }
      }
    ];

    // Initialize pipeline
    super(
      'narrative-text-generation-pipeline-v2',
      'Narrative Text Generation Pipeline V2',
      'Pipeline for generating narrative text for story nodes using architecture v2',
      '2.0.0',
      steps
    );
  }

  /**
   * Prepare input data for the pipeline
   */
  public prepareInput(
    nodeData: any,
    precedingNodes: PrecedingNodeData[],
    projectBible: any,
    generationOptions?: Partial<NarrativeTextGenerationPipelineInputV2['generationOptions']>,
    userSettings?: any,
    customPromptRequirements?: string[]
  ): NarrativeTextGenerationPipelineInputV2 {
    return {
      projectId: nodeData.projectId || 'unknown',
      nodeData: {
        id: nodeData.id,
        title: nodeData.title,
        existingText: nodeData.existingText,
        attachedEntities: nodeData.attachedEntities || [],
        position: nodeData.position
      },
      precedingNodes: precedingNodes || [],
      projectBible: projectBible || {},
      generationOptions: {
        targetLength: 'auto',
        preferredTone: 'auto',
        preserveExistingStyle: true,
        includeEntityReferences: true,
        contentRating: 'PG-13',
        ...generationOptions
      },
      userSettings: userSettings || {},
      customPromptRequirements: customPromptRequirements || []
    };
  }

  /**
   * Process pipeline results for external use
   */
  public async processResultsPublic(pipelineResults: any): Promise<{
    finalText: any;
    stepResults: any;
  }> {
    console.log('🔍 Processing pipeline results:', JSON.stringify(pipelineResults, null, 2));
    
    if (!pipelineResults.success || !pipelineResults.steps) {
      throw new Error('Pipeline results are not successful or missing steps');
    }

    const styleAnalysisStep = pipelineResults.steps.get('analyze_narrative_style');
    const contextEnrichmentStep = pipelineResults.steps.get('enrich_project_context');
    const textGenerationStep = pipelineResults.steps.get('generate_narrative_text');
    const safetyValidationStep = pipelineResults.steps.get('validate_content_safety');

    console.log('🔍 Text generation step:', textGenerationStep);
    console.log('🔍 Text generation step success:', textGenerationStep?.success);
    console.log('🔍 Text generation step generatedText:', textGenerationStep?.generatedText);

    // Form final text result - check for actual content instead of success flag
    const finalText = (textGenerationStep && textGenerationStep.generatedText && textGenerationStep.generatedText.content) ? {
      content: textGenerationStep.generatedText.content,
      wordCount: textGenerationStep.generatedText.wordCount,
      estimatedReadingTime: textGenerationStep.generatedText.estimatedReadingTime,
      appliedStyle: textGenerationStep.appliedStyle,
      contextualReferences: textGenerationStep.contextualReferences,
      safetyApproved: safetyValidationStep?.validationResult?.isApproved || false,
      contentRating: safetyValidationStep?.validationResult?.ratingAssessment
    } : null;

    console.log('🔍 Formed finalText:', finalText);

    // Form step results - check for actual data instead of success flags
    const stepResults = {
      styleAnalysis: (styleAnalysisStep && styleAnalysisStep.detectedStyle) ? {
        detectedStyle: styleAnalysisStep.detectedStyle,
        stylePatterns: styleAnalysisStep.stylePatterns,
        recommendedLength: styleAnalysisStep.recommendedLength,
        confidence: styleAnalysisStep.confidence
      } : null,
      contextEnrichment: (contextEnrichmentStep && contextEnrichmentStep.enrichedContext) ? {
        enrichedContext: contextEnrichmentStep.enrichedContext,
        contextualConstraints: contextEnrichmentStep.contextualConstraints,
        confidence: contextEnrichmentStep.confidence
      } : null,
      textGeneration: (textGenerationStep && textGenerationStep.generatedText) ? {
        generatedText: textGenerationStep.generatedText,
        appliedStyle: textGenerationStep.appliedStyle,
        contextualReferences: textGenerationStep.contextualReferences,
        confidence: textGenerationStep.confidence
      } : null,
      safetyValidation: (safetyValidationStep && safetyValidationStep.validationResult) ? {
        validationResult: safetyValidationStep.validationResult,
        confidence: safetyValidationStep.confidence
      } : null
    };

    return {
      finalText,
      stepResults
    };
  }

  /**
   * Calculate average word count from narrative nodes for text generation length estimation
   */
  private calculateAverageWordCount(precedingNodes: PrecedingNodeData[]): number {
    const narrativeTexts = precedingNodes
      .filter(node => node.type === 'narrative' && node.text.trim())
      .map(node => node.text.trim());
    
    if (narrativeTexts.length === 0) {
      return 50; // Default target for new nodes
    }
    
    const totalWords = narrativeTexts.reduce((sum, text) => {
      return sum + text.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
    
    const averageWords = Math.round(totalWords / narrativeTexts.length);
    
    // Limit to maximum of 50 words
    return Math.min(averageWords, 50);
  }

  /**
   * Override step display names for better presentation
   */
  protected getStepDisplayName(step: any): string {
    const stepNames: Record<string, string> = {
      'analyze_narrative_style': 'Анализ стиля нарратива',
      'enrich_project_context': 'Обогащение контекста проекта',
      'generate_narrative_text': 'Генерация нарративного текста',
      'validate_content_safety': 'Проверка безопасности контента'
    };
    
    return stepNames[step.id] || step.operation.name;
  }

  /**
   * Override step descriptions for better presentation
   */
  protected getStepDescription(step: any): string {
    const stepDescriptions: Record<string, string> = {
      'analyze_narrative_style': 'Определение стиля и тона для поддержания согласованности',
      'enrich_project_context': 'Обогащение контекста данными проекта и сущностей',
      'generate_narrative_text': 'Создание нарративного текста с учетом всех контекстов',
      'validate_content_safety': 'Проверка созданного контента на соответствие стандартам безопасности'
    };
    
    return stepDescriptions[step.id] || 'Выполнение операции';
  }
}

// Create pipeline instance for export
export const NarrativeTextGenerationPipelineV2Instance = new NarrativeTextGenerationPipelineV2();

/**
 * Function to execute narrative text generation pipeline with progress tracking
 */
export async function executeNarrativeTextGenerationWithProgress(
  input: NarrativeTextGenerationPipelineInputV2,
  context: ExecutionContext,
  wsManager?: IWebSocketManager,
) {

  const engine = new StreamingPipelineEngine();
  const pipeline = NarrativeTextGenerationPipelineV2Instance;

  // Send pipeline start event
  if (wsManager) {
    wsManager.emitToProject(context.projectId, {
      type: CollaborationEventType.AI_PIPELINE_STARTED,
      payload: {
        requestId: context.requestId,
        status: 'started',
        currentStep: 'pipeline_started',
        stepName: 'Инициализация',
        stepDescription: `Начинаем генерацию текста для узла "${input.nodeData.title}"`,
        progress: 0,
        startTime: context.startTime,
        stepStates: {
          'analyze_narrative_style': 'pending',
          'enrich_project_context': 'pending',
          'generate_narrative_text': 'pending',
          'validate_content_safety': 'pending'
        },
        metadata: {
          pipelineType: 'narrative_text_generation',
          nodeTitle: input.nodeData.title,
          nodeId: input.nodeData.id,
          totalSteps: 4
        }
      },
      userId: context.userId,
      projectId: context.projectId,
      timestamp: Date.now()
    });
  }

  try {
    // Setup progress callback
    const onPipelineUpdate = (update: PipelineStateUpdate) => {
      if (!wsManager) return;

      const { progress, stepStates, results, lastChangedStep } = update;
      
      if (lastChangedStep) {
        const stepDisplayNames = {
          'analyze_narrative_style': 'Анализ стиля нарратива',
          'enrich_project_context': 'Обогащение контекста проекта',
          'generate_narrative_text': 'Генерация нарративного текста',
          'validate_content_safety': 'Проверка безопасности контента'
        };

        const stepDescriptions = {
          'analyze_narrative_style': 'Определение стиля и тона для поддержания согласованности',
          'enrich_project_context': 'Обогащение контекста данными проекта и сущностей',
          'generate_narrative_text': 'Создание нарративного текста с учетом всех контекстов',
          'validate_content_safety': 'Проверка созданного контента на соответствие стандартам безопасности'
        };

        const stepName = stepDisplayNames[lastChangedStep.id as keyof typeof stepDisplayNames] || lastChangedStep.id;
        const stepDescription = stepDescriptions[lastChangedStep.id as keyof typeof stepDescriptions] || 'Выполнение операции';

        // Send progress event
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
              pipelineType: 'narrative_text_generation',
              nodeTitle: input.nodeData.title,
              nodeId: input.nodeData.id,
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

        // Send step completion event
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
                pipelineType: 'narrative_text_generation',
                nodeTitle: input.nodeData.title,
                nodeId: input.nodeData.id,
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
        }
      }
    };

    const results = await engine.execute(pipeline, input, context, onPipelineUpdate);
    
    // Process results
    const processedResults = await pipeline.processResultsPublic({
      success: true,
      steps: results
    });

    // Send final update
    if (wsManager) {
      const finalStepStates = Object.fromEntries(
        Array.from(results.keys()).map(id => [id, 'completed'])
      );

      const textGenerationStep = results.get('generate_narrative_text');
      const hasText = textGenerationStep && textGenerationStep.generatedText?.content;
      const wordCount = textGenerationStep?.generatedText?.wordCount || 0;
      
      const safetyValidationStep = results.get('validate_content_safety');
      const isApproved = safetyValidationStep?.validationResult?.isApproved || false;

      wsManager.emitToProject(context.projectId, {
        type: CollaborationEventType.AI_PIPELINE_COMPLETED,
        payload: {
          requestId: context.requestId,
          status: 'completed',
          currentStep: 'pipeline_completed',
          stepName: 'Генерация завершена',
          stepDescription: `Текст для узла "${input.nodeData.title}" успешно создан!`,
          progress: 100,
          startTime: context.startTime,
          endTime: new Date(),
          stepStates: finalStepStates,
          results: processedResults,
          metadata: {
            pipelineType: 'narrative_text_generation',
            nodeTitle: input.nodeData.title,
            nodeId: input.nodeData.id,
            executionTime: Date.now() - context.startTime.getTime(),
            hasText: !!hasText,
            wordCount: wordCount,
            safetyApproved: isApproved
          }
        },
        userId: context.userId,
        projectId: context.projectId,
        timestamp: Date.now()
      });
    }

    return processedResults;

  } catch (error) {
    console.error('❌ Narrative Text Generation Pipeline failed:', error);
    
    // Send error message
    if (wsManager) {
      wsManager.emitToProject(context.projectId, {
        type: CollaborationEventType.AI_PIPELINE_ERROR,
        payload: {
          requestId: context.requestId,
          status: 'error',
          currentStep: 'pipeline_error',
          stepName: 'Ошибка выполнения',
          stepDescription: (error as Error).message || 'Ошибка генерации текста',
          progress: 0,
          startTime: context.startTime,
          endTime: new Date(),
          stepStates: {
            'analyze_narrative_style': 'failed',
            'enrich_project_context': 'failed',
            'generate_narrative_text': 'failed',
            'validate_content_safety': 'failed'
          },
          metadata: {
            pipelineType: 'narrative_text_generation',
            nodeTitle: input.nodeData.title,
            nodeId: input.nodeData.id,
            error: (error as Error).message,
            errorStack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
          }
        },
        userId: context.userId,
        projectId: context.projectId,
        timestamp: Date.now()
      });
    }

    throw error;
  }
}
