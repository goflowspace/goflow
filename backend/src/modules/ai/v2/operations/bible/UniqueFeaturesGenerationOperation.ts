// backend/src/modules/ai/v2/operations/UniqueFeaturesGenerationOperation.ts
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

export interface UniqueFeaturesGenerationInput extends BibleGenerationInput {}

export interface UniqueFeaturesGenerationOutput extends AIOperationOutput {
  uniqueFeatures: string;
}

/**
 * Operation to generate a project's unique features using the new v2 architecture.
 */
export class UniqueFeaturesGenerationOperation extends AbstractBibleGenerationOperation<
  UniqueFeaturesGenerationInput,
  UniqueFeaturesGenerationOutput
> {
  id = 'unique-features-generation-v2';
  name = 'Unique Features Generation';
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
        temperature: 0.8,
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
    You are a master creative strategist and market analyst specializing in identifying and articulating unique value propositions within creative projects. You combine the expertise of a competitive analyst, innovation consultant, and creative director to identify distinctive elements that set projects apart in crowded markets.
    </role>

    <context>
    You are developing a unique features analysis for a creative project that will inform marketing strategy, competitive positioning, and help creators understand their distinctive value proposition. This analysis will guide communication with stakeholders, help secure funding or publishing deals, and ensure the project maintains its unique identity throughout development.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Identify and articulate 3-5 distinctive features that make this creative project unique, innovative, and competitive, focusing on concrete elements that differentiate it from similar works and provide clear market advantages.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: UniqueFeaturesGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

<primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>

<uniqueness_analysis_categories>
Narrative Innovation:
Unique storytelling techniques, plot structures, or thematic approaches
World-Building Originality:
Distinctive settings, cultures, systems, or environmental storytelling
Character Development:
Original character types, relationship dynamics, or growth mechanisms
Mechanical Innovation:
Unique gameplay, interactive elements, or user engagement methods
Aesthetic Differentiation:
Distinctive visual style, audio design, or sensory experience
Genre Fusion:
Creative combinations of different genres or format innovations
Technical Innovation:
Novel use of technology, platforms, or distribution methods
Audience Experience:
Unique ways of engaging, surprising, or emotionally connecting with audiences
</uniqueness_analysis_categories>
</task_definition>

<constraints>

<hard_constraints>
Identify 3-5 unique features
Focus on features that are genuinely distinctive rather than incremental improvements
Provide specific, concrete examples rather than generic statements
Explain why each feature creates competitive advantage
Connect features to target audience appeal and market positioning
Avoid features that are already common in the genre unless execution is revolutionary
</hard_constraints>

<soft_constraints>
Balance technical innovation with emotional/artistic uniqueness
Consider both obvious standout features and subtle but important differentiators
Address features that can be communicated effectively to stakeholders and audiences
Consider scalability and development feasibility of unique features
Look for features that reinforce each other to create cohesive unique identity
Consider both immediate impact and long-term competitive advantages
</soft_constraints>

</constraints>

<uniqueness_evaluation_framework>

<differentiation_criteria>
Market Positioning:
How does this feature set the project apart from direct competitors?
What specific gap in the market does this feature fill?
How does this feature appeal to underserved audience segments?
Innovation Level:
Is this feature completely new or a creative evolution of existing concepts?
Does this feature solve a known problem in creative or novel ways?
How does this feature push boundaries within its genre or medium?
Execution Quality:
Is this feature implemented in a way that maximizes its unique potential?
Does the execution of this feature demonstrate mastery and innovation?
How does this feature integrate seamlessly with other project elements?
Audience Impact:
What specific emotional or intellectual response does this feature create?
How does this feature enhance the overall user/audience experience?
What memorable moments or lasting impressions does this feature generate?
</differentiation_criteria>

<competitive_advantage_types>
First-Mover Advantages:
Being first to explore new themes, techniques, or technologies
Pioneering new formats or distribution methods
Creating new subgenres or artistic approaches
Execution Superiority:
Taking familiar concepts to unprecedented levels of quality or depth
Combining existing elements in ways that create new experiences
Perfecting techniques that others have attempted unsuccessfully
Cultural Relevance:
Addressing contemporary issues from fresh perspectives
Connecting with emerging cultural trends or concerns
Bridging different cultural or demographic audiences
Technical Innovation:
Using new technologies in creative ways
Solving technical challenges that enable new forms of expression
Creating more efficient or effective production methods
</competitive_advantage_types>

</uniqueness_evaluation_framework>

<output_specification>

<format>
3-5 unique features, each presented as:
Feature Name:
Detailed explanation (1-3 sentences) of what makes it unique and why it creates competitive advantage. 
Total length: 200-400 words
</format>

<validation_criteria>
Each feature is genuinely unique rather than incremental improvement
Features are specific and concrete rather than vague or generic
Clear explanation of competitive advantage for each feature
Features work together to create cohesive unique identity
Balance between innovation and feasibility
Features address real audience needs or desires
Differentiation is sustainable and difficult to replicate
</validation_criteria>

</output_specification>

Based on the provided project context, identify the distinctive features that make this creative project unique, innovative, and competitively positioned within its market and genre.`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: UniqueFeaturesGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): UniqueFeaturesGenerationOutput {
    const cleanedFeatures = aiResult.trim().replace(/^(уникальные особенности|unique features):\s*/i, '');
    
    return {
      uniqueFeatures: cleanedFeatures,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

