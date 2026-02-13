// Базовый класс
export { BaseBibleGenerationOperation } from './base-bible-generation.operation';
export type { BaseBibleGenerationInput, BaseBibleGenerationOutput } from './base-bible-generation.operation';

// Структурные операции
export { GenreGenerationOperation } from './genre-generation.operation';
export { FormatGenerationOperation } from './format-generation.operation';

// Концептуальные операции
export { LoglineGenerationOperation } from './logline-generation.operation';
export { SynopsisGenerationOperation } from './synopsis-generation.operation';

// Контекстуальные операции
export { SettingGenerationOperation } from './setting-generation.operation';
export { AtmosphereGenerationOperation } from './atmosphere-generation.operation';

// Целевая аудитория
export { TargetAudienceGenerationOperation } from './target-audience-generation.operation';

// Тематические операции
export { ThemeGenerationOperation } from './theme-generation.operation';
export { MessageGenerationOperation } from './message-generation.operation';

// Дифференциирующие операции
export { UniqueFeaturesGenerationOperation } from './unique-features-generation.operation';
export { ReferencesGenerationOperation } from './references-generation.operation';

// Визуальный стиль
export { VisualStyleGenerationOperation } from './visual-style-generation.operation';

// Ограничения
export { ConstraintsGenerationOperation } from './constraints-generation.operation';

/**
 * Маппинг типов полей на операции
 */
export const BIBLE_FIELD_OPERATIONS = {
  genres: 'genre_generation',
  formats: 'format_generation',
  logline: 'logline_generation',
  synopsis: 'synopsis_generation',
  setting: 'setting_generation',
  atmosphere: 'atmosphere_generation',
  targetAudience: 'target_audience_generation',
  mainThemes: 'theme_generation',
  message: 'message_generation',
  uniqueFeatures: 'unique_features_generation',
  references: 'references_generation',
  visualStyle: 'visual_style_generation',
  constraints: 'constraints_generation'
} as const;

/**
 * Типы полей библии проекта
 */
export type BibleFieldType = keyof typeof BIBLE_FIELD_OPERATIONS;