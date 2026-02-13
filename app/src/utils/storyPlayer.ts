/**
 * Utility functions for story playback in both export and preview modes
 */
import {STORY_KEY} from '../services/storageService';
import {GameState, evaluateConnectionConditions} from './conditionEvaluator';
import {getNextNodeWithPriorities} from './storyConditionEvaluator';

// Поиск начального узла истории
export const findStartNode = (data: any): string | null => {
  if (!data?.nodes || !data?.edges) return null;

  // Ищем narrative узел без входящих связей
  const narrativeNodes = data.nodes.filter((n: any) => n.type === 'narrative');
  const targets = data.edges.map((e: any) => e.target);

  // Узел без входящих связей
  const startNode = narrativeNodes.find((n: any) => !targets.includes(n.id));
  if (startNode) return startNode.id;

  // Или первый narrative
  if (narrativeNodes.length > 0) return narrativeNodes[0].id;

  // Или первый любой узел
  if (data.nodes.length > 0) return data.nodes[0].id;

  return null;
};

// Группировка исходящих узлов по типу
export const groupOutgoingNodesByType = (nodeId: string, data: any) => {
  // Находим все рёбра, исходящие из текущего узла
  const outgoingEdges = data.edges.filter((e: any) => e.source === nodeId);

  // Создаём объект для хранения узлов по типам
  const groupedNodes: {[key: string]: any[]} = {
    narrative: [],
    choice: [],
    layer: []
  };

  // Проходим по всем рёбрам
  outgoingEdges.forEach((edge: any) => {
    const targetNode = data.nodes.find((n: any) => n.id === edge.target);
    if (targetNode) {
      if (!groupedNodes[targetNode.type]) {
        groupedNodes[targetNode.type] = [];
      }

      // Создаем копию узла с информацией о ребре
      const nodeWithEdge = {
        ...targetNode,
        edge: {
          ...edge
        }
      };

      groupedNodes[targetNode.type].push(nodeWithEdge);
    }
  });

  return groupedNodes;
};

// Функция для получения следующего узла после выбора с учетом условий
export const getNextNodeAfterChoice = (choiceId: string, data: any, gameState?: GameState): string | null => {
  // Если передано состояние игры, используем функцию getNextNodeWithPriorities
  if (gameState) {
    return getNextNodeWithPriorities(choiceId, data, gameState);
  }

  // Если состояние не передано (для обратной совместимости),
  // просто возвращаем первый связанный узел
  const outgoingEdges = data.edges.filter((e: any) => e.source === choiceId);
  if (outgoingEdges.length === 0) {
    return null;
  }
  return outgoingEdges[0].target;
};

/**
 * Функция для получения узлов выбора.
 */
export const getChoices = (sourceNodeId: string, data: any): any[] => {
  // Получаем все исходящие ребра от sourceNode
  const outgoingEdges = data.edges.filter((e: any) => e.source === sourceNodeId);

  // Получаем все целевые узлы этих ребер, которые имеют тип 'choice'
  return outgoingEdges.map((edge: any) => data.nodes.find((n: any) => n.id === edge.target)).filter((node: any) => node && node.type === 'choice');
};

// Получение случайного элемента из массива
export const getRandomElement = (array: any[]): any => {
  if (!array || array.length === 0) return null;

  // Проверяем, есть ли поле edge с условиями
  const hasEdgeWithConditions = array.some((item) => item.edge?.data?.conditions && item.edge.data.conditions.length > 0);

  // Если есть условия, используем логику приоритетов
  if (hasEdgeWithConditions) {
    // Создаем простое состояние игры для HTML шаблона
    const gameState = createGameStateForTemplate();

    // Фильтруем и категоризируем узлы с проверкой условий
    const narrativeWithConditions: any[] = [];
    const innerNarrativeNodes: any[] = [];
    const choiceNodes: any[] = [];
    const directNodes: any[] = [];

    // Проходим по всем узлам и проверяем условия
    array.forEach((node) => {
      if (!node.edge) {
        // Узлы без ребер идут в прямые связи
        directNodes.push(node);
        return;
      }

      const hasConditions = node.edge.data?.conditions && node.edge.data.conditions.length > 0;

      // Проверяем условия перед категоризацией
      if (hasConditions) {
        // Проверка условий
        const isConditionMet = evaluateConnectionConditions(node.edge.data.conditions, gameState);

        // Если условие не выполняется, пропускаем узел
        if (!isConditionMet) return;

        // Категоризируем по типу узла
        if (node.type === 'narrative') {
          narrativeWithConditions.push(node);
        } else if (node.type === 'choice') {
          choiceNodes.push(node);
        }
      } else {
        // Для узлов без условий
        if (node.type === 'narrative') {
          innerNarrativeNodes.push(node);
        } else {
          directNodes.push(node);
        }
      }
    });

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
  }

  // Для обратной совместимости - просто случайный элемент
  return array[Math.floor(Math.random() * array.length)];
};

// Создание простого состояния игры для использования в HTML шаблоне
export const createGameStateForTemplate = (): GameState => {
  // Инициализируем пустой объект переменных
  const variables: Record<string, any> = {};

  // Пытаемся получить переменные из локального хранилища
  try {
    const storyData = localStorage.getItem(STORY_KEY);
    if (storyData) {
      const parsedData = JSON.parse(storyData);
      if (parsedData.data && parsedData.data.variables) {
        parsedData.data.variables.forEach((variable: any) => {
          variables[variable.id] = variable.value;
        });
      }
    }
  } catch (error) {
    console.error('Error parsing variables:', error);
  }

  return {
    variables,
    visitedNodes: new Set()
  };
};
