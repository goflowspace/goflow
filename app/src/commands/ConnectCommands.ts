import {Connection, Edge} from '@xyflow/react';

import {getNotificationManager} from '@components/Notifications';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {Command, CommandMetadata} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

/**
 * Унифицированная команда для соединения узлов любого типа
 */
export class ConnectCommand implements Command {
  private connection: Connection;
  private edgeId: string | null = null;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private originalLayerId: string;
  private projectId?: string;
  private timelineId: string;
  private beforeEdges: Edge[] = []; // Сохраняем состояние до создания связи
  private afterEdges: Edge[] = []; // Сохраняем состояние после создания связи

  /**
   * @param connection Параметры соединения
   */
  constructor(connection: Connection, originalLayerId: string, projectId?: string) {
    this.connection = connection;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.originalLayerId = originalLayerId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;
    // Сохраняем текущий список ребер до выполнения команды
    this.beforeEdges = [...this.canvasStore.edges];
  }

  /**
   * Данные для сохранения в истории и localStorage
   */
  getMetadata(): CommandMetadata {
    return {
      timestamp: Date.now(),
      description: 'Connect',
      layerId: this.originalLayerId,
      details: {
        connection: this.connection,
        edgeId: this.edgeId
      }
    };
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

    // Ищем ребро в graphStore
    const currentLayer = this.graphStore.layers[this.originalLayerId];
    if (!currentLayer) return null;

    // Для graphStore используем startNodeId и endNodeId вместо source/target
    let edgeInGraph;

    // Для узлов одного типа (кроме layer)
    if (sourceType && targetType && sourceType === targetType && sourceType !== 'layer') {
      edgeInGraph = Object.values(currentLayer.edges).find((edge) => edge.startNodeId === this.connection.source && edge.endNodeId === this.connection.target);
    } else {
      // Для узлов разных типов или если один из них layer
      edgeInGraph = Object.values(currentLayer.edges).find(
        (edge) =>
          edge.startNodeId === this.connection.source &&
          edge.endNodeId === this.connection.target &&
          edge.sourceHandle === this.connection.sourceHandle &&
          edge.targetHandle === this.connection.targetHandle
      );
    }

    if (edgeInGraph) {
      return edgeInGraph.id;
    }

    // Проверяем другие слои, если в текущем не найдено
    for (const layerId in this.graphStore.layers) {
      if (layerId === this.originalLayerId) continue;

      const layer = this.graphStore.layers[layerId];
      let edgeInOtherLayer;

      // Для узлов одного типа (кроме layer)
      if (sourceType && targetType && sourceType === targetType && sourceType !== 'layer') {
        edgeInOtherLayer = Object.values(layer.edges).find((edge) => edge.startNodeId === this.connection.source && edge.endNodeId === this.connection.target);
      } else {
        // Для узлов разных типов или если один из них layer
        edgeInOtherLayer = Object.values(layer.edges).find(
          (edge) =>
            edge.startNodeId === this.connection.source &&
            edge.endNodeId === this.connection.target &&
            edge.sourceHandle === this.connection.sourceHandle &&
            edge.targetHandle === this.connection.targetHandle
        );
      }

      if (edgeInOtherLayer) {
        return edgeInOtherLayer.id;
      }
    }

    // Если ничего не найдено, возвращаем null
    return null;
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
      console.warn(`Невозможно выполнить повтор соединения узлов, так как вы находитесь в другом слое (${currentGraphId})`);

      // Получаем название слоя
      const layerName = this.getLayerName() || this.originalLayerId;

      // Формируем путь в зависимости от ID слоя
      const path = this.originalLayerId === 'root' ? `/${this.projectId}/editor` : `/${this.projectId}/editor/${this.originalLayerId}`;

      getNotificationManager().showErrorWithNavigation(
        `Can't repeat the connection operation because you are in a different layer. Please navigate to layer "${layerName}" and try again.`,
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

    // Проверяем, если у нас есть сохраненный ID из localStorage
    const metadata = this.getMetadata();
    if ((metadata.details as any)?.edgeId) {
      this.edgeId = (metadata.details as any).edgeId;
    }

    // Получаем типы исходного и целевого узлов
    const sourceNode = this.connection.source ? this.canvasStore.nodes.find((node) => node.id === this.connection.source) : null;
    const targetNode = this.connection.target ? this.canvasStore.nodes.find((node) => node.id === this.connection.target) : null;
    const sourceType = sourceNode?.type || '';
    const targetType = targetNode?.type || '';

    // Проверяем, существует ли уже связь между исходным и целевым узлами
    // Если узлы одного типа (например, narrative-to-narrative), проверяем только source и target
    // Если разных типов или один из них layer, учитываем также sourceHandle и targetHandle
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

    // TODO: убрал, чтобы синхронизировались связи
    // if (existingEdge) {
    //   // Сохраняем информацию о существующем ребре для будущих операций
    //   this.edgeId = existingEdge.id;
    //   return;
    // }

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
        } else if (newEdges.length === 1) {
          // Если точное соответствие не найдено, но добавлено только одно ребро, используем его
          this.edgeId = newEdges[0].id;
        }
      } else {
        // Если новых ребер не найдено, пробуем найти по source/target
        this.edgeId = this.findEdgeId();
      }

      // Генерируем операцию для синхронизации
      if (this.edgeId && this.projectId) {
        const currentGraphStore = useGraphStore.getState();
        const currentLayer = currentGraphStore.layers[this.originalLayerId];
        const edge = currentLayer?.edges[this.edgeId];

        if (edge) {
          generateAndSaveOperation(
            'edge.added',
            {
              edge: {
                id: this.edgeId,
                startNodeId: this.connection.source!,
                endNodeId: this.connection.target!,
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
    }, 50);
  }

  undo(): void {
    // Обновляем хранилища для работы с актуальным состоянием
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Пытаемся найти ID, если он еще не определен
    if (!this.edgeId) {
      this.edgeId = this.findEdgeId();
    }

    // Ищем ребро напрямую в текущем состоянии если всё ещё нет ID
    if (!this.edgeId && this.connection.source && this.connection.target) {
      // Получаем типы исходного и целевого узлов
      const sourceNode = this.canvasStore.nodes.find((node) => node.id === this.connection.source);
      const targetNode = this.canvasStore.nodes.find((node) => node.id === this.connection.target);
      const sourceType = sourceNode?.type || '';
      const targetType = targetNode?.type || '';

      let currentEdge;

      // Если оба узла одного типа (кроме layer), проверяем только source и target
      if (sourceType && targetType && sourceType === targetType && sourceType !== 'layer') {
        currentEdge = this.canvasStore.edges.find((edge) => edge.source === this.connection.source && edge.target === this.connection.target);
      } else {
        // Для связей разных типов узлов или с layer, учитываем и хэндлы
        currentEdge = this.canvasStore.edges.find(
          (edge) =>
            edge.source === this.connection.source && edge.target === this.connection.target && edge.sourceHandle === this.connection.sourceHandle && edge.targetHandle === this.connection.targetHandle
        );
      }

      if (currentEdge) {
        this.edgeId = currentEdge.id;
      } else {
        // Если совпадений по хэндлам нет, пробуем создать ID
        this.edgeId = `${this.connection.source}-${this.connection.target}`;
      }
    }

    // Теперь всегда должен быть ID, попробуем удалить по нему
    if (this.edgeId) {
      // Ищем ребро среди всех ребер в graphStore
      const currentLayer = this.graphStore.layers[this.originalLayerId];
      const edgesInGraph = currentLayer?.edges || {};
      let edgeFound = false;

      // Проверяем все ребра в графе для надежного удаления
      for (const [edgeId, edge] of Object.entries(edgesInGraph)) {
        if (
          // Проверяем по ID
          edgeId === this.edgeId ||
          // Или по source/target
          (edge.startNodeId === this.connection.source && edge.endNodeId === this.connection.target)
        ) {
          // Удаляем найденное ребро
          edgeFound = true;
          const edgeChanges = [
            {
              id: edgeId,
              type: 'remove' as const
            }
          ];
          this.graphStore.onEdgesChange(edgeChanges);
          break;
        }
      }

      // Удаляем связь из канваса
      const canvasEdges = this.canvasStore.edges;
      const filteredEdges = canvasEdges.filter((e) => !(e.id === this.edgeId || (e.source === this.connection.source && e.target === this.connection.target)));

      // Если нашли и удалили ребра
      if (filteredEdges.length < canvasEdges.length) {
        this.canvasStore.setEdges(filteredEdges);
      } else if (!edgeFound) {
        console.warn('ConnectCommand.undo: ребро не найдено ни по ID, ни по source/target');
      }

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
    } else {
      console.warn('ConnectCommand.undo: не удалось определить ID ребра для удаления');
    }
  }

  redo(): void {
    // Обновляем хранилища
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
      // Обновляем сохраненный ID ребра
      this.edgeId = existingEdge.id;
      return;
    }

    // Сохраняем текущий список ребер до выполнения команды
    this.beforeEdges = [...this.canvasStore.edges];

    // Выполняем соединение через GraphStore (это создаст ребро и в CanvasStore через синхронизацию)
    this.graphStore.onConnect(this.connection);

    // Ждем небольшую задержку, чтобы синхронизация успела сработать
    setTimeout(() => {
      // Получаем актуальное состояние
      const currentCanvasStore = useCanvasStore.getState();

      // Получаем текущие ребра после создания
      this.afterEdges = [...currentCanvasStore.edges];

      // Находим новое ребро
      const newEdges = this.afterEdges.filter((edge) => !this.beforeEdges.some((prevEdge) => prevEdge.id === edge.id));

      if (newEdges.length > 0) {
        const matchingEdge = newEdges.find((edge) => edge.source === this.connection.source && edge.target === this.connection.target);

        if (matchingEdge) {
          this.edgeId = matchingEdge.id;
        } else if (newEdges.length === 1) {
          // Если точное соответствие не найдено, но добавлено только одно ребро, используем его
          this.edgeId = newEdges[0].id;
        }
      } else {
        // Если новых ребер не найдено, пробуем найти по source/target
        this.edgeId = this.findEdgeId();
      }
    }, 50);
  }

  getType(): string {
    return 'Connect';
  }
}
