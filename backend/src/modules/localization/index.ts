// Localization Module Entry Point
export { LocalizationService } from './localization.service';
export { default as localizationRoutes } from './localization.routes';

// Export types and interfaces
export type {
  LocalizationConfig,
  LocalizableText,
  TimelineLocalizationSummary,
  LocalizationStats,
  TextScanResult,
  SyncResult,
  TranslationUpdate,
  TranslationContext,
  BatchTranslationContext,
  TranslationResult,
} from './localization.service';

// Export validation schemas
export {
  LocalizationConfigSchema,
  TranslationUpdateSchema,
  BulkTranslationUpdateSchema,
} from './localization.validation';

// Re-export Prisma enums for convenience
export { LocalizationStatus, TranslationMethod } from '@prisma/client';
