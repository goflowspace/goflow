import { injectable, inject } from "inversify";
import { LayerPresence, CursorPosition, CollaborationEventType, LayerCursorEvent } from "../../../types/websocket.types";
import { IWebSocketManager } from "../interfaces/websocket.interfaces";
import { WEBSOCKET_TYPES } from "../di.types";
import { logger } from "@config/logger";

export interface IPresenceService {
  updateCursor(
    userId: string,
    userName: string,
    projectId: string,
    timelineId: string,
    layerId: string,
    cursor: CursorPosition,
    sessionId: string,
    userPicture?: string
  ): Promise<void>;
  
  leaveLayer(userId: string, projectId: string, timelineId: string, layerId: string): Promise<void>;
  getLayerPresence(projectId: string, timelineId: string, layerId: string): LayerPresence[];
  getUserColor(userId: string): string;
  cleanup(): void;
}

/**
 * Сервис для управления presence курсоров в слоях
 */
@injectable()
export class PresenceService implements IPresenceService {
  // Map<projectId:timelineId:layerId, Map<userId, LayerPresence>>
  private layerPresence = new Map<string, Map<string, LayerPresence>>();
  
  // Цвета для пользователей (генерируются на основе userId)
  private userColors = new Map<string, string>();
  
  // Timeout для неактивных курсоров (30 секунд)
  private readonly PRESENCE_TIMEOUT = 30 * 1000;
  
  // Interval для очистки
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(
    @inject(WEBSOCKET_TYPES.WebSocketManager) private wsManager: IWebSocketManager
  ) {
    // Запускаем очистку каждые 10 секунд
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
  }

  /**
   * Обновление позиции курсора пользователя
   */
  async updateCursor(
    userId: string,
    userName: string,
    projectId: string,
    timelineId: string,
    layerId: string,
    cursor: CursorPosition,
    sessionId: string,
    userPicture?: string
  ): Promise<void> {
    const layerKey = this.getLayerKey(projectId, timelineId, layerId);
    
    // Инициализируем карту присутствия для слоя если её нет
    if (!this.layerPresence.has(layerKey)) {
      this.layerPresence.set(layerKey, new Map());
    }
    
    const layerMap = this.layerPresence.get(layerKey)!;
    const userColor = this.getUserColor(userId);
    const now = Date.now();
    
    const presence: LayerPresence = {
      userId,
      userName,
      userColor,
      userPicture,
      cursor: { ...cursor, timestamp: now },
      lastSeen: now,
      sessionId
    };
    
    // Проверяем, есть ли уже присутствие пользователя в этом слое
    const wasPresent = layerMap.has(userId);
    layerMap.set(userId, presence);
    
    logger.debug(`Updated cursor for user ${userId} in layer ${layerKey}`);
    
    // Отправляем событие всем пользователям в том же слое
    const event: LayerCursorEvent = {
      type: wasPresent ? CollaborationEventType.LAYER_CURSOR_UPDATE : CollaborationEventType.LAYER_CURSOR_ENTER,
      projectId,
      timelineId,
      layerId,
      presence,
      timestamp: now
    };
    
    await this.broadcastToLayer(layerKey, event, sessionId);
  }

  /**
   * Пользователь покинул слой
   */
  async leaveLayer(userId: string, projectId: string, timelineId: string, layerId: string): Promise<void> {
    const layerKey = this.getLayerKey(projectId, timelineId, layerId);
    const layerMap = this.layerPresence.get(layerKey);
    
    if (!layerMap || !layerMap.has(userId)) {
      return;
    }
    
    const presence = layerMap.get(userId)!;
    layerMap.delete(userId);
    
    // Если в слое никого не осталось, удаляем слой
    if (layerMap.size === 0) {
      this.layerPresence.delete(layerKey);
    }
    
    logger.debug(`User ${userId} left layer ${layerKey}`);
    
    // Отправляем событие выхода
    const event: LayerCursorEvent = {
      type: CollaborationEventType.LAYER_CURSOR_LEAVE,
      projectId,
      timelineId,
      layerId,
      presence,
      timestamp: Date.now()
    };
    
    await this.broadcastToLayer(layerKey, event, presence.sessionId);
  }

  /**
   * Получение всех присутствующих в слое
   */
  getLayerPresence(projectId: string, timelineId: string, layerId: string): LayerPresence[] {
    const layerKey = this.getLayerKey(projectId, timelineId, layerId);
    const layerMap = this.layerPresence.get(layerKey);
    
    if (!layerMap) {
      return [];
    }
    
    const now = Date.now();
    return Array.from(layerMap.values())
      .filter(presence => now - presence.lastSeen < this.PRESENCE_TIMEOUT);
  }

  /**
   * Получение цвета пользователя
   */
  getUserColor(userId: string): string {
    if (this.userColors.has(userId)) {
      return this.userColors.get(userId)!;
    }
    
    // Генерируем стабильный цвет на основе userId
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#A29BFE'
    ];
    
    // Простой хеш от userId для стабильного выбора цвета
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];
    
    this.userColors.set(userId, color);
    return color;
  }

  /**
   * Очистка неактивных присутствий
   */
  cleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [layerKey, layerMap] of this.layerPresence.entries()) {
      const usersToRemove: string[] = [];
      
      for (const [userId, presence] of layerMap.entries()) {
        if (now - presence.lastSeen > this.PRESENCE_TIMEOUT) {
          usersToRemove.push(userId);
        }
      }
      
      // Удаляем неактивных пользователей
      for (const userId of usersToRemove) {
        layerMap.delete(userId);
        removedCount++;
      }
      
      // Удаляем пустые слои
      if (layerMap.size === 0) {
        this.layerPresence.delete(layerKey);
      }
    }
    
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} inactive presence entries`);
    }
  }

  /**
   * Остановка сервиса
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Генерация ключа слоя
   */
  private getLayerKey(projectId: string, timelineId: string, layerId: string): string {
    return `${projectId}:${timelineId}:${layerId}`;
  }

  /**
   * Broadcast события всем пользователям в слое
   */
  private async broadcastToLayer(layerKey: string, event: LayerCursorEvent, excludeSessionId?: string): Promise<void> {
    const layerMap = this.layerPresence.get(layerKey);
    if (!layerMap) return;
    
    // Отправляем событие через проектную комнату
    // WebSocketManager отправит всем в проекте, но клиенты отфильтруют по слою
    const collaborationEvent = {
      type: event.type as any,
      payload: event,
      userId: event.presence.userId,
      projectId: event.projectId,
      timestamp: event.timestamp
    };
    
    this.wsManager.emitToProject(event.projectId, collaborationEvent, excludeSessionId);
  }
}
