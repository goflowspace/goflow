// backend/src/modules/ai/v2/providers/AnthropicProvider.ts
import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider, AIProviderResponse } from './BaseProvider';
import { ModelConfig } from '../shared/types';
import { env } from '../../../../config/env';

export class AnthropicProvider implements IAIProvider {
  private client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables.');
    }
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  async generate(modelConfig: ModelConfig, systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    const messageParams: Anthropic.MessageCreateParams = {
      model: modelConfig.model,
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      ...(modelConfig.topP && { top_p: modelConfig.topP }),
    };

    // Anthropic doesn't have built-in JSON mode like OpenAI, but we can add instructions
    // to the system prompt for JSON output if needed
    if (modelConfig.outputFormat === 'json') {
      messageParams.system = `${systemPrompt}\n\nPlease respond with valid JSON only.`;
    }

    const message = await this.client.messages.create(messageParams);

    // Extract content from Anthropic response
    let content = '';
    if (message.content && message.content.length > 0) {
      const textContent = message.content.find(block => block.type === 'text');
      if (textContent && 'text' in textContent) {
        content = textContent.text;
      }
    }
    
    const usage = {
      inputTokens: message.usage?.input_tokens || 0,
      outputTokens: message.usage?.output_tokens || 0,
    };

    return { content, usage };
  }
}
