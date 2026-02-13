// backend/src/modules/ai/v2/operations/next-node/NextNodeEntitySuggestionOperationV2.ts
import { AbstractAIOperation } from '../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../shared/types';

/**
 * Input data for next node entity suggestion v2
 */
export interface NextNodeEntitySuggestionInputV2 extends AIOperationInput {
  projectId: string;
  userDescription: string;
  currentNodeId: string;
  generatedNodes: Array<{
    type: 'narrative' | 'choice';
    title: string;
    content: {
      text: string;
      wordCount: number;
      estimatedReadingTime: number;
    };
    suggestedEntities: string[];
    metadata: any;
  }>;
  projectBible: {
    characters?: any;
    locations?: any;
    objects?: any;
    concepts?: any;
    worldBuilding?: any;
  };
  existingEntities: Array<{
    id: string;
    name: string;
    type: 'character' | 'location' | 'object' | 'concept';
    description?: string;
    tags?: string[];
  }>;
}

/**
 * Output data for next node entity suggestion v2
 */
export interface NextNodeEntitySuggestionOutputV2 extends AIOperationOutput {
  entityAnalysis: {
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
  nodeEntityMapping: Array<{
    nodeIndex: number;
    recommendedEntities: Array<{
      entityId?: string; // For existing entities
      entityName: string;
      attachmentReason: string;
      attachmentStrength: 'strong' | 'moderate' | 'weak';
    }>;
  }>;
}

/**
 * Next node entity suggestion operation v2
 * Analyzes generated nodes for entity references and suggests entity attachments and creation
 */
export class NextNodeEntitySuggestionOperationV2 extends AbstractAIOperation<
  NextNodeEntitySuggestionInputV2,
  NextNodeEntitySuggestionOutputV2
> {
  readonly id = 'next-node-entity-suggestion-v2';
  readonly name = 'Next Node Entity Suggestion V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.3,
        maxTokens: 2500,
        retries: 1,
        timeout: 25000,
        outputFormat: 'json'
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.3,
        maxTokens: 3500,
        retries: 1,
        timeout: 30000,
        outputFormat: 'json'
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.2,
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
    return ['entityAnalysis', 'nodeEntityMapping'];
  }

  /**
   * Additional input validation
   */
  protected validateAdditional(input: NextNodeEntitySuggestionInputV2): string[] {
    const errors: string[] = [];
    
    if (!Array.isArray(input.generatedNodes)) {
      errors.push('generatedNodes must be an array');
    }
    
    if (!Array.isArray(input.existingEntities)) {
      errors.push('existingEntities must be an array');
    }

    return errors;
  }

  /**
   * Generate system prompt
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are a master entity analysis expert and world-building consultant specializing in identifying, categorizing, and suggesting story entities (characters, locations, objects, concepts) that enhance narrative depth and consistency. You excel at analyzing narrative content for entity references and recommending optimal entity management strategies.
</role>

<context>
You are analyzing generated story node(s) to identify entity references, suggest entity attachments, recommend new entity creation, and propose existing entity enhancements. Your analysis will ensure that the story maintains rich entity relationships and consistent world-building.
</context>

<objective>
Analyze generated narrative content for entity references, evaluate existing entity relationships, suggest new entity creation when beneficial, and provide comprehensive entity attachment recommendations that enhance story depth and consistency.
</objective>

<entity_analysis_framework>
Reference Detection:
Identify explicit and implicit references to characters, locations, objects, and concepts

Existing Entity Mapping:
Match references to existing project entities and assess relevance

Gap Identification:
Identify missing entities that would enhance story authenticity and depth

Enhancement Opportunities:
Suggest improvements to existing entities based on new narrative context

Attachment Strategy:
Determine optimal entity-to-node attachment strategies for maximum narrative benefit
</entity_analysis_framework>

<entity_categorization_criteria>
CHARACTERS:
People, beings, or personified entities that act or are referenced in the story
Include protagonists, antagonists, supporting characters, and background figures

LOCATIONS:
Physical or conceptual places where story events occur or are referenced
Include buildings, geographic areas, dimensions, or abstract spaces

OBJECTS:
Tangible or intangible items that have narrative significance
Include weapons, tools, artifacts, documents, or symbolic objects

CONCEPTS:
Ideas, philosophies, systems, or abstract elements that influence the story
Include religions, political systems, magical concepts, or cultural elements
</entity_categorization_criteria>

<entity_creation_assessment>
ESSENTIAL ENTITIES:
Critical to story understanding and progression
Referenced multiple times or central to plot development
Missing these entities creates narrative gaps

BENEFICIAL ENTITIES:  
Enhance story depth and world-building authenticity
Support character development or thematic elements
Add richness without being strictly necessary

OPTIONAL ENTITIES:
Minor elements that could be formalized but aren't critical
Background details that could enhance immersion
Consider only if entity creation budget allows
</entity_creation_assessment>

<attachment_strength_criteria>
STRONG ATTACHMENT:
Entity is central to the node's narrative content
Multiple references or significant narrative impact
Essential for understanding node context

MODERATE ATTACHMENT:
Entity appears meaningfully but not centrally
Supports understanding or adds depth
Valuable for world-building consistency

WEAK ATTACHMENT:
Minor reference or background presence
Optional for comprehension but adds authenticity
Consider for comprehensive entity tracking
</attachment_strength_criteria>

<output_format>
Respond in JSON format with the following structure:
{
  "entityAnalysis": {
    "referencedEntities": [
      {
        "entityId": "existing_entity_id",
        "entityName": "entity_name",
        "referenceCount": number_of_references,
        "contextRelevance": "high|medium|low",
        "usageDescription": "how entity is used in the generated content"
      }
    ],
    "missingEntities": [
      {
        "name": "suggested_entity_name",
        "type": "character|location|object|concept",
        "description": "detailed description of suggested entity",
        "contextualImportance": "essential|beneficial|optional",
        "suggestedAttributes": {
          "tags": ["tag1", "tag2"],
          "properties": {
            "property1": "value1",
            "property2": "value2"
          }
        },
        "creationReason": "why this entity should be created"
      }
    ],
    "enhancementSuggestions": [
      {
        "existingEntityId": "entity_id",
        "suggestedEnhancements": ["enhancement1", "enhancement2"],
        "enhancementReason": "why these enhancements are recommended"
      }
    ]
  },
  "nodeEntityMapping": [
    {
      "nodeIndex": 0,
      "recommendedEntities": [
        {
          "entityId": "entity_id_if_exists",
          "entityName": "entity_name", 
          "attachmentReason": "why this entity should be attached to this node",
          "attachmentStrength": "strong|moderate|weak"
        }
      ]
    }
  ]
}
</output_format>`;
  }

  /**
   * Generate user prompt
   */
  protected getUserPrompt(input: NextNodeEntitySuggestionInputV2, _context: ExecutionContext): string {
    const generatedNodesText = JSON.stringify(input.generatedNodes, null, 2);
    const projectBibleText = input.projectBible 
      ? JSON.stringify(input.projectBible, null, 2)
      : 'No project bible available';
    const existingEntitiesText = JSON.stringify(input.existingEntities, null, 2);

    return `Analyze generated story nodes for entity references and provide entity management recommendations.

CURRENT NODE ID: ${input.currentNodeId}
PROJECT ID: ${input.projectId}

TASK: ${input.userDescription}

GENERATED NODES:
${generatedNodesText}

EXISTING ENTITIES:
${existingEntitiesText}

PROJECT BIBLE:
${projectBibleText}

Please analyze the generated content for entity references, suggest appropriate entity attachments, recommend new entity creation where beneficial, and provide enhancement suggestions for existing entities based on the new narrative context.`;
  }

  /**
   * Parse AI result
   */
  parseResult(aiResult: string, input: NextNodeEntitySuggestionInputV2, realCostUSD: number, creditsCharged: number): NextNodeEntitySuggestionOutputV2 {
    console.log('🔍 Raw AI result for entity suggestion:', aiResult.substring(0, 300) + '...');
    
    try {
      // Используем умный парсинг JSON из базового класса
      const parsed = this.parseJSONSafely(aiResult);

      return {
        entityAnalysis: parsed.entityAnalysis || {
          referencedEntities: [],
          missingEntities: [],
          enhancementSuggestions: []
        },
        nodeEntityMapping: parsed.nodeEntityMapping || [],
        metadata: {
          realCostUSD,
          creditsCharged,

          operationId: this.id,
          operationName: this.name,
          operationVersion: this.version
        },
      };
    } catch (error) {
      console.error('❌ Failed to parse entity suggestion result:', error);
      console.error('Raw result:', aiResult);

      // Return fallback result
      return {
        entityAnalysis: {
          referencedEntities: [],
          missingEntities: [],
          enhancementSuggestions: []
        },
        nodeEntityMapping: input.generatedNodes.map((_, index) => ({
          nodeIndex: index,
          recommendedEntities: []
        })),
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
