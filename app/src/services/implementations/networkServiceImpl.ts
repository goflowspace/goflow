import {api} from '../api';
import {INetworkService, IOperationBatch, ISyncResult} from '../interfaces/syncInterfaces';

/**
 * Реализация интерфейса INetworkService для работы с API
 * Адаптер для существующего API сервиса
 *
 * Принципы:
 * - Single Responsibility: только сетевые операции
 * - Dependency Inversion: реализует абстракцию INetworkService
 */
export class NetworkServiceImpl implements INetworkService {
  /**
   * Отправляет пакет операций на сервер
   * @param batch Пакет операций для синхронизации
   * @returns Результат синхронизации
   */
  async sendOperations(batch: IOperationBatch): Promise<ISyncResult> {
    try {
      // Преобразуем наш формат в формат, ожидаемый бэкендом
      const backendBatch = this.convertToBackendFormat(batch);

      // Отправляем операции через API сервис напрямую
      const result = await api.syncOperations(batch.projectId, backendBatch);

      // Преобразуем ответ в наш формат
      return this.convertFromBackendFormat(result);
    } catch (error) {
      console.error('Network sync failed:', error);

      // Возвращаем неуспешный результат с информацией об ошибке
      return {
        success: false,
        processedOperations: [],
        errors: [this.getErrorMessage(error)]
      };
    }
  }

  async getOperations(projectId: string, sinceVersion: number): Promise<ISyncResult> {
    try {
      const result = await api.getOperations(projectId, sinceVersion);
      return result;
    } catch (error) {
      console.error('Network get operations failed:', error);
      return {
        success: false,
        processedOperations: [],
        errors: [this.getErrorMessage(error)],
        syncVersion: sinceVersion
      };
    }
  }

  /**
   * Проверяет доступность сети
   * @returns true если онлайн, false если офлайн
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Преобразует наш формат пакета в формат бэкенда
   * @param batch Пакет операций в нашем формате
   * @returns Пакет в формате бэкенда
   */
  private convertToBackendFormat(batch: IOperationBatch): any {
    return {
      operations: batch.operations.map((op) => ({
        id: op.id?.toString() || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: op.type,
        timelineId: op.timelineId,
        layerId: op.layerId || 'base-layer',
        payload: op.payload,
        deviceId: batch.deviceId,
        timestamp: op.timestamp
      })),
      projectId: batch.projectId,
      lastSyncVersion: batch.lastSyncVersion || 0,
      deviceId: batch.deviceId
    };
  }

  /**
   * Преобразует ответ бэкенда в наш формат
   * @param backendResult Результат от бэкенда
   * @returns Результат в нашем формате
   */
  private convertFromBackendFormat(backendResult: any): ISyncResult {
    return {
      success: backendResult.success || false,
      processedOperations: this.extractProcessedOperationIds(backendResult),
      syncVersion: backendResult.syncVersion,
      errors: backendResult.errors || [],
      conflicts: backendResult.conflicts,
      serverOperations: backendResult.serverOperations?.map((op: any) => ({
        id: parseInt(op.id) || Date.now(),
        type: op.type,
        projectId: op.projectId || '',
        timelineId: op.timelineId,
        payload: op.payload,
        timestamp: op.timestamp,
        layerId: op.layerId,
        deviceId: op.deviceId
      }))
    };
  }

  /**
   * Извлекает ID обработанных операций из ответа бэкенда
   * @param backendResult Результат от бэкенда
   * @returns Массив ID обработанных операций
   */
  private extractProcessedOperationIds(backendResult: any): number[] {
    const appliedOperations = backendResult.appliedOperations || [];

    // Обрабатываем ID которые могут быть строками или числами
    return appliedOperations
      .map((id: any) => {
        // Если ID уже число, возвращаем его
        if (typeof id === 'number') {
          return id;
        }

        // Если ID строка
        if (typeof id === 'string') {
          // Если ID начинается с 'temp_', это временный ID - пропускаем
          if (id.startsWith('temp_')) {
            return null;
          }

          const numId = parseInt(id);
          return isNaN(numId) ? null : numId;
        }

        // Неизвестный тип ID
        return null;
      })
      .filter((id: number | null) => id !== null);
  }

  /**
   * Извлекает сообщение об ошибке из исключения
   * @param error Ошибка
   * @returns Строковое представление ошибки
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }

    return 'Unknown network error';
  }
}
