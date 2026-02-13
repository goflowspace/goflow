// backend/src/modules/ai/v2/operations/SynopsisGenerationOperation.ts
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

/**
 * Входные данные для операции генерации синопсиса.
 */
export interface SynopsisGenerationInput extends BibleGenerationInput {}

/**
 * Выходные данные операции.
 */
export interface SynopsisGenerationOutput extends AIOperationOutput {
  synopsis: string;
}

/**
 * Операция генерации синопсиса проекта на основе новой архитектуры v2.
 */
export class SynopsisGenerationOperation extends AbstractBibleGenerationOperation<
  SynopsisGenerationInput,
  SynopsisGenerationOutput
> {
  id = 'synopsis-generation-v2';
  name = 'Synopsis Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.75,
        maxTokens: 1500,
        timeout: 40000,
        retries: 1
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.75,
        maxTokens: 1500,
        timeout: 40000,
        retries: 1
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.7,
        maxTokens: 2048,
        timeout: 60000,
        retries: 2
      }
    }
  };

  protected getSystemPrompt(context: ExecutionContext): string {
    const config = this.aiConfig.modeConfigs[context.qualityLevel];
    const systemBase = 
    
    `<role>
    You are an expert narrative synopsis writer with deep expertise in dramatic structure, story architecture, character development, and professional publishing standards. You specialize in creating compelling, industry-standard synopses for creative projects.
    </role>
    
    <context>
    You are creating a synopsis for a narrative project that will be used for project development, team alignment, pitch materials, and creative direction. The synopsis must effectively communicate the story's essence while adhering to professional standards.
    </context>
    
    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Generate a compelling, professionally structured synopsis that captures the complete narrative arc, character development, and emotional journey in 250-750 words, written in present tense with clear dramatic progression.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: SynopsisGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

<primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>

<structure_framework>
Establish protagonist, world context, and initial situation
Present the inciting incident and central conflict clearly  
Outline major plot developments with escalating stakes
Describe the climactic confrontation and its consequences
Conclude with resolution and character transformation
</structure_framework>

</task_definition>

<constraints>

<hard_constraints>
Write in present tense throughout
Use third person narrative voice
Length: 250-750 words (2-6 paragraphs)
Include complete story arc from beginning to end
Show protagonist's emotional journey and growth
Maintain tone appropriate to the story's genre
Use active voice and concrete, specific language
</hard_constraints>

<soft_constraints>
Avoid minor character names unless essential to main plot
Focus on major plot points, not every detail
Balance plot summary with emotional stakes
Don't use evaluative language ("amazing," "incredible")
Avoid rhetorical questions to the reader
Don't leave ending ambiguous - show clear resolution
</soft_constraints>

</constraints>

<output_specification>

<format>
Plain text synopsis, 250-750 words, organized in 2-6 clear paragraphs with smooth narrative flow.
</format>

<validation_criteria>
Complete story arc from setup to resolution
Clear protagonist motivation and character growth
Escalating conflict with satisfying resolution  
Consistent present tense and third person voice
Appropriate tone for target genre
Word count between 250-750 words
All major story beats covered logically
</validation_criteria>

</output_specification>

Based on the provided project context, create a compelling synopsis that follows these specifications and captures the essence of this narrative.`;
  }

  parseResult(
    aiResult: string,
    _input: SynopsisGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): SynopsisGenerationOutput {
    const cleanedSynopsis = aiResult.trim().replace(/^(синопсис|synopsis):\s*/i, '');

    return {
      synopsis: cleanedSynopsis,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT),
        wordCount: cleanedSynopsis.split(/\s+/).length
      }
    };
  }

  /**
   * Дополнительная валидация для синопсиса
   */
  protected validateAdditional(input: SynopsisGenerationInput): string[] {
    const errors: string[] = [];
    
    // Проверка на минимальное количество информации для создания синопсиса
    if (input.projectContext) {
      const words = input.projectContext.trim().split(/\s+/).length;
      if (words < 3) {
        errors.push('Для качественного синопсиса контекст должен содержать не менее 3 слов');
      }
    } else {
      errors.push('Контекст проекта обязателен для генерации синопсиса');
    }
    
    return errors;
  }
}

