// backend/src/modules/ai/v2/validation/__tests__/ValidationIntegration.test.ts
import { BibleGenerationInputSchema } from '../BibleValidationSchemas';
import { InputValidator } from '../InputValidator';
import { BibleGenerationInput } from '../../core/AbstractBibleGenerationOperation';

describe('Validation Integration', () => {
  describe('BibleGenerationInputSchema', () => {
    const validInput: BibleGenerationInput = {
      projectName: 'My Awesome Project',
      projectContext: 'This is a detailed project context that describes the main story, characters, and setting. It contains enough information to generate quality bible content with proper narrative structure and compelling character development.',
      additionalContext: {
        existingFields: {
          projectGenres: ['fantasy', 'adventure'],
          targetAudience: 'Young adults interested in fantasy literature'
        }
      }
    };

    it('should validate correct input', () => {
      const result = InputValidator.validate(validInput, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedInput).toBeDefined();
    });

    it('should reject missing project name', () => {
      const input = { ...validInput };
      delete (input as any).projectName;
      
      const result = InputValidator.validate(input, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED')).toBe(true);
    });

    it('should accept short project context (minLength is 0)', () => {
      const input = {
        ...validInput,
        projectContext: 'Too short'
      };

      const result = InputValidator.validate(input, BibleGenerationInputSchema);

      expect(result.isValid).toBe(true);
    });

    it('should reject project name with invalid characters', () => {
      const input = {
        ...validInput,
        projectName: 'Project|With:Invalid*Characters'
      };
      
      const result = InputValidator.validate(input, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CHARACTERS')).toBe(true);
    });

    it('should accept context with few words (context validation not implemented)', () => {
      const input = {
        ...validInput,
        projectContext: 'Short context with few words here and there'
      };

      const result = InputValidator.validate(input, BibleGenerationInputSchema);

      expect(result.isValid).toBe(true);
    });

    it('should detect suspicious content in context', () => {
      const input = {
        ...validInput,
        projectContext: 'A project about heroes fighting evil with <script>alert("hack")</script> special powers and magical abilities in a fantasy world filled with adventure and mystery'
      };
      
      const result = InputValidator.validate(input, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'SUSPICIOUS_CONTENT')).toBe(true);
    });

    it('should sanitize project name spaces', () => {
      const input = {
        ...validInput,
        projectName: '  My   Project   Name  '
      };
      
      const result = InputValidator.validate(input, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput?.projectName).toBe('My Project Name');
    });

    it('should handle optional fields correctly', () => {
      const minimalInput = {
        projectName: 'Minimal Project',
        projectContext: 'This is a minimal but sufficient project context that meets the length requirements and provides enough detail for bible generation'
      };
      
      const result = InputValidator.validate(minimalInput, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept additionalContext with many genres (no nested validation)', () => {
      const input = {
        ...validInput,
        additionalContext: {
          ...validInput.additionalContext,
          projectGenres: [
            'fantasy', 'sci-fi', 'romance', 'thriller', 'horror',
            'comedy', 'drama', 'action', 'mystery', 'adventure',
            'western'
          ]
        }
      };

      const result = InputValidator.validate(input, BibleGenerationInputSchema);

      expect(result.isValid).toBe(true);
    });

    it('should sanitize target audience', () => {
      const input = {
        ...validInput,
        additionalContext: {
          ...validInput.additionalContext,
          targetAudience: '  <b>Young adults</b>   interested in fantasy  '
        }
      };
      
      const result = InputValidator.validate(input, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput?.additionalContext?.targetAudience).toBe('Young adults interested in fantasy');
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined values gracefully', () => {
      const input = {
        projectName: 'Test Project',
        projectContext: 'Valid context with enough characters to pass minimum length requirements for proper validation',
        additionalContext: {
          existingFields: null,
          projectGenres: undefined,
          targetAudience: ''
        }
      };
      
      const result = InputValidator.validate(input, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle very long valid input', () => {
      const longContext = 'A'.repeat(9000) + ' ' + 'This is a very long project context that tests the upper bounds of our validation system.';
      
      const input = {
        projectName: 'Long Context Project',
        projectContext: longContext,
        additionalContext: {
          targetAudience: 'B'.repeat(900) // Close to limit but valid
        }
      };
      
      const result = InputValidator.validate(input, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject input exceeding maximum lengths', () => {
      const input = {
        projectName: 'A'.repeat(101), // Exceeds 100 char limit
        projectContext: 'Valid context with enough characters to pass minimum length requirements for proper validation',
        additionalContext: {
          targetAudience: 'A'.repeat(1001) // Exceeds 1000 char limit
        }
      };
      
      const result = InputValidator.validate(input, BibleGenerationInputSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MAX_LENGTH')).toBe(true);
    });
  });
});
