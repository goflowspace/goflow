// backend/src/modules/ai/v2/operations/VisualStyleGenerationOperation.ts
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

export interface VisualStyleGenerationInput extends BibleGenerationInput {}

export interface VisualStyleGenerationOutput extends AIOperationOutput {
  visualStyle: string;
}

/**
 * Operation to generate a project's visual style using the new v2 architecture.
 */
export class VisualStyleGenerationOperation extends AbstractBibleGenerationOperation<
  VisualStyleGenerationInput,
  VisualStyleGenerationOutput
> {
  id = 'visual-style-generation-v2';
  name = 'Visual Style Generation';
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
    You are a master visual design strategist combining the expertise of an art director, brand designer, and visual communication specialist. You excel at creating cohesive visual identity systems that effectively communicate project themes, enhance user experience, and create distinctive aesthetic signatures that resonate with target audiences.
    </role>

    <context>
    You are developing a comprehensive visual style guide for a creative project that will inform all visual decisions throughout development and marketing. This style guide must establish consistent aesthetic principles, provide clear direction for artists and designers, and ensure the visual presentation effectively supports the project's narrative, themes, and brand positioning.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Create a detailed visual style specification that establishes the project's distinctive aesthetic identity through comprehensive guidelines for visual composition, artistic style, and design principles that can be consistently applied across all project materials.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: VisualStyleGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

<primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>

<visual_style_components>
Aesthetic Direction:
Primary visual style and visual elements, artistic movement inspiration, and design philosophy
Visual Elements:
Iconography, illustration style, photographic treatment, and graphic elements
Visual Composition:
Layout principles, grid systems, spacing, hierarchy, and element organization
</visual_style_components>

</task_definition>

<constraints>

<hard_constraints>
Provide 200-400 words covering all major visual style components
Connect visual choices to project themes, genre, and target audience
</hard_constraints>

<soft_constraints>
Balance aesthetic appeal with functional usability and accessibility
Consider current design trends while maintaining timeless appeal
Ensure visual style supports rather than competes with content
Address scalability across different screen sizes and formats
Consider production constraints and resource availability
Maintain flexibility for creative interpretation within established guidelines
</soft_constraints>

</constraints>

<visual_design_framework>

<aesthetic_direction_categories>
Contemporary Styles:
Minimalist: Clean lines, abundant white space, reduced visual elements
Maximalist: Rich details, layered elements, bold visual complexity
Brutalist: Raw, bold typography, stark contrasts, geometric forms
Neumorphism: Soft shadows, subtle depth, tactile digital surfaces
Artistic Movement Inspirations:
Art Deco: Geometric patterns, luxury materials, symmetrical designs
Bauhaus: Functional design, sans-serif typography, primary colors
Memphis Design: Bold colors, geometric shapes, playful asymmetry
Swiss Design: Grid-based layouts, clean typography, systematic approach
Genre-Specific Approaches:
Cyberpunk: Neon colors, glitch effects, futuristic typography
Fantasy: Ornate details, rich textures, medieval-inspired elements
Horror: Dark palettes, distressed textures, unsettling typography
Romance: Soft colors, flowing elements, elegant typography
</aesthetic_direction_categories>

</visual_design_framework>

<output_specification>

<format>
3-5 paragraphs, 200-400 words total, with comprehensive visual style guide organized into clear sections: Aesthetic Direction, Visual Elements, Visual Composition, with specific implementation details.
</format>

<validation_criteria>
Specific visual elements and composition principles rather than vague descriptions
Clear connection between visual choices and project themes/audience
Practical guidelines that can be implemented by design teams
Consideration of both aesthetic appeal and functional usability
Coherent visual identity that works across different applications
Balance between distinctive character and accessibility requirements
</validation_criteria>

</output_specification>

Based on the provided project context, create a comprehensive visual style guide that establishes the distinctive aesthetic identity and provides clear implementation guidelines for all visual design decisions.`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: VisualStyleGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): VisualStyleGenerationOutput {
    const cleanedStyle = aiResult.trim().replace(/^(визуальный стиль|visual style|дизайн):\s*/i, '');
    
    return {
      visualStyle: cleanedStyle,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

