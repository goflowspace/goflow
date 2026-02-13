// backend/src/modules/ai/v2/providers/OpenAIProvider.ts
import OpenAI from 'openai';
import { IAIProvider, AIProviderResponse } from './BaseProvider';
import { ModelConfig } from '../shared/types';
import { env } from '../../../../config/env';

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async generate(modelConfig: ModelConfig, systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: modelConfig.model,
      messages,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens,
      ...(modelConfig.topP && { top_p: modelConfig.topP }),
    };

    // OpenAI supports structured JSON output via response_format
    if (modelConfig.outputFormat === 'json') {
      requestParams.response_format = { type: 'json_object' };
    }

    const completion = await this.client.chat.completions.create(requestParams);

    const content = completion.choices[0]?.message?.content || '';
    
    const usage = {
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    };

    return { content, usage };
  }
}
