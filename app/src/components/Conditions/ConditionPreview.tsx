'use client';

import React from 'react';

import {Flex, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '../../store/useGraphStore';
import {ConditionPreviewProps} from '../../types/conditions';
import {formatConditionValue, getOperatorTextLocalized} from '../../utils/conditionUtils';
import {getNodeTitle as getNodeTitleUtil} from '../../utils/getNodeTitle';

import styles from './Conditions.module.scss';

export const ConditionPreview: React.FC<ConditionPreviewProps> = ({condition, variables}) => {
  const {t} = useTranslation();
  // Get graph store to access node information
  const graphStore = useGraphStore();
  const layers = graphStore.layers;

  // Helper function to get node title by ID
  const getNodeTitle = (nodeId: string): string => {
    // Search in all layers
    for (const layerId in layers) {
      const node = layers[layerId].nodes[nodeId];
      if (node) {
        return getNodeTitleUtil(node);
      }
    }
    return 'Unknown node';
  };

  // Function to get text description of the condition
  const getConditionDescription = (): string => {
    if (!condition.type) return t('conditions_dialog.no_conditions_hint', 'N/A');

    switch (condition.type) {
      case 'probability': {
        if (typeof condition.probability !== 'number') return t('conditions_dialog.no_conditions_hint', 'N/A');

        const probability = condition.probability;
        // Форматируем вероятность с точностью до 3 знаков и удаляем лишние нули
        const percentValue = (probability * 100).toFixed(3).replace(/\.0+$/, '');
        return t('conditions_master.probability_preview', {percent: percentValue, defaultValue: `Condition will be triggered with ${percentValue}% chance`});
      }

      case 'variable_comparison': {
        // Check if we have all required fields
        if (!condition.varId) {
          return t('conditions_master.choose_variable_to_compare', 'Choose a variable to compare');
        }

        if (!condition.operator) {
          return t('conditions_master.choose_operator', 'Choose comparison operator');
        }

        // Find variable by ID
        const leftVar = variables.find((v) => v.id === condition.varId);
        if (!leftVar) {
          return t('conditions_master.variable_not_found', 'Selected variable not found');
        }

        const operatorText = getOperatorTextLocalized(t, condition.operator).toLowerCase();

        // Right side of comparison (variable or custom value)
        if (condition.valType === 'variable') {
          if (!condition.comparisonVarId) {
            return t('conditions_master.variable_preview_select_variable', {
              left: leftVar.name,
              op: operatorText,
              defaultValue: `If variable "${leftVar.name}" ${operatorText} [select a variable]`
            });
          }

          const rightVar = variables.find((v) => v.id === condition.comparisonVarId);
          if (!rightVar) {
            return t('conditions_master.variable_preview_variable_right_not_found', {
              left: leftVar.name,
              op: operatorText,
              defaultValue: `If variable "${leftVar.name}" ${operatorText} [variable not found]`
            });
          }

          return t('conditions_master.variable_preview_comparison', {
            left: leftVar.name,
            op: operatorText,
            right: rightVar.name,
            defaultValue: `If variable "${leftVar.name}" ${operatorText} "${rightVar.name}", condition will be triggered`
          });
        } else {
          // Custom value
          if (condition.value === undefined || condition.value === '') {
            return t('conditions_master.variable_preview_enter_value', {
              left: leftVar.name,
              op: operatorText,
              defaultValue: `If variable "${leftVar.name}" ${operatorText} [enter a value]`
            });
          }

          // Используем обновленную функцию, передавая ей условие и переменные
          const valueText = formatConditionValue(condition, variables);
          return t('conditions_master.variable_preview_comparison', {
            left: leftVar.name,
            op: operatorText,
            right: valueText,
            defaultValue: `If variable "${leftVar.name}" ${operatorText} ${valueText}, condition will be triggered`
          });
        }
      }

      case 'node_happened': {
        if (!condition.nodeId) {
          return t('conditions_master.please_select_node', 'Please select a node to check');
        }

        // Here we could get node text from GraphStore, but for simplicity
        // we just use the identifier
        return t('conditions_master.node_happened_preview', {
          node: getNodeTitle(condition.nodeId),
          defaultValue: `Condition will be triggered if player has previously visited node "${getNodeTitle(condition.nodeId)}"`
        });
      }

      case 'node_not_happened': {
        if (!condition.nodeId) {
          return t('conditions_master.please_select_node', 'Please select a node to check');
        }

        return t('conditions_master.node_not_happened_preview', {
          node: getNodeTitle(condition.nodeId),
          defaultValue: `Condition will be triggered if player has NOT visited node "${getNodeTitle(condition.nodeId)}"`
        });
      }

      default:
        return t('conditions_master.unknown_type', 'Unknown condition type');
    }
  };

  return (
    <Flex className={styles.condition_preview_container}>
      <Flex className={styles.condition_preview_content}>
        <Text size='2' className={styles.condition_description}>
          {getConditionDescription()}
        </Text>
      </Flex>
    </Flex>
  );
};
