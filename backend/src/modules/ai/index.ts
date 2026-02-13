// Экспорт всех компонентов AI модуля
export { AIService } from './ai.service';
export { ContextBuilder } from './context.builder';
export * from './ai.controller';
export { default as aiRoutes } from './ai.routes';

// AI провайдеры
export { AIProviderFactory } from './providers/ai-provider.factory';
export { BaseAIProvider } from './providers/base-ai-provider';
export { OpenAIProvider } from './providers/openai.provider';
export { GeminiProvider } from './providers/gemini.provider';
export { PromptBuilder } from './providers/prompt-builder';
export { AISanitizer } from './providers/ai-sanitizer';

// Pipeline операции
export { PromptGenerationOperation } from './pipeline/operations/common/prompt-generation.operation';
export type { 
  PromptGenerationInput, 
  PromptGenerationOutput, 
  PromptDomain 
} from './pipeline/operations/common/prompt-generation.operation';

// Типы и интерфейсы
export type { AIContextData } from './ai.service';
export type { AIProviderInterface, AISuggestionContent, AIRequestData } from './providers/ai-provider.interface';
export type { NodeContext, ProjectContext } from './context.builder';