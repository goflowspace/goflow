import { injectable, inject } from 'inversify';
import { ISyncRepository, ISyncService } from './interfaces/sync.interfaces';
import { 
  OperationBatch, 
  SyncResult, 
  SnapshotResult, 
  OperationsResult 
} from './sync.types';
import { applyOperationsToSnapshot } from './sync.utils';
import { logger } from '@config/logger';
import { TYPES } from '@modules/sync/di.types';

@injectable()
export class SyncService implements ISyncService {
  constructor(
    @inject(TYPES.SyncRepository) private syncRepository: ISyncRepository
  ) {}

  /**
   * Обрабатывает пакет операций от клиента
   * Применяет операции к снимку и сохраняет в транзакции
   */
  async processOperationsBatch(
    userId: string,
    projectId: string,
    batch: OperationBatch
  ): Promise<SyncResult> {
    const MAX_RETRIES = 5;
    const INITIAL_DELAY = 50;

    logger.info(`[SYNC] Starting batch processing`, {
      projectId,
      userId,
      operationsCount: batch.operations.length,
      lastSyncVersion: batch.lastSyncVersion,
      deviceId: batch.deviceId,
      operationTypes: batch.operations.map(op => op.type)
    });

    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // 1. Проверяем права доступа  
        const hasAccess = await this.syncRepository.checkUserAccess(userId, projectId);
        
        if (!hasAccess) {
          logger.error(`[SYNC] Access denied`, { userId, projectId });
          throw new Error(`Access denied for user ${userId} to project ${projectId}`);
        }

        // 2. Получаем текущее состояние проекта
        const { snapshot: currentSnapshot, version: currentVersion } =
          await this.syncRepository.getProjectSnapshot(projectId);

        logger.debug(`[SYNC] Current state`, {
          projectId,
          currentVersion,
          clientVersion: batch.lastSyncVersion,
          snapshotExists: !!currentSnapshot
        });

        // 3. Проверяем версию клиента
        if (batch.lastSyncVersion < currentVersion) {
          // Клиент отстал, нужно отправить ему недостающие операции
          const serverOperations = await this.syncRepository.getOperationsAfterVersion(
            projectId,
            batch.lastSyncVersion
          );

          logger.warn(`[SYNC] Client is behind`, {
            projectId,
            clientVersion: batch.lastSyncVersion,
            serverVersion: currentVersion,
            missingOperationsCount: serverOperations.length
          });

          return {
            success: false,
            syncVersion: currentVersion,
            appliedOperations: [],
            conflicts: batch.operations,
            serverOperations
          };
        }

        // 4. Применяем операции к снимку (чистая функция)
        logger.debug(`[SYNC] Applying operations to snapshot`, {
          projectId,
          operationsCount: batch.operations.length
        });
        
        const newSnapshot = applyOperationsToSnapshot(currentSnapshot, batch.operations);

        // 5. Подготавливаем операции для сохранения
        const operationsToSave = batch.operations.map(op => ({
          ...op,
          userId,
          deviceId: batch.deviceId
        }));

        // 6. Вычисляем новую версию
        const newVersion = currentVersion + 1;

        // 7. Сохраняем всё в транзакции
        logger.debug(`[SYNC] Saving to database`, {
          projectId,
          newVersion,
          operationsToSave: operationsToSave.length
        });

        await this.syncRepository.saveChangesInTransaction(
          projectId,
          newSnapshot,
          operationsToSave,
          newVersion
        );

        logger.info(`[SYNC] Successfully applied operations`, {
          projectId,
          operationsCount: batch.operations.length,
          newVersion,
          attempt: attempt + 1
        });

        return {
          success: true,
          syncVersion: newVersion,
          appliedOperations: batch.operations.map(op => op.id)
        };
      } catch (error: any) {
        lastError = error;
        const isRetryable =
          error.message?.includes('Transaction failed due to a write conflict or a deadlock') ||
          (error.code === 'P2034' || error.code === 'P2028');

        logger.error(`[SYNC] Error in batch processing`, {
          projectId,
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          isRetryable,
          errorMessage: error.message,
          errorCode: error.code,
          errorStack: error.stack?.substring(0, 500)
        });

        if (isRetryable && attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_DELAY * Math.pow(2, attempt) + Math.random() * INITIAL_DELAY;
          logger.warn(`[SYNC] Retrying transaction`, {
            projectId,
            attempt: attempt + 2,
            delayMs: Math.round(delay)
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error(`[SYNC] Final error after all retries`, {
            projectId,
            totalAttempts: attempt + 1,
            finalError: error.message
          });
          throw error;
        }
      }
    }

    logger.error(`[SYNC] Failed after max retries`, {
      projectId,
      maxRetries: MAX_RETRIES,
      lastError: lastError?.message
    });
    throw lastError;
  }

  /**
   * Получает текущий снимок графа
   */
  async getGraphSnapshot(userId: string, projectId: string): Promise<SnapshotResult> {
    // Проверяем права доступа
    const hasAccess = await this.syncRepository.checkUserAccess(userId, projectId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const { snapshot, version } = await this.syncRepository.getProjectSnapshot(projectId);
    
    return {
      version,
      timestamp: Date.now(),
      snapshot
    };
  }

  /**
   * Получает операции после указанной версии
   */
  async getOperationsSince(
    userId: string, 
    projectId: string, 
    sinceVersion: number
  ): Promise<OperationsResult> {
    // Проверяем права доступа
    const hasAccess = await this.syncRepository.checkUserAccess(userId, projectId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const operations = await this.syncRepository.getOperationsAfterVersion(projectId, sinceVersion);
    const currentVersion = await this.syncRepository.getProjectVersion(projectId);

    return {
      operations,
      currentVersion
    };
  }
} 