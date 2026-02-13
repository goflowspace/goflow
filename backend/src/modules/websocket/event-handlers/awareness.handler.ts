import { injectable, inject } from "inversify";
import { Socket } from "socket.io";
import { BaseEventHandler } from "./base.handler";
import { CollaborationEvent, CollaborationEventType } from "../../../types/websocket.types";
import { ICollaborationService, IPresenceService, IWebSocketManager } from "../interfaces/websocket.interfaces";
import { WEBSOCKET_TYPES } from "../di.types";
import { logger } from "@modules/ai/v2/logging";

/**
 * Обработчик событий awareness (курсор, выделение, присутствие)
 * Версия для Inversify DI
 */
@injectable()
export class AwarenessEventHandler extends BaseEventHandler {
  constructor(
    @inject(WEBSOCKET_TYPES.CollaborationService) private collaborationService: ICollaborationService,
    @inject(WEBSOCKET_TYPES.PresenceService) private presenceService: IPresenceService,
    @inject(WEBSOCKET_TYPES.WebSocketManager) private wsManager: IWebSocketManager
  ) {
    super();
  }

  async handle(socket: Socket, event: CollaborationEvent): Promise<void> {
    try {
      this.validateEvent(event);
      
      switch (event.type) {
        // case CollaborationEventType.CURSOR_MOVE:
          // await this.handleCursorMove(socket, event);
          // break;
        case CollaborationEventType.LAYER_CURSOR_UPDATE:
          await this.handleLayerCursorFromClient(socket, event);
          break;
        case CollaborationEventType.SELECTION_CHANGE:
          await this.handleSelectionChange(socket, event);
          break;
        // case CollaborationEventType.AWARENESS_UPDATE:
          // await this.handleAwarenessUpdate(socket, event);
          // break;
        case CollaborationEventType.NODE_DRAG_PREVIEW:
          await this.handleNodeDragPreview(socket, event);
          break;
        default:
          throw new Error(`Unsupported awareness event type: ${event.type}`);
      }

      // Логируем event-ы для мониторинга
      await this.logEvent(event, socket.id, "Awareness event processed successfully");
    } catch (error) {
      console.error(`Error handling awareness event:`, error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type 
      });
    }
  }

  private async handleLayerCursorFromClient(socket: Socket, event: CollaborationEvent): Promise<void> {
    const session = await this.collaborationService.getSessionBySocketId(socket.id);
    if (!session) return;

    const { timelineId, layerId, cursor } = event.payload;
    
    // Валидация обязательных полей
    if (!timelineId || !layerId || !cursor) {
      logger.warn('Invalid layer cursor data from client - missing required fields');
      return;
    }

    // Обновляем через PresenceService для layer-aware filtering
    // PresenceService сам генерирует и рассылает LAYER_CURSOR_* события другим клиентам
    await this.presenceService.updateCursor(
      session.userId,
      session.awareness.userName,
      session.projectId,
      timelineId,
      layerId,
      cursor,
      session.id,
      session.awareness.userPicture
    );

    await this.logEvent(event, socket.id, `Layer cursor updated: ${layerId}`);
  }

  private async handleSelectionChange(socket: Socket, event: CollaborationEvent): Promise<void> {
    const session = await this.collaborationService.getSessionBySocketId(socket.id);
    if (!session) return;

    await this.collaborationService.updateAwareness(session.id, {
      selection: event.payload.selection
    });

    await this.logEvent(event, socket.id, 'Selection changed');
  }

  private async handleNodeDragPreview(socket: Socket, event: CollaborationEvent): Promise<void> {
    const session = await this.collaborationService.getSessionBySocketId(socket.id);
    if (!session) return;

    const { nodeId, position, timelineId, layerId } = event.payload;
    
    // Валидация обязательных полей
    if (!nodeId || !position || !timelineId || !layerId) {
      console.warn('Invalid node drag preview data - missing required fields');
      return;
    }

    // Транслируем событие другим участникам проекта в том же слое
    const broadcastEvent: CollaborationEvent = {
      type: CollaborationEventType.NODE_DRAG_PREVIEW,
      payload: {
        nodeId,
        position,
        timelineId,
        layerId,
        userId: session.userId
      },
      userId: session.userId,
      projectId: event.projectId,
      timestamp: Date.now()
    };

    this.wsManager.emitToProject(
      event.projectId, 
      broadcastEvent, 
      socket.id
    );

    await this.logEvent(event, socket.id, `Node drag preview for ${nodeId}`);
  }

  protected async logEvent(_event: CollaborationEvent, _socketId: string, _additionalInfo?: string): Promise<void> {
    // Логирование отключено
  }
}