// backend/src/modules/ai/v2/operations/narrative/v2/ProjectContextEnrichmentOperationV2.ts
import { AbstractAIOperation } from '../../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../../shared/types';

/**
 * Input data for project context enrichment v2
 */
export interface ProjectContextEnrichmentInputV2 extends AIOperationInput {
  projectId: string;
  userDescription: string;
  currentNodeData: {
    title: string;
    attachedEntities?: string[];
  };
  projectBible: {
    synopsis?: string;
    logline?: string;
    setting?: string;
    atmosphere?: string;
    mainThemes?: string;
    genres?: string[];
    targetAudience?: string;
    references?: string;
    uniqueFeatures?: string;
    visualStyle?: string;
    constraints?: string;
  };
  precedingContext: string;
}

/**
 * Output data for project context enrichment v2
 */
export interface ProjectContextEnrichmentOutputV2 extends AIOperationOutput {
  enrichedContext: {
    worldContext: string;
    characterContext: string;
    plotContext: string;
    thematicContext: string;
    entityReferences: Array<{
      id: string;
      name: string;
      relevantInfo: string;
    }>;
  };
  contextualConstraints: {
    mustInclude: string[];
    shouldAvoid: string[];
    toneConstraints: string[];
  };
}

/**
 * Project context enrichment operation v2
 * Enriches narrative context with project bible data and entity information
 */
export class ProjectContextEnrichmentOperationV2 extends AbstractAIOperation<
  ProjectContextEnrichmentInputV2,
  ProjectContextEnrichmentOutputV2
> {
  readonly id = 'project-context-enrichment-v2';
  readonly name = 'Project Context Enrichment V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.4,
        maxTokens: 2500,
        retries: 1,
        timeout: 20000,
        outputFormat: 'json'
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.4,
        maxTokens: 3500,
        retries: 1,
        timeout: 25000,
        outputFormat: 'json'
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.3,
        maxTokens: 4500,
        retries: 1,
        timeout: 40000,
        outputFormat: 'json'
      }
    },
    requiresStructuredOutput: true
  };

  /**
   * Additional input validation
   */
  protected validateAdditional(input: ProjectContextEnrichmentInputV2): string[] {
    const errors: string[] = [];
    
    if (!input.currentNodeData || typeof input.currentNodeData !== 'object') {
      errors.push('currentNodeData must be an object');
    } else {
      // Title can be empty for nodes that need to be filled
      if (input.currentNodeData.title !== undefined && typeof input.currentNodeData.title !== 'string') {
        errors.push('currentNodeData.title must be a string if provided');
      }
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
You are an expert narrative context specialist and world-building analyst who excels at synthesizing project information into coherent, actionable context for story development. You specialize in connecting project elements to create rich narrative environments.
</role>

<context>
You are enriching narrative context by integrating project bible information, world details, character elements, and thematic content. This enriched context will support AI text generation by providing comprehensive background information and narrative constraints.
</context>

<objective>
Create comprehensive contextual information by analyzing and synthesizing project bible data, entity relationships, and narrative requirements to provide a rich foundation for consistent and thematically aligned narrative text generation.
</objective>

<context_enrichment_framework>
World Building Integration:
Extract and organize world-setting information for environmental context
Character Context Development:
Identify character-relevant information and relationship dynamics
Plot Context Synthesis:
Connect story elements and thematic threads for narrative coherence
Thematic Context Formation:
Establish thematic guidelines and symbolic consistency
Entity Reference Processing:
Organize attached entity information for relevant inclusion
</context_enrichment_framework>

<enrichment_categories>
WORLD CONTEXT:
Setting details, environmental factors, cultural elements, historical background
CHARACTER CONTEXT:
Character presence, relationships, motivations, background elements
PLOT CONTEXT:
Story progression, conflict elements, narrative threads, dramatic tension
THEMATIC CONTEXT:
Core themes, symbolic elements, message consistency, emotional undercurrents
ENTITY REFERENCES:
Available characters, locations, objects, or concepts for potential inclusion
</enrichment_categories>

<constraint_identification>
MUST INCLUDE Elements:
Critical story components that should appear in generated text
SHOULD AVOID Elements:
Contradictory or problematic content to exclude
TONE CONSTRAINTS:
Emotional and stylistic guidelines based on project atmosphere
THEMATIC CONSTRAINTS:
Theme consistency requirements and symbolic considerations
</constraint_identification>

<synthesis_principles>
Consistency Maintenance:
Ensure all context elements align with established project canon
Relevance Filtering:
Focus on information directly applicable to current narrative moment
Depth Balancing:
Provide sufficient detail without overwhelming the generation process
Creative Flexibility:
Maintain creative space while providing necessary guidance
</synthesis_principles>

<output_format>
Respond in JSON format with the following structure:
{
  "result": {
    "enrichedContext": {
      "worldContext": "comprehensive_world_setting_information",
      "characterContext": "relevant_character_and_relationship_information", 
      "plotContext": "story_progression_and_narrative_thread_information",
      "thematicContext": "thematic_guidelines_and_symbolic_elements",
      "entityReferences": [
        {
          "id": "entity_identifier",
          "name": "entity_name",
          "relevantInfo": "context_relevant_entity_information"
        }
      ]
    },
    "contextualConstraints": {
      "mustInclude": ["critical_elements_to_include"],
      "shouldAvoid": ["elements_to_avoid"],
      "toneConstraints": ["tone_and_style_guidelines"]
    }
  },
}
</output_format>`;
  }

  /**
   * Generate user prompt
   */
  protected getUserPrompt(input: ProjectContextEnrichmentInputV2, _context: ExecutionContext): string {
    const { currentNodeData, projectBible, precedingContext } = input;

    return `<project_information>
<current_node>
Title: ${currentNodeData.title || 'Untitled (to be generated)'}
Attached Entities: ${currentNodeData.attachedEntities?.join(', ') || 'None'}
</current_node>

<project_bible>
Synopsis: ${projectBible.synopsis || 'Not provided'}
Logline: ${projectBible.logline || 'Not provided'}
Setting: ${projectBible.setting || 'Not provided'}
Atmosphere: ${projectBible.atmosphere || 'Not provided'}
Main Themes: ${projectBible.mainThemes || 'Not provided'}
Genres: ${Array.isArray(projectBible.genres) ? projectBible.genres.join(', ') : 'Not provided'}
Target Audience: ${projectBible.targetAudience || 'Not provided'}
References: ${projectBible.references || 'Not provided'}
Unique Features: ${projectBible.uniqueFeatures || 'Not provided'}
Visual Style: ${projectBible.visualStyle || 'Not provided'}
Constraints: ${projectBible.constraints || 'Not provided'}
</project_bible>

<narrative_context>
Preceding Story Context: ${precedingContext || 'No preceding context available'}
</narrative_context>
</project_information>

<enrichment_requirements>
Extract and organize world-building information relevant to the current narrative moment
Identify character and relationship context that should inform the new text
Synthesize plot progression and thematic elements for narrative coherence
Create constraints that ensure consistency with project vision and established canon
Identify opportunities for entity integration and reference inclusion
Consider genre expectations and atmospheric requirements
</enrichment_requirements>

<task>
Enrich the narrative context by synthesizing project bible information, entity data, and preceding narrative content into comprehensive context guidelines for generating consistent and thematically aligned narrative text.
</task>`;
  }

  /**
   * Parse AI result
   */
  parseResult(aiResult: string, input: ProjectContextEnrichmentInputV2, realCostUSD: number, creditsCharged: number): ProjectContextEnrichmentOutputV2 {
    console.log('🔍 Raw AI result for context enrichment:', aiResult.substring(0, 500) + '...');
    
    let parsed: any = null;
    
    try {
      // Try to clean and parse the JSON
      let cleanedResult = aiResult.trim();
      
      // Remove any potential markdown code blocks
      cleanedResult = cleanedResult.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON object boundaries
      const jsonStart = cleanedResult.indexOf('{');
      const jsonEnd = cleanedResult.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        cleanedResult = cleanedResult.substring(jsonStart, jsonEnd + 1);
      }
      
      parsed = JSON.parse(cleanedResult);
      console.log('✅ Successfully parsed context enrichment JSON');
      
    } catch (parseError) {
      console.warn('⚠️ Failed to parse context enrichment JSON, using fallback values:', parseError);
      
      // Fallback: return safe default values instead of throwing
      return {
        enrichedContext: {
          worldContext: `Based on project context: ${input.projectBible?.setting || 'science fiction setting'}`,
          characterContext: `Main character context involving: ${input.currentNodeData?.title || 'protagonist'}`,
          plotContext: 'Story progression continues with established narrative elements',
          thematicContext: `Themes: ${input.projectBible?.mainThemes || 'survival, technology, humanity'}`,
          entityReferences: input.currentNodeData?.attachedEntities?.map(entity => ({
            id: entity,
            name: entity,
            relevantInfo: `Entity reference: ${entity}`
          })) || []
        },
        contextualConstraints: {
          mustInclude: [],
          shouldAvoid: ['inconsistency with established world'],
          toneConstraints: [`Maintain ${input.projectBible?.atmosphere || 'atmospheric'} tone`]
        },
        metadata: {
          realCostUSD,
          creditsCharged,
          type: this.type
        },
        // Flag for DB tracking - this will mark the operation as FAILED in database
        error: true,
        message: `AI parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      };
    }
    
    const result = parsed.result || parsed;
    
    return {
      enrichedContext: {
        worldContext: result.enrichedContext?.worldContext || 'Standard narrative world setting',
        characterContext: result.enrichedContext?.characterContext || 'Character context not specified',
        plotContext: result.enrichedContext?.plotContext || 'Plot progression context not specified',
        thematicContext: result.enrichedContext?.thematicContext || 'Thematic context not specified',
        entityReferences: Array.isArray(result.enrichedContext?.entityReferences) 
          ? result.enrichedContext.entityReferences 
          : []
      },
      contextualConstraints: {
        mustInclude: Array.isArray(result.contextualConstraints?.mustInclude) 
          ? result.contextualConstraints.mustInclude 
          : [],
        shouldAvoid: Array.isArray(result.contextualConstraints?.shouldAvoid) 
          ? result.contextualConstraints.shouldAvoid 
          : [],
        toneConstraints: Array.isArray(result.contextualConstraints?.toneConstraints) 
          ? result.contextualConstraints.toneConstraints 
          : []
      },
      metadata: {
        realCostUSD,
        creditsCharged,
        type: this.type
      }
    };
  }
}
