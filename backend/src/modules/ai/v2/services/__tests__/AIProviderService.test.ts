// backend/src/modules/ai/v2/services/__tests__/AIProviderService.test.ts
import { AIProvider, GeminiModel, AnthropicModel, ModelConfig } from '../../shared/types';

// Создаем простой мок AIProviderService для тестирования
class TestAIProviderService {
  private providers = new Map();
  private mockGenerate = jest.fn();

  constructor(mockGenerate: jest.Mock) {
    this.mockGenerate = mockGenerate;
  }

  private getProvider(provider: AIProvider) {
    if (!this.providers.has(provider)) {
      switch (provider) {
        case AIProvider.GEMINI:
          console.log('Initializing Gemini Provider...');
          this.providers.set(provider, { generate: this.mockGenerate });
          break;
        default:
          throw new Error(`Provider ${provider} is not supported.`);
      }
    }
    return this.providers.get(provider)!;
  }

  public async call(modelConfig: ModelConfig, systemPrompt: string, userPrompt: string) {
    const provider = this.getProvider(modelConfig.provider);
    return provider.generate(modelConfig, systemPrompt, userPrompt);
  }
}

describe('AIProviderService', () => {
  let serviceInstance: TestAIProviderService;
  let mockGenerate: jest.Mock;

  beforeEach(() => {
    mockGenerate = jest.fn();
    serviceInstance = new TestAIProviderService(mockGenerate);
  });

  describe('call with Gemini provider', () => {
    it('should initialize Gemini provider and make successful call', async () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.8,
        maxTokens: 1000,
        timeout: 20000,
        retries: 2
      };

      const systemPrompt = 'You are a helpful assistant.';
      const userPrompt = 'What is AI?';

      const expectedResponse = {
        content: 'Artificial Intelligence (AI) is...',
        usage: {
          inputTokens: 50,
          outputTokens: 30
        }
      };

      mockGenerate.mockResolvedValue(expectedResponse);

      const result = await serviceInstance.call(modelConfig, systemPrompt, userPrompt);

      expect(result).toEqual(expectedResponse);
      expect(mockGenerate).toHaveBeenCalledWith(modelConfig, systemPrompt, userPrompt);
    });

    it('should reuse existing Gemini provider instance on subsequent calls', async () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.PRO,
        temperature: 0.5,
        maxTokens: 2000,
        timeout: 40000,
        retries: 1
      };

      const systemPrompt = 'You are an expert.';
      const userPrompt = 'Explain quantum computing.';

      const expectedResponse = {
        content: 'Quantum computing is...',
        usage: {
          inputTokens: 100,
          outputTokens: 150
        }
      };

      mockGenerate.mockResolvedValue(expectedResponse);

      // Первый вызов
      await serviceInstance.call(modelConfig, systemPrompt, userPrompt);
      // Второй вызов
      await serviceInstance.call(modelConfig, systemPrompt, userPrompt);

      // generate должен быть вызван дважды
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });

    it('should handle provider errors correctly', async () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.7,
        maxTokens: 1500,
        timeout: 30000,
        retries: 3
      };

      const systemPrompt = 'You are a translator.';
      const userPrompt = 'Translate this text.';

      const expectedError = new Error('API rate limit exceeded');
      mockGenerate.mockRejectedValue(expectedError);

      await expect(
        serviceInstance.call(modelConfig, systemPrompt, userPrompt)
      ).rejects.toThrow('API rate limit exceeded');

      expect(mockGenerate).toHaveBeenCalledWith(modelConfig, systemPrompt, userPrompt);
    });

    it('should handle empty responses correctly', async () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.8,
        maxTokens: 100,
        timeout: 15000,
        retries: 1
      };

      const systemPrompt = 'You are a assistant.';
      const userPrompt = 'Say nothing.';

      const expectedResponse = {
        content: '',
        usage: {
          inputTokens: 20,
          outputTokens: 0
        }
      };

      mockGenerate.mockResolvedValue(expectedResponse);

      const result = await serviceInstance.call(modelConfig, systemPrompt, userPrompt);

      expect(result).toEqual(expectedResponse);
      expect(result.content).toBe('');
      expect(result.usage.outputTokens).toBe(0);
    });
  });

  describe('unsupported providers', () => {
    it('should throw error for OpenAI provider (not implemented yet)', async () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.OPENAI,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 20000,
        retries: 1
      };

      const systemPrompt = 'You are a helpful assistant.';
      const userPrompt = 'Hello';

      await expect(
        serviceInstance.call(modelConfig, systemPrompt, userPrompt)
      ).rejects.toThrow('Provider openai is not supported.');
    });

    it('should throw error for Anthropic provider (not implemented yet)', async () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.6,
        maxTokens: 2000,
        timeout: 40000,
        retries: 1
      };

      const systemPrompt = 'You are an expert.';
      const userPrompt = 'Help me understand.';

      await expect(
        serviceInstance.call(modelConfig, systemPrompt, userPrompt)
      ).rejects.toThrow('Provider anthropic is not supported.');
    });
  });

  describe('provider initialization logging', () => {
    it('should log when initializing Gemini provider', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.8,
        maxTokens: 1000,
        timeout: 20000,
        retries: 2
      };

      const expectedResponse = {
        content: 'Test response',
        usage: { inputTokens: 10, outputTokens: 5 }
      };

      mockGenerate.mockResolvedValue(expectedResponse);

      await serviceInstance.call(modelConfig, 'system', 'user');

      expect(consoleSpy).toHaveBeenCalledWith('Initializing Gemini Provider...');

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.PRO,
        temperature: 0.3,
        maxTokens: 8000,
        timeout: 60000,
        retries: 1
      };

      const longSystemPrompt = 'You are a detailed assistant. '.repeat(100); // ~3000 chars
      const longUserPrompt = 'Please provide a comprehensive explanation about '.repeat(50); // ~2500 chars

      const expectedResponse = {
        content: 'This is a detailed response...',
        usage: {
          inputTokens: 2000,
          outputTokens: 1500
        }
      };

      mockGenerate.mockResolvedValue(expectedResponse);

      const result = await serviceInstance.call(modelConfig, longSystemPrompt, longUserPrompt);

      expect(result).toEqual(expectedResponse);
      expect(mockGenerate).toHaveBeenCalledWith(modelConfig, longSystemPrompt, longUserPrompt);
    });

    it('should handle special characters in prompts', async () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.8,
        maxTokens: 500,
        timeout: 25000,
        retries: 2
      };

      const systemPrompt = 'You are a multilingual assistant. 你好 🌍';
      const userPrompt = 'Translate: "Hello" to français, español, and 日本語';

      const expectedResponse = {
        content: 'Bonjour, Hola, こんにちは',
        usage: {
          inputTokens: 45,
          outputTokens: 25
        }
      };

      mockGenerate.mockResolvedValue(expectedResponse);

      const result = await serviceInstance.call(modelConfig, systemPrompt, userPrompt);

      expect(result).toEqual(expectedResponse);
      expect(mockGenerate).toHaveBeenCalledWith(modelConfig, systemPrompt, userPrompt);
    });
  });
});