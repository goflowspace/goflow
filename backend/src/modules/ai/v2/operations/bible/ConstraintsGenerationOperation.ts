// backend/src/modules/ai/v2/operations/ConstraintsGenerationOperation.ts
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

export interface ConstraintsGenerationInput extends BibleGenerationInput {}

export interface ConstraintsGenerationOutput extends AIOperationOutput {
  constraints: string;
}

/**
 * Operation to generate project constraints using the new v2 architecture.
 */
export class ConstraintsGenerationOperation extends AbstractBibleGenerationOperation<
  ConstraintsGenerationInput,
  ConstraintsGenerationOutput
> {
  id = 'constraints-generation-v2';
  name = 'Constraints Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.5,
        maxTokens: 800,
        retries: 2,
        timeout: 20000,      
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.5,
        maxTokens: 800,
        retries: 2,
        timeout: 20000,      
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.6,
        maxTokens: 1500,
        retries: 1,
        timeout: 40000    
      }
    }
  };

  // --- Prompt Generation ---

  protected getSystemPrompt(context: ExecutionContext): string {
    const config = this.aiConfig.modeConfigs[context.qualityLevel];
    const systemBase = `
Специализация: Определение ограничений и оговорок для творческих проектов.
Твоя экспертиза: Продакшн, бюджеты, технические ограничения, цензура, платформенные требования.
Принципы: Реалистичность, Практичность, Конкретность.`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: ConstraintsGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `
${contextPrompt}

ИНСТРУКЦИИ ДЛЯ ОПРЕДЕЛЕНИЯ ОГРАНИЧЕНИЙ:
- **Бюджетные:** Какие финансовые рамки у проекта?
- **Технические:** Есть ли ограничения по технологиям, движку, платформе?
- **Временные:** Какие сроки и дедлайны?
- **Цензурные и правовые:** Какие есть возрастные, культурные или юридические ограничения?
- **Другие:** Кастинг, локации, ресурсы.

Будь реалистичным и практичным. Опиши 3-5 ключевых ограничений для проекта "${input.projectName}".
`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: ConstraintsGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): ConstraintsGenerationOutput {
    const cleanedConstraints = aiResult.trim().replace(/^(ограничения|constraints):\s*/i, '');
    
    return {
      constraints: cleanedConstraints,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

