import {Edge} from '@xyflow/react';

import {useGraphStore} from '../store/useGraphStore';
import {ConditionGroup} from '../types/nodes';
import {getAllNodesFromAllLayers} from './getAllNodesFromAllLayers';

/**
 * Типы возможных ошибок условий
 */
export enum ConditionErrorType {
  MISSING_CONDITION = 'missing_condition',
  INVALID_NODE_REFERENCE = 'invalid_node_reference',
  INVALID_VARIABLE_REFERENCE = 'invalid_variable_reference'
}
/**
 * Интерфейс ошибки условий
 */
export interface ConditionError {
  type: ConditionErrorType;
  edgeId: string;
  message: string;
  conditionId?: string;
  targetNodeType?: string;
}

/**
 * Интерфейс результата валидации
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ConditionError[];
}

/**
 * Получает полную информацию об узле, включая данные о startingNodes и endingNodes для слоев
 * из нашего GraphStore, а не только данные ReactFlow
 */
const getFullNodeData = (nodeId: string, nodes: Record<string, any>): any => {
  const node = nodes[nodeId];
  if (!node) return null;

  // Если это не слой или уже содержит полные данные, возвращаем как есть
  if (node.type !== 'layer' || (node.startingNodes && node.endingNodes)) {
    return node;
  }

  // Для слоя пытаемся получить полные данные из GraphStore
  try {
    const graphStore = useGraphStore.getState();

    // Сначала ищем в текущем графе
    const currentGraphId = graphStore.currentGraphId;
    const fullLayerNode = graphStore.layers[currentGraphId]?.nodes[nodeId];

    if (fullLayerNode) {
      return {...node, ...fullLayerNode};
    }

    // Если не нашли в текущем, ищем во всех графах
    for (const layerId in graphStore.layers) {
      const layerNode = graphStore.layers[layerId]?.nodes[nodeId];
      if (layerNode) {
        return {...node, ...layerNode};
      }
    }
  } catch (error) {
    console.warn('Error getting full layer node data:', error);
  }

  // Если не нашли или возникла ошибка, возвращаем исходный узел
  return node;
};

/**
 * Получает эффективный тип узла с учетом слоев
 */
const getEffectiveNodeType = (node: any, edge?: Edge): string => {
  if (!node) return 'unknown';

  const nodeType = node.type || 'unknown';

  // Если это слой и есть targetHandle, определяем тип по начальному узлу
  if (nodeType === 'layer' && edge?.targetHandle && node.startingNodes) {
    const startingNode = node.startingNodes.find((n: any) => n.id === edge.targetHandle);
    if (startingNode?.type) {
      return startingNode.type;
    }
  }

  return nodeType;
};

/**
 * Проверяет, есть ли в условиях ссылки на несуществующие узлы
 */
const validateNodeReferences = (conditionGroups: ConditionGroup[] | undefined, nodes: Record<string, any>, edgeId: string): ConditionError[] => {
  const errors: ConditionError[] = [];

  if (!conditionGroups) return errors;

  // Получаем все узлы из всех слоев для валидации
  const graphStore = useGraphStore.getState();
  const allLayers = graphStore.layers;
  const allNodesFromLayers = getAllNodesFromAllLayers(allLayers);
  // Создаем map для быстрого поиска узла по id
  const allNodesMap = new Map(allNodesFromLayers.map((node) => [node.id, node]));

  for (const group of conditionGroups) {
    for (const condition of group.conditions) {
      if ((condition.type === 'node_happened' || condition.type === 'node_not_happened') && condition.nodeId) {
        // Проверяем существование узла как в текущем слое, так и во всех слоях
        const nodeExists = nodes[condition.nodeId] || allNodesMap.has(condition.nodeId);

        if (!nodeExists) {
          errors.push({
            type: ConditionErrorType.INVALID_NODE_REFERENCE,
            edgeId,
            conditionId: condition.id,
            message: `Condition references a node that no longer exists (nodeId: ${condition.nodeId})`
          });
        }
      }
    }
  }

  return errors;
};

/**
 * Проверяет, есть ли условия на всех ветвящихся связях кроме одной
 */
const validateMultipleOutgoingEdges = (edges: Edge[], nodes: Record<string, any>): ConditionError[] => {
  const errors: ConditionError[] = [];
  const edgesBySource: Record<string, Edge[]> = {};

  // Группируем связи по источнику
  edges.forEach((edge) => {
    // Правильно определяем источник: основной узел + конкретный выход (если есть)
    const sourceId = (edge as any).sourceHandle ? `${edge.source}:${(edge as any).sourceHandle}` : edge.source;
    if (!edgesBySource[sourceId]) {
      edgesBySource[sourceId] = [];
    }
    edgesBySource[sourceId].push(edge);
  });

  // Проверяем каждый узел с множественными связями
  Object.entries(edgesBySource).forEach(([sourceId, sourceEdges]) => {
    if (sourceEdges.length <= 1) return; // Пропускаем узлы с одной связью

    // Получаем целевые узлы с учетом слоев
    const targetNodes = sourceEdges.map((edge) => {
      const targetNode = getFullNodeData(edge.target, nodes);

      // Для слоя пытаемся получить стартовый узел
      if (targetNode?.type === 'layer' && (edge as any).targetHandle && targetNode.startingNodes) {
        const startingNode = targetNode.startingNodes.find((n: any) => n.id === (edge as any).targetHandle);
        if (startingNode) return {...startingNode};
      }
      return targetNode;
    });

    // Если все целевые узлы - узлы выбора, пропускаем проверку
    if (targetNodes.every((node) => node?.type === 'choice')) return;

    // Фильтруем связи без условий
    const edgesWithoutConditions = sourceEdges
      .filter((edge) => {
        const edgeData = edge.data as {conditions?: ConditionGroup[]} | undefined;
        return !edgeData?.conditions || !edgeData.conditions.some((group) => group.conditions && group.conditions.length > 0);
      })
      .map((edge) => {
        // Определяем тип целевого узла
        const targetNode = getFullNodeData(edge.target, nodes);
        const targetNodeType = getEffectiveNodeType(targetNode, edge);

        return {...edge, targetNodeType};
      });

    // Проверяем на наличие ошибок
    if (edgesWithoutConditions.length > 1) {
      // Если есть связи к узлам choice, отфильтровываем их
      if (edgesWithoutConditions.some((edge) => edge.targetNodeType === 'choice')) {
        edgesWithoutConditions
          .filter((edge) => edge.targetNodeType !== 'choice')
          .forEach((edge) => {
            errors.push({
              type: ConditionErrorType.MISSING_CONDITION,
              edgeId: edge.id,
              message: `Multiple outgoing edges without conditions from node ${sourceId}. Target node type: ${edge.targetNodeType}`,
              targetNodeType: edge.targetNodeType
            });
          });
      } else {
        // Иначе оставляем только первую связь без ошибки
        edgesWithoutConditions.slice(1).forEach((edge) => {
          errors.push({
            type: ConditionErrorType.MISSING_CONDITION,
            edgeId: edge.id,
            message: `Multiple outgoing edges without conditions from node ${sourceId}. Target node type: ${edge.targetNodeType}`,
            targetNodeType: edge.targetNodeType
          });
        });
      }
    }
  });

  return errors;
};

/**
 * Адаптирует связи из различных форматов в единый формат Edge для React Go Flow
 */
const adaptEdges = (edges: Edge[] | any[]): Edge[] => {
  return edges.map((edge) => {
    // Если это edge из ReactFlow
    if ('source' in edge && 'target' in edge) {
      return edge as Edge;
    }
    // Если это наш формат edge (Link)
    else if ('startNodeId' in edge && 'endNodeId' in edge) {
      return {
        id: edge.id,
        source: edge.startNodeId,
        target: edge.endNodeId,
        data: {
          conditions: edge.conditions
        }
      } as Edge;
    }
    return edge as Edge;
  });
};

/**
 * Проверяет график на наличие ошибок в условиях
 */
export const validateGraph = (nodes: Record<string, any>, edges: Edge[] | any[]): ValidationResult => {
  // Адаптируем связи к единому формату
  const adaptedEdges = adaptEdges(edges);
  let allErrors: ConditionError[] = [];

  // Проверяем ссылки на несуществующие узлы
  adaptedEdges.forEach((edge) => {
    const edgeData = edge.data as {conditions?: ConditionGroup[]} | undefined;
    const errors = validateNodeReferences(edgeData?.conditions, nodes, edge.id);
    allErrors = allErrors.concat(errors);
  });

  // Проверяем наличие условий на ветвящихся связях
  const multipleOutgoingErrors = validateMultipleOutgoingEdges(adaptedEdges, nodes);
  allErrors = allErrors.concat(multipleOutgoingErrors);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Возвращает флаг, указывающий, есть ли ошибки для конкретного ребра
 */
export const hasErrorsForEdge = (edgeId: string, validationResult: ValidationResult): boolean => {
  return validationResult.errors.some((error) => error.edgeId === edgeId);
};

/**
 * Возвращает ошибки для конкретного ребра
 */
export const getErrorsForEdge = (edgeId: string, validationResult: ValidationResult): ConditionError[] => {
  return validationResult.errors.filter((error) => error.edgeId === edgeId);
};

/**
 * Проверяет, необходимо ли условие для данного ребра
 */
export const shouldHaveCondition = (edge: Edge, edges: Edge[], nodes: Record<string, any>): boolean => {
  // Получаем все исходящие связи из того же источника
  // Учитываем sourceHandle для правильной группировки связей от узлов слоя
  const edgeSourceHandle = (edge as any).sourceHandle;
  const outgoingEdges = edges.filter((e) => {
    const eSourceHandle = (e as any).sourceHandle;
    // Если оба имеют sourceHandle, то они должны совпадать
    if (edgeSourceHandle && eSourceHandle) {
      return e.source === edge.source && eSourceHandle === edgeSourceHandle;
    }
    // Если только один имеет sourceHandle, то они из разных источников
    if (edgeSourceHandle || eSourceHandle) {
      return false;
    }
    // Если оба не имеют sourceHandle, сравниваем только source
    return e.source === edge.source;
  });

  if (outgoingEdges.length <= 1) return false;

  // Получаем полную информацию о целевом узле
  const targetNode = getFullNodeData(edge.target, nodes);
  const actualTargetType = getEffectiveNodeType(targetNode, edge);

  // Если текущая связь ведет к узлу choice, условие не требуется
  if (actualTargetType === 'choice') return false;

  // Проверяем, есть ли связи к узлам choice
  const hasChoiceTargets = outgoingEdges.some((e) => {
    const tNode = getFullNodeData(e.target, nodes);
    return getEffectiveNodeType(tNode, e) === 'choice';
  });

  if (hasChoiceTargets) {
    // Условие требуется для связей, не ведущих к choice
    return true;
  } else {
    // Проверяем, является ли текущая связь первой среди связей без условий
    const edgesWithoutConditions = outgoingEdges.filter((e) => {
      const edgeData = e.data as {conditions?: ConditionGroup[]} | undefined;
      return !edgeData?.conditions || !edgeData.conditions.some((group) => group.conditions && group.conditions.length > 0);
    });

    // Если эта связь - не первая среди связей без условий, условие требуется
    return edgesWithoutConditions.length > 0 && edgesWithoutConditions[0].id !== edge.id;
  }
};

/**
 * Находит все узлы, которые расположены до указанного узла в графе потока
 * @param nodeId ID узла, для которого ищем предшественников
 * @param edges Список всех связей в графе
 * @param nodes Объект с информацией о всех узлах
 * @returns Массив ID узлов, которые находятся до указанного узла
 */
export const findPrecedingNodes = (nodeId: string, edges: Edge[], nodes: Record<string, any>): string[] => {
  const visited = new Set<string>();
  const queue: string[] = [nodeId];

  // Создаем карту входящих связей для быстрого поиска
  const incomingEdges: Record<string, Edge[]> = {};
  edges.forEach((edge) => {
    if (!incomingEdges[edge.target]) {
      incomingEdges[edge.target] = [];
    }
    incomingEdges[edge.target].push(edge);
  });

  // BFS для обхода графа в обратном направлении
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;

    // Пропускаем посещенные узлы
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    // Добавляем все узлы, из которых идут связи в текущий
    const incoming = incomingEdges[currentNodeId] || [];
    for (const edge of incoming) {
      if (!visited.has(edge.source)) {
        queue.push(edge.source);
      }
    }
  }

  // Исключаем сам узел из результата
  visited.delete(nodeId);

  return Array.from(visited);
};

/**
 * Возвращает список узлов, доступных для условий node_happened и node_not_happened
 * @param currentNodeId ID узла, для которого добавляется условие
 * @param edges Список всех связей в графе
 * @param nodes Объект с информацией о всех узлах
 * @returns Массив узлов, которые могут быть использованы в условиях
 */
export const getNodesForConditions = (currentNodeId: string, edges: Edge[], nodes: Record<string, any>) => {
  const relevantNodeTypes = ['narrative', 'choice'];
  const result: any[] = [];
  const graphStore = useGraphStore.getState();
  const allLayers = graphStore.layers;

  // Получаем все узлы из всех слоев
  const allNodesFromLayers = getAllNodesFromAllLayers(allLayers, relevantNodeTypes);

  // Преобразуем в формат, совместимый с ожидаемым результатом
  allNodesFromLayers.forEach((nodeInfo) => {
    // Добавляем только узлы нужных типов
    if (relevantNodeTypes.includes(nodeInfo.type)) {
      result.push(nodeInfo.node);
    }
  });

  return result;
};
