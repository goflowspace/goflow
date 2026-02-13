import { Operation } from "../../sync/sync.types";
import { SyncResult } from "../../sync/sync.types";

/**
 * Интерфейс для сериализации операций по проектам
 * 
 * Принцип Single Responsibility: только управление порядком выполнения операций
 * Принцип Interface Segregation: минимальный набор методов для конкретной задачи
 */
export interface IEventOrderingService {
  /**
   * Обрабатывает операцию в контексте проекта
   * Гарантирует последовательное выполнение операций в рамках одного проекта
   * 
   * @param projectId - ID проекта для сериализации операций
   * @param userId - ID пользователя, выполняющего операцию
   * @param operation - Операция для обработки
   * @returns Promise<SyncResult> - результат синхронизации
   */
  processOperation(
    projectId: string, 
    userId: string, 
    operation: Operation
  ): Promise<SyncResult>;

  /**
   * Получает статистику текущих очередей операций
   * Полезно для мониторинга и отладки
   * 
   * @returns Объект со статистикой по проектам
   */
  getQueueStats(): {
    totalProjects: number;
    totalQueuedOperations: number;
    projectQueues: Record<string, {
      queueLength: number;
      isProcessing: boolean;
      lastProcessedAt?: number;
    }>;
  };

  /**
   * Очищает завершенные очереди (для предотвращения утечек памяти)
   * Принцип KISS: простая очистка неактивных очередей
   */
  cleanup(): void;
}

/**
 * Статистика выполнения операции
 */
export interface OperationExecutionStats {
  projectId: string;
  operationId: string;
  queueTime: number;      // время в очереди (мс)
  executionTime: number;  // время выполнения (мс)
  totalTime: number;      // общее время (мс)
  success: boolean;
  error?: string;
}
