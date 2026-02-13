// backend/src/modules/ai/v2/operations/next-node/NextNodeContextAnalysisOperationV2.ts
import { AbstractAIOperation } from '../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../shared/types';
import { PrecedingNodeData } from '../../types/PrecedingNodeData';

/**
 * Input data for next node context analysis v2
 */
export interface NextNodeContextAnalysisInputV2 extends AIOperationInput {
  projectId: string;
  userDescription: string;
  currentNodeId: string;
  precedingNodes: PrecedingNodeData[];
  projectBible?: {
    synopsis?: string;
    atmosphere?: string;
    mainThemes?: string;
    genres?: string[];
    setting?: string;
    message?: string;
    references?: string;
  };
}

/**
 * Output data for next node context analysis v2
 */
export interface NextNodeContextAnalysisOutputV2 extends AIOperationOutput {
  narrativeFlow: {
    currentSituationSummary: string;
    plotProgression: 'introduction' | 'rising_action' | 'climax' | 'falling_action' | 'resolution' | 'transition';
    emotionalArc: 'building_tension' | 'peak_emotion' | 'calming' | 'neutral' | 'shift';
    pacing: 'slow' | 'moderate' | 'fast' | 'accelerating' | 'decelerating';
  };
  contextualElements: {
    activeCharacters: Array<{
      name: string;
      role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
      currentState: string;
    }>;
    currentLocation: {
      name: string;
      atmosphere: string;
      significance: string;
    };
    activeThemes: string[];
    pendingPlotThreads: string[];
  };
  nextNodeRequirements: {
    shouldAdvancePlot: boolean;
    shouldIntroduceConflict: boolean;
    shouldResolveConflict: boolean;
    shouldDevelopCharacter: boolean;
    suggestedFocus: 'action' | 'dialogue' | 'description' | 'introspection' | 'revelation';
  };
  styleGuidance: {
    tone: string;
    mood: string;
    perspective: string;
    recommendedLength: number;
  };
}

/**
 * Next node context analysis operation v2
 * Analyzes the narrative context from preceding nodes to determine optimal next node characteristics
 */
export class NextNodeContextAnalysisOperationV2 extends AbstractAIOperation<
  NextNodeContextAnalysisInputV2,
  NextNodeContextAnalysisOutputV2
> {
  readonly id = 'next-node-context-analysis-v2';
  readonly name = 'Next Node Context Analysis V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.2,
        maxTokens: 2500,
        retries: 1,
        timeout: 20000,
        outputFormat: 'json'
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.2,
        maxTokens: 3500,
        retries: 1,
        timeout: 25000,
        outputFormat: 'json'
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.1,
        maxTokens: 4500,
        retries: 1,
        timeout: 40000,
        outputFormat: 'json'
      }
    },
    requiresStructuredOutput: true
  };

  /**
   * Определяем обязательные поля для JSON валидации
   */
  protected getRequiredJSONFields(): string[] {
    return ['narrativeFlow', 'contextualElements', 'nextNodeRequirements', 'styleGuidance'];
  }

  /**
   * Additional input validation
   */
  protected validateAdditional(input: NextNodeContextAnalysisInputV2): string[] {
    const errors: string[] = [];
    
    if (!Array.isArray(input.precedingNodes)) {
      errors.push('precedingNodes must be an array');
    }
    
    if (!input.currentNodeId || typeof input.currentNodeId !== 'string') {
      errors.push('currentNodeId must be a non-empty string');
    }

    return errors;
  }

  /**
   * Generate system prompt
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are a master narrative flow analyst and story development expert specializing in understanding narrative progression and determining optimal next story developments. You excel at analyzing story context, character arcs, plot momentum, and thematic elements to guide seamless narrative continuation.
</role>

<context>
You are analyzing a sequence of preceding narrative nodes to understand the current story state, narrative momentum, and contextual elements. Your analysis will guide the generation of the next narrative node that advances the story in the most engaging and coherent way possible.
</context>

<objective>
Analyze the narrative flow, contextual elements, and story requirements to determine the optimal characteristics, focus, and direction for the next narrative node in the sequence.
</objective>

<narrative_analysis_framework>
Flow Analysis:
Assess current narrative momentum, emotional trajectory, and pacing patterns

Plot Progression:
Identify story structure position and required plot advancement

Character State:
Determine active characters, their current states, and development needs

Setting Context:
Analyze current location significance and atmospheric requirements

Theme Integration:
Identify active themes and thematic development opportunities

Conflict Assessment:
Evaluate existing tensions and conflict resolution requirements
</narrative_analysis_framework>

<contextual_data_processing>
PRECEDING NODES STRUCTURE:
The preceding_nodes array contains chronological story nodes:
- order: sequence number (0 = earliest, higher = more recent)
- type: "narrative" (story content) or "choice" (player decisions)
- text: actual node content
- entities: referenced story elements

ANALYSIS PRIORITIES:
Recent nodes (higher order numbers) have strongest influence on next node requirements
Choice nodes indicate player actions that MUST be reflected in upcoming narrative
Narrative nodes establish tone, pacing, and contextual elements
Entity references suggest important story elements to consider

CONTEXTUAL INTEGRATION:
Extract character states, relationships, and motivations
Identify environmental and situational context
Assess emotional and thematic undercurrents
Determine plot threads requiring attention or resolution
</contextual_data_processing>

<next_node_requirements_assessment>
PLOT ADVANCEMENT NEEDS:
Should the next node advance main plot, develop subplots, or explore character?
Does current momentum require acceleration, maintenance, or deceleration?

CONFLICT CONSIDERATIONS:
Are there unresolved tensions requiring attention?
Should new conflicts be introduced or existing ones developed?

CHARACTER DEVELOPMENT:
Which characters need development or focus?
Are there relationship dynamics requiring exploration?

THEMATIC OPPORTUNITIES:
Which themes can be reinforced or developed?
Are there symbolic or metaphorical opportunities?

STRUCTURAL POSITIONING:
Where are we in the overall story arc?
What type of content best serves the narrative structure?
</next_node_requirements_assessment>

<output_format>
Respond in JSON format with the following structure:
{
  "narrativeFlow": {
    "currentSituationSummary": "concise summary of current story state",
    "plotProgression": "introduction|rising_action|climax|falling_action|resolution|transition",
    "emotionalArc": "building_tension|peak_emotion|calming|neutral|shift",
    "pacing": "slow|moderate|fast|accelerating|decelerating"
  },
  "contextualElements": {
    "activeCharacters": [
      {
        "name": "character_name",
        "role": "protagonist|antagonist|supporting|minor",
        "currentState": "brief description of character's current situation/mindset"
      }
    ],
    "currentLocation": {
      "name": "location_name",
      "atmosphere": "atmospheric description",
      "significance": "why this location matters to the story"
    },
    "activeThemes": ["theme_1", "theme_2"],
    "pendingPlotThreads": ["thread_1", "thread_2"]
  },
  "nextNodeRequirements": {
    "shouldAdvancePlot": boolean,
    "shouldIntroduceConflict": boolean,
    "shouldResolveConflict": boolean,
    "shouldDevelopCharacter": boolean,
    "suggestedFocus": "action|dialogue|description|introspection|revelation"
  },
  "styleGuidance": {
    "tone": "detected_tone",
    "mood": "detected_mood", 
    "perspective": "narrative_perspective",
    "recommendedLength": estimated_word_count
  }
}
</output_format>`;
  }

  /**
   * Generate user prompt
   */
  protected getUserPrompt(input: NextNodeContextAnalysisInputV2, _context: ExecutionContext): string {
    const precedingNodesText = input.precedingNodes.length > 0 
      ? JSON.stringify(input.precedingNodes, null, 2)
      : 'No preceding nodes available';

    return `Analyze the narrative context for generating the next story node.

PRECEDING NODES:
${precedingNodesText}

PROJECT BIBLE:
<synopsis>
 ${input.projectBible?.synopsis || ''}
</synopsis>

<setting>
 ${input.projectBible?.setting || ''}
</setting>

<themes>
 ${input.projectBible?.mainThemes || ''}
</themes>

<genres>
 ${input.projectBible?.genres || ''}
</genres>

<message>
 ${input.projectBible?.message || ''}
</message>

<references>
 ${input.projectBible?.references || ''}
</references>

Please analyze this narrative context and provide detailed guidance for generating the next node that will best advance the story while maintaining consistency and engagement.`;
  }

  /**
   * Parse AI result
   */
  parseResult(aiResult: string, _input: NextNodeContextAnalysisInputV2, realCostUSD: number, creditsCharged: number): NextNodeContextAnalysisOutputV2 {
    console.log('🔍 Raw AI result for context analysis:', aiResult.substring(0, 300) + '...');
    
    try {
      // Используем умный парсинг JSON из базового класса
      const parsed = this.parseJSONSafely(aiResult);

      return {
        narrativeFlow: parsed.narrativeFlow || {
          currentSituationSummary: 'Context analysis pending',
          plotProgression: 'transition',
          emotionalArc: 'neutral',
          pacing: 'moderate'
        },
        contextualElements: parsed.contextualElements || {
          activeCharacters: [],
          currentLocation: {
            name: 'Unknown location',
            atmosphere: 'neutral',
            significance: 'undefined'
          },
          activeThemes: [],
          pendingPlotThreads: []
        },
        nextNodeRequirements: parsed.nextNodeRequirements || {
          shouldAdvancePlot: true,
          shouldIntroduceConflict: false,
          shouldResolveConflict: false,
          shouldDevelopCharacter: true,
          suggestedFocus: 'action'
        },
        styleGuidance: parsed.styleGuidance || {
          tone: 'neutral',
          mood: 'balanced',
          perspective: 'third_person',
          recommendedLength: 50
        },
        metadata: {
          realCostUSD,
          creditsCharged,

          operationId: this.id,
          operationName: this.name,
          operationVersion: this.version
        }
      };
    } catch (error) {
      console.error('❌ Failed to parse context analysis result:', error);
      console.error('Raw result:', aiResult);

      // Return fallback result
      return {
        narrativeFlow: {
          currentSituationSummary: 'Unable to analyze current situation - using fallback',
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
        },
        metadata: {
          realCostUSD,
          creditsCharged,

          operationId: this.id,
          operationName: this.name,
          operationVersion: this.version
        },
        // Flag for DB tracking - this will mark the operation as FAILED in database
        error: true,
        message: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
