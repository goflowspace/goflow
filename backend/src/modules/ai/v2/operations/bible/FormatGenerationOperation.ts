// backend/src/modules/ai/v2/operations/FormatGenerationOperation.ts
import { sanitizeJsonString } from '../../../../../utils/jsonUtils';
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
import { FORMAT_DISPLAY_NAMES, projectFormats } from '../../../../projectInfo/projectInfo.validation';

// --- I/O Interfaces ---

export interface FormatGenerationInput extends BibleGenerationInput {}

export interface FormatGenerationOutput extends AIOperationOutput {
  formats: string[];
}

/**
 * Operation to generate project formats using the new v2 architecture.
 */
export class FormatGenerationOperation extends AbstractBibleGenerationOperation<
  FormatGenerationInput,
  FormatGenerationOutput
> {
  id = 'format-generation-v2';
  name = 'Format Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.6,
        maxTokens: 500,
        retries: 2,
        timeout: 15000,      
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.6,
        maxTokens: 500,
        retries: 2,
        timeout: 15000,      
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.65,
        maxTokens: 1000,
        retries: 1,
        timeout: 30000     
      }
    },
    requiresStructuredOutput: true
  };

  // --- Prompt Generation ---

  protected getSystemPrompt(context: ExecutionContext): string {
    const config = this.aiConfig.modeConfigs[context.qualityLevel];
    const systemBase = `
Специализация: Определение форматов медиапроектов.
Твоя экспертиза: Современные медиаформаты, особенности производства, рыночные тренды.
Принципы: Учитывай масштаб, аудиторию и коммерческие аспекты. Предлагай современные форматы.`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: FormatGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);
    const availableFormats = projectFormats.map(f => `- ${f}: ${FORMAT_DISPLAY_NAMES[f]}`).join('\n');

    return `
${contextPrompt}

ИНСТРУКЦИИ ДЛЯ ФОРМАТОВ:
1. Проанализируй проект: оцени масштаб, сложность и целевую аудиторию.
2. Выбери форматы: Предложи 1 основной и 1-2 альтернативных формата.
3. Формат ответа: Верни ТОЛЬКО JSON-массив строк с ключами форматов. Пример: ["visual_novel", "interactive_fiction", "quest"].

Доступные форматы для использования (используй только их ключи):
${availableFormats}

Основываясь на контексте, определи форматы для проекта "${input.projectName}".
`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: FormatGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): FormatGenerationOutput {
    try {
      const cleanedJson = sanitizeJsonString(aiResult);
      const formats = JSON.parse(cleanedJson);
      if (!Array.isArray(formats) || !formats.every(f => typeof f === 'string')) {
        throw new Error('AI result is not an array of strings.');
      }

      const validFormats = formats.filter(format => projectFormats.includes(format as any));

      return {
        formats: validFormats.length > 0 ? validFormats : ['visual_novel'], // Default fallback
        metadata: {
          realCostUSD,
          creditsCharged,
          margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
        }
      };
    } catch (error) {
      console.error('Error parsing formats from AI result:', error);
      return {
        formats: ['visual_novel'], // Default fallback on error
        metadata: {
          realCostUSD,
          creditsCharged,
          margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT),
          error: 'Failed to parse AI response as JSON array.'
        },
        // Flag for DB tracking - this will mark the operation as FAILED in database
        error: true,
        message: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

