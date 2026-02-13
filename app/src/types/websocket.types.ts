// WebSocket типы для клиента

export enum AIEventType {
  AI_PIPELINE_STARTED = 'ai_pipeline_started',
  AI_PIPELINE_PROGRESS = 'ai_pipeline_progress',
  AI_PIPELINE_STEP_COMPLETED = 'ai_pipeline_step_completed',
  AI_PIPELINE_COMPLETED = 'ai_pipeline_completed',
  AI_PIPELINE_ERROR = 'ai_pipeline_error',
  BATCH_TRANSLATION_PROGRESS = 'batch_translation_progress'
}

/**
 * Статус выполнения AI пайплайна
 */
export interface AIProgressStatus {
  requestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep?: string;
  stepName?: string;
  stepDescription?: string;
  progress: number; // 0-100%
  startTime: Date;
  endTime?: Date;
  estimatedTimeRemaining?: number;
  tokensUsed?: number;
  cost?: number;
  metadata?: any;
  completedStepsExplanations?: Record<string, string>; // stepId -> explanation
  completedStepsContent?: Record<string, any>; // stepId -> generated content
  activeSteps?: string[]; // Список шагов, выполняющихся в данный момент
  completedSteps?: string[]; // Список завершенных шагов
  failedSteps?: string[]; // Список неудачных шагов
}

/**
 * WebSocket событие AI прогресса
 */
export interface AIProgressEvent {
  type: AIEventType;
  payload: AIProgressStatus;
  userId: string;
  projectId: string;
  timestamp: number;
}

/**
 * Позиция курсора с учетом слоя
 */
export interface CursorPosition {
  x: number;
  y: number;
  timelineId: string;
  layerId: string;
  timestamp: number;
}

/**
 * Информация о присутствии пользователя в слое
 */
export interface LayerPresence {
  userId: string;
  userName: string;
  userColor: string;
  userPicture?: string;
  cursor: CursorPosition;
  lastSeen: number;
  sessionId: string;
}

/**
 * События presence системы
 */
export enum PresenceEventType {
  LAYER_CURSOR_UPDATE = 'LAYER_CURSOR_UPDATE',
  LAYER_CURSOR_ENTER = 'LAYER_CURSOR_ENTER',
  LAYER_CURSOR_LEAVE = 'LAYER_CURSOR_LEAVE',
  LAYER_PRESENCE_LIST = 'LAYER_PRESENCE_LIST'
}

/**
 * Событие обновления курсора в слое
 */
export interface LayerCursorEvent {
  type: PresenceEventType;
  projectId: string;
  timelineId: string;
  layerId: string;
  presence: LayerPresence;
  timestamp: number;
}

/**
 * Batch translation progress event
 */
export interface BatchTranslationProgress {
  current: number;
  total: number;
  currentNodeId?: string;
  status: 'translating' | 'completed' | 'failed' | 'cancelled';
  sessionId?: string;
  message?: string;
  results?: {
    successful: number;
    failed: number;
    totalProcessed: number;
  };
}

/**
 * Callback функции для WebSocket событий
 */
export interface WebSocketCallbacks {
  onAIProgress?: (status: AIProgressStatus) => void;
  onAICompleted?: (status: AIProgressStatus) => void;
  onAIError?: (status: AIProgressStatus) => void;
  onBatchTranslationProgress?: (progress: BatchTranslationProgress) => void;
  onPresenceUpdate?: (event: LayerCursorEvent) => void;
  onPresenceLeave?: (event: LayerCursorEvent) => void;
}
