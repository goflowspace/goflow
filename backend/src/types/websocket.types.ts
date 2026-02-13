export interface CollaborationEvent {
  type: CollaborationEventType;
  payload: any;
  userId: string;
  projectId: string;
  timestamp: number;
}

export enum CollaborationEventType {
  // Операции с проектом
  OPERATION_BROADCAST = 'OPERATION_BROADCAST',
  
  // Awareness события
  CURSOR_MOVE = 'CURSOR_MOVE',
  SELECTION_CHANGE = 'SELECTION_CHANGE',
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  AWARENESS_UPDATE = 'AWARENESS_UPDATE',
  
  // Node drag preview события
  NODE_DRAG_PREVIEW = 'NODE_DRAG_PREVIEW',
  
  // Presence события
  LAYER_CURSOR_UPDATE = 'LAYER_CURSOR_UPDATE',
  LAYER_CURSOR_ENTER = 'LAYER_CURSOR_ENTER',
  LAYER_CURSOR_LEAVE = 'LAYER_CURSOR_LEAVE',
  LAYER_PRESENCE_LIST = 'LAYER_PRESENCE_LIST',
  
  // Системные события
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED',
  ERROR = 'ERROR',
  // Добавляем AI события
  AI_PIPELINE_STARTED = 'ai_pipeline_started',
  AI_PIPELINE_PROGRESS = 'ai_pipeline_progress',
  AI_PIPELINE_STEP_COMPLETED = 'ai_pipeline_step_completed',
  AI_PIPELINE_COMPLETED = 'ai_pipeline_completed',
  AI_PIPELINE_ERROR = 'ai_pipeline_error',
  BATCH_TRANSLATION_PROGRESS = 'batch_translation_progress'
}

export interface UserAwareness {
  userId: string;
  userName: string;
  userPicture?: string;
  cursor?: {
    x: number;
    y: number;
    timelineId: string;
    layerId: string;
  };
  selection?: {
    nodeIds: string[];
    timelineId: string;
    layerId: string;
  };
  lastSeen: number;
}

export interface CollaborationSession {
  id: string;
  userId: string;
  projectId: string;
  socketId: string;
  awareness: UserAwareness;
  joinedAt: number;
  lastActivity: number;
} 

/**
 * Статус выполнения AI пайплайна для WebSocket
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
 * Событие обновления курсора в слое
 */
export interface LayerCursorEvent {
  type: CollaborationEventType;
  projectId: string;
  timelineId: string;
  layerId: string;
  presence: LayerPresence;
  timestamp: number;
} 