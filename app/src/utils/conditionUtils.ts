import {TFunction} from 'i18next';
import {nanoid} from 'nanoid';
import {useTranslation} from 'react-i18next';

import {Condition, ConditionGroup} from '../types/nodes';

/**
 * Получает группы условий из ребра, преобразуя из старого формата при необходимости
 * @param conditions Существующие условия ребра
 * @returns Массив групп условий с операторами AND и OR
 */
export const getConditionGroups = (conditions?: ConditionGroup[]): ConditionGroup[] => {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    // Возвращаем пустую структуру с группами AND и OR
    return [
      {
        id: nanoid(),
        operator: 'AND',
        conditions: []
      },
      {
        id: nanoid(),
        operator: 'OR',
        conditions: []
      }
    ];
  }

  // Проверяем, есть ли группы AND и OR
  const andGroup = conditions.find((group) => group.operator === 'AND');
  const orGroup = conditions.find((group) => group.operator === 'OR');

  const result: ConditionGroup[] = [];

  // Добавляем AND группу, если существует
  if (andGroup) {
    result.push({...andGroup});
  } else {
    result.push({
      id: nanoid(),
      operator: 'AND',
      conditions: []
    });
  }

  // Добавляем OR группу, если существует
  if (orGroup) {
    result.push({...orGroup});
  } else {
    result.push({
      id: nanoid(),
      operator: 'OR',
      conditions: []
    });
  }

  return result;
};

/**
 * Преобразует оператор в человекочитаемый текст
 */
export const getOperatorTextLocalized = (t: TFunction, op: string): string => {
  let text = '';
  switch (op) {
    case 'eq':
      text = t('conditions_master.operation_selector_equals', 'Equals');
      break;
    case 'neq':
      text = t('conditions_master.operation_selector_not_equal', 'Not equal');
      break;
    case 'gte':
      text = t('conditions_master.operation_selector_gte', 'Greater or equal');
      break;
    case 'lt':
      text = t('conditions_master.operation_selector_lt', 'Less than');
      break;
    case 'gt':
      text = t('conditions_master.operation_selector_gt', 'Greater than');
      break;
    case 'lte':
      text = t('conditions_master.operation_selector_lte', 'Less or equal');
      break;
    default:
      text = op;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Преобразует оператор в символ
 */
export const getOperatorSymbol = (op: string): string => {
  const opMap: Record<string, string> = {
    eq: '=',
    neq: '!=',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤'
  };
  return opMap[op] || '=';
};

/**
 * Форматирует значение условия для отображения на основе типа переменной
 * @param condition Условие, содержащее значение и ID переменной
 * @param variables Массив переменных для определения типа
 * @returns Отформатированное значение
 */
export const formatConditionValue = (condition: any, variables: any[]): string => {
  // Получаем значение из условия
  const value = condition.value;

  // Проверяем, если это булев тип
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Находим переменную по ID для определения типа
  if (condition.varId && variables && variables.length > 0) {
    const variable = variables.find((v) => v.id === condition.varId);

    // Если это процентная переменная, добавляем символ %
    if (variable && variable.type === 'percent' && typeof value === 'number') {
      return `${value}%`;
    }
  }

  return String(value);
};

/**
 * Возвращает свойства иконки для типа условия
 * @param type Тип условия
 * @returns Объект с названием иконки и размерами
 */
export const getConditionIconProps = (type: string): {iconName: string; size?: number} => {
  switch (type) {
    case 'probability':
      return {iconName: 'CubeIcon', size: 20};
    case 'variable_comparison':
      return {iconName: 'RulerSquareIcon', size: 14};
    case 'node_happened':
      return {iconName: 'EyeOpenIcon', size: 20};
    case 'node_not_happened':
      return {iconName: 'EyeNoneIcon', size: 20};
    default:
      return {iconName: ''};
  }
};
