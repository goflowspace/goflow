// backend/src/modules/ai/v2/operations/ReferencesGenerationOperation.ts
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

export interface ReferencesGenerationInput extends BibleGenerationInput {}

export interface ReferencesGenerationOutput extends AIOperationOutput {
  references: string;
}

/**
 * Operation to generate project references and analogues using the new v2 architecture.
 */
export class ReferencesGenerationOperation extends AbstractBibleGenerationOperation<
  ReferencesGenerationInput,
  ReferencesGenerationOutput
> {
  id = 'references-generation-v2';
  name = 'References Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.6,
        maxTokens: 800,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.6,
        maxTokens: 800,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.7,
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
    You are a cultural analyst and media curator with encyclopedic knowledge of film, television, literature, video games, and interactive media across all eras and cultures. You specialize in identifying meaningful creative connections, thematic parallels, and stylistic influences that can inform and inspire creative development.
    </role>

    <context>
    You are curating a strategic reference list for a creative project that will inform artistic vision, guide creative decisions, help communicate project concepts to stakeholders, and provide inspirational touchstones for the development team. These references must be both relevant and actionable for creative development.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Identify 3-6 highly relevant creative works across different media that share meaningful connections with the project, providing specific analysis of what makes each reference valuable and how it relates to different aspects of the project's vision.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: ReferencesGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

<primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>

<reference_categories>
Thematic Parallels:
Works that explore similar themes, messages, or philosophical questions
Narrative Structure:
Works with similar storytelling techniques, pacing, or structural approaches
Atmospheric Inspiration:
Works that achieve similar mood, tone, or sensory experience
Character Development:
Works with similar character types, relationships, or growth arcs
World-Building:
Works that create similar settings, cultures, or environmental storytelling
Visual/Audio Style:
Works with comparable aesthetic approaches, art direction, or sound design
Audience Experience:
Works that create similar engagement patterns or emotional journeys
</reference_categories>

</task_definition>

<constraints>

<hard_constraints>
Select 3-6 references from diverse media types (film, TV, books, games, etc.)
Include both classic/foundational works and contemporary examples
Provide specific analysis of WHY each reference is relevant (not just general similarity)
Use format:
"Title (Year, Medium):
Detailed explanation of connection"
Focus on works that are accessible and well-known enough to be useful for communication
Balance obvious genre matches with surprising but insightful connections
</hard_constraints>

<soft_constraints>
Prioritize references that offer actionable creative insights
Include works from different time periods to show evolution of ideas
Consider both mainstream and cult/indie works for diverse perspectives
Avoid overly obscure references that won't resonate with most stakeholders
Look for references that address different aspects of the project (not all thematic)
</soft_constraints>

</constraints>

<reference_analysis_framework>

<connection_types>
Structural Connections:
Narrative techniques (non-linear storytelling, multiple perspectives, etc.)
Character relationship dynamics
Conflict progression and resolution patterns
Pacing and tension building methods
Thematic Connections:
Core philosophical questions or moral dilemmas
Social commentary and cultural criticism
Character growth themes and transformation arcs
Universal human experiences explored
Atmospheric Connections:
Mood, tone, and emotional palette
Visual aesthetics and art direction
Sound design and musical approach
Environmental storytelling techniques
Technical/Format Connections:
Interactive elements and user agency
Medium-specific storytelling techniques
Innovation in format or presentation
Audience engagement strategies
</connection_types>

<quality_indicators>
Strong References Have:
Clear, specific reasons for inclusion beyond surface-level similarity
Multiple connection points that inform different aspects of development
Balance between obvious genre matches and insightful unexpected connections
Practical value for guiding creative decisions
Recognition factor that aids in project communication
Weak References Avoid:
Generic genre matches without specific insight ("It's also fantasy")
Overly obscure works that don't aid communication
Connections based solely on superficial elements
Too many references from the same medium or time period
Vague explanations that don't provide actionable insights
</quality_indicators>

</reference_analysis_framework>

<output_specification>

<format>
3-6 references using format:
"Title (Year, Medium):
Detailed explanation of specific connections and creative value"
</format>

<structure>
Lead with strongest/most relevant reference
Mix different types of connections (thematic, structural, atmospheric, etc.)
Balance well-known and slightly more specialized selections
Progress from most obvious to most insightful connections
Each explanation should be 1-2 sentences providing specific, actionable insights
</structure>

<validation_criteria>
Diverse media representation (not all films or all games)
Clear, specific explanations of relevance for each reference
Mix of classic and contemporary works
Balance between expected and surprising but insightful connections
Practical value for informing creative decisions and communicating vision
Accessibility for stakeholder communication and team inspiration
</validation_criteria>

</output_specification>

Based on the provided project context, identify creative references that will provide valuable inspiration and clear communication tools for this project's development.`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: ReferencesGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): ReferencesGenerationOutput {
    const cleanedReferences = aiResult.trim().replace(/^(референсы|аналоги|references):\s*/i, '');
    
    return {
      references: cleanedReferences,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

