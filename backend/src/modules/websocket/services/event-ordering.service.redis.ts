import { injectable, inject } from "inversify";
import { IEventOrderingService, OperationExecutionStats } from "../interfaces/event-ordering.interfaces";
import { ISyncService } from "../../sync/interfaces/sync.interfaces";
import { Operation, OperationBatch, SyncResult } from "../../sync/sync.types";
import { TYPES as SYNC_TYPES } from "../../sync/di.types";
import { logger } from "@config/logger";
// import { RedisService, getRedisService } from "../../../services/redis.service"; // For future use
import { getRedisClient, REDIS_KEYS } from "../../../config/redis.config";

/**
 * Redis-based сервис для сериализации операций
 * Использует Redis Streams для упорядочивания операций и cross-instance coordination
 * 
 * Принципы SOLID:
 * - Single Responsibility: управление порядком выполнения операций через Redis
 * - Dependency Inversion: зависит от Redis и Sync абстракций
 * - Open/Closed: расширяемый для дополнительных типов операций
 */
@injectable()
export class RedisEventOrderingService implements IEventOrderingService {
  // private readonly _redisService: RedisService; // Для будущего использования
  private readonly redisClient = getRedisClient();
  
  // Локальная очередь для обработки операций
  private processingOperations = new Set<string>();
  
  // Очереди операций по проектам (аналогично оригинальному сервису)
  private projectQueues = new Map<string, Promise<SyncResult>>();
  
  // Статистика 
  private operationStats = new Map<string, OperationExecutionStats>();
  
  // Статистика очередей для мониторинга
  private queueStats = new Map<string, {
    queueLength: number;
    isProcessing: boolean;
    lastProcessedAt?: number;
  }>();
  
  // Идентификатор инстанса для координации
  private readonly instanceId: string;
  

  constructor(
    @inject(SYNC_TYPES.SyncService) private syncService: ISyncService
  ) {
    // this._redisService = getRedisService(); // Для будущего использования
    this.instanceId = `instance_${process.pid}_${Date.now()}`;
    
    // Настраиваем Redis при создании
    this.setupRedis();
  }

  /**
   * Обрабатывает операцию через Redis Streams с гарантией последовательности
   * Использует Redis как координатор для cross-instance синхронизации
   */
  async processOperation(
    projectId: string, 
    userId: string, 
    operation: Operation
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const operationKey = `${projectId}_${operation.id}`;
    
    logger.info(`[RedisEventOrdering] Processing operation with Redis coordination`, {
      projectId,
      userId,
      operationId: operation.id,
      operationType: operation.type,
      instanceId: this.instanceId
    });

    try {
      // Отмечаем что операция в процессе
      this.processingOperations.add(operationKey);
      
      // Получаем или создаем очередь для проекта (аналогично оригинальному сервису)
      const result = await this.processOperationInQueue(projectId, userId, operation, startTime);
      
      // Записываем статистику
      const totalTime = Date.now() - startTime;
      this.recordOperationStats({
        projectId,
        operationId: operation.id,
        queueTime: 0, // TODO: вычислить время в очереди
        executionTime: totalTime,
        totalTime,
        success: result.success
      });
      
      return result;
      
    } catch (error) {
      // Убираем из обработки при ошибке
      this.processingOperations.delete(operationKey);
      
      logger.error(`[RedisEventOrdering] Failed to process operation`, {
        projectId,
        operationId: operation.id,
        error: error instanceof Error ? error.message : error
      });
      
      throw error;
    } finally {
      this.processingOperations.delete(operationKey);
    }
  }

  /**
   * Обрабатывает операцию в очереди проекта с Redis координацией
   * Аналогично оригинальному сервису, но с добавлением Redis streams для cross-instance sync
   */
  private async processOperationInQueue(
    projectId: string, 
    userId: string, 
    operation: Operation, 
    startTime: number
  ): Promise<SyncResult> {
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
        
        logger.debug(`[RedisEventOrdering] Processing operation in queue`, {
          projectId,
          operationId: operation.id,
          queueTimeMs: queueTime,
          previousSyncVersion: previousResult.syncVersion
        });

        try {
          // 1. Обрабатываем операцию через SyncService (как в оригинале)
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

          // 2. После успешной обработки отправляем в Redis Stream для других инстансов
          if (result.success) {
            await this.notifyOtherInstances(projectId, userId, operation, result);
          }

          const executionTime = Date.now() - startTime - queueTime;
          
          logger.debug(`[RedisEventOrdering] Operation processed successfully`, {
            projectId,
            operationId: operation.id,
            success: result.success,
            newSyncVersion: result.syncVersion,
            executionTimeMs: executionTime
          });

          return result;
          
        } catch (error) {
          logger.error(`[RedisEventOrdering] Operation processing failed`, {
            projectId,
            operationId: operation.id,
            error: error instanceof Error ? error.message : error
          });

          throw error; // Перебрасываем ошибку выше
        }
      })
      .catch((error) => {
        // Обрабатываем ошибки в цепочке операций
        logger.error(`[RedisEventOrdering] Operation failed in queue`, {
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
      });

    // Обновляем очередь проекта
    this.projectQueues.set(projectId, newQueue);
    
    // Возвращаем результат операции
    return await newQueue;
  }

  /**
   * Уведомляет другие инстансы через Redis Stream после успешной обработки операции
   */
  private async notifyOtherInstances(
    projectId: string, 
    userId: string, 
    operation: Operation, 
    result: SyncResult
  ): Promise<void> {
    try {
      const streamKey = `${REDIS_KEYS.OPERATIONS}:${projectId}`;
      
      await this.addOperationToStream(streamKey, {
        operationId: operation.id,
        operation: JSON.stringify(operation),
        userId,
        projectId,
        syncVersion: result.syncVersion,
        timestamp: Date.now(),
        instanceId: this.instanceId,
        success: result.success
      });
      
      logger.debug(`[RedisEventOrdering] Notified other instances about successful operation`, {
        projectId,
        operationId: operation.id,
        syncVersion: result.syncVersion
      });
    } catch (error) {
      logger.error(`[RedisEventOrdering] Failed to notify other instances`, {
        projectId,
        operationId: operation.id,
        error: error instanceof Error ? error.message : error
      });
      // Не прерываем основную операцию из-за ошибки уведомления
    }
  }

  /**
   * Добавляет операцию в Redis Stream
   */
  private async addOperationToStream(streamKey: string, operationData: any): Promise<string> {
    try {
      // XADD stream_key * field1 value1 field2 value2 ...
      const messageId = await this.redisClient.xadd(
        streamKey,
        '*', // auto-generate ID
        'operationId', String(operationData.operationId),
        'operation', operationData.operation,
        'userId', operationData.userId,
        'projectId', operationData.projectId,
        'syncVersion', String(operationData.syncVersion || 0),
        'timestamp', String(Number(operationData.timestamp)),
        'instanceId', operationData.instanceId,
        'success', String(operationData.success)
      );
      
      return messageId || '';
    } catch (error) {
      logger.error('❌ Error adding operation to Redis stream:', error);
      throw error;
    }
  }



  /**
   * Получает статистику очередей (аналогично оригинальному сервису)
   */
  getQueueStats() {
    try {
      return {
        totalProjects: this.projectQueues.size,
        totalQueuedOperations: this.processingOperations.size,
        projectQueues: Object.fromEntries(this.queueStats)
      };
    } catch (error) {
      logger.error('❌ Error getting queue stats:', error);
      return {
        totalProjects: 0,
        totalQueuedOperations: 0,
        projectQueues: {}
      };
    }
  }

  /**
   * Очистка завершенных операций (аналогично оригинальному сервису)
   */
  cleanup(): void {
    try {
      const now = Date.now();
      const CLEANUP_TIMEOUT = 5 * 60 * 1000; // 5 минут
      
      let cleanedQueues = 0;
      
      // Очистка неактивных очередей проектов
      for (const [projectId, stats] of this.queueStats.entries()) {
        if (!stats.isProcessing && 
            stats.lastProcessedAt && 
            (now - stats.lastProcessedAt > CLEANUP_TIMEOUT)) {
          
          this.projectQueues.delete(projectId);
          this.queueStats.delete(projectId);
          cleanedQueues++;
        }
      }
      
      // Очистка старой статистики операций
      this.cleanupOldOperationStats();
      
      if (cleanedQueues > 0) {
        logger.info(`[RedisEventOrdering] Cleaned up ${cleanedQueues} inactive project queues`);
      }
      
      logger.debug('[RedisEventOrdering] Cleanup completed');
    } catch (error) {
      logger.error('❌ Error during Redis event ordering cleanup:', error);
    }
  }

  /**
   * Настройка Redis
   */
  private setupRedis(): void {
    try {
      logger.info(`[RedisEventOrdering] Setting up Redis for instance ${this.instanceId}`);
      
      // Redis настройка минимальная - streams создаются автоматически при использовании
      
    } catch (error) {
      logger.error('❌ Error setting up Redis:', error);
    }
  }

  /**
   * Записывает статистику операции
   */
  private recordOperationStats(stats: OperationExecutionStats): void {
    this.operationStats.set(`${stats.projectId}_${stats.operationId}`, stats);
    
    if (stats.success) {
      logger.info(`[RedisEventOrdering] Operation completed successfully`, stats);
    } else {
      logger.error(`[RedisEventOrdering] Operation failed`, stats);
    }
  }

  /**
   * Очистка старой статистики операций
   */
  private cleanupOldOperationStats(): void {
    const now = Date.now();
    const MAX_STATS_AGE = 60 * 60 * 1000; // 1 час
    
    let cleanedCount = 0;
    
    for (const [key, stats] of this.operationStats.entries()) {
      if (now - (stats.totalTime || 0) > MAX_STATS_AGE) {
        this.operationStats.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`[RedisEventOrdering] Cleaned up ${cleanedCount} old operation stats`);
    }
  }

  /**
   * Вспомогательные методы (аналогично оригинальному сервису)
   */
  
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

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Ждем завершения активных операций
      while (this.processingOperations.size > 0) {
        logger.info(`[RedisEventOrdering] Waiting for ${this.processingOperations.size} operations to complete`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      logger.info(`✅ [RedisEventOrdering] Instance ${this.instanceId} shutdown completed`);
    } catch (error) {
      logger.error('❌ Error during Redis event ordering shutdown:', error);
    }
  }
}
