// backend/src/modules/ai/v2/shared/types.ts

// ===== PROVIDERS & MODELS =====

export enum AIProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  N_A = 'na'
}

export enum GeminiModel {
  FLASH = 'gemini-2.5-flash',
  FLASH_LITE = 'gemini-2.5-flash-lite', 
  PRO = 'gemini-2.5-pro'
}

export enum OpenAIModel {
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O = 'gpt-4o',
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo',
  O1_PREVIEW = 'o1-preview',
  O1_MINI = 'o1-mini'
}

export enum AnthropicModel {
  SONNET = 'claude-sonnet-4-20250514',
}

// ===== QUALITY LEVELS =====

export enum QualityLevel {
  FAST = 'fast',
  STANDARD = 'standard',
  EXPERT = 'expert'
}

// ===== MODEL & OPERATION CONFIGURATION =====

// Конфигурация модели для операций (без информации о стоимости)
export interface ModelConfig {
  provider: AIProvider;
  model: string;
  temperature: number;
  topP?: number; // Add topP as optional
  maxTokens: number;
  timeout?: number;
  retries?: number;
  systemPromptSuffix?: string;
  outputFormat?: 'json' | 'text'; // Add outputFormat
}

// Информация о стоимости модели (отделена от конфигурации операций)
export interface ModelCostInfo {
  inputCostPerMillionTokens: number; // in USD
  outputCostPerMillionTokens: number; // in USD
}

export interface OperationModeConfig {
  [QualityLevel.FAST]: ModelConfig;
  [QualityLevel.STANDARD]: ModelConfig;
  [QualityLevel.EXPERT]: ModelConfig;
}

export interface OperationAIConfig {
  modeConfigs: OperationModeConfig;
  fallbackConfigs?: Partial<OperationModeConfig>;
  requiresStructuredOutput?: boolean;
}

// ===== OPERATION TYPES =====

export enum OperationType {
  AI = 'ai',
  DATABASE = 'database',
  VALIDATION = 'validation',
  EXTERNAL_API = 'external_api'
}

// ===== BASE INTERFACES & EXECUTION CONTEXT =====

export interface OperationInput {
  [key: string]: any;
}

export interface AIOperationInput extends OperationInput {
  customPrompt?: string;
  [key: string]: any;
}

// Расширяем вывод, чтобы он включал финансовую информацию
export interface OperationOutput {
  metadata?: {
    executionTime?: number;
    type?: OperationType;
    [key: string]: any;
  }
  [key: string]: any;
}

export interface AIOperationOutput extends OperationOutput {
  metadata?: {
    realCostUSD?: number;
    creditsCharged?: number;
    margin?: number;
    executionTime?: number;
    type?: OperationType;
    [key: string]: any;
  }
  [key: string]: any;
}

export interface ExecutionContext {
  userId: string;
  projectId: string;
  requestId: string;
  sessionId?: string;
  traceId?: string;
  qualityLevel: QualityLevel;
  startTime: Date;
  priority?: 'low' | 'normal' | 'high';
  userTier?: 'basic' | 'business' | 'enterprise';
  userPreferences?: {
    avoidProviders?: AIProvider[];
    maxCostPerRequest?: number;
  };
  sharedData?: Map<string, any>;
  metadata?: Record<string, any>;
  pipelineRetryConfig?: {
    maxRetries?: number;
    retryDelayMs?: number;
    exponentialBackoff?: boolean;
    retryableErrorTypes?: string[];
  };
}

// ===== BASE OPERATION INTERFACES =====

export interface BaseOperation {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly type: OperationType;

    validate(input: OperationInput): string[];
    execute(input: OperationInput, context: ExecutionContext): Promise<OperationOutput>;
    estimateCost(input: OperationInput, context: ExecutionContext): Promise<{realCostUSD: number, credits: number}>;
}

export interface BaseAIOperation extends BaseOperation {
    readonly aiConfig: OperationAIConfig;
    readonly type: OperationType.AI;

    getPrompt(input: AIOperationInput, context: ExecutionContext): { system: string; user: string };
    parseResult(aiResult: string, input: AIOperationInput, realCostUSD: number, creditsCharged: number): AIOperationOutput;
    validate(input: AIOperationInput): string[];
    execute(input: AIOperationInput, context: ExecutionContext): Promise<AIOperationOutput>;
    estimateCost(input: AIOperationInput, context: ExecutionContext): Promise<{realCostUSD: number, credits: number}>;
}
