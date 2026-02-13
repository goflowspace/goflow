// backend/src/modules/ai/v2/shared/pipeline-types.ts
import { BaseOperation, OperationOutput, QualityLevel } from './types';

export interface PipelineStep {
  /** Уникальный идентификатор шага в пайплайне */
  id: string;

  /** Экземпляр операции для выполнения (может быть AI или non-AI) */
  operation: BaseOperation;

  /** Массив ID шагов, которые должны завершиться перед этим шагом */
  dependencies?: string[];

  /**
   * Позволяет переопределить уровень качества (и, соответственно, модель)
   * для конкретного шага пайплайна. Если не указано, используется
   * qualityLevel из общего ExecutionContext пайплайна.
   */
  qualityLevel?: QualityLevel;

  /**
   * Конфигурация повторных попыток для конкретного шага.
   * Переопределяет настройки из ExecutionContext для данного шага.
   */
  retryConfig?: {
    maxRetries?: number;
    retryDelayMs?: number;
    exponentialBackoff?: boolean;
    retryableErrorTypes?: string[];
  };

  /**
   * Функция для преобразования выходов зависимостей во вход для текущей операции.
   * Позволяет гибко "склеивать" операции.
   * @param results - Карта с результатами всех завершенных зависимостей.
   * @param pipelineInput - Изначальные входные данные всего пайплайна.
   * @returns Входные данные для текущей операции.
   */
  mapInput?: (results: Map<string, OperationOutput>, pipelineInput: any) => any;

  /**
   * Условие, определяющее, нужно ли выполнять этот шаг.
   * @param results - Результаты завершенных зависимостей.
   * @returns `true`, если шаг нужно выполнить.
   */
  condition?: (results: Map<string, OperationOutput>) => boolean;

  /**
   * Функция для генерации специального промпта, который будет добавлен к пользовательскому промпту операции.
   * Получает результаты зависимостей и может создавать динамические инструкции.
   * @param results - Карта с результатами всех завершенных зависимостей.
   * @param pipelineInput - Изначальные входные данные всего пайплайна.
   * @returns Строка кастомного промпта или пустая строка, если промпт не нужен.
   */
  customPrompt?: (results: Map<string, OperationOutput>, pipelineInput: any) => string;
}

