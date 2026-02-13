// Типы для AI системы

export interface AISettings {
  proactiveMode: boolean;
  predictionRadius: 1 | 2;
  suggestionDelay: number;
  preferredProvider: 'OPENAI' | 'ANTHROPIC' | 'VERTEX' | 'GEMINI';
  creativityLevel: number;
  activeTypes: AISuggestionType[];
  learningEnabled: boolean;
}

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  type: AISuggestionType;
  confidence: number;
  status: AISuggestionStatus;
  nodeId?: string;
  projectId: string;
  createdAt: string;
  userFeedback?: string;
  rating?: number;
  appliedAt?: string;
  entities?: string[]; // Массив ID предлагаемых сущностей
  sequence_order?: number; // Порядок в цепочке для STRUCTURE_ONLY и NEXT_NODES типов
}

export interface AICredits {
  balance: number;
  plan: AISubscriptionPlan;
  monthlyLimit: number;
  usedThisMonth: number;
  usedToday: number;
  dailyLimit: number;
  resetDate: string;
  recentTransactions: AITransaction[];
}

export interface AITransaction {
  id: string;
  type: AICreditTransactionType;
  amount: number;
  description: string;
  createdAt: string;
  requestId?: string;
}

export interface AIRequest {
  id: string;
  type: AIRequestType;
  provider: AIProvider;
  tokensUsed: number;
  creditsCharged: number;
  responseTime?: number;
  status: AIRequestStatus;
  errorMessage?: string;
  createdAt: string;
}

// Enums - обновленные типы предложений в соответствии с бэкендом
export type AISuggestionType =
  // Контекстные запросы (перефразирование/заполнение)
  | 'REPHRASE_NARRATIVE' // Перефразировать/заполнить нарратив (title, text, entities)
  | 'REPHRASE_CHOICE' // Перефразировать/заполнить выбор (только text)
  // Проактивные запросы
  | 'STRUCTURE_ONLY' // Предложения структуры (только последовательность узлов)
  | 'NEXT_NODES' // Предложения следующих узлов (структура + нарратив)
  // Библия проекта
  | 'PROJECT_BIBLE'; // Генерация контента для полей библии проекта

export type AISuggestionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED' | 'IGNORED' | 'EXPIRED';

export type AISubscriptionPlan = 'BASIC' | 'BUSINESS' | 'ENTERPRISE';

export type AICreditTransactionType = 'MONTHLY_REFILL' | 'PURCHASE' | 'USAGE' | 'BONUS' | 'REFUND';

export type AIRequestType = 'SUGGESTION' | 'ANALYSIS' | 'GENERATION' | 'ENTITY_CREATE' | 'CONTEXT_BUILD';

export type AIProvider = 'OPENAI' | 'ANTHROPIC' | 'VERTEX' | 'GEMINI';

export type AIRequestStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

export type AITriggerType = 'node_focus' | 'node_creation' | 'idle_time' | 'structure_analysis';

// Интерфейс для контекста ветвления
export interface BranchingContext {
  strategy: 'new_branch' | 'add_choice' | 'parallel_narrative';
  existingNodeTypes: string[];
}

// Request/Response interfaces
export interface GenerateSuggestionsRequest {
  projectId: string;
  nodeId?: string;
  surroundingNodes?: string[];
  suggestionType?: AISuggestionType;
  branchingContext?: BranchingContext;
}

export interface GenerateSuggestionsResponse {
  success: boolean;
  suggestions: AISuggestion[];
  count: number;
}

export interface SuggestionFeedbackRequest {
  feedback?: string;
  rating?: number;
}

export interface TriggerTestRequest {
  projectId: string;
  nodeId?: string;
  triggerType?: AITriggerType;
  surroundingNodes?: string[];
}

export interface AISuggestionsHistoryResponse {
  success: boolean;
  suggestions: AISuggestion[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AISettingsResponse {
  success: boolean;
  settings: AISettings;
}

export interface AICreditsResponse {
  success: boolean;
  credits: AICredits;
}

export interface AIErrorResponse {
  error: string;
  message: string;
}

// WebSocket message types
export interface AIWebSocketMessage {
  type: 'ai_suggestions' | 'ai_credits_updated' | 'ai_settings_updated';
  trigger?: AITriggerType;
  projectId?: string;
  nodeId?: string;
  suggestions?: AISuggestion[];
  credits?: AICredits;
  settings?: AISettings;
}

// UI State interfaces
export interface AISuggestionsState {
  suggestions: AISuggestion[];
  isLoading: boolean;
  error?: string;
  lastUpdated?: Date;
}

export interface AISettingsState {
  settings?: AISettings;
  isLoading: boolean;
  error?: string;
  hasUnsavedChanges: boolean;
}

export interface AICreditsState {
  credits?: AICredits;
  isLoading: boolean;
  error?: string;
}

// Component props interfaces
export interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onAccept: (suggestionId: string, feedback?: string) => Promise<void>;
  onReject: (suggestionId: string, feedback?: string) => Promise<void>;
  isLoading?: boolean;
}

export interface AISettingsPanelProps {
  settings: AISettings;
  onUpdate: (settings: Partial<AISettings>) => Promise<void>;
  isLoading?: boolean;
}

export interface AICreditsDisplayProps {
  credits: AICredits;
  showDetails?: boolean;
}

// Utility types
export interface AIContextData {
  nodeId?: string;
  surroundingNodes?: string[];
  projectMeta?: {
    name: string;
    description?: string;
    genre?: string;
    entities?: any[];
    projectInfo?: any;
  };
  userPreferences?: {
    creativityLevel: number;
    activeTypes: AISuggestionType[];
  };
}
