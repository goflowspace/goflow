'use client';

import React, {useEffect, useState} from 'react';

import {Card, Flex, Grid, Text, TextField} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {ProbabilitySetupProps} from '../../types/conditions';

import styles from './Conditions.module.scss';

interface ProbabilityOption {
  value: number; // from 0 to 1
  label: string;
  description: string;
}

export const ProbabilitySetup: React.FC<ProbabilitySetupProps> = ({probability, onUpdate}) => {
  const {t} = useTranslation();

  // Predefined probability options
  const predefinedOptions: ProbabilityOption[] = [
    {value: 0.05, label: '5%', description: t('conditions_master.probability_predefined_very_rare', 'Very rare')},
    {value: 0.25, label: '25%', description: t('conditions_master.probability_predefined_rare', 'Rare')},
    {value: 0.5, label: '50%', description: t('conditions_master.probability_predefined_50_50', '50/50')},
    {value: 0.75, label: '75%', description: t('conditions_master.probability_predefined_common', 'Common')},
    {value: 0.95, label: '95%', description: t('conditions_master.probability_predefined_very_common', 'Very common')}
  ];

  // State for custom value
  const [customValue, setCustomValue] = useState<string>('');
  const [useCustom, setUseCustom] = useState(false);

  // Initialize values on first load
  useEffect(() => {
    if (probability !== undefined) {
      // Если пользователь уже вводил кастомное значение, не переключаемся на предустановленные
      if (useCustom) {
        return;
      }

      // Check if the value is among the predefined options
      const isPredefined = predefinedOptions.some((option) => Math.abs(option.value - probability) < 0.001);

      if (!isPredefined) {
        // If it's a custom value
        setUseCustom(true);
      } else {
        setUseCustom(false);
      }
    } else {
      // If value is not defined, set 50% by default
      onUpdate(0.5);
    }
  }, [probability, predefinedOptions, onUpdate, useCustom]);

  // Handler for predefined value selection
  const handlePredefinedSelect = (value: number) => {
    setUseCustom(false);
    onUpdate(value);
  };

  // Валидация ввода - только цифры, точка/запятая и не более 3 символов после разделителя
  const validateInput = (value: string): string => {
    // Заменяем запятую на точку для унификации
    const formattedValue = value.replace(',', '.');

    // Проверяем, соответствует ли введенное значение шаблону:
    // - цифры + опциональная точка + до 3 цифр после точки
    // - или начинающееся с точки/нуля: 0.xxx или .xxx
    const regex = /^((\d+)?([.])?(\d{0,3})?|([.]\d{0,3}))$/;

    if (!regex.test(formattedValue)) {
      // Если ввод не соответствует требованиям, возвращаем предыдущее валидное значение
      return customValue;
    }

    // Проверяем, что введенное число меньше 100
    const numericValue = parseFloat(formattedValue);
    if (!isNaN(numericValue) && numericValue >= 100) {
      return customValue;
    }

    return formattedValue;
  };

  // Handler for custom value change
  const handleCustomChange = (value: string) => {
    // Валидируем значение перед установкой
    const validatedValue = validateInput(value);
    setCustomValue(validatedValue);

    // Convert to number and update if the value is valid
    const numericValue = parseFloat(validatedValue);
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue < 100) {
      onUpdate(numericValue / 100);
    }
  };

  return (
    <Flex direction='column' gap='3'>
      <Text weight='regular' size='2'>
        {t('conditions_master.condition_set_prob_def', 'Choose predefined chances')}
      </Text>

      <Grid columns={{initial: '3', sm: '5'}} gap='3'>
        {predefinedOptions.map((option) => (
          <Card
            key={option.value}
            className={`${styles.probability_card} ${!useCustom && Math.abs((probability || 0) - option.value) < 0.001 ? styles.probability_card_selected : styles.probability_card_default}`}
            onClick={() => handlePredefinedSelect(option.value)}
          >
            <Flex direction='column' align='center' gap='1'>
              <Text weight='bold' size='3' className={styles.text_truncate}>
                {option.label}
              </Text>
              <Text size='1' color='gray' align='center' className={styles.text_truncate}>
                {option.description}
              </Text>
            </Flex>
          </Card>
        ))}
      </Grid>

      <Text weight='bold' size='2' mt='2'>
        {t('conditions_master.condition_set_prob_user', 'Or input yours:')}
      </Text>

      <Flex align='center' gap='2'>
        <TextField.Root
          value={useCustom ? customValue : ''}
          onChange={(e) => {
            setUseCustom(true);
            handleCustomChange(e.target.value);
          }}
          placeholder={t('conditions_master.condition_set_prob_user', 'Type custom chance')}
          className={styles.custom_input}
        />
        <Text size='2'>%</Text>
      </Flex>
    </Flex>
  );
};
