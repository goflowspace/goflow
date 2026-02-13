import React from 'react';

import {useTranslation} from 'react-i18next';

import {ConditionType} from '../../../../types/nodes';
import {ConditionProps} from '../types';

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

// Функция для форматирования значения с учетом типа переменной
const formatConditionValue = (value: string | number | boolean | undefined, variableType?: string): string => {
  if (value === undefined) return '';

  // Для булевых значений
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Для процентных переменных
  if (variableType === 'percent' && typeof value === 'number') {
    return `${value}%`;
  }

  // Для обычных числовых значений округляем до 2 знаков после запятой
  if (typeof value === 'number') {
    return formatNumber(value);
  }

  return String(value);
};

export const ConditionView: React.FC<ConditionProps> = ({condition}) => {
  const {t} = useTranslation();

  const renderCondition = () => {
    switch (condition.type) {
      case ConditionType.VARIABLE_COMPARISON:
        if (condition.valType === 'custom') {
          // Сравнение с кастомным значением
          return (
            <>
              <span className={styles.conditionIndex}>{condition.index}.</span>
              <span className={styles.conditionVariable}>{condition.variableName}</span>
              <span className={styles.conditionComparator}>{condition.comparator}</span>
              <span className={styles.conditionValue}>{formatConditionValue(condition.value, condition.variableType)}</span>
            </>
          );
        } else {
          // Сравнение двух переменных
          return (
            <>
              <span className={styles.conditionIndex}>{condition.index}.</span>
              <span className={styles.conditionVariable}>{condition.variableName}</span>
              <span className={styles.conditionComparator}>{condition.comparator}</span>
              <span className={styles.conditionVariable}>{condition.comparisonVariableName}</span>
            </>
          );
        }

      case ConditionType.PROBABILITY:
        return (
          <>
            <span className={styles.conditionIndex}>{condition.index}.</span>
            <span className={styles.conditionVariable}>{t('playback.log_panel.probability')}</span>
            <span className={styles.conditionComparator}>{'>'}</span>
            <span className={styles.conditionValue}>{condition.probability}%</span>
          </>
        );

      case ConditionType.NODE_HAPPENED:
        return (
          <>
            <span className={styles.conditionIndex}>{condition.index}.</span>
            <span className={styles.conditionVariable}>{t('playback.log_panel.visited_node')}</span>
            <span className={styles.conditionValue}>{condition.nodeName}</span>
          </>
        );

      case ConditionType.NODE_NOT_HAPPENED:
        return (
          <>
            <span className={styles.conditionIndex}>{condition.index}.</span>
            <span className={styles.conditionVariable}>{t('playback.log_panel.not_visited_node')}</span>
            <span className={styles.conditionValue}>{condition.nodeName}</span>
          </>
        );

      default:
        return null;
    }
  };

  return <div className={styles.condition}>{renderCondition()}</div>;
};
