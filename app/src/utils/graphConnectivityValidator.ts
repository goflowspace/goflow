import type {Layer, Link, Node} from '@types-folder/nodes';

import {pluralizeRussian} from './pluralization';

interface FlattenedGraphData {
  nodes: Node[];
  edges: Link[];
  nodeLayerInfo: Map<string, {layerName: string; layerId: string}>;
}

interface NodeInfo {
  id: string;
  type: 'narrative' | 'choice';
  title: string;
  textPreview: string;
  layerName: string;
  layerId: string;
}

interface ConnectivityResult {
  isConnected: boolean;
  startNodeCount: number;
  startNodes: NodeInfo[];
  unreachableNodes: string[];
  unreachableNodesInfo: NodeInfo[];
  message?: string;
}

/**
 * Преобразует многослойную структуру в плоскую для анализа связности
 */
function flattenLayersForConnectivity(layers: Record<string, Layer>): FlattenedGraphData {
  const allNodes: Node[] = [];
  const allEdges: Link[] = [];
  const nodeLayerInfo = new Map<string, {layerName: string; layerId: string}>();

  // Рекурсивно обрабатываем все слои
  const processLayer = (layerId: string, visited = new Set<string>()): void => {
    if (visited.has(layerId)) return; // Защита от циклических ссылок
    visited.add(layerId);

    const layer = layers[layerId];
    if (!layer) return;

    // Добавляем узлы текущего слоя
    for (const nodeId of layer.nodeIds) {
      const node = layer.nodes[nodeId];
      if (!node) continue;

      if (node.type === 'layer') {
        // Добавляем концовки слоя как реальные узлы ПЕРЕД рекурсивной обработкой
        const layerNode = node as any;

        // Добавляем startingNodes как реальные узлы
        if (layerNode.startingNodes && Array.isArray(layerNode.startingNodes)) {
          for (const startingNode of layerNode.startingNodes) {
            if (startingNode.type === 'narrative' || startingNode.type === 'choice') {
              allNodes.push(startingNode);
              nodeLayerInfo.set(startingNode.id, {
                layerName: layers[node.id]?.name || node.id,
                layerId: node.id
              });
            }
          }
        }

        // Добавляем endingNodes как реальные узлы
        if (layerNode.endingNodes && Array.isArray(layerNode.endingNodes)) {
          for (const endingNode of layerNode.endingNodes) {
            if (endingNode.type === 'narrative' || endingNode.type === 'choice') {
              allNodes.push(endingNode);
              nodeLayerInfo.set(endingNode.id, {
                layerName: layers[node.id]?.name || node.id,
                layerId: node.id
              });
            }
          }
        }

        // Рекурсивно обрабатываем вложенные слои
        processLayer(node.id, visited);
      } else if (node.type === 'narrative' || node.type === 'choice') {
        // Добавляем только narrative и choice узлы
        allNodes.push(node);
        // Сохраняем информацию о слое для этого узла
        nodeLayerInfo.set(node.id, {
          layerName: layer.name || layerId,
          layerId: layerId
        });
      }
    }

    // Добавляем связи текущего слоя, обрабатывая связи между слоями
    for (const edgeId in layer.edges) {
      const link = layer.edges[edgeId];
      if (!link) continue;

      // Обрабатываем связи с концовками слоев
      if (link.sourceHandle || link.targetHandle) {
        // Связь через концовки слоя - нужно найти реальные узлы
        const sourceNode = layer.nodes[link.startNodeId];
        const targetNode = layer.nodes[link.endNodeId];

        if (sourceNode?.type === 'layer' && link.sourceHandle) {
          // Находим конечный узел в слое-источнике
          const sourceLayerData = layers[sourceNode.id];
          if (sourceLayerData && sourceNode.endingNodes) {
            const endingNode = sourceNode.endingNodes.find((n) => n.id === link.sourceHandle);
            if (endingNode) {
              // Создаем связь от конечного узла слоя
              if (targetNode?.type === 'layer' && link.targetHandle) {
                // Связь между слоями - находим начальный узел в целевом слое
                const targetLayerData = layers[targetNode.id];
                if (targetLayerData && targetNode.startingNodes) {
                  const startingNode = targetNode.startingNodes.find((n) => n.id === link.targetHandle);
                  if (startingNode) {
                    allEdges.push({
                      ...link,
                      startNodeId: endingNode.id,
                      endNodeId: startingNode.id
                    });
                  }
                }
              } else {
                // Связь от слоя к обычному узлу
                allEdges.push({
                  ...link,
                  startNodeId: endingNode.id
                });
              }
            }
          }
        } else if (targetNode?.type === 'layer' && link.targetHandle) {
          // Связь к слою - находим начальный узел в целевом слое
          const targetLayerData = layers[targetNode.id];
          if (targetLayerData && targetNode.startingNodes) {
            const startingNode = targetNode.startingNodes.find((n) => n.id === link.targetHandle);
            if (startingNode) {
              allEdges.push({
                ...link,
                endNodeId: startingNode.id
              });
            }
          }
        }
      } else {
        // Обычная связь между узлами
        const sourceNode = layer.nodes[link.startNodeId];
        const targetNode = layer.nodes[link.endNodeId];

        if (sourceNode && targetNode && (sourceNode.type === 'narrative' || sourceNode.type === 'choice') && (targetNode.type === 'narrative' || targetNode.type === 'choice')) {
          allEdges.push(link);
        }
      }
    }
  };

  // Начинаем с корневого слоя
  if (layers.root) {
    processLayer('root');
  }

  return {nodes: allNodes, edges: allEdges, nodeLayerInfo};
}

/**
 * Извлекает информацию о узле для отображения
 */
function extractNodeInfo(node: Node, layerName: string, layerId: string, t?: (key: string, fallback: string) => string): NodeInfo {
  // Функция перевода с фолбеком
  const translate = (key: string, fallback: string): string => {
    if (t) {
      try {
        const translated = t(key, fallback);
        // Если перевод не найден или возвращается ключ, используем фолбек
        return translated === key ? fallback : translated;
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  const text = (node as any).data?.text || '';
  const originalTitle = (node as any).data?.title;

  const getNodeTitle = (): string => {
    if (node.type === 'narrative') {
      if (originalTitle && originalTitle.trim()) {
        return originalTitle.trim();
      }
      return translate('connectivity_error.default_narrative_node', 'Narrative node');
    } else if (node.type === 'choice') {
      return translate('connectivity_error.default_choice_node', 'Choice node');
    }
    return translate('connectivity_error.default_unknown_node', 'Unknown node');
  };

  const getTextPreview = (): string => {
    if (!text) {
      return translate('connectivity_error.default_no_text', 'No text');
    }
    if (text.length > 50) {
      return text.substring(0, 50) + '...';
    }
    return text;
  };

  const title = getNodeTitle();
  const textPreview = getTextPreview();

  return {
    id: node.id,
    type: node.type as 'narrative' | 'choice',
    title,
    textPreview,
    layerName,
    layerId
  };
}

/**
 * Находит стартовые узлы в графе (узлы без входящих связей)
 */
function findStartNodes(nodes: Node[], edges: Link[]): Node[] {
  const targetNodeIds = new Set(edges.map((edge) => edge.endNodeId));
  return nodes.filter((node) => (node.type === 'narrative' || node.type === 'choice') && !targetNodeIds.has(node.id));
}

/**
 * Находит все узлы, достижимые от стартового узла через DFS
 */
function findReachableNodes(startNodeId: string, edges: Link[]): Set<string> {
  const reachable = new Set<string>();
  const stack = [startNodeId];

  while (stack.length > 0) {
    const nodeId = stack.pop()!;
    if (reachable.has(nodeId)) continue;

    reachable.add(nodeId);

    // Находим все исходящие связи
    const outgoingEdges = edges.filter((edge) => edge.startNodeId === nodeId);
    outgoingEdges.forEach((edge) => {
      if (!reachable.has(edge.endNodeId)) {
        stack.push(edge.endNodeId);
      }
    });
  }

  return reachable;
}

/**
 * Проверяет связность графа
 */
export function validateGraphConnectivity(layers: Record<string, Layer>, t?: (key: string, fallback: string) => string): ConnectivityResult {
  // Преобразуем слои в плоскую структуру
  const {nodes, edges, nodeLayerInfo} = flattenLayersForConnectivity(layers);

  // Если нет узлов, считаем граф корректным
  if (nodes.length === 0) {
    return {
      isConnected: true,
      startNodeCount: 0,
      startNodes: [],
      unreachableNodes: [],
      unreachableNodesInfo: [],
      message: 'Граф пуст'
    };
  }

  // Вспомогательная функция для извлечения информации о узле с данными слоя
  const getNodeInfo = (node: Node): NodeInfo => {
    const layerInfo = nodeLayerInfo.get(node.id) || {layerName: 'Unknown', layerId: 'unknown'};
    return extractNodeInfo(node, layerInfo.layerName, layerInfo.layerId, t);
  };

  // Находим стартовые узлы
  const startNodes = findStartNodes(nodes, edges);
  const startNodesInfo = startNodes.map(getNodeInfo);

  // Проверяем количество стартовых узлов
  if (startNodes.length === 0) {
    return {
      isConnected: false,
      startNodeCount: 0,
      startNodes: [],
      unreachableNodes: nodes.map((n) => n.id),
      unreachableNodesInfo: nodes.map(getNodeInfo),
      message: 'Не найден стартовый узел. Все узлы имеют входящие связи (возможен цикл)'
    };
  }

  if (startNodes.length > 1) {
    const pluralizedNodes = pluralizeRussian(startNodes.length, 'стартовый узел', 'стартовых узла', 'стартовых узлов');
    return {
      isConnected: false,
      startNodeCount: startNodes.length,
      startNodes: startNodesInfo,
      unreachableNodes: [],
      unreachableNodesInfo: [],
      message: `Найдено ${startNodes.length} ${pluralizedNodes}. Должен быть только один стартовый узел для корректного воспроизведения`
    };
  }

  // Проверяем достижимость всех узлов от единственного стартового узла
  const startNodeId = startNodes[0].id;
  const reachableNodeIds = findReachableNodes(startNodeId, edges);

  // Находим недостижимые узлы
  const unreachableNodesList = nodes.filter((node) => !reachableNodeIds.has(node.id));
  const unreachableNodes = unreachableNodesList.map((node) => node.id);
  const unreachableNodesInfo = unreachableNodesList.map(getNodeInfo);

  const isConnected = unreachableNodes.length === 0;

  return {
    isConnected,
    startNodeCount: startNodes.length,
    startNodes: startNodesInfo,
    unreachableNodes,
    unreachableNodesInfo,
    message: isConnected ? 'Граф связный и корректный для воспроизведения' : `Найдены несвязанные узлы: ${unreachableNodes.length} шт. Все узлы должны быть связаны с основным графом`
  };
}

/**
 * Упрощенная функция для быстрой проверки в PlayBar
 */
export function isGraphReadyForPlayback(layers: Record<string, Layer>, t?: (key: string, fallback: string) => string): boolean {
  const result = validateGraphConnectivity(layers, t);
  return result.isConnected && result.startNodeCount === 1;
}
