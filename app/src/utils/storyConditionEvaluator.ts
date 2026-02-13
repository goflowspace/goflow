/**
 * Утилиты для оценки условий в контексте воспроизведения истории
 * Этот файл содержит функции, которые используются для проверки условий перехода
 * между узлами при воспроизведении истории
 */
import {ConditionGroup} from '../types/nodes';
import {GameState, evaluateConnectionConditions} from './conditionEvaluator';

/**
 * Проверяет, выполняются ли условия для перехода между узлами
 *
 * @param sourceNodeId ID исходного узла
 * @param targetNodeId ID целевого узла
 * @param storyData Данные истории
 * @param gameState Текущее состояние игры
 * @returns true, если условия выполнены или условий нет
 */
export const evaluateTransitionConditions = (sourceNodeId: string, targetNodeId: string, storyData: any, gameState: GameState): boolean => {
  // Ищем ребро, соединяющее исходный и целевой узлы
  const edge = storyData.edges.find((e: any) => e.source === sourceNodeId && e.target === targetNodeId);

  // Если ребро не найдено, возвращаем false
  if (!edge) return false;

  // Извлекаем условия из ребра
  const conditions = edge.data?.conditions;

  // Проверяем условия
  return evaluateConnectionConditions(conditions, gameState);
};

/**
 * Фильтрует исходящие ребра по условиям
 *
 * @param nodeId ID узла, из которого исходят ребра
 * @param storyData Данные истории
 * @param gameState Текущее состояние игры
 * @returns Массив ребер, для которых выполняются условия
 */
export const getValidEdges = (nodeId: string, storyData: any, gameState: GameState): any[] => {
  // Находим все исходящие ребра
  const outgoingEdges = storyData.edges.filter((e: any) => e.source === nodeId);

  // Если нет исходящих ребер, возвращаем пустой массив
  if (!outgoingEdges || outgoingEdges.length === 0) {
    return [];
  }

  // Фильтруем ребра по условиям
  return outgoingEdges.filter((edge: any) => {
    // Получаем условия из data.conditions
    const conditions = edge.data?.conditions as ConditionGroup[] | undefined;
    return evaluateConnectionConditions(conditions, gameState);
  });
};

/**
 * Разделяет ребра на основе наличия условий
 *
 * @param edges Массив ребер
 * @returns Объект с массивами ребер с условиями и без условий
 */
const separateEdgesByConditions = (edges: any[]): {withConditions: any[]; withoutConditions: any[]} => {
  const withConditions: any[] = [];
  const withoutConditions: any[] = [];

  edges.forEach((edge) => {
    if (edge.data?.conditions && edge.data.conditions.length > 0) {
      withConditions.push(edge);
    } else {
      withoutConditions.push(edge);
    }
  });

  return {withConditions, withoutConditions};
};

/**
 * Разделяет исходящие связи на разные типы в соответствии с приоритетами:
 * 1. Логические пути к нарративным узлам с условиями
 * 2. Логические пути внутри нарративных узлов
 * 3. Связи к узлам выбора с условиями
 * 4. Прямые связи без условий
 *
 * @param nodeId ID узла, из которого исходят связи
 * @param storyData Данные истории
 * @param gameState Текущее состояние игры
 * @returns Объект с разделенными связями по приоритетам
 */
export const categorizeConnectionsByPriority = (
  nodeId: string,
  storyData: any,
  gameState: GameState
): {
  narrativeWithConditions: any[];
  innerNarrativeWithConditions: any[];
  choiceWithConditions: any[];
  directConnections: any[];
} => {
  // Получаем ВСЕ исходящие ребра (не только действительные)
  const allEdges = storyData.edges.filter((e: any) => e.source === nodeId);

  // Подготавливаем категории связей
  const narrativeWithConditions: any[] = [];
  const innerNarrativeWithConditions: any[] = [];
  const choiceWithConditions: any[] = [];
  const directConnections: any[] = [];

  // Распределяем связи по категориям
  allEdges.forEach((edge: any) => {
    const targetNode = storyData.nodes.find((n: any) => n.id === edge.target);
    if (!targetNode) return;

    const hasConditions = edge.data?.conditions && edge.data.conditions.length > 0;

    // Проверяем условия (если они есть) перед категоризацией
    if (hasConditions) {
      // Получаем условия
      const conditions = edge.data.conditions;
      // Проверяем, выполняются ли условия
      const isConditionMet = evaluateConnectionConditions(conditions, gameState);

      // Если условие не выполняется, пропускаем эту связь
      if (!isConditionMet) return;

      // 1. Логические пути к нарративным узлам с условиями (которые выполняются)
      if (targetNode.type === 'narrative') {
        narrativeWithConditions.push(edge);
      }
      // 3. Связи к узлам выбора с условиями (которые выполняются)
      else if (targetNode.type === 'choice') {
        choiceWithConditions.push(edge);
      }
    } else {
      // Для связей без условий
      // 2. Логические пути внутри нарративных узлов (между нарративами)
      if (targetNode.type === 'narrative') {
        innerNarrativeWithConditions.push(edge);
      }
      // 4. Прямые связи (включая связи к выбору без условий)
      else {
        directConnections.push(edge);
      }
    }
  });

  return {
    narrativeWithConditions,
    innerNarrativeWithConditions,
    choiceWithConditions,
    directConnections
  };
};

/**
 * Получает следующий узел с учетом заданных приоритетов проверки:
 * 1. Логические пути нарратива с условиями
 * 2. Условия внутри логических путей нарратива
 * 3. Связи в выборы с условиями
 * 4. Прямые связи без условий
 *
 * @param nodeId ID узла, из которого исходят связи
 * @param storyData Данные истории
 * @param gameState Текущее состояние игры
 * @returns ID следующего узла или null, если нет подходящего перехода
 */
export const getNextNodeWithPriorities = (nodeId: string, storyData: any, gameState: GameState): string | null => {
  // Категоризируем связи по приоритетам
  const {narrativeWithConditions, innerNarrativeWithConditions, choiceWithConditions, directConnections} = categorizeConnectionsByPriority(nodeId, storyData, gameState);

  // Проверяем каждую категорию по порядку приоритета

  // 1. Сначала проверяем логические пути нарратива с условиями
  if (narrativeWithConditions.length > 0) {
    // Если есть несколько, выбираем случайно
    const randomIndex = Math.floor(Math.random() * narrativeWithConditions.length);
    return narrativeWithConditions[randomIndex].target;
  }

  // 2. Затем проверяем условия внутри логических путей нарратива
  if (innerNarrativeWithConditions.length > 0) {
    const randomIndex = Math.floor(Math.random() * innerNarrativeWithConditions.length);
    return innerNarrativeWithConditions[randomIndex].target;
  }

  // 3. Затем проверяем связи в выборы с условиями
  if (choiceWithConditions.length > 0) {
    const randomIndex = Math.floor(Math.random() * choiceWithConditions.length);
    return choiceWithConditions[randomIndex].target;
  }

  // 4. Наконец, проверяем прямые связи без условий
  if (directConnections.length > 0) {
    // Для прямых связей берем первую, а не случайную
    return directConnections[0].target;
  }

  // Если нет ни одного подходящего перехода
  return null;
};

/**
 * Фильтрует узлы по категориям в соответствии с приоритетами проверки
 * и проверяет условия на ребрах, возвращая только узлы с выполняющимися условиями
 *
 * @param narrativeNodes Массив нарративных узлов с информацией о ребрах
 * @param gameState Текущее состояние игры
 * @returns Узлы, разделенные по категориям
 */
export const categorizeNodesByPriority = (
  narrativeNodes: any[],
  gameState: GameState
): {
  narrativeWithConditions: any[];
  innerNarrativeNodes: any[];
  choiceNodes: any[];
  directNodes: any[];
} => {
  // Фильтруем узлы по условиям (Проверяем выполнение условий)
  const availableNodes = filterNodesByConditions(narrativeNodes, gameState);

  // Категории узлов
  const narrativeWithConditions: any[] = [];
  const innerNarrativeNodes: any[] = [];
  const choiceNodes: any[] = [];
  const directNodes: any[] = [];

  // Распределяем узлы по категориям
  availableNodes.forEach((node) => {
    const hasEdgeConditions = node.edge?.data?.conditions && node.edge.data.conditions.length > 0;

    // Категоризируем по типу узла и наличию условий на ребре
    if (node.type === 'narrative' && hasEdgeConditions) {
      narrativeWithConditions.push(node);
    } else if (node.type === 'narrative') {
      innerNarrativeNodes.push(node);
    } else if (node.type === 'choice' && hasEdgeConditions) {
      choiceNodes.push(node);
    } else {
      directNodes.push(node);
    }
  });

  return {
    narrativeWithConditions,
    innerNarrativeNodes,
    choiceNodes,
    directNodes
  };
};

/**
 * Выбирает узел из массива нарративных узлов с учетом приоритетов
 *
 * @param narrativeNodes Массив нарративных узлов с информацией о ребрах
 * @param gameState Текущее состояние игры
 * @returns Выбранный узел или null, если нет доступных узлов
 */
export const getFirstAvailableNode = (narrativeNodes: any[], gameState: GameState): any => {
  if (!narrativeNodes || narrativeNodes.length === 0) return null;

  // Категоризируем узлы по приоритетам
  const {narrativeWithConditions, innerNarrativeNodes, choiceNodes, directNodes} = categorizeNodesByPriority(narrativeNodes, gameState);

  // Следуем приоритетам
  // 1. Логические пути нарратива с условиями
  if (narrativeWithConditions.length > 0) {
    const randomIndex = Math.floor(Math.random() * narrativeWithConditions.length);
    return narrativeWithConditions[randomIndex];
  }

  // 2. Условия внутри логических путей
  if (innerNarrativeNodes.length > 0) {
    const randomIndex = Math.floor(Math.random() * innerNarrativeNodes.length);
    return innerNarrativeNodes[randomIndex];
  }

  // 3. Связи в выборы
  if (choiceNodes.length > 0) {
    const randomIndex = Math.floor(Math.random() * choiceNodes.length);
    return choiceNodes[randomIndex];
  }

  // 4. Прямые связи
  if (directNodes.length > 0) {
    // Берем первый, а не случайный
    return directNodes[0];
  }

  // Если нет доступных узлов
  return null;
};

/**
 * Получает следующий узел после выбора с учетом приоритетов
 *
 * @param choiceId ID узла выбора
 * @param storyData Данные истории
 * @param gameState Текущее состояние игры
 * @returns ID следующего узла или null, если нет подходящего перехода
 */
export const getNextNodeAfterConditions = (choiceId: string, storyData: any, gameState: GameState): string | null => {
  return getNextNodeWithPriorities(choiceId, storyData, gameState);
};

/**
 * Проверяет, доступен ли узел (доступны ли связи, ведущие к нему)
 *
 * @param targetNode Целевой узел с информацией о ребре
 * @param gameState Текущее состояние игры
 * @returns true, если условия выполнены или условий нет
 */
export const isNodeAvailable = (targetNode: any, gameState: GameState): boolean => {
  // Проверяем наличие ребра
  if (!targetNode.edge) return true;

  // Извлекаем условия из ребра
  const conditions = targetNode.edge.data?.conditions;

  // Проверяем условия
  return evaluateConnectionConditions(conditions, gameState);
};

/**
 * Фильтрует массив узлов по условиям на ребрах, ведущих к ним
 *
 * @param nodes Массив узлов с информацией о ребрах
 * @param gameState Текущее состояние игры
 * @returns Массив доступных узлов
 */
export const filterNodesByConditions = (nodes: any[], gameState: GameState): any[] => {
  return nodes.filter((node) => isNodeAvailable(node, gameState));
};

/**
 * Фильтрует массив узлов по условиям на ребрах, ведущих к ним
 * и разделяет их на узлы с условиями и без условий
 *
 * @param nodes Массив узлов с информацией о ребрах
 * @param gameState Текущее состояние игры
 * @returns Объект с массивами доступных узлов с условиями и без условий
 */
export const getAvailableNodesWithPriority = (nodes: any[], gameState: GameState): {withConditions: any[]; withoutConditions: any[]} => {
  // Фильтруем узлы по условиям
  const availableNodes = filterNodesByConditions(nodes, gameState);

  // Разделяем узлы на узлы с условиями и без условий
  const withConditions: any[] = [];
  const withoutConditions: any[] = [];

  availableNodes.forEach((node) => {
    if (node.edge?.data?.conditions && node.edge.data.conditions.length > 0) {
      withConditions.push(node);
    } else {
      withoutConditions.push(node);
    }
  });

  return {withConditions, withoutConditions};
};

// Заменяем предыдущие функции более специализированными
export const getPrioritizedNextNode = getNextNodeWithPriorities;
