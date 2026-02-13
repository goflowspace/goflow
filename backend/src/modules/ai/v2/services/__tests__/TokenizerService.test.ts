// backend/src/modules/ai/v2/services/__tests__/TokenizerService.test.ts
import { TokenizerService } from '../TokenizerService';

describe('TokenizerService', () => {
  describe('count', () => {
    it('should return 0 for empty string', () => {
      const result = TokenizerService.count('');
      expect(result).toBe(0);
    });

    it('should return 0 for null input', () => {
      const result = TokenizerService.count(null as any);
      expect(result).toBe(0);
    });

    it('should return 0 for undefined input', () => {
      const result = TokenizerService.count(undefined as any);
      expect(result).toBe(0);
    });

    it('should calculate tokens for short text correctly', () => {
      const text = 'Hello'; // 5 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(5 / 4) = 2
      expect(result).toBe(2);
    });

    it('should calculate tokens for medium text correctly', () => {
      const text = 'Hello, world! This is a test.'; // 30 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(30 / 4) = 8
      expect(result).toBe(8);
    });

    it('should calculate tokens for long text correctly', () => {
      const text = 'This is a longer text that contains multiple sentences and should be tokenized accordingly. It has more than one hundred characters to test the tokenization logic properly.'; // 172 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(172 / 4) = 43
      expect(result).toBe(43);
    });

    it('should handle text with special characters', () => {
      const text = '你好世界! 🌍 @#$%^&*()'; // 19 characters (including emojis and special chars)
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(19 / 4) = 5
      expect(result).toBe(5);
    });

    it('should handle text with newlines and whitespace', () => {
      const text = 'Line 1\n\nLine 2\t\tLine 3   '; // 26 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(26 / 4) = 7
      expect(result).toBe(7);
    });

    it('should handle very long text', () => {
      const text = 'a'.repeat(10000); // 10,000 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(10000 / 4) = 2500
      expect(result).toBe(2500);
    });

    it('should handle text with exactly 4 characters', () => {
      const text = 'test'; // 4 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(4 / 4) = 1
      expect(result).toBe(1);
    });

    it('should handle text with 5 characters (boundary case)', () => {
      const text = 'tests'; // 5 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(5 / 4) = 2
      expect(result).toBe(2);
    });

    it('should handle single character', () => {
      const text = 'a'; // 1 character
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(1 / 4) = 1
      expect(result).toBe(1);
    });

    it('should handle JSON string', () => {
      const text = '{"key": "value", "number": 123}'; // 32 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(32 / 4) = 8
      expect(result).toBe(8);
    });

    it('should be consistent with multiple calls', () => {
      const text = 'Consistent tokenization test';
      const result1 = TokenizerService.count(text);
      const result2 = TokenizerService.count(text);
      const result3 = TokenizerService.count(text);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(7); // Math.ceil(28 / 4) = 7
    });

    it('should handle multilingual text', () => {
      const text = 'Hello мир 世界 سلام'; // Mix of English, Russian, Chinese, Arabic - 18 characters
      const result = TokenizerService.count(text);
      
      // Ожидаемое количество токенов: Math.ceil(18 / 4) = 5
      expect(result).toBe(5);
    });
  });
});
