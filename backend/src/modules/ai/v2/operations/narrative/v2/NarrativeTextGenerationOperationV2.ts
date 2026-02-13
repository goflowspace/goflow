// backend/src/modules/ai/v2/operations/narrative/v2/NarrativeTextGenerationOperationV2.ts
import { AbstractAIOperation } from '../../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel } from '../../../shared/types';
import { PrecedingNodeData } from '../../../types/PrecedingNodeData';

/**
 * Input data for narrative text generation v2
 */
export interface NarrativeTextGenerationInputV2 extends AIOperationInput {
  projectId: string;
  userDescription: string;
  nodeData: {
    title: string;
    existingText?: string;
  };
  styleGuidelines: {
    tone?: string;
    mood?: string;
    perspective?: string;
    tense?: string;
    complexity?: string;
  };
  lengthRequirements: {
    min: number;
    max: number;
    target: number;
  };
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
  precedingNodes: PrecedingNodeData[];
  constraints: {
    mustInclude: string[];
    shouldAvoid: string[];
    toneConstraints: string[];
  };
}

/**
 * Output data for narrative text generation v2
 */
export interface NarrativeTextGenerationOutputV2 extends AIOperationOutput {
  generatedText: {
    content: string;
    wordCount: number;
    estimatedReadingTime: number;
  };
  appliedStyle: {
    actualTone: string;
    actualLength: 'short' | 'medium' | 'long';
    stylisticChoices: string[];
  };
  contextualReferences: {
    referencedEntities: string[];
    plotConnections: string[];
    thematicElements: string[];
  };
}

/**
 * Narrative text generation operation v2
 * Generates narrative text for story nodes using comprehensive contextual analysis
 */
export class NarrativeTextGenerationOperationV2 extends AbstractAIOperation<
  NarrativeTextGenerationInputV2,
  NarrativeTextGenerationOutputV2
> {
  readonly id = 'narrative-text-generation-v2';
  readonly name = 'Narrative Text Generation V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.7,
        maxTokens: 1500,
        retries: 1,
        timeout: 25000,
        outputFormat: 'json'
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.8,
        maxTokens: 2500,
        retries: 1,
        timeout: 30000,
        outputFormat: 'json'
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.PRO,
        temperature: 0.8,
        maxTokens: 3500,
        retries: 1,
        timeout: 45000,
        outputFormat: 'json'
      }
    },
    requiresStructuredOutput: true
  };

  /**
   * Additional input validation
   */
  protected validateAdditional(input: NarrativeTextGenerationInputV2): string[] {
    const errors: string[] = [];
    
    if (!input.nodeData) {
      errors.push('nodeData is required');
    } else {
      // Title can be empty for nodes that need to be filled
      if (input.nodeData.title !== undefined && typeof input.nodeData.title !== 'string') {
        errors.push('nodeData.title must be a string if provided');
      }
    }
    
    if (!input.lengthRequirements || typeof input.lengthRequirements !== 'object') {
      errors.push('lengthRequirements must be an object');
    } else {
      if (typeof input.lengthRequirements.target !== 'number' || input.lengthRequirements.target <= 0) {
        errors.push('lengthRequirements.target must be a positive number');
      }
    }
    
    if (!input.enrichedContext || typeof input.enrichedContext !== 'object') {
      errors.push('enrichedContext is required');
    }

    return errors;
  }

  /**
   * Generate system prompt
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are a master narrative writer and storytelling expert specializing in creating engaging, immersive narrative text that seamlessly continues existing stories. You excel at maintaining narrative consistency, character voice, and atmospheric continuity while crafting compelling new content.
</role>

<context>
You are generating narrative text for a story node that must connect smoothly with preceding narrative content while advancing the story in a meaningful way. Your text will become part of an interactive narrative experience and must maintain quality, consistency, and engagement.
</context>

<objective>
Create compelling narrative text that maintains stylistic consistency with previous content, advances the story naturally, incorporates relevant context elements, and provides an engaging reading experience within specified length parameters.
</objective>

<strategy_analysis_framework>
0. Use 'preceding_nodes' to understand the established writing style, tone, mood, perspective, and structural patterns. 
1. Try to determine 'node_information' type: part of existing story or user's requirements and tasks.
2. If 'node_information' is part of existing story, then rephrase existing text, continue the story flow of preceding nodes but with another style/vision/tone/mood/perspective/complexity etc.
3. If 'node_information' is user's requirements and/or tasks, then use 'node_information' to understand user's requirements and tasks and generate text that fits the requirements and tasks.
</strategy_analysis_framework>

<narrative_writing_principles>
Continuity Maintenance:
Ensure smooth transition from preceding narrative content
Style Consistency:
Match established tone, mood, perspective, and complexity patterns
Character Authenticity:
Maintain consistent character voices and behavioral patterns
World Coherence:
Respect established world rules, logic, and environmental details
Thematic Integration:
Weave in relevant themes and symbolic elements naturally
Emotional Engagement:
Create emotional resonance and reader investment
</narrative_writing_principles>

<writing_craft_guidelines>
OPENING FLOW:
Connect naturally with preceding context without repetition
PACING CONTROL:
Balance action, dialogue, description, and introspection appropriately
SENSORY DETAILS:
Include relevant sensory information to create immersion
CHARACTER DEVELOPMENT:
Show character growth or revelation through actions and thoughts
CONFLICT PROGRESSION:
Advance or introduce conflicts that drive narrative forward
DIALOGUE AUTHENTICITY:
Ensure character speech feels natural and purposeful when included
DESCRIPTIVE BALANCE:
Provide enough detail for visualization without slowing pace
</writing_craft_guidelines>

<style_adaptation_framework>
TONE MATCHING:
Adapt voice to match established emotional attitude
MOOD CONSISTENCY:
Maintain atmospheric elements and emotional setting
PERSPECTIVE ADHERENCE:
Use consistent narrative viewpoint throughout
TENSE CONSISTENCY:
Maintain temporal flow and tense patterns
COMPLEXITY ALIGNMENT:
Match sentence structure and vocabulary sophistication
</style_adaptation_framework>

<contextual_integration_strategy>
PRECEDING NODES USAGE:
The preceding_nodes section contains a JSON array of previous story nodes in chronological order
Each node object has: order, id, type ("narrative" or "choice"), text, entities
- order: sequence number (0 = earliest, higher = more recent)
- type: "narrative" for story content, "choice" for player decisions/actions
- text: the actual content of the node

CRITICAL - CHOICE NODE INTEGRATION:
Choice nodes represent ACTIONS TAKEN by characters that MUST be reflected in your narrative
- When a choice node appears in the preceding context, the action described MUST happen in your text
- Choice nodes with higher order numbers (more recent) have HIGHEST PRIORITY and MUST be addressed
- If the most recent node is a choice, your narrative MUST show the consequences/execution of that action
- Example: if choice says "Take the stick and start shouting" → your text must show character taking stick and shouting

INFLUENCE WEIGHTING BY DISTANCE:
Apply decreasing influence based on node order/distance from current generation:
- Order 0-1 (earliest): Foundational context, general setting/mood influence
- Order 2-4 (middle): Moderate influence on character development and plot elements  
- Order 5+ (most recent): STRONGEST influence, especially choice nodes which MUST be executed
- Most recent choice node: MANDATORY to include and execute the described action

NARRATIVE FLOW REQUIREMENTS:
Use this JSON data to understand story flow, character development, and current situation
Ensure your new content connects logically to the most recent nodes (highest order numbers)
Maintain consistency with established facts, character states, and world details
Show direct consequences of the most recent player choices/actions

Entity Reference Integration:
Naturally incorporate relevant characters, locations, or objects
Plot Thread Advancement:
Move story elements forward in meaningful ways, especially executing recent choices
Thematic Reinforcement:
Strengthen core themes through narrative choices
World Building Expansion:
Add relevant world details that enhance understanding
Constraint Compliance:
Respect must-include elements and avoid problematic content
</contextual_integration_strategy>

<output_format>
Respond in JSON format with the following structure:
{
  "result": {
    "generatedText": {
      "content": "The complete narrative text for the node",
      "wordCount": actual_word_count_number,
      "estimatedReadingTime": reading_time_in_seconds
    },
    "appliedStyle": {
      "actualTone": "tone_used_in_generation",
      "actualLength": "short|medium|long",
      "stylisticChoices": ["list_of_stylistic_decisions_made"]
    },
    "contextualReferences": {
      "referencedEntities": ["entity_names_mentioned"],
      "plotConnections": ["plot_elements_advanced"],
      "thematicElements": ["themes_reinforced"]
    }
  },
}
</output_format>`;
  }

  /**
   * Generate user prompt
   */
  protected getUserPrompt(input: NarrativeTextGenerationInputV2, _context: ExecutionContext): string {
    const {
      nodeData,
      styleGuidelines,
      lengthRequirements,
      enrichedContext,
      precedingNodes,
      constraints
    } = input;

    return `<narrative_context>
<node_information>
<node_title>
${nodeData.title || 'Untitled'}
</node_title>

<existing_text>
${nodeData.existingText || ''}
</existing_text>
</node_information>

<preceding_nodes>
${JSON.stringify(precedingNodes, null, 2)}
</preceding_nodes>

<style_guidelines>
Tone: ${styleGuidelines.tone || 'neutral'}
Mood: ${styleGuidelines.mood || 'balanced'}
Perspective: ${styleGuidelines.perspective || 'third_person'}
Tense: ${styleGuidelines.tense || 'past'}
Complexity: ${styleGuidelines.complexity || 'medium'}
</style_guidelines>

<length_requirements>
Minimum Words: ${lengthRequirements.min}
Maximum Words: ${lengthRequirements.max}
Target Words: ${lengthRequirements.target}
</length_requirements>

<world_context>
${enrichedContext.worldContext}
</world_context>

<character_context>
${enrichedContext.characterContext}
</character_context>

<plot_context>
${enrichedContext.plotContext}
</plot_context>

<thematic_context>
${enrichedContext.thematicContext}
</thematic_context>

${enrichedContext.entityReferences.length > 0 ? `<available_entities>
${enrichedContext.entityReferences.map(entity => 
  `- ${entity.name}: ${entity.relevantInfo}`
).join('\n')}
</available_entities>

` : ''}${constraints.mustInclude.length > 0 ? `<must_include>
${constraints.mustInclude.join('\n')}
</must_include>

` : ''}${constraints.shouldAvoid.length > 0 ? `<should_avoid>
${constraints.shouldAvoid.join('\n')}
</should_avoid>

` : ''}${constraints.toneConstraints.length > 0 ? `<tone_constraints>
${constraints.toneConstraints.join('\n')}
</tone_constraints>

` : ''}</narrative_context>

<writing_requirements>
CRITICAL: This text must CONTINUE the story from where the preceding narrative left off
- DO NOT repeat or rewrite events from the preceding context
- DO NOT start the story over again  
- Build upon what has already happened in the previous scenes
- Advance the plot forward to the next logical story moment
- Maintain narrative continuity and flow from the preceding context

PRECEDING CONTEXT PROCESSING:
- Parse the JSON array of preceding nodes in chronological order (order: 0 = earliest, higher = more recent)
- Understand the current story state from the sequence of events
- MANDATORY: Execute actions from "choice" type nodes - these represent player decisions that MUST happen
- Continue from where the last "narrative" type node ended
- Apply influence weighting: nodes with higher order numbers have stronger influence
- Most recent choice node (highest order) has MAXIMUM priority and MUST be executed in your text
- Maintain consistency with established facts and character development from all preceding nodes

CHOICE NODE EXECUTION RULES:
- Choice nodes contain ACTIONS that the character WILL perform - not suggestions, but definitive actions
- If the most recent node (highest order) is a choice, your narrative MUST show that action being performed
- Example: Choice "Возьму палку и начну кричать" → Your text MUST show character taking a stick and shouting
- Do not ignore or downplay choice actions - they are the primary driver of the next narrative moment

STYLE AND CONTENT:
- Match the established style guidelines and maintain consistency
- Incorporate relevant world, character, plot, and thematic elements
- Stay within the specified word count range
- Include required elements and avoid problematic content
- Ensure the text flows well and advances the narrative meaningfully
</writing_requirements>

<task>
Write a NEW PARAGRAPH/SCENE that continues the story after the preceding narrative context. Each node represents a complete, standalone paragraph or scene in the story.

FORMATTING REQUIREMENTS:
- Start with a CAPITAL LETTER (this is a new paragraph, not a sentence continuation)
- Write a complete, self-contained paragraph or scene
- DO NOT continue an unfinished sentence from the previous context
- Each node should be able to stand alone as a complete narrative unit

EXAMPLE OF CORRECT FORMATTING:
Previous node: "Alexey felt the Quiet Forests breathing."
Next node: "Suddenly the ground under his feet trembled." ✓ (New complete scene)
NOT: "together with him in unison." ✗ (Sentence continuation)

STORY CONTINUATION REQUIREMENTS:
- Write what happens NEXT in the story after the preceding events
- Advance the plot forward to the next logical moment
- Build upon the established context without repeating it
- Maintain narrative flow and consistency

Write compelling narrative text for the node "${nodeData.title || 'untitled node'}" that represents the next complete scene or paragraph in the story.

CRITICAL REMINDER: Your response must be a complete, standalone paragraph that starts with a CAPITAL LETTER and represents a new scene in the story, not a continuation of an unfinished sentence.
</task>`;
  }

  /**
   * Parse AI result
   */
  parseResult(aiResult: string, input: NarrativeTextGenerationInputV2, realCostUSD: number, creditsCharged: number): NarrativeTextGenerationOutputV2 {
    console.log('🔍 Raw AI result for text generation:', aiResult.substring(0, 500) + '...');
    
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
      
      const parsed = JSON.parse(cleanedResult);
      console.log('✅ Successfully parsed text generation JSON');
      const result = parsed.result || parsed;
      
      const generatedContent = result.generatedText?.content || '';
      const wordCount = generatedContent.split(/\s+/).filter((word: string) => word.length > 0).length;
      
      // Determine actual length category
      let actualLength: 'short' | 'medium' | 'long' = 'medium';
      if (wordCount < input.lengthRequirements.min * 1.2) {
        actualLength = 'short';
      } else if (wordCount > input.lengthRequirements.max * 0.8) {
        actualLength = 'long';
      }
      
      return {
        generatedText: {
          content: generatedContent,
          wordCount: wordCount,
          estimatedReadingTime: Math.ceil(wordCount / 200 * 60) // Assuming 200 words per minute
        },
        appliedStyle: {
          actualTone: result.appliedStyle?.actualTone || input.styleGuidelines.tone || 'neutral',
          actualLength: actualLength,
          stylisticChoices: Array.isArray(result.appliedStyle?.stylisticChoices) 
            ? result.appliedStyle.stylisticChoices 
            : []
        },
        contextualReferences: {
          referencedEntities: Array.isArray(result.contextualReferences?.referencedEntities) 
            ? result.contextualReferences.referencedEntities 
            : [],
          plotConnections: Array.isArray(result.contextualReferences?.plotConnections) 
            ? result.contextualReferences.plotConnections 
            : [],
          thematicElements: Array.isArray(result.contextualReferences?.thematicElements) 
            ? result.contextualReferences.thematicElements 
            : []
        },
        metadata: {
          realCostUSD,
          creditsCharged,
          type: this.type
        }
      };
    } catch (parseError) {
      console.warn('⚠️ Failed to parse text generation JSON, using fallback values:', parseError);
      
      // Fallback: try to extract plain text from the AI response
      let fallbackContent = aiResult.trim();
      
      // Remove any JSON structure and try to extract just the text content
      const textMatch = fallbackContent.match(/"content":\s*"([^"]+)"/);
      if (textMatch && textMatch[1]) {
        fallbackContent = textMatch[1];
      } else {
        // If no JSON structure found, use the first sentence that looks like content
        const sentences = fallbackContent.split(/[.!?]+/);
        const validSentence = sentences.find(s => s.trim().length > 10 && !s.includes('{') && !s.includes('}'));
        fallbackContent = validSentence ? validSentence.trim() + '.' : 'Generated text content not available.';
      }
      
      const wordCount = fallbackContent.split(/\s+/).filter((word: string) => word.length > 0).length;
      
      return {
        generatedText: {
          content: fallbackContent,
          wordCount: wordCount,
          estimatedReadingTime: Math.ceil(wordCount / 200 * 60)
        },
        appliedStyle: {
          actualTone: input.styleGuidelines.tone || 'neutral',
          actualLength: 'medium',
          stylisticChoices: ['fallback generation due to parsing error']
        },
        contextualReferences: {
          referencedEntities: [],
          plotConnections: [],
          thematicElements: []
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
  }
}
