import {db, deleteOperations, getPendingOperations} from '../dbService';
import {IStorageService, Operation} from '../interfaces/syncInterfaces';

/**
 * Реализация интерфейса IStorageService для работы с IndexedDB
 * Адаптер для существующего dbService
 *
 * Принципы:
 * - Single Responsibility: только операции с хранилищем
 * - Dependency Inversion: реализует абстракцию IStorageService
 */
export class StorageServiceImpl implements IStorageService {
  constructor(private projectId: string) {}
  /**
   * Получает ожидающие синхронизации операции
   * @param limit Максимальное количество операций
   * @returns Массив операций
   */
  async getPendingOperations(limit: number): Promise<Operation[]> {
    try {
      // Получаем операции для конкретного проекта через db напрямую
      const operations = await db.operationQueue.where('projectId').equals(this.projectId).limit(limit).toArray();

      console.log(`Retrieved ${operations.length} pending operations for project ${this.projectId}`);

      // Преобразуем в нужный формат
      return operations.map((item) => this.mapToOperation(item));
    } catch (error) {
      console.error('Failed to get pending operations:', error);
      throw error;
    }
  }

  /**
   * Удаляет операции по их ID
   * @param operationIds Массив ID операций для удаления
   */
  async deleteOperations(operationIds: number[]): Promise<void> {
    try {
      await deleteOperations(operationIds);
    } catch (error) {
      console.error('Failed to delete operations:', error);
      throw error;
    }
  }

  /**
   * Получает общее количество ожидающих операций
   * @returns Количество операций
   */
  async getOperationsCount(): Promise<number> {
    try {
      // Получаем количество операций для конкретного проекта
      const count = await db.operationQueue.where('projectId').equals(this.projectId).count();
      return count;
    } catch (error) {
      console.error('Failed to get operations count:', error);
      return 0;
    }
  }

  /**
   * Преобразует объект из dbService в Operation
   * @param rawOperation Сырые данные операции
   * @returns Типизированная операция
   */
  private mapToOperation(rawOperation: any): Operation {
    // rawOperation из db имеет структуру { id, projectId, operation, timestamp }
    const operationData = rawOperation.operation || rawOperation;

    return {
      id: rawOperation.id as number,
      type: operationData.type || 'unknown',
      projectId: operationData.projectId || rawOperation.projectId || '',
      timelineId: operationData.timelineId || 'base-timeline',
      payload: operationData.payload || operationData,
      timestamp: operationData.timestamp || rawOperation.timestamp || Date.now(),
      layerId: operationData.layerId,
      deviceId: operationData.deviceId || 'unknown-device'
    };
  }
}
