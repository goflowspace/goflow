// backend/src/modules/ai/v2/validation/index.ts

import { InputSanitizer } from './InputSanitizer';
import { InputValidator } from './InputValidator';

// Основные классы
export { InputValidator, CommonValidationRules } from './InputValidator';
export { InputSanitizer } from './InputSanitizer';

// Типы и интерфейсы
export type {
  ValidationError,
  ValidationResult,
  ValidationRule,
  ValidationSchema,
  FieldValidationConfig,
  SanitizationOptions
} from './ValidationTypes';

// Предопределенные схемы
export {
  BibleGenerationInputSchema,
  AudienceAnalysisInputSchema,
  OperationValidationSchemas
} from './BibleValidationSchemas';

// Быстрые утилиты для общих случаев
export const QuickValidation = {
  /**
   * Быстрая валидация AI промпта
   */
  validatePrompt: InputValidator.validateAIPrompt,
  
  /**
   * Быстрая санитизация текста
   */
  sanitizeText: InputSanitizer.sanitizeText,
  
  /**
   * Быстрая проверка на подозрительный контент
   */
  checkSuspicious: InputSanitizer.detectSuspiciousContent,
  
  /**
   * Быстрая санитизация для AI промптов
   */
  sanitizePrompt: InputSanitizer.sanitizeAIPrompt
};
