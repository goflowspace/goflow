import {IOperationBatch, ISyncResult} from './syncInterfaces';

/**
 * Интерфейс для WebSocket сетевого сервиса
 *
 * Принцип Single Responsibility: только WebSocket операции
 * Принцип Interface Segregation: минимальный набор методов
 */
export interface INetworkServiceWS {
  /**
   * Отправляет операции через WebSocket
   * @param batch Пакет операций
   * @returns Promise с результатом синхронизации
   */
  sendOperations(batch: IOperationBatch): Promise<ISyncResult>;

  /**
   * Получает операции с сервера (если нужно для fallback)
   * @param projectId ID проекта
   * @param sinceVersion Версия с которой получать операции
   */
  getOperations(projectId: string, sinceVersion: number): Promise<ISyncResult>;

  /**
   * Проверяет доступность WebSocket соединения
   */
  isOnline(): boolean;

  /**
   * Проверяет подключение к WebSocket
   */
  isWebSocketConnected(): boolean;
}

/**
 * Событие WebSocket операции
 */
export interface WebSocketOperationEvent {
  type: 'OPERATION_BROADCAST';
  payload: {
    operation: {
      id: string;
      type: string;
      timelineId: string;
      layerId: string;
      payload: any;
      timestamp: number;
      deviceId: string;
      version?: number;
    };
    syncVersion?: number;
  };
  userId: string;
  projectId: string;
  timestamp: number;
}

/**
 * Результат операции от WebSocket
 */
export interface WebSocketOperationResult {
  operationId: string;
  success: boolean;
  syncVersion: number;
  conflicts?: any[];
}

/**
 * Ошибка операции от WebSocket
 */
export interface WebSocketOperationError {
  operationId: string;
  error: string;
}
