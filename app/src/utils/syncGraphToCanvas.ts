import {Edge, Node} from '@xyflow/react';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {CHOICE_NODE_HEIGHT_CONSTANTS} from './constants';

// Флаг для определения, была ли уже подписка
let hasSubscribed = false;
// Функция для отписки, чтобы можно было отписаться перед новой подпиской
let cleanupFunction: (() => void) | null = null;

/**
 * Сравнивает два объекта графа, чтобы определить, нужно ли полное обновление.
 * Возвращает true, если достаточно обновить только данные узлов.
 */
const canSkipFullUpdate = (oldGraph: any, newGraph: any): boolean => {
  if (!oldGraph || !newGraph) {
    return false;
  }

  const oldNodeIds = oldGraph.nodeIds || Object.keys(oldGraph.nodes);
  const newNodeIds = newGraph.nodeIds || Object.keys(newGraph.nodes);

  // Проверяем, изменилось ли количество узлов или их ID
  if (oldNodeIds.length !== newNodeIds.length || !oldNodeIds.every((id: string) => newNodeIds.includes(id))) {
    return false;
  }

  // Проверяем, изменилось ли количество ребер
  if (Object.keys(oldGraph.edges).length !== Object.keys(newGraph.edges).length) {
    return false;
  }

  // Проверяем, изменились ли ID ребер
  const oldEdgeIds = Object.keys(oldGraph.edges);
  const newEdgeIds = Object.keys(newGraph.edges);
  if (!oldEdgeIds.every((id) => newEdgeIds.includes(id))) {
    return false;
  }

  // Если дошли сюда, структура графа (узлы и ребра) не изменилась.
  // Можно обновить только данные.
  return true;
};

/**
 * Проверяет, изменились ли данные в узлах графа.
 */
const haveNodeDataChanged = (oldGraph: any, newGraph: any): boolean => {
  if (!oldGraph || !newGraph) {
    return false;
  }
  // Проверяем, изменились ли данные в узлах
  for (const nodeId of Object.keys(newGraph.nodes)) {
    const oldNode = oldGraph.nodes[nodeId];
    const newNode = newGraph.nodes[nodeId];

    // Если узел новый или его данные изменились, то возвращаем true
    if (!oldNode || oldNode.data !== newNode.data) {
      return true;
    }
  }

  return false;
};

/**
 * Проверяет, был ли добавлен ровно один узел, и если да, обрабатывает его добавление.
 * Возвращает `true`, если инкрементальное добавление было выполнено, иначе `false`.
 */
const handleIncrementalNodeAdd = (oldGraph: any, newGraph: any): boolean => {
  if (!oldGraph || !newGraph) {
    return false;
  }

  const oldNodeIds = oldGraph.nodeIds || Object.keys(oldGraph.nodes);
  const newNodeIds = newGraph.nodeIds || Object.keys(newGraph.nodes);

  // Проверяем, был ли добавлен ровно один узел
  if (newNodeIds.length === oldNodeIds.length + 1) {
    const newId = newNodeIds.find((id: string) => !oldNodeIds.includes(id));
    if (newId) {
      const newNode = newGraph.nodes[newId];
      if (newNode) {
        const {nodes: currentNodes, setNodes} = useCanvasStore.getState();

        const baseNode: Node = {
          id: newNode.id,
          type: newNode.type,
          position: newNode.coordinates,
          data: newNode.type !== 'layer' ? (newNode.data ?? {}) : {}
        };

        let finalNode: Node;
        if (newNode.type === 'choice') {
          finalNode = {
            ...baseNode,
            height: CHOICE_NODE_HEIGHT_CONSTANTS.BASE_HEIGHT
          };
        } else {
          finalNode = baseNode;
        }

        setNodes([...currentNodes, finalNode]);

        return true;
      }
    }
  }

  return false;
};

/**
 * Проверяет, было ли добавлено ровно одно ребро, и если да, обрабатывает его добавление.
 * Возвращает `true`, если инкрементальное добавление было выполнено, иначе `false`.
 */
const handleIncrementalEdgeAdd = (oldGraph: any, newGraph: any): boolean => {
  if (!oldGraph || !newGraph) {
    return false;
  }

  const oldNodeIds = oldGraph.nodeIds || Object.keys(oldGraph.nodes);
  const newNodeIds = newGraph.nodeIds || Object.keys(newGraph.nodes);

  // Проверяем, что структура узлов не изменилась
  if (oldNodeIds.length !== newNodeIds.length || !oldNodeIds.every((id: string) => newNodeIds.includes(id))) {
    return false;
  }

  const oldEdgeIds = Object.keys(oldGraph.edges);
  const newEdgeIds = Object.keys(newGraph.edges);

  // Проверяем, было ли добавлено ровно одно ребро
  if (newEdgeIds.length === oldEdgeIds.length + 1) {
    const newEdgeId = newEdgeIds.find((id: string) => !oldEdgeIds.includes(id));
    if (newEdgeId) {
      const newEdge = newGraph.edges[newEdgeId];
      if (newEdge) {
        const {edges: currentEdges, setEdges} = useCanvasStore.getState();

        const finalEdge: Edge = {
          id: newEdge.id,
          source: newEdge.startNodeId,
          target: newEdge.endNodeId,
          data: {
            conditions: newEdge.conditions
          },
          ...(newEdge.sourceHandle ? {sourceHandle: newEdge.sourceHandle} : {}),
          ...(newEdge.targetHandle ? {targetHandle: newEdge.targetHandle} : {}),
          type: 'default'
        };

        setEdges([...currentEdges, finalEdge]);

        return true;
      }
    }
  }

  return false;
};

/**
 * Функция для принудительной синхронизации текущего состояния GraphStore с CanvasStore
 * Используется в случаях, когда автоматическая синхронизация не срабатывает
 */
export const refreshCanvas = (): void => {
  const graphStore = useGraphStore.getState();
  const canvasStore = useCanvasStore.getState();
  const graphId = graphStore.currentGraphId;
  const graph = graphStore.layers[graphId];

  if (!graph) {
    return;
  }

  // Создаем множество для отслеживания уже добавленных ID
  const existingNodeIds = new Set<string>();

  // Преобразуем узлы из графа в формат React Go Flow с проверкой уникальности ID
  const nodes: Node[] = [];

  // Проходим по всем узлам из nodeIds массива графа
  graph.nodeIds.forEach((id) => {
    const n = graph.nodes[id];

    // Если узел с таким ID уже был добавлен, пропускаем
    if (existingNodeIds.has(n.id)) {
      return;
    }

    // Добавляем ID в множество обработанных
    existingNodeIds.add(n.id);

    const base: Node = {
      id: n.id,
      type: n.type,
      position: n.coordinates,
      data: n.type !== 'layer' ? (n.data ?? {}) : {}
    };

    if (n.type === 'choice') {
      nodes.push({
        ...base,
        height: CHOICE_NODE_HEIGHT_CONSTANTS.BASE_HEIGHT
      });
    } else {
      nodes.push(base);
    }
  });

  // Создаем Map для хранения существующих ребер по их ID
  const currentEdges = canvasStore.edges;
  const currentEdgesMap = Object.fromEntries(currentEdges.map((e) => [e.id, e]));

  // Множество для отслеживания уже добавленных ID ребер
  const existingEdgeIds = new Set<string>();

  // Преобразуем ребра из хранилища в формат React Go Flow с проверкой уникальности
  const edges: Edge[] = [];

  Object.values(graph.edges).forEach((e) => {
    // Если ребро с таким ID уже было добавлено, пропускаем
    if (existingEdgeIds.has(e.id)) {
      return;
    }

    // Добавляем ID в множество обработанных
    existingEdgeIds.add(e.id);

    // Получаем предыдущее ребро, если оно существует
    const prev = currentEdgesMap[e.id];

    // Создаем новое ребро, сохраняя свойства предыдущего
    edges.push({
      ...prev, // Сохраняем стили и другие свойства
      id: e.id,
      source: e.startNodeId,
      target: e.endNodeId,
      data: {
        ...prev?.data, // Сохраняем существующие данные
        conditions: e.conditions
      },
      ...(e.sourceHandle ? {sourceHandle: e.sourceHandle} : {}),
      ...(e.targetHandle ? {targetHandle: e.targetHandle} : {}),
      type: 'default',
      className: prev?.className // Сохраняем класс, если есть
    });
  });

  // Сохраняем временные ребра (для автосоединения)
  const tempEdges = currentEdges.filter((e) => e.className === 'temp');

  // Обновляем узлы и ребра в канвасе
  canvasStore.setNodes(nodes);
  canvasStore.setEdges(edges.concat(tempEdges));
};

export const syncGraphToCanvas = (): (() => void) => {
  // Если есть предыдущая подписка, отписываемся от нее
  if (hasSubscribed && cleanupFunction) {
    cleanupFunction();
    hasSubscribed = false;
  }

  hasSubscribed = true;
  let unsubscribeGraph: (() => void) | null = null;
  let currentGraphState: any = null; // Переменная для хранения текущего состояния графа

  const unsubscribeCurrentId = useGraphStore.subscribe(
    (state) => state.currentGraphId,
    (graphId) => {
      // Отписываемся от предыдущей подписки на слой при изменении ID текущего графа
      unsubscribeGraph?.();

      // Очищаем Canvas перед загрузкой нового слоя
      // Это исправляет баг, когда содержимое предыдущего слоя остается видимым
      const canvasStore = useCanvasStore.getState();
      canvasStore.setNodes([]);
      canvasStore.setEdges([]);

      // Сбрасываем состояние текущего графа
      currentGraphState = null;

      unsubscribeGraph = useGraphStore.subscribe(
        (state) => state.layers[graphId],
        (graph) => {
          if (!graph) return;

          const {nodes: currentNodes, edges: currentEdges, setNodes, setEdges} = useCanvasStore.getState();

          // Проверяем инкрементальное добавление узла
          if (handleIncrementalNodeAdd(currentGraphState, graph)) {
            // Обновляем состояние графа и выходим
            currentGraphState = graph;
            return;
          }

          // Проверяем инкрементальное добавление ребра
          if (handleIncrementalEdgeAdd(currentGraphState, graph)) {
            // Обновляем состояние графа и выходим
            currentGraphState = graph;
            return;
          }

          // Проверяем, можно ли пропустить полное обновление
          if (canSkipFullUpdate(currentGraphState, graph)) {
            // Если структура не изменилась, проверяем, нужно ли обновлять данные
            if (haveNodeDataChanged(currentGraphState, graph)) {
              const updatedNodes = currentNodes.map((node) => {
                const graphNode = graph.nodes[node.id];
                if (graphNode && graphNode.type !== 'layer') {
                  const newNodeData = graphNode.data;
                  if (newNodeData && node.data !== newNodeData) {
                    return {...node, data: newNodeData};
                  }
                }
                return node;
              });
              setNodes(updatedNodes);
            }

            // Обновляем состояние графа
            currentGraphState = graph;
            return;
          }

          // Если быстрое обновление невозможно, выполняем полную синхронизацию

          // Создаем множество для отслеживания уже добавленных ID
          const existingNodeIds = new Set<string>();
          const nodes: Node[] = [];

          // Проходим по всем узлам из nodeIds массива графа
          graph.nodeIds.forEach((id) => {
            const n = graph.nodes[id];

            // Если узел с таким ID уже был добавлен, пропускаем
            if (existingNodeIds.has(n.id)) {
              return;
            }

            // Добавляем ID в множество обработанных
            existingNodeIds.add(n.id);

            const base: Node = {
              id: n.id,
              type: n.type,
              position: n.coordinates,
              data: n.type !== 'layer' ? (n.data ?? {}) : {}
            };

            if (n.type === 'choice') {
              nodes.push({
                ...base,
                height: CHOICE_NODE_HEIGHT_CONSTANTS.BASE_HEIGHT
              });
            } else {
              nodes.push(base);
            }
          });

          // Создаем Map для хранения существующих ребер по их ID
          const currentEdgesMap = Object.fromEntries(currentEdges.map((e) => [e.id, e]));

          // Множество для отслеживания уже добавленных ID ребер
          const existingEdgeIds = new Set<string>();
          const edges: Edge[] = [];

          Object.values(graph.edges).forEach((e) => {
            // Если ребро с таким ID уже было добавлено, пропускаем
            if (existingEdgeIds.has(e.id)) {
              return;
            }

            // Добавляем ID в множество обработанных
            existingEdgeIds.add(e.id);

            // Получаем предыдущее ребро, если оно существует
            const prev = currentEdgesMap[e.id];

            // Создаем новое ребро, сохраняя свойства предыдущего
            edges.push({
              ...prev, // Сохраняем стили и другие свойства
              id: e.id,
              source: e.startNodeId,
              target: e.endNodeId,
              data: {
                ...prev?.data, // Сохраняем существующие данные
                conditions: e.conditions
              },
              ...(e.sourceHandle ? {sourceHandle: e.sourceHandle} : {}),
              ...(e.targetHandle ? {targetHandle: e.targetHandle} : {}),
              type: 'default',
              className: prev?.className // Сохраняем класс, если есть
            });
          });

          // Сохраняем временные ребра (для автосоединения)
          const tempEdges = currentEdges.filter((e) => e.className === 'temp');

          // Обновляем узлы и ребра в канвасе
          setNodes(nodes);
          setEdges(edges.concat(tempEdges));

          // Сохраняем новое состояние графа
          currentGraphState = graph;
        },
        {fireImmediately: true}
      );
    },
    {fireImmediately: true}
  );

  // Создаем функцию для отписки и сохраняем ее
  cleanupFunction = () => {
    unsubscribeCurrentId?.();
    unsubscribeGraph?.();
  };

  return cleanupFunction;
};

/**
 * Функция для синхронизации конкретного слоя с Canvas
 * @param layerId ID слоя, который нужно синхронизировать
 */
export const syncLayerToCanvas = (layerId: string): void => {
  const graphStore = useGraphStore.getState();
  const graph = graphStore.layers[layerId];

  if (!graph) {
    return;
  }

  // Запомним текущий ID графа, чтобы восстановить его после обновления
  const originalGraphId = graphStore.currentGraphId;

  // Временно переключаемся на целевой слой
  useGraphStore.setState({currentGraphId: layerId});

  // Обновляем канвас для этого слоя
  refreshCanvas();

  // Восстанавливаем оригинальный ID
  useGraphStore.setState({currentGraphId: originalGraphId});
};

/**
 * Функция для обновления только указанных слоев
 * @param layerIds Массив ID слоев, которые нужно обновить
 * @param includeChildren Если true, то также обновляются дочерние слои (по умолчанию false)
 */
export const refreshSpecificLayers = (layerIds: string[], includeChildren: boolean = false): void => {
  const graphStore = useGraphStore.getState();

  // Создаем множество для хранения всех ID слоев, которые нужно обновить
  const layersToUpdate = new Set<string>(layerIds);

  // Если нужно обновить и дочерние слои
  if (includeChildren) {
    const findChildLayers = (parentId: string) => {
      const parentLayer = graphStore.layers[parentId];
      if (!parentLayer) return;

      // Перебираем все узлы слоя
      Object.values(parentLayer.nodes).forEach((node) => {
        if (node.type === 'layer') {
          // Если узел - это слой и его еще нет в наборе, добавляем и рекурсивно ищем его дочерние слои
          if (!layersToUpdate.has(node.id)) {
            layersToUpdate.add(node.id);
            findChildLayers(node.id);
          }
        }
      });
    };

    // Для каждого предоставленного ID слоя ищем дочерние слои
    layerIds.forEach((layerId) => {
      findChildLayers(layerId);
    });
  }

  // Обновляем текущий слой в первую очередь, если он входит в список
  const currentGraphId = graphStore.currentGraphId;
  if (layersToUpdate.has(currentGraphId)) {
    refreshCanvas();
    layersToUpdate.delete(currentGraphId); // Удаляем его из набора, чтобы не обновлять дважды
  }

  // Обновляем оставшиеся слои
  layersToUpdate.forEach((layerId) => {
    syncLayerToCanvas(layerId);
  });
};
