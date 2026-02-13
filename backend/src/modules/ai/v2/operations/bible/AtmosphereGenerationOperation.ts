// backend/src/modules/ai/v2/operations/AtmosphereGenerationOperation.ts
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

export interface AtmosphereGenerationInput extends BibleGenerationInput {}

export interface AtmosphereGenerationOutput extends AIOperationOutput {
  atmosphere: string;
}

/**
 * Operation to generate project atmosphere using the new v2 architecture.
 */
export class AtmosphereGenerationOperation extends AbstractBibleGenerationOperation<
  AtmosphereGenerationInput,
  AtmosphereGenerationOutput
> {
  id = 'atmosphere-generation-v2';
  name = 'Atmosphere Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.8,
        maxTokens: 1000,
        retries: 2,
        timeout: 20000
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.8,
        maxTokens: 1000,
        retries: 2,
        timeout: 20000
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.85,
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
    You are a master atmospheric designer combining the expertise of a cinematographer, sound designer, and emotional experience architect. You specialize in creating immersive atmospheric profiles that guide artistic vision, enhance narrative impact, and create distinctive sensory experiences across visual, auditory, and emotional dimensions.
    </role>

    <context>
    You are developing a comprehensive atmospheric profile for a creative project that will inform art direction, audio design, user experience design, and overall aesthetic vision. This profile must capture the essential mood, sensory qualities, and emotional journey that defines the project's distinctive feel and audience experience.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Generate a rich, multi-dimensional atmospheric description that establishes the project's distinctive mood, visual aesthetic, sonic landscape, and emotional resonance to guide all creative decisions and ensure consistent artistic vision.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: AtmosphereGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

    <primary_content>
    ${contextPrompt}
    </primary_content>

    </input_data>
    
    <task_definition>
    
    <atmospheric_components>
    Overall Mood and Energy:
    Dominant emotional tone, pacing, and intensity levels
    Visual Aesthetic:
    Color palettes, lighting styles, visual textures, and artistic motifs  
    Sonic Landscape:
    Musical styles, ambient sounds, rhythm patterns, and use of silence
    Emotional Journey:
    Core feelings experienced by the audience throughout the experience
    Sensory Details:
    Tactile, olfactory, and other sensory impressions that enhance immersion
    Symbolic Elements:
    Recurring motifs, metaphors, and atmospheric symbols that reinforce themes
    </atmospheric_components>

    </task_definition>
    
    <constraints>

    <hard_constraints>
    Length is 150-400 words across 3-5 paragraphs
    Include specific examples of colors, sounds, textures, and emotional states
    Address both consistent elements and dynamic atmospheric changes
    Balance poetic description with practical creative direction
    Maintain coherent atmospheric identity throughout
    </hard_constraints>
    
    <soft_constraints>
    Use evocative, sensory-rich language that creates clear mental imagery
    Avoid generic atmospheric clichés unless they serve a specific purpose
    Consider how atmosphere supports and enhances narrative themes
    Include both subtle background elements and prominent focal points
    Address different moments or phases if atmosphere varies significantly
    </soft_constraints>

    </constraints>
    
    <atmospheric_framework>

    <mood_and_energy>
    Dominant Emotion:
    Primary feeling the atmosphere evokes (wonder, dread, melancholy, excitement)
    Energy Level:
    High-intensity vs. contemplative, frantic vs. measured, explosive vs. subtle
    Pacing Rhythm:
    Fast-moving vs. slow-building, constant vs. dynamic, smooth vs. jarring
    Tension Balance:
    Comfortable vs. unsettling, familiar vs. alien, safe vs. dangerous
    </mood_and_energy>
    
    <visual_aesthetic>
    Color Palette:
    Primary colors, accent colors, temperature (warm/cool), saturation levels
    Lighting Style:
    Natural vs. artificial, harsh vs. soft, directional vs. ambient, color temperature
    Visual Textures:
    Smooth vs. rough, organic vs. geometric, detailed vs. minimalist
    Compositional Style:
    Symmetrical vs. asymmetrical, cluttered vs. sparse, intimate vs. epic
    Key Visual Motifs:
    Recurring shapes, patterns, symbols, or design elements
    </visual_aesthetic>
    
    <sonic_landscape>
    Musical Style:
    Genre, instrumentation, rhythm, harmony, melody characteristics
    Ambient Sounds:
    Environmental audio, mechanical sounds, natural sounds, silence usage
    Audio Texture:
    Clean vs. distorted, layered vs. simple, organic vs. synthetic
    Dynamic Range:
    Quiet intimate moments vs. powerful climactic sounds
    Rhythmic Patterns:
    Steady vs. irregular, syncopated vs. straight, fast vs. slow
    </sonic_landscape>
    
    <emotional_architecture>
    Primary Emotions:
    Core feelings the atmosphere should evoke consistently
    Emotional Progression:
    How feelings develop or change throughout the experience
    Emotional Contrasts:
    Moments of relief, surprise, or emotional pivot points
    Audience Connection:
    How the atmosphere makes viewers/players feel about characters and events
    </emotional_architecture>

    </atmospheric_framework>
    
    <output_specification>

    <format>
    3-5 paragraphs, 150-400 words total, with rich sensory details and clear creative direction for artistic implementation
    </format>
    
    <validation_criteria>
    Distinctive atmospheric identity that differentiates this project
    Specific, actionable details for visual and audio artists
    Clear emotional direction that supports narrative themes
    Rich sensory language that creates vivid mental imagery
    Coherent vision that maintains consistency across all elements
    Balance between artistic vision and practical implementation guidance
    </validation_criteria>

    </output_specification>
    
    Based on the provided project context, create a comprehensive atmospheric profile that establishes the distinctive mood, sensory experience, and emotional journey for this creative project.`;
      }
    
      // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: AtmosphereGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): AtmosphereGenerationOutput {
    const cleanedAtmosphere = aiResult.trim().replace(/^(атмосфера|atmosphere|настроение):\s*/i, '');
    
    return {
      atmosphere: cleanedAtmosphere,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

