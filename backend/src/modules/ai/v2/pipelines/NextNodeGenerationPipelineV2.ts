// backend/src/modules/ai/v2/pipelines/NextNodeGenerationPipelineV2.ts
import { AIPipeline } from '../core/AIPipeline';
import { PipelineStep } from '../shared/pipeline-types';
import { QualityLevel, ExecutionContext } from '../shared/types';
import { PrecedingNodeData } from '../types/PrecedingNodeData';
import { StreamingPipelineEngine, OnPipelineUpdateCallback } from '../core/PipelineEngine';
import { IWebSocketManager } from '../../../websocket/interfaces/websocket.interfaces';
import { CollaborationEventType } from '../../../../types/websocket.types';

// Import operations
import { NextNodeContextAnalysisOperationV2 } from '../operations/next-node/NextNodeContextAnalysisOperationV2';
import { NextNodeProjectEnrichmentOperationV2 } from '../operations/next-node/NextNodeProjectEnrichmentOperationV2';
import { NextNodeGenerationOperationV2 } from '../operations/next-node/NextNodeGenerationOperationV2';
import { NextNodeEntitySuggestionOperationV2 } from '../operations/next-node/NextNodeEntitySuggestionOperationV2';

/**
 * Input data for next node generation pipeline v2
 */
export interface NextNodeGenerationPipelineInputV2 {
  projectId: string;
  currentNodeId: string;
  precedingNodes: PrecedingNodeData[];
  projectBible?: {
    atmosphere?: string;
    themes?: string;
    visualStyle?: string;
    genres?: string[];
    setting?: string;
    storyStructure?: string;
    characters?: any;
    locations?: any;
    objects?: any;
    concepts?: any;
    worldBuilding?: any;
    plotOutlines?: any;
  };
  existingEntities?: Array<{
    id: string;
    name: string;
    type: 'character' | 'location' | 'object' | 'concept';
    description?: string;
    tags?: string[];
  }>;
  generationOptions?: {
    nodeCount?: number; // Number of nodes to generate (default: 1)
    targetLength?: 'auto' | 'short' | 'medium' | 'long';
    preferredTone?: 'auto' | 'dramatic' | 'comedic' | 'mysterious' | 'neutral' | 'action';
    includeChoices?: boolean; // Whether to include choice options
    includeEntitySuggestions?: boolean; // Whether to analyze and suggest entities
  };
  userSettings?: {
    preferredQuality?: QualityLevel;
    creativityLevel?: 'conservative' | 'moderate' | 'creative';
  };
}

/**
 * Output data for next node generation pipeline v2
 */
export interface NextNodeGenerationPipelineOutputV2 {
  generatedNodes: Array<{
    type: 'narrative' | 'choice';
    title: string;
    content: {
      text: string;
      wordCount: number;
      estimatedReadingTime: number;
    };
    suggestedEntities: string[];
    attachedEntities?: string[]; // Final recommended entities for attachment
    metadata: {
      confidence: number;
      reasoning: string;
      styleAlignment: {
        tone: string;
        mood: string;
        perspective: string;
      };
      narrativeFunction: {
        plotAdvancement: 'none' | 'minor' | 'major';
        characterDevelopment: 'none' | 'minor' | 'major';
        conflictProgression: 'none' | 'escalation' | 'resolution';
        thematicRelevance: 'none' | 'supporting' | 'central';
      };
    };
  }>;
  entityAnalysis?: {
    referencedEntities: Array<{
      entityId: string;
      entityName: string;
      referenceCount: number;
      contextRelevance: 'high' | 'medium' | 'low';
      usageDescription: string;
    }>;
    missingEntities: Array<{
      name: string;
      type: 'character' | 'location' | 'object' | 'concept';
      description: string;
      contextualImportance: 'essential' | 'beneficial' | 'optional';
      suggestedAttributes: {
        tags?: string[];
        properties?: Record<string, string>;
      };
      creationReason: string;
    }>;
    enhancementSuggestions: Array<{
      existingEntityId: string;
      suggestedEnhancements: string[];
      enhancementReason: string;
    }>;
  };
  pipelineMetadata: {
    totalExecutionTime: number;
    stepsExecuted: string[];
    overallConfidence: number;
    qualityLevel: QualityLevel;
  };
}

/**
 * Next node generation pipeline v2
 * Generates the next narrative node(s) using comprehensive context analysis and entity suggestions
 * 
 * Pipeline flow based on the provided schema:
 * 1. Analyze context from preceding nodes → Contextual Analysis
 * 2. Enrich with project bible data → Project Context Enrichment  
 * 3. Generate next node content → Node Generation
 * 4. Analyze and suggest entities → Entity Suggestions (optional)
 */
export class NextNodeGenerationPipelineV2 extends AIPipeline {
  
  constructor() {
    // Create operation instances
    const contextAnalysisOperation = new NextNodeContextAnalysisOperationV2();
    const projectEnrichmentOperation = new NextNodeProjectEnrichmentOperationV2();
    const nodeGenerationOperation = new NextNodeGenerationOperationV2();
    const entitySuggestionOperation = new NextNodeEntitySuggestionOperationV2();
    
    // Define pipeline steps
    const steps: PipelineStep[] = [
      // Step 1: Analyze narrative context from preceding nodes
      {
        id: 'analyze_context',
        operation: contextAnalysisOperation,
        dependencies: [],
        qualityLevel: QualityLevel.FAST, // Quick analysis for context understanding
        mapInput: (_results, pipelineInput: NextNodeGenerationPipelineInputV2) => ({
          projectId: pipelineInput.projectId,
          userDescription: `Context analysis for generating next node after "${pipelineInput.currentNodeId}"`,
          currentNodeId: pipelineInput.currentNodeId,
          precedingNodes: pipelineInput.precedingNodes,
          projectBible: pipelineInput.projectBible
        })
      },

      // Step 2: Enrich context with detailed project bible information
      {
        id: 'enrich_project_context',
        operation: projectEnrichmentOperation,
        dependencies: ['analyze_context'],
        qualityLevel: QualityLevel.STANDARD, // More detailed analysis needed
        mapInput: (results, pipelineInput: NextNodeGenerationPipelineInputV2) => {
          const contextAnalysisResult = results.get('analyze_context');
          console.log('🔍 Context analysis result structure:', {
            hasResult: !!contextAnalysisResult,
            keys: contextAnalysisResult ? Object.keys(contextAnalysisResult) : []
          });

          // The result is now directly the parsed output from the first operation
          const contextAnalysis = contextAnalysisResult || {
            narrativeFlow: {
              currentSituationSummary: 'Context analysis pending',
              plotProgression: 'transition',
              emotionalArc: 'neutral',
              pacing: 'moderate'
            },
            contextualElements: {
              activeCharacters: [],
              currentLocation: {
                name: 'Unknown location',
                atmosphere: 'neutral',
                significance: 'undefined'
              },
              activeThemes: [],
              pendingPlotThreads: []
            },
            nextNodeRequirements: {
              shouldAdvancePlot: true,
              shouldIntroduceConflict: false,
              shouldResolveConflict: false,
              shouldDevelopCharacter: true,
              suggestedFocus: 'action'
            },
            styleGuidance: {
              tone: 'neutral',
              mood: 'balanced',
              perspective: 'third_person',
              recommendedLength: 50
            }
          };

          return {
            projectId: pipelineInput.projectId,
            userDescription: `Project context enrichment for next node generation`,
            currentNodeId: pipelineInput.currentNodeId,
            contextAnalysis: contextAnalysis,
            projectBible: pipelineInput.projectBible || {}
          };
        }
      },

      // Step 3: Generate the actual next node content
      {
        id: 'generate_next_node',
        operation: nodeGenerationOperation,
        dependencies: ['analyze_context', 'enrich_project_context'],
        qualityLevel: QualityLevel.STANDARD, // High quality for content generation
        mapInput: (results, pipelineInput: NextNodeGenerationPipelineInputV2) => {
          const contextAnalysisResult = results.get('analyze_context');
          const enrichmentResult = results.get('enrich_project_context');

          const contextAnalysis = contextAnalysisResult || {};
          const enrichedContext = enrichmentResult || {
            worldContext: 'World context not available',
            characterContext: 'Character context not available',
            plotContext: 'Plot context not available',
            thematicContext: 'Thematic context not available',
            settingDetails: {
              environmentDescription: 'Environment details not available',
              moodInfluence: 'Mood influence not specified',
              availableElements: []
            },
            entityReferences: [],
            constraintsAndGuidelines: {
              mustInclude: [],
              shouldAvoid: [],
              toneConstraints: [],
              contentGuidelines: []
            }
          };
          
          // Calculate average word count from preceding nodes
          const averageWordCount = this.calculateAverageWordCount(pipelineInput.precedingNodes);
          
          const generationOptions = {
            nodeCount: 1,
            targetLength: 'auto' as const,
            preferredTone: 'auto' as const,
            includeChoices: false,
            averageWordCount: averageWordCount, // Add calculated average
            ...pipelineInput.generationOptions
          };

          return {
            projectId: pipelineInput.projectId,
            userDescription: `Generate next narrative node after "${pipelineInput.currentNodeId}"`,
            currentNodeId: pipelineInput.currentNodeId,
            precedingNodes: pipelineInput.precedingNodes,
            contextAnalysis: contextAnalysis,
            enrichedContext: enrichedContext,
            generationOptions: generationOptions
          };
        }
      },

      // Step 4: Analyze generated content for entity suggestions (conditional)
      {
        id: 'suggest_entities',
        operation: entitySuggestionOperation,
        dependencies: ['generate_next_node'],
        qualityLevel: QualityLevel.STANDARD, // Quick analysis for entity detection
        condition: (_results) => {
          return true;
        },
        mapInput: (results, pipelineInput: NextNodeGenerationPipelineInputV2) => {
          const generationResult = results.get('generate_next_node');
          
          console.log('🔍 Step 4 input data:', {
            hasGenerationResult: !!generationResult,
            resultKeys: generationResult ? Object.keys(generationResult) : []
          });

          const generatedNodes = generationResult?.generatedNodes || [];
          
          return {
            projectId: pipelineInput.projectId,
            userDescription: `Entity analysis for generated next node`,
            currentNodeId: pipelineInput.currentNodeId,
            generatedNodes: generatedNodes,
            projectBible: pipelineInput.projectBible || {},
            existingEntities: pipelineInput.existingEntities || []
          };
        }
      }
    ];

    super(
      'next-node-generation-pipeline-v2',
      'Next Node Generation Pipeline V2',
      'Generates next narrative node(s) with comprehensive context analysis and entity management',
      '2.0.0',
      steps
    );
  }

  /**
   * Process pipeline results into final output format
   */
  static processResults(
    results: Map<string, any>, 
    _input: NextNodeGenerationPipelineInputV2,
    executionMetadata: {
      startTime: Date;
      endTime: Date;
      qualityLevel: QualityLevel;
    }
  ): NextNodeGenerationPipelineOutputV2 {
    console.log('🔍 Processing pipeline results:', {
      stepsCompleted: Array.from(results.keys()),
      resultsSizes: Object.fromEntries(
        Array.from(results.entries()).map(([key, value]) => [
          key, 
          typeof value === 'object' ? Object.keys(value || {}).length : typeof value
        ])
      )
    });

    const generationResult = results.get('generate_next_node');
    const entityAnalysis = results.get('suggest_entities');

    // Process generated nodes and merge with entity suggestions
    const generatedNodes = (generationResult?.generatedNodes || []).map((node: any, index: number) => {
      const entityMapping = entityAnalysis?.nodeEntityMapping?.find(
        (mapping: any) => mapping.nodeIndex === index
      );
      
      const attachedEntities = entityMapping?.recommendedEntities
        ?.filter((rec: any) => rec.attachmentStrength === 'strong' || rec.attachmentStrength === 'moderate')
        ?.map((rec: any) => rec.entityId || rec.entityName) || [];

      return {
        ...node,
        attachedEntities: attachedEntities.length > 0 ? attachedEntities : (node.suggestedEntities || [])
      };
    });

    return {
      generatedNodes,
      entityAnalysis: entityAnalysis?.entityAnalysis,
      pipelineMetadata: {
        totalExecutionTime: executionMetadata.endTime.getTime() - executionMetadata.startTime.getTime(),
        stepsExecuted: Array.from(results.keys()),
        overallConfidence: 75, // Fixed confidence for simplified structure
        qualityLevel: executionMetadata.qualityLevel
      }
    };
  }

  /**
   * Calculate average word count from narrative nodes for text generation length estimation
   */
  private calculateAverageWordCount(precedingNodes: Array<{ type: string; text: string }>): number {
    const narrativeTexts = precedingNodes
      .filter(node => node.type === 'narrative' && node.text.trim())
      .map(node => node.text.trim());
    
    if (narrativeTexts.length === 0) {
      return 30; // Default target for new nodes
    }
    
    const totalWords = narrativeTexts.reduce((sum, text) => {
      return sum + text.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
    
    const averageWords = Math.round(totalWords / narrativeTexts.length);
    
    console.log(`📊 Length analysis: ${narrativeTexts.length} narrative nodes, average: ${averageWords} words`);
    
    // Limit to reasonable range (15-30 words)
    return Math.max(15, Math.min(averageWords, 30));
  }


}

/**
 * Execute next node generation pipeline with progress tracking
 */
export async function executeNextNodeGenerationWithProgress(
  input: NextNodeGenerationPipelineInputV2,
  context: ExecutionContext,
  wsManager?: IWebSocketManager,
  retryConfig?: {
    maxRetries?: number;
    retryDelayMs?: number;
    exponentialBackoff?: boolean;
  }
): Promise<NextNodeGenerationPipelineOutputV2> {
  console.log(`🚀 Starting Next Node Generation Pipeline (v2) for node "${input.currentNodeId}"...`);

  const pipeline = new NextNodeGenerationPipelineV2();
  const engine = new StreamingPipelineEngine();

  // Добавляем конфигурацию повторных попыток в контекст
  const contextWithRetry: ExecutionContext = {
    ...context,
    pipelineRetryConfig: {
      maxRetries: retryConfig?.maxRetries ?? 2, // По умолчанию 2 попытки
      retryDelayMs: retryConfig?.retryDelayMs ?? 2000, // По умолчанию 2 секунды
      exponentialBackoff: retryConfig?.exponentialBackoff ?? true,
      retryableErrorTypes: ['temporary', 'rate_limit'] // Повторяем только временные ошибки и rate limit
    }
  };

  const onPipelineUpdate: OnPipelineUpdateCallback = (update) => {
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
      },
      userId: context.userId,
      projectId: context.projectId,
      timestamp: Date.now(),
    });
    
    if(lastChangedStep) {
        console.log(`[${update.progress}%] Pipeline update: Step '${lastChangedStep.id}' is now '${lastChangedStep.status}'`);
    }
  };

  const startTime = new Date();
  const results = await engine.execute(pipeline, input, contextWithRetry, onPipelineUpdate);
  const endTime = new Date();

  console.log('\n🏁 Next Node Generation Pipeline finished.');
  
  // Process results using the static method
  const processedResult = NextNodeGenerationPipelineV2.processResults(results, input, {
    startTime,
    endTime,
    qualityLevel: contextWithRetry.qualityLevel
  });

  // Send final update
  if (wsManager) {
    wsManager.emitToProject(context.projectId, {
      type: CollaborationEventType.AI_PIPELINE_COMPLETED,
      payload: {
        requestId: context.requestId,
        pipelineType: 'next_node_generation',
        success: true,
        results: {
          nodesGenerated: processedResult.generatedNodes.length,
          executionTime: processedResult.pipelineMetadata.totalExecutionTime
        }
      },
      userId: context.userId,
      projectId: context.projectId,
      timestamp: Date.now()
    });
  }

  return processedResult;
}
