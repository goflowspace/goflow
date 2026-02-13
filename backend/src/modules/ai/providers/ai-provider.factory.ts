import { AIProvider } from '@prisma/client';
import { AIProviderInterface } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { AnthropicProvider } from './anthropic.provider';

export class AIProviderFactory {
  static create(provider: AIProvider): AIProviderInterface {
    switch (provider) {
      case AIProvider.OPENAI:
        return new OpenAIProvider();
      case AIProvider.GEMINI:
        return new GeminiProvider();
      case AIProvider.ANTHROPIC:
        return new AnthropicProvider();
      case AIProvider.VERTEX:
        throw new Error('Vertex AI провайдер пока не реализован');
      default:
        throw new Error(`Неподдерживаемый провайдер: ${provider}`);
    }
  }

  static getSupportedProviders(): AIProvider[] {
    const providers: AIProvider[] = [
      AIProvider.OPENAI,
      AIProvider.GEMINI,
      AIProvider.ANTHROPIC,
    ];
    
    // AIProvider.VERTEX,    // TODO: Реализовать позже
    
    return providers;
  }
} 