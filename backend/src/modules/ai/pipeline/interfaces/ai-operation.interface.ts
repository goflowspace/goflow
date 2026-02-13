import { 
  AIOperation, 
  ExecutionContext
} from './operation.interface';
import { AIProvider } from '@prisma/client';

/**
 * Конфигурация AI для операции
 */
export interface AIOperationConfig {
  /** Предпочитаемый провайдер AI */
  preferredProvider: AIProvider;
  /** Предпочитаемая модель */
  preferredModel?: string;
  /** Уровень креативности (0-1) */
  creativityLevel?: number;
  /** Максимальное количество токенов для ответа */
  maxTokens?: number;
  /** Температура модели */
  temperature?: number;
}

/**
 * Метаданные для промпта
 */
export interface PromptMetadata {
  /** Системный промпт */
  systemPrompt: string;
  /** Пользовательский промпт (шаблон) */
  userPromptTemplate: string;
  /** Переменные для подстановки в промпт */
  variables?: Record<string, any>;
}

/**
 * Результат выполнения AI операции
 */
export interface AIOperationResult {
  /** Основные данные результата */
  data: any;
  /** Количество использованных токенов */
  tokensUsed?: number;
  /** Использованная модель */
  model?: string;
  /** Использованный провайдер */
  provider?: string;
  /** Метаданные выполнения */
  metadata?: Record<string, any>;
}

/**
 * Расширенный интерфейс для AI операций
 * Следует принципу Interface Segregation - выделяет AI-специфичную функциональность
 */
export interface AIOperationInterface extends AIOperation {
  
  /**
   * Получение конфигурации AI для операции
   * @param context - контекст выполнения
   * @param userSettings - настройки пользователя
   */
  getAIConfig(context: ExecutionContext, userSettings?: any): AIOperationConfig;

  /**
   * Получение системного промпта для операции
   * @param input - входные данные
   * @param context - контекст выполнения
   */
  getSystemPrompt(input: any, context: ExecutionContext): string;

  /**
   * Получение пользовательского промпта для операции
   * @param input - входные данные
   * @param context - контекст выполнения
   */
  getUserPrompt(input: any, context: ExecutionContext): string;

  /**
   * Получение полных метаданных промпта
   * @param input - входные данные
   * @param context - контекст выполнения
   */
  getPromptMetadata(input: any, context: ExecutionContext): PromptMetadata;

  /**
   * Обработка результата от AI провайдера
   * @param aiResult - результат от AI
   * @param input - оригинальные входные данные
   * @param context - контекст выполнения
   */
  processAIResult(aiResult: any, input: any, context: ExecutionContext): any;

  /**
   * Проверяет, требует ли операция AI провайдера
   */
  requiresAI(): boolean;
}