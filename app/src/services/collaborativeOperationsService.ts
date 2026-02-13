import {NodeChange} from '@xyflow/react';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {useTimelinesStore} from '../store/useTimelinesStore';
import {refreshSpecificLayers} from '../utils/syncGraphToCanvas';
import {Operation} from './interfaces/syncInterfaces';
import {ProjectDataService} from './projectDataService';

/**
 * Централизованный сервис для обработки коллаборативных операций
 * от других пользователей через WebSocket
 */
export class CollaborativeOperationsService {
  private processedOperations = new Set<string>();

  /**
   * Основной метод для обработки операции от другого пользователя
   */
  public applyOperation(operation: Operation): void {
    // 🛡️ Защита от дублирования операций
    const operationId = operation.id?.toString() || 'unknown';
    if (this.processedOperations.has(operationId)) {
      console.log('⚠️ [CollaborativeOps] Operation already processed, skipping:', operationId);
      return;
    }

    // Проверяем что у операции есть layerId
    if (!operation.layerId) {
      console.warn('⚠️ [CollaborativeOps] Operation missing layerId, skipping:', operation);
      return;
    }

    // 🎯 КРИТИЧЕСКАЯ ПРОВЕРКА: Операции таймлайнов применяем всегда, остальные - только для активного таймлайна
    const graphStore = useGraphStore.getState();
    const isTimelineOperation = operation.type.startsWith('timeline.');
    const isCurrentTimeline = operation.timelineId === graphStore.currentTimelineId;

    if (!isTimelineOperation && !isCurrentTimeline) {
      console.log(`⏭️ [CollaborativeOps] Operation for different timeline (${operation.timelineId}), current: ${graphStore.currentTimelineId}. Skipping - will be loaded on timeline switch.`, {
        operationType: operation.type,
        operationTimelineId: operation.timelineId,
        currentTimelineId: graphStore.currentTimelineId,
        operationId: operationId
      });
      // Отмечаем как обработанную чтобы не дублировать при следующих получениях
      this.processedOperations.add(operationId);
      return;
    }

    console.log(`🔄 [CollaborativeOps] Processing operation: ${operation.type}`, {
      operationId: operationId,
      layerId: operation.layerId,
      timelineId: operation.timelineId,
      currentTimelineId: graphStore.currentTimelineId,
      isTimelineOp: isTimelineOperation,
      willApply: isTimelineOperation || isCurrentTimeline
    });

    // 🎯 Роутинг операций по типу
    try {
      switch (operation.type) {
        case 'nodes.moved':
          this.handleNodesMoved(operation);
          break;

        case 'node.updated':
          this.handleNodeUpdated(operation);
          break;

        case 'nodes.created':
          this.handleNodesCreated(operation);
          break;

        case 'nodes.deleted':
          this.handleNodesDeleted(operation);
          break;

        case 'timeline.created':
          this.handleTimelineCreated(operation);
          break;

        case 'timeline.deleted':
          this.handleTimelineDeleted(operation);
          break;

        case 'edge.added':
          this.handleEdgeAdded(operation);
          break;

        case 'edges.created':
          this.handleEdgesCreated(operation);
          break;

        case 'edges.deleted':
          this.handleEdgesDeleted(operation);
          break;

        default:
          console.log(`ℹ️ [CollaborativeOps] Unknown operation type: ${operation.type}, falling back to full reload`);
          this.handleUnknownOperation(operation);
          break;
      }

      // Отмечаем операцию как обработанную
      this.processedOperations.add(operationId);
    } catch (error) {
      console.error(`❌ [CollaborativeOps] Error processing operation ${operation.type}:`, error);

      // В случае ошибки - полная перезагрузка слоя
      this.handleUnknownOperation(operation);
    }
  }

  /**
   * 🚚 Обработка перемещения узлов
   */
  private handleNodesMoved(operation: Operation): void {
    const graphStore = useGraphStore.getState();
    const canvasStore = useCanvasStore.getState();
    const payload = operation.payload as {changes?: any[]};

    // Проверяем что операция для текущего слоя
    if (operation.layerId !== graphStore.currentGraphId) {
      console.log('ℹ️ [CollaborativeOps] nodes.moved for different layer, loading from server');
      this.reloadLayerFromServer(operation.layerId!);
      return;
    }

    if (!payload?.changes || !Array.isArray(payload.changes)) {
      console.warn('⚠️ [CollaborativeOps] Invalid nodes.moved payload');
      return;
    }

    console.log('🚚 [CollaborativeOps] Applying nodes.moved:', payload.changes);

    // Преобразуем формат от MoveNodesCommand в ReactFlow NodeChange[]
    const reactFlowChanges: NodeChange[] = payload.changes.map((change: any) => ({
      id: change.nodeId,
      type: 'position' as const,
      position: change.newPosition
    }));

    // Обновляем GraphStore (данные)
    graphStore.updateNodePositions(operation.layerId!, reactFlowChanges);

    // Синхронизируем CanvasStore (UI)
    refreshSpecificLayers([operation.layerId!], false);

    console.log('✅ [CollaborativeOps] nodes.moved applied successfully');
  }

  /**
   * ✏️ Обработка обновления текста узла
   */
  private handleNodeUpdated(operation: Operation): void {
    const graphStore = useGraphStore.getState();
    const payload = operation.payload as {nodeId?: string; newData?: any; oldData?: any; nodeType?: string};

    // Проверяем что операция для текущего слоя
    if (operation.layerId !== graphStore.currentGraphId) {
      console.log('ℹ️ [CollaborativeOps] node.updated for different layer, loading from server');
      this.reloadLayerFromServer(operation.layerId!);
      return;
    }

    if (!payload?.nodeId || !payload?.newData) {
      console.warn('⚠️ [CollaborativeOps] Invalid node.updated payload');
      return;
    }

    console.log('✏️ [CollaborativeOps] Applying node.updated:', {
      nodeId: payload.nodeId,
      nodeType: payload.nodeType,
      newData: payload.newData
    });

    try {
      // Обновляем данные узла в GraphStore
      graphStore.updateNodeData(payload.nodeId, payload.newData);

      // Синхронизируем с CanvasStore
      refreshSpecificLayers([operation.layerId!], false);

      console.log('✅ [CollaborativeOps] node.updated applied successfully');
    } catch (error) {
      console.error('❌ [CollaborativeOps] Error applying node.updated:', error);
      this.reloadLayerFromServer(operation.layerId!);
    }
  }

  /**
   * 🔗 Обработка добавления связи
   */
  private handleEdgeAdded(operation: Operation): void {
    const graphStore = useGraphStore.getState();
    const payload = operation.payload as {edge?: any; edgeId?: string};

    // Проверяем что операция для текущего слоя
    if (operation.layerId !== graphStore.currentGraphId) {
      console.log('ℹ️ [CollaborativeOps] edge.added for different layer, loading from server');
      this.reloadLayerFromServer(operation.layerId!);
      return;
    }

    if (!payload?.edge) {
      console.warn('⚠️ [CollaborativeOps] Invalid edge.added payload');
      return;
    }

    console.log('🔗 [CollaborativeOps] Applying edge.added:', {
      edgeId: payload.edge.id,
      from: payload.edge.startNodeId,
      to: payload.edge.endNodeId
    });

    try {
      // Добавляем связь в GraphStore
      graphStore.addEdge(payload.edge);

      // Синхронизируем с CanvasStore
      refreshSpecificLayers([operation.layerId!], false);

      console.log('✅ [CollaborativeOps] edge.added applied successfully');
    } catch (error) {
      console.error('❌ [CollaborativeOps] Error applying edge.added:', error);
      this.reloadLayerFromServer(operation.layerId!);
    }
  }

  /**
   * 🆕 Обработка создания узлов
   */
  private handleNodesCreated(operation: Operation): void {
    console.log('🆕 [CollaborativeOps] Handling nodes.created');
    // TODO: Реализовать логику создания узлов
    this.reloadLayerFromServer(operation.layerId!);
  }

  /**
   * 🗑️ Обработка удаления узлов
   */
  private handleNodesDeleted(operation: Operation): void {
    console.log('🗑️ [CollaborativeOps] Handling nodes.deleted');
    // TODO: Реализовать логику удаления узлов
    this.reloadLayerFromServer(operation.layerId!);
  }

  /**
   * 🔗 Обработка создания связей (устаревший формат)
   */
  private handleEdgesCreated(operation: Operation): void {
    console.log('🔗 [CollaborativeOps] Handling edges.created (legacy format)');
    // Этот формат больше не используется, основной обработчик - handleEdgeAdded
    console.log('⚠️ [CollaborativeOps] edges.created is deprecated, falling back to server reload');
    this.reloadLayerFromServer(operation.layerId!);
  }

  /**
   * ✂️ Обработка удаления связей
   */
  private handleEdgesDeleted(operation: Operation): void {
    console.log('✂️ [CollaborativeOps] Handling edges.deleted');
    // TODO: Реализовать логику удаления связей
    this.reloadLayerFromServer(operation.layerId!);
  }

  /**
   * 📅 Обработка создания таймлайна
   */
  private handleTimelineCreated(operation: Operation): void {
    const timelinesStore = useTimelinesStore.getState();
    const payload = operation.payload as {timelineId?: string; timeline?: any};

    if (!payload?.timelineId || !payload?.timeline) {
      console.warn('⚠️ [CollaborativeOps] Invalid timeline.created payload');
      return;
    }

    console.log('📅 [CollaborativeOps] Applying timeline.created:', {
      timelineId: payload.timelineId,
      timelineName: payload.timeline.name
    });

    try {
      // Проверяем, существует ли уже таймлайн локально
      const existingTimeline = timelinesStore.timelines.find((t) => t.id === payload.timelineId);

      if (!existingTimeline) {
        // Добавляем новый таймлайн в локальное состояние
        const newTimeline = {
          id: payload.timeline.id,
          name: payload.timeline.name,
          createdAt: payload.timeline.createdAt,
          isActive: payload.timeline.isActive || false
        };

        // Обновляем store напрямую без API вызова (операция от другого пользователя)
        useTimelinesStore.setState((state) => ({
          timelines: [...state.timelines, newTimeline]
        }));

        console.log('✅ [CollaborativeOps] timeline.created applied successfully');
      } else {
        console.log('ℹ️ [CollaborativeOps] Timeline already exists, skipping creation');
      }
    } catch (error) {
      console.error('❌ [CollaborativeOps] Error applying timeline.created:', error);
      // В случае ошибки можно перезагрузить список таймлайнов
      const autoSaveStatus = ProjectDataService.getStatus();
      if (autoSaveStatus.currentProjectId) {
        timelinesStore.loadProjectTimelines(autoSaveStatus.currentProjectId);
      }
    }
  }

  /**
   * 🗑️ Обработка удаления таймлайна
   */
  private handleTimelineDeleted(operation: Operation): void {
    const timelinesStore = useTimelinesStore.getState();
    const payload = operation.payload as {
      timeline?: any;
      switchedToTimelineId?: string;
    };

    if (!payload?.timeline?.id) {
      console.warn('⚠️ [CollaborativeOps] Invalid timeline.deleted payload');
      return;
    }

    const deletedTimelineId = payload.timeline.id;

    console.log('🗑️ [CollaborativeOps] Applying timeline.deleted:', {
      timelineId: deletedTimelineId,
      timelineName: payload.timeline.name,
      switchedTo: payload.switchedToTimelineId
    });

    try {
      // Проверяем, существует ли таймлайн локально
      const existingTimeline = timelinesStore.timelines.find((t) => t.id === deletedTimelineId);

      if (existingTimeline) {
        const currentTimelineId = timelinesStore.currentTimelineId;

        // Удаляем таймлайн из локального состояния
        const remainingTimelines = timelinesStore.timelines.filter((t) => t.id !== deletedTimelineId);

        // Если удаляемый таймлайн активный, переключаемся на другой
        let newCurrentTimelineId = currentTimelineId;
        if (currentTimelineId === deletedTimelineId) {
          newCurrentTimelineId = payload.switchedToTimelineId || remainingTimelines[0]?.id || '';
        }

        // Обновляем store напрямую без API вызова
        useTimelinesStore.setState({
          timelines: remainingTimelines,
          currentTimelineId: newCurrentTimelineId
        });

        // Если изменился активный таймлайн, синхронизируемся с GraphStore
        if (newCurrentTimelineId !== currentTimelineId) {
          console.log('🔄 [CollaborativeOps] Switching timeline due to deletion:', newCurrentTimelineId);
          setTimeout(() => {
            timelinesStore.syncWithGraphStore();
          }, 0);
        }

        console.log('✅ [CollaborativeOps] timeline.deleted applied successfully');
      } else {
        console.log('ℹ️ [CollaborativeOps] Timeline not found locally, skipping deletion');
      }
    } catch (error) {
      console.error('❌ [CollaborativeOps] Error applying timeline.deleted:', error);
      // В случае ошибки можно перезагрузить список таймлайнов
      const autoSaveStatus = ProjectDataService.getStatus();
      if (autoSaveStatus.currentProjectId) {
        timelinesStore.loadProjectTimelines(autoSaveStatus.currentProjectId);
      }
    }
  }

  /**
   * ❓ Обработка неизвестных операций - полная перезагрузка
   */
  private handleUnknownOperation(operation: Operation): void {
    console.log('❓ [CollaborativeOps] Handling unknown operation, reloading from server');
    this.reloadLayerFromServer(operation.layerId!);
  }

  /**
   * 🔄 Перезагрузка слоя с сервера
   */
  private reloadLayerFromServer(layerId: string): void {
    const graphStore = useGraphStore.getState();

    // Если операция для текущего слоя - перезагружаем весь проект
    if (layerId === graphStore.currentGraphId) {
      // Используем debouncing для избежания множественных загрузок
      if (this.serverReloadTimeout) {
        clearTimeout(this.serverReloadTimeout);
      }

      this.serverReloadTimeout = window.setTimeout(() => {
        // Получаем правильный projectId из ProjectDataService
        const autoSaveStatus = ProjectDataService.getStatus();
        const projectId = autoSaveStatus.currentProjectId;

        if (projectId) {
          graphStore
            .loadFromServer(projectId)
            .then(() => {
              console.log('✅ [CollaborativeOps] Successfully reloaded from server');
            })
            .catch((error) => {
              console.error('❌ [CollaborativeOps] Failed to reload from server:', error);
            });
        } else {
          console.warn('⚠️ [CollaborativeOps] No projectId available for server reload');
        }

        this.serverReloadTimeout = null;
      }, 500);
    }
  }

  // Таймер для debounced загрузки от сервера
  private serverReloadTimeout: number | null = null;

  /**
   * 🔄 Очистка кэша при переключении таймлайна
   */
  public clearProcessedOperations(): void {
    const count = this.processedOperations.size;
    this.processedOperations.clear();
    console.log(`🧹 [CollaborativeOps] Cleared ${count} processed operations from cache`);
  }

  /**
   * 🧹 Очистка сервиса
   */
  public cleanup(): void {
    this.processedOperations.clear();
    if (this.serverReloadTimeout) {
      clearTimeout(this.serverReloadTimeout);
      this.serverReloadTimeout = null;
    }
  }

  /**
   * 📊 Получение статистики
   */
  public getStats() {
    return {
      processedOperationsCount: this.processedOperations.size,
      hasServerReloadPending: !!this.serverReloadTimeout
    };
  }
}

// Синглтон инстанс
let collaborativeOpsServiceInstance: CollaborativeOperationsService | null = null;

/**
 * Получить инстанс сервиса коллаборативных операций
 */
export function getCollaborativeOperationsService(): CollaborativeOperationsService {
  if (!collaborativeOpsServiceInstance) {
    collaborativeOpsServiceInstance = new CollaborativeOperationsService();

    // Делаем сервис доступным глобально для очистки кэша при переключении таймлайнов
    if (typeof window !== 'undefined') {
      (window as any).flowCollaborativeOpsService = collaborativeOpsServiceInstance;
    }
  }
  return collaborativeOpsServiceInstance;
}

/**
 * Очистка сервиса (для HMR и тестов)
 */
export function clearCollaborativeOperationsService(): void {
  if (collaborativeOpsServiceInstance) {
    collaborativeOpsServiceInstance.cleanup();
    collaborativeOpsServiceInstance = null;
  }
}
