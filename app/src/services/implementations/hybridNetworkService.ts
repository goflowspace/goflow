'use client';

import {featureFlags} from '../../utils/featureFlags';
import {INetworkServiceWS} from '../interfaces/networkServiceWS.interfaces';
import {INetworkService, IOperationBatch, ISyncResult} from '../interfaces/syncInterfaces';
import {NetworkServiceImpl} from './networkServiceImpl';
import {NetworkServiceWSImpl} from './networkServiceWSImpl';

/**
 * Гибридный сетевой сервис с WebSocket + REST fallback
 *
 * Принципы SOLID:
 * - Single Responsibility: управление выбором между WS и REST
 * - Open/Closed: можно добавить новые стратегии выбора транспорта
 * - Liskov Substitution: полностью заменяет INetworkService
 * - Interface Segregation: реализует только нужные методы
 * - Dependency Inversion: зависит от абстракций WS и REST сервисов
 */
export class HybridNetworkService implements INetworkService {
  private wsService: INetworkServiceWS | null = null;
  private restService: INetworkService;
  private preferWebSocket: boolean;

  constructor(restService: INetworkService, wsService?: INetworkServiceWS | null, preferWebSocket: boolean = true) {
    this.restService = restService;
    this.wsService = wsService || null; // 👈 Исправляем: undefined → null
    this.preferWebSocket = preferWebSocket;
  }

  /**
   * Отправляет операции через лучший доступный транспорт
   * KISS принцип: простая логика выбора
   */
  async sendOperations(batch: IOperationBatch): Promise<ISyncResult> {
    const useWebSocket = this.shouldUseWebSocket();

    if (useWebSocket && this.wsService) {
      try {
        console.log(`🚀 [HybridNetwork] Using WebSocket for ${batch.operations.length} operations`);
        const result = await this.wsService.sendOperations(batch);

        // Логируем успешную WebSocket операцию
        console.log(`✅ [HybridNetwork] WebSocket operations completed:`, {
          success: result.success,
          syncVersion: result.syncVersion,
          processedCount: result.processedOperations.length
        });

        return result;
      } catch (error) {
        // WebSocket failed - fallback to REST
        console.warn(`⚠️ [HybridNetwork] WebSocket failed, falling back to REST:`, error);
        return this.sendViaREST(batch, 'ws_fallback');
      }
    } else {
      // Use REST directly
      return this.sendViaREST(batch, useWebSocket ? 'ws_unavailable' : 'rest_preferred');
    }
  }

  /**
   * Получает операции (всегда через REST для простоты)
   */
  async getOperations(projectId: string, sinceVersion: number): Promise<ISyncResult> {
    return this.restService.getOperations(projectId, sinceVersion);
  }

  /**
   * Проверяет доступность сети
   */
  isOnline(): boolean {
    return this.restService.isOnline();
  }

  /**
   * Устанавливает WebSocket сервис (для динамического подключения)
   */
  setWebSocketService(wsService: INetworkServiceWS | null): void {
    this.wsService = wsService;
  }

  /**
   * Устанавливает предпочтение WebSocket
   */
  setWebSocketPreference(prefer: boolean): void {
    this.preferWebSocket = prefer;
  }

  /**
   * Получает статистику транспорта
   */
  getTransportStats() {
    return {
      preferWebSocket: this.preferWebSocket,
      wsAvailable: !!this.wsService,
      wsConnected: this.wsService?.isWebSocketConnected() || false,
      restAvailable: true,
      networkOnline: this.isOnline()
    };
  }

  /**
   * Приватные методы (DRY принцип)
   */

  private shouldUseWebSocket(): boolean {
    if (!this.preferWebSocket) {
      return false;
    }

    if (!this.wsService) {
      return false;
    }

    if (!this.wsService.isOnline()) {
      return false;
    }

    if (!this.wsService.isWebSocketConnected()) {
      return false;
    }

    return true;
  }

  private async sendViaREST(batch: IOperationBatch, reason: string): Promise<ISyncResult> {
    console.log(`📡 [HybridNetwork] Using REST (${reason}) for ${batch.operations.length} operations`);

    try {
      const result = await this.restService.sendOperations(batch);

      console.log(`✅ [HybridNetwork] REST operations completed:`, {
        success: result.success,
        syncVersion: result.syncVersion,
        processedCount: result.processedOperations.length,
        reason
      });

      return result;
    } catch (error) {
      console.error(`❌ [HybridNetwork] REST also failed:`, error);
      throw error;
    }
  }
}

/**
 * Фабрика для создания гибридного сервиса
 * Open/Closed принцип: легко расширить для новых конфигураций
 */
export class HybridNetworkServiceFactory {
  /**
   * Создает гибридный сервис с автоматическим WebSocket подключением
   */
  static create(webSocketContext?: any, userId?: string, onServerOperationCallback?: (operations: any[]) => void): HybridNetworkService {
    // Создаем REST сервис (всегда доступен)
    const restService = new NetworkServiceImpl();

    // Создаем WebSocket сервис если есть контекст
    let wsService: INetworkServiceWS | null = null;
    if (webSocketContext?.socket) {
      wsService = new NetworkServiceWSImpl(webSocketContext.socket, userId);

      // 🚀 КРИТИЧЕСКОЕ ДОБАВЛЕНИЕ: Устанавливаем callback для операций от других пользователей
      if (onServerOperationCallback && wsService instanceof NetworkServiceWSImpl) {
        wsService.setOnServerOperationCallback(onServerOperationCallback);
        console.log('✅ [HybridNetworkServiceFactory] Set server operation callback for real-time sync');
      }

      console.log('🔧 [HybridNetworkServiceFactory] Created WebSocket service with userId:', userId || 'auto-detect');
    }

    // Проверяем feature flag
    const useWebSocket = HybridNetworkServiceFactory.shouldEnableWebSocket();

    return new HybridNetworkService(restService, wsService, useWebSocket);
  }

  /**
   * Проверяет feature flag для WebSocket
   */
  private static shouldEnableWebSocket(): boolean {
    return featureFlags.isEnabled('WS_SYNC_ENABLED');
  }

  /**
   * Включает WebSocket для текущей сессии
   */
  static enableWebSocketForSession(): void {
    featureFlags.enable('WS_SYNC_ENABLED');
    featureFlags.enable('REALTIME_COLLABORATION');
    console.log('🚀 [HybridNetwork] WebSocket enabled for current session');
  }

  /**
   * Выключает WebSocket для текущей сессии
   */
  static disableWebSocketForSession(): void {
    featureFlags.disable('WS_SYNC_ENABLED');
    featureFlags.disable('REALTIME_COLLABORATION');
    console.log('📡 [HybridNetwork] WebSocket disabled for current session');
  }
}
