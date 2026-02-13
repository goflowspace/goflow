// backend/src/modules/ai/v2/operations/GenreGenerationOperation.ts
import { sanitizeJsonString } from '../../../../../utils/jsonUtils';
import {
  AbstractBibleGenerationOperation,
  BibleGenerationInput
} from '../../core/AbstractBibleGenerationOperation';
import {
  AIOperationOutput,
  AIProvider,
  AnthropicModel,
  ExecutionContext,
  GeminiModel,
  OperationAIConfig,
  QualityLevel
} from '../../shared/types';
import { CostService } from '../../services/CostService';
import { USD_PER_CREDIT } from '../../config/OperationCreditConfig';
import { GENRE_DISPLAY_NAMES, projectGenres } from '../../../../projectInfo/projectInfo.validation';

// --- I/O Interfaces ---

export interface GenreGenerationInput extends BibleGenerationInput {}

export interface GenreGenerationOutput extends AIOperationOutput {
  genres: string[];
}

/**
 * Operation to generate project genres using the new v2 architecture.
 */
export class GenreGenerationOperation extends AbstractBibleGenerationOperation<
  GenreGenerationInput,
  GenreGenerationOutput
> {
  id = 'genre-generation-v2';
  name = 'Genre Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.7,
        maxTokens: 500,
        retries: 2,
        timeout: 15000
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.7,
        maxTokens: 500,
        retries: 2,
        timeout: 15000
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.75,
        maxTokens: 1000,
        retries: 1,
        timeout: 30000    
      }
    },
    requiresStructuredOutput: true
  };

  // --- Prompt Generation ---

  protected getSystemPrompt(context: ExecutionContext): string {
    const config = this.aiConfig.modeConfigs[context.qualityLevel];
    const systemBase = 
    
    `<role>
    You are an expert content analyst specializing in genre classification for film, television, literature, and interactive media. You have deep knowledge of genre conventions, audience expectations, narrative structures, and the evolution of hybrid genre forms in modern storytelling.
    </role>

    <context>
    You are analyzing a creative project to determine its most appropriate genre classification from a predefined list. This classification will be used for audience targeting, marketing positioning, content categorization, and project development guidance.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Identify 1-3 genres that best represent the project's core content, themes, narrative structure, and intended audience experience. Prioritize the primary genre first, followed by secondary genres that capture important hybrid elements.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: GenreGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);
    const availableGenres = projectGenres.map(g => `- ${g}: ${GENRE_DISPLAY_NAMES[g]}`).join('\n');

    return `<input_data>

    <primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>
<primary_task>
Analyze the project content and select the most appropriate genres from the provided list, returning them as a JSON array of genre keys.
</primary_task>

<analysis_framework>
Content Analysis:
Examine themes, plot elements, setting, tone, and narrative structure
Primary Genre Identification:
Determine the dominant genre that best describes the core experience  
Secondary Genre Selection:
Identify 1-2 additional genres that capture important hybrid elements
Validation:
Ensure selected genres accurately represent the target audience and content expectations
</analysis_framework>
</task_definition>

<constraints>
<hard_constraints>
Select 1-3 genres maximum
Use ONLY the genre keys from the provided list (not display names)
Return response as valid JSON array format: ["genre_key1", "genre_key2"]
Primary genre should be listed first in the array
All selected genres must exist in the available genres list
</hard_constraints>

<soft_constraints>
Prioritize genres that most accurately describe the core audience experience
Consider both content and tone when making selections
Balance specificity with broad appeal when choosing secondary genres
Avoid over-classification - select only truly relevant genres
</soft_constraints>
</constraints>

<available_genres>
${availableGenres}
</available_genres>

<genre_selection_guidelines>

<primary_genre_indicators>
Role-Playing Game:
Character progression, role-playing elements, stat systems, player agency in character development
Adventure:
Exploration, discovery, journey narratives, puzzle-solving, quest structures
Visual Novel:
Heavy dialogue, branching story paths, character relationships, reading-focused gameplay
Interactive Fiction:
Text-based storytelling, choice-driven narratives, literary focus
Dating Simulation:
Romantic relationships as core mechanic, character affection systems, social interactions
Detective:
Investigation, mystery-solving, clues and deduction, crime or puzzle elements
Horror:
Fear, tension, supernatural or psychological threats, atmosphere of dread
Fantasy:
Magic, mythical creatures, imaginary worlds, supernatural elements as core to setting
Science Fiction:
Advanced technology, space/future settings, scientific concepts, speculative elements
Historical:
Period settings, historical accuracy, cultural authenticity of specific time periods
Comedy:
Humor as primary intent, lighthearted tone, comedic situations and dialogue
Drama:
Serious themes, emotional depth, realistic conflicts, character-driven narratives
Thriller:
Suspense, tension, fast pacing, high stakes, psychological or physical danger
Romance:
Love relationships as central theme, emotional connections, relationship development
Educational:
Learning objectives, instructional content, skill development, knowledge transfer
</primary_genre_indicators>

</genre_selection_guidelines>

<output_specification>

<format>
Return ONLY a valid JSON array containing 1-3 genre keys from the available list.
Format: ["primary_genre", "secondary_genre", "tertiary_genre"]
</format>

<validation_criteria>
- Array contains 1-3 string elements
- All strings are valid genre keys from the provided list
- Primary genre (first element) best represents the core content
- Secondary genres enhance but don't contradict the primary classification
- JSON is properly formatted and parseable
</validation_criteria>

</output_specification>

Analyze the provided project context and return the most appropriate genre classification as a JSON array.`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: GenreGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): GenreGenerationOutput {
    try {
      const cleanedJson = sanitizeJsonString(aiResult);
      const genres = JSON.parse(cleanedJson);
      if (!Array.isArray(genres) || !genres.every(g => typeof g === 'string')) {
        throw new Error('AI result is not an array of strings.');
      }

      // Filter to ensure only valid genres are returned
      const validGenres = genres.filter(genre => projectGenres.includes(genre as any));

      return {
        genres: validGenres.length > 0 ? validGenres : ['fantasy'], // Default fallback
        metadata: {
          realCostUSD,
          creditsCharged,
          margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
        }
      };
    } catch (error) {
      console.error('Error parsing genres from AI result:', error);
      return {
        genres: [], // Default fallback on error
        metadata: {
          realCostUSD,
          creditsCharged,
          margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT),
          error: 'Failed to parse AI response as JSON array.'
        },
        // Flag for DB tracking - this will mark the operation as FAILED in database
        error: true,
        message: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

