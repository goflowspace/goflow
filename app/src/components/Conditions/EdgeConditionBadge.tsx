'use client';

import React from 'react';

import {CubeIcon, ExclamationTriangleIcon, EyeNoneIcon, EyeOpenIcon, RulerSquareIcon} from '@radix-ui/react-icons';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '../../store/useGraphStore';
import {useVariablesStore} from '../../store/useVariablesStore';
import {Condition} from '../../types/nodes';
import {getConditionIconProps} from '../../utils/conditionUtils';
import {getNodeTitle} from '../../utils/getNodeTitle';

import styles from './Conditions.module.scss';

interface EdgeConditionBadgeProps {
  edgeId: string;
  x: number;
  y: number;
  onClick?: (e: React.MouseEvent) => void;
  hasError?: boolean;
}

export const EdgeConditionBadge: React.FC<EdgeConditionBadgeProps> = ({edgeId, x, y, onClick, hasError = false}) => {
  const {t} = useTranslation();
  // Получаем данные ребра и переменные
  const graphStore = useGraphStore();
  const currentLayer = graphStore.layers[graphStore.currentGraphId];
  const edge = currentLayer?.edges[edgeId];
  const variables = useVariablesStore((state) => state.variables);

  // Если ребра нет или нет условий, ничего не отображаем
  if (!edge || !edge.conditions || edge.conditions.length === 0) {
    return null;
  }

  // Подсчет общего количества условий во всех группах
  let conditionsCount = 0;
  let firstCondition: Condition | null = null;

  // Находим все условия и первое условие для отображения
  for (const group of edge.conditions) {
    if (group.conditions && group.conditions.length > 0) {
      conditionsCount += group.conditions.length;

      // Запоминаем первое условие для отображения
      if (!firstCondition) {
        firstCondition = group.conditions[0];
      }
    }
  }

  // Определяем, есть ли несколько условий
  const hasMultipleConditions = conditionsCount > 1;

  // Если нет условий, ничего не отображаем
  if (!firstCondition) {
    return null;
  }

  // Получаем иконку для типа условия
  const getConditionIcon = () => {
    const {iconName, size = 20} = getConditionIconProps(firstCondition?.type || '');

    switch (iconName) {
      case 'CubeIcon':
        return <CubeIcon className={styles.badge_condition_icon} height={`${size}px`} width={`${size}px`} />;
      case 'RulerSquareIcon':
        return <RulerSquareIcon className={styles.badge_condition_icon} height={`${size}px`} width={`${size}px`} />;
      case 'EyeOpenIcon':
        return <EyeOpenIcon className={styles.badge_condition_icon} height={`${size}px`} width={`${size}px`} />;
      case 'EyeNoneIcon':
        return <EyeNoneIcon className={styles.badge_condition_icon} height={`${size}px`} width={`${size}px`} />;
      default:
        return null;
    }
  };

  // Форматируем текст условия для отображения
  const getConditionText = () => {
    switch (firstCondition?.type) {
      case 'probability':
        return `${(firstCondition.probability || 0) * 100}%`;
      case 'variable_comparison': {
        const leftVar = variables.find((v) => v.id === firstCondition?.varId);
        if (!leftVar) return t('conditions_dialog.no_conditions_hint', 'N/A');

        const opMap: Record<string, string> = {
          eq: '=',
          neq: '!=',
          gt: '>',
          gte: '≥',
          lt: '<',
          lte: '≤'
        };
        const op = opMap[firstCondition.operator || 'eq'] || '=';

        if (firstCondition.valType === 'variable') {
          const rightVar = variables.find((v) => v.id === firstCondition.comparisonVarId);
          return `${leftVar.name} ${op} ${rightVar ? rightVar.name : '?'}`;
        } else {
          // Добавляем знак % для процентных переменных
          const value = firstCondition.value;
          const isPercent = leftVar.type === 'percent' && typeof value === 'number';
          return `${leftVar.name} ${op} ${isPercent ? `${value}%` : value}`;
        }
      }
      case 'node_happened':
      case 'node_not_happened': {
        const nodeId = firstCondition.nodeId;
        if (!nodeId) return t('conditions_master.node_not_selected', 'Node not selected');
        for (const layerId in graphStore.layers) {
          const layer = graphStore.layers[layerId];
          const node = layer.nodes[nodeId];
          if (node) {
            return getNodeTitle(node);
          }
        }
        return t('conditions_master.node_not_found', 'Node not found');
      }
      default:
        return t('conditions_dialog.no_conditions_hint', 'N/A');
    }
  };

  // Обработчик клика по бейджу
  const handleClick = (e: React.MouseEvent) => {
    // Останавливаем всплытие и предотвращаем стандартное поведение
    e.stopPropagation();
    e.preventDefault();

    if (onClick) {
      onClick(e);
    }
  };

  // Высота бейджа
  const badgeHeight = 36;
  // Смещение для эффекта стопки
  const stackOffset = 4;

  // Отображаем бейдж с иконкой и текстом условия
  return (
    <foreignObject
      width={150}
      height={hasMultipleConditions ? badgeHeight + stackOffset + 5 : badgeHeight}
      x={x - 75}
      y={y - (hasMultipleConditions ? badgeHeight / 2 + stackOffset / 2 : badgeHeight / 2)}
      className={styles.badge_foreignobject}
      style={{zIndex: 10}}
    >
      {/* Если есть несколько условий, показываем индикатор для фоновых условий */}
      {hasMultipleConditions && (
        <div
          className={`${styles.badge_background_layer} ${styles.badge_background_bottom}`}
          style={{
            top: stackOffset,
            width: 'calc(100% - 10px)',
            maxWidth: '280px',
            height: badgeHeight
          }}
        />
      )}
      {/* Если есть несколько условий, показываем промежуточный слой */}
      {hasMultipleConditions && (
        <div
          className={`${styles.badge_background_layer} ${styles.badge_background_middle}`}
          style={{
            top: -stackOffset,
            width: 'calc(100% - 14px)',
            maxWidth: '278px',
            height: badgeHeight
          }}
        />
      )}
      {/* Основной бейдж */}
      <div
        className={`${styles.badge_main} ${hasMultipleConditions ? styles.badge_main_shadow_multiple : styles.badge_main_shadow_single}`}
        style={{
          height: `${badgeHeight}px`,
          cursor: onClick ? 'pointer' : 'default'
        }}
        onClick={handleClick}
        onMouseDown={(e) => e.stopPropagation()} // Предотвращаем всплытие событий mousedown
        onMouseUp={(e) => e.stopPropagation()} // Предотвращаем всплытие событий mouseup
      >
        <div className={styles.badge_icon_container}>{getConditionIcon()}</div>
        <div className={styles.badge_text}>{getConditionText()}</div>
        {hasError && (
          <div className={styles.badge_error_container}>
            <ExclamationTriangleIcon className={styles.badge_error_icon} />
          </div>
        )}
      </div>
    </foreignObject>
  );
};
