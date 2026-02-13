'use client';

import {useEffect} from 'react';

import {useWebSocket} from '../../contexts/WebSocketContext';
import {useCurrentProject} from '../../hooks/useCurrentProject';
import {getCollaborativeOperationsService} from '../../services/collaborativeOperationsService';
import {ProjectDataService} from '../../services/projectDataService';
import {SyncServiceFactory, SyncServiceRegistry} from '../../services/syncServiceFactory';
import {useCanvasStore} from '../../store/useCanvasStore';
import {useGraphStore} from '../../store/useGraphStore';
import {useTeamStore} from '../../store/useTeamStore';
import useUserStore from '../../store/useUserStore';
import {isOSS} from '../../utils/edition';
import {useFeatureFlag} from '../../utils/featureFlags';
import {refreshSpecificLayers} from '../../utils/syncGraphToCanvas';

export const AppInitializer = () => {
  const {projectId} = useCurrentProject();
  const {user} = useUserStore();
  const {currentTeam, initializeFromStorage, loadUserTeams, isInitialized} = useTeamStore();
  const webSocketContext = useWebSocket();
  const wsEnabled = useFeatureFlag('WS_SYNC_ENABLED');
  const realtimeEnabled = useFeatureFlag('REALTIME_COLLABORATION');

  // Стабилизируем currentTeamId для зависимостей useEffect
  const currentTeamId = currentTeam?.id;
  const userId = user?.id;

  useEffect(() => {
    let snapshotInterval: number | null = null;
    let syncServiceInitialized = false;
    const serverLoadTimeout: number | null = null; // Debouncing для загрузки от сервера

    const initializeSyncService = () => {
      try {
        // Инициализируем команды если нужно (только Cloud)
        if (userId && !isInitialized && !isOSS()) {
          console.log('🔧 Initializing team store from AppInitializer');
          initializeFromStorage();
          if (!currentTeamId) {
            loadUserTeams();
          }
        }

        // Инициализируем для авторизованных пользователей при наличии проекта
        // В OSS не требуем currentTeamId (команд нет)
        if (userId && projectId && (isOSS() || currentTeamId) && !syncServiceInitialized) {
          console.log('Initializing SyncService for project:', projectId, {
            wsEnabled,
            realtimeEnabled,
            wsConnected: webSocketContext?.isConnected,
            currentTeamId: currentTeamId,
            userId: userId
          });

          let syncService;

          // 🚀 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: используем WebSocket если доступно (только Cloud)
          if (wsEnabled && realtimeEnabled && webSocketContext && !isOSS()) {
            console.log('🚀 Creating WebSocket-enabled SyncService');
            syncService = SyncServiceRegistry.getOrCreateWithWebSocket(
              projectId,
              webSocketContext,
              {
                syncIntervalMs: 60000, // 🚀 ИСПРАВЛЕНИЕ: Редкий polling для cleanup, real-time через events
                batchSize: 1, // Маленькие батчи
                maxRetries: 3,
                retryDelayMs: 200 // Быстрые retry
              },
              user.id
            ); // 👈 Передаем правильный userId

            // Подключаемся к WebSocket комнате проекта
            if (currentTeamId) {
              webSocketContext.joinProject(projectId, currentTeamId).then((result) => {
                if (result.success) {
                  console.log('✅ Successfully joined WebSocket project room:', projectId);
                } else {
                  console.error('❌ Failed to join WebSocket project room:', result.error);
                  // При ошибке присоединения к проекту - переключаемся на REST
                  console.log('🔄 Falling back to REST mode due to join failure');
                  const restSyncService = SyncServiceRegistry.getOrCreate(projectId, {
                    syncIntervalMs: 5000,
                    batchSize: 50,
                    maxRetries: 3
                  });
                  restSyncService.start();
                }
              });
            } else {
              console.error('❌ Failed to join WebSocket project room: No current team');
              console.log('🔄 Falling back to REST mode due to missing team');
              const restSyncService = SyncServiceRegistry.getOrCreate(projectId, {
                syncIntervalMs: 5000,
                batchSize: 50,
                maxRetries: 3
              });
              restSyncService.start();
            }
          } else {
            console.log('📡 Creating REST-only SyncService (WebSocket not available)');
            syncService = SyncServiceRegistry.getOrCreate(projectId, {
              syncIntervalMs: 5000, // Старый интервал для REST
              batchSize: 50,
              maxRetries: 3
            });
          }

          // Подписываемся на события для логирования и обработки
          syncService.on('syncCompleted', (stats) => {
            console.log('Sync completed successfully:', {
              processedOperations: stats.totalOperationsProcessed,
              pendingOperations: stats.pendingOperations,
              lastSyncTime: stats.lastSyncTime ? new Date(stats.lastSyncTime).toLocaleTimeString() : 'Never'
            });
          });

          syncService.on('syncFailed', (error, stats) => {
            console.error('Sync failed:', error, {
              retryCount: stats.currentRetryCount,
              maxRetries: stats.failedSyncs
            });
          });

          syncService.on('statusChanged', (oldStatus, newStatus) => {
            console.log(`SyncService status changed: ${oldStatus} -> ${newStatus}`);
          });

          // 🚀 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Реальное применение серверных операций
          syncService.on('serverOperationsReceived', (operations, syncVersion) => {
            console.log(`🔄 [AppInitializer] Applying ${operations.length} operations from other users:`, {
              operationTypes: operations.map((op) => op.type),
              syncVersion,
              projectId
            });

            const collaborativeService = getCollaborativeOperationsService();

            // Применяем каждую операцию через централизованный сервис
            operations.forEach((operation, index) => {
              console.log(`📝 [AppInitializer] Applying operation ${index + 1}/${operations.length}:`, {
                type: operation.type,
                operationId: operation.id,
                timelineId: operation.timelineId,
                layerId: operation.layerId
              });

              // 🎯 Делегируем обработку операции централизованному сервису
              collaborativeService.applyOperation(operation);
            });
          });

          // Запускаем синхронизацию
          syncService.start();

          console.log('SyncService started successfully for project:', projectId);
          syncServiceInitialized = true;
        } else if (!user) {
          // Не логируем для неавторизованных пользователей, чтобы избежать спама
          return;
        } else if (!projectId) {
          console.log('No project ID available, waiting...');
        }
      } catch (error) {
        console.error('Failed to initialize SyncService:', error);
      }
    };

    const startPeriodicSnapshots = () => {
      // Периодическое сохранение снапшотов каждые 60 секунд только для авторизованных пользователей
      snapshotInterval = window.setInterval(() => {
        if (user && projectId) {
          console.log('Saving periodic project snapshot...');
          useGraphStore.getState().saveToDb();
        }
      }, 60000); // 60 секунд
    };

    // Инициализируем SyncService (или логируем отсутствие проекта)
    initializeSyncService();

    // Запускаем периодические снапшоты независимо от SyncService
    startPeriodicSnapshots();

    return () => {
      // Очистка при размонтировании
      console.log('Cleaning up AppInitializer...', {
        hadSyncService: syncServiceInitialized,
        hadSnapshot: !!snapshotInterval,
        currentTeamId: currentTeamId || 'none'
      });

      if (syncServiceInitialized) {
        SyncServiceRegistry.clear();
      }

      if (snapshotInterval) {
        clearInterval(snapshotInterval);
      }

      if (serverLoadTimeout) {
        clearTimeout(serverLoadTimeout);
      }
    };
  }, [userId, projectId, currentTeamId, isInitialized, wsEnabled, realtimeEnabled, webSocketContext?.isConnected]); // Реинициализация при изменении WebSocket

  useEffect(() => {
    // Сохранение снапшота при скрытии страницы
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (user && projectId) {
          console.log('Page hidden, saving snapshot...');
          useGraphStore.getState().saveToDb();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, projectId]);

  return null;
};
