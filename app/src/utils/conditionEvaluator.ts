/**
 * Утилиты для проверки условий в процессе игры
 */
import {Condition, ConditionGroup} from '../types/nodes';

// Тип для состояния игры
export interface GameState {
  variables: Record<string, any>; // Значения переменных
  visitedNodes: Set<string>; // Посещенные узлы
}

/**
 * Проверяет, выполняются ли условия для перехода по связи
 * Возвращает true, если условия выполнены или условий нет
 */
export const evaluateConnectionConditions = (conditionGroups: ConditionGroup[] | undefined, gameState: GameState): boolean => {
  // Если условий нет, переход всегда разрешен
  if (!conditionGroups || conditionGroups.length === 0) {
    return true;
  }

  // Проверяем группы условий с оператором OR (Достаточно, чтобы одна группа вернула true)
  for (const group of conditionGroups) {
    // Если это группа OR и все условия в ней выполняются, возвращаем true
    if (group.operator === 'OR' && evaluateConditionGroup(group, gameState)) {
      return true;
    }
  }

  // Проверяем группы условий с оператором AND (Все условия должны выполняться)
  const andGroups = conditionGroups.filter((group) => group.operator === 'AND');
  if (andGroups.length === 0) {
    // Если нет групп AND, но были группы OR и они не выполнились, возвращаем false
    return false;
  }

  // Все группы AND должны выполняться
  return andGroups.every((group) => evaluateConditionGroup(group, gameState));
};

/**
 * Проверяет, выполняются ли все условия в группе
 */
export const evaluateConditionGroup = (group: ConditionGroup, gameState: GameState): boolean => {
  // Если условий нет, группа считается выполненной
  if (!group.conditions || group.conditions.length === 0) {
    return true;
  }

  // Для AND все условия должны быть true
  if (group.operator === 'AND') {
    return group.conditions.every((condition) => evaluateCondition(condition, gameState));
  }
  // Для OR достаточно одного true
  else if (group.operator === 'OR') {
    return group.conditions.some((condition) => evaluateCondition(condition, gameState));
  }

  return false;
};

/**
 * Проверяет, выполняется ли одно условие
 */
export const evaluateCondition = (condition: Condition, gameState: GameState): boolean => {
  switch (condition.type) {
    case 'probability':
      // Для вероятности генерируем случайное число и сравниваем с заданной вероятностью
      return Math.random() < (condition.probability || 0);

    case 'variable_comparison':
      // Сравнение переменных
      return evaluateVariableComparison(condition, gameState);

    case 'node_happened':
      // Проверка на посещение узла
      return gameState.visitedNodes.has(condition.nodeId || '');

    case 'node_not_happened':
      // Проверка на НЕ посещение узла
      return !gameState.visitedNodes.has(condition.nodeId || '');

    default:
      return false;
  }
};

/**
 * Проверяет условие сравнения переменных
 */
export const evaluateVariableComparison = (condition: Condition, gameState: GameState): boolean => {
  // Получаем значения переменных
  const leftVarId = condition.varId;
  const operator = condition.operator || 'eq';

  if (!leftVarId) return false;

  const leftValue = gameState.variables[leftVarId];
  let rightValue;

  // Определяем правую часть сравнения (переменная или кастомное значение)
  if (condition.valType === 'variable') {
    const rightVarId = condition.comparisonVarId;
    if (!rightVarId) return false;
    rightValue = gameState.variables[rightVarId];
  } else {
    rightValue = condition.value;

    // Если значение правой части для процентной переменной является обычным числом,
    // преобразуем его в процентное значение для правильного сравнения
    if (typeof rightValue === 'number' && condition.percentType === true) {
      rightValue = rightValue * 0.01; // Преобразуем число в процентное значение (делим на 100)
    }
  }

  // Выполняем сравнение
  switch (operator) {
    case 'eq':
      return leftValue == rightValue;
    case 'neq':
      return leftValue != rightValue;
    case 'gt':
      return leftValue > rightValue;
    case 'gte':
      return leftValue >= rightValue;
    case 'lt':
      return leftValue < rightValue;
    case 'lte':
      return leftValue <= rightValue;
    default:
      return false;
  }
};
