// Types for AI Pipeline Storage System
// Типы для системы хранения результатов AI пайплайнов

import { AIPipelineExecution, AIPipelineStepExecution, AIPipelineStatus, AIPipelineStepStatus } from '@prisma/client';

// Основные типы для создания записей

export interface CreatePipelineExecutionData {
  pipelineId: string;
  pipelineName: string;
  version: string;
  userId: string;
  projectId: string;
  requestId?: string;
  sessionId?: string;
  traceId?: string;
  input: any; // JSON входных данных
  qualityLevel: string;
  totalSteps: number;
}

export interface CreateStepExecutionData {
  executionId: string;
  stepId: string;
  stepIndex: number;
  operationId: string;
  operationName: string;
  operationVersion: string;
  dependencies?: string[];
  input: any; // JSON входных данных
  qualityLevel: string; // Уровень качества операции
}

// Типы для обновления выполнения шага

export interface UpdateStepStartData {
  systemPrompt?: string;
  userPrompt?: string;
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  qualityLevel: string;
  startedAt: Date;
}

export interface UpdateStepValidationData {
  validationDuration: number;
  validationErrors?: string[];
}

export interface UpdateStepProviderCallData {
  providerCallDuration: number;
  inputTokens: number;
  outputTokens: number;
  realCostUSD: number;
  creditsCharged: number;
  rawAIResponse: string;
}

export interface UpdateStepCompletionData {
  status: AIPipelineStepStatus;
  completedAt: Date;
  duration: number;
  result?: any; // JSON результата
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  errorStep?: 'validation' | 'provider-call' | 'parsing';
  suspiciousContent?: {
    reasons: string[];
    detected: boolean;
  };
  skipped?: boolean;
  skipReason?: string;
}

export interface UpdatePipelineCompletionData {
  status: AIPipelineStatus;
  completedAt: Date;
  totalDuration: number;
  completedSteps: number;
  skippedSteps: number;
  failedSteps: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRealCostUSD: number;
  totalCreditsCharged: number;
  result?: any; // JSON финального результата
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Расширенные типы с включенными связями

export interface PipelineExecutionWithSteps extends AIPipelineExecution {
  steps: AIPipelineStepExecution[];
}

export interface DetailedPipelineExecution extends AIPipelineExecution {
  steps: AIPipelineStepExecution[];
  user: {
    id: string;
    name: string | null;
  };
  project: {
    id: string;
    name: string;
  };
}

// Типы для запросов и фильтрации

export interface PipelineExecutionFilter {
  userId?: string;
  projectId?: string;
  pipelineId?: string;
  status?: AIPipelineStatus;
  dateRange?: {
    from: Date;
    to: Date;
  };
  requestId?: string;
}

export interface StepExecutionFilter {
  executionId?: string;
  operationId?: string;
  status?: AIPipelineStepStatus;
  provider?: string;
  model?: string;
  hasErrors?: boolean;
}

// Типы для аналитики

export interface PipelineAnalytics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  totalCost: number;
  totalTokens: number;
  mostUsedOperations: Array<{
    operationId: string;
    operationName: string;
    count: number;
    averageDuration: number;
    successRate: number;
  }>;
  providerStats: Array<{
    provider: string;
    count: number;
    totalCost: number;
    averageTokens: number;
  }>;
}

export interface StepAnalytics {
  operationId: string;
  operationName: string;
  totalExecutions: number;
  successfulExecutions: number;
  averageDuration: number;
  averageInputTokens: number;
  averageOutputTokens: number;
  averageCost: number;
  commonErrors: Array<{
    error: string;
    count: number;
  }>;
}

// Типы для экспорта данных

export interface PipelineExecutionExport {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  totalDuration?: number;
  totalCost: number;
  steps: Array<{
    stepId: string;
    operationName: string;
    status: string;
    duration?: number;
    cost: number;
    provider: string;
    model: string;
  }>;
}

// События для WebSocket уведомлений

export interface PipelineProgressEvent {
  type: 'PIPELINE_PROGRESS';
  executionId: string;
  pipelineId: string;
  status: AIPipelineStatus;
  progress: number; // 0-100
  currentStep?: string;
  completedSteps: number;
  totalSteps: number;
  message?: string;
}

export interface StepProgressEvent {
  type: 'STEP_PROGRESS';
  executionId: string;
  stepId: string;
  operationName: string;
  status: AIPipelineStepStatus;
  duration?: number;
  error?: string;
  result?: any;
}
