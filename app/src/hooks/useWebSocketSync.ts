'use client';

import {useEffect, useMemo, useState} from 'react';

import {useWebSocket} from '../contexts/WebSocketContext';
import {ISyncService} from '../services/interfaces/syncInterfaces';
import {SyncServiceFactory, SyncServiceRegistry} from '../services/syncServiceFactory';
import {useFeatureFlag} from '../utils/featureFlags';

/**
 * Хук для WebSocket синхронизации
 *
 * Принципы:
 * - Single Responsibility: только управление WebSocket синхронизацией
 * - KISS: простой API для компонентов
 * - Open/Closed: легко расширить для дополнительных возможностей
 *
 * @param projectId ID проекта для синхронизации
 * @returns Объект с SyncService и статусом
 */
export function useWebSocketSync(projectId: string) {
  const webSocketContext = useWebSocket();
  const wsEnabled = useFeatureFlag('WS_SYNC_ENABLED');
  const realtimeEnabled = useFeatureFlag('REALTIME_COLLABORATION');

  const [syncService, setSyncService] = useState<ISyncService | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [transport, setTransport] = useState<'rest' | 'websocket' | 'hybrid'>('rest');

  /**
   * Создает SyncService с правильным транспортом
   */
  const createSyncService = useMemo(() => {
    if (!projectId) return null;

    let service: ISyncService;
    let transportType: 'rest' | 'websocket' | 'hybrid' = 'rest';

    if (wsEnabled && realtimeEnabled && webSocketContext?.isConnected) {
      // WebSocket режим
      service = SyncServiceRegistry.getOrCreateWithWebSocket(projectId, webSocketContext);
      transportType = 'hybrid'; // Гибридный с WebSocket приоритетом

      console.log('🚀 [useWebSocketSync] Created WebSocket-enabled SyncService', {
        projectId,
        socketConnected: webSocketContext.isConnected,
        transport: transportType
      });
    } else {
      // REST режим (fallback)
      service = SyncServiceRegistry.getOrCreate(projectId);
      transportType = 'rest';

      console.log('📡 [useWebSocketSync] Created REST-only SyncService', {
        projectId,
        wsEnabled,
        realtimeEnabled,
        socketConnected: webSocketContext?.isConnected,
        transport: transportType,
        reason: !wsEnabled ? 'feature disabled' : !realtimeEnabled ? 'realtime disabled' : 'socket not connected'
      });
    }

    setTransport(transportType);
    return service;
  }, [projectId, wsEnabled, realtimeEnabled, webSocketContext?.isConnected]);

  /**
   * Обновляем SyncService при изменениях
   */
  useEffect(() => {
    if (createSyncService) {
      setSyncService(createSyncService);
      setIsReady(true);
    } else {
      setSyncService(null);
      setIsReady(false);
    }
  }, [createSyncService]);

  /**
   * Автоматически запускаем синхронизацию
   */
  useEffect(() => {
    if (syncService && isReady) {
      console.log(`🔄 [useWebSocketSync] Starting sync for project ${projectId} via ${transport}`);
      syncService.start();

      return () => {
        console.log(`⏹️ [useWebSocketSync] Stopping sync for project ${projectId}`);
        syncService.stop();
      };
    }
  }, [syncService, isReady, projectId, transport]);

  /**
   * Переподключение WebSocket при восстановлении соединения
   */
  useEffect(() => {
    if (wsEnabled && realtimeEnabled && webSocketContext?.isConnected && syncService) {
      // Если WebSocket восстановился, обновляем сервис
      const service = SyncServiceRegistry.getOrCreateWithWebSocket(projectId, webSocketContext);

      if (service !== syncService) {
        console.log('🔄 [useWebSocketSync] WebSocket reconnected, updating service');
        setSyncService(service);
      }
    }
  }, [webSocketContext?.isConnected, wsEnabled, realtimeEnabled, projectId, syncService]);

  /**
   * Получение статистики транспорта
   */
  const transportStats = useMemo(() => {
    const networkService = (syncService as any)?.dependencies?.networkService;

    if (networkService && typeof networkService.getTransportStats === 'function') {
      return networkService.getTransportStats();
    }

    return {
      transport,
      wsAvailable: !!webSocketContext,
      wsConnected: webSocketContext?.isConnected || false,
      restAvailable: true,
      networkOnline: navigator.onLine
    };
  }, [syncService, transport, webSocketContext]);

  return {
    // Основные объекты
    syncService,
    webSocketContext,

    // Статус
    isReady,
    transport,
    transportStats,

    // Feature flags
    wsEnabled,
    realtimeEnabled,

    // Состояние соединения
    isWebSocketConnected: webSocketContext?.isConnected || false,
    isOnline: navigator.onLine,

    // Методы управления
    forceSync: () => syncService?.forceSync(),
    getStats: () => syncService?.getStats(),

    // Debug информация
    debug: {
      projectId,
      syncServiceType: syncService?.constructor.name,
      hasWebSocketContext: !!webSocketContext,
      flags: {wsEnabled, realtimeEnabled}
    }
  };
}

/**
 * Хук для мониторинга состояния синхронизации
 *
 * @param syncService SyncService из useWebSocketSync
 * @returns Статус синхронизации и статистика
 */
export function useSyncStatus(syncService: ISyncService | null) {
  const [status, setStatus] = useState<string>('stopped');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!syncService) return;

    // Подписываемся на события
    const handleStatusChange = (oldStatus: string, newStatus: string) => {
      setStatus(newStatus);
    };

    const handleSyncCompleted = (completedStats: any) => {
      setStats(completedStats);
    };

    syncService.on('statusChanged', handleStatusChange);
    syncService.on('syncCompleted', handleSyncCompleted);

    // Получаем текущий статус
    setStatus(syncService.getStatus());
    setStats(syncService.getStats());

    return () => {
      syncService.off('statusChanged', handleStatusChange);
      syncService.off('syncCompleted', handleSyncCompleted);
    };
  }, [syncService]);

  return {
    status,
    stats,
    isRunning: status === 'running',
    isSyncing: status === 'syncing',
    hasError: status === 'error',
    isPaused: status === 'paused'
  };
}

/**
 * Хук для автоматической синхронизации проекта
 * Объединяет useWebSocketSync и useSyncStatus для удобства
 *
 * @param projectId ID проекта
 * @returns Полная информация о синхронизации
 */
export function useProjectSync(projectId: string) {
  const sync = useWebSocketSync(projectId);
  const status = useSyncStatus(sync.syncService);

  return {
    ...sync,
    ...status
  };
}
