/**
 * Утилита для преобразования данных из формата с таймлайнами в формат StoryData
 * для воспроизведения историй. Позволяет системе воспроизведения работать
 * без необходимости знать о структуре таймлайнов.
 */
import {StorageData} from '@services/storageService';
import {Edge, Layer, Node} from '@types-folder/nodes';

import {StoryData} from '../core/StoryData';

/**
 * Преобразует слой в плоские массивы узлов и ребер
 * @param layerId ID слоя для обработки
 * @param layers Все слои проекта
 * @param parentLayerId ID родительского слоя (для поиска концовок)
 * @returns Объект с узлами и ребрами в плоском формате
 */
const flattenLayer = (layerId: string, layers: Record<string, Layer>, parentLayerId?: string): {nodes: Node[]; edges: Edge[]} => {
  const layer = layers[layerId];
  if (!layer) return {nodes: [], edges: []};

  const layerName = layer.name || layerId;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Добавляем узлы текущего слоя
  for (const nodeId of layer.nodeIds) {
    const node = layer.nodes[nodeId];
    if (!node) continue;

    // НЕ добавляем узел слоя в итоговый граф
    if (node.type === 'layer') {
      // Добавляем концовки слоя как реальные узлы ПЕРЕД рекурсивной обработкой
      const layerNode = node as any;

      // Добавляем startingNodes как реальные узлы
      if (layerNode.startingNodes && Array.isArray(layerNode.startingNodes)) {
        for (const startingNode of layerNode.startingNodes) {
          const startingNodeWithInfo = {
            ...startingNode,
            data: {
              ...startingNode.data,
              layerInfo: {
                layerId: node.id,
                layerName: layers[node.id]?.name || node.id,
                isLayerEndpoint: true,
                endpointType: 'starting'
              }
            }
          } as Node;

          // Добавляем операции для нарративных узлов
          if (startingNode.type === 'narrative' && 'operations' in startingNode && startingNode.operations) {
            (startingNodeWithInfo as any).operations = startingNode.operations;
          }

          nodes.push(startingNodeWithInfo);
        }
      }

      // Добавляем endingNodes как реальные узлы
      if (layerNode.endingNodes && Array.isArray(layerNode.endingNodes)) {
        for (const endingNode of layerNode.endingNodes) {
          const endingNodeWithInfo = {
            ...endingNode,
            data: {
              ...endingNode.data,
              layerInfo: {
                layerId: node.id,
                layerName: layers[node.id]?.name || node.id,
                isLayerEndpoint: true,
                endpointType: 'ending'
              }
            }
          } as Node;

          // Добавляем операции для нарративных узлов
          if (endingNode.type === 'narrative' && 'operations' in endingNode && endingNode.operations) {
            (endingNodeWithInfo as any).operations = endingNode.operations;
          }

          nodes.push(endingNodeWithInfo);
        }
      }

      // Рекурсивно обрабатываем вложенные слои
      const nestedData = flattenLayer(node.id, layers, layerId);
      nodes.push(...nestedData.nodes);
      edges.push(...nestedData.edges);
    } else {
      // Добавляем обычные узлы (narrative, choice, note) с информацией о слое
      const nodeWithLayerInfo = {
        ...node,
        data: {
          ...node.data,
          layerInfo: {
            layerId: layerId,
            layerName: layerName !== 'root' ? layerName : ''
          }
        }
      } as any;

      // Добавляем операции для нарративных узлов
      if (node.type === 'narrative' && 'operations' in node && node.operations) {
        nodeWithLayerInfo.operations = node.operations;
      }

      nodes.push(nodeWithLayerInfo);
    }
  }

  // Преобразуем ребра из формата Link в формат Edge
  for (const edgeId in layer.edges) {
    const link = layer.edges[edgeId];
    if (!link) continue;

    // Обрабатываем связи с концовками слоев
    if (link.sourceHandle || link.targetHandle) {
      // Связь через концовки слоя
      if (link.sourceHandle && link.targetHandle) {
        // Связь между двумя слоями через концовки - создаем прямую связь между концовками
        const sourceNode = layer.nodes[link.startNodeId];
        const targetNode = layer.nodes[link.endNodeId];

        if (sourceNode?.type === 'layer' && targetNode?.type === 'layer') {
          // Находим концовки в узлах слоев
          const sourceLayerNode = sourceNode as any;
          const targetLayerNode = targetNode as any;

          const endingNode = sourceLayerNode.endingNodes?.find((n: any) => n.id === link.sourceHandle);
          const startingNode = targetLayerNode.startingNodes?.find((n: any) => n.id === link.targetHandle);

          if (endingNode && startingNode) {
            const edge: Edge = {
              id: link.id,
              source: endingNode.id, // ID концовки источника
              target: startingNode.id, // ID концовки цели
              data: link.conditions ? {conditions: link.conditions} : undefined
            };
            edges.push(edge);
          }
        }
      } else if (link.sourceHandle) {
        // Связь от концовки слоя к обычному узлу
        const sourceNode = layer.nodes[link.startNodeId];
        if (sourceNode?.type === 'layer') {
          // Находим концовку в узле слоя
          const sourceLayerNode = sourceNode as any;
          const endingNode = sourceLayerNode.endingNodes?.find((n: any) => n.id === link.sourceHandle);
          if (endingNode) {
            const edge: Edge = {
              id: link.id,
              source: endingNode.id, // Используем ID концовки
              target: link.endNodeId,
              data: link.conditions ? {conditions: link.conditions} : undefined
            };
            edges.push(edge);
          }
        }
      } else if (link.targetHandle) {
        // Связь от обычного узла к концовке слоя
        const targetNode = layer.nodes[link.endNodeId];
        if (targetNode?.type === 'layer') {
          // Находим концовку в узле слоя
          const targetLayerNode = targetNode as any;
          const startingNode = targetLayerNode.startingNodes?.find((n: any) => n.id === link.targetHandle);
          if (startingNode) {
            const edge: Edge = {
              id: link.id,
              source: link.startNodeId,
              target: startingNode.id, // Используем ID концовки
              data: link.conditions ? {conditions: link.conditions} : undefined
            };
            edges.push(edge);
          }
        }
      }
    } else {
      // Обычная связь между узлами
      // Проверяем, что оба узла не являются слоями (иначе связь будет "висячей")
      const sourceNode = layer.nodes[link.startNodeId];
      const targetNode = layer.nodes[link.endNodeId];

      // Пропускаем связи к узлам слоев или от узлов слоев (без концовок)
      if (sourceNode?.type === 'layer' || targetNode?.type === 'layer') {
        continue; // Эта связь к/от узла слоя без концовок - пропускаем
      }

      const edge: Edge = {
        id: link.id,
        source: link.startNodeId,
        target: link.endNodeId,
        data: link.conditions ? {conditions: link.conditions} : undefined
      };
      edges.push(edge);
    }
  }

  return {nodes, edges};
};

/**
 * Преобразует данные из формата с таймлайнами в формат StoryData для воспроизведения
 * @param data Данные в формате с таймлайнами
 * @param timelineId ID таймлайна для воспроизведения (опционально, если не указан - берется первый доступный)
 * @returns Данные в формате StoryData
 */
export const timelineToStoryData = (data: StorageData, timelineId?: string): StoryData => {
  // Если нет таймлайнов, возвращаем пустую структуру
  if (!data.timelines || Object.keys(data.timelines).length === 0) {
    return {
      title: data.projectName || 'Untitled',
      data: {
        nodes: [],
        edges: [],
        variables: []
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };
  }

  // Получаем данные указанного таймлайна (или первого доступного)
  const timelineKeys = Object.keys(data.timelines);
  const finalTimelineId = timelineId && timelineKeys.includes(timelineId) ? timelineId : timelineKeys[0];
  const timelineData = data.timelines[finalTimelineId];

  // Преобразуем корневой слой в плоский формат
  const {nodes, edges} = flattenLayer('root', timelineData.layers);

  return {
    title: data.projectName,
    data: {
      nodes,
      edges,
      variables: timelineData.variables || []
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      timelineId: finalTimelineId,
      lastLayerNumber: timelineData.lastLayerNumber
    }
  };
};
