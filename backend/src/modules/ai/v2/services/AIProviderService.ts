// backend/src/modules/ai/v2/services/AIProviderService.ts
import { AIProvider, ModelConfig } from '../shared/types';
import { IAIProvider, AIProviderResponse } from '../providers/BaseProvider';
import { GeminiProvider } from '../providers/GeminiProvider';
// Import other providers like OpenAIProvider, AnthropicProvider here in the future

class AIProviderService {
  private providers: Map<AIProvider, IAIProvider>;

  constructor() {
    this.providers = new Map();
  }

  private getProvider(provider: AIProvider): IAIProvider {
    if (!this.providers.has(provider)) {
      switch (provider) {
        case AIProvider.GEMINI:
          console.log('Initializing Gemini Provider...');
          this.providers.set(provider, new GeminiProvider());
          break;
        // case AIProvider.OPENAI:
        //   this.providers.set(provider, new OpenAIProvider());
        //   break;
        // case AIProvider.ANTHROPIC:
        //   this.providers.set(provider, new AnthropicProvider());
        //   break;
        default:
          throw new Error(`Provider ${provider} is not supported.`);
      }
    }
    return this.providers.get(provider)!;
  }

  public async call(
    modelConfig: ModelConfig,
    systemPrompt: string,
    userPrompt: string
  ): Promise<AIProviderResponse> {
    const provider = this.getProvider(modelConfig.provider);
    return provider.generate(modelConfig, systemPrompt, userPrompt);
  }
}

// Export a singleton instance
export const aiProviderService = new AIProviderService();

