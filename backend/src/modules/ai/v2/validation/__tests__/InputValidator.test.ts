// backend/src/modules/ai/v2/validation/__tests__/InputValidator.test.ts
import { InputValidator, CommonValidationRules } from '../InputValidator';
import { ValidationSchema } from '../ValidationTypes';

describe('InputValidator', () => {
  describe('validateAIPrompt', () => {
    it('should pass valid prompt', () => {
      const prompt = 'This is a valid prompt for AI generation';
      const result = InputValidator.validateAIPrompt(prompt);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedInput?.prompt).toBe(prompt);
    });

    it('should fail for empty prompt', () => {
      const result = InputValidator.validateAIPrompt('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('should fail for too long prompt', () => {
      const longPrompt = 'a'.repeat(50001);
      const result = InputValidator.validateAIPrompt(longPrompt);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MAX_LENGTH')).toBe(true);
    });

    it('should detect suspicious content', () => {
      const suspiciousPrompt = 'Generate content with <script>alert("hack")</script>';
      const result = InputValidator.validateAIPrompt(suspiciousPrompt);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'SUSPICIOUS_CONTENT')).toBe(true);
    });
  });

  describe('validate with schema', () => {
    const testSchema: ValidationSchema = {
      name: {
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 50,
        sanitization: {
          trimWhitespace: true,
          normalizeSpaces: true
        }
      },
      email: {
        required: true,
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      tags: {
        required: false,
        type: 'array',
        maxLength: 5
      }
    };

    it('should pass valid input', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        tags: ['tag1', 'tag2']
      };
      
      const result = InputValidator.validate(input, testSchema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedInput).toBeDefined();
    });

    it('should fail for missing required fields', () => {
      const input = {
        email: 'john@example.com'
      };
      
      const result = InputValidator.validate(input, testSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED')).toBe(true);
    });

    it('should validate string length', () => {
      const input = {
        name: 'A', // Too short
        email: 'john@example.com'
      };
      
      const result = InputValidator.validate(input, testSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MIN_LENGTH')).toBe(true);
    });

    it('should validate email pattern', () => {
      const input = {
        name: 'John Doe',
        email: 'invalid-email'
      };
      
      const result = InputValidator.validate(input, testSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'PATTERN_MISMATCH')).toBe(true);
    });

    it('should validate array length', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'] // Too many
      };
      
      const result = InputValidator.validate(input, testSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MAX_ARRAY_LENGTH')).toBe(true);
    });

    it('should sanitize input', () => {
      const input = {
        name: '  John   Doe  ', // Extra spaces
        email: 'john@example.com'
      };
      
      const result = InputValidator.validate(input, testSchema);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput?.name).toBe('John Doe'); // Normalized
    });
  });

  describe('CommonValidationRules', () => {
    it('should detect HTML tags', () => {
      const rule = CommonValidationRules.noHtmlTags();
      const error = rule.validate('<p>Some HTML content</p>');
      
      expect(error).not.toBeNull();
      expect(error?.code).toBe('HTML_NOT_ALLOWED');
    });

    it('should validate project names', () => {
      const rule = CommonValidationRules.projectName();
      
      const validName = rule.validate('My Project');
      expect(validName).toBeNull();
      
      const invalidName = rule.validate('Project|With:Invalid*Chars');
      expect(invalidName).not.toBeNull();
      expect(invalidName?.code).toBe('INVALID_CHARACTERS');
    });

    it('should accept any project context (validation not implemented)', () => {
      const rule = CommonValidationRules.projectContext();

      const validContext = rule.validate('This is a detailed project context with more than ten words for proper validation');
      expect(validContext).toBeNull();

      const shortContext = rule.validate('Too short context');
      expect(shortContext).toBeNull();
    });
  });
});
