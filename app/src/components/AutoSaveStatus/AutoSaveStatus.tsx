import React, {useEffect, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useFPSTracker} from '@hooks/useFPSTracker';
import {StorageServiceImpl} from '@services/implementations/storageServiceImpl';
import {ISyncStats, SyncStatus} from '@services/interfaces/syncInterfaces';
import {SyncServiceRegistry} from '@services/syncServiceFactory';
import {useTranslation} from 'react-i18next';

import {useWebSocket} from '../../contexts/WebSocketContext';
import useUserStore from '../../store/useUserStore';
import {useFeatureFlag} from '../../utils/featureFlags';

interface AutoSaveStatusProps {
  className?: string;
  isPanningRef?: React.MutableRefObject<boolean>;
}

export const AutoSaveStatus: React.FC<AutoSaveStatusProps> = ({className, isPanningRef}) => {
  const {t} = useTranslation();
  const {projectId} = useCurrentProject();
  const webSocketContext = useWebSocket();
  const wsEnabled = useFeatureFlag('WS_SYNC_ENABLED');
  const realtimeEnabled = useFeatureFlag('REALTIME_COLLABORATION');

  const [stats, setStats] = useState<ISyncStats | null>(null);
  const [status, setStatus] = useState<SyncStatus>('stopped');
  const [actualPendingCount, setActualPendingCount] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [transport, setTransport] = useState<'rest' | 'websocket'>('rest');

  const fps = useFPSTracker({
    isPanningRef,
    updateInterval: 3000 // Update every 3 seconds for less load
  });

  // Function to get correct declension of the word "operation"
  const getOperationWord = (count: number) => {
    if (count === 1) {
      return t('autoSaveStatus.operation_singular');
    } else if (count >= 2 && count <= 4) {
      return t('autoSaveStatus.operation_few');
    } else {
      return t('autoSaveStatus.operation_many');
    }
  };

  useEffect(() => {
    if (!projectId) {
      setIsInitialized(false);
      return;
    }

    try {
      // 🚀 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: используем WebSocket если доступно
      let syncService;

      if (wsEnabled && realtimeEnabled && webSocketContext?.isConnected) {
        console.log('🚀 [AutoSaveStatus] Using WebSocket SyncService for', projectId);

        // Получаем userId из useUserStore hook
        const getUserId = () => {
          try {
            // В React компоненте можем получить из глобального store
            const userStore = useUserStore.getState();
            return userStore?.user?.id;
          } catch {
            return undefined;
          }
        };

        syncService = SyncServiceRegistry.getOrCreateWithWebSocket(
          projectId,
          webSocketContext,
          undefined, // config по умолчанию
          getUserId() // 👈 Передаем правильный userId
        );
        setTransport('websocket');
      } else {
        console.log('📡 [AutoSaveStatus] Using REST SyncService for', projectId);
        syncService = SyncServiceRegistry.getOrCreate(projectId);
        setTransport('rest');
      }

      setIsInitialized(true);

      // Create own StorageService instance to get actual counter
      const storageService = new StorageServiceImpl(projectId);

      const updateStatus = async () => {
        const currentStats = syncService.getStats();
        setStats(currentStats);
        setStatus(syncService.getStatus());

        // Get actual number of operations directly from storage
        try {
          const actualCount = await storageService.getOperationsCount();
          setActualPendingCount(actualCount);
        } catch (error) {
          console.error('Failed to get actual pending count:', error);
        }
      };

      // Update status immediately
      updateStatus();

      // Subscribe to sync events
      const handleSyncCompleted = (newStats: ISyncStats) => {
        setStats(newStats);
        // Update actual counter when sync completes
        updateStatus();
      };

      const handleSyncFailed = (error: string, newStats: ISyncStats) => {
        setStats(newStats);
      };

      const handleStatusChanged = (oldStatus: SyncStatus, newStatus: SyncStatus) => {
        setStatus(newStatus);
      };

      syncService.on('syncCompleted', handleSyncCompleted);
      syncService.on('syncFailed', handleSyncFailed);
      syncService.on('statusChanged', handleStatusChanged);

      // Update status every 3 seconds for actual operations counter
      // (slightly less frequently to avoid excessive load on IndexedDB)
      const interval = setInterval(updateStatus, 3000);

      return () => {
        clearInterval(interval);
        syncService.off('syncCompleted', handleSyncCompleted);
        syncService.off('syncFailed', handleSyncFailed);
        syncService.off('statusChanged', handleStatusChanged);
      };
    } catch (error) {
      console.error('Failed to initialize AutoSaveStatus:', error);
      setIsInitialized(false);
    }
  }, [projectId, wsEnabled, realtimeEnabled, webSocketContext?.isConnected]);

  if (!isInitialized || !stats) {
    return null;
  }

  const getStatusText = () => {
    // Show transport type prefix
    const transportEmoji = transport === 'websocket' ? '🚀' : '📡';
    const transportText = transport === 'websocket' ? 'WS' : 'REST';

    // Show actual number of operations in queue
    if (actualPendingCount > 0) {
      const operationsWord = getOperationWord(actualPendingCount);
      return `${transportEmoji} ${actualPendingCount} ${operationsWord} ${t('autoSaveStatus.in_queue')}`;
    }

    // Show sync status
    if (status === 'syncing') {
      return `${transportEmoji} ${t('autoSaveStatus.syncing')}`;
    }

    if (status === 'error' && stats.lastError) {
      return `${transportEmoji} ${t('autoSaveStatus.error_prefix')} ${stats.lastError}`;
    }

    if (stats.lastSyncTime) {
      const timeSinceSync = Date.now() - stats.lastSyncTime;
      const secondsAgo = Math.floor(timeSinceSync / 1000);

      if (secondsAgo < 10) {
        return `${transportEmoji} ${t('autoSaveStatus.synchronized')}`;
      } else if (secondsAgo < 60) {
        return `${transportEmoji} ${t('autoSaveStatus.synchronized_seconds_ago', {seconds: secondsAgo})}`;
      } else if (secondsAgo < 3600) {
        const minutesAgo = Math.floor(secondsAgo / 60);
        return `${transportEmoji} ${t('autoSaveStatus.synchronized_minutes_ago', {minutes: minutesAgo})}`;
      } else {
        const hoursAgo = Math.floor(secondsAgo / 3600);
        return `${transportEmoji} ${t('autoSaveStatus.synchronized_hours_ago', {hours: hoursAgo})}`;
      }
    }

    return `${transportEmoji} ${t('autoSaveStatus.waiting_for_data')}`;
  };

  const getStatusColor = () => {
    // Operations in queue
    if (actualPendingCount > 0) {
      return '#f59e0b'; // amber - operations to sync
    }

    // Active sync
    if (status === 'syncing') {
      return '#3b82f6'; // blue - sync in progress
    }

    // Sync error
    if (status === 'error') {
      return '#ef4444'; // red - error
    }

    // Recently synchronized
    if (stats.lastSyncTime) {
      const timeSinceSync = Date.now() - stats.lastSyncTime;
      if (timeSinceSync < 30000) {
        // 30 seconds
        return '#10b981'; // green - recently synchronized
      } else if (timeSinceSync < 300000) {
        // 5 minutes
        return '#3b82f6'; // blue - synchronized recently
      }
    }

    return '#6b7280'; // gray - not synchronized for a long time
  };

  const shouldPulse = () => {
    return actualPendingCount > 0 || status === 'syncing';
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: getStatusColor(),
        fontWeight: 500
      }}
      title={`🔗 Transport: ${transport.toUpperCase()}\n${t('autoSaveStatus.tooltip_in_queue')} ${actualPendingCount} ${t('autoSaveStatus.tooltip_operations')}\n${t('autoSaveStatus.tooltip_statistics')} ${stats.successfulSyncs} ${t('autoSaveStatus.tooltip_successful')}, ${stats.failedSyncs} ${t('autoSaveStatus.tooltip_failed')}\n${t('autoSaveStatus.tooltip_total_processed')} ${stats.totalOperationsProcessed} ${t('autoSaveStatus.tooltip_operations')}\n${t('autoSaveStatus.tooltip_fps')} ${fps}\n\n${transport === 'websocket' ? '🚀 Real-time sync enabled!' : '📡 Using HTTP polling'}`}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          animation: shouldPulse() ? 'pulse 1s infinite' : 'none'
        }}
      />
      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
        <span>{getStatusText()}</span>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          {fps > 0 && <span style={{color: '#6b7280', fontSize: '11px'}}>{fps} FPS</span>}
          <span
            style={{
              color: transport === 'websocket' ? '#10b981' : '#6b7280',
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: transport === 'websocket' ? '#10b98110' : '#6b728010'
            }}
            title={transport === 'websocket' ? 'Real-time WebSocket sync' : 'HTTP polling sync'}
          >
            {transport === 'websocket' ? 'WS' : 'REST'}
          </span>
        </div>
      </div>
    </div>
  );
};
