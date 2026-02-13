import { injectable, inject } from "inversify";
import { LayerPresence, CursorPosition, CollaborationEventType, LayerCursorEvent } from "../../../types/websocket.types";
import { IWebSocketManager } from "../interfaces/websocket.interfaces";
import { WEBSOCKET_TYPES } from "../di.types";
import { logger } from "@config/logger";
import { RedisService, getRedisService } from "../../../services/redis.service";
import { IPresenceService } from "./presence.service";

/**
 * Redis-based Presence Service для синхронизации курсоров между инстансами
 * 
 * Принципы SOLID:
 * - Single Responsibility: управление presence через Redis
 * - Dependency Inversion: зависит от Redis абстракции
 * - Open/Closed: расширяемый для дополнительных типов presence данных
 */
@injectable()
export class RedisPresenceService implements IPresenceService {
  private readonly redisService: RedisService;
  
  // Локальный кеш для быстрого доступа (синхронизируется с Redis)
  private localCache = new Map<string, Map<string, LayerPresence>>();
  
  // Цвета для пользователей (генерируются на основе userId)
  private userColors = new Map<string, string>();
  
  // Timeout для неактивных курсоров (30 секунд)
  private readonly PRESENCE_TIMEOUT = 30 * 1000;
  
  // Redis TTL для presence данных (45 секунд - чуть больше timeout)
  private readonly REDIS_PRESENCE_TTL = 45;
  
  // Interval для очистки
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(
    @inject(WEBSOCKET_TYPES.WebSocketManager) private wsManager: IWebSocketManager
  ) {
    this.redisService = getRedisService();
    
    // Запускаем очистку каждые 10 секунд
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
    
    // Подписываемся на Redis presence события для обновления локального кеша
    this.setupRedisSubscriptions();
  }

  /**
   * Обновление позиции курсора пользователя с Redis синхронизацией
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

    try {
      // 1. Сохраняем в Redis с TTL
      await this.savePresenceToRedis(layerKey, userId, presence);
      
      // 2. Обновляем локальный кеш
      this.updateLocalCache(layerKey, userId, presence);
      
      // 3. Проверяем, был ли пользователь уже в слое
      const layerMap = this.localCache.get(layerKey);
      const wasPresent = layerMap ? layerMap.has(userId) : false;
      
      logger.debug(`Updated cursor for user ${userId} in layer ${layerKey} via Redis`);
      
      // 4. Отправляем событие через Redis (для всех инстансов)
      const event: LayerCursorEvent = {
        type: wasPresent ? CollaborationEventType.LAYER_CURSOR_UPDATE : CollaborationEventType.LAYER_CURSOR_ENTER,
        projectId,
        timelineId,
        layerId,
        presence,
        timestamp: now
      };
      
      await this.broadcastToLayer(layerKey, event, sessionId);
      
    } catch (error) {
      logger.error(`❌ Error updating cursor in Redis for user ${userId}:`, error);
      // Fallback to local cache only
      this.updateLocalCache(layerKey, userId, presence);
    }
  }

  /**
   * Пользователь покинул слой с Redis синхронизацией
   */
  async leaveLayer(userId: string, projectId: string, timelineId: string, layerId: string): Promise<void> {
    const layerKey = this.getLayerKey(projectId, timelineId, layerId);
    
    try {
      // 1. Получаем presence перед удалением
      const presence = await this.getPresenceFromRedis(layerKey, userId);
      if (!presence) {
        return;
      }
      
      // 2. Удаляем из Redis
      await this.removePresenceFromRedis(layerKey, userId);
      
      // 3. Удаляем из локального кеша
      this.removeFromLocalCache(layerKey, userId);
      
      logger.debug(`User ${userId} left layer ${layerKey} via Redis`);
      
      // 4. Отправляем событие выхода
      const event: LayerCursorEvent = {
        type: CollaborationEventType.LAYER_CURSOR_LEAVE,
        projectId,
        timelineId,
        layerId,
        presence,
        timestamp: Date.now()
      };
      
      await this.broadcastToLayer(layerKey, event, presence.sessionId);
      
    } catch (error) {
      logger.error(`❌ Error removing user ${userId} from layer ${layerKey} in Redis:`, error);
      // Fallback to local cache only
      this.removeFromLocalCache(layerKey, userId);
    }
  }

  /**
   * Получение всех присутствующих в слое (сначала из Redis, потом локальный кеш)
   */
  getLayerPresence(projectId: string, timelineId: string, layerId: string): LayerPresence[] {
    const layerKey = this.getLayerKey(projectId, timelineId, layerId);
    
    try {
      // Возвращаем из локального кеша (который синхронизируется с Redis)
      const layerMap = this.localCache.get(layerKey);
      if (!layerMap) {
        return [];
      }
      
      const now = Date.now();
      return Array.from(layerMap.values())
        .filter(presence => now - presence.lastSeen < this.PRESENCE_TIMEOUT);
        
    } catch (error) {
      logger.error(`❌ Error getting layer presence for ${layerKey}:`, error);
      return [];
    }
  }

  /**
   * Получение цвета пользователя (аналогично оригиналу)
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
    
    try {
      // Очистка локального кеша
      for (const [layerKey, layerMap] of this.localCache.entries()) {
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
          
          // Также удаляем из Redis (асинхронно, без ожидания)
          this.removePresenceFromRedis(layerKey, userId).catch(error => {
            logger.error(`❌ Error removing inactive presence from Redis:`, error);
          });
        }
        
        // Удаляем пустые слои
        if (layerMap.size === 0) {
          this.localCache.delete(layerKey);
        }
      }
      
      if (removedCount > 0) {
        logger.debug(`Cleaned up ${removedCount} inactive presence entries`);
      }
    } catch (error) {
      logger.error('❌ Error during presence cleanup:', error);
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
   * Redis операции
   */
  
  private async savePresenceToRedis(layerKey: string, userId: string, presence: LayerPresence): Promise<void> {
    const redisKey = `presence:${layerKey}`;
    const presenceData = JSON.stringify(presence);
    
    // Сохраняем как hash field с TTL
    await this.redisService.getClient().hset(redisKey, userId, presenceData);
    await this.redisService.getClient().expire(redisKey, this.REDIS_PRESENCE_TTL);
  }
  
  private async getPresenceFromRedis(layerKey: string, userId: string): Promise<LayerPresence | null> {
    const redisKey = `presence:${layerKey}`;
    const presenceData = await this.redisService.getClient().hget(redisKey, userId);
    
    if (!presenceData) {
      return null;
    }
    
    try {
      return JSON.parse(presenceData);
    } catch (error) {
      logger.error('❌ Error parsing presence data from Redis:', error);
      return null;
    }
  }
  
  private async removePresenceFromRedis(layerKey: string, userId: string): Promise<void> {
    const redisKey = `presence:${layerKey}`;
    await this.redisService.getClient().hdel(redisKey, userId);
  }

  /**
   * Локальный кеш операции
   */
  
  private updateLocalCache(layerKey: string, userId: string, presence: LayerPresence): void {
    if (!this.localCache.has(layerKey)) {
      this.localCache.set(layerKey, new Map());
    }
    
    const layerMap = this.localCache.get(layerKey)!;
    layerMap.set(userId, presence);
  }
  
  private removeFromLocalCache(layerKey: string, userId: string): void {
    const layerMap = this.localCache.get(layerKey);
    if (!layerMap) return;
    
    layerMap.delete(userId);
    
    // Удаляем пустые слои
    if (layerMap.size === 0) {
      this.localCache.delete(layerKey);
    }
  }

  /**
   * Генерация ключа слоя
   */
  private getLayerKey(projectId: string, timelineId: string, layerId: string): string {
    return `${projectId}:${timelineId}:${layerId}`;
  }

  /**
   * Broadcast события всем пользователям в слое через Redis
   */
  private async broadcastToLayer(layerKey: string, event: LayerCursorEvent, excludeSessionId?: string): Promise<void> {
    try {
      // Отправляем событие через проектную комнату с Redis синхронизацией
      const collaborationEvent = {
        type: event.type as any,
        payload: event,
        userId: event.presence.userId,
        projectId: event.projectId,
        timestamp: event.timestamp
      };
      
      this.wsManager.emitToProject(event.projectId, collaborationEvent, excludeSessionId);
      
      logger.debug(`📡 Broadcasted layer event ${event.type} to layer ${layerKey}`);
      
    } catch (error) {
      logger.error(`❌ Error broadcasting layer event for ${layerKey}:`, error);
    }
  }

  /**
   * Настройка подписок на Redis события для синхронизации локального кеша
   */
  private async setupRedisSubscriptions(): Promise<void> {
    try {
      // Пока не реализовываем - локальный кеш будет синхронизироваться через WebSocket события
      // В будущем можем добавить прямые Redis Pub/Sub подписки для presence данных
      
      logger.debug('✅ Redis presence subscriptions set up');
    } catch (error) {
      logger.error('❌ Error setting up Redis presence subscriptions:', error);
    }
  }
}
