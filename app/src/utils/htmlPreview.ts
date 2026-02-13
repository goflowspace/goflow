import {useGraphStore} from '@store/useGraphStore';

import {loadProject} from '../services/dbService';
import {PlaybackStorageService} from '../services/playbackStorageService';
import {ProjectDataService} from '../services/projectDataService';
import {STORY_KEY, StorageService} from '../services/storageService';
import {CHOICE_NODE_HEIGHT_CONSTANTS, NODE_HEIGHTS, NODE_WIDTHS} from './constants';
import {storyStyles} from './storyStyles';
import {generateStoryHTML} from './storyTemplate';

// Функция для разворачивания слоя в плоский граф
const flattenLayer = (layerId: string, layers: any, parentLayerName: string = '') => {
  const layer = layers[layerId];
  if (!layer) return {nodes: [], edges: []};

  // Получаем имя текущего слоя
  const layerName = layer.name || layerId;

  const nodes: any[] = [];
  const edges: any[] = [];

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
          const nodeHeight = startingNode.data?.height || (startingNode.type && NODE_HEIGHTS[startingNode.type as keyof typeof NODE_HEIGHTS]) || 87;

          const startingNodeTransformed: any = {
            id: startingNode.id,
            type: startingNode.type,
            position: {
              x: startingNode.coordinates?.x || 0,
              y: startingNode.coordinates?.y || 0
            },
            measured: {
              width: (startingNode.type && NODE_WIDTHS[startingNode.type as keyof typeof NODE_WIDTHS]) || 200,
              height: nodeHeight
            },
            data: {
              ...(startingNode.data || {}),
              layerInfo: {
                layerId: node.id,
                layerName: layers[node.id]?.name || node.id,
                isLayerEndpoint: true,
                endpointType: 'starting'
              }
            }
          };

          // Добавляем операции для нарративных узлов
          if (startingNode.type === 'narrative' && startingNode.operations) {
            startingNodeTransformed.operations = startingNode.operations;
          }

          nodes.push(startingNodeTransformed);
        }
      }

      // Добавляем endingNodes как реальные узлы
      if (layerNode.endingNodes && Array.isArray(layerNode.endingNodes)) {
        for (const endingNode of layerNode.endingNodes) {
          const nodeHeight = endingNode.data?.height || (endingNode.type && NODE_HEIGHTS[endingNode.type as keyof typeof NODE_HEIGHTS]) || 87;

          const endingNodeTransformed: any = {
            id: endingNode.id,
            type: endingNode.type,
            position: {
              x: endingNode.coordinates?.x || 0,
              y: endingNode.coordinates?.y || 0
            },
            measured: {
              width: (endingNode.type && NODE_WIDTHS[endingNode.type as keyof typeof NODE_WIDTHS]) || 200,
              height: nodeHeight
            },
            data: {
              ...(endingNode.data || {}),
              layerInfo: {
                layerId: node.id,
                layerName: layers[node.id]?.name || node.id,
                isLayerEndpoint: true,
                endpointType: 'ending'
              }
            }
          };

          // Добавляем операции для нарративных узлов
          if (endingNode.type === 'narrative' && endingNode.operations) {
            endingNodeTransformed.operations = endingNode.operations;
          }

          nodes.push(endingNodeTransformed);
        }
      }

      // Формируем путь для вложенного слоя
      const nestedLayerParent = parentLayerName ? `${parentLayerName} > ${layerName}` : layerName;
      // Рекурсивно обрабатываем вложенный слой с передачей пути родительского слоя
      const {nodes: layerNodes, edges: layerEdges} = flattenLayer(node.id, layers, nestedLayerParent);
      nodes.push(...layerNodes);
      edges.push(...layerEdges);
    } else {
      // Добавляем обычные узлы (narrative, choice, note)

      // Используем текущую высоту узла (если есть) или берем из констант
      const nodeHeight = node.data?.height || (node.type && NODE_HEIGHTS[node.type as keyof typeof NODE_HEIGHTS]) || 87;

      // Преобразуем формат узла для HTML-шаблона
      const transformedNode: any = {
        id: node.id,
        type: node.type,
        position: {
          x: node.coordinates?.x || 0,
          y: node.coordinates?.y || 0
        },
        measured: {
          width: (node.type && NODE_WIDTHS[node.type as keyof typeof NODE_WIDTHS]) || 200,
          height: nodeHeight
        }
      };

      // Добавляем data в зависимости от типа
      if (node.type === 'narrative' || node.type === 'choice') {
        transformedNode.data = node.data || {};

        // Для нарративных узлов добавляем операции и информацию о слое
        if (node.type === 'narrative') {
          // Добавляем операции, если они есть
          if (node.operations && node.operations.length > 0) {
            transformedNode.operations = node.operations;
          }

          // Добавляем информацию о слое
          transformedNode.data.layerInfo = {
            layerId: layerId,
            layerName: layerName !== 'root' ? layerName : ''
          };
        }
      }

      // Добавляем специфические свойства для разных типов узлов
      if (node.type === 'choice') {
        // Для choice приоритет - текущая высота из data
        transformedNode.height = node.data?.height || CHOICE_NODE_HEIGHT_CONSTANTS.BASE_HEIGHT;
      }

      nodes.push(transformedNode);
    }
  }

  // Добавляем связи текущего слоя
  for (const edgeId in layer.edges) {
    const edge = layer.edges[edgeId];
    if (!edge) continue;

    // Обрабатываем связи с концовками слоев
    if (edge.sourceHandle || edge.targetHandle) {
      // Связь через концовки слоя
      if (edge.sourceHandle && edge.targetHandle) {
        // Связь между двумя слоями через концовки - создаем прямую связь между концовками
        const sourceNode = layer.nodes[edge.startNodeId];
        const targetNode = layer.nodes[edge.endNodeId];

        if (sourceNode?.type === 'layer' && targetNode?.type === 'layer') {
          // Находим концовки в узлах слоев
          const sourceLayerNode = sourceNode as any;
          const targetLayerNode = targetNode as any;

          const endingNode = sourceLayerNode.endingNodes?.find((n: any) => n.id === edge.sourceHandle);
          const startingNode = targetLayerNode.startingNodes?.find((n: any) => n.id === edge.targetHandle);

          if (endingNode && startingNode) {
            const transformedEdge: any = {
              id: edge.id,
              source: endingNode.id, // ID концовки источника
              target: startingNode.id // ID концовки цели
            };

            // Если есть условия, добавляем их в data
            if (edge.conditions && edge.conditions.length > 0) {
              transformedEdge.data = {
                conditions: edge.conditions
              };
            }

            edges.push(transformedEdge);
          }
        }
      } else if (edge.sourceHandle) {
        // Связь от концовки слоя к обычному узлу
        const sourceNode = layer.nodes[edge.startNodeId];
        if (sourceNode?.type === 'layer') {
          // Находим концовку в развернутом слое
          const sourceLayerNode = sourceNode as any;
          const endingNode = sourceLayerNode.endingNodes?.find((n: any) => n.id === edge.sourceHandle);
          if (endingNode) {
            const transformedEdge: any = {
              id: edge.id,
              source: endingNode.id, // Используем ID концовки
              target: edge.endNodeId
            };

            // Если есть условия, добавляем их в data
            if (edge.conditions && edge.conditions.length > 0) {
              transformedEdge.data = {
                conditions: edge.conditions
              };
            }

            edges.push(transformedEdge);
          }
        }
      } else if (edge.targetHandle) {
        // Связь от обычного узла к концовке слоя
        const targetNode = layer.nodes[edge.endNodeId];
        if (targetNode?.type === 'layer') {
          // Находим концовку в развернутом слое
          const targetLayerNode = targetNode as any;
          const startingNode = targetLayerNode.startingNodes?.find((n: any) => n.id === edge.targetHandle);
          if (startingNode) {
            const transformedEdge: any = {
              id: edge.id,
              source: edge.startNodeId,
              target: startingNode.id // Используем ID концовки
            };

            // Если есть условия, добавляем их в data
            if (edge.conditions && edge.conditions.length > 0) {
              transformedEdge.data = {
                conditions: edge.conditions
              };
            }

            edges.push(transformedEdge);
          }
        }
      }
    } else {
      // Обычная связь между узлами
      // Проверяем, что оба узла не являются слоями (иначе связь будет "висячей")
      const sourceNode = layer.nodes[edge.startNodeId];
      const targetNode = layer.nodes[edge.endNodeId];

      // Пропускаем связи к узлам слоев или от узлов слоев (без концовок)
      if (sourceNode?.type === 'layer' || targetNode?.type === 'layer') {
        continue; // Эта связь к/от узла слоя без концовок - пропускаем
      }

      const transformedEdge: any = {
        id: edge.id,
        source: edge.startNodeId,
        target: edge.endNodeId
      };

      // Если есть условия, добавляем их в data
      if (edge.conditions && edge.conditions.length > 0) {
        transformedEdge.data = {
          conditions: edge.conditions
        };
      }

      edges.push(transformedEdge);
    }
  }

  return {nodes, edges};
};

// Преобразование данных из формата layers в nodes + edges
export const prepareDataForHTML = (layers: any) => {
  if (!layers || !layers.root) return {nodes: [], edges: []};
  return flattenLayer('root', layers);
};

// Функция для генерации HTML шаблона
export const generateHTMLTemplate = (title: string, storyData: any) => {
  const template = generateStoryHTML(title, storyData, {isExport: true});
  return template.replace('[STYLES_PLACEHOLDER]', storyStyles);
};

export const saveStoryDataToStorage = async (projectId: string, projectName: string, timelineId?: string) => {
  try {
    // Загружаем данные проекта из IndexedDB
    const projectData = await loadProject(projectId);

    if (!projectData) {
      console.error('No project data available for preview');
      return;
    }

    // Используем переданный timelineId или получаем текущий из GraphStore
    const currentTimelineId = timelineId || useGraphStore.getState().currentTimelineId;

    // Если timelineId не найден, берем первый доступный
    const timelineKeys = Object.keys(projectData.timelines || {});
    const finalTimelineId = timelineKeys.includes(currentTimelineId) ? currentTimelineId : timelineKeys[0];

    if (!finalTimelineId) {
      console.error('No timeline data available for preview');
      return;
    }

    const timelineData = projectData.timelines[finalTimelineId];
    const layersToUse = timelineData.layers || {};
    const parsedVariables = timelineData.variables || [];

    // Преобразуем слои в формат nodes/edges
    const {nodes, edges} = prepareDataForHTML(layersToUse);

    // Сохраняем данные для предпросмотра с помощью StorageService (оставляем для превью)
    StorageService.saveStoryPreview({
      title: projectName,
      data: {
        nodes,
        edges,
        variables: parsedVariables
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    });
  } catch (error) {
    console.error('Failed to load project data for preview:', error);
  }
};

// Функция для открытия превью HTML в новой вкладке
export const openHTMLPreview = async (projectName: string, teamId: string, startNodeId?: string, projectId?: string, timelineId?: string) => {
  // Получаем projectId из параметра или из ProjectDataService
  const currentProjectId = projectId || ProjectDataService.getStatus().currentProjectId;

  if (!currentProjectId) {
    console.error('No project ID available for preview');
    return;
  }

  // Получаем текущий timelineId
  const currentTimelineId = timelineId || useGraphStore.getState().currentTimelineId;

  if (!currentTimelineId) {
    console.error('No timeline ID available for preview');
    return;
  }

  try {
    // ИСПРАВЛЕНИЕ: Принудительно сохраняем актуальные данные в IndexedDB перед воспроизведением
    // Это обеспечивает, что все последние изменения будут включены в playback
    await useGraphStore.getState().saveToDb();

    // Пытаемся использовать новый сервис IndexedDB
    const playbackId = await PlaybackStorageService.savePlaybackData(currentProjectId, teamId, currentTimelineId, projectName, startNodeId);

    // Создаем URL с playbackId
    const playbackUrl = PlaybackStorageService.buildPlaybackUrl(currentProjectId, currentTimelineId, startNodeId);

    console.log('Opening HTML preview with IndexedDB data:', playbackId);
    window.open(playbackUrl, '_blank');
  } catch (error) {
    console.error('Failed to save playback data to IndexedDB, falling back to localStorage:', error);

    // Fallback на старый метод localStorage
    await saveStoryDataToStorage(currentProjectId, projectName, currentTimelineId);

    // Открываем в новой вкладке с новой структурой роутинга
    let url: string;
    if (currentProjectId) {
      // Используем новую структуру роутинга
      url = startNodeId ? `/${currentProjectId}/play/${currentTimelineId}?startNode=${startNodeId}` : `/${currentProjectId}/play/${currentTimelineId}`;
    } else {
      // Fallback на старую структуру
      url = startNodeId ? `/play?startNode=${startNodeId}` : '/play';
    }

    window.open(url, '_blank');
  }
};
