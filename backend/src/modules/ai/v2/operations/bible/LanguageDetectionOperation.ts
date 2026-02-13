// backend/src/modules/ai/v2/operations/bible/LanguageDetectionOperation.ts
import { AbstractAIOperation } from '../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, AIProvider, ExecutionContext, GeminiModel, QualityLevel } from '../../shared/types';

export interface LanguageDetectionInput extends AIOperationInput {
  projectContext: string;
  baseDescription?: string;
}

export interface LanguageDetectionOutput extends AIOperationOutput {
  detectedLanguage: string; // Название языка на английском, например "Russian", "English", "French"
  confidence: number; // 0-1
}

/**
 * Операция для определения предпочитаемого языка генерации контента
 * на основе контекста проекта и дополнительного описания
 */
export class LanguageDetectionOperation extends AbstractAIOperation<
  LanguageDetectionInput,
  LanguageDetectionOutput
> {
  readonly id = 'language-detection-v2';
  readonly name = 'Language Detection';
  readonly version = '2.0.0';

  // Для определения языка используем быструю конфигурацию
  aiConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.1, // Низкая температура для более детерминированного результата
        maxTokens: 50,    // Очень короткий ответ
        timeout: 10000,   // Быстрый таймаут
        retries: 1,
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.1,
        maxTokens: 50,
        timeout: 15000,
        retries: 1,
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.1,
        maxTokens: 50,
        timeout: 15000,
        retries: 1,
      }
    }
  };

  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are a language detection specialist. Your task is to detect the preferred language for content generation based on the provided context.
</role>

<objective>
Analyze the provided text and determine the most appropriate language for generating content.
</objective>

<instructions>
- Analyze the language used in the project context and description
- Return the language name in English (e.g., "Russian", "English", "French", "Spanish", "German", "Chinese", etc.)
- If the text contains multiple languages, choose the most probable one
- If unclear or no specific language detected, return "English" as default
- Respond with ONLY the language name in English
- Do not provide explanations or additional text
</instructions>`;
  }

  protected getUserPrompt(input: LanguageDetectionInput, _context: ExecutionContext): string {
    const textToAnalyze = [
      input.projectContext,
      input.baseDescription || ''
    ].filter(text => text && text.trim()).join('\n\n');

    return `<text_to_analyze>
${textToAnalyze}
</text_to_analyze>

<task>
Detect the primary language for content generation. Return only the language name.
</task>`;
  }

  parseResult(
    aiResult: string,
    _input: LanguageDetectionInput,
    realCostUSD: number,
    creditsCharged: number,
  ): LanguageDetectionOutput {
    const cleanResult = aiResult.trim();
    
    let detectedLanguage = 'English'; // По умолчанию английский
    let confidence = 0.8;

    // Проверяем, что ответ содержит название языка
    if (cleanResult && cleanResult.length > 0) {
      // Если AI вернул результат, считаем что это название языка
      detectedLanguage = cleanResult;
      confidence = 0.9;
    } else {
      // Fallback: простая эвристика по входным данным  
      const inputText = `${_input.projectContext} ${_input.baseDescription || ''}`;
      const russianChars = (inputText.match(/[а-яё]/gi) || []).length;
      const englishChars = (inputText.match(/[a-z]/gi) || []).length;
      const chineseChars = (inputText.match(/[\u4e00-\u9fff]/gi) || []).length;
      const arabicChars = (inputText.match(/[\u0600-\u06ff]/gi) || []).length;
      
      if (russianChars > englishChars && russianChars > chineseChars) {
        detectedLanguage = 'Russian';
        confidence = 0.7;
      } else if (chineseChars > 0) {
        detectedLanguage = 'Chinese';
        confidence = 0.7;
      } else if (arabicChars > 0) {
        detectedLanguage = 'Arabic';
        confidence = 0.7;
      } else {
        detectedLanguage = 'English';
        confidence = 0.6;
      }
    }

    console.log(`🌐 Language detected: ${detectedLanguage} (confidence: ${confidence})`);

    return {
      detectedLanguage,
      confidence,
      metadata: {
        realCostUSD,
        creditsCharged,
        originalAIResponse: aiResult
      }
    };
  }

  /**
   * Дополнительная валидация входных данных
   */
  protected validateAdditional(_input: LanguageDetectionInput): string[] {
    const errors: string[] = [];
    
    // if (!input.projectContext || input.projectContext.trim().length < 10) {
    //   errors.push('Project context must be at least 10 characters long for language detection');
    // }
    
    return errors;
  }
}
 