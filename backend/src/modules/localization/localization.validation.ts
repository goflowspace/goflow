import { z } from 'zod';
import { TranslationMethod, LocalizationStatus } from '@prisma/client';

// Список поддерживаемых языков
const SUPPORTED_LANGUAGES = [
  'en', 'ru', 'es', 'fr', 'pt', 'de', 'it', 'ja', 'ko', 'zh-CN',
  'ar', 'hi', 'th', 'vi', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
] as const;

// Схемы для валидации

export const LocalizationConfigSchema = z.object({
  baseLanguage: z.enum(SUPPORTED_LANGUAGES as any, {
    errorMap: () => ({ message: 'Base language must be a supported language code' })
  }),
  targetLanguages: z.array(
    z.enum(SUPPORTED_LANGUAGES as any, {
      errorMap: () => ({ message: 'Target language must be a supported language code' })
    })
  ).min(1, 'At least one target language is required')
    .max(10, 'Maximum 10 target languages allowed'),
  autoTranslate: z.boolean().optional(),
  preserveMarkup: z.boolean().optional(),
  requireReview: z.boolean().optional(),
  minContextWords: z.number().int().min(5).max(100).optional(),
  maxBatchSize: z.number().int().min(1).max(200).optional(),
}).refine(data => {
  // Базовый язык не должен быть в целевых языках
  return !data.targetLanguages.includes(data.baseLanguage as any);
}, {
  message: 'Base language cannot be in target languages list',
  path: ['targetLanguages']
});

export const AddLanguageSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES as any, {
    errorMap: () => ({ message: 'Language must be a supported language code' })
  })
});

export const TranslationUpdateSchema = z.object({
  localizationId: z.string().min(1, 'Localization ID is required'),
  translatedText: z.string().min(1, 'Translated text cannot be empty').max(10000, 'Translated text too long'),
  method: z.nativeEnum(TranslationMethod),
  quality: z.number().min(0).max(1).optional(),
  reviewedBy: z.string().optional()
});

export const BulkTranslationUpdateSchema = z.object({
  updates: z.array(TranslationUpdateSchema).min(1, 'At least one update is required').max(100, 'Maximum 100 updates per batch')
});

export const ScanOptionsSchema = z.object({
  timelineId: z.string().optional()
});

export const SyncOptionsSchema = z.object({
  timelineId: z.string().optional()
});

export const GetTimelineTextsSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES as any).optional()
});

export const AITranslationOptionsSchema = z.object({
  timelineId: z.string().optional(),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES as any).optional(),
  maxTexts: z.number().int().min(1).max(1000).optional().default(50)
});

export const ExportOptionsSchema = z.object({
  format: z.enum(['json', 'csv', 'xliff']).default('json'),
  language: z.enum(SUPPORTED_LANGUAGES as any).optional()
});

export const ImportDataSchema = z.object({
  format: z.enum(['json', 'csv', 'xliff']),
  data: z.any(), // Will be validated based on format
  targetLanguage: z.enum(SUPPORTED_LANGUAGES as any),
  overwriteExisting: z.boolean().optional().default(false)
});

// JSON Import Format Schema
export const JsonImportSchema = z.array(
  z.object({
    nodeId: z.string(),
    fieldPath: z.string(),
    originalText: z.string(),
    translatedText: z.string(),
    layerId: z.string().optional(),
  })
);

// Query parameter validation schemas
export const ProjectIdParamSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required')
});

export const TimelineIdParamSchema = z.object({
  timelineId: z.string().min(1, 'Timeline ID is required')
});

export const LocalizationIdParamSchema = z.object({
  localizationId: z.string().min(1, 'Localization ID is required')
});

export const LanguageParamSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES as any)
});

// Validation helper functions

export function validateLocalizationConfig(data: any) {
  try {
    return LocalizationConfigSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        'Validation failed: ' + 
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }
    throw error;
  }
}

export function validateTranslationUpdate(data: any) {
  try {
    return TranslationUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        'Validation failed: ' + 
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }
    throw error;
  }
}

export function validateBulkTranslationUpdate(data: any) {
  try {
    return BulkTranslationUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        'Validation failed: ' + 
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }
    throw error;
  }
}

export function validateLanguageCode(language: string): boolean {
  return SUPPORTED_LANGUAGES.includes(language as any);
}

export function validateImportData(data: any, format: 'json' | 'csv' | 'xliff') {
  switch (format) {
    case 'json':
      try {
        return JsonImportSchema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            'JSON import validation failed: ' + 
            error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          );
        }
        throw error;
      }
    case 'csv':
    case 'xliff':
      // TODO: Implement validation for these formats
      throw new Error(`Validation for ${format} format not yet implemented`);
    default:
      throw new Error(`Unsupported import format: ${format}`);
  }
}

// Export supported languages list
export { SUPPORTED_LANGUAGES };

// Field path validation helpers
export const VALID_FIELD_PATHS = [
  'data.title',
  'data.text'
] as const;

export const CHOICE_FIELD_PATH_REGEX = /^choices\.[a-zA-Z0-9_-]+\.text$/;

export function validateFieldPath(fieldPath: string): boolean {
  return VALID_FIELD_PATHS.includes(fieldPath as any) || 
         CHOICE_FIELD_PATH_REGEX.test(fieldPath);
}

// Status transition validation
const VALID_STATUS_TRANSITIONS: Record<LocalizationStatus, LocalizationStatus[]> = {
  [LocalizationStatus.PENDING]: [
    LocalizationStatus.TRANSLATING,
    LocalizationStatus.TRANSLATED,
    LocalizationStatus.ARCHIVED
  ],
  [LocalizationStatus.TRANSLATING]: [
    LocalizationStatus.TRANSLATED,
    LocalizationStatus.PENDING,
    LocalizationStatus.ARCHIVED
  ],
  [LocalizationStatus.TRANSLATED]: [
    LocalizationStatus.REVIEWED,
    LocalizationStatus.REJECTED,
    LocalizationStatus.APPROVED,
    LocalizationStatus.ARCHIVED
  ],
  [LocalizationStatus.REVIEWED]: [
    LocalizationStatus.APPROVED,
    LocalizationStatus.REJECTED,
    LocalizationStatus.TRANSLATED,
    LocalizationStatus.ARCHIVED
  ],
  [LocalizationStatus.APPROVED]: [
    LocalizationStatus.PROTECTED,
    LocalizationStatus.OUTDATED,
    LocalizationStatus.ARCHIVED
  ],
  [LocalizationStatus.PROTECTED]: [
    LocalizationStatus.APPROVED,
    LocalizationStatus.OUTDATED,
    LocalizationStatus.ARCHIVED
  ],
  [LocalizationStatus.REJECTED]: [
    LocalizationStatus.PENDING,
    LocalizationStatus.TRANSLATED,
    LocalizationStatus.ARCHIVED
  ],
  [LocalizationStatus.OUTDATED]: [
    LocalizationStatus.PENDING,
    LocalizationStatus.TRANSLATING,
    LocalizationStatus.TRANSLATED,
    LocalizationStatus.ARCHIVED
  ],
  [LocalizationStatus.ARCHIVED]: []
};

export function validateStatusTransition(
  currentStatus: LocalizationStatus,
  newStatus: LocalizationStatus
): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return validTransitions.includes(newStatus);
}

// Text content validation helpers
export function validateTextContent(text: string): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[] 
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!text || text.trim().length === 0) {
    errors.push('Text cannot be empty');
    return { isValid: false, errors, warnings };
  }

  if (text.length > 10000) {
    errors.push('Text is too long (maximum 10,000 characters)');
  }

  // Check for potentially problematic content
  const suspiciousPatterns = [
    /\b(script|javascript|onclick|onload|onerror)\b/i,
    /<\s*(script|iframe|object|embed)\b/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      warnings.push('Text contains potentially unsafe content');
      break;
    }
  }

  // Check for unbalanced markup
  const openTags = (text.match(/<[^/][^>]*>/g) || []).length;
  const closeTags = (text.match(/<\/[^>]*>/g) || []).length;
  
  if (openTags !== closeTags) {
    warnings.push('Text may contain unbalanced HTML tags');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Bulk operations validation schemas
export const BulkApproveSchema = z.object({
  localizationIds: z.array(z.string().min(1, 'Localization ID is required')).min(1, 'At least one localization ID is required').max(100, 'Too many items (maximum 100)')
});

export const BulkProtectSchema = z.object({
  localizationIds: z.array(z.string().min(1, 'Localization ID is required')).min(1, 'At least one localization ID is required').max(100, 'Too many items (maximum 100)')
});

export const BulkUnprotectSchema = z.object({
  localizationIds: z.array(z.string().min(1, 'Localization ID is required')).min(1, 'At least one localization ID is required').max(100, 'Too many items (maximum 100)')
});

export const BulkDeleteSchema = z.object({
  localizationIds: z.array(z.string().min(1, 'Localization ID is required')).min(1, 'At least one localization ID is required').max(100, 'Too many items (maximum 100)')
});
