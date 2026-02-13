import { injectable, inject } from "inversify";
import { Socket } from "socket.io";
import { CollaborationEvent, CollaborationEventType } from "../../../types/websocket.types";
import { BaseEventHandler } from "./base.handler";
import { IWebSocketManager } from "../interfaces/websocket.interfaces";
import { WEBSOCKET_TYPES } from "../di.types";

/**
 * Обработчик AI событий для WebSocket коммуникации
 * Обрабатывает события прогресса AI пайплайна
 */
@injectable()
export class AIEventHandler extends BaseEventHandler {
  constructor(
    @inject(WEBSOCKET_TYPES.WebSocketManager) private wsManager: IWebSocketManager
  ) {
    super();
  }

  async handle(socket: Socket, event: CollaborationEvent): Promise<void> {
    switch (event.type) {
      case CollaborationEventType.AI_PIPELINE_STARTED:
        await this.handlePipelineStarted(socket, event);
        break;
      case CollaborationEventType.AI_PIPELINE_PROGRESS:
        await this.handlePipelineProgress(socket, event);
        break;
      case CollaborationEventType.AI_PIPELINE_STEP_COMPLETED:
        await this.handleStepCompleted(socket, event);
        break;
      case CollaborationEventType.AI_PIPELINE_COMPLETED:
        await this.handlePipelineCompleted(socket, event);
        break;
      case CollaborationEventType.AI_PIPELINE_ERROR:
        await this.handlePipelineError(socket, event);
        break;
      default:
        console.warn(`Unknown AI event type: ${event.type}`);
    }
  }

  /**
   * Обработка старта пайплайна
   */
  private async handlePipelineStarted(socket: Socket, event: CollaborationEvent): Promise<void> {
    // Ретрансляция события всем участникам проекта, кроме отправителя
    this.wsManager.emitToProject(event.projectId, event, socket.id);
    
    this.logEvent(event, 'AI Pipeline started');
  }

  /**
   * Обработка прогресса пайплайна
   */
  private async handlePipelineProgress(socket: Socket, event: CollaborationEvent): Promise<void> {
    // Ретрансляция прогресса всем участникам проекта
    this.wsManager.emitToProject(event.projectId, event, socket.id);
    
    const { progress, stepName } = event.payload;
    this.logEvent(event, `AI Pipeline progress: ${progress}% - ${stepName || 'Processing'}`);
  }

  /**
   * Обработка завершения шага
   */
  private async handleStepCompleted(socket: Socket, event: CollaborationEvent): Promise<void> {
    // Ретрансляция события всем участникам проекта
    this.wsManager.emitToProject(event.projectId, event, socket.id);
    
    const { currentStep, stepName } = event.payload;
    this.logEvent(event, `AI Pipeline step completed: ${stepName || currentStep}`);
  }

  /**
   * Обработка завершения пайплайна
   */
  private async handlePipelineCompleted(socket: Socket, event: CollaborationEvent): Promise<void> {
    // Ретрансляция события всем участникам проекта
    this.wsManager.emitToProject(event.projectId, event, socket.id);
    
    const { tokensUsed, cost } = event.payload;
    this.logEvent(event, `AI Pipeline completed. Tokens: ${tokensUsed}, Cost: ${cost}`);
  }

  /**
   * Обработка ошибки пайплайна
   */
  private async handlePipelineError(socket: Socket, event: CollaborationEvent): Promise<void> {
    // Ретрансляция ошибки всем участникам проекта
    this.wsManager.emitToProject(event.projectId, event, socket.id);
    
    this.logEvent(event, `AI Pipeline error: ${event.payload.error || 'Unknown error'}`);
  }
} 