// backend/src/modules/ai/v2/validation/InputValidator.ts
import { 
  ValidationResult, 
  ValidationError, 
  ValidationSchema, 
  FieldValidationConfig,
  ValidationRule 
} from './ValidationTypes';
import { InputSanitizer } from './InputSanitizer';

export class InputValidator {
  /**
   * Основной метод валидации объекта по схеме
   */
  static validate<T extends Record<string, any>>(
    input: T, 
    schema: ValidationSchema
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedInput = { ...input } as any;

    for (const [fieldName, config] of Object.entries(schema)) {
      const value = input[fieldName];
      const fieldErrors = this.validateField(fieldName, value, config);
      errors.push(...fieldErrors);

      // Применяем санитизацию, если нет критических ошибок
      if (fieldErrors.length === 0) {
        if (config.sanitization && typeof value === 'string') {
          sanitizedInput[fieldName] = InputSanitizer.sanitizeText(value, config.sanitization);
        } else if (fieldName === 'additionalContext' && value && typeof value === 'object') {
          // Специальная обработка для additionalContext
          const sanitizedContext = { ...value };
          
          if (sanitizedContext.targetAudience && typeof sanitizedContext.targetAudience === 'string') {
            sanitizedContext.targetAudience = InputSanitizer.sanitizeText(sanitizedContext.targetAudience, {
              maxLength: 1000,
              trimWhitespace: true,
              normalizeSpaces: true
            });
          }
          
          sanitizedInput[fieldName] = sanitizedContext;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedInput: errors.length === 0 ? sanitizedInput as T : undefined
    };
  }

  /**
   * Валидация отдельного поля
   */
  private static validateField(
    fieldName: string, 
    value: any, 
    config: FieldValidationConfig
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Проверка обязательности поля
    if (config.required && this.isEmpty(value)) {
      errors.push({
        field: fieldName,
        message: `Поле "${fieldName}" обязательно для заполнения`,
        code: 'REQUIRED',
        value
      });
      return errors; // Если поле обязательное и пустое, дальше не проверяем
    }

    // Если поле не обязательное и пустое, пропускаем валидацию
    if (!config.required && this.isEmpty(value)) {
      return errors;
    }

    // Проверка типа
    if (config.type && !this.validateType(value, config.type)) {
      errors.push({
        field: fieldName,
        message: `Поле "${fieldName}" должно быть типа ${config.type}`,
        code: 'INVALID_TYPE',
        value
      });
    }

    // Проверки для строк
    if (typeof value === 'string') {
      // Минимальная длина
      if (config.minLength !== undefined && value.length < config.minLength) {
        errors.push({
          field: fieldName,
          message: `Поле "${fieldName}" должно содержать не менее ${config.minLength} символов`,
          code: 'MIN_LENGTH',
          value
        });
      }

      // Максимальная длина
      if (config.maxLength !== undefined && value.length > config.maxLength) {
        errors.push({
          field: fieldName,
          message: `Поле "${fieldName}" должно содержать не более ${config.maxLength} символов`,
          code: 'MAX_LENGTH',
          value
        });
      }

      // Паттерн
      if (config.pattern && !config.pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: `Поле "${fieldName}" не соответствует требуемому формату`,
          code: 'PATTERN_MISMATCH',
          value
        });
      }

      // Проверка на подозрительный контент
      const suspiciousCheck = InputSanitizer.detectSuspiciousContent(value);
      if (suspiciousCheck.isSuspicious) {
        errors.push({
          field: fieldName,
          message: `Поле "${fieldName}" содержит подозрительный контент: ${suspiciousCheck.reasons.join(', ')}`,
          code: 'SUSPICIOUS_CONTENT',
          value
        });
      }
    }

    // Проверки для массивов
    if (Array.isArray(value)) {
      if (config.minLength !== undefined && value.length < config.minLength) {
        errors.push({
          field: fieldName,
          message: `Массив "${fieldName}" должен содержать не менее ${config.minLength} элементов`,
          code: 'MIN_ARRAY_LENGTH',
          value
        });
      }

      if (config.maxLength !== undefined && value.length > config.maxLength) {
        errors.push({
          field: fieldName,
          message: `Массив "${fieldName}" должен содержать не более ${config.maxLength} элементов`,
          code: 'MAX_ARRAY_LENGTH',
          value
        });
      }
    }

    // Кастомные правила валидации
    if (config.customRules) {
      for (const rule of config.customRules) {
        const ruleError = rule.validate(value, { fieldName, config });
        if (ruleError) {
          errors.push(ruleError);
        }
      }
    }

    return errors;
  }

  /**
   * Проверка на пустое значение
   */
  private static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Валидация типа
   */
  private static validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Быстрая валидация для AI промптов
   */
  static validateAIPrompt(prompt: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!prompt || prompt.trim().length === 0) {
      errors.push({
        field: 'prompt',
        message: 'Промпт не может быть пустым',
        code: 'REQUIRED'
      });
    }

    if (prompt.length > 50000) {
      errors.push({
        field: 'prompt',
        message: 'Промпт слишком длинный (максимум 50000 символов)',
        code: 'MAX_LENGTH'
      });
    }

    const suspiciousCheck = InputSanitizer.detectSuspiciousContent(prompt);
    if (suspiciousCheck.isSuspicious) {
      errors.push({
        field: 'prompt',
        message: `Промпт содержит подозрительный контент: ${suspiciousCheck.reasons.join(', ')}`,
        code: 'SUSPICIOUS_CONTENT'
      });
    }

    const sanitizedPrompt = errors.length === 0 
      ? InputSanitizer.sanitizeAIPrompt(prompt) 
      : undefined;

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedInput: sanitizedPrompt ? { prompt: sanitizedPrompt } : undefined
    };
  }
}

// Предопределенные правила валидации
export const CommonValidationRules = {
  /**
   * Проверка на отсутствие HTML тегов
   */
  noHtmlTags: (): ValidationRule => ({
    name: 'noHtmlTags',
    validate: (value: string) => {
      if (typeof value !== 'string') return null;
      
      const hasHtml = /<[^>]*>/g.test(value);
      return hasHtml ? {
        field: '',
        message: 'HTML теги не разрешены',
        code: 'HTML_NOT_ALLOWED',
        value
      } : null;
    }
  }),

  /**
   * Проверка на разумную длину для имен проектов
   */
  projectName: (): ValidationRule => ({
    name: 'projectName',
    validate: (value: string) => {
      if (typeof value !== 'string') return null;
      
      // Проверяем на недопустимые символы для имен файлов
      const invalidChars = /[<>:"/\\|?*]/g;
      if (invalidChars.test(value)) {
        return {
          field: '',
          message: 'Имя проекта содержит недопустимые символы',
          code: 'INVALID_CHARACTERS',
          value
        };
      }
      
      return null;
    }
  }),

  /**
   * Проверка контекста проекта
   */
  projectContext: (): ValidationRule => ({
    name: 'projectContext',
    validate: (value: string) => {
      if (typeof value !== 'string') return null;
      
      return null;
    }
  }),

  /**
   * Обязательное поле
   */
  required: (message = 'Field is required'): ValidationRule => ({
    name: 'required',
    validate: (value: any) => {
      if (value === null || value === undefined || value === '') {
        return {
          field: '',
          message,
          code: 'REQUIRED',
          value
        };
      }
      return null;
    }
  }),

  /**
   * Минимальная длина
   */
  minLength: (min: number, message?: string): ValidationRule => ({
    name: 'minLength',
    validate: (value: string) => {
      if (typeof value !== 'string') return null;
      
      if (value.length < min) {
        return {
          field: '',
          message: message || `Value should be at least ${min} characters`,
          code: 'MIN_LENGTH',
          value
        };
      }
      return null;
    }
  }),

  /**
   * Максимальная длина
   */
  maxLength: (max: number, message?: string): ValidationRule => ({
    name: 'maxLength',
    validate: (value: string) => {
      if (typeof value !== 'string') return null;
      
      if (value.length > max) {
        return {
          field: '',
          message: message || `Value should not exceed ${max} characters`,
          code: 'MAX_LENGTH',
          value
        };
      }
      return null;
    }
  }),

  /**
   * Опциональное поле
   */
  optional: (): ValidationRule => ({
    name: 'optional',
    validate: () => null // Всегда проходит валидацию
  }),

  /**
   * Проверка на булево значение
   */
  boolean: (message = 'Value must be boolean'): ValidationRule => ({
    name: 'boolean',
    validate: (value: any) => {
      if (value !== null && value !== undefined && typeof value !== 'boolean') {
        return {
          field: '',
          message,
          code: 'NOT_BOOLEAN',
          value
        };
      }
      return null;
    }
  })
};
