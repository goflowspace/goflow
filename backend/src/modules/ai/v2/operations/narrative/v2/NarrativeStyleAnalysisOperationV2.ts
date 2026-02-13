// backend/src/modules/ai/v2/operations/narrative/v2/NarrativeStyleAnalysisOperationV2.ts
import { AbstractAIOperation } from '../../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../../shared/types';

/**
 * Input data for narrative style analysis v2
 */
export interface NarrativeStyleAnalysisInputV2 extends AIOperationInput {
  projectId: string;
  userDescription: string;
  precedingNodes: Array<{
    id: string;
    type: 'narrative' | 'choice';
    title: string;
    text: string;
    distance: number;
  }>;
  currentNodeText?: string;
  projectBible?: {
    synopsis?: string;
    setting?: string;
    atmosphere?: string;
    mainThemes?: string;
    genres?: string[];
    message?: string;
    references?: string;
  };
  targetLength: number; // Average length from previous analysis
}

/**
 * Output data for narrative style analysis v2
 */
export interface NarrativeStyleAnalysisOutputV2 extends AIOperationOutput {
  detectedStyle: {
    tone: 'dramatic' | 'comedic' | 'mysterious' | 'neutral' | 'action' | 'romantic' | 'horror' | 'melancholic';
    mood: 'tense' | 'calm' | 'exciting' | 'melancholic' | 'upbeat' | 'dark' | 'light' | 'suspenseful';
    perspective: 'first_person' | 'second_person' | 'third_person' | 'omniscient';
    tense: 'past' | 'present' | 'future' | 'mixed';
    complexity: 'simple' | 'medium' | 'complex';
  };
  stylePatterns: {
    averageSentenceLength: number;
    vocabularyLevel: 'simple' | 'intermediate' | 'advanced';
    usesDialogue: boolean;
    emotionalIntensity: 'low' | 'medium' | 'high';
    descriptiveLevel: 'minimal' | 'moderate' | 'rich';
  };
  recommendedLength: {
    min: number;
    max: number;
    target: number;
  };
}

/**
 * Narrative style analysis operation v2
 * Analyzes the style and tone of preceding narrative nodes to maintain consistency
 */
export class NarrativeStyleAnalysisOperationV2 extends AbstractAIOperation<
  NarrativeStyleAnalysisInputV2,
  NarrativeStyleAnalysisOutputV2
> {
  readonly id = 'narrative-style-analysis-v2';
  readonly name = 'Narrative Style Analysis V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.2,
        maxTokens: 2000,
        retries: 1,
        timeout: 20000,
        outputFormat: 'json'
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.2,
        maxTokens: 3000,
        retries: 1,
        timeout: 25000,
        outputFormat: 'json'
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.1,
        maxTokens: 4000,
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
  protected validateAdditional(input: NarrativeStyleAnalysisInputV2): string[] {
    const errors: string[] = [];
    
    if (!Array.isArray(input.precedingNodes)) {
      errors.push('precedingNodes must be an array');
    }
    
    if (typeof input.targetLength !== 'number' || input.targetLength <= 0) {
      errors.push('targetLength must be a positive number');
    }

    return errors;
  }

  /**
   * Generate system prompt
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are an expert narrative style analyst and literary expert specializing in detecting and categorizing writing styles, tones, and patterns in narrative text. You excel at identifying stylistic consistency patterns that ensure seamless narrative flow.
</role>

<context>
You are analyzing preceding narrative nodes to understand the established writing style, tone, and structural patterns. This analysis will guide the generation of new narrative text that maintains stylistic consistency and narrative cohesion.
</context>

<objective>
Analyze the writing style, tone, mood, perspective, and structural patterns from preceding narrative content to establish clear style guidelines for generating consistent new narrative text.
</objective>

<style_analysis_framework>
Tone Detection:
Identify the emotional attitude and voice of the narrative
Mood Assessment:
Determine the atmospheric and emotional setting
Perspective Analysis:
Identify the narrative viewpoint and voice consistency
Temporal Analysis:
Detect tense patterns and temporal flow
Complexity Evaluation:
Assess sentence structure and vocabulary sophistication
</style_analysis_framework>

<pattern_recognition_criteria>
SENTENCE STRUCTURE:
Average length, complexity, rhythm patterns
VOCABULARY ANALYSIS:
Word choice sophistication, domain-specific language
DIALOGUE USAGE:
Frequency and style of character speech
DESCRIPTIVE DENSITY:
Level of environmental and character description
EMOTIONAL INTENSITY:
Degree of emotional expression and dramatic tension
NARRATIVE FLOW:
Pacing, transitions, and structural coherence
</pattern_recognition_criteria>

<length_recommendation_logic>
Base Calculation:
Use provided target length as foundation
Style Adjustment:
Modify based on detected narrative complexity
Context Consideration:
Account for story moment and dramatic needs
Range Definition:
Establish realistic min/max boundaries around target
</length_recommendation_logic>

<genre_style_considerations>
FANTASY: Rich descriptions, elevated language, world-building focus
SCI-FI: Technical precision, conceptual language, speculative elements
HORROR: Atmospheric tension, psychological undertones, sensory details
ROMANCE: Emotional depth, relationship focus, intimate language
ACTION: Dynamic pacing, concise descriptions, momentum emphasis
DRAMA: Character introspection, emotional nuance, dialogue weight
COMEDY: Light tone, wordplay, timing awareness
</genre_style_considerations>

<output_format>
Respond in JSON format with the following structure:
{
  "result": {
    "detectedStyle": {
      "tone": "dramatic|comedic|mysterious|neutral|action|romantic|horror|melancholic",
      "mood": "tense|calm|exciting|melancholic|upbeat|dark|light|suspenseful",
      "perspective": "first_person|second_person|third_person|omniscient",
      "tense": "past|present|future|mixed",
      "complexity": "simple|medium|complex"
    },
    "stylePatterns": {
      "averageSentenceLength": number_of_words,
      "vocabularyLevel": "simple|intermediate|advanced",
      "usesDialogue": true_or_false,
      "emotionalIntensity": "low|medium|high",
      "descriptiveLevel": "minimal|moderate|rich"
    },
    "recommendedLength": {
      "min": minimum_word_count,
      "max": maximum_word_count,
      "target": target_word_count
    }
  },
}
</output_format>`;
  }

  /**
   * Generate user prompt
   */
  protected getUserPrompt(input: NarrativeStyleAnalysisInputV2, _context: ExecutionContext): string {
    const { precedingNodes, projectBible, targetLength } = input;
    
    const narrativeTexts = precedingNodes
      .filter(node => node.type === 'narrative' && node.text)
      .map(node => `"${node.title}": ${node.text}`)
      .join('\n\n');

    return `<narrative_context>
<preceding_texts>
${narrativeTexts || 'No preceding narrative texts available'}
</preceding_texts>

<project_context>
<synopsis>
 ${projectBible?.synopsis || ''}
</synopsis>

<setting>
 ${projectBible?.setting || ''}
</setting>

<themes>
 ${projectBible?.mainThemes || ''}
</themes>

<genres>
 ${projectBible?.genres || ''}
</genres>

<message>
 ${projectBible?.message || ''}
</message>

<references>
 ${projectBible?.references || ''}
</references>
</project_context>

<length_baseline>
Current Target Length: ${targetLength} words
</length_baseline>
</narrative_context>

<analysis_requirements>
Analyze the writing style, tone, and patterns from the preceding narrative texts
Identify consistent stylistic elements that should be maintained
Determine appropriate length recommendations based on existing patterns
Consider project context and genre expectations
Provide detailed reasoning for all style classifications
</analysis_requirements>

<task>
Perform comprehensive style analysis of the preceding narrative content to establish clear guidelines for generating stylistically consistent new narrative text.
</task>`;
  }

  /**
   * Parse AI result
   */
  parseResult(aiResult: string, input: NarrativeStyleAnalysisInputV2, realCostUSD: number, creditsCharged: number): NarrativeStyleAnalysisOutputV2 {
    console.log('🔍 Raw AI result for style analysis:', aiResult.substring(0, 300) + '...');
    
    // Provide fallback values based on input
    const fallbackLength = {
      min: Math.max(20, Math.floor(input.targetLength * 0.7)),
      max: Math.ceil(input.targetLength * 1.5),
      target: input.targetLength
    };
    
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
      const result = parsed.result || parsed;
      console.log('✅ Successfully parsed style analysis JSON');
      
      return {
        detectedStyle: {
          tone: result.detectedStyle?.tone || 'neutral',
          mood: result.detectedStyle?.mood || 'calm',
          perspective: result.detectedStyle?.perspective || 'third_person',
          tense: result.detectedStyle?.tense || 'past',
          complexity: result.detectedStyle?.complexity || 'medium'
        },
        stylePatterns: {
          averageSentenceLength: result.stylePatterns?.averageSentenceLength || 15,
          vocabularyLevel: result.stylePatterns?.vocabularyLevel || 'intermediate',
          usesDialogue: Boolean(result.stylePatterns?.usesDialogue),
          emotionalIntensity: result.stylePatterns?.emotionalIntensity || 'medium',
          descriptiveLevel: result.stylePatterns?.descriptiveLevel || 'moderate'
        },
        recommendedLength: result.recommendedLength || fallbackLength,
        metadata: {
          realCostUSD,
          creditsCharged,
          type: this.type
        }
      };
    } catch (parseError) {
      console.warn('⚠️ Failed to parse style analysis JSON, using fallback values:', parseError);
      
      // Fallback: return safe default values
      return {
        detectedStyle: {
          tone: 'neutral',
          mood: 'calm',
          perspective: 'third_person',
          tense: 'past',
          complexity: 'medium'
        },
        stylePatterns: {
          averageSentenceLength: 15,
          vocabularyLevel: 'intermediate',
          usesDialogue: false,
          emotionalIntensity: 'medium',
          descriptiveLevel: 'moderate'
        },
        recommendedLength: fallbackLength,
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
