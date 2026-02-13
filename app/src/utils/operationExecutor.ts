/**
 * Утилиты для выполнения операций над переменными во время прохождения истории
 */
import {OperationTarget, Variable, VariableOperation} from '../types/variables';
import {GameState} from './conditionEvaluator';

/**
 * Выполняет операции, относящиеся к определенному узлу
 * @param nodeId ID узла, операции которого нужно выполнить
 * @param variables Список переменных
 * @param gameState Состояние игры до выполнения операций
 * @param storyData Данные истории с узлами и их операциями (опционально)
 * @returns Обновленное состояние игры после выполнения операций
 */

export const executeNodeOperations = (nodeId: string, variables: Variable[], gameState: GameState, storyData?: any): GameState => {
  // По умолчанию операций нет
  let nodeOperations: VariableOperation[] = [];

  // Если есть данные истории, ищем узел и его операции
  if (storyData?.nodes) {
    const node = storyData.nodes.find((n: any) => n.id === nodeId);
    if (node?.operations) {
      nodeOperations = node.operations.filter((op: VariableOperation) => op.enabled !== false);
    }
  }

  // Если операций нет, возвращаем исходное состояние
  if (nodeOperations.length === 0) return gameState;

  // Сортируем операции по порядку, если есть поле order
  nodeOperations.sort((a, b) => (a.order || 0) - (b.order || 0));

  let updatedState = {...gameState};

  // Выполняем операции по порядку
  for (const operation of nodeOperations) {
    updatedState = executeOperation(operation, variables, updatedState);
  }

  return updatedState;
};

/**
 * Получает и при необходимости конвертирует значение цели для арифметических операций
 * с учетом процентного типа переменной
 */
const getConvertedTargetValue = (operation: VariableOperation, variable: Variable, gameState: GameState): number => {
  let targetValue = getTargetValue(operation.target, variable.type, gameState);

  // Для процентных переменных конвертируем числовое значение в проценты
  if (isPercentValueToConvert(variable, operation)) {
    targetValue = convertValueForPercentVariable(Number(targetValue));
  }

  return Number(targetValue);
};

/**
 * Выполняет отдельную операцию и возвращает обновленное состояние игры
 */
const executeOperation = (operation: VariableOperation, variables: Variable[], gameState: GameState): GameState => {
  // Находим переменную, на которую применяется операция
  const variable = variables.find((v) => v.id === operation.variableId);
  if (!variable) return gameState; // Если переменная не найдена, возвращаем неизмененное состояние

  // Получаем текущее значение переменной
  const currentValue = gameState.variables[variable.id] !== undefined ? gameState.variables[variable.id] : variable.value;

  // Копируем состояние игры для обновления
  const updatedState = {
    ...gameState,
    variables: {...gameState.variables}
  };

  // Обработка для разных типов операций
  switch (operation.operationType) {
    case 'override': {
      // Устанавливаем новое значение
      updatedState.variables[variable.id] = getTargetValue(operation.target, variable.type, gameState);
      break;
    }

    case 'invert': {
      // Инвертируем булево значение
      if (variable.type === 'boolean') {
        updatedState.variables[variable.id] = !currentValue;
      }
      break;
    }

    case 'join': {
      // Объединяем строки
      if (variable.type === 'string') {
        const targetValue = getTargetValue(operation.target, variable.type, gameState);
        updatedState.variables[variable.id] = `${currentValue}${targetValue}`;
      }
      break;
    }

    case 'addition': {
      // Сложение для числовых типов
      if (variable.type === 'integer' || variable.type === 'float' || variable.type === 'percent') {
        const targetValue = getConvertedTargetValue(operation, variable, gameState);
        updatedState.variables[variable.id] = Number(currentValue) + targetValue;
      }
      break;
    }

    case 'subtract': {
      // Вычитание для числовых типов
      if (variable.type === 'integer' || variable.type === 'float' || variable.type === 'percent') {
        const targetValue = getConvertedTargetValue(operation, variable, gameState);
        updatedState.variables[variable.id] = Number(currentValue) - targetValue;
      }
      break;
    }

    case 'multiply': {
      // Умножение для числовых типов
      if (variable.type === 'integer' || variable.type === 'float' || variable.type === 'percent') {
        const targetValue = getConvertedTargetValue(operation, variable, gameState);
        updatedState.variables[variable.id] = Number(currentValue) * targetValue;
      }
      break;
    }

    case 'divide': {
      // Деление для числовых типов
      if (variable.type === 'integer' || variable.type === 'float' || variable.type === 'percent') {
        const targetValue = getConvertedTargetValue(operation, variable, gameState);

        // Проверка деления на ноль
        if (targetValue !== 0) {
          updatedState.variables[variable.id] = Number(currentValue) / targetValue;
        }
      }
      break;
    }
  }

  return updatedState;
};

/**
 * Получает значение цели операции (переменная или кастомное значение)
 */
const getTargetValue = (target: OperationTarget | undefined, variableType: string, gameState: GameState): any => {
  if (!target) return '';

  if (target.type === 'variable') {
    // Если цель - переменная, берем ее значение из состояния игры
    const targetVarId = target.variableId;
    if (!targetVarId) return '';

    return gameState.variables[targetVarId] !== undefined ? gameState.variables[targetVarId] : '';
  } else {
    // Если цель - кастомное значение
    return target.value;
  }
};

/**
 * Преобразует числовое значение для процентной переменной
 * Если операция выполняется с процентной переменной и обычным числом,
 * числовое значение преобразуется в проценты (умножается на 0.01)
 */
const convertValueForPercentVariable = (value: number): number => {
  return value * 0.01;
};

/**
 * Проверяет, является ли значение процентным типом и нуждается в конвертации
 */
const isPercentValueToConvert = (variable: Variable | undefined, operation: VariableOperation): boolean => {
  // Проверяем, является ли переменная процентной и операция арифметической
  return !!variable && variable.type === 'percent' && ['addition', 'subtract'].includes(operation.operationType) && operation.target?.type === 'custom' && typeof operation.target.value === 'number';
};
