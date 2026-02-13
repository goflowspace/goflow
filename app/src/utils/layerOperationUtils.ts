import {ChoiceNode, Layer, LayerNode, Link, NarrativeNode, NoteNode, SkeletonNode} from '../types/nodes';

/**
 * Тип для данных слоя, используемых в операциях копирования/вырезания/дублирования
 */
export interface LayerContentData {
  nodes: Record<string, any>;
  edges: Record<string, Link>;
  nodeIds: string[];
  childLayers: string[];
  depth: number;
}

/**
 * Тип для хранения содержимого слоев
 */
export type LayerContentsMap = Record<string, LayerContentData>;

/**
 * Рекурсивно копирует содержимое слоя и всех его вложенных слоев
 * @param layerId ID слоя для копирования
 * @param layers Объект со всеми слоями из useGraphStore
 * @param layerContents Объект для сохранения результатов
 * @param addCopyToName Добавлять ли " copy" к именам слоев
 */
export function copyLayerContentRecursively(layerId: string, layers: Record<string, Layer>, layerContents: LayerContentsMap, addCopyToName: boolean = false): void {
  const layerData = layers[layerId];
  if (!layerData) {
    return;
  }

  // Глубоко копируем содержимое слоя
  const nodesCopy = JSON.parse(JSON.stringify(layerData.nodes));
  const edgesCopy = JSON.parse(JSON.stringify(layerData.edges));

  // Создаем массив ID вложенных слоев
  const childLayers: string[] = [];

  // Обрабатываем каждый узел и ищем вложенные слои
  for (const nodeId in nodesCopy) {
    const node = nodesCopy[nodeId];

    if (node.type === 'layer') {
      // Добавляем " copy" к имени вложенного слоя только если addCopyToName = true
      if (addCopyToName && node.name && !node.name.endsWith(' copy')) {
        node.name = `${node.name} copy`;
      }

      childLayers.push(node.id);
    }
  }

  // Сохраняем содержимое слоя
  layerContents[layerId] = {
    nodes: nodesCopy,
    edges: edgesCopy,
    nodeIds: [...layerData.nodeIds],
    childLayers: childLayers,
    depth: layerData.depth
  };

  // Рекурсивно обрабатываем вложенные слои
  for (const childLayerId of childLayers) {
    if (layers[childLayerId]) {
      copyLayerContentRecursively(childLayerId, layers, layerContents, addCopyToName);
    }
  }
}

/**
 * Создает копии узлов слоев с правильной обработкой имен
 * @param selectedNodes Выбранные узлы для копирования
 * @param graphNodes Все узлы из текущего графа
 * @param addCopyToName Добавлять ли " copy" к именам слоев
 * @returns Массив скопированных узлов
 */
export function createLayerNodeCopies(selectedNodes: any[], graphNodes: Record<string, any>, addCopyToName: boolean = true): (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[] {
  const nodesToCopy: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[] = [];

  for (const selectedNode of selectedNodes) {
    const nodeInStore = graphNodes[selectedNode.id];
    if (!nodeInStore) continue;

    if (nodeInStore.type === 'layer') {
      const layerNode = nodeInStore as LayerNode;
      let newName = layerNode.name;

      if (addCopyToName && !newName.endsWith(' copy')) {
        newName = `${newName} copy`;
      }

      const layerCopy = {
        ...JSON.parse(JSON.stringify(layerNode)),
        name: newName
      };
      nodesToCopy.push(layerCopy);
    } else {
      // Для обычных узлов просто делаем копию
      nodesToCopy.push(JSON.parse(JSON.stringify(nodeInStore)));
    }
  }

  return nodesToCopy;
}

/**
 * Находит внутренние связи между выбранными узлами
 * @param nodeIds Множество ID узлов
 * @param edges Объект со всеми связями слоя
 * @param childLayerIds Дополнительные ID дочерних слоев (опционально)
 * @returns Массив внутренних связей
 */
export function findInternalEdges(nodeIds: Set<string>, edges: Record<string, Link>, childLayerIds: string[] = []): Link[] {
  const internalEdges: Link[] = [];

  // Создаем расширенное множество ID, включая дочерние слои
  const extendedNodeIds = new Set([...nodeIds, ...childLayerIds]);

  Object.values(edges).forEach((edge) => {
    if (extendedNodeIds.has(edge.startNodeId) && extendedNodeIds.has(edge.endNodeId)) {
      internalEdges.push({
        ...edge,
        conditions: JSON.parse(JSON.stringify(edge.conditions))
      });
    }
  });

  return internalEdges;
}

/**
 * Собирает ID всех дочерних слоев рекурсивно
 * @param layerId ID родительского слоя
 * @param layers Объект со всеми слоями
 * @returns Массив ID дочерних слоев
 */
export function collectChildLayerIds(layerId: string, layers: Record<string, Layer>): string[] {
  const childLayerIds: string[] = [];
  const layer = layers[layerId];

  if (!layer) return childLayerIds;

  // Находим все узлы типа layer в этом слое
  Object.values(layer.nodes)
    .filter((node) => node.type === 'layer')
    .forEach((node) => {
      const childLayerId = node.id;
      childLayerIds.push(childLayerId);

      // Рекурсивно обрабатываем дочерние слои
      const nestedChildIds = collectChildLayerIds(childLayerId, layers);
      childLayerIds.push(...nestedChildIds);
    });

  return childLayerIds;
}

/**
 * Универсальная функция для полного копирования узлов включая вложенные слои
 * Возвращает все данные, необходимые для буфера обмена
 */
export interface CopyResult {
  nodesToCopy: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[];
  internalEdges: Link[];
  layerContents: LayerContentsMap;
}

/**
 * Полное копирование выбранных узлов с поддержкой слоев
 * @param selectedNodes Выбранные узлы из канваса
 * @param graph Текущий граф (слой)
 * @param layers Все слои из useGraphStore
 * @param addCopyToName Добавлять ли " copy" к именам слоев
 * @returns Объект с данными для буфера обмена
 */
export function copyNodesWithFullLayerSupport(
  selectedNodes: any[],
  graph: {nodes: Record<string, any>; edges: Record<string, Link>},
  layers: Record<string, Layer>,
  addCopyToName: boolean = true
): CopyResult {
  // Создаем копии узлов с глубоким копированием
  const nodesToCopy: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[] = [];

  // Создаем копии каждого выбранного узла
  for (const selectedNode of selectedNodes) {
    const nodeInStore = graph.nodes[selectedNode.id];
    if (nodeInStore) {
      // Глубокая копия узла
      const nodeCopy = JSON.parse(JSON.stringify(nodeInStore));

      nodesToCopy.push(nodeCopy);
    }
  }

  // Объект для хранения содержимого слоев
  const layerContents: LayerContentsMap = {};

  // Обрабатываем слои и копируем их содержимое
  for (const selectedNode of selectedNodes) {
    const nodeInStore = graph.nodes[selectedNode.id];
    if (nodeInStore && nodeInStore.type === 'layer') {
      const layerNode = nodeInStore as LayerNode;

      // Рекурсивно копируем содержимое слоя
      copyLayerContentRecursively(layerNode.id, layers, layerContents, addCopyToName);
    }
  }

  // Собираем внутренние связи между выбранными узлами
  const internalEdges: Link[] = [];
  if (selectedNodes.length > 1) {
    const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));

    Object.values(graph.edges).forEach((edge) => {
      if (selectedNodeIds.has(edge.startNodeId) && selectedNodeIds.has(edge.endNodeId)) {
        // Глубокая копия связи с условиями
        const edgeCopy = {
          ...edge,
          conditions: JSON.parse(JSON.stringify(edge.conditions))
        };
        internalEdges.push(edgeCopy);
      }
    });
  }

  return {
    nodesToCopy,
    internalEdges,
    layerContents
  };
}
