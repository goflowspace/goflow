'use client';

import {INetworkServiceWS, WebSocketOperationError, WebSocketOperationEvent, WebSocketOperationResult} from '../interfaces/networkServiceWS.interfaces';
import {IOperationBatch, ISyncResult} from '../interfaces/syncInterfaces';

/**
 * WebSocket реализация сетевого сервиса
 *
 * Принципы SOLID:
 * - Single Responsibility: только WebSocket операции синхронизации
 * - Open/Closed: расширяемый для дополнительных WebSocket событий
 * - Liskov Substitution: заменяет REST NetworkService
 * - Interface Segregation: реализует только WS-специфичные методы
 * - Dependency Inversion: зависит от WebSocket абстракции
 */
export class NetworkServiceWSImpl implements INetworkServiceWS {
  private socket: any = null; // Socket от WebSocketContext
  private responseHandlers = new Map<
    string,
    {
      resolve: (result: ISyncResult) => void;
      reject: (error: Error) => void;
      timeout: number;
    }
  >();

  private readonly OPERATION_TIMEOUT = 10000; // 10 секунд
  private userId: string | null = null; // Кэшируем userId
  private onServerOperationCallback?: (operations: any[]) => void; // Callback для серверных операций

  constructor(socket: any, userId?: string) {
    this.socket = socket;
    this.userId = userId || null;
    this.setupEventHandlers();
  }

  /**
   * Устанавливает userId для операций
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Устанавливает callback для получения операций от сервера
   */
  setOnServerOperationCallback(callback: (operations: any[]) => void): void {
    this.onServerOperationCallback = callback;
  }

  /**
   * Отправляет операции через WebSocket
   * KISS принцип: простая отправка с Promise-based ответом
   */
  async sendOperations(batch: IOperationBatch): Promise<ISyncResult> {
    if (!this.isWebSocketConnected()) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        // Генерируем уникальные ID для каждой операции
        const operationsWithIds = batch.operations.map((op) => ({
          ...op,
          id: op.id?.toString() || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));

        // Создаем WebSocket события для каждой операции
        const promises = operationsWithIds.map((operation) => this.sendSingleOperation(batch.projectId, operation));

        // Ждем завершения всех операций
        Promise.all(promises)
          .then((results) => {
            // Объединяем результаты всех операций
            const combinedResult: ISyncResult = {
              success: results.every((r) => r.success),
              processedOperations: results.flatMap((r) => r.processedOperations),
              syncVersion: Math.max(...results.map((r) => r.syncVersion || 0)),
              errors: results.flatMap((r) => r.errors || []),
              conflicts: results.flatMap((r) => r.conflicts || []),
              serverOperations: results.flatMap((r) => r.serverOperations || [])
            };

            resolve(combinedResult);
          })
          .catch(reject);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Unknown error'));
      }
    });
  }

  /**
   * Отправляет одну операцию через WebSocket
   * DRY принцип: выделенная логика для одной операции
   */
  private sendSingleOperation(projectId: string, operation: any): Promise<ISyncResult> {
    return new Promise((resolve, reject) => {
      const operationId = operation.id;

      // Проверяем что операция с таким ID ещё не отправлена
      if (this.responseHandlers.has(operationId)) {
        console.warn('⚠️ [NetworkServiceWS] Operation already in progress:', operationId);
        reject(new Error(`Operation ${operationId} already in progress`));
        return;
      }

      // Устанавливаем таймаут для операции
      const timeout = window.setTimeout(() => {
        console.log('⏰ [NetworkServiceWS] Operation timeout:', operationId);
        this.responseHandlers.delete(operationId);
        reject(new Error(`Operation timeout: ${operationId}`));
      }, this.OPERATION_TIMEOUT);

      // Сохраняем обработчики для ответа
      this.responseHandlers.set(operationId, {
        resolve: (result: ISyncResult) => {
          console.log('✅ [NetworkServiceWS] Handler resolving operation:', operationId);
          window.clearTimeout(timeout);
          resolve(result);
        },
        reject: (error: Error) => {
          console.log('❌ [NetworkServiceWS] Handler rejecting operation:', operationId);
          window.clearTimeout(timeout);
          reject(error);
        },
        timeout
      });

      // Отправляем операцию через WebSocket
      const wsEvent: WebSocketOperationEvent = {
        type: 'OPERATION_BROADCAST',
        payload: {
          operation: {
            id: operationId,
            type: operation.type,
            timelineId: operation.timelineId,
            layerId: operation.layerId || 'base-layer',
            payload: operation.payload,
            timestamp: operation.timestamp,
            deviceId: operation.deviceId || this.getDeviceId()
          }
        },
        userId: this.getUserId(),
        projectId: projectId,
        timestamp: Date.now()
      };

      console.log('📤 [NetworkServiceWS] Sending operation via WebSocket:', {
        operationId,
        type: operation.type,
        projectId,
        waitingForResponse: true
      });

      this.socket.emit('OPERATION_BROADCAST', wsEvent);
    });
  }

  /**
   * Получает операции (fallback метод, может использовать REST)
   */
  async getOperations(projectId: string, sinceVersion: number): Promise<ISyncResult> {
    // Для простоты пока возвращаем пустой результат
    // В реальной реализации можно сделать REST fallback
    return {
      success: true,
      processedOperations: [],
      syncVersion: sinceVersion,
      serverOperations: []
    };
  }

  /**
   * Проверяет доступность сети
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Проверяет подключение к WebSocket
   */
  isWebSocketConnected(): boolean {
    return this.socket && this.socket.connected;
  }

  /**
   * Настраивает обработчики WebSocket событий
   * Open/Closed принцип: легко расширить для новых событий
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Обработчик успешных результатов операций
    this.socket.on('operation_result', (result: WebSocketOperationResult) => {
      console.log('📨 [NetworkServiceWS] Received operation_result:', {
        operationId: result.operationId,
        success: result.success,
        syncVersion: result.syncVersion,
        hasConflicts: (result.conflicts?.length || 0) > 0
      });

      const handler = this.responseHandlers.get(result.operationId);
      if (handler) {
        console.log('✅ [NetworkServiceWS] Found handler, resolving operation:', result.operationId);
        // Удаляем обработчик СРАЗУ чтобы избежать дублированных вызовов
        this.responseHandlers.delete(result.operationId);

        // 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: правильное преобразование ID
        const processedOperationId = parseInt(result.operationId);
        const processedOperations = result.success && !isNaN(processedOperationId) ? [processedOperationId] : [];

        const syncResult: ISyncResult = {
          success: result.success,
          processedOperations: processedOperations,
          syncVersion: result.syncVersion,
          conflicts: result.conflicts
        };

        console.log('✅ [NetworkServiceWS] Created syncResult:', {
          operationId: result.operationId,
          processedOperations,
          syncVersion: result.syncVersion,
          success: result.success,
          resolvedHandlerExists: true
        });

        handler.resolve(syncResult);
      } else {
        console.warn('⚠️ [NetworkServiceWS] No handler found for operation (duplicate response?):', {
          operationId: result.operationId,
          activeHandlers: Array.from(this.responseHandlers.keys()),
          totalActiveHandlers: this.responseHandlers.size
        });
      }
    });

    // Обработчик ошибок операций
    this.socket.on('operation_error', (error: WebSocketOperationError) => {
      console.log('❌ [NetworkServiceWS] Received operation_error:', error);

      const handler = this.responseHandlers.get(error.operationId);
      if (handler) {
        console.log('❌ [NetworkServiceWS] Rejecting operation:', error.operationId);
        this.responseHandlers.delete(error.operationId);
        handler.reject(new Error(error.error));
      } else {
        console.warn('⚠️ [NetworkServiceWS] No handler found for error operation:', error.operationId);
      }
    });

    // 🚀 КРИТИЧЕСКОЕ ДОБАВЛЕНИЕ: Обработчик операций от других пользователей
    this.socket.on('OPERATION_BROADCAST', (event: any) => {
      console.log('📨 [NetworkServiceWS] Received OPERATION_BROADCAST from another user:', {
        eventType: event.type,
        operationType: event.payload?.operation?.type,
        userId: event.userId,
        projectId: event.projectId,
        hasCallback: !!this.onServerOperationCallback
      });

      // Применяем операцию от другого пользователя если есть callback
      if (this.onServerOperationCallback && event.payload?.operation) {
        console.log('✅ [NetworkServiceWS] Applying operation from another user:', event.payload.operation.type);
        this.onServerOperationCallback([event.payload.operation]);
      } else {
        console.warn('⚠️ [NetworkServiceWS] Cannot apply server operation - no callback set');
      }
    });

    // Обработчик отключения WebSocket
    this.socket.on('disconnect', () => {
      // Отклоняем все ожидающие операции при отключении
      this.responseHandlers.forEach((handler, operationId) => {
        this.responseHandlers.delete(operationId);
        handler.reject(new Error('WebSocket disconnected'));
      });
    });
  }

  /**
   * Вспомогательные методы (KISS принцип)
   */

  private getUserId(): string {
    // Используем кэшированный userId если есть
    if (this.userId) {
      return this.userId;
    }

    // Получаем userId из localStorage (где хранится auth token)
    if (typeof window !== 'undefined') {
      try {
        // Пытаемся получить из токена
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Простое декодирование JWT для получения userId
          const payload = JSON.parse(atob(token.split('.')[1]));
          const extractedUserId = payload.userId || payload.id || payload.sub;
          if (extractedUserId) {
            this.userId = extractedUserId; // Кэшируем для следующих вызовов
            return extractedUserId;
          }
        }
      } catch (error) {
        console.warn('❌ [NetworkServiceWS] Failed to extract userId from token:', error);
      }
    }

    console.error('❌ [NetworkServiceWS] Cannot determine userId - operations will fail!');
    return 'unknown-user';
  }

  private getDeviceId(): string {
    // Генерируем или получаем device ID
    if (typeof window !== 'undefined') {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    }
    return 'unknown-device';
  }

  /**
   * Очистка ресурсов
   */
  destroy(): void {
    // Очищаем все ожидающие операции
    this.responseHandlers.forEach((handler, operationId) => {
      this.responseHandlers.delete(operationId);
      handler.reject(new Error('NetworkServiceWS destroyed'));
    });

    // Отписываемся от событий
    if (this.socket) {
      this.socket.off('operation_result');
      this.socket.off('operation_error');
      this.socket.off('disconnect');
    }
  }
}
