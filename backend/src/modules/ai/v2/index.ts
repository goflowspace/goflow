// backend/src/modules/ai/v2/index.ts

// Core exports
export { AbstractAIOperation } from './core/AbstractAIOperation';
export { AbstractBibleGenerationOperation } from './core/AbstractBibleGenerationOperation';
export { AbstractEntityGenerationOperation } from './core/AbstractEntityGenerationOperation';
export { AIPipeline } from './core/AIPipeline';
export { StreamingPipelineEngine } from './core/PipelineEngine';

// Bible Generation Pipeline
export { BibleGenerationPipeline, executeBibleGenerationWithProgress } from './pipelines/BibleGenerationPipeline';

// Single Field Bible Pipeline
export { 
  SingleFieldBiblePipeline, 
  executeSingleFieldGenerationWithProgress, 
  generateSingleFieldQuick,
  getSingleFieldPipelineStructure,
  createSingleFieldBiblePipeline,
  createFieldOperation,
  SingleFieldBibleInput,
  ExtendedBibleGenerationInput
} from './pipelines/SingleFieldBiblePipeline';

// Entity Image Generation Pipeline
export { 
  EntityImageGenerationPipelineV2,
  EntityImageGenerationPipelineV2Instance,
  executeEntityImageGenerationWithProgress,
  EntityImageGenerationPipelineInputV2
} from './pipelines/EntityImageGenerationPipelineV2';

// Bible Generation Operations
export { SynopsisGenerationOperation } from './operations/bible/SynopsisGenerationOperation';
export { LoglineGenerationOperation } from './operations/bible/LoglineGenerationOperation';
export { GenreGenerationOperation } from './operations/bible/GenreGenerationOperation';
export { SettingGenerationOperation } from './operations/bible/SettingGenerationOperation';
export { AtmosphereGenerationOperation } from './operations/bible/AtmosphereGenerationOperation';
export { TargetAudienceGenerationOperation } from './operations/bible/TargetAudienceGenerationOperation';
export { ThemeGenerationOperation } from './operations/bible/ThemeGenerationOperation';
export { MessageGenerationOperation } from './operations/bible/MessageGenerationOperation';
export { UniqueFeaturesGenerationOperation } from './operations/bible/UniqueFeaturesGenerationOperation';
export { ReferencesGenerationOperation } from './operations/bible/ReferencesGenerationOperation';
export { VisualStyleGenerationOperation } from './operations/bible/VisualStyleGenerationOperation';
export { LanguageDetectionOperation } from './operations/bible/LanguageDetectionOperation';

// Types
export * from './shared/types';
export * from './shared/pipeline-types';

// Validation
export { InputValidator, CommonValidationRules } from './validation/InputValidator';
export { InputSanitizer } from './validation/InputSanitizer';
export * from './validation/ValidationTypes';

// Bible validation schemas
export {
  BibleGenerationInputSchema,
  AudienceAnalysisInputSchema,
  OperationValidationSchemas as BibleOperationValidationSchemas
} from './validation/BibleValidationSchemas';

// Entity validation schemas
export {
  EntityGenerationInputSchema,
  ProjectContextAnalysisInputSchema,
  EntityTypeDetectionInputSchema,
  EntityFieldGenerationInputSchema,
  EntityCreationInputSchema,
  OperationValidationSchemas as EntityOperationValidationSchemas
} from './validation/EntityValidationSchemas';

// Interfaces
export type { 
  BibleGenerationInput
} from './core/AbstractBibleGenerationOperation';
export type { 
  EntityGenerationInput 
} from './core/AbstractEntityGenerationOperation';
export type {
  LanguageDetectionInput,
  LanguageDetectionOutput
} from './operations/bible/LanguageDetectionOperation';
