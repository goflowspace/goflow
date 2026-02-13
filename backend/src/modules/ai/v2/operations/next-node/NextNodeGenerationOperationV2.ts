// backend/src/modules/ai/v2/operations/next-node/NextNodeGenerationOperationV2.ts
import { AbstractAIOperation } from '../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel } from '../../shared/types';
import { PrecedingNodeData } from '../../types/PrecedingNodeData';

/**
 * Input data for next node generation v2
 */
export interface NextNodeGenerationInputV2 extends AIOperationInput {
  projectId: string;
  userDescription: string;
  currentNodeId: string;
  precedingNodes: PrecedingNodeData[];
  contextAnalysis: {
    narrativeFlow: any;
    contextualElements: any;
    nextNodeRequirements: any;
    styleGuidance: any;
  };
  enrichedContext: {
    worldContext: string;
    characterContext: string;
    plotContext: string;
    thematicContext: string;
    settingDetails: any;
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
  };
  generationOptions: {
    nodeCount: number; // Number of nodes to generate (default: 1)
    targetLength: 'auto' | 'short' | 'medium' | 'long';
    preferredTone: 'auto' | 'dramatic' | 'comedic' | 'mysterious' | 'neutral' | 'action';
    includeChoices: boolean; // Whether to include choice options
    averageWordCount?: number; // Average word count from preceding narrative nodes
  };
}

/**
 * Output data for next node generation v2
 */
export interface NextNodeGenerationOutputV2 extends AIOperationOutput {
  generatedNodes: Array<{
    type: 'narrative' | 'choice';
    title: string;
    content: {
      text: string;
      wordCount: number;
      estimatedReadingTime: number;
    };
    suggestedEntities: string[]; // Entity IDs to attach to this node
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
}

/**
 * Next node generation operation v2
 * Generates the next narrative node(s) based on comprehensive context analysis
 */
export class NextNodeGenerationOperationV2 extends AbstractAIOperation<
  NextNodeGenerationInputV2,
  NextNodeGenerationOutputV2
> {
  readonly id = 'next-node-generation-v2';
  readonly name = 'Next Node Generation V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.7,
        maxTokens: 3000,
        retries: 1,
        timeout: 30000,
        outputFormat: 'json'
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.8,
        maxTokens: 4000,
        retries: 1,
        timeout: 35000,
        outputFormat: 'json'
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.PRO,
        temperature: 0.8,
        maxTokens: 5000,
        retries: 1,
        timeout: 45000,
        outputFormat: 'json'
      }
    },
    requiresStructuredOutput: true
  };

  /**
   * Определяем обязательные поля для JSON валидации
   */
  protected getRequiredJSONFields(): string[] {
    return ['generatedNodes'];
  }

  /**
   * Additional input validation
   */
  protected validateAdditional(input: NextNodeGenerationInputV2): string[] {
    const errors: string[] = [];
    
    if (!Array.isArray(input.precedingNodes)) {
      errors.push('precedingNodes must be an array');
    }
    
    if (!input.contextAnalysis || typeof input.contextAnalysis !== 'object') {
      errors.push('contextAnalysis must be an object');
    }
    
    if (!input.enrichedContext || typeof input.enrichedContext !== 'object') {
      errors.push('enrichedContext must be an object');
    }
    
    if (!input.generationOptions || typeof input.generationOptions !== 'object') {
      errors.push('generationOptions must be an object');
    }
    
    if (typeof input.generationOptions.nodeCount !== 'number' || input.generationOptions.nodeCount < 1) {
      errors.push('generationOptions.nodeCount must be a positive number');
    }

    return errors;
  }

  /**
   * Generate system prompt
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are a master narrative writer and interactive storytelling expert specializing in creating compelling next story nodes that seamlessly continue existing narratives. You excel at maintaining narrative consistency, advancing plots meaningfully, and creating engaging content that respects established context and character development.
</role>

<context>
You are generating the next narrative node(s) in an interactive story based on comprehensive context analysis and enriched project information. Your generated content must flow naturally from the preceding narrative while advancing the story in an engaging and meaningful way.
</context>

<objective>
Create compelling next story node(s) that maintain narrative consistency, advance the plot appropriately, develop characters authentically, and provide an engaging reading experience that respects all established context and requirements.
</objective>

<narrative_generation_principles>
Contextual Continuity:
Ensure seamless flow from preceding narrative content without repetition or contradiction

Character Authenticity:
Maintain consistent character voices, motivations, and behavioral patterns

Plot Advancement:
Move story elements forward in meaningful ways that respect established momentum

Thematic Integration:
Weave relevant themes naturally into the narrative content

World Consistency:
Respect established world rules, environmental details, and cultural elements

Emotional Resonance:
Create emotional engagement that aligns with established tone and mood
</narrative_generation_principles>

<content_creation_guidelines>
TEMPORAL PROGRESSION - CRITICAL:
Your new node MUST advance the timeline forward
NEVER repeat or re-describe events that already happened
Show what happens NEXT chronologically after the most recent narrative

OPENING FLOW:
Start from where the last narrative node ended
If the current node shows an action being completed, show the immediate aftermath
Focus on consequences, reactions, and new developments

NARRATIVE ADVANCEMENT PRIORITIES:
1. Show results of completed actions (if choice→narrative sequence exists)
2. Advance plot with new events, discoveries, or developments  
3. Introduce new challenges or opportunities arising from previous events
4. Develop character responses to changing circumstances

REPETITION AVOIDANCE:
Do NOT re-describe previously established:
- Environmental details already described
- Character emotional states already established  
- Actions already completed in previous nodes
- Situations already explained

FORWARD MOMENTUM REQUIREMENTS:
- Introduce new plot elements or developments
- Show character reactions to consequences of their actions
- Advance time forward (minutes, hours, or longer)
- Create new situations that emerge from previous ones

NARRATIVE STRUCTURE:
Balance action, dialogue, description, and introspection appropriately
Maintain pacing that aligns with context analysis recommendations
Include sensory details for immersion when appropriate

LENGTH CONSISTENCY:
Analyze the word count of preceding narrative nodes to maintain consistency
Match the established pattern of text length in the story
If preceding nodes average 30 words, keep your content around that length
Respect the natural rhythm and pacing established in previous narrative sections

CHARACTER INTEGRATION:
Show character development through actions and thoughts
Use authentic dialogue that matches established character voices
Advance character relationships and dynamics naturally

CONFLICT DEVELOPMENT:
Progress existing conflicts or introduce new tensions as required
Respect established story logic and character motivations
Create meaningful stakes and consequences

WORLD BUILDING:
Incorporate relevant environmental and cultural details
Respect established world rules and consistency
Add authentic details that enhance immersion
</content_creation_guidelines>

<entity_integration_strategy>
HIGH PRIORITY ENTITIES:
Must be naturally integrated into narrative content
Should be referenced in context-appropriate ways
Include in suggestedEntities for node attachment

MEDIUM/LOW PRIORITY ENTITIES:
Consider for inclusion based on narrative flow needs
Use when they enhance authenticity or depth
Include in suggestedEntities if referenced

ENTITY USAGE PRINCIPLES:
Integrate entities organically, not forced
Reference entities in ways that advance narrative purpose
Ensure entity usage aligns with their established characteristics
</entity_integration_strategy>

<choice_integration_handling>
CRITICAL - CHOICE TO NARRATIVE SEQUENCE LOGIC:
Choice nodes represent player decisions that create narrative consequences
The relationship between choice and narrative nodes follows this pattern:
- Choice node (order N): Player decision/action
- Narrative node (order N+1): Execution of that action
- NEW GENERATED NODE: Results and consequences of the executed action

CHOICE EXECUTION ANALYSIS:
1. Identify if any recent choice nodes (order 0-2) exist
2. Check if subsequent narrative nodes already show the action being executed
3. If action is already executed in current/recent narrative, your new node MUST show the RESULTS

CONSEQUENCE REQUIREMENTS:
- If a choice was "Call spaceship to pick me up" and current narrative shows "pressed button, indicator flashing"
- Then NEW node must show: Did spaceship respond? What happened next? What are the consequences?
- NEVER repeat the action execution - show what happens AFTER the action

PROGRESSION RULES:
- Choice → Narrative (execution) → NEW NODE (consequences/results)
- Do NOT repeat previous descriptions or actions
- ALWAYS advance the timeline forward
- Show immediate or delayed results of completed actions
- Create meaningful plot progression, not circular descriptions

EXAMPLES:
BAD: Repeating "indicator was flashing" when that was already established
GOOD: "A distant humming grew louder overhead as the rescue beacon's call was answered"
BAD: Re-describing the same environment or emotional state
GOOD: Showing how the environment or character state changes due to the consequences
</choice_integration_handling>

<output_format>
Respond in JSON format with the following structure:
{
  "generatedNodes": [
    {
      "type": "narrative|choice",
      "title": "engaging_node_title",
      "content": {
        "text": "complete narrative content for the node",
        "wordCount": actual_word_count_number,
        "estimatedReadingTime": reading_time_in_seconds
      },
      "suggestedEntities": ["entity_id_1", "entity_id_2"],
      "metadata": {
        "styleAlignment": {
          "tone": "tone_used_in_generation",
          "mood": "mood_created",
          "perspective": "narrative_perspective_used"
        },
        "narrativeFunction": {
          "plotAdvancement": "none|minor|major",
          "characterDevelopment": "none|minor|major", 
          "conflictProgression": "none|escalation|resolution",
          "thematicRelevance": "none|supporting|central"
        }
      }
    }
  ]
}
</output_format>`;
  }

  /**
   * Generate user prompt
   */
  protected getUserPrompt(input: NextNodeGenerationInputV2, _context: ExecutionContext): string {
    const precedingNodesText = input.precedingNodes.length > 0 
      ? JSON.stringify(input.precedingNodes, null, 2)
      : 'No preceding nodes available';

    const contextAnalysisText = JSON.stringify(input.contextAnalysis, null, 2);
    const enrichedContextText = JSON.stringify(input.enrichedContext, null, 2);
    const generationOptionsText = JSON.stringify(input.generationOptions, null, 2);

    // Analyze the sequence for better guidance
    const sequenceAnalysis = this.analyzeNodeSequence(input.precedingNodes);
    
    // Calculate length guidance from preceding nodes
    const lengthGuidance = this.analyzeLengthPattern(input.precedingNodes, input.generationOptions.averageWordCount);

    return `Generate the next story node(s) based on comprehensive context analysis.

GENERATION OPTIONS:
${generationOptionsText}

SEQUENCE ANALYSIS FOR YOUR GUIDANCE:
${sequenceAnalysis}

LENGTH GUIDANCE:
${lengthGuidance}

PRECEDING NODES (chronological order):
${precedingNodesText}

CONTEXT ANALYSIS:
${contextAnalysisText}

ENRICHED CONTEXT:
${enrichedContextText}

CRITICAL INSTRUCTION FOR THIS SEQUENCE:
Based on the sequence analysis above, your new node must advance the story timeline and show what happens NEXT, not repeat what already happened. Focus on consequences, results, and new developments that emerge from the established situation.

MANDATORY REQUIREMENTS:
1. Do NOT repeat any descriptions or actions from preceding nodes
2. Do NOT re-describe environmental details already established
3. Do NOT repeat character emotional states already conveyed
4. DO advance time forward and show new developments
5. DO show consequences of completed actions
6. DO introduce new plot elements or character developments that emerge from the situation`;
  }

  /**
   * Analyze the sequence of preceding nodes to provide specific guidance
   */
  private analyzeNodeSequence(precedingNodes: Array<{order: number; type: string; text: string}>): string {
    if (precedingNodes.length === 0) {
      return "No preceding context - create an engaging opening scene.";
    }

    // Sort by order to get chronological sequence
    const sortedNodes = [...precedingNodes].sort((a, b) => a.order - b.order);
    const lastNode = sortedNodes[sortedNodes.length - 1];
    const secondToLastNode = sortedNodes.length > 1 ? sortedNodes[sortedNodes.length - 2] : null;

    let analysis = `SEQUENCE PATTERN DETECTED:\n`;

    // Check for choice → narrative pattern
    if (secondToLastNode?.type === 'choice' && lastNode.type === 'narrative') {
      analysis += `🎯 CHOICE→NARRATIVE SEQUENCE IDENTIFIED:
- Choice Action (order ${secondToLastNode.order}): "${secondToLastNode.text}"
- Action Execution (order ${lastNode.order}): Shows the action being performed
- YOUR TASK: Show the RESULTS and CONSEQUENCES of this action

SPECIFIC GUIDANCE FOR THIS SEQUENCE:
The player chose "${secondToLastNode.text}" and the current narrative shows this action being executed.
Your new node MUST show what happens as a direct result of this completed action.
Do NOT repeat the action execution - show what comes AFTER.

FOCUS ON:
- Immediate consequences of the choice
- How the world/characters react to the completed action  
- New developments that emerge from this action
- Next challenges or opportunities that arise\n`;
    } else if (lastNode.type === 'choice') {
      analysis += `🎯 RECENT CHOICE DETECTED:
- Player Action: "${lastNode.text}"
- YOUR TASK: Show this action being executed and its immediate consequences

SPECIFIC GUIDANCE:
Execute the chosen action and show its immediate results in the same node.\n`;
    } else {
      analysis += `📖 NARRATIVE CONTINUATION:
- Last narrative: "${lastNode.text.substring(0, 100)}..."
- YOUR TASK: Continue the story from this point, advancing time and situation

SPECIFIC GUIDANCE:
Build upon the established situation but advance the timeline forward with new events.\n`;
    }

    // Add temporal progression reminder
    analysis += `\n⏰ TEMPORAL PROGRESSION REQUIREMENT:
Your new node represents the NEXT moment in time after all preceding events.
Show progression, change, and forward movement - never repetition or stagnation.`;

    return analysis;
  }

  /**
   * Analyze length pattern from preceding nodes to provide specific length guidance
   */
  private analyzeLengthPattern(precedingNodes: Array<{order: number; type: string; text: string}>, averageWordCount?: number): string {
    const narrativeNodes = precedingNodes.filter(node => node.type === 'narrative' && node.text.trim());
    
    if (narrativeNodes.length === 0) {
      return `📏 LENGTH PATTERN ANALYSIS:
- No preceding narrative nodes found
- TARGET: Aim for 30-50 words for a balanced opening
- Write a complete, standalone paragraph that establishes the scene`;
    }

    // Calculate word counts for each narrative node
    const wordCounts = narrativeNodes.map(node => {
      const words = node.text.trim().split(/\s+/).filter(word => word.length > 0).length;
      return { order: node.order, words: words };
    });

    const totalWords = wordCounts.reduce((sum, node) => sum + node.words, 0);
    const calculatedAverage = Math.round(totalWords / wordCounts.length);
    const targetLength = averageWordCount || calculatedAverage;
    
    // Analyze consistency
    const minWords = Math.min(...wordCounts.map(n => n.words));
    const maxWords = Math.max(...wordCounts.map(n => n.words));
    const isConsistent = (maxWords - minWords) <= 15;

    let analysis = `📏 LENGTH PATTERN ANALYSIS:
- Previous narrative nodes: ${narrativeNodes.length}
- Word count range: ${minWords}-${maxWords} words
- Average length: ${calculatedAverage} words
- Target for this node: ${targetLength} words
- Pattern consistency: ${isConsistent ? 'CONSISTENT' : 'VARIABLE'}

🎯 LENGTH INSTRUCTION:
Your generated text should contain approximately ${targetLength} words to match the established pattern.
`;

    if (isConsistent) {
      analysis += `The story maintains a consistent length pattern. Keep your content around ${targetLength} words for narrative flow continuity.`;
    } else {
      analysis += `The story has variable length patterns. Aim for ${targetLength} words while focusing on completing the narrative moment naturally.`;
    }

    // Add specific guidance based on length
    if (targetLength <= 25) {
      analysis += `\n\n📝 SHORT FORMAT GUIDANCE:
- Write concise, impactful sentences
- Focus on one key moment or action
- Avoid lengthy descriptions, prioritize advancement`;
    } else if (targetLength <= 40) {
      analysis += `\n\n📝 MEDIUM FORMAT GUIDANCE:
- Balance description with action
- Include essential details while maintaining pace
- Write 2-3 focused sentences that advance the story`;
    } else {
      analysis += `\n\n📝 LONGER FORMAT GUIDANCE:
- Develop the scene with rich detail
- Include character thoughts or dialogue as appropriate
- Create immersive description while advancing the plot`;
    }

    return analysis;
  }

  /**
   * Parse AI result
   */
  parseResult(aiResult: string, _input: NextNodeGenerationInputV2, realCostUSD: number, creditsCharged: number): NextNodeGenerationOutputV2 {
    console.log('🔍 Raw AI result for node generation:', aiResult.substring(0, 500) + '...');
    
    try {
      // Используем умный парсинг JSON из базового класса
      const parsed = this.parseJSONSafely(aiResult);

      // Process generated nodes
      const generatedNodes = parsed.generatedNodes || [];
      const processedNodes = generatedNodes.map((node: any, index: number) => ({
        type: node.type || 'narrative',
        title: node.title || `Generated Node ${index + 1}`,
        content: {
          text: node.content?.text || 'Generated content not available',
          wordCount: node.content?.wordCount || this.countWords(node.content?.text || ''),
          estimatedReadingTime: node.content?.estimatedReadingTime || Math.ceil((node.content?.wordCount || 50) / 200 * 60)
        },
        suggestedEntities: Array.isArray(node.suggestedEntities) ? node.suggestedEntities : [],
        metadata: {
          confidence: node.metadata?.confidence || 75,
          reasoning: node.metadata?.reasoning || 'Node generated successfully',
          styleAlignment: node.metadata?.styleAlignment || {
            tone: 'neutral',
            mood: 'balanced',
            perspective: 'third_person'
          },
          narrativeFunction: node.metadata?.narrativeFunction || {
            plotAdvancement: 'minor',
            characterDevelopment: 'minor',
            conflictProgression: 'none',
            thematicRelevance: 'supporting'
          }
        }
      }));

      return {
        generatedNodes: processedNodes,
        metadata: {
          realCostUSD,
          creditsCharged,

          operationId: this.id,
          operationName: this.name,
          operationVersion: this.version
        }
      };
    } catch (error) {
      console.error('❌ Failed to parse node generation result:', error);
      console.error('Raw result:', aiResult);

      // Return fallback result with error flag for DB tracking
      const fallbackNode = {
        type: 'narrative' as const,
        title: 'Generated Node',
        content: {
          text: 'Unable to generate content - using fallback. Please try again.',
          wordCount: 10,
          estimatedReadingTime: 3
        },
        suggestedEntities: [],
        metadata: {
          confidence: 30,
          reasoning: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          styleAlignment: {
            tone: 'neutral',
            mood: 'balanced',
            perspective: 'third_person'
          },
          narrativeFunction: {
            plotAdvancement: 'none' as const,
            characterDevelopment: 'none' as const,
            conflictProgression: 'none' as const,
            thematicRelevance: 'none' as const
          }
        },
        // Flag for database tracking - operation had parsing error but returned fallback
        error: true,
        message: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      return {
        generatedNodes: [fallbackNode],
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

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
