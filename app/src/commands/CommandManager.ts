import type {AppRouterInstance} from 'next/dist/shared/lib/app-router-context.shared-runtime';

import {Connection, NodeChange} from '@xyflow/react';
import i18n from 'i18next';
import {nanoid} from 'nanoid';

import {getNotificationManager} from '../components/Notifications';
import {trackObjectCreation} from '../services/analytics';
import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {ChoiceNode, ConditionGroup, Layer, LayerNode, Link, NarrativeNode, NoteNode, SkeletonNode} from '../types/nodes';
import {Variable, VariableOperation} from '../types/variables';
import {getCurrentCursorPosition} from '../utils/cursorTracking';
import {getCurrentTimelineId} from '../utils/getCurrentTimelineId';
import {collectChildLayerIds, copyNodesWithFullLayerSupport} from '../utils/layerOperationUtils';
import {NodeType, calculateDuplicatePositions, calculateGroupPastePositions} from '../utils/positioningLogic';
import {refreshSpecificLayers} from '../utils/syncGraphToCanvas';
import {ConnectChoiceNodeCommand, CreateChoiceNodeCommand, DeleteChoiceNodeCommand, EditChoiceNodeTextCommand, MoveChoiceNodeCommand} from './ChoiceNodeCommands';
import {Command, CommandHistory, getCommandHistory} from './CommandInterface';
import {ConnectCommand} from './ConnectCommands';
import {DeleteEdgeCommand} from './DeleteEdgeCommand';
import {UpdateEdgeConditionsCommand} from './EdgeCommands';
import {CreateLayerCommand, DeleteLayerCommand, EditLayerCommand, MoveLayerCommand} from './LayerCommands';
import {CreateNarrativeNodeCommand, DeleteNarrativeNodeCommand, EditNarrativeNodeCommand, MoveNarrativeNodeCommand} from './NarrativeNodeCommands';
import {ChangeNoteColorCommand, CreateNoteCommand, DeleteNoteCommand, EditNoteCommand, MoveNoteCommand} from './NoteCommands';
import {CreateOperationCommand, DeleteOperationCommand, ToggleAllOperationsCommand, ToggleOperationCommand, UpdateOperationCommand} from './OperationCommands';
import {CreateVariableCommand, DeleteVariableCommand, UpdateVariableCommand} from './VariableCommands';
import {generateAndSaveOperation} from './operationUtils';

/**
 * Универсальная команда для удаления узла любого типа
 */
class DeleteGenericNodeCommand implements Command {
  private nodeId: string;
  private node: any;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private connectedLinks: any[] = []; // Добавим для сохранения связей с условиями

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.graphStore = useGraphStore.getState();

    // Сохраняем состояние узла до удаления для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    if (currentGraph && currentGraph.nodes[nodeId]) {
      this.node = {...currentGraph.nodes[nodeId]};

      // Сохраняем связи, включая условия
      Object.values(currentGraph.edges).forEach((edge) => {
        if (edge.startNodeId === nodeId || edge.endNodeId === nodeId) {
          // Создаем глубокую копию ребра с условиями
          this.connectedLinks.push({...edge, conditions: JSON.parse(JSON.stringify(edge.conditions))});
        }
      });
    }
  }

  execute(): void {
    if (this.node) {
      this.graphStore.removeNode(this.nodeId);
    }
  }

  undo(): void {
    if (this.node) {
      // Восстанавливаем узел
      this.graphStore.addNode(this.node);

      // Восстанавливаем связи
      this.connectedLinks.forEach((link) => {
        this.graphStore.addEdge(link);
      });
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Класс команды для дублирования узлов (групповая операция)
 */
class DuplicateNodesCommand implements Command {
  private originalNodeIds: string[] = [];
  private newNodes: (ChoiceNode | NarrativeNode | NoteNode | LayerNode)[] = [];
  private newEdges: Link[] = [];
  private idMap: Map<string, string> = new Map();
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private newLayerData: Map<string, {nodes: any; edges: any; nodeIds: string[]; depth: number}> = new Map();
  // Структура для отслеживания иерархии слоев (родитель -> дочерние слои)
  private layerHierarchy: Map<string, string[]> = new Map();
  private projectId: string;
  private timelineId: string;
  private currentGraphId: string;

  constructor(nodeIds: string[], projectId: string, timelineId: string) {
    this.originalNodeIds = [...nodeIds];
    this.projectId = projectId;
    this.timelineId = timelineId;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.currentGraphId = this.graphStore.currentGraphId;

    // Проверяем, есть ли скопированные связи, которые нужно использовать для дублирования
    const copiedEdges = this.graphStore.copiedEdges;
    const hasCopiedEdges = Array.isArray(copiedEdges) && copiedEdges.length > 0;

    // Подготавливаем данные для дублирования
    this.prepareNodesForDuplication(hasCopiedEdges);
  }

  /**
   * Возвращает метаданные для отображения в истории
   */
  getMetadata(): {timestamp: number; description: string; nodesCount: number} {
    return {
      timestamp: Date.now(),
      description: 'DuplicateNodes',
      nodesCount: this.newNodes.length
    };
  }

  /**
   * Возвращает тип команды для истории
   */
  getType(): string {
    return 'DuplicateNodes';
  }

  /**
   * Возвращает ID слоя, в котором выполнена команда
   */
  getLayerId(): string {
    return this.graphStore.currentGraphId;
  }

  /**
   * Подготавливает узлы и связи для дублирования
   * @param useBufferEdges Использовать ли связи из буфера обмена
   */
  private prepareNodesForDuplication(useBufferEdges: boolean = false): void {
    const {currentGraphId, layers, copiedEdges} = this.graphStore;
    const graph = layers[currentGraphId];

    if (!graph) {
      return;
    }

    // Собираем оригинальные узлы для дублирования
    const originalNodes: NodeType[] = [];
    for (const nodeId of this.originalNodeIds) {
      const originalNode = graph.nodes[nodeId];
      if (originalNode) {
        originalNodes.push(originalNode);
      }
    }

    if (originalNodes.length === 0) {
      return;
    }

    // Рассчитываем новые позиции с использованием новой логики
    const existingNodes = Object.values(graph.nodes);
    const nodesWithNewPositions = calculateDuplicatePositions(originalNodes, existingNodes);

    // Создаем новые узлы с обновленными позициями и ID
    for (let i = 0; i < originalNodes.length; i++) {
      const originalNode = originalNodes[i];
      const nodeWithNewPosition = nodesWithNewPositions[i];

      // Генерируем новый ID для узла
      const newId = nanoid();
      this.idMap.set(originalNode.id, newId);

      // Специальная обработка для слоев
      if (originalNode.type === 'layer') {
        const layerNode = originalNode as LayerNode;
        // Проверяем, что имя слоя еще не заканчивается на "copy"
        let newName = layerNode.name;
        if (!newName.endsWith(' copy')) {
          newName = `${newName} copy`;
        }

        const newLayerNode = {
          ...JSON.parse(JSON.stringify(layerNode)),
          id: newId,
          name: newName,
          coordinates: nodeWithNewPosition.coordinates
        };

        // Сохраняем связь родительский-дочерний слой
        if (newLayerNode.parentLayerId) {
          if (!this.layerHierarchy.has(newLayerNode.parentLayerId)) {
            this.layerHierarchy.set(newLayerNode.parentLayerId, []);
          }
          this.layerHierarchy.get(newLayerNode.parentLayerId)!.push(newId);
        }

        // Сохраняем содержимое слоя
        this.copyLayerContentForDuplication(layerNode.id, newId);

        this.newNodes.push(newLayerNode);
      } else {
        // Для обычных узлов создаем копию с новой позицией
        const newNode = {
          ...JSON.parse(JSON.stringify(originalNode)),
          id: newId,
          coordinates: nodeWithNewPosition.coordinates
        } as ChoiceNode | NarrativeNode | NoteNode;

        this.newNodes.push(newNode);
      }
    }

    // Обновляем все внутренние ссылки в слоях
    this.updateLayerInternalReferences();

    // Создаем копии внутренних связей между дублируемыми узлами
    if (this.originalNodeIds.length > 1) {
      // Используем связи из буфера обмена или находим связи в текущем слое
      if (useBufferEdges && copiedEdges && copiedEdges.length > 0) {
        this.newEdges = [];
        copiedEdges.forEach((edge) => {
          const originalStartNodeId = edge.startNodeId;
          const originalEndNodeId = edge.endNodeId;

          const newStartNodeId = this.idMap.get(originalStartNodeId);
          const newEndNodeId = this.idMap.get(originalEndNodeId);

          if (newStartNodeId && newEndNodeId) {
            const newEdge: Link = {
              ...edge,
              id: nanoid(),
              startNodeId: newStartNodeId,
              endNodeId: newEndNodeId,
              conditions: JSON.parse(JSON.stringify(edge.conditions))
            };
            this.newEdges.push(newEdge);
          }
        });
      } else {
        // Стандартное поведение - находим связи между узлами в текущем слое
        const originalNodeIdSet = new Set(this.originalNodeIds);
        Object.values(graph.edges).forEach((edge) => {
          if (originalNodeIdSet.has(edge.startNodeId) && originalNodeIdSet.has(edge.endNodeId)) {
            if (this.idMap.has(edge.startNodeId) && this.idMap.has(edge.endNodeId)) {
              const newStartNodeId = this.idMap.get(edge.startNodeId)!;
              const newEndNodeId = this.idMap.get(edge.endNodeId)!;

              const newEdge: Link = {
                ...edge,
                id: nanoid(),
                startNodeId: newStartNodeId,
                endNodeId: newEndNodeId,
                conditions: JSON.parse(JSON.stringify(edge.conditions))
              };
              this.newEdges.push(newEdge);
            }
          }
        });
      }
    }
  }

  /**
   * Копирует содержимое слоя и его вложенных слоев для дублирования
   */
  private copyLayerContentForDuplication(originalLayerId: string, newLayerId: string): void {
    const originalLayer = this.graphStore.layers[originalLayerId];
    if (!originalLayer) return;

    // Глубоко копируем содержимое слоя
    const nodesCopy = JSON.parse(JSON.stringify(originalLayer.nodes));
    const edgesCopy = JSON.parse(JSON.stringify(originalLayer.edges));
    const nodeIdsCopy = [...originalLayer.nodeIds];

    // Сохраняем данные слоя
    this.newLayerData.set(newLayerId, {
      nodes: nodesCopy,
      edges: edgesCopy,
      nodeIds: nodeIdsCopy,
      depth: originalLayer.depth // Сохраняем оригинальную глубину
    });

    // Рекурсивно копируем вложенные слои
    for (const nodeId in originalLayer.nodes) {
      const node = originalLayer.nodes[nodeId];
      if (node.type === 'layer') {
        const nestedLayerId = node.id;
        const newNestedLayerId = nanoid();

        // Добавляем "copy" к имени вложенного слоя, но проверяем, что оно еще не заканчивается на "copy"
        if (nodesCopy[nodeId] && nodesCopy[nodeId].name) {
          const currentName = nodesCopy[nodeId].name;
          if (!currentName.endsWith(' copy')) {
            nodesCopy[nodeId].name = `${currentName} copy`;
          }
        }

        // Запоминаем соответствие ID
        this.idMap.set(nestedLayerId, newNestedLayerId);

        // Сохраняем связь родитель-потомок
        if (!this.layerHierarchy.has(newLayerId)) {
          this.layerHierarchy.set(newLayerId, []);
        }
        this.layerHierarchy.get(newLayerId)!.push(newNestedLayerId);

        // Рекурсивно копируем вложенный слой
        this.copyLayerContentForDuplication(nestedLayerId, newNestedLayerId);
      }
    }
  }

  /**
   * Обновляет внутренние ссылки во всех скопированных слоях
   */
  private updateLayerInternalReferences(): void {
    // Обходим все скопированные слои
    for (const [newLayerId, layerData] of this.newLayerData.entries()) {
      const nodes = layerData.nodes;
      const edges = layerData.edges;
      const nodeIds = layerData.nodeIds;

      // Создаем новый объект для обновленных узлов
      const updatedNodes: Record<string, any> = {};

      // Обновляем ID узлов в слое
      for (const oldNodeId in nodes) {
        const node = nodes[oldNodeId];

        // Если для этого узла есть новый ID, используем его
        const newNodeId = this.idMap.has(oldNodeId) ? this.idMap.get(oldNodeId)! : oldNodeId;

        // Создаем копию узла с обновленным ID
        const updatedNode = {...node, id: newNodeId};

        // Если это слой, обновляем parentLayerId
        if (updatedNode.type === 'layer') {
          // Сохраняем существующий parentLayerId, если он есть в карте маппинга ID,
          // иначе используем ID текущего слоя (newLayerId)
          if (updatedNode.parentLayerId && this.idMap.has(updatedNode.parentLayerId)) {
            // Если родитель есть в карте маппинга, обновляем ID
            updatedNode.parentLayerId = this.idMap.get(updatedNode.parentLayerId)!;
          } else if (oldNodeId !== node.id) {
            // Если это вложенный слой для текущего слоя, устанавливаем родителя
            updatedNode.parentLayerId = newLayerId;
          } else {
            // Для основных слоев (не вложенных), устанавливаем текущий граф как родителя
            updatedNode.parentLayerId = this.currentGraphId;
          }

          // Также обновляем startingNodes и endingNodes в слое
          if (updatedNode.startingNodes) {
            updatedNode.startingNodes = updatedNode.startingNodes.map((startNode: any) => {
              const startNodeId = startNode.id;
              // Если для этого стартового узла есть новый ID, используем его
              if (this.idMap.has(startNodeId)) {
                return {
                  ...startNode,
                  id: this.idMap.get(startNodeId)
                };
              }
              return startNode;
            });
          }

          if (updatedNode.endingNodes) {
            updatedNode.endingNodes = updatedNode.endingNodes.map((endNode: any) => {
              const endNodeId = endNode.id;
              // Если для этого конечного узла есть новый ID, используем его
              if (this.idMap.has(endNodeId)) {
                return {
                  ...endNode,
                  id: this.idMap.get(endNodeId)
                };
              }
              return endNode;
            });
          }
        }

        // Сохраняем узел с новым ID
        updatedNodes[newNodeId] = updatedNode;
      }

      // Создаем новый объект для обновленных связей
      const updatedEdges: Record<string, Link> = {};

      // Обновляем связи
      for (const edgeId in edges) {
        const edge = edges[edgeId];
        const newEdgeId = nanoid();

        // Обновляем ID узлов в связи
        const newStartNodeId = this.idMap.has(edge.startNodeId) ? this.idMap.get(edge.startNodeId)! : edge.startNodeId;

        const newEndNodeId = this.idMap.has(edge.endNodeId) ? this.idMap.get(edge.endNodeId)! : edge.endNodeId;

        // Также обновляем sourceHandle и targetHandle, если они ссылаются на узлы с новыми ID
        const newSourceHandle = edge.sourceHandle && this.idMap.has(edge.sourceHandle) ? this.idMap.get(edge.sourceHandle)! : edge.sourceHandle;

        const newTargetHandle = edge.targetHandle && this.idMap.has(edge.targetHandle) ? this.idMap.get(edge.targetHandle)! : edge.targetHandle;

        updatedEdges[newEdgeId] = {
          ...edge,
          id: newEdgeId,
          startNodeId: newStartNodeId,
          endNodeId: newEndNodeId,
          sourceHandle: newSourceHandle,
          targetHandle: newTargetHandle
        };
      }

      // Обновляем список ID узлов
      const updatedNodeIds = nodeIds.map((id) => (this.idMap.has(id) ? this.idMap.get(id)! : id));

      // Обновляем данные слоя
      this.newLayerData.set(newLayerId, {
        nodes: updatedNodes,
        edges: updatedEdges,
        nodeIds: updatedNodeIds,
        depth: layerData.depth // Сохраняем оригинальную глубину
      });
    }
  }

  execute(): void {
    // Проверяем, есть ли узлы для дублирования
    if (this.newNodes.length === 0) {
      // Показываем уведомление, если нечего дублировать
      getNotificationManager().showError(i18n.t('clipboard.nothing_to_duplicate') || 'Nothing to duplicate', true, 3000);
      // Устанавливаем флаг, что команда не должна добавляться в историю
      (this as any)._shouldSkipAddingToHistory = true;
      return;
    }

    // Разделяем узлы на слои и обычные узлы для правильного порядка добавления
    const layerNodes = this.newNodes.filter((node) => node.type === 'layer') as LayerNode[];
    const nonLayerNodes = this.newNodes.filter((node) => node.type !== 'layer') as (ChoiceNode | NarrativeNode | NoteNode)[];

    // Для отслеживания порядка создания вложенных слоев
    const processedLayers = new Set<string>();
    const layersToProcess = [...layerNodes]; // Начинаем с верхнеуровневых слоев

    // Рекурсивно создаем все слои, начиная с верхнего уровня
    while (layersToProcess.length > 0) {
      const layerNode = layersToProcess.shift()!;
      const layerId = layerNode.id;

      // Пропускаем, если слой уже обработан
      if (processedLayers.has(layerId)) continue;

      try {
        // Проверяем, является ли слой вложенным
        if (layerNode.parentLayerId) {
          // Если родительский слой еще не создан, откладываем создание этого слоя
          if (!processedLayers.has(layerNode.parentLayerId) && !this.graphStore.layers[layerNode.parentLayerId]) {
            layersToProcess.push(layerNode); // Вернем в очередь для повторной обработки
            continue;
          }
        }

        // Добавляем слой в систему
        this.graphStore.addLayer(layerNode);
        processedLayers.add(layerId);

        // Получаем данные слоя для наполнения содержимым
        const layerData = this.newLayerData.get(layerId);
        if (layerData) {
          // Обновляем слой с узлами и связями
          const updatedLayer: Layer = {
            ...this.graphStore.layers[layerId],
            nodes: layerData.nodes,
            edges: layerData.edges,
            nodeIds: layerData.nodeIds,
            depth: layerData.depth // Используем сохраненную глубину
          };

          // Применяем изменения
          this.graphStore.updateLayerWithOperations(layerId, updatedLayer);

          // Находим все вложенные слои в обновленных данных и добавляем в очередь
          for (const nodeId in layerData.nodes) {
            const node = layerData.nodes[nodeId];
            if (node.type === 'layer' && !processedLayers.has(nodeId)) {
              // Получаем или создаем узел слоя для добавления
              const nestedLayerNode: LayerNode = {
                ...node,
                id: nodeId,
                parentLayerId: layerId, // Явно указываем parentLayerId для вложенного слоя
                // Используем depth из node, или устанавливаем значение из родителя + 1, если возможно, или используем 1
                depth: node.depth || (this.graphStore.layers[layerId]?.depth || 0) + 1
              };

              // Добавляем в очередь для обработки
              layersToProcess.push(nestedLayerNode);
            }
          }
        }
      } catch (error) {
        // Ошибка добавления слоя (без логирования)
      }
    }

    // Затем добавляем остальные узлы
    for (const node of nonLayerNodes) {
      try {
        this.graphStore.addNode(node);
      } catch (error) {
        // Ошибка добавления узла (без логирования)
      }
    }

    // Добавляем связи между новыми узлами
    for (const edge of this.newEdges) {
      try {
        this.graphStore.addEdge(edge);
      } catch (error) {
        // Ошибка добавления связи (без логирования)
      }
    }

    // Выделяем новые узлы
    const newNodeIds = this.newNodes.map((node) => node.id);

    // Генерируем одну композитную операцию синхронизации для всего дублирования
    if (this.newNodes.length > 0 || this.newEdges.length > 0) {
      const layerNodes = this.newNodes.filter((node) => node.type === 'layer');
      const regularNodes = this.newNodes.filter((node) => node.type !== 'layer');

      generateAndSaveOperation(
        'nodes.duplicated',
        {
          nodes: regularNodes,
          edges: this.newEdges,
          layers: layerNodes,
          totalCount: this.newNodes.length,
          originalNodeIds: this.originalNodeIds
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }

    // Сохраняем изменения
    this.graphStore.saveToDb();

    // Обновляем канвас с проверкой уникальности ключей
    // Делаем небольшую задержку перед refreshCanvas, чтобы все изменения успели применяться
    setTimeout(() => {
      refreshSpecificLayers([this.graphStore.currentGraphId], true);

      // Выделяем новые узлы после обновления канваса
      if (newNodeIds.length === 1) {
        this.canvasStore.selectNode(newNodeIds[0]);
      } else if (newNodeIds.length > 1) {
        this.canvasStore.selectMultipleNodes(newNodeIds);
      }
    }, 10);

    // Undo операция генерируется только при фактическом undo действии, не при создании
  }

  undo(): void {
    // Удаляем все созданные связи
    for (const edge of this.newEdges) {
      const {currentGraphId, layers} = this.graphStore;
      const graph = layers[currentGraphId];

      if (graph.edges[edge.id]) {
        // Удаляем связь
        const updatedGraph = {
          ...graph,
          edges: {...graph.edges}
        };
        delete updatedGraph.edges[edge.id];

        useGraphStore.setState({
          layers: {
            ...layers,
            [currentGraphId]: updatedGraph
          }
        });
      }
    }

    // Удаляем все созданные узлы
    for (const node of this.newNodes) {
      this.graphStore.removeNode(node.id);
    }

    // Генерируем операцию для undo только при фактическом undo
    if (this.newNodes.length > 0 || this.newEdges.length > 0) {
      generateAndSaveOperation(
        'nodes.duplicated.undo',
        {
          nodes: this.newNodes,
          edges: this.newEdges,
          layers: this.newNodes.filter((node) => node.type === 'layer'),
          layerData: Object.fromEntries(this.newLayerData.entries())
        },
        this.projectId,
        this.timelineId,
        this.currentGraphId
      );
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Класс команды для вставки узлов из буфера обмена
 */
class PasteNodesCommand implements Command {
  private newNodes: (ChoiceNode | NarrativeNode | NoteNode | LayerNode)[] = [];
  private newEdges: Link[] = [];
  private newNodeIds: string[] = [];
  private idMap: Map<string, string> = new Map();
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private newLayerData: Map<string, {nodes: any; edges: any; nodeIds: string[]; depth: number}> = new Map();
  // Карта для отслеживания иерархии слоев (родитель -> дети)
  private layerHierarchy: Map<string, string[]> = new Map();
  // Флаг для отслеживания операции вырезания
  private isCutNodes: boolean = false;
  private projectId: string;
  private timelineId: string;
  private currentGraphId: string;

  constructor(projectId: string, timelineId: string) {
    this.projectId = projectId;
    this.timelineId = timelineId;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.currentGraphId = this.graphStore.currentGraphId;

    this.prepareNodesForPaste();
  }

  /**
   * Возвращает метаданные для отображения в истории
   */
  getMetadata(): {timestamp: number; description: string; nodesCount: number} {
    return {
      timestamp: Date.now(),
      description: 'PasteNodes',
      nodesCount: this.newNodeIds.length
    };
  }

  /**
   * Возвращает тип команды для истории
   */
  getType(): string {
    return 'PasteNodes';
  }

  /**
   * Возвращает ID слоя, в котором выполнена команда
   */
  getLayerId(): string {
    return this.graphStore.currentGraphId;
  }

  /**
   * Подготавливает узлы для вставки из буфера обмена
   */
  private prepareNodesForPaste(): void {
    // ИСПРАВЛЕНИЕ: получаем свежее состояние graphStore
    const freshGraphStore = useGraphStore.getState();
    const {copiedNode, copiedNodes, copiedEdges, currentGraphId, layers} = freshGraphStore;

    if (!copiedNode && (!copiedNodes || copiedNodes.length === 0)) {
      return; // Ничего для вставки
    }

    const graph = layers[currentGraphId];
    if (!graph) return;

    // Карта соответствия старых ID узлов новым
    const idMap = new Map<string, string>();
    this.idMap = idMap;

    // Используем копирование одиночного узла или массива узлов
    const nodesToPaste = copiedNodes && copiedNodes.length > 0 ? copiedNodes : copiedNode ? [copiedNode] : [];

    // Проверяем, была ли операция вырезания
    this.isCutNodes = freshGraphStore._cutNodes || false;

    // Получаем сохраненные данные содержимого слоев - ИСПОЛЬЗУЕМ СВЕЖЕЕ СОСТОЯНИЕ
    const layerContents = (freshGraphStore as any)._layerContentsForPaste || {};

    // Очищаем массивы для новых узлов и связей
    this.newNodes = [];
    this.newEdges = [];
    this.newNodeIds = [];

    // Список для отслеживания слоев для дополнительной обработки
    const layersToProcess: {oldId: string; newId: string}[] = [];

    // Получаем позицию курсора
    const cursorPosition = getCurrentCursorPosition();

    // Получаем существующие узлы в слое для проверки коллизий
    const existingNodes = Object.values(graph.nodes) as NodeType[];

    // Рассчитываем новые позиции с использованием логики позиционирования
    const nodesWithNewPositions = calculateGroupPastePositions(nodesToPaste as NodeType[], cursorPosition, existingNodes);

    // Создаем новые узлы с рассчитанными позициями
    for (let i = 0; i < nodesToPaste.length; i++) {
      const node = nodesToPaste[i];
      const nodeWithNewPosition = nodesWithNewPositions[i];

      // Генерируем новый ID узла
      const oldId = node.id;
      const newId = nanoid();
      idMap.set(oldId, newId);

      // Создаем глубокую копию узла с новым ID и позицией
      const newNode = JSON.parse(JSON.stringify(node)) as ChoiceNode | NarrativeNode | NoteNode | LayerNode;
      newNode.id = newId;
      newNode.coordinates = nodeWithNewPosition.coordinates;

      // Особая обработка для слоев
      if (node.type === 'layer') {
        const layerNode = newNode as LayerNode;

        // Добавляем "copy" к имени слоя только при копировании, но не при вырезании
        if (!this.isCutNodes && layerNode.name && !layerNode.name.endsWith(' copy')) {
          layerNode.name = `${layerNode.name} copy`;
        }

        // Устанавливаем правильный parentLayerId для вставляемого слоя
        // Если слой был скопирован из другого слоя, устанавливаем currentGraphId как родителя
        if (!layerNode.parentLayerId || layerNode.parentLayerId === 'root') {
          layerNode.parentLayerId = this.currentGraphId;
        }

        // Сохраняем слой для дальнейшей обработки
        layersToProcess.push({oldId: oldId, newId: newId});

        // Если есть сохраненные данные слоя, копируем их
        if (layerContents[oldId]) {
          this.copyLayerContent(oldId, newId, layerContents, this.isCutNodes);
        }
      }

      // Добавляем узел в список для вставки
      this.newNodes.push(newNode);
      this.newNodeIds.push(newId);
    }

    // Обновляем все внутренние ссылки в слоях
    this.updateLayerInternalReferences();

    // Обрабатываем скопированные связи для создания новых связей между вставленными узлами
    if (copiedEdges && copiedEdges.length > 0) {
      // Сначала создаем все новые связи
      const allNewEdges: Link[] = [];

      copiedEdges.forEach((edge) => {
        const oldSourceId = edge.startNodeId;
        const oldTargetId = edge.endNodeId;

        // Проверяем, что оба конца связи находятся среди вставляемых узлов
        if (idMap.has(oldSourceId) && idMap.has(oldTargetId)) {
          const newSourceId = idMap.get(oldSourceId)!;
          const newTargetId = idMap.get(oldTargetId)!;

          // Создаем новую связь для вставленных узлов
          const newEdge: Link = {
            ...JSON.parse(JSON.stringify(edge)), // Глубокое копирование всех свойств
            id: nanoid(),
            startNodeId: newSourceId,
            endNodeId: newTargetId
          };

          allNewEdges.push(newEdge);
        }
      });

      this.newEdges = allNewEdges;
    }
  }

  /**
   * Копирует содержимое слоя и его вложенных слоев для вставки
   */
  private copyLayerContent(originalLayerId: string, newLayerId: string, layerContents: any, isCutNodes: boolean = false): void {
    const layerContent = layerContents[originalLayerId];
    if (!layerContent) {
      return;
    }

    // Копируем базовые данные слоя
    const nodesCopy = JSON.parse(JSON.stringify(layerContent.nodes || {}));
    const edgesCopy = JSON.parse(JSON.stringify(layerContent.edges || {}));
    const nodeIdsCopy = Array.isArray(layerContent.nodeIds) ? [...layerContent.nodeIds] : [];

    // Получаем глубину из оригинального слоя
    const depth = layerContent.depth || 0;

    // Сохраняем данные слоя
    this.newLayerData.set(newLayerId, {
      nodes: nodesCopy,
      edges: edgesCopy,
      nodeIds: nodeIdsCopy,
      depth: depth // Сохраняем оригинальную глубину
    });

    // Обрабатываем все вложенные слои
    const childLayers = layerContent.childLayers || [];

    for (const childLayerId of childLayers) {
      // Генерируем новый ID для вложенного слоя
      const newChildLayerId = nanoid();

      // Запоминаем соответствие старого и нового ID
      this.idMap.set(childLayerId, newChildLayerId);

      // Сохраняем иерархию для отслеживания вложенности
      if (!this.layerHierarchy.has(newLayerId)) {
        this.layerHierarchy.set(newLayerId, []);
      }
      this.layerHierarchy.get(newLayerId)!.push(newChildLayerId);

      // Исправляем parentLayerId для вложенного слоя в nodesCopy
      if (nodesCopy[childLayerId]) {
        nodesCopy[childLayerId] = {
          ...nodesCopy[childLayerId],
          parentLayerId: newLayerId // Устанавливаем новый слой как родителя
        };
      }

      // Добавляем "copy" к имени вложенного слоя только если НЕ вырезание
      if (!isCutNodes && nodesCopy[childLayerId] && nodesCopy[childLayerId].name) {
        const currentName = nodesCopy[childLayerId].name;
        if (!currentName.endsWith(' copy')) {
          nodesCopy[childLayerId].name = `${currentName} copy`;
        }
      }

      // Рекурсивно копируем содержимое вложенного слоя
      this.copyLayerContent(childLayerId, newChildLayerId, layerContents, isCutNodes);
    }
  }

  /**
   * Обновляет внутренние ссылки во всех скопированных слоях
   */
  private updateLayerInternalReferences(): void {
    // Обходим все скопированные слои
    for (const [newLayerId, layerData] of this.newLayerData.entries()) {
      const nodes = layerData.nodes;
      const edges = layerData.edges;
      const nodeIds = layerData.nodeIds;

      // Создаем новый объект для обновленных узлов
      const updatedNodes: Record<string, any> = {};

      // Обновляем ID узлов в слое
      for (const oldNodeId in nodes) {
        const node = nodes[oldNodeId];

        // Если для этого узла есть новый ID, используем его
        const newNodeId = this.idMap.has(oldNodeId) ? this.idMap.get(oldNodeId)! : oldNodeId;

        // Создаем копию узла с обновленным ID
        const updatedNode = {...node, id: newNodeId};

        // Если это слой, обновляем parentLayerId
        if (updatedNode.type === 'layer') {
          // Сохраняем существующий parentLayerId, если он есть в карте маппинга ID,
          // иначе используем ID текущего слоя (newLayerId)
          if (updatedNode.parentLayerId && this.idMap.has(updatedNode.parentLayerId)) {
            // Если родитель есть в карте маппинга, обновляем ID
            updatedNode.parentLayerId = this.idMap.get(updatedNode.parentLayerId)!;
          } else if (oldNodeId !== node.id) {
            // Если это вложенный слой для текущего слоя, устанавливаем родителя
            updatedNode.parentLayerId = newLayerId;
          } else {
            // Для основных слоев (не вложенных), устанавливаем текущий граф как родителя
            updatedNode.parentLayerId = this.currentGraphId;
          }

          // Также обновляем startingNodes и endingNodes в слое
          if (updatedNode.startingNodes) {
            updatedNode.startingNodes = updatedNode.startingNodes.map((startNode: any) => {
              const startNodeId = startNode.id;
              // Если для этого стартового узла есть новый ID, используем его
              if (this.idMap.has(startNodeId)) {
                return {
                  ...startNode,
                  id: this.idMap.get(startNodeId)
                };
              }
              return startNode;
            });
          }

          if (updatedNode.endingNodes) {
            updatedNode.endingNodes = updatedNode.endingNodes.map((endNode: any) => {
              const endNodeId = endNode.id;
              // Если для этого конечного узла есть новый ID, используем его
              if (this.idMap.has(endNodeId)) {
                return {
                  ...endNode,
                  id: this.idMap.get(endNodeId)
                };
              }
              return endNode;
            });
          }
        }

        // Сохраняем узел с новым ID
        updatedNodes[newNodeId] = updatedNode;
      }

      // Создаем новый объект для обновленных связей
      const updatedEdges: Record<string, Link> = {};

      // Обновляем связи
      for (const edgeId in edges) {
        const edge = edges[edgeId];
        const newEdgeId = nanoid();

        // Обновляем ID узлов в связи
        const newStartNodeId = this.idMap.has(edge.startNodeId) ? this.idMap.get(edge.startNodeId)! : edge.startNodeId;

        const newEndNodeId = this.idMap.has(edge.endNodeId) ? this.idMap.get(edge.endNodeId)! : edge.endNodeId;

        // Также обновляем sourceHandle и targetHandle, если они ссылаются на узлы с новыми ID
        const newSourceHandle = edge.sourceHandle && this.idMap.has(edge.sourceHandle) ? this.idMap.get(edge.sourceHandle)! : edge.sourceHandle;

        const newTargetHandle = edge.targetHandle && this.idMap.has(edge.targetHandle) ? this.idMap.get(edge.targetHandle)! : edge.targetHandle;

        updatedEdges[newEdgeId] = {
          ...edge,
          id: newEdgeId,
          startNodeId: newStartNodeId,
          endNodeId: newEndNodeId,
          sourceHandle: newSourceHandle,
          targetHandle: newTargetHandle
        };
      }

      // Обновляем список ID узлов
      const updatedNodeIds = nodeIds.map((id) => (this.idMap.has(id) ? this.idMap.get(id)! : id));

      // Обновляем данные слоя
      this.newLayerData.set(newLayerId, {
        nodes: updatedNodes,
        edges: updatedEdges,
        nodeIds: updatedNodeIds,
        depth: layerData.depth // Сохраняем оригинальную глубину
      });
    }
  }

  execute(): void {
    if (this.newNodes.length === 0) {
      // Показываем уведомление, если нечего вставить
      getNotificationManager().showError(i18n.t('clipboard.nothing_to_paste'), true, 3000);
      // Устанавливаем флаг, что команда не должна добавляться в историю
      (this as any)._shouldSkipAddingToHistory = true;
      return;
    }

    // Разделяем узлы на слои и обычные узлы для правильного порядка добавления
    const layerNodes = this.newNodes.filter((node) => node.type === 'layer') as LayerNode[];
    const nonLayerNodes = this.newNodes.filter((node) => node.type !== 'layer') as (ChoiceNode | NarrativeNode | NoteNode)[];

    // Для отслеживания порядка создания вложенных слоев
    const processedLayers = new Set<string>();
    const layersToProcess = [...layerNodes];

    // Рекурсивно создаем все слои, начиная с верхнего уровня
    while (layersToProcess.length > 0) {
      const layerNode = layersToProcess.shift()!;
      const layerId = layerNode.id;

      // Пропускаем, если слой уже обработан
      if (processedLayers.has(layerId)) continue;

      try {
        // Проверяем, является ли слой вложенным
        if (layerNode.parentLayerId) {
          // Если родительский слой еще не создан, откладываем создание этого слоя
          if (!processedLayers.has(layerNode.parentLayerId) && !this.graphStore.layers[layerNode.parentLayerId]) {
            layersToProcess.push(layerNode); // Вернем в очередь для повторной обработки
            continue;
          }
        }

        // Добавляем слой в систему
        this.graphStore.addLayer(layerNode);
        processedLayers.add(layerId);

        // Получаем данные слоя для наполнения содержимым
        const layerData = this.newLayerData.get(layerId);
        if (layerData) {
          // Обновляем слой с узлами и связями
          const updatedLayer: Layer = {
            ...this.graphStore.layers[layerId],
            nodes: layerData.nodes,
            edges: layerData.edges,
            nodeIds: layerData.nodeIds,
            depth: layerData.depth // Используем сохраненную глубину
          };

          // Применяем изменения
          this.graphStore.updateLayerWithOperations(layerId, updatedLayer);

          // Находим все вложенные слои в обновленных данных и добавляем в очередь
          for (const nodeId in layerData.nodes) {
            const node = layerData.nodes[nodeId];
            if (node.type === 'layer' && !processedLayers.has(nodeId)) {
              // Получаем или создаем узел слоя для добавления
              const nestedLayerNode: LayerNode = {
                ...node,
                id: nodeId,
                parentLayerId: layerId, // Явно указываем parentLayerId для вложенного слоя
                // Используем depth из node, или устанавливаем значение из родителя + 1, если возможно, или используем 1
                depth: node.depth || (this.graphStore.layers[layerId]?.depth || 0) + 1
              };

              // Добавляем в очередь для обработки
              layersToProcess.push(nestedLayerNode);
            }
          }
        }
      } catch (error) {
        // Ошибка добавления слоя (без логирования)
      }
    }

    // Затем добавляем остальные узлы
    for (const node of nonLayerNodes) {
      try {
        this.graphStore.addNode(node);
      } catch (error) {
        // Ошибка добавления узла (без логирования)
      }
    }

    // Добавляем связи между новыми узлами
    for (const edge of this.newEdges) {
      try {
        this.graphStore.addEdge(edge);
      } catch (error) {
        // Ошибка добавления связи (без логирования)
      }
    }

    // Выделяем новые узлы
    const newNodeIds = this.newNodeIds;

    // Сбрасываем флаг вырезанных узлов после вставки - ИСПОЛЬЗУЕМ СВЕЖЕЕ СОСТОЯНИЕ
    const freshGraphStore = useGraphStore.getState();
    const isCutNodes = !!(freshGraphStore as any)._cutNodes;

    if (isCutNodes) {
      // Используем новый метод для сброса метаданных
      freshGraphStore.clearCutMetadata();
    }

    // Генерируем композитную операцию синхронизации для вставки
    if (this.newNodes.length > 0 || this.newEdges.length > 0) {
      const layerNodes = this.newNodes.filter((node) => node.type === 'layer');
      const regularNodes = this.newNodes.filter((node) => node.type !== 'layer');

      // Выбираем тип операции в зависимости от источника (cut vs copy)
      const operationType = this.isCutNodes ? 'nodes.pasted.cut' : 'nodes.pasted.copy';

      generateAndSaveOperation(
        operationType,
        {
          nodes: regularNodes,
          edges: this.newEdges,
          layers: layerNodes,
          totalCount: this.newNodes.length,
          isCutNodes: this.isCutNodes,
          newNodeIds: this.newNodeIds
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }

    // Сохраняем изменения
    this.graphStore.saveToDb();

    // Показываем уведомление об успешной вставке
    if (this.newNodeIds.length === 1) {
      getNotificationManager().showSuccess(i18n.t('clipboard.node_pasted'), true, 2000);
    } else {
      getNotificationManager().showSuccess(i18n.t('clipboard.nodes_pasted', {count: this.newNodeIds.length}), true, 2000);
    }

    // Обновляем канвас с проверкой уникальности ключей
    // Делаем небольшую задержку перед refreshCanvas, чтобы все изменения успели применяться
    setTimeout(() => {
      refreshSpecificLayers([this.graphStore.currentGraphId], true);

      // Выделяем новые узлы после обновления канваса (аналогично дублированию)
      if (newNodeIds.length === 1) {
        this.canvasStore.selectNode(newNodeIds[0]);
      } else if (newNodeIds.length > 1) {
        this.canvasStore.selectMultipleNodes(newNodeIds);
      }
    }, 10);

    // Генерируем операцию для undo
    if (this.newNodes.length > 0) {
      const operationType = this.isCutNodes ? 'nodes.pasted.cut.undo' : 'nodes.pasted.copy.undo';
      generateAndSaveOperation(
        operationType,
        {
          newNodeIds: this.newNodeIds,
          layerIds: this.newNodes.filter((n) => n.type === 'layer').map((n) => n.id)
        },
        this.projectId,
        this.timelineId,
        this.currentGraphId
      );
    }
  }

  undo(): void {
    // Удаляем все созданные связи
    for (const edge of this.newEdges) {
      const {currentGraphId, layers} = this.graphStore;
      const graph = layers[currentGraphId];

      if (graph.edges[edge.id]) {
        // Удаляем связь
        const updatedGraph = {
          ...graph,
          edges: {...graph.edges}
        };
        delete updatedGraph.edges[edge.id];

        useGraphStore.setState({
          layers: {
            ...layers,
            [currentGraphId]: updatedGraph
          }
        });
      }
    }

    // Удаляем все созданные узлы
    for (const node of this.newNodes) {
      this.graphStore.removeNode(node.id);
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Класс команды для вырезания узлов (комбинация копирования и удаления)
 */
class CutNodesCommand implements Command {
  private deletedNodes: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[] = [];
  private deletedEdges: Link[] = [];
  private nodeIds: string[] = [];
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private nodesToCutCount: number = 0;
  private projectId: string;
  private timelineId: string;
  private currentGraphId: string;

  constructor(projectId: string, timelineId: string) {
    this.projectId = projectId;
    this.timelineId = timelineId;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.currentGraphId = this.graphStore.currentGraphId;

    // Готовим узлы и связи к вырезанию
    this.prepareNodesToCut();
  }

  /**
   * Подготавливает узлы к вырезанию
   */
  private prepareNodesToCut(): void {
    const {currentGraphId, layers} = this.graphStore;
    const graph = layers[currentGraphId];

    if (!graph) {
      return;
    }

    // Получаем выбранные узлы напрямую из canvasStore
    const canvasStore = useCanvasStore.getState();
    const selectedNodes = canvasStore.nodes.filter((node: any) => node.selected);

    if (selectedNodes.length === 0) {
      return; // Нечего вырезать
    }

    this.nodesToCutCount = selectedNodes.length;
    this.nodeIds = selectedNodes.map((node) => node.id); // Сохраняем ID узлов

    // Получаем реальные узлы из хранилища
    for (const selectedNode of selectedNodes) {
      const nodeId = selectedNode.id;
      const node = graph.nodes[nodeId];

      if (node) {
        this.deletedNodes.push(node);
      }
    }

    // Собираем все связи, которые будут удалены
    const allNodeIds = new Set(this.nodeIds);

    // Добавляем ID дочерних слоев для правильного сбора связей
    for (const nodeId of this.nodeIds) {
      const node = graph.nodes[nodeId];
      if (node && node.type === 'layer') {
        const childIds = collectChildLayerIds(nodeId, layers);
        childIds.forEach((id) => allNodeIds.add(id));
      }
    }

    // Собираем связи для восстановления при undo
    this.deletedEdges = Object.values(graph.edges).filter((edge) => allNodeIds.has(edge.startNodeId) || allNodeIds.has(edge.endNodeId));
  }

  /**
   * Возвращает метаданные для отображения в истории
   */
  getMetadata(): {timestamp: number; description: string; nodesCount: number} {
    return {
      timestamp: Date.now(),
      description: 'CutNodes',
      nodesCount: this.nodesToCutCount
    };
  }

  /**
   * Возвращает тип команды для истории
   */
  getType(): string {
    return 'CutNodes';
  }

  /**
   * Возвращает ID слоя, в котором выполнена команда
   */
  getLayerId(): string {
    return this.graphStore.currentGraphId;
  }

  execute(): void {
    if (this.nodesToCutCount === 0) {
      // Уведомление, если нечего вырезать
      getNotificationManager().showError(i18n.t('clipboard.nothing_to_cut') || 'Nothing to cut', true, 3000);
      return;
    }

    // Получаем выбранные узлы
    const canvasStore = useCanvasStore.getState();
    const selectedNodes = canvasStore.nodes.filter((node: any) => node.selected);
    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const graph = layers[currentGraphId];

    if (!graph) return;

    // ИСПОЛЬЗУЕМ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ для полного копирования
    const {nodesToCopy, internalEdges, layerContents} = copyNodesWithFullLayerSupport(
      selectedNodes,
      graph,
      layers,
      false // НЕ добавляем " copy" к именам слоев при вырезании - это просто перемещение узлов
    );

    // Обновляем буфер обмена
    graphStore.setCopiedNodes(nodesToCopy, internalEdges);

    // Сохраняем метаданные для вставки (только содержимое слоев, без оригинальных координат)
    graphStore.setCutMetadata(layerContents, {});

    // ТЕПЕРЬ УДАЛЯЕМ УЗЛЫ (после копирования)
    // Пропускаем генерацию отдельных операций, так как используем групповую операцию nodes.cut
    for (const nodeId of this.nodeIds) {
      graphStore.removeNode(nodeId, true);
    }

    // Генерируем композитную операцию синхронизации для вырезания
    if (this.deletedNodes.length > 0 || this.deletedEdges.length > 0) {
      const layerNodes = this.deletedNodes.filter((node) => node.type === 'layer');
      const regularNodes = this.deletedNodes.filter((node) => node.type !== 'layer');

      generateAndSaveOperation(
        'nodes.cut',
        {
          nodes: regularNodes,
          edges: this.deletedEdges,
          layers: layerNodes,
          totalCount: this.deletedNodes.length,
          nodeIds: this.nodeIds
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }

    // Обновляем канвас
    setTimeout(() => {
      refreshSpecificLayers([graphStore.currentGraphId], true);
    }, 10);

    // Показываем уведомление об успешном вырезании
    if (this.deletedNodes.length === 1) {
      getNotificationManager().showSuccess(i18n.t('clipboard.node_cut'), true, 2000);
    } else {
      getNotificationManager().showSuccess(i18n.t('clipboard.nodes_cut', {count: this.deletedNodes.length}), true, 2000);
    }
  }

  undo(): void {
    // Восстанавливаем узлы
    for (const node of this.deletedNodes) {
      // Добавляем узел обратно с правильным приведением типа
      if (node.type !== 'layer') {
        this.graphStore.addNode(node as ChoiceNode | NarrativeNode | NoteNode);
      } else {
        // Для LayerNode используем специальный метод
        const layerNode = node as LayerNode;
        this.graphStore.addLayer(layerNode);
      }
    }

    // Восстанавливаем связи
    for (const edge of this.deletedEdges) {
      this.graphStore.addEdge(edge);
    }

    // Восстанавливаем выделение
    if (this.nodeIds.length === 1) {
      this.canvasStore.selectNode(this.nodeIds[0]);
    } else if (this.nodeIds.length > 1) {
      this.canvasStore.selectMultipleNodes(this.nodeIds);
    }

    // Генерируем операцию для undo
    if (this.deletedNodes.length > 0) {
      generateAndSaveOperation(
        'nodes.cut.undo',
        {
          nodes: this.deletedNodes,
          edges: this.deletedEdges,
          layers: this.deletedNodes.filter((node) => node.type === 'layer'),
          nodeIds: this.nodeIds
        },
        this.projectId,
        this.timelineId,
        this.currentGraphId
      );
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Класс команды для группового перемещения узлов.
 * Обеспечивает атомарность операции.
 */
class MoveNodesCommand implements Command {
  private changes: NodeChange[];
  private oldPositions: Map<string, {x: number; y: number}> = new Map();
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId: string | undefined;
  private timelineId: string;

  constructor(changes: NodeChange[], projectId?: string) {
    this.changes = changes;
    this.projectId = projectId;
    this.graphStore = useGraphStore.getState();
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старые позиции для возможности отмены (undo)
    const {currentGraphId, layers} = this.graphStore;
    const currentGraph = layers[currentGraphId];
    if (currentGraph) {
      this.changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const node = currentGraph.nodes[change.id];
          if (node && node.coordinates) {
            this.oldPositions.set(change.id, {...node.coordinates});
          }
        }
      });
    }
  }

  execute(): void {
    const {currentGraphId} = this.graphStore;
    // Применяем изменения позиций к узлам в useGraphStore
    this.graphStore.updateNodePositions(currentGraphId, this.changes);

    // Генерируем одну операцию 'nodes.moved' для всей группы
    if (this.projectId) {
      generateAndSaveOperation(
        'nodes.moved',
        {
          changes: this.changes
            .map((change) => {
              if (change.type === 'position' && change.position) {
                return {
                  nodeId: change.id,
                  newPosition: change.position,
                  oldPosition: this.oldPositions.get(change.id)
                };
              }
              return null;
            })
            .filter((c): c is {nodeId: string; newPosition: {x: number; y: number}; oldPosition: {x: number; y: number} | undefined} => c !== null)
        },
        this.projectId,
        this.timelineId,
        currentGraphId
      );
    }
  }

  undo(): void {
    const {currentGraphId} = this.graphStore;
    // Восстанавливаем старые позиции
    const undoChanges: NodeChange[] = [];
    this.oldPositions.forEach((pos, id) => {
      undoChanges.push({id, type: 'position', position: pos});
    });
    this.graphStore.updateNodePositions(currentGraphId, undoChanges);

    // Генерируем операцию отмены
    if (this.projectId) {
      generateAndSaveOperation(
        'nodes.moved.undo',
        {
          changes: undoChanges
            .map((change) => {
              if (change.type === 'position' && change.position) {
                const originalChange = this.changes.find((c) => 'id' in c && c.id === change.id && 'type' in c && c.type === 'position');
                return {
                  nodeId: change.id,
                  newPosition: change.position,
                  oldPosition: originalChange && 'position' in originalChange ? originalChange.position : undefined
                };
              }
              return null;
            })
            .filter((c): c is {nodeId: string; newPosition: {x: number; y: number}; oldPosition: {x: number; y: number} | undefined} => c !== null)
        },
        this.projectId,
        this.timelineId,
        currentGraphId
      );
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Менеджер команд - предоставляет единый интерфейс для выполнения всех команд
 * с автоматической регистрацией в истории для Undo/Redo
 */
export class CommandManager {
  private static instance: CommandManager;
  private history: CommandHistory | null = null;
  private router: AppRouterInstance | null = null;
  private projectId: string | undefined;
  private _isProcessing: boolean = false; // Флаг для предотвращения дублирования команд
  private _lastCommandTime: number = 0; // Время последней команды
  private _lastCommandId: string = ''; // Идентификатор последней команды
  private _debounceTime: number = 200; // Минимальный промежуток между одинаковыми командами

  private constructor() {
    // История будет инициализирована позже через setRouter
  }

  /**
   * Установить router и projectId для CommandHistory
   */
  public setRouter(router: AppRouterInstance, projectId?: string): void {
    this.router = router;
    this.projectId = projectId;
    this.history = getCommandHistory(router, projectId);
  }

  /**
   * Получить единственный экземпляр класса (Singleton)
   */
  public static getInstance(): CommandManager {
    if (!CommandManager.instance) {
      CommandManager.instance = new CommandManager();
    }
    return CommandManager.instance;
  }

  /**
   * Проверить доступность отмены
   */
  public canUndo(): boolean {
    return this.history?.canUndo() || false;
  }

  /**
   * Проверить доступность повтора
   */
  public canRedo(): boolean {
    return this.history?.canRedo() || false;
  }

  /**
   * Отменить последнюю команду
   */
  public undo(): void {
    if (this._isProcessing || !this.history) return;
    this._isProcessing = true;

    this.history.undo();

    setTimeout(() => {
      this._isProcessing = false;
    }, 100);
  }

  /**
   * Повторить последнюю отмененную команду
   */
  public redo(): void {
    if (this._isProcessing || !this.history) return;
    this._isProcessing = true;

    this.history.redo();

    setTimeout(() => {
      this._isProcessing = false;
    }, 100);
  }

  /**
   * Защита от дублирования команд
   * @param commandId - уникальный идентификатор команды
   * @returns true, если команду следует пропустить
   */
  private _shouldSkipDuplicateCommand(commandId: string): boolean {
    const now = Date.now();

    // Если это повторение той же команды в течение debounceTime, пропускаем
    if (commandId === this._lastCommandId && now - this._lastCommandTime < this._debounceTime) {
      return true;
    }

    // Обновляем время и ID последней команды
    this._lastCommandTime = now;
    this._lastCommandId = commandId;
    return false;
  }

  /**
   * Вспомогательный метод для безопасного выполнения команд с проверкой на дублирование
   */
  private _executeWithProtection(command: Command, commandId: string): void {
    // Защита от дублирования
    if (this._shouldSkipDuplicateCommand(commandId)) {
      return;
    }

    // Проверяем, что история инициализирована
    if (!this.history) {
      console.warn('CommandHistory not initialized. Call setRouter first.');
      return;
    }

    // Выполняем команду
    command.execute();

    // Проверяем, нужно ли добавлять команду в историю
    // Если команда помечена флагом _shouldSkipAddingToHistory, не добавляем её в историю
    if (!(command as any)._shouldSkipAddingToHistory) {
      // Добавляем команду в историю (она уже выполнена)
      this.history.addCommandWithoutExecution(command);
    }
  }

  /**
   * Очистить историю команд
   */
  public clearHistory(): void {
    this.history?.clear();
  }

  //
  // Нарративные узлы
  //

  /**
   * Создать нарративный узел
   * @param position Позиция узла
   * @param data Данные узла
   * @param options Дополнительные опции для трекинга
   */
  public createNarrativeNode(
    position: {x: number; y: number},
    data: {title: string; text: string; attachedEntities?: string[]} = {title: '', text: ''},
    options: {isRootLayer: boolean; interaction: 'mouse' | 'hotkey'} = {isRootLayer: false, interaction: 'mouse'}
  ): string {
    const command = new CreateNarrativeNodeCommand(position, data, this.projectId);
    this._executeWithProtection(command, `createNarrative:${JSON.stringify(position)}`);

    // Получаем ID текущего слоя
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;
    const layers = graphStore.layers;

    // Трекинг создания нарративного узла
    trackObjectCreation('Narrative', currentGraphId, layers, {
      isRootLayer: options.isRootLayer,
      interaction: options.interaction
    });
    return command.nodeId;
  }

  /**
   * Удалить нарративный узел
   */
  public deleteNarrativeNode(nodeId: string): void {
    const command = new DeleteNarrativeNodeCommand(nodeId, this.projectId);
    this._executeWithProtection(command, `deleteNarrative:${nodeId}`);
  }

  /**
   * Переместить нарративный узел
   */
  public moveNarrativeNode(nodeId: string, newPosition: {x: number; y: number}): void {
    const command = new MoveNarrativeNodeCommand(nodeId, newPosition, this.projectId);
    this._executeWithProtection(command, `moveNarrative:${nodeId}`);
  }

  /**
   * Редактировать поля нарративного узла
   */
  public editNarrativeNode(nodeId: string, data: {title: string; text: string; attachedEntities?: string[]}): void {
    const command = new EditNarrativeNodeCommand(nodeId, data, this.projectId);
    this._executeWithProtection(command, `editNarrative:${nodeId}`);
  }

  /**
   * Соединить нарративный узел с другим узлом
   */
  // TODO: подумать, как унифицировать эту команду для всех типов узлов
  public connectNarrativeNode(connection: Connection): void {
    const graphStore = useGraphStore.getState();
    const command = new ConnectCommand(connection, graphStore.currentGraphId, this.projectId);
    const connId = `${connection.source}-${connection.target}`;
    this._executeWithProtection(command, `connect:${connId}`);
  }

  //
  // Узлы выбора
  //

  /**
   * Создать самостоятельный узел выбора
   * @param position Позиция узла
   * @param choiceText Текст выбора
   * @param options Дополнительные опции для трекинга
   */
  public createChoiceNode(
    position: {x: number; y: number},
    choiceText: string = '',
    options: {isRootLayer: boolean; interaction: 'mouse' | 'hotkey'} = {isRootLayer: false, interaction: 'mouse'}
  ): string {
    const command = new CreateChoiceNodeCommand(position, choiceText, this.projectId);
    this._executeWithProtection(command, `createChoice:${JSON.stringify(position)}`);

    // Получаем ID текущего слоя
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;
    const layers = graphStore.layers;

    // Трекинг создания узла выбора
    trackObjectCreation('Choice', currentGraphId, layers, {
      isRootLayer: options.isRootLayer,
      interaction: options.interaction
    });
    return command.choiceId;
  }

  /**
   * Удалить узел выбора
   */
  public deleteChoiceNode(nodeId: string): void {
    const command = new DeleteChoiceNodeCommand(nodeId, this.projectId);
    this._executeWithProtection(command, `deleteChoice:${nodeId}`);
  }

  /**
   * Редактировать текст узла выбора
   */
  public editChoiceNodeText(nodeId: string, newText: string): void {
    const command = new EditChoiceNodeTextCommand(nodeId, newText, this.projectId);
    this._executeWithProtection(command, `editChoice:${nodeId}`);
  }

  /**
   * Переместить узел выбора
   */
  public moveChoiceNode(nodeId: string, newPosition: {x: number; y: number}): void {
    const command = new MoveChoiceNodeCommand(nodeId, newPosition, this.projectId);
    this._executeWithProtection(command, `moveChoice:${nodeId}`);
  }

  /**
   * Соединить узел выбора с другим узлом
   */
  public connectChoiceNode(connection: Connection): void {
    const graphStore = useGraphStore.getState();
    const command = new ConnectCommand(connection, graphStore.currentGraphId, this.projectId);
    const connId = `${connection.source}-${connection.target}`;
    this._executeWithProtection(command, `connect:${connId}`);
  }

  //
  // Слои
  //

  /**
   * Создать слой
   * @param position Позиция слоя
   * @param name Имя слоя
   * @param options Дополнительные опции для трекинга
   */
  public createLayer(position: {x: number; y: number}, name: string = '', options: {isRootLayer: boolean; interaction: 'mouse' | 'hotkey'} = {isRootLayer: false, interaction: 'mouse'}): void {
    const command = new CreateLayerCommand(position, name, this.projectId);
    this._executeWithProtection(command, `createLayer:${JSON.stringify(position)}`);

    // Получаем ID текущего слоя
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;
    const layers = graphStore.layers;

    // Трекинг создания слоя
    trackObjectCreation('Layer', currentGraphId, layers, {
      isRootLayer: options.isRootLayer,
      interaction: options.interaction
    });
  }

  /**
   * Удалить слой
   */
  public deleteLayer(layerId: string): void {
    const command = new DeleteLayerCommand(layerId, this.projectId);
    this._executeWithProtection(command, `deleteLayer:${layerId}`);
  }

  /**
   * Редактировать поля слоя
   */
  public editLayer(layerId: string, name: string, description?: string): void {
    const command = new EditLayerCommand(layerId, name, description, this.projectId);
    this._executeWithProtection(command, `editLayer:${layerId}`);
  }

  /**
   * Переместить слой
   */
  public moveLayer(layerId: string, newPosition: {x: number; y: number}): void {
    const command = new MoveLayerCommand(layerId, newPosition, this.projectId);
    this._executeWithProtection(command, `moveLayer:${layerId}`);
  }

  //
  // Заметки
  //

  /**
   * Создать заметку
   * @param position Позиция заметки
   * @param text Текст заметки
   * @param color Цвет заметки
   * @param options Дополнительные опции для трекинга
   */
  public createNote(
    position: {x: number; y: number},
    text: string = '',
    color?: string,
    options: {isRootLayer: boolean; interaction: 'mouse' | 'hotkey'} = {isRootLayer: false, interaction: 'mouse'}
  ): void {
    const command = new CreateNoteCommand(position, text, color, this.projectId);
    this._executeWithProtection(command, `createNote:${JSON.stringify(position)}`);

    // Получаем ID текущего слоя
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;
    const layers = graphStore.layers;

    // Трекинг создания заметки
    trackObjectCreation('Note', currentGraphId, layers, {
      isRootLayer: options.isRootLayer,
      interaction: options.interaction
    });
  }

  /**
   * Удалить заметку
   */
  public deleteNote(noteId: string): void {
    const command = new DeleteNoteCommand(noteId, this.projectId);
    this._executeWithProtection(command, `deleteNote:${noteId}`);
  }

  /**
   * Редактировать текст заметки
   */
  public editNote(noteId: string, text: string): void {
    const command = new EditNoteCommand(noteId, text, this.projectId);
    this._executeWithProtection(command, `editNote:${noteId}`);
  }

  /**
   * Изменить цвет заметки
   */
  public changeNoteColor(noteId: string, color: string): void {
    const command = new ChangeNoteColorCommand(noteId, color, this.projectId);
    this._executeWithProtection(command, `changeNoteColor:${noteId}`);
  }

  /**
   * Переместить заметку
   */
  public moveNote(noteId: string, newPosition: {x: number; y: number}): void {
    const command = new MoveNoteCommand(noteId, newPosition, this.projectId);
    this._executeWithProtection(command, `moveNote:${noteId}`);
  }

  /**
   * Удалить узел любого типа (общая команда)
   */
  public deleteGenericNode(nodeId: string): void {
    const command = new DeleteGenericNodeCommand(nodeId);
    this._executeWithProtection(command, `deleteGeneric:${nodeId}`);
  }

  /**
   * Удалить операцию
   * @param operationId ID операции для удаления
   */
  public deleteOperation(operationId: string): void {
    const command = new DeleteOperationCommand(operationId, this.projectId);
    this._executeWithProtection(command, `delete-operation-${operationId}`);
  }

  public createOperation(nodeId: string, operation: VariableOperation): void {
    const command = new CreateOperationCommand(nodeId, operation, this.projectId);
    this._executeWithProtection(command, `create-operation-${operation.id}`);
  }

  public updateOperation(nodeId: string, operationId: string, updates: Partial<VariableOperation>): void {
    const command = new UpdateOperationCommand(nodeId, operationId, updates, this.projectId);
    this._executeWithProtection(command, `update-operation-${operationId}`);
  }

  public toggleOperation(nodeId: string, operationId: string): void {
    const command = new ToggleOperationCommand(nodeId, operationId, this.projectId);
    this._executeWithProtection(command, `toggle-operation-${operationId}`);
  }

  public toggleAllNodeOperations(nodeId: string, enabled: boolean): void {
    const command = new ToggleAllOperationsCommand(nodeId, enabled, this.projectId);
    this._executeWithProtection(command, `toggle-all-operations-${nodeId}`);
  }

  /**
   * Дублировать выделенные узлы с интеллектуальным размещением
   */
  public duplicateSelectedNodes(): void {
    const canvasStore = useCanvasStore.getState();
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;
    const currentLayer = graphStore.layers[currentGraphId];

    // Получаем выбранные узлы
    const selectedNodes = canvasStore.nodes.filter((node) => node.selected);

    if (selectedNodes.length === 0) {
      // Уведомление, если нечего дублировать
      getNotificationManager().showError(i18n.t('clipboard.nothing_to_duplicate') || 'Nothing to duplicate', true, 3000);
      return;
    }

    // Получаем их ID
    const selectedNodeIds = selectedNodes.map((node) => node.id);

    // Проверяем, что эти узлы действительно существуют в текущем слое
    if (!currentLayer) {
      getNotificationManager().showError(i18n.t('errors.layer_not_found') || 'Error: current layer not found', true, 3000);
      return;
    }

    // Получаем реальные узлы из графа с правильными типами
    const nodesFromGraph = selectedNodeIds.map((id) => ({
      id,
      node: currentLayer.nodes[id],
      exists: !!currentLayer.nodes[id]
    }));

    // Фильтруем только существующие узлы
    const existingSelectedNodeIds = nodesFromGraph.filter((item) => item.exists).map((item) => item.id);

    if (existingSelectedNodeIds.length === 0) {
      // Уведомление, если ни один узел не найден в текущем слое
      getNotificationManager().showError(i18n.t('clipboard.nothing_to_duplicate') || 'Nothing to duplicate', true, 3000);
      return;
    }

    // Если дублируется несколько узлов, сначала копируем их и их связи в буфер
    if (existingSelectedNodeIds.length > 1) {
      // Создаем массив узлов для копирования
      const nodesToCopy: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[] = [];

      // Собираем узлы
      for (const nodeId of existingSelectedNodeIds) {
        const node = currentLayer.nodes[nodeId];
        if (node) {
          nodesToCopy.push(node);
        }
      }

      // Находим внутренние связи между выбранными узлами
      const internalEdges: Link[] = [];
      const nodeIdSet = new Set(existingSelectedNodeIds);

      Object.values(currentLayer.edges).forEach((edge) => {
        if (nodeIdSet.has(edge.startNodeId) && nodeIdSet.has(edge.endNodeId)) {
          // Сохраняем внутренние связи с глубоким копированием условий
          internalEdges.push({
            ...edge,
            conditions: JSON.parse(JSON.stringify(edge.conditions))
          });
        }
      });

      // Временно сохраняем в буфер обмена для использования в команде дублирования
      graphStore.setCopiedNodes(nodesToCopy, internalEdges);
    }

    // Создаем и выполняем команду дублирования
    const currentTimelineId = graphStore.currentTimelineId || getCurrentTimelineId();

    if (!currentTimelineId) {
      console.warn('CommandManager: No timelineId available for duplication operation');
      getNotificationManager().showError('Unable to duplicate nodes: timeline not found', true, 3000);
      return;
    }

    const command = new DuplicateNodesCommand(existingSelectedNodeIds, this.projectId!, currentTimelineId);
    this._executeWithProtection(command, `duplicateNodes:${existingSelectedNodeIds.join(',')}`);

    // Показываем уведомление об успешном дублировании
    if (existingSelectedNodeIds.length === 1) {
      getNotificationManager().showSuccess(i18n.t('clipboard.node_duplicated'), true, 2000);
    } else {
      getNotificationManager().showSuccess(i18n.t('clipboard.nodes_duplicated', {count: existingSelectedNodeIds.length}), true, 2000);
    }

    // После всех операций, обновим канвас принудительно для синхронизации
    const updatedGraphStore = useGraphStore.getState();
    refreshSpecificLayers([updatedGraphStore.currentGraphId], true);
  }

  /**
   * Вставить узлы из буфера обмена
   */
  public pasteNodes(): void {
    const currentTimelineId = useGraphStore.getState().currentTimelineId || getCurrentTimelineId();

    if (!currentTimelineId) {
      console.warn('CommandManager: No timelineId available for paste operation');
      getNotificationManager().showError('Unable to paste nodes: timeline not found', true, 3000);
      return;
    }
    const command = new PasteNodesCommand(this.projectId!, currentTimelineId);
    this._executeWithProtection(command, `pasteNodes`);
  }

  /**
   * Вырезать выбранные узлы
   */
  public cutNodes(): void {
    const canvasStore = useCanvasStore.getState();
    const cutGraphStore = useGraphStore.getState();
    const currentGraphId = cutGraphStore.currentGraphId;

    // Получаем выбранные узлы
    const selectedNodes = canvasStore.nodes.filter((node) => node.selected);
    if (selectedNodes.length === 0) {
      // Уведомление, если нечего вырезать
      getNotificationManager().showError(i18n.t('clipboard.nothing_to_cut') || 'Nothing to cut', true, 3000);
      return;
    }

    // Получаем их ID
    const selectedNodeIds = selectedNodes.map((node) => node.id);

    // Проверяем, что эти узлы действительно существуют в текущем слое
    const currentLayer = cutGraphStore.layers[currentGraphId];
    const existingSelectedNodeIds = selectedNodeIds.filter((id) => currentLayer.nodes[id]);

    if (existingSelectedNodeIds.length === 0) {
      // Уведомление, если ни один узел не найден в текущем слое
      getNotificationManager().showError(i18n.t('clipboard.nothing_to_cut') || 'Nothing to cut', true, 3000);
      return;
    }

    // Создаем и выполняем команду вырезания
    const graphStore = useGraphStore.getState();
    const currentTimelineId = graphStore.currentTimelineId || getCurrentTimelineId();

    if (!currentTimelineId) {
      console.warn('CommandManager: No timelineId available for cut operation');
      getNotificationManager().showError('Unable to cut nodes: timeline not found', true, 3000);
      return;
    }

    const command = new CutNodesCommand(this.projectId!, currentTimelineId);
    this._executeWithProtection(command, `cutNodes:${existingSelectedNodeIds.join(',')}`);
  }

  //
  // Общие команды
  //

  /**
   * Обработка изменений позиций узлов с учетом их типа
   */
  public handleNodesChange(changes: NodeChange[]): void {
    // Фильтруем только изменения позиции, так как другие типы изменений
    // обрабатываются другими командами
    const positionChanges = changes.filter((change) => change.type === 'position' && change.position);

    // Обрабатываем каждое изменение позиции
    positionChanges.forEach((change) => {
      if (change.type === 'position' && change.position) {
        // Получаем тип узла для определения команды перемещения
        const graphStore = useGraphStore.getState();
        const currentLayer = graphStore.layers[graphStore.currentGraphId];
        const node = currentLayer.nodes[change.id];

        if (node) {
          // Создаем уникальный идентификатор команды, учитывающий округленные координаты
          // для избежания множественных событий при мелких движениях мыши
          const roundedX = Math.round(change.position.x);
          const roundedY = Math.round(change.position.y);
          const moveId = `move:${change.id}:${roundedX}:${roundedY}`;

          // Проверка на дублирование перед выполнением команды перемещения
          if (this._shouldSkipDuplicateCommand(moveId)) {
            return;
          }

          switch (node.type) {
            case 'narrative':
              this.moveNarrativeNode(change.id, change.position);
              break;
            case 'choice':
              this.moveChoiceNode(change.id, change.position);
              break;
            case 'layer':
              this.moveLayer(change.id, change.position);
              break;
            case 'note':
              this.moveNote(change.id, change.position);
              break;
            default:
              // По умолчанию используем moveNarrativeNode для всех остальных типов
              this.moveNarrativeNode(change.id, change.position);
          }
        }
      }
    });
  }

  /**
   * Удалить выбранные узлы
   */
  public deleteSelectedNodes(): void {
    const graphStore = useGraphStore.getState();
    const canvasStore = useCanvasStore.getState();

    // Получаем выбранные узлы из канваса
    const selectedNodes = canvasStore.nodes.filter((node) => node.selected);

    if (selectedNodes.length === 0) return;

    // Создаем уникальный идентификатор команды удаления
    const deleteId = `deleteSelected:${selectedNodes.map((n) => n.id).join(',')}`;

    // Проверка на дублирование
    if (this._shouldSkipDuplicateCommand(deleteId)) {
      return;
    }

    // Проверяем, что эти ID действительно существуют в текущем слое
    const currentLayer = graphStore.layers[graphStore.currentGraphId];
    const existingSelectedNodeIds = selectedNodes.map((node) => node.id).filter((id) => currentLayer.nodes[id]);

    if (existingSelectedNodeIds.length === 0) return;

    // Определяем, какие узлы уже были обработаны в составе групповых команд
    const processedNodeIds = new Set<string>();

    // Обработка выделенных узлов с учетом их взаимосвязей
    for (const nodeId of existingSelectedNodeIds) {
      // Пропускаем узлы, которые уже были обработаны ранее
      if (processedNodeIds.has(nodeId)) continue;

      if (currentLayer.nodes[nodeId]) {
        const node = currentLayer.nodes[nodeId] as NarrativeNode | ChoiceNode | LayerNode | NoteNode;

        switch (node.type) {
          case 'narrative':
            this.deleteNarrativeNode(nodeId);
            processedNodeIds.add(nodeId);
            break;

          case 'choice':
            this.deleteChoiceNode(nodeId);
            processedNodeIds.add(nodeId);
            break;

          case 'layer':
            this.deleteLayer(nodeId);
            processedNodeIds.add(nodeId);
            break;

          case 'note':
            this.deleteNote(nodeId);
            processedNodeIds.add(nodeId);
            break;

          default:
            // Удаление узла неизвестного типа
            this.deleteGenericNode(nodeId);
            processedNodeIds.add(nodeId);
        }
      }
    }

    // Синхронизируем с канвасом
    const canvasNodes = canvasStore.nodes.filter((node) => !existingSelectedNodeIds.includes(node.id));
    canvasStore.setNodes(canvasNodes);
  }

  /**
   * Удалить выбранные ребра (связи между узлами)
   */
  public deleteSelectedEdges(): void {
    const canvasStore = useCanvasStore.getState();

    // Получаем выбранные ребра из канваса
    const selectedEdges = canvasStore.edges.filter((edge) => edge.selected);

    if (selectedEdges.length === 0) return;

    // Создаем уникальный идентификатор команды удаления
    const deleteId = `deleteSelectedEdges:${selectedEdges.map((e) => e.id).join(',')}`;

    // Проверка на дублирование
    if (this._shouldSkipDuplicateCommand(deleteId)) {
      return;
    }

    // Удаляем каждое выбранное ребро
    for (const edge of selectedEdges) {
      this.deleteEdge(edge.id);
    }
  }

  /**
   * Удалить ребро (связь между узлами)
   */
  public deleteEdge(edgeId: string): void {
    this._executeWithProtection(new DeleteEdgeCommand(edgeId, this.projectId), `deleteEdge:${edgeId}`);
  }

  /**
   * Обновить условия связи
   */
  public updateEdgeConditions(edgeId: string, conditions: ConditionGroup[]): void {
    const command = new UpdateEdgeConditionsCommand(edgeId, conditions, this.projectId);
    this._executeWithProtection(command, `update-edge-conditions-${edgeId}`);
  }

  /**
   * Групповое перемещение узлов
   */
  public moveNodes(changes: NodeChange[]): void {
    const command = new MoveNodesCommand(changes, this.projectId);
    this._executeWithProtection(command, `move-nodes-${changes.map((c) => ('id' in c ? c.id : '')).join('-')}`);
  }

  // --- Управление переменными ---

  public createVariable(variable: Variable): void {
    const command = new CreateVariableCommand(variable, this.projectId);
    this._executeWithProtection(command, `create-variable-${variable.id}`);
  }

  public updateVariable(variableId: string, updates: Partial<Variable>): void {
    const command = new UpdateVariableCommand(variableId, updates, this.projectId);
    this._executeWithProtection(command, `update-variable-${variableId}`);
  }

  public deleteVariable(variableId: string): void {
    const command = new DeleteVariableCommand(variableId, this.projectId);
    this._executeWithProtection(command, `delete-variable-${variableId}`);
  }
}

// Вспомогательная функция для доступа к командам из разных частей приложения
export const getCommandManager = (): CommandManager => {
  return CommandManager.getInstance();
};
