import { injectable, inject } from "inversify";
import { IEventOrderingService, OperationExecutionStats } from "../interfaces/event-ordering.interfaces";
import { ISyncService } from "../../sync/interfaces/sync.interfaces";
import { Operation, OperationBatch, SyncResult } from "../../sync/sync.types";
import { TYPES as SYNC_TYPES } from "../../sync/di.types";
import { logger } from "@config/logger";

/**
 * Сервис для сериализации операций по проектам
 * 
 * Принципы:
 * - Single Responsibility: только управление порядком выполнения операций
 * - KISS: простая Map-based очередь операций
 * - DRY: переиспользование существующей логики SyncService
 */
@injectable()
export class EventOrderingService implements IEventOrderingService {
  /**
   * Очереди операций по проектам
   * Key: projectId, Value: Promise цепочка операций
   */
  private projectQueues = new Map<string, Promise<SyncResult>>();

  /**
   * Статистика для мониторинга
   */
  private queueStats = new Map<string, {
    queueLength: number;
    isProcessing: boolean;
    lastProcessedAt?: number;
  }>();

  /**
   * Счетчик активных операций для cleanup
   */
  private activeOperations = new Set<string>();

  constructor(
    @inject(SYNC_TYPES.SyncService) private syncService: ISyncService
  ) {}

  /**
   * Обрабатывает операцию в контексте проекта
   * Гарантирует последовательное выполнение операций
   */
  async processOperation(
    projectId: string, 
    userId: string, 
    operation: Operation
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const operationKey = `${projectId}_${operation.id}`;
    
    logger.info(`[EventOrdering] Queuing operation`, {
      projectId,
      userId,
      operationId: operation.id,
      operationType: operation.type,
      queueLength: this.getProjectQueueLength(projectId)
    });

    try {
      // Отслеживаем активные операции для cleanup
      this.activeOperations.add(operationKey);
      
      // Получаем текущую очередь для проекта (или создаем новую)
      const currentQueue = this.projectQueues.get(projectId) || Promise.resolve({
        success: true,
        syncVersion: 0,
        appliedOperations: []
      } as SyncResult);

      // Создаем новую операцию в очереди
      const newQueue = currentQueue
        .then(async (previousResult) => {
          // Обновляем статистику - операция началась
          this.updateQueueStats(projectId, true);
          
          const queueTime = Date.now() - startTime;
          
          logger.debug(`[EventOrdering] Processing operation`, {
            projectId,
            operationId: operation.id,
            queueTimeMs: queueTime
          });

          try {
            // Используем существующую логику SyncService (DRY принцип)
            const result = await this.syncService.processOperationsBatch(
              userId,
              projectId,
              {
                operations: [operation],
                projectId: projectId,
                lastSyncVersion: previousResult.syncVersion || 0,
                deviceId: operation.deviceId
              } as OperationBatch
            );

            const executionTime = Date.now() - startTime - queueTime;
            
            // Логируем успешную операцию
            this.logOperationStats({
              projectId,
              operationId: operation.id,
              queueTime,
              executionTime,
              totalTime: Date.now() - startTime,
              success: true
            });

            return result;
            
          } catch (error) {
            const executionTime = Date.now() - startTime - queueTime;
            
            // Логируем ошибку
            this.logOperationStats({
              projectId,
              operationId: operation.id,
              queueTime,
              executionTime,
              totalTime: Date.now() - startTime,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            throw error; // Перебрасываем ошибку выше
          }
        })
        .catch((error) => {
          // Обрабатываем ошибки в цепочке операций
          logger.error(`[EventOrdering] Operation failed`, {
            projectId,
            operationId: operation.id,
            error: error instanceof Error ? error.message : error
          });
          
          // Возвращаем неуспешный результат вместо прерывания цепочки
          return {
            success: false,
            syncVersion: 0,
            appliedOperations: []
          } as SyncResult;
        })
        .finally(() => {
          // Обновляем статистику - операция завершена
          this.updateQueueStats(projectId, false);
          this.activeOperations.delete(operationKey);
        });

      // Обновляем очередь проекта
      this.projectQueues.set(projectId, newQueue);
      
      // Возвращаем результат операции
      return await newQueue;
      
    } catch (error) {
      // Убираем операцию из активных в случае ошибки
      this.activeOperations.delete(operationKey);
      
      logger.error(`[EventOrdering] Failed to queue operation`, {
        projectId,
        operationId: operation.id,
        error: error instanceof Error ? error.message : error
      });
      
      throw error;
    }
  }

  /**
   * Получает статистику очередей
   */
  getQueueStats() {
    return {
      totalProjects: this.projectQueues.size,
      totalQueuedOperations: this.activeOperations.size,
      projectQueues: Object.fromEntries(this.queueStats)
    };
  }

  /**
   * Очищает завершенные очереди (предотвращает утечки памяти)
   * KISS принцип: простая очистка по таймауту
   */
  cleanup(): void {
    const now = Date.now();
    const CLEANUP_TIMEOUT = 5 * 60 * 1000; // 5 минут
    
    let cleanedCount = 0;
    
    for (const [projectId, stats] of this.queueStats.entries()) {
      // Очищаем неактивные проекты старше 5 минут
      if (!stats.isProcessing && 
          stats.lastProcessedAt && 
          (now - stats.lastProcessedAt > CLEANUP_TIMEOUT)) {
        
        this.projectQueues.delete(projectId);
        this.queueStats.delete(projectId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`[EventOrdering] Cleaned up ${cleanedCount} inactive project queues`);
    }
  }

  /**
   * Вспомогательные методы (DRY принцип)
   */
  
  private getProjectQueueLength(projectId: string): number {
    return this.queueStats.get(projectId)?.queueLength || 0;
  }
  
  private updateQueueStats(projectId: string, isProcessing: boolean): void {
    const currentStats = this.queueStats.get(projectId) || {
      queueLength: 0,
      isProcessing: false
    };
    
    this.queueStats.set(projectId, {
      ...currentStats,
      isProcessing,
      queueLength: isProcessing ? currentStats.queueLength + 1 : Math.max(0, currentStats.queueLength - 1),
      lastProcessedAt: Date.now()
    });
  }
  
  private logOperationStats(stats: OperationExecutionStats): void {
    if (stats.success) {
      logger.info(`[EventOrdering] Operation completed successfully`, {
        projectId: stats.projectId,
        operationId: stats.operationId,
        queueTimeMs: stats.queueTime,
        executionTimeMs: stats.executionTime,
        totalTimeMs: stats.totalTime
      });
    } else {
      logger.error(`[EventOrdering] Operation failed`, {
        projectId: stats.projectId,
        operationId: stats.operationId,
        queueTimeMs: stats.queueTime,
        executionTimeMs: stats.executionTime,
        totalTimeMs: stats.totalTime,
        error: stats.error
      });
    }
  }
}
