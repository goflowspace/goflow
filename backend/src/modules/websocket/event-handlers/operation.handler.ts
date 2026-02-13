import { injectable, inject } from "inversify";
import { Socket } from "socket.io";
import { BaseEventHandler } from "./base.handler";
import { CollaborationEvent, CollaborationEventType } from "../../../types/websocket.types";
import { IWebSocketManager } from "../interfaces/websocket.interfaces";
import { IEventOrderingService } from "../interfaces/event-ordering.interfaces";
import { WEBSOCKET_TYPES } from "../di.types";

/**
 * Обработчик операций синхронизации
 * 
 * Принципы SOLID:
 * - Single Responsibility: только обработка WebSocket событий операций
 * - Dependency Inversion: зависит от абстракции IEventOrderingService
 * - Open/Closed: расширяемый через дополнительные типы событий
 */
@injectable()
export class OperationEventHandler extends BaseEventHandler {
  constructor(
    @inject(WEBSOCKET_TYPES.WebSocketManager) private wsManager: IWebSocketManager,
    @inject(WEBSOCKET_TYPES.EventOrderingService) private eventOrderingService: IEventOrderingService
  ) {
    super();
  }

  async handle(socket: Socket, event: CollaborationEvent): Promise<void> {
    try {
      this.validateEvent(event);
      
      if (event.type === CollaborationEventType.OPERATION_BROADCAST) {
        await this.handleOperationBroadcast(socket, event);
      } else {
        throw new Error(`Unsupported operation event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling operation event:`, error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type 
      });
    }
  }

  private async handleOperationBroadcast(socket: Socket, event: CollaborationEvent): Promise<void> {
    const { operation } = event.payload;
    const authenticatedSocket = socket as any; // Типизируем как AuthenticatedSocket
    
    // 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: используем аутентифицированный userId из сокета!
    const authenticatedUserId = authenticatedSocket.userId || 'unauthenticated';
    
    try { 
      this.logEvent(event, `Processing operation ${operation.type} via EventOrderingService`);

      // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: используем аутентифицированный userId вместо event.userId
      const result = await this.eventOrderingService.processOperation(
        event.projectId,
        authenticatedUserId, // 👈 Используем правильный userId из WebSocket auth!
        operation
      );

      // Отправляем результат обратно отправителю
      const operationResult = {
        operationId: operation.id,
        success: result.success,
        syncVersion: result.syncVersion,
        conflicts: result.conflicts
      };
      
      socket.emit('operation_result', operationResult);

      // Транслируем операцию другим участникам проекта ТОЛЬКО при успехе
      if (result.success) {
        const broadcastEvent: CollaborationEvent = {
          type: CollaborationEventType.OPERATION_BROADCAST,
          payload: {
            operation: {
              ...operation,
              version: result.syncVersion
            },
            syncVersion: result.syncVersion
          },
          userId: authenticatedUserId, // 👈 Используем аутентифицированный userId
          projectId: event.projectId,
          timestamp: Date.now()
        };

        this.wsManager.emitToProject(event.projectId, broadcastEvent, socket.id);
        
        this.logEvent(event, `Operation ${operation.type} successfully applied and broadcasted to project ${event.projectId}`);
      } else {
        // Операция не удалась - логируем для отладки
        this.logEvent(event, `Operation ${operation.type} failed - check server logs for details`);
      }
      
    } catch (error) {
      console.error('Error processing operation via EventOrderingService:', error);
      
      // Отправляем ошибку отправителю
      const operationError = {
        operationId: operation.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      socket.emit('operation_error', operationError);
    }
  }
} 