// backend/src/modules/ai/v2/providers/GeminiProvider.ts
import { GoogleGenAI, GenerationConfig } from '@google/genai';
import { IAIProvider, AIProviderResponse } from './BaseProvider';
import { ModelConfig } from '../shared/types';
import { env } from '../../../../config/env';

export class GeminiProvider implements IAIProvider {
  private client: GoogleGenAI;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }
    this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async generate(modelConfig: ModelConfig, systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    // Конфигурация генерации
    const generationConfig: GenerationConfig = {
      temperature: modelConfig.temperature,
      topP: modelConfig.topP,
      // maxOutputTokens: modelConfig.maxTokens,
      candidateCount: 1,
      responseMimeType: 'text/plain',
      thinkingConfig: {
        includeThoughts: false,
        thinkingBudget: 0
      }
    };
  
    // Формируем контент запроса
    const contents = [
      {
        role: 'model',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ];

    const result = await this.client.models.generateContent({
      model: modelConfig.model as string,
      contents,
      config: generationConfig
    });
    
    // Проверяем причину завершения генерации
    const candidates = result.candidates ?? [];
    if (candidates && candidates.length > 0) {
      const finishReason = candidates[0].finishReason;
      
      switch (finishReason) {
        case 'MAX_TOKENS':
          throw new Error(
            `Gemini достиг лимита токенов (${modelConfig.maxTokens}). ` +
            'Возможные причины: thinking режим тратит токены на размышления. ' +
            'Решения: 1) Увеличьте maxTokens до 2000-4000, 2) Используйте более прямые промпты, ' +
            '3) Добавьте "Отвечай кратко и по делу" в промпт.'
          );
        case 'SAFETY':
          throw new Error(
            'Генерация контента заблокирована фильтрами безопасности Gemini. ' +
            'Попробуйте изменить формулировку запроса.'
          );
        case 'RECITATION':
          throw new Error(
            'Генерация заблокирована из-за потенциального повторения защищенного контента. ' +
            'Попробуйте изменить формулировку запроса.'
          );
        case 'OTHER':
          throw new Error(
            'Генерация завершена по неизвестной причине. ' +
            'Попробуйте повторить запрос или изменить параметры.'
          );
        case 'STOP':
          // Нормальное завершение, продолжаем
          break;
        default:
          // Если finishReason не определен или имеет неожиданное значение
          if (finishReason && finishReason !== 'STOP') {
            console.warn(`Неизвестная причина завершения Gemini: ${finishReason}`);
          }
      }
    }
    
    const content = candidates[0].content?.parts?.[0]?.text;
    
    // Дополнительная проверка на пустой контент
    if (!content || content.trim() === '') {
      throw new Error(
        'Gemini вернул пустой ответ. Возможные причины: ' +
        'достиг лимита токенов, заблокирован фильтрами безопасности, ' +
        'или запрос требует изменения формулировки.'
      );
    }
    
    const usageMetadata = result.usageMetadata;
    const usage = {
        inputTokens: 0,
        outputTokens: 0,
    };
    if (usageMetadata) {
        usage.inputTokens = usageMetadata.promptTokenCount || 0;
        usage.outputTokens = (usageMetadata.candidatesTokenCount || 0) + (usageMetadata.thoughtsTokenCount || 0);
    }
    
    // For more accurate token counting, a separate call to `countTokens` would be needed before generation.
    // For now, we will rely on the token estimation in AbstractAIOperation.
    return { content, usage };
  }
}

