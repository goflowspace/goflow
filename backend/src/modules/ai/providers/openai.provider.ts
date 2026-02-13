import OpenAI from 'openai';
import { env } from '../../../config/env';
import { BaseAIProvider, AIResponseWithMetadata } from './base-ai-provider';

export class OpenAIProvider extends BaseAIProvider {
  private openai: OpenAI;

  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  protected async callAI(systemPrompt: string, userPrompt: string, temperature: number): Promise<string> {
    const response = await this.callAIWithMetadata(systemPrompt, userPrompt, temperature);
    return response.content;
  }

  protected async callAIWithMetadata(
    systemPrompt: string, 
    userPrompt: string, 
    temperature: number,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AIResponseWithMetadata> {
    const maxTokens = options?.maxTokens || 4000;
    const model = options?.model || "gpt-4o-mini";
    const finalTemperature = options?.temperature ?? temperature;

    console.log('🔍 SYSTEM PROMPT:', systemPrompt);
    console.log('🔍 USER PROMPT:', userPrompt);
    
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: finalTemperature,
      max_tokens: maxTokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log('🔍 COMPLETION:', completion);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Пустой ответ от OpenAI');
    }

    // Извлекаем информацию об использовании токенов
    const usage = completion.usage;
    const promptTokens = usage?.prompt_tokens || 0;
    const completionTokens = usage?.completion_tokens || 0;
    const totalTokens = usage?.total_tokens || (promptTokens + completionTokens);

    // Рассчитываем стоимость
    // Input: $0.15 / 1M tokens, Output: $0.60 / 1M tokens
    const inputCost = (promptTokens / 1000000) * 0.15;
    const outputCost = (completionTokens / 1000000) * 0.60;
    const totalCost = inputCost + outputCost;

    return {
      content,
      metadata: {
        provider: 'openai',
        model,
        prompt: userPrompt,
        context: systemPrompt,
        fullResponse: content,
        tokensUsed: totalTokens,
        promptTokens,
        completionTokens,
        cost: totalCost,
        temperature: finalTemperature,
        maxTokens,
        responseTime: 0, // Будет установлено в базовом классе
        generatedAt: new Date().toISOString()
      }
    };
  }

  protected getProviderName(): string {
    return 'OpenAI';
  }
} 