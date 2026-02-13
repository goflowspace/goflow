import {EdgeData} from '@types-folder/nodes';
import {Edge, EdgeChange} from '@xyflow/react';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {Command, CommandMetadata} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

/**
 * Команда для удаления связи (ребра) между узлами
 */
export class DeleteEdgeCommand implements Command {
  private edgeId: string;
  private edge: Edge | null = null;
  private edgeData: EdgeData | null = null;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private originalLayerId: string;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param edgeId Идентификатор ребра для удаления
   * @param projectId ID проекта
   */
  constructor(edgeId: string, projectId?: string) {
    this.edgeId = edgeId;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.originalLayerId = this.graphStore.currentGraphId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем состояние ребра до удаления для возможности отмены
    const currentLayer = this.graphStore.layers[this.originalLayerId];

    // Сохраняем объект ребра из GraphStore
    if (currentLayer && currentLayer.edges[edgeId]) {
      this.edgeData = {...currentLayer.edges[edgeId]};
    }

    // Также сохраняем объект ребра из CanvasStore для более полного восстановления
    this.edge = this.canvasStore.edges.find((e) => e.id === edgeId) || null;
  }

  /**
   * Данные для сохранения в истории и localStorage
   */
  getMetadata(): CommandMetadata {
    // Получаем актуальную информацию о связи
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Сначала попробуем получить информацию из сохраненных объектов
    let sourceId = this.edge?.source || this.edgeData?.startNodeId;
    let targetId = this.edge?.target || this.edgeData?.endNodeId;

    // Если информации нет, попробуем найти связь в текущем состоянии и получить информацию
    if (!sourceId || !targetId) {
      // Получаем текущий слой
      const currentLayer = this.graphStore.layers[this.originalLayerId];

      // Ищем ребро в GraphStore
      if (currentLayer?.edges && currentLayer.edges[this.edgeId]) {
        const edge = currentLayer.edges[this.edgeId];
        sourceId = edge.startNodeId;
        targetId = edge.endNodeId;
      }

      // Если все еще нет информации, ищем в CanvasStore
      if ((!sourceId || !targetId) && this.canvasStore.edges.length > 0) {
        const canvasEdge = this.canvasStore.edges.find((e) => e.id === this.edgeId);
        if (canvasEdge) {
          sourceId = canvasEdge.source;
          targetId = canvasEdge.target;
        }
      }
    }

    return {
      timestamp: Date.now(),
      description: 'Delete Edge',
      layerId: this.originalLayerId,
      details: {
        edgeId: this.edgeId,
        source: sourceId,
        target: targetId
      }
    };
  }

  execute(): void {
    // Обновляем хранилища для работы с актуальным состоянием
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Ищем ребро по ID, а если не найдено - обновляем информацию
    const currentLayer = this.graphStore.layers[this.originalLayerId];
    const edgeInGraphById = currentLayer?.edges?.[this.edgeId];

    // Сохраняем данные о ребре для возможности восстановления в undo
    if (edgeInGraphById) {
      this.edgeData = {...edgeInGraphById};
    }

    // Ищем ребро в Canvas Store для более полного восстановления
    const edgeInCanvas = this.canvasStore.edges.find((e) => e.id === this.edgeId);
    if (edgeInCanvas) {
      this.edge = edgeInCanvas;
    }

    // Если у нас уже есть EdgeData или Edge, находим связанный объект в другом хранилище
    if (this.edgeData && !this.edge) {
      const edgeMatch = this.canvasStore.edges.find((e) => e.source === this.edgeData?.startNodeId && e.target === this.edgeData?.endNodeId);
      if (edgeMatch) {
        this.edge = edgeMatch;
      }
    }

    if (this.edge && !this.edgeData && currentLayer) {
      const edgeInGraph = Object.values(currentLayer.edges).find((e) => e.startNodeId === this.edge?.source && e.endNodeId === this.edge?.target);
      if (edgeInGraph) {
        this.edgeData = {...edgeInGraph};
      }
    }

    // Удаляем ребро из GraphStore
    const edgeChanges: EdgeChange[] = [
      {
        id: this.edgeId,
        type: 'remove' as const
      }
    ];
    this.graphStore.onEdgesChange(edgeChanges);

    // Удаляем ребро из CanvasStore
    const filteredEdges = this.canvasStore.edges.filter((e) => e.id !== this.edgeId);
    this.canvasStore.setEdges(filteredEdges);

    // Генерируем и сохраняем операцию в фоне
    if (this.edgeData && this.projectId) {
      generateAndSaveOperation(
        'edge.deleted',
        {
          edgeId: this.edgeId,
          startNodeId: this.edgeData.startNodeId,
          endNodeId: this.edgeData.endNodeId
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  undo(): void {
    // Обновляем хранилища для работы с актуальным состоянием
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Восстанавливаем ребро в GraphStore, если у нас есть сохраненные данные
    if (this.edgeData) {
      this.graphStore.addEdge(this.edgeData);
    }

    // Восстанавливаем ребро в CanvasStore
    if (this.edge) {
      this.canvasStore.setEdges([...this.canvasStore.edges, this.edge]);
    } else if (this.edgeData) {
      // Если нет объекта Edge, но есть данные EdgeData, создаем новый объект Edge
      const newEdge: Edge = {
        id: this.edgeId,
        source: this.edgeData.startNodeId,
        target: this.edgeData.endNodeId,
        sourceHandle: this.edgeData.sourceHandle,
        targetHandle: this.edgeData.targetHandle,
        type: 'default',
        data: {conditions: this.edgeData.conditions}
      };
      this.canvasStore.setEdges([...this.canvasStore.edges, newEdge]);
    }

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'edge.deleted.undo',
        {
          edge: this.edgeData
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  redo(): void {
    // Обновляем хранилища для работы с актуальным состоянием
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Получаем данные о связи из метаданных для более надежного поиска
    const metadata = this.getMetadata();
    const sourceId = metadata.details?.source as string | undefined;
    const targetId = metadata.details?.target as string | undefined;

    // Сначала пытаемся найти ребро по ID
    let edgeToRemove = this.edgeId;
    let edgeFound = false;

    // Проверяем существование ребра в GraphStore
    const currentLayer = this.graphStore.layers[this.originalLayerId];
    if (currentLayer?.edges?.[this.edgeId]) {
      edgeFound = true;
    } else {
      // Если не найдено по ID, ищем по source/target
      if (sourceId && targetId) {
        const matchingEdge = Object.values(currentLayer?.edges || {}).find((edge) => edge.startNodeId === sourceId && edge.endNodeId === targetId);

        if (matchingEdge) {
          edgeToRemove = matchingEdge.id;
          edgeFound = true;
        }
      }

      // Если не нашли в GraphStore, ищем в CanvasStore
      if (!edgeFound) {
        // Сначала по ID
        const canvasEdgeById = this.canvasStore.edges.find((e) => e.id === this.edgeId);
        if (canvasEdgeById) {
          edgeToRemove = canvasEdgeById.id;
          edgeFound = true;
        }
        // Затем по source/target
        else if (sourceId && targetId) {
          const canvasEdgeBySourceTarget = this.canvasStore.edges.find((e) => e.source === sourceId && e.target === targetId);

          if (canvasEdgeBySourceTarget) {
            edgeToRemove = canvasEdgeBySourceTarget.id;
            edgeFound = true;
          }
        }
      }
    }

    // Если ребро найдено, удаляем его из обоих хранилищ
    if (edgeFound) {
      // Удаляем из GraphStore
      const edgeChanges: EdgeChange[] = [
        {
          id: edgeToRemove,
          type: 'remove' as const
        }
      ];
      this.graphStore.onEdgesChange(edgeChanges);

      // Удаляем из CanvasStore
      const filteredEdges = this.canvasStore.edges.filter((e) => e.id !== edgeToRemove);
      this.canvasStore.setEdges(filteredEdges);
    } else {
      console.warn('DeleteEdgeCommand.redo: не удалось найти ребро для удаления', {
        edgeId: this.edgeId,
        source: sourceId,
        target: targetId
      });
    }
  }

  getType(): string {
    return 'DeleteEdge';
  }
}
