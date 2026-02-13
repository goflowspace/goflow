// backend/src/modules/ai/v2/validation/__tests__/InputSanitizer.test.ts
import { InputSanitizer } from '../InputSanitizer';

describe('InputSanitizer', () => {
  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("hack")</script> world';
      const result = InputSanitizer.sanitizeText(input);
      
      expect(result).toBe('Hello world');
      expect(result).not.toContain('<script>');
    });

    it('should remove javascript protocol', () => {
      const input = 'Click <a href="javascript:alert(\'hack\')">here</a>';
      const result = InputSanitizer.sanitizeText(input);
      
      expect(result).not.toContain('javascript:');
    });

    it('should remove HTML tags by default', () => {
      const input = 'Hello <b>bold</b> and <i>italic</i> text';
      const result = InputSanitizer.sanitizeText(input);
      
      expect(result).toBe('Hello bold and italic text');
    });

    it('should preserve allowed HTML tags', () => {
      const input = 'Hello <b>bold</b> and <script>hack</script> text';
      const result = InputSanitizer.sanitizeText(input, { allowedTags: ['b'] });
      
      expect(result).toContain('<b>bold</b>');
      expect(result).not.toContain('<script>');
    });

    it('should normalize spaces', () => {
      const input = 'Hello     world   \n\n\n\n   test';
      const result = InputSanitizer.sanitizeText(input);
      
      expect(result).toBe('Hello world\n\n test');
    });

    it('should remove empty lines when requested', () => {
      const input = 'Line 1\n\n\nLine 2\n\nLine 3';
      const result = InputSanitizer.sanitizeText(input, { removeEmptyLines: true });
      
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should limit text length', () => {
      const input = 'This is a very long text that should be truncated';
      const result = InputSanitizer.sanitizeText(input, { maxLength: 20 });
      
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toBe('This is a very long');
    });

    it('should trim whitespace', () => {
      const input = '   Hello world   ';
      const result = InputSanitizer.sanitizeText(input);
      
      expect(result).toBe('Hello world');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string properties', () => {
      const input = {
        name: '  John <script>hack</script> Doe  ',
        description: 'A <b>bold</b> description'
      };
      
      const result = InputSanitizer.sanitizeObject(input);
      
      expect(result.name).toBe('John Doe');
      expect(result.description).toBe('A bold description');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '  John  ',
          profile: {
            bio: 'A <script>hack</script> bio'
          }
        }
      };
      
      const result = InputSanitizer.sanitizeObject(input);
      
      expect(result.user.name).toBe('John');
      expect(result.user.profile.bio).toBe('A bio');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['  tag1  ', '<script>hack</script>', 'tag3']
      };
      
      const result = InputSanitizer.sanitizeObject(input);
      
      expect(result.tags).toEqual(['tag1', '', 'tag3']);
    });

    it('should apply field-specific options', () => {
      const input = {
        title: '  <b>Important</b> Title  ',
        content: '  Regular content  '
      };
      
      const fieldOptions = {
        title: { allowedTags: ['b'] },
        content: {}
      };
      
      const result = InputSanitizer.sanitizeObject(input, fieldOptions);
      
      expect(result.title).toBe('<b>Important</b> Title');
      expect(result.content).toBe('Regular content');
    });
  });

  describe('detectSuspiciousContent', () => {
    it('should detect script tags', () => {
      const input = 'Hello <script>alert("hack")</script> world';
      const result = InputSanitizer.detectSuspiciousContent(input);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Содержит script теги');
    });

    it('should detect javascript protocol', () => {
      const input = 'Click javascript:alert("hack") here';
      const result = InputSanitizer.detectSuspiciousContent(input);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Содержит javascript протокол');
    });

    it('should detect event handlers', () => {
      const input = '<div onclick="hack()">Click me</div>';
      const result = InputSanitizer.detectSuspiciousContent(input);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Содержит обработчики событий');
    });

    it('should detect eval function', () => {
      const input = 'const result = eval("malicious code");';
      const result = InputSanitizer.detectSuspiciousContent(input);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Содержит eval функцию');
    });

    it('should detect template expressions', () => {
      const input = 'Hello {{user.name}} with {{ dangerous.code }}';
      const result = InputSanitizer.detectSuspiciousContent(input);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Подозрительные шаблонные выражения');
    });

    it('should not flag safe content', () => {
      const input = 'This is a completely safe text without any suspicious content';
      const result = InputSanitizer.detectSuspiciousContent(input);
      
      expect(result.isSuspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('escapeSpecialChars', () => {
    it('should escape HTML special characters', () => {
      const input = '<div class="test" data-value=\'hello\'>Hello & "world"</div>';
      const result = InputSanitizer.escapeSpecialChars(input);
      
      expect(result).toBe('&lt;div class=&quot;test&quot; data-value=&#x27;hello&#x27;&gt;Hello &amp; &quot;world&quot;&lt;&#x2F;div&gt;');
    });
  });

  describe('sanitizeAIPrompt', () => {
    it('should sanitize AI prompt with appropriate settings', () => {
      const input = '  This is a long prompt   with    multiple spaces\n\n\nand empty lines  ';
      const result = InputSanitizer.sanitizeAIPrompt(input);
      
      expect(result).toBe('This is a long prompt with multiple spaces\n\nand empty lines');
    });

    it('should respect max length for AI prompts', () => {
      const input = 'a'.repeat(60000);
      const result = InputSanitizer.sanitizeAIPrompt(input);
      
      expect(result.length).toBeLessThanOrEqual(50000);
    });
  });
});
