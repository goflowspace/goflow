import {
  BibleGenerationInput,
  AbstractBibleGenerationOperation
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

export interface LoglineGenerationInput extends BibleGenerationInput {}

export interface LoglineGenerationOutput extends AIOperationOutput {
  logline: string;
}

/**
 * Operation to generate a project logline using the new v2 architecture.
 */
export class LoglineGenerationOperation extends AbstractBibleGenerationOperation<
  LoglineGenerationInput,
  LoglineGenerationOutput
> {
  id = 'logline-generation-v2';
  name = 'Logline Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.75,
        maxTokens: 2000, // Увеличено для компенсации Gemini thinking режима
        retries: 2,
        timeout: 15000,      
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.75,
        maxTokens: 2500, // Увеличено для компенсации Gemini thinking режима
        retries: 2,
        timeout: 15000,      
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.8,
        maxTokens: 1000,
        retries: 1,
        timeout: 30000
      }
    }
  };

  // --- Prompt Generation ---

  protected getSystemPrompt(context: ExecutionContext): string {
    const config = this.aiConfig.modeConfigs[context.qualityLevel];
    const systemBase = 
    
    `<role>
    You are an expert logline writer with deep expertise in dramatic structure, story hooks, and industry standards for film, television, and publishing. You specialize in creating compelling one-sentence summaries that capture the essence of a story and generate immediate interest.
    </role>
    
    <context>
    You are creating a logline for a creative project that will be used for pitching, marketing, project development, and audience engagement. The logline must immediately communicate the story's core appeal and dramatic stakes.
    </context>
    
    <text_formatting>
    Use plain text without any formatting
    </text_formatting>

    <objective>
    Generate a powerful, concise logline that captures the protagonist, central conflict, and stakes in 25-50 words, following the proven formula: PROTAGONIST + SITUATION/CONFLICT + STAKES/GOAL.
    </objective>`;
    
        return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: LoglineGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

    <primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>

<formula>
Use the proven logline structure:
"When [INCITING INCIDENT], [PROTAGONIST] must [GOAL/ACTION] or [CONSEQUENCES/STAKES]."
Alternative structures:
"[PROTAGONIST DESCRIPTION] must [ACTION] when [SITUATION] threatens [STAKES]."
"After [INCITING INCIDENT], [PROTAGONIST] [ACTION] to [GOAL] before [DEADLINE/CONSEQUENCE]."
</formula>

</task_definition>

<constraints>
<hard_constraints>
Length:
25-50 words (one sentence)
Include protagonist, conflict and stakes
Use active voice and present tense
Create immediate dramatic tension
Make the genre clear through tone and content
End with clear stakes or consequences
</hard_constraints>

<soft_constraints>
Avoid proper names unless absolutely essential
Don't reveal the ending or resolution
Use concrete, specific language over abstractions
Choose words that evoke the appropriate genre feeling
Make the protagonist's goal crystal clear
Ensure the stakes feel meaningful and urgent
</soft_constraints>
</constraints>

<output_specification>

<format>
Single sentence, 25-50 words, that captures the complete dramatic premise.
</format>

<validation_criteria>
Clear protagonist with specific role/identity
Obvious central conflict or challenge  
Meaningful stakes if protagonist fails
Appropriate tone for the story's genre
Active voice with strong action verbs
Creates immediate interest and tension
Word count between 25-50 words
</validation_criteria>

</output_specification>

Based on the provided project context, create a compelling logline that follows these specifications and immediately hooks the reader with the story's dramatic premise.`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: LoglineGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): LoglineGenerationOutput {
    const cleanedLogline = aiResult.trim().replace(/^(логлайн|logline):\s*/i, '');

    return {
      logline: cleanedLogline,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }

  // --- Quality Validation (kept from original implementation) ---

  public validateLoglineQuality(logline: string): { isValid: boolean; issues: string[]; score: number } {
    const issues: string[] = [];
    let score = 100;
    const wordCount = logline.split(/\s+/).length;

    if (wordCount > 50) {
      issues.push('Слишком длинный (больше 50 слов)');
      score -= 30;
    }
    if (wordCount < 10) {
      issues.push('Слишком короткий (меньше 10 слов)');
      score -= 20;
    }
    if (!/(должен|пытается|борется|вынужден|ищет)/i.test(logline)) {
      issues.push('Не ясен основной конфликт/действие');
      score -= 25;
    }
    if (!/(иначе|или|прежде чем|чтобы)/i.test(logline)) {
      issues.push('Не ясны ставки');
      score -= 25;
    }

    return { isValid: issues.length === 0, issues, score: Math.max(0, score) };
  }
}

