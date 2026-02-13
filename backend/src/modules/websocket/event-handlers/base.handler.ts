import { Socket } from "socket.io";
import { CollaborationEvent } from "../../../types/websocket.types";

/**
 * Базовый интерфейс для обработчиков событий
 * Принцип Interface Segregation: каждый обработчик реализует только нужные методы
 */
export interface EventHandler {
  handle(socket: Socket, event: CollaborationEvent): Promise<void>;
}

/**
 * Абстрактный базовый класс для обработчиков
 * Принцип DRY: общая логика валидации
 */
export abstract class BaseEventHandler implements EventHandler {
  abstract handle(socket: Socket, event: CollaborationEvent): Promise<void>;

  /**
   * Валидация базовых полей события
   */
  protected validateEvent(event: CollaborationEvent): void {
    if (!event) {
      throw new Error("Event is required");
    }
    if (!event.type) {
      throw new Error("Event must have type");
    }
    if (!event.userId) {
      throw new Error("Event must have userId");
    }
    if (!event.projectId) {
      throw new Error("Event must have projectId");
    }
    if (!event.timestamp || typeof event.timestamp !== 'number') {
      throw new Error("Event must have valid timestamp");
    }
    if (!event.payload) {
      throw new Error("Event must have payload");
    }
  }

  /**
   * Логирование обработки события
   */
  protected logEvent(event: CollaborationEvent, action: string): void {
    console.debug(`[${event.type}] ${action} for user ${event.userId} in project ${event.projectId}`);
  }
} 