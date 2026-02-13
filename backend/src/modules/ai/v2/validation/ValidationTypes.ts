// backend/src/modules/ai/v2/validation/ValidationTypes.ts

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedInput?: any;
}

export interface SanitizationOptions {
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: string[];
  trimWhitespace?: boolean;
  removeEmptyLines?: boolean;
  normalizeSpaces?: boolean;
}

export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T, context?: any) => ValidationError | null;
}

export interface FieldValidationConfig {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customRules?: ValidationRule[];
  sanitization?: SanitizationOptions;
}

export interface ValidationSchema {
  [fieldName: string]: FieldValidationConfig;
}
