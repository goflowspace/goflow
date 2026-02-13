import React from 'react';

import {useTranslation} from 'react-i18next';

import {OperationType} from '../../../../types/variables';
import {OperationProps} from '../types';

import styles from '../styles.module.css';

// Функция для форматирования числовых значений с округлением до 2 знаков после запятой
const formatNumber = (value: number): string => {
  // Проверяем, является ли число целым
  if (Number.isInteger(value)) {
    return String(value);
  }

  // Округляем до 2 знаков после запятой
  return Number(value.toFixed(2)).toString();
};

// Функция для форматирования оператора
const formatOperator = (operator: OperationType, t: (key: string) => string): string => {
  switch (operator) {
    case 'addition':
      return '+';
    case 'subtract':
      return '-';
    case 'multiply':
      return '×';
    case 'divide':
      return '÷';
    case 'override':
      return '';
    case 'invert':
      return t('playback.operations.inverted');
    case 'join':
      return t('playback.operations.joined');
    default:
      return operator;
  }
};

// Функция для форматирования результата операции
const formatResult = (result: string | number | boolean | undefined, variableType?: string): string => {
  if (result === undefined) {
    return 'N/A';
  }

  if (typeof result === 'boolean') {
    return result ? 'true' : 'false';
  }

  if (typeof result === 'string') {
    return `"${result}"`;
  }

  // Форматирование числовых значений с учетом типа переменной
  if (typeof result === 'number' && variableType === 'percent') {
    // Результат приходит как доля (0-1), конвертируем в проценты
    return `${Math.round(result * 100)}%`;
  }

  // Для обычных числовых значений округляем до 2 знаков после запятой
  if (typeof result === 'number') {
    return formatNumber(result);
  }

  return String(result);
};

// Функция для форматирования значения операции
const formatValue = (value: string | number | boolean | undefined, variableType?: string, isVariableValue?: boolean): string => {
  if (value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string') {
    // Если это имя переменной, не добавляем кавычки
    if (isVariableValue) {
      return value;
    }
    // Для кастомных строковых значений добавляем кавычки
    return `"${value}"`;
  }

  // Форматирование числовых значений с учетом типа переменной
  if (typeof value === 'number' && variableType === 'percent') {
    // Значение уже в процентах, просто добавляем символ %
    return `${Math.round(value * 100)}%`;
  }

  // Для обычных числовых значений округляем до 2 знаков после запятой
  if (typeof value === 'number') {
    return formatNumber(value);
  }

  return String(value);
};

export const OperationView: React.FC<OperationProps> = ({operation, index}) => {
  const {t} = useTranslation();

  return (
    <div className={styles.operation}>
      <span className={styles.operationIndex}>{index}.</span>
      <span className={styles.operationVariable}>{operation.variableName}</span>
      <span className={styles.operationOperator}>{formatOperator(operation.operator, t)}</span>
      {operation.operator !== 'override' && operation.operator !== 'invert' && operation.value !== undefined && (
        <span className={styles.operationValue}>{formatValue(operation.value, operation.variableType, operation.isVariableValue)}</span>
      )}
      <span className={styles.operationArrow}>→</span>
      <span className={styles.operationResult}>{formatResult(operation.result, operation.variableType)}</span>
    </div>
  );
};
