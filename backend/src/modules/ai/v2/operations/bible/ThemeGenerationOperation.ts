// backend/src/modules/ai/v2/operations/ThemeGenerationOperation.ts
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

// --- I/O Interfaces ---

export interface ThemeGenerationInput extends BibleGenerationInput {}

export interface ThemeGenerationOutput extends AIOperationOutput {
  themes: string; // A single string describing the main themes
}

/**
 * Operation to generate project themes using the new v2 architecture.
 */
export class ThemeGenerationOperation extends AbstractBibleGenerationOperation<
  ThemeGenerationInput,
  ThemeGenerationOutput
> {
  id = 'theme-generation-v2';
  name = 'Theme Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.8,
        maxTokens: 800,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.8,
        maxTokens: 800,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.85,
        maxTokens: 1500,
        retries: 1,
        timeout: 40000      
      }
    }
  };

  // --- Prompt Generation ---

  protected getSystemPrompt(context: ExecutionContext): string {
    const config = this.aiConfig.modeConfigs[context.qualityLevel];
    const systemBase = 
    
    `<role>
    You are a master thematic analyst specializing in identifying and articulating the deep philosophical and emotional themes within creative works. You combine the expertise of a literature professor, cultural critic, and narrative psychologist to uncover the profound ideas that give stories their lasting meaning and universal resonance.
    </role>

    <context>
    You are developing thematic analysis for a creative project that will guide narrative decisions, character development, and ensure the work addresses meaningful human concerns. This thematic foundation will help creators maintain focus and depth while providing audiences with rich, thought-provoking content that transcends entertainment to offer genuine insight.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Identify and articulate the central themes and supporting sub-themes that form the philosophical and emotional core of the narrative, ensuring they address universal human experiences while remaining specific enough to provide clear creative direction.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: ThemeGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

<primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>

<thematic_components>
Central Theme:
The primary philosophical or emotional question that drives the entire narrative
Supporting Sub-themes:
1-2 related themes that enrich and complicate the central theme
Thematic Manifestation:
How themes appear through character arcs, plot events, and symbolic elements
Universal Relevance:
How themes connect to broader human experiences and contemporary issues
Narrative Integration:
How themes guide story decisions and character development
</thematic_components>

</task_definition>

<constraints>

<hard_constraints>
Identify exactly 1 central theme and 1-2 supporting sub-themes
Express themes as specific philosophical questions, moral dilemmas, or emotional conflicts rather than generic concepts
Provide 200-400 words of analysis explaining thematic manifestation
Focus on themes that have universal human relevance
Ensure themes are sophisticated enough to sustain narrative depth
Connect themes directly to provided story context and characters
</hard_constraints>

<soft_constraints>
Balance timeless philosophical questions with contemporary social relevance
Avoid clichéd or overly simplistic thematic statements
Consider how themes evolve or deepen throughout the narrative
Address both personal/psychological and social/cultural dimensions
Use specific language that provides clear creative direction
Consider how themes can create meaningful audience engagement
</soft_constraints>

</constraints>

<thematic_analysis_framework>

<effective_theme_characteristics>
Specificity:
"The cost of technological advancement on human empathy" rather than "Technology vs. humanity"
Conflict-Based:
Present themes as tensions, dilemmas, or paradoxes rather than simple statements
Multi-layered:
Themes that operate on personal, interpersonal, and societal levels
Contemporary Relevance:
Themes that address current human concerns and social issues
Universal Resonance:
Themes that transcend specific cultures or time periods
Narrative Integration:
Themes that naturally emerge from character actions and plot developments
</effective_theme_characteristics>

<thematic_categories>
Identity and Authenticity:
Self-discovery vs. social expectations
Authentic expression vs. conformity
Personal truth vs. collective identity
Power and Responsibility:
Individual agency vs. systemic constraints
Leadership burden vs. personal desires
Moral authority vs. pragmatic necessity
Connection and Isolation:
Intimacy vs. independence
Community belonging vs. individual freedom
Digital connection vs. authentic relationship
Change and Tradition:
Progress vs. preservation
Innovation vs. wisdom
Adaptation vs. core values
Justice and Morality:
Personal ethics vs. greater good
Mercy vs. justice
Individual rights vs. collective needs
Meaning and Purpose:
Existential fulfillment vs. material success
Legacy vs. present moment
Spiritual vs. rational understanding
</thematic_categories>

</thematic_analysis_framework>

<output_specification>

<format>
3-5 paragraphs, 200-400 words total, organized into clear sections: Central Theme, Supporting Sub-themes (1-2), and Thematic Analysis explaining how themes manifest through narrative elements.
</format>

<validation_criteria>
Themes are expressed as specific conflicts or questions rather than generic statements
Clear connection between themes and provided story context
Balance between universal human relevance and contemporary specificity
Sophisticated enough to sustain narrative depth throughout the work
Natural integration with character arcs and plot development
Provide actionable creative direction for narrative decisions
</validation_criteria>

</output_specification>

Based on the provided project context, develop a comprehensive thematic analysis that identifies the central philosophical and emotional themes that will guide this narrative's development and provide meaningful depth for audiences.`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: ThemeGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): ThemeGenerationOutput {
    const cleanedThemes = aiResult.trim().replace(/^(главные темы|темы|themes):\s*/i, '');
    
    return {
      themes: cleanedThemes,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

