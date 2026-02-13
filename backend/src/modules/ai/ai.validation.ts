import { z } from 'zod';

/**
 * Схема для генерации контента библии проекта
 */
export const generateProjectBibleContentSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  fieldType: z.enum([
    'logline',
    'synopsis', 
    'setting',
    'targetAudience',
    'mainThemes',
    'message',
    'references',
    'uniqueFeatures',
    'atmosphere',
    'visualStyle',
    'constraints'
  ], { required_error: 'Field type is required' }),
  baseDescription: z.string().optional()
});

/**
 * Схема для обратной связи по предложению
 */
export const suggestionFeedbackSchema = z.object({
  feedback: z.string().optional()
});

/**
 * Схема для обновления настроек AI
 */
export const updateAISettingsSchema = z.object({
  proactiveMode: z.boolean().optional(),
  predictionRadius: z.number().min(1).max(2).optional(),
  suggestionDelay: z.number().min(1).max(10).optional(),
  preferredProvider: z.enum(['OPENAI', 'ANTHROPIC', 'GEMINI']).optional(),
  preferredModel: z.string().optional(),
  creativityLevel: z.number().min(0).max(1).optional(),
  activeTypes: z.array(z.enum(['REPHRASE_NARRATIVE', 'REPHRASE_CHOICE', 'STRUCTURE_ONLY', 'NEXT_NODES', 'PROJECT_BIBLE'])).optional(),
  learningEnabled: z.boolean().optional()
});

/**
 * Схема для перевода узла через пайплайн v2
 */
export const translateNodePipelineSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  nodeId: z.string().min(1, 'Node ID is required'),
  sourceLanguage: z.enum(['en', 'ru', 'fr', 'es', 'pt', 'de', 'ja', 'ko', 'zh-CN'], { required_error: 'Source language is required' }),
  targetLanguage: z.enum(['en', 'ru', 'fr', 'es', 'pt', 'de', 'ja', 'ko', 'zh-CN'], { required_error: 'Target language is required' }),
  precedingContext: z.string().optional(),
  followingContext: z.string().optional(),
  translationStyle: z.enum(['literal', 'adaptive', 'creative']).optional(),
  preserveMarkup: z.boolean().optional(),
  qualityLevel: z.enum(['fast', 'standard', 'expert']).optional(),
  additionalRequirements: z.string().optional()
}).refine(data => data.sourceLanguage !== data.targetLanguage, {
  message: "Source and target languages must be different",
  path: ["targetLanguage"]
});

/**
 * Схема для пакетного перевода таймлайна через пайплайн v2
 */
export const batchTranslateTimelineSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  timelineId: z.string().min(1, 'Timeline ID is required'),
  sourceLanguage: z.enum(['en', 'ru', 'fr', 'es', 'pt', 'de', 'ja', 'ko', 'zh-CN'], { required_error: 'Source language is required' }),
  targetLanguage: z.enum(['en', 'ru', 'fr', 'es', 'pt', 'de', 'ja', 'ko', 'zh-CN'], { required_error: 'Target language is required' }),
  translationStyle: z.enum(['literal', 'adaptive', 'creative']).optional(),
  preserveMarkup: z.boolean().optional(),
  qualityLevel: z.enum(['fast', 'standard', 'expert']).optional(),
  skipExisting: z.boolean().optional(), // Пропустить уже переведенные узлы
  additionalRequirements: z.string().optional()
}).refine(data => data.sourceLanguage !== data.targetLanguage, {
  message: "Source and target languages must be different",
  path: ["targetLanguage"]
});

/**
 * Схема для оценки стоимости пакетного перевода
 */
export const estimateBatchTranslationSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  timelineId: z.string().min(1, 'Timeline ID is required'),
  targetLanguage: z.enum(['en', 'ru', 'fr', 'es', 'pt', 'de', 'ja', 'ko', 'zh-CN'], { required_error: 'Target language is required' }),
  qualityLevel: z.enum(['fast', 'standard', 'expert']).optional(),
  skipExisting: z.boolean().optional()
});


export type GenerateProjectBibleContentInput = z.infer<typeof generateProjectBibleContentSchema>;
export type SuggestionFeedbackInput = z.infer<typeof suggestionFeedbackSchema>;
export type UpdateAISettingsInput = z.infer<typeof updateAISettingsSchema>;
export type TranslateNodePipelineInput = z.infer<typeof translateNodePipelineSchema>;
export type BatchTranslateTimelineInput = z.infer<typeof batchTranslateTimelineSchema>;
export type EstimateBatchTranslationInput = z.infer<typeof estimateBatchTranslationSchema>;

export const cancelBatchTranslationSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  projectId: z.string().min(1, 'Project ID is required')
});

export type CancelBatchTranslationInput = z.infer<typeof cancelBatchTranslationSchema>;
 