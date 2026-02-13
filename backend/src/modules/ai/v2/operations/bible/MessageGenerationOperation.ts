// backend/src/modules/ai/v2/operations/MessageGenerationOperation.ts
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

export interface MessageGenerationInput extends BibleGenerationInput {}

export interface MessageGenerationOutput extends AIOperationOutput {
  message: string;
}

/**
 * Operation to generate a project's central message using the new v2 architecture.
 */
export class MessageGenerationOperation extends AbstractBibleGenerationOperation<
  MessageGenerationInput,
  MessageGenerationOutput
> {
  id = 'message-generation-v2';
  name = 'Message Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.9,
        maxTokens: 500,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.9,
        maxTokens: 500,
        retries: 2,
        timeout: 20000,      
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.9,
        maxTokens: 1000,
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
    You are a master thematic analyst and communication strategist specializing in identifying and articulating the core messages within narrative works. You have deep expertise in moral philosophy, social commentary, human psychology, and the art of distilling complex ideas into powerful, memorable statements that resonate across diverse audiences.
    </role>

    <context>
    You are formulating the central thematic message for a creative project—the key insight, lesson, or perspective that audiences should take away from the experience. This message will guide narrative decisions, character development, marketing positioning, and help creators maintain thematic coherence throughout production.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Generate a clear, impactful thematic statement that captures the story's central wisdom, addresses relevant human concerns, and provides meaningful takeaway value that enriches the audience's understanding of themselves or their world.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: MessageGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

<primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>

<message_components>
Core Truth:
The fundamental insight about human experience or society
Contemporary Relevance:
How this truth applies to current issues and concerns
Emotional Resonance:
The feelings this message should evoke in audiences
Actionable Insight:
What audiences can apply to their own lives or perspective
Universal Appeal:
How the message transcends specific demographics or circumstances
</message_components>

</task_definition>

<constraints>

<hard_constraints>
Length is 1-3 sentences (25-75 words)
Express a clear, specific insight rather than generic platitudes
Avoid preachy or condescending tone
Connect to universal human experiences while maintaining specificity
Provide actionable or transformative perspective
Reflect the story's actual content and themes accurately
</hard_constraints>

<soft_constraints>
Balance optimism with realism (avoid naive positivity or crushing pessimism)
Address contemporary social or personal issues when relevant
Use accessible language that resonates across different backgrounds
Create memorability through vivid imagery or compelling phrasing
Inspire reflection or positive action without being heavy-handed
</soft_constraints>

</constraints>

<output_specification>

<format>
1-3 sentences (25-75 words) that capture the story's central thematic insight in memorable, emotionally resonant language.
</format>

<validation_criteria>
Expresses a specific, actionable insight about human experience
Addresses contemporary issues or timeless human concerns
Uses vivid, memorable language that sticks with audiences
Balances universal appeal with specific wisdom
Offers hope, growth, or positive perspective without naive optimism
Reflects the actual themes and content of the story
Avoids clichés and generic motivational language
</validation_criteria>

</output_specification>

Based on the provided project context, formulate a powerful thematic message that captures the story's central wisdom and provides meaningful insight for audiences to carry forward into their own lives.`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: MessageGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): MessageGenerationOutput {
    const cleanedMessage = aiResult.trim().replace(/^(послание|сообщение|message):\s*/i, '');
    
    return {
      message: cleanedMessage,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

