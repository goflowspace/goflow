// backend/src/modules/ai/v2/validation/BibleValidationSchemas.ts
import { ValidationSchema } from './ValidationTypes';
import { CommonValidationRules } from './InputValidator';

/**
 * Схема валидации для базового входа Bible Generation
 */
export const BibleGenerationInputSchema: ValidationSchema = {
  projectName: {
    required: true,
    type: 'string',
    minLength: 0,
    maxLength: 100,
    customRules: [CommonValidationRules.projectName()],
    sanitization: {
      maxLength: 100,
      trimWhitespace: true,
      normalizeSpaces: true
    }
  },
  
  projectContext: {
    required: true,
    type: 'string',
    minLength: 0,
    maxLength: 10000,
    customRules: [
      CommonValidationRules.projectContext(),
      CommonValidationRules.noHtmlTags()
    ],
    sanitization: {
      maxLength: 10000,
      trimWhitespace: true,
      normalizeSpaces: true,
      removeEmptyLines: false // Сохраняем структуру контекста
    }
  },

  additionalContext: {
    required: false,
    type: 'object',
    customRules: [
    ]
  }
};

/**
 * Схема валидации для операций анализа аудитории
 */
export const AudienceAnalysisInputSchema: ValidationSchema = {
  ...BibleGenerationInputSchema,
  
  projectContext: {
    ...BibleGenerationInputSchema.projectContext,
    customRules: [
      CommonValidationRules.projectContext(),
      CommonValidationRules.noHtmlTags()
    ]
  }
};

/**
 * Маппинг операций к схемам валидации
 */
export const OperationValidationSchemas: Record<string, ValidationSchema> = {
  // TODO: add validation schemas for all operations
};
