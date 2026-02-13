import {Connection, Edge, NodeChange} from '@xyflow/react';
import {nanoid} from 'nanoid';

import {getNotificationManager} from '@components/Notifications';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {LayerNode, Link, NarrativeNode} from '../types/nodes';
import {Command} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

/**
 * Команда для создания нарративного узла
 */
export class CreateNarrativeNodeCommand implements Command {
  public readonly nodeId: string;
  private node: NarrativeNode;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private originalLayerId: string;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param position Позиция нового узла
   * @param data Данные нового узла (текст, заголовок и прикрепленные сущности)
   */
  constructor(position: {x: number; y: number}, data: {title: string; text: string; attachedEntities?: string[]} = {title: '', text: ''}, projectId?: string) {
    this.nodeId = nanoid();
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.originalLayerId = this.graphStore.currentGraphId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    this.node = {
      id: this.nodeId,
      type: 'narrative',
      coordinates: position,
      data: data
    };
  }

  /**
   * Возвращает ID слоя, к которому относится эта команда
   */
  getLayerId(): string {
    return this.originalLayerId;
  }

  /**
   * Проверяет, безопасно ли выполнить повтор операции
   */
  canSafelyRedo(): boolean {
    // Получаем актуальное состояние графа
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Проверяем, находимся ли мы в том же слое, где была создана команда
    if (currentGraphId !== this.originalLayerId) {
      console.warn(`Невозможно выполнить повтор создания нарративного узла, так как вы находитесь в другом слое (${currentGraphId})`);

      // Получаем название слоя
      const layerName = this.getLayerName() || this.originalLayerId;

      // Формируем путь в зависимости от ID слоя
      const path = this.originalLayerId === 'root' ? `/${this.projectId}/editor` : `/${this.projectId}/editor/${this.originalLayerId}`;

      getNotificationManager().showErrorWithNavigation(
        `Can't repeat the narrative node creation operation because you are in a different layer. Please navigate to layer "${layerName}" and try again.`,
        'Open layer',
        path
      );

      return false;
    }

    return true;
  }

  /**
   * Получает название слоя, к которому относится команда
   */
  private getLayerName(): string | null {
    const graphStore = useGraphStore.getState();

    // Если это корневой слой
    if (this.originalLayerId === 'root') {
      return 'Main layer';
    }

    // Получаем слой по ID
    const layer = graphStore.layers[this.originalLayerId];
    if (layer && layer.name) {
      return layer.name;
    }

    // Ищем слой в списке узлов всех слоев
    for (const currentLayerId in graphStore.layers) {
      const currentLayer = graphStore.layers[currentLayerId];
      const layerNode = currentLayer.nodes[this.originalLayerId];

      if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
        return layerNode.name;
      }
    }

    return null;
  }

  execute(): void {
    this.graphStore.addNode(this.node);

    // Выбираем узел в канвасе
    this.canvasStore.selectNode(this.nodeId);

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.added',
        {
          layerId: this.originalLayerId,
          node: this.node
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  undo(): void {
    this.graphStore.removeNode(this.nodeId);

    // Очищаем все ссылки на этот узел во всех слоях
    this.cleanReferencesInAllLayers();

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.added.undo',
        {
          nodeId: this.nodeId,
          layerId: this.originalLayerId
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  /**
   * Очищает все ссылки на этот узел во всех слоях
   */
  private cleanReferencesInAllLayers(): void {
    const {layers} = useGraphStore.getState();

    // Ищем и очищаем ссылки на удаленный узел
    for (const layerId in layers) {
      // Пропускаем оригинальный слой, так как он уже обновлен
      if (layerId === this.originalLayerId) continue;

      const layer = layers[layerId];

      // Ищем все узлы типа layer в этом слое
      const layerNodes = Object.values(layer.nodes).filter((node) => node.type === 'layer') as LayerNode[];

      for (const layerNode of layerNodes) {
        let needsUpdate = false;

        // Очищаем из startingNodes
        if (layerNode.startingNodes && layerNode.startingNodes.length > 0) {
          const updatedStartingNodes = layerNode.startingNodes.filter((node: any) => node.id !== this.nodeId);

          if (updatedStartingNodes.length !== layerNode.startingNodes.length) {
            needsUpdate = true;

            // Обновляем узел слоя
            const updatedNode: LayerNode = {
              ...layerNode,
              startingNodes: updatedStartingNodes
            };

            // Обновляем слой
            const updatedLayer = {
              ...layer,
              nodes: {
                ...layer.nodes,
                [layerNode.id]: updatedNode
              }
            };

            // Обновляем слои
            const updatedLayers = {
              ...useGraphStore.getState().layers,
              [layerId]: updatedLayer
            };

            // Обновляем состояние
            useGraphStore.setState({
              layers: updatedLayers
            });
          }
        }

        // Очищаем из endingNodes
        if (layerNode.endingNodes && layerNode.endingNodes.length > 0) {
          const updatedEndingNodes = layerNode.endingNodes.filter((node: any) => node.id !== this.nodeId);

          if (updatedEndingNodes.length !== layerNode.endingNodes.length) {
            // Получаем актуальный слой и узел (возможно состояние изменилось в предыдущем шаге)
            const currentLayers = useGraphStore.getState().layers;
            const currentLayer = currentLayers[layerId];
            const currentLayerNode = currentLayer.nodes[layerNode.id] as LayerNode;

            // Обновляем узел слоя
            const updatedNode: LayerNode = {
              ...currentLayerNode,
              endingNodes: updatedEndingNodes
            };

            // Обновляем слой
            const updatedLayer = {
              ...currentLayer,
              nodes: {
                ...currentLayer.nodes,
                [layerNode.id]: updatedNode
              }
            };

            // Обновляем слои
            const updatedLayers = {
              ...currentLayers,
              [layerId]: updatedLayer
            };

            // Обновляем состояние
            useGraphStore.setState({
              layers: updatedLayers
            });
          }
        }
      }
    }
  }

  redo(): void {
    this.execute();
  }

  getType(): string {
    return 'CreateNarrativeNode';
  }
}

/**
 * Команда для удаления нарративного узла
 */
export class DeleteNarrativeNodeCommand implements Command {
  private nodeId: string;
  private node: NarrativeNode | null = null;
  private connectedLinks: Link[] = [];
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private originalLayerId: string;
  private projectId?: string;
  private timelineId: string;
  private startingNodesRefs: {layerId: string; nodeId: string}[] = [];
  private endingNodesRefs: {layerId: string; nodeId: string}[] = [];

  /**
   * @param nodeId ID узла для удаления
   */
  constructor(nodeId: string, projectId?: string) {
    this.nodeId = nodeId;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.originalLayerId = this.graphStore.currentGraphId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем данные узла и его связи для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    if (currentGraph && currentGraph.nodes[nodeId]) {
      this.node = currentGraph.nodes[nodeId] as NarrativeNode;

      // Сохраняем связи (с полным клонированием, включая условия)
      Object.values(currentGraph.edges).forEach((edge) => {
        if (edge.startNodeId === nodeId || edge.endNodeId === nodeId) {
          // Создаем глубокую копию ребра, чтобы сохранить все свойства, включая условия
          this.connectedLinks.push({...edge, conditions: JSON.parse(JSON.stringify(edge.conditions))});
        }
      });
    }

    // Сохраняем ссылки на этот узел во всех слоях
    this.saveReferencesFromAllLayers();
  }

  /**
   * Возвращает ID слоя, к которому относится эта команда
   */
  getLayerId(): string {
    return this.originalLayerId;
  }

  /**
   * Проверяет, безопасно ли выполнить повтор операции
   */
  canSafelyRedo(): boolean {
    // Получаем актуальное состояние графа
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Проверяем, находимся ли мы в том же слое, где была создана команда
    if (currentGraphId !== this.originalLayerId) {
      console.warn(`Невозможно выполнить повтор удаления нарративного узла, так как вы находитесь в другом слое (${currentGraphId})`);

      // Получаем название слоя
      const layerName = this.getLayerName() || this.originalLayerId;

      // Формируем путь в зависимости от ID слоя
      const path = this.originalLayerId === 'root' ? `/${this.projectId}/editor` : `/${this.projectId}/editor/${this.originalLayerId}`;

      getNotificationManager().showErrorWithNavigation(
        `Can't repeat the narrative node deletion operation because you are in a different layer. Please navigate to layer "${layerName}" and try again.`,
        'Open layer',
        path
      );

      return false;
    }

    return true;
  }

  /**
   * Получает название слоя, к которому относится команда
   */
  private getLayerName(): string | null {
    const graphStore = useGraphStore.getState();

    // Если это корневой слой
    if (this.originalLayerId === 'root') {
      return 'Main layer';
    }

    // Получаем слой по ID
    const layer = graphStore.layers[this.originalLayerId];
    if (layer && layer.name) {
      return layer.name;
    }

    // Ищем слой в списке узлов всех слоев
    for (const currentLayerId in graphStore.layers) {
      const currentLayer = graphStore.layers[currentLayerId];
      const layerNode = currentLayer.nodes[this.originalLayerId];

      if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
        return layerNode.name;
      }
    }

    return null;
  }

  /**
   * Сохраняет ссылки на этот узел из всех слоев
   */
  private saveReferencesFromAllLayers(): void {
    const {layers} = this.graphStore;

    for (const layerId in layers) {
      if (layerId === this.originalLayerId) continue;

      const layer = layers[layerId];

      // Ищем все узлы типа layer в этом слое
      const layerNodes = Object.values(layer.nodes).filter((node) => node.type === 'layer') as LayerNode[];

      for (const layerNode of layerNodes) {
        // Проверяем startingNodes
        if (layerNode.startingNodes && layerNode.startingNodes.length > 0) {
          const hasReference = layerNode.startingNodes.some((node: any) => node.id === this.nodeId);

          if (hasReference) {
            this.startingNodesRefs.push({
              layerId,
              nodeId: layerNode.id
            });
          }
        }

        // Проверяем endingNodes
        if (layerNode.endingNodes && layerNode.endingNodes.length > 0) {
          const hasReference = layerNode.endingNodes.some((node: any) => node.id === this.nodeId);

          if (hasReference) {
            this.endingNodesRefs.push({
              layerId,
              nodeId: layerNode.id
            });
          }
        }
      }
    }
  }

  execute(): void {
    if (this.node) {
      this.graphStore.removeNode(this.nodeId);

      // Очищаем ссылки на этот узел во всех слоях
      this.cleanReferencesInAllLayers();

      // Генерируем и сохраняем операцию в фоне
      if (this.projectId) {
        generateAndSaveOperation(
          'node.deleted',
          {
            nodeId: this.nodeId,
            layerId: this.originalLayerId
          },
          this.projectId,
          this.timelineId,
          this.originalLayerId
        );
      }
    }
  }

  /**
   * Очищает все ссылки на этот узел во всех слоях
   */
  private cleanReferencesInAllLayers(): void {
    const {layers} = useGraphStore.getState();

    // Очищаем ссылки из startingNodes
    this.startingNodesRefs.forEach(({layerId, nodeId}) => {
      if (!layers[layerId] || !layers[layerId].nodes[nodeId]) return;

      const layerNode = layers[layerId].nodes[nodeId] as LayerNode;

      if (layerNode.startingNodes && layerNode.startingNodes.length > 0) {
        const updatedStartingNodes = layerNode.startingNodes.filter((node: any) => node.id !== this.nodeId);

        // Обновляем узел слоя
        const updatedNode: LayerNode = {
          ...layerNode,
          startingNodes: updatedStartingNodes
        };

        // Обновляем слой
        const updatedLayer = {
          ...layers[layerId],
          nodes: {
            ...layers[layerId].nodes,
            [nodeId]: updatedNode
          }
        };

        // Обновляем слои
        const updatedLayers = {
          ...layers,
          [layerId]: updatedLayer
        };

        // Обновляем состояние
        useGraphStore.setState({
          layers: updatedLayers
        });
      }
    });

    // Очищаем ссылки из endingNodes
    this.endingNodesRefs.forEach(({layerId, nodeId}) => {
      // Получаем актуальное состояние
      const currentLayers = useGraphStore.getState().layers;

      if (!currentLayers[layerId] || !currentLayers[layerId].nodes[nodeId]) return;

      const layerNode = currentLayers[layerId].nodes[nodeId] as LayerNode;

      if (layerNode.endingNodes && layerNode.endingNodes.length > 0) {
        const updatedEndingNodes = layerNode.endingNodes.filter((node: any) => node.id !== this.nodeId);

        // Обновляем узел слоя
        const updatedNode: LayerNode = {
          ...layerNode,
          endingNodes: updatedEndingNodes
        };

        // Обновляем слой
        const updatedLayer = {
          ...currentLayers[layerId],
          nodes: {
            ...currentLayers[layerId].nodes,
            [nodeId]: updatedNode
          }
        };

        // Обновляем слои
        const updatedLayers = {
          ...currentLayers,
          [layerId]: updatedLayer
        };

        // Обновляем состояние
        useGraphStore.setState({
          layers: updatedLayers
        });
      }
    });
  }

  /**
   * Восстанавливает ссылки на этот узел во всех слоях
   */
  private restoreReferencesInAllLayers(): void {
    if (!this.node) return;

    const {layers} = useGraphStore.getState();

    // Восстанавливаем ссылки в startingNodes
    this.startingNodesRefs.forEach(({layerId, nodeId}) => {
      if (!layers[layerId] || !layers[layerId].nodes[nodeId]) return;

      const layerNode = layers[layerId].nodes[nodeId] as LayerNode;
      const startingNodes = layerNode.startingNodes || [];

      // Проверяем, что этот узел еще не добавлен
      const alreadyExists = startingNodes.some((node: any) => node.id === this.nodeId);

      if (!alreadyExists) {
        // Создаем обертку узла для startingNodes
        const nodeReference = {
          id: this.nodeId,
          type: 'narrative' as const,
          data: this.node!.data,
          coordinates: this.node!.coordinates,
          isConnected: false // По умолчанию не подключен
        };

        // Обновляем узел слоя
        const updatedNode: LayerNode = {
          ...layerNode,
          startingNodes: [...startingNodes, nodeReference]
        };

        // Обновляем слой
        const updatedLayer = {
          ...layers[layerId],
          nodes: {
            ...layers[layerId].nodes,
            [nodeId]: updatedNode
          }
        };

        // Обновляем слои
        const updatedLayers = {
          ...layers,
          [layerId]: updatedLayer
        };

        // Обновляем состояние
        useGraphStore.setState({
          layers: updatedLayers
        });
      }
    });

    // Восстанавливаем ссылки в endingNodes
    this.endingNodesRefs.forEach(({layerId, nodeId}) => {
      // Получаем актуальное состояние
      const currentLayers = useGraphStore.getState().layers;

      if (!currentLayers[layerId] || !currentLayers[layerId].nodes[nodeId]) return;

      const layerNode = currentLayers[layerId].nodes[nodeId] as LayerNode;
      const endingNodes = layerNode.endingNodes || [];

      // Проверяем, что этот узел еще не добавлен
      const alreadyExists = endingNodes.some((node: any) => node.id === this.nodeId);

      if (!alreadyExists) {
        // Создаем обертку узла для endingNodes
        const nodeReference = {
          id: this.nodeId,
          type: 'narrative' as const,
          data: this.node!.data,
          coordinates: this.node!.coordinates,
          isConnected: false // По умолчанию не подключен
        };

        // Обновляем узел слоя
        const updatedNode: LayerNode = {
          ...layerNode,
          endingNodes: [...endingNodes, nodeReference]
        };

        // Обновляем слой
        const updatedLayer = {
          ...currentLayers[layerId],
          nodes: {
            ...currentLayers[layerId].nodes,
            [nodeId]: updatedNode
          }
        };

        // Обновляем слои
        const updatedLayers = {
          ...currentLayers,
          [layerId]: updatedLayer
        };

        // Обновляем состояние
        useGraphStore.setState({
          layers: updatedLayers
        });
      }
    });
  }

  undo(): void {
    if (this.node) {
      // Восстанавливаем узел
      this.graphStore.addNode(this.node);

      // Восстанавливаем связи
      this.connectedLinks.forEach((link) => {
        this.graphStore.addEdge(link);
      });

      // Восстанавливаем ссылки на этот узел во всех слоях
      this.restoreReferencesInAllLayers();

      // Генерируем операцию для undo
      if (this.projectId) {
        generateAndSaveOperation(
          'node.deleted.undo',
          {
            node: this.node,
            connectedLinks: this.connectedLinks,
            startingNodesRefs: this.startingNodesRefs,
            endingNodesRefs: this.endingNodesRefs,
            layerId: this.originalLayerId
          },
          this.projectId,
          this.timelineId,
          this.originalLayerId
        );
      }
    }
  }

  redo(): void {
    this.execute();
  }

  getType(): string {
    return 'DeleteNarrativeNode';
  }
}

/**
 * Команда для перемещения нарративного узла
 */
export class MoveNarrativeNodeCommand implements Command {
  private nodeId: string;
  private oldPosition: {x: number; y: number};
  private newPosition: {x: number; y: number};
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private originalLayerId: string;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param nodeId ID узла для перемещения
   * @param newPosition Новая позиция узла
   */
  constructor(nodeId: string, newPosition: {x: number; y: number}, projectId?: string) {
    this.nodeId = nodeId;
    this.newPosition = newPosition;
    this.graphStore = useGraphStore.getState();
    this.originalLayerId = this.graphStore.currentGraphId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старую позицию для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    const node = currentGraph.nodes[nodeId] as NarrativeNode;
    this.oldPosition = {...node.coordinates};
  }

  /**
   * Возвращает ID слоя, к которому относится эта команда
   */
  getLayerId(): string {
    return this.originalLayerId;
  }

  /**
   * Проверяет, безопасно ли выполнить повтор операции
   */
  canSafelyRedo(): boolean {
    // Получаем актуальное состояние графа
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Проверяем, находимся ли мы в том же слое, где была создана команда
    if (currentGraphId !== this.originalLayerId) {
      console.warn(`Невозможно выполнить повтор перемещения нарративного узла, так как вы находитесь в другом слое (${currentGraphId})`);

      // Получаем название слоя
      const layerName = this.getLayerName() || this.originalLayerId;

      // Формируем путь в зависимости от ID слоя
      const path = this.originalLayerId === 'root' ? `/${this.projectId}/editor` : `/${this.projectId}/editor/${this.originalLayerId}`;

      getNotificationManager().showErrorWithNavigation(
        `Can't repeat the narrative node movement operation because you are in a different layer. Please navigate to layer "${layerName}" and try again.`,
        'Open layer',
        path
      );

      return false;
    }

    return true;
  }

  /**
   * Получает название слоя, к которому относится команда
   */
  private getLayerName(): string | null {
    const graphStore = useGraphStore.getState();

    // Если это корневой слой
    if (this.originalLayerId === 'root') {
      return 'Main layer';
    }

    // Получаем слой по ID
    const layer = graphStore.layers[this.originalLayerId];
    if (layer && layer.name) {
      return layer.name;
    }

    // Ищем слой в списке узлов всех слоев
    for (const currentLayerId in graphStore.layers) {
      const currentLayer = graphStore.layers[currentLayerId];
      const layerNode = currentLayer.nodes[this.originalLayerId];

      if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
        return layerNode.name;
      }
    }

    return null;
  }

  execute(): void {
    const changes: NodeChange[] = [
      {
        id: this.nodeId,
        type: 'position',
        position: this.newPosition
      }
    ];
    this.graphStore.onNodesChange(changes);

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.moved',
        {
          nodeId: this.nodeId,
          oldPosition: this.oldPosition,
          newPosition: this.newPosition
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  undo(): void {
    const changes: NodeChange[] = [
      {
        id: this.nodeId,
        type: 'position',
        position: this.oldPosition
      }
    ];
    this.graphStore.onNodesChange(changes);

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.moved.undo',
        {
          nodeId: this.nodeId,
          oldPosition: this.newPosition,
          newPosition: this.oldPosition,
          layerId: this.originalLayerId
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  redo(): void {
    this.execute();
  }

  getType(): string {
    return 'MoveNarrativeNode';
  }
}

/**
 * Команда для редактирования полей нарративного узла
 */
export class EditNarrativeNodeCommand implements Command {
  private nodeId: string;
  private oldData: {title: string; text: string; attachedEntities?: string[]};
  private newData: {title: string; text: string; attachedEntities?: string[]};
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private originalLayerId: string; // Сохраняем ID слоя, в котором был изменен узел
  private projectId?: string;
  private timelineId: string;

  /**
   * @param nodeId ID узла для редактирования
   * @param newData Новые данные узла
   */
  constructor(nodeId: string, newData: {title: string; text: string; attachedEntities?: string[]}, projectId?: string) {
    this.nodeId = nodeId;
    this.newData = newData;
    this.graphStore = useGraphStore.getState();
    this.originalLayerId = this.graphStore.currentGraphId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старые данные для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    const node = currentGraph.nodes[nodeId] as NarrativeNode;
    this.oldData = {...node.data};
  }

  /**
   * Возвращает ID слоя, к которому относится эта команда
   */
  getLayerId(): string {
    return this.originalLayerId;
  }

  /**
   * Проверяет, безопасно ли выполнить повтор операции
   */
  canSafelyRedo(): boolean {
    // Получаем актуальное состояние графа
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Проверяем, находимся ли мы в том же слое, где была создана команда
    if (currentGraphId !== this.originalLayerId) {
      console.warn(`Невозможно выполнить повтор редактирования нарративного узла, так как вы находитесь в другом слое (${currentGraphId})`);

      // Получаем название слоя
      const layerName = this.getLayerName() || this.originalLayerId;

      // Формируем путь в зависимости от ID слоя
      const path = this.originalLayerId === 'root' ? `/${this.projectId}/editor` : `/${this.projectId}/editor/${this.originalLayerId}`;

      getNotificationManager().showErrorWithNavigation(
        `Can't repeat the narrative node editing operation because you are in a different layer. Please navigate to layer "${layerName}" and try again.`,
        'Open layer',
        path
      );

      return false;
    }

    return true;
  }

  /**
   * Получает название слоя, к которому относится команда
   */
  private getLayerName(): string | null {
    const graphStore = useGraphStore.getState();

    // Если это корневой слой
    if (this.originalLayerId === 'root') {
      return 'Main layer';
    }

    // Получаем слой по ID
    const layer = graphStore.layers[this.originalLayerId];
    if (layer && layer.name) {
      return layer.name;
    }

    // Ищем слой в списке узлов всех слоев
    for (const currentLayerId in graphStore.layers) {
      const currentLayer = graphStore.layers[currentLayerId];
      const layerNode = currentLayer.nodes[this.originalLayerId];

      if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
        return layerNode.name;
      }
    }

    return null;
  }

  /**
   * Находит и обновляет узел во всех слоях, где он может отображаться
   * @param data Новые данные для узла
   */
  private updateNodeEverywhere(data: {title: string; text: string}): void {
    // Обновляем узел в исходном слое
    this.graphStore.updateNodeData(this.nodeId, data);

    const {layers} = useGraphStore.getState();

    // Теперь ищем и обновляем этот узел во всех слоях,
    // где он может отображаться как часть startingNodes или endingNodes
    for (const layerId in layers) {
      // Пропускаем оригинальный слой, так как он уже обновлен
      if (layerId === this.originalLayerId) continue;

      const layer = layers[layerId];

      // Ищем все узлы типа layer в этом слое
      const layerNodes = Object.values(layer.nodes).filter((node) => node.type === 'layer') as LayerNode[];

      for (const layerNode of layerNodes) {
        let needsUpdate = false;

        // Проверяем startingNodes
        if (layerNode.startingNodes && layerNode.startingNodes.length > 0) {
          const updatedStartingNodes = layerNode.startingNodes.map((node: any) => {
            if (node.id === this.nodeId && node.type === 'narrative') {
              needsUpdate = true;
              return {
                ...node,
                data: {
                  title: data.title || '',
                  text: data.text
                }
              };
            }
            return node;
          });

          if (needsUpdate) {
            // Обновляем узел слоя
            const updatedNode: LayerNode = {
              ...layerNode,
              startingNodes: updatedStartingNodes
            };

            // Обновляем слой
            const updatedLayer = {
              ...layer,
              nodes: {
                ...layer.nodes,
                [layerNode.id]: updatedNode
              }
            };

            // Обновляем слои вместо объекта graphStore
            const updatedLayers = {
              ...useGraphStore.getState().layers,
              [layerId]: updatedLayer
            };

            // Обновляем состояние
            useGraphStore.setState({
              layers: updatedLayers
            });
          }
        }

        needsUpdate = false;
        // Проверяем endingNodes
        if (layerNode.endingNodes && layerNode.endingNodes.length > 0) {
          const updatedEndingNodes = layerNode.endingNodes.map((node: any) => {
            if (node.id === this.nodeId && node.type === 'narrative') {
              needsUpdate = true;
              return {
                ...node,
                data: {
                  title: data.title || '',
                  text: data.text
                }
              };
            }
            return node;
          });

          if (needsUpdate) {
            // Получаем актуальный слой и узел слоя
            const currentLayer = useGraphStore.getState().layers[layerId];
            const currentLayerNode = currentLayer.nodes[layerNode.id] as LayerNode;

            // Обновляем узел слоя
            const updatedNode: LayerNode = {
              ...currentLayerNode,
              endingNodes: updatedEndingNodes
            };

            // Обновляем слой
            const updatedLayer = {
              ...currentLayer,
              nodes: {
                ...currentLayer.nodes,
                [layerNode.id]: updatedNode
              }
            };

            // Обновляем слои
            const updatedLayers = {
              ...useGraphStore.getState().layers,
              [layerId]: updatedLayer
            };

            // Обновляем состояние
            useGraphStore.setState({
              layers: updatedLayers
            });
          }
        }
      }
    }
  }

  execute(): void {
    this.updateNodeEverywhere(this.newData);

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.updated',
        {
          nodeId: this.nodeId,
          oldData: this.oldData,
          newData: this.newData,
          nodeType: 'narrative'
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  undo(): void {
    this.updateNodeEverywhere(this.oldData);

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.updated.undo',
        {
          nodeId: this.nodeId,
          oldData: this.newData,
          newData: this.oldData,
          nodeType: 'narrative',
          layerId: this.originalLayerId
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  redo(): void {
    this.execute();
  }

  getType(): string {
    return 'EditNarrativeNode';
  }
}

/**
 * Команда для соединения нарративного узла с другим узлом
 */
export class ConnectNarrativeNodeCommand implements Command {
  private connection: Connection;
  private edgeId: string | null = null; // Изменяем на nullable
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private originalLayerId: string;
  private projectId?: string;
  private timelineId: string;
  private beforeEdges: Edge[] = []; // Сохраняем состояние до создания связи

  /**
   * @param connection Параметры соединения
   */
  constructor(connection: Connection, projectId?: string) {
    this.connection = connection;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.originalLayerId = this.graphStore.currentGraphId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;
  }

  /**
   * Возвращает ID слоя, к которому относится эта команда
   */
  getLayerId(): string {
    return this.originalLayerId;
  }

  /**
   * Находит и устанавливает ID ребра на основе source и target
   * @returns ID найденного ребра или null, если ребро не найдено
   */
  private findEdgeId(): string | null {
    // Обновляем хранилища для работы с актуальным состоянием
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Если параметры соединения неполные, не можем найти
    if (!this.connection.source || !this.connection.target) {
      return null;
    }

    // Получаем типы исходного и целевого узлов
    const sourceNode = this.canvasStore.nodes.find((node) => node.id === this.connection.source);
    const targetNode = this.canvasStore.nodes.find((node) => node.id === this.connection.target);
    const sourceType = sourceNode?.type || '';
    const targetType = targetNode?.type || '';

    // Ищем ребро в canvasStore
    let edgeInCanvas;

    // Если оба узла одного типа (кроме layer), проверяем только source и target
    if (sourceType && targetType && sourceType === targetType && sourceType !== 'layer') {
      edgeInCanvas = this.canvasStore.edges.find((edge) => edge.source === this.connection.source && edge.target === this.connection.target);
    } else {
      // Для связей разных типов узлов или с layer, учитываем и хэндлы
      edgeInCanvas = this.canvasStore.edges.find(
        (edge) =>
          edge.source === this.connection.source && edge.target === this.connection.target && edge.sourceHandle === this.connection.sourceHandle && edge.targetHandle === this.connection.targetHandle
      );
    }

    if (edgeInCanvas) {
      return edgeInCanvas.id;
    }

    // Если ничего не найдено, попробуем вернуть генерируемый ID
    return this.connection.source && this.connection.target ? `${this.connection.source}-${this.connection.target}` : null;
  }

  /**
   * Проверяет, безопасно ли выполнить повтор операции
   */
  canSafelyRedo(): boolean {
    // Получаем актуальное состояние графа
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Проверяем, находимся ли мы в том же слое, где была создана команда
    if (currentGraphId !== this.originalLayerId) {
      console.warn(`Невозможно выполнить повтор соединения узлов, так как вы находитесь в другом слое (${currentGraphId})`);

      // Получаем название слоя
      const layerName = this.getLayerName() || this.originalLayerId;

      // Формируем путь в зависимости от ID слоя
      const path = this.originalLayerId === 'root' ? `/${this.projectId}/editor` : `/${this.projectId}/editor/${this.originalLayerId}`;

      getNotificationManager().showErrorWithNavigation(
        `Can't repeat the narrative node connection operation because you are in a different layer. Please navigate to layer "${layerName}" and try again.`,
        'Open layer',
        path
      );

      return false;
    }

    return true;
  }

  /**
   * Получает название слоя, к которому относится команда
   */
  private getLayerName(): string | null {
    const graphStore = useGraphStore.getState();

    // Если это корневой слой
    if (this.originalLayerId === 'root') {
      return 'Main layer';
    }

    // Получаем слой по ID
    const layer = graphStore.layers[this.originalLayerId];
    if (layer && layer.name) {
      return layer.name;
    }

    // Ищем слой в списке узлов всех слоев
    for (const currentLayerId in graphStore.layers) {
      const currentLayer = graphStore.layers[currentLayerId];
      const layerNode = currentLayer.nodes[this.originalLayerId];

      if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
        return layerNode.name;
      }
    }

    return null;
  }

  execute(): void {
    // Обновляем хранилища для работы с актуальным состоянием
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Получаем типы исходного и целевого узлов
    const sourceNode = this.connection.source ? this.canvasStore.nodes.find((node) => node.id === this.connection.source) : null;
    const targetNode = this.connection.target ? this.canvasStore.nodes.find((node) => node.id === this.connection.target) : null;
    const sourceType = sourceNode?.type || '';
    const targetType = targetNode?.type || '';

    // Проверяем, существует ли уже связь между исходным и целевым узлами
    let existingEdge;

    // Если оба узла одного типа (кроме layer), проверяем только source и target
    if (sourceType && targetType && sourceType === targetType && sourceType !== 'layer') {
      existingEdge = this.canvasStore.edges.find((edge) => edge.source === this.connection.source && edge.target === this.connection.target);
    } else {
      // Для связей разных типов узлов или с layer, учитываем и хэндлы
      existingEdge = this.canvasStore.edges.find(
        (edge) =>
          edge.source === this.connection.source && edge.target === this.connection.target && edge.sourceHandle === this.connection.sourceHandle && edge.targetHandle === this.connection.targetHandle
      );
    }

    if (existingEdge) {
      // Сохраняем информацию о существующем ребре
      this.edgeId = existingEdge.id;
      return;
    }

    // Сохраняем текущее состояние ребер до выполнения команды
    this.beforeEdges = [...this.canvasStore.edges];

    // Выполняем соединение через GraphStore
    // Это создаст ребро и в GraphStore, и в CanvasStore через механизм синхронизации
    this.graphStore.onConnect(this.connection);

    // Ждем небольшую задержку, чтобы синхронизация успела сработать
    setTimeout(() => {
      // Получаем актуальное состояние canvasStore
      const currentCanvasStore = useCanvasStore.getState();

      // Ищем новое созданное ребро в CanvasStore
      const newEdges = currentCanvasStore.edges.filter((edge) => !this.beforeEdges.some((prevEdge) => prevEdge.id === edge.id));

      if (newEdges.length > 0) {
        // Ищем ребро соответствующее нашему соединению
        const matchingEdge = newEdges.find((edge) => edge.source === this.connection.source && edge.target === this.connection.target);

        if (matchingEdge) {
          // Сохраняем информацию о ребре для будущих операций
          this.edgeId = matchingEdge.id;

          // Генерируем и сохраняем операцию в фоне
          if (this.projectId) {
            generateAndSaveOperation(
              'edge.added',
              {
                edge: {
                  id: matchingEdge.id,
                  startNodeId: this.connection.source,
                  endNodeId: this.connection.target,
                  sourceHandle: this.connection.sourceHandle,
                  targetHandle: this.connection.targetHandle,
                  conditions: []
                },
                layerId: this.originalLayerId
              },
              this.projectId,
              this.timelineId,
              this.originalLayerId
            );
          }
        } else if (newEdges.length === 1) {
          // Если точное соответствие не найдено, но добавлено только одно ребро, используем его
          this.edgeId = newEdges[0].id;

          // Генерируем и сохраняем операцию в фоне
          if (this.projectId) {
            generateAndSaveOperation(
              'edge.added',
              {
                edge: {
                  id: newEdges[0].id,
                  startNodeId: this.connection.source,
                  endNodeId: this.connection.target,
                  sourceHandle: this.connection.sourceHandle,
                  targetHandle: this.connection.targetHandle,
                  conditions: []
                },
                layerId: this.originalLayerId
              },
              this.projectId,
              this.timelineId,
              this.originalLayerId
            );
          }
        }
      }

      // Если ID не был найден, попробуем найти по source/target
      if (!this.edgeId) {
        this.edgeId = this.findEdgeId();
      }
    }, 50);
  }

  undo(): void {
    // Обновляем хранилища для работы с актуальным состоянием
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Если edgeId еще не определен, попробуем найти его
    if (!this.edgeId) {
      this.edgeId = this.findEdgeId();
    }

    if (this.edgeId) {
      // Удаляем связь из GraphStore
      const edgeChanges = [
        {
          id: this.edgeId,
          type: 'remove' as const
        }
      ];
      this.graphStore.onEdgesChange(edgeChanges);

      // Удаляем связь из CanvasStore
      const canvasEdges = this.canvasStore.edges.filter((e) => e.id !== this.edgeId);
      this.canvasStore.setEdges(canvasEdges);

      // Генерируем операцию для undo
      if (this.projectId) {
        generateAndSaveOperation(
          'edge.added.undo',
          {
            edgeId: this.edgeId,
            layerId: this.originalLayerId
          },
          this.projectId,
          this.timelineId,
          this.originalLayerId
        );
      }
    }
  }

  redo(): void {
    // Выполняем то же, что и в execute
    this.execute();
  }

  getType(): string {
    return 'ConnectNarrativeNode';
  }
}
