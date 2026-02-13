
import { AIResponseWithMetadata, BaseAIProvider } from './base-ai-provider';

export class GeminiProvider extends BaseAIProvider {

  constructor() {
    super();
    throw new Error('Not implemented');
  }

  protected async callAI(_systemPrompt: string, _userPrompt: string, _temperature: number): Promise<string> {
    throw new Error('Not implemented');
  }

  protected async callAIWithMetadata(
    _systemPrompt: string, 
    _userPrompt: string, 
    _temperature: number, 
    _options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AIResponseWithMetadata> {
    throw new Error('Not implemented');
  }

  protected getProviderName(): string {
    return 'Gemini';
  }
} 