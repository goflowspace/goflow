// backend/src/modules/ai/v2/services/__tests__/CostService.test.ts
import { CostService } from '../CostService';
import { AIProvider, GeminiModel, AnthropicModel, ModelConfig } from '../../shared/types';
import * as ModelCatalog from '../../config/ModelCatalog';

// Мокаем ModelCatalog
jest.mock('../../config/ModelCatalog');
const mockedModelCatalog = ModelCatalog as jest.Mocked<typeof ModelCatalog>;

describe('CostService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRealCost', () => {
    it('should calculate cost correctly for Gemini Flash Lite', () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.8,
        maxTokens: 1000,
        timeout: 20000,
        retries: 2
      };

      const mockCostInfo = {
        inputCostPerMillionTokens: 0.15,
        outputCostPerMillionTokens: 0.30
      };

      mockedModelCatalog.getModelCost.mockReturnValue(mockCostInfo);

      const inputTokens = 1000;
      const outputTokens = 500;

      const result = CostService.calculateRealCost(modelConfig, inputTokens, outputTokens);

      // Ожидаемая стоимость:
      // Input: (1000 / 1_000_000) * 0.15 = 0.00015
      // Output: (500 / 1_000_000) * 0.30 = 0.00015
      // Total: 0.0003
      expect(result).toBeCloseTo(0.0003, 6);
      expect(mockedModelCatalog.getModelCost).toHaveBeenCalledWith(AIProvider.GEMINI, GeminiModel.FLASH_LITE);
    });

    it('should calculate cost correctly for Anthropic Sonnet', () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 40000,
        retries: 1
      };

      const mockCostInfo = {
        inputCostPerMillionTokens: 3.0,
        outputCostPerMillionTokens: 15.0
      };

      mockedModelCatalog.getModelCost.mockReturnValue(mockCostInfo);

      const inputTokens = 2000;
      const outputTokens = 1000;

      const result = CostService.calculateRealCost(modelConfig, inputTokens, outputTokens);

      // Ожидаемая стоимость:
      // Input: (2000 / 1_000_000) * 3.0 = 0.006
      // Output: (1000 / 1_000_000) * 15.0 = 0.015
      // Total: 0.021
      expect(result).toBeCloseTo(0.021, 6);
      expect(mockedModelCatalog.getModelCost).toHaveBeenCalledWith(AIProvider.ANTHROPIC, AnthropicModel.SONNET);
    });

    it('should return 0 when cost information is not available', () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: 'unknown-model',
        temperature: 0.8,
        maxTokens: 1000,
        timeout: 20000,
        retries: 2
      };

      mockedModelCatalog.getModelCost.mockReturnValue(null);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = CostService.calculateRealCost(modelConfig, 1000, 500);

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('No cost information available for gemini:unknown-model');
      expect(mockedModelCatalog.getModelCost).toHaveBeenCalledWith(AIProvider.GEMINI, 'unknown-model');

      consoleSpy.mockRestore();
    });

    it('should handle zero tokens correctly', () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.8,
        maxTokens: 1000,
        timeout: 20000,
        retries: 2
      };

      const mockCostInfo = {
        inputCostPerMillionTokens: 0.15,
        outputCostPerMillionTokens: 0.30
      };

      mockedModelCatalog.getModelCost.mockReturnValue(mockCostInfo);

      const result = CostService.calculateRealCost(modelConfig, 0, 0);

      expect(result).toBe(0);
    });

    it('should handle large token counts correctly', () => {
      const modelConfig: ModelConfig = {
        provider: AIProvider.GEMINI,
        model: GeminiModel.PRO,
        temperature: 0.5,
        maxTokens: 10000,
        timeout: 50000,
        retries: 1
      };

      const mockCostInfo = {
        inputCostPerMillionTokens: 3.50,
        outputCostPerMillionTokens: 10.50
      };

      mockedModelCatalog.getModelCost.mockReturnValue(mockCostInfo);

      const inputTokens = 1_000_000; // 1 million tokens
      const outputTokens = 500_000;  // 0.5 million tokens

      const result = CostService.calculateRealCost(modelConfig, inputTokens, outputTokens);

      // Ожидаемая стоимость:
      // Input: (1_000_000 / 1_000_000) * 3.50 = 3.50
      // Output: (500_000 / 1_000_000) * 10.50 = 5.25
      // Total: 8.75
      expect(result).toBeCloseTo(8.75, 2);
    });
  });

  describe('calculateMargin', () => {
    it('should calculate positive margin correctly', () => {
      const realCostUSD = 0.01;
      const creditsCharged = 5;
      const usdPerCredit = 0.02;

      const result = CostService.calculateMargin(realCostUSD, creditsCharged, usdPerCredit);

      // Revenue: 5 * 0.02 = 0.10
      // Margin: ((0.10 - 0.01) / 0.10) * 100 = 90%
      expect(result).toBeCloseTo(90, 2);
    });

    it('should calculate negative margin correctly', () => {
      const realCostUSD = 0.15;
      const creditsCharged = 5;
      const usdPerCredit = 0.02;

      const result = CostService.calculateMargin(realCostUSD, creditsCharged, usdPerCredit);

      // Revenue: 5 * 0.02 = 0.10
      // Margin: ((0.10 - 0.15) / 0.10) * 100 = -50%
      expect(result).toBeCloseTo(-50, 2);
    });

    it('should return 0 margin when no credits charged', () => {
      const realCostUSD = 0.01;
      const creditsCharged = 0;
      const usdPerCredit = 0.02;

      const result = CostService.calculateMargin(realCostUSD, creditsCharged, usdPerCredit);

      expect(result).toBe(0);
    });

    it('should return 0 margin when usdPerCredit is 0', () => {
      const realCostUSD = 0.01;
      const creditsCharged = 5;
      const usdPerCredit = 0;

      const result = CostService.calculateMargin(realCostUSD, creditsCharged, usdPerCredit);

      expect(result).toBe(0);
    });

    it('should handle zero cost correctly', () => {
      const realCostUSD = 0;
      const creditsCharged = 5;
      const usdPerCredit = 0.02;

      const result = CostService.calculateMargin(realCostUSD, creditsCharged, usdPerCredit);

      // Revenue: 5 * 0.02 = 0.10
      // Margin: ((0.10 - 0) / 0.10) * 100 = 100%
      expect(result).toBeCloseTo(100, 2);
    });

    it('should handle edge case where cost equals revenue', () => {
      const realCostUSD = 0.10;
      const creditsCharged = 5;
      const usdPerCredit = 0.02;

      const result = CostService.calculateMargin(realCostUSD, creditsCharged, usdPerCredit);

      // Revenue: 5 * 0.02 = 0.10
      // Margin: ((0.10 - 0.10) / 0.10) * 100 = 0%
      expect(result).toBeCloseTo(0, 2);
    });
  });
});
