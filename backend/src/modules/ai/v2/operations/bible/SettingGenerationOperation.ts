// backend/src/modules/ai/v2/operations/SettingGenerationOperation.ts
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

export interface SettingGenerationInput extends BibleGenerationInput {}

export interface SettingGenerationOutput extends AIOperationOutput {
  setting: string;
}

/**
 * Operation to generate project setting using the new v2 architecture.
 */
export class SettingGenerationOperation extends AbstractBibleGenerationOperation<
  SettingGenerationInput,
  SettingGenerationOutput
> {
  id = 'setting-generation-v2';
  name = 'Setting Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.7,
        maxTokens: 1000,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.7,
        maxTokens: 1000,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.8,
        maxTokens: 2000,
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
    You are a master world-builder and environmental storytelling expert with deep expertise in creating immersive, functional settings for narrative projects. You specialize in designing environments that not only provide backdrop but actively contribute to story development, character growth, and thematic resonance.
    </role>

    <context>
    You are creating a comprehensive setting description for a creative project that will serve as the foundation for world-building, environmental storytelling, artistic direction, and narrative development. The setting must feel authentic, engaging, and purposefully designed to support the story's themes and conflicts.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Generate a rich, detailed setting description that establishes temporal and geographical context, describes key locations with atmospheric detail, and demonstrates how the environment actively influences plot, character behavior, and thematic elements.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: SettingGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>
    
    <primary_content>
    ${contextPrompt}
    </primary_content>

    </input_data>
    
    <task_definition>
    
    <components_to_include>
    Temporal and Geographic Foundation:
    Historical period, geographical region, climate, and cultural context
    Key Locations:
    3-5 primary locations where story events unfold, each with unique characteristics
    Atmospheric Elements:
    Sensory details including visual aesthetics, soundscapes, tactile sensations, and ambient qualities
    Environmental Storytelling:
    How the setting reflects themes, influences character behavior, and drives plot developments
    Unique World Elements:
    Distinctive features that make this setting memorable and functional for the specific narrative
    </components_to_include>

    </task_definition>
    
    <constraints>

    <hard_constraints>
    Length is 250-500 words across 3-5 paragraphs
    Include both broad context and specific location details
    Show how setting influences story and characters (not just describe passively)
    Use vivid, sensory language that creates clear mental images
    Maintain consistency with the project's genre and tone
    Balance familiar elements with unique, memorable details
    </hard_constraints>
    
    <soft_constraints>
    Avoid generic fantasy/sci-fi tropes unless they serve a specific purpose
    Focus on details that matter to the story rather than exhaustive world-building
    Use concrete, specific imagery over abstract descriptions
    Show cultural and social context through environmental details
    Consider how different locations contrast with each other thematically
    </soft_constraints>

    </constraints>
    
    <structure_framework>
    Temporal and Geographic Context:
    When and where the story takes place
    Broad cultural, historical, or technological context
    Overall climate and geographical characteristics
    The "big picture" of this world
    Key Locations:
    3-5 primary locations where important story events occur
    Unique characteristics and atmosphere of each location
    How locations contrast or complement each other
    Specific details that make each place memorable    
    Atmospheric and Sensory Details:
    Visual aesthetics (lighting, colors, architectural styles)
    Soundscapes and ambient noises
    Tactile sensations and environmental conditions
    Overall mood and emotional tone of the world    
    Environmental Storytelling and Narrative Function:
    How the setting reflects or reinforces story themes
    Ways the environment influences character decisions and behavior
    How locations create opportunities for conflict or resolution
    The setting's active role in driving the narrative forward
    </structure_framework>
    
    <output_specification>
    <format>
    3-5 paragraphs, 200-400 words total, with clear structure moving from general context to specific details to narrative function.
    </format>
    
    <validation_criteria>
    Clear temporal and geographical foundation established
    3-5 key locations described with unique characteristics
    Rich sensory details that create vivid mental images
    Obvious connections between setting and story/character needs
    Consistent tone appropriate to the project's genre
    Balance between broad context and specific, memorable details
    Environmental storytelling that shows how setting actively influences narrative
    </validation_criteria>

    </output_specification>
    
    Based on the provided project context, create a comprehensive setting description that establishes a vivid, functional world for this narrative.`;
      }
    
      // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: SettingGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): SettingGenerationOutput {
    const cleanedSetting = aiResult.trim().replace(/^(сеттинг|setting|место действия):\s*/i, '');
    
    return {
      setting: cleanedSetting,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

