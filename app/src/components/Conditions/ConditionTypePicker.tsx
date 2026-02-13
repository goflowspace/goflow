'use client';

import React, {memo, useCallback} from 'react';

import * as Tabs from '@radix-ui/react-tabs';
import {Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {ConditionTypePickerProps} from '../../types/conditions';
import {ConditionType} from '../../types/nodes';

// Импортируем или создаем новый стиль по аналогии с Sidebar.module.scss
import styles from './Conditions.module.scss';

// Types of conditions
export const ConditionTypePicker: React.FC<ConditionTypePickerProps> = memo(({selectedType, onTypeSelect, disabledTypes = []}) => {
  const {t} = useTranslation();
  // Обработчик клика с проверкой на заблокированный тип
  const handleTypeSelect = useCallback(
    (value: string) => {
      const type = value as ConditionType;
      if (!disabledTypes.includes(type)) {
        onTypeSelect(type);
      }
    },
    [disabledTypes, onTypeSelect]
  );

  return (
    <Tabs.Root className={styles.type_selection_grid} value={selectedType} onValueChange={handleTypeSelect}>
      <Tabs.List className={styles.tabs_list} aria-label={t('conditions_master.condition_type_heading', 'Choose condition type')}>
        {/* Probability типа не показываем, если он в списке отключенных */}
        {!disabledTypes.includes(ConditionType.PROBABILITY) && (
          <Tabs.Trigger className={`${styles.type_select_item} ${selectedType === ConditionType.PROBABILITY ? styles.selected : ''}`} value={ConditionType.PROBABILITY}>
            <Text weight='medium'>{t('conditions_master.condition_type_prob_button', 'Probability')}</Text>
            <Text size='1' color='gray'>
              {t('conditions_master.condition_type_prob_hint', 'Play with chance (random)')}
            </Text>
          </Tabs.Trigger>
        )}

        <Tabs.Trigger
          className={`${styles.type_select_item} ${selectedType === ConditionType.VARIABLE_COMPARISON ? styles.selected : ''} ${disabledTypes.includes(ConditionType.VARIABLE_COMPARISON) ? styles.disabled : ''}`}
          value={ConditionType.VARIABLE_COMPARISON}
          disabled={disabledTypes.includes(ConditionType.VARIABLE_COMPARISON)}
        >
          <Text weight='medium'>{t('conditions_master.condition_type_vari_button', 'Variables')}</Text>
          <Text size='1' color='gray'>
            {t('conditions_master.condition_type_vari_hint', 'Check your variables')}
          </Text>
        </Tabs.Trigger>

        <Tabs.Trigger
          className={`${styles.type_select_item} ${selectedType === ConditionType.NODE_HAPPENED ? styles.selected : ''} ${disabledTypes.includes(ConditionType.NODE_HAPPENED) ? styles.disabled : ''}`}
          value={ConditionType.NODE_HAPPENED}
          disabled={disabledTypes.includes(ConditionType.NODE_HAPPENED)}
        >
          <Text weight='medium'>{t('conditions_master.condition_type_happ_button', 'Happened')}</Text>
          <Text size='1' color='gray'>
            {t('conditions_master.condition_type_happ_hint', 'Node encountered before')}
          </Text>
        </Tabs.Trigger>

        <Tabs.Trigger
          className={`${styles.type_select_item} ${selectedType === ConditionType.NODE_NOT_HAPPENED ? styles.selected : ''} ${disabledTypes.includes(ConditionType.NODE_NOT_HAPPENED) ? styles.disabled : ''}`}
          value={ConditionType.NODE_NOT_HAPPENED}
          disabled={disabledTypes.includes(ConditionType.NODE_NOT_HAPPENED)}
        >
          <Text weight='medium'>{t('conditions_master.condition_type_dnhapp_button', 'Did not happened')}</Text>
          <Text size='1' color='gray'>
            {t('conditions_master.condition_type_dnhapp_hint', "Node didn't encountered")}
          </Text>
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  );
});
