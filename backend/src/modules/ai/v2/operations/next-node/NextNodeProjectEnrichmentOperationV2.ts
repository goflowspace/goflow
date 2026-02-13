// backend/src/modules/ai/v2/operations/next-node/NextNodeProjectEnrichmentOperationV2.ts
import { AbstractAIOperation } from '../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../shared/types';

/**
 * Input data for next node project enrichment v2
 */
export interface NextNodeProjectEnrichmentInputV2 extends AIOperationInput {
  projectId: string;
  userDescription: string;
  currentNodeId: string;
  contextAnalysis: {
    narrativeFlow: any;
    contextualElements: any;
    nextNodeRequirements: any;
    styleGuidance: any;
  };
  projectBible: {
    atmosphere?: string;
    themes?: string;
    visualStyle?: string;
    genres?: string[];
    setting?: string;
    storyStructure?: string;
    characters?: any;
    locations?: any;
    worldBuilding?: any;
    plotOutlines?: any;
  };
}

/**
 * Output data for next node project enrichment v2
 */
export interface NextNodeProjectEnrichmentOutputV2 extends AIOperationOutput {
  worldContext: string;
  characterContext: string;
  plotContext: string;
  thematicContext: string;
  settingDetails: {
    environmentDescription: string;
    moodInfluence: string;
    availableElements: string[];
  };
  entityReferences: Array<{
    id: string;
    name: string;
    type: 'character' | 'location' | 'object' | 'concept';
    relevantInfo: string;
    suggestionStrength: 'high' | 'medium' | 'low';
  }>;
  constraintsAndGuidelines: {
    mustInclude: string[];
    shouldAvoid: string[];
    toneConstraints: string[];
    contentGuidelines: string[];
  };
}

/**
 * Next node project enrichment operation v2
 * Enriches the narrative context with detailed project bible information and entity references
 */
export class NextNodeProjectEnrichmentOperationV2 extends AbstractAIOperation<
  NextNodeProjectEnrichmentInputV2,
  NextNodeProjectEnrichmentOutputV2
> {
  readonly id = 'next-node-project-enrichment-v2';
  readonly name = 'Next Node Project Enrichment V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.3,
        maxTokens: 3000,
        retries: 1,
        timeout: 20000,
        outputFormat: 'json'
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.3,
        maxTokens: 4000,
        retries: 1,
        timeout: 25000,
        outputFormat: 'json'
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.2,
        maxTokens: 5000,
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
    return ['worldContext', 'characterContext', 'plotContext', 'thematicContext', 'settingDetails', 'entityReferences', 'constraintsAndGuidelines'];
  }

  /**
   * Additional input validation
   */
  protected validateAdditional(input: NextNodeProjectEnrichmentInputV2): string[] {
    const errors: string[] = [];
    
    if (!input.contextAnalysis || typeof input.contextAnalysis !== 'object') {
      errors.push('contextAnalysis must be an object');
    }
    
    if (!input.projectBible || typeof input.projectBible !== 'object') {
      errors.push('projectBible must be an object');
    }

    return errors;
  }

  /**
   * Generate system prompt
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are a master world-building consultant and narrative continuity expert specializing in enriching story contexts with detailed project bible information. You excel at identifying relevant world elements, character details, and thematic connections that enhance narrative authenticity and depth.
</role>

<context>
You are enriching a narrative context analysis with detailed information from the project bible to provide comprehensive guidance for generating the next story node. Your enrichment will ensure the new content is deeply integrated with the established world, characters, themes, and story elements.
</context>

<objective>
Analyze the project bible and context requirements to provide enriched contextual information that will guide the creation of a next story node that is authentic to the established world, consistent with character development, and aligned with thematic and plot progression needs.
</objective>

<enrichment_framework>
World Context Integration:
Extract relevant world-building details that influence the current situation

Character Context Development:
Identify character information relevant to next node requirements

Plot Context Enhancement:
Connect story progression needs with established plot elements

Thematic Context Weaving:
Align thematic development opportunities with project themes

Setting Detail Extraction:
Provide environmental and atmospheric guidance from bible

Entity Reference Mapping:
Identify relevant entities (characters, locations, objects) for potential inclusion
</enrichment_framework>

<bible_analysis_strategy>
RELEVANCE FILTERING:
Prioritize bible information that directly relates to context analysis requirements
Focus on elements that can enhance the next node's authenticity and depth

ENTITY IDENTIFICATION:
Scan for characters, locations, objects, and concepts relevant to current narrative state
Assess suggestion strength based on context requirements and narrative flow

CONSTRAINT EXTRACTION:
Identify content guidelines, tone requirements, and creative boundaries
Extract must-include elements and content to avoid

THEMATIC ALIGNMENT:
Connect identified themes with specific thematic development opportunities
Provide guidance for thematic reinforcement in next node

WORLD CONSISTENCY:
Ensure recommendations maintain established world rules and logic
Provide environmental and cultural context for next node setting
</bible_analysis_strategy>

<entity_suggestion_criteria>
HIGH PRIORITY ENTITIES:
Directly relevant to current narrative requirements
Essential for plot advancement or character development
Required by context analysis recommendations

MEDIUM PRIORITY ENTITIES:
Relevant to current situation but not immediately essential
Could enhance narrative depth or world-building
Support thematic development or atmospheric goals

LOW PRIORITY ENTITIES:
Potentially relevant but not immediately necessary
Background elements that could add authenticity
Optional world-building details
</entity_suggestion_criteria>

<output_format>
Respond in JSON format with the following structure:
{
  "worldContext": "comprehensive world-building context relevant to next node",
  "characterContext": "character information and development guidance",
  "plotContext": "plot elements and progression guidance", 
  "thematicContext": "thematic development opportunities and guidance",
  "settingDetails": {
    "environmentDescription": "detailed environmental context for next node",
    "moodInfluence": "how setting should influence mood and atmosphere",
    "availableElements": ["environmental_element_1", "environmental_element_2"]
  },
  "entityReferences": [
    {
      "id": "entity_identifier",
      "name": "entity_name",
      "type": "character|location|object|concept",
      "relevantInfo": "why this entity is relevant and how it could be used",
      "suggestionStrength": "high|medium|low"
    }
  ],
  "constraintsAndGuidelines": {
    "mustInclude": ["required_element_1", "required_element_2"],
    "shouldAvoid": ["avoid_element_1", "avoid_element_2"],
    "toneConstraints": ["tone_guideline_1", "tone_guideline_2"],
    "contentGuidelines": ["content_guideline_1", "content_guideline_2"]
  }
}
</output_format>`;
  }

  /**
   * Generate user prompt
   */
  protected getUserPrompt(input: NextNodeProjectEnrichmentInputV2, _context: ExecutionContext): string {
    const contextAnalysisText = JSON.stringify(input.contextAnalysis, null, 2);
    const projectBibleText = JSON.stringify(input.projectBible, null, 2);

    return `Enrich the narrative context with detailed project bible information for next node generation.

CURRENT NODE ID: ${input.currentNodeId}
PROJECT ID: ${input.projectId}

TASK: ${input.userDescription}

CONTEXT ANALYSIS RESULTS:
${contextAnalysisText}

PROJECT BIBLE:
${projectBibleText}

Please analyze the project bible and provide enriched context information that will guide the creation of an authentic, consistent, and engaging next story node.`;
  }

  /**
   * Parse AI result
   */
  parseResult(aiResult: string, _input: NextNodeProjectEnrichmentInputV2, realCostUSD: number, creditsCharged: number): NextNodeProjectEnrichmentOutputV2 {
    console.log('🔍 Raw AI result for project enrichment:', aiResult.substring(0, 300) + '...');
    
    try {
      // Используем умный парсинг JSON из базового класса
      const parsed = this.parseJSONSafely(aiResult);

      return {
        worldContext: parsed.worldContext || 'World context not available',
        characterContext: parsed.characterContext || 'Character context not available',
        plotContext: parsed.plotContext || 'Plot context not available',
        thematicContext: parsed.thematicContext || 'Thematic context not available',
        settingDetails: parsed.settingDetails || {
          environmentDescription: 'Environment details not available',
          moodInfluence: 'Mood influence not specified',
          availableElements: []
        },
        entityReferences: parsed.entityReferences || [],
        constraintsAndGuidelines: parsed.constraintsAndGuidelines || {
          mustInclude: [],
          shouldAvoid: [],
          toneConstraints: [],
          contentGuidelines: []
        },
        metadata: {
          realCostUSD,
          creditsCharged,

          operationId: this.id,
          operationName: this.name,
          operationVersion: this.version
        },
      };
    } catch (error) {
      console.error('❌ Failed to parse project enrichment result:', error);
      console.error('Raw result:', aiResult);

      // Return fallback result
      return {
        worldContext: 'Failed to enrich world context - using fallback',
        characterContext: 'Failed to enrich character context - using fallback',
        plotContext: 'Failed to enrich plot context - using fallback',
        thematicContext: 'Failed to enrich thematic context - using fallback',
        settingDetails: {
          environmentDescription: 'Environment details unavailable',
          moodInfluence: 'Mood influence unspecified',
          availableElements: []
        },
        entityReferences: [],
        constraintsAndGuidelines: {
          mustInclude: [],
          shouldAvoid: [],
          toneConstraints: [],
          contentGuidelines: []
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
