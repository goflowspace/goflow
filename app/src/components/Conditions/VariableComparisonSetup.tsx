'use client';

import React, {useEffect, useState} from 'react';

import {Box, Button, Flex, RadioGroup, Select, Text, TextField} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {VariableComparisonSetupProps} from '../../types/conditions';
import {Variable} from '../../types/variables';
import {getOperatorTextLocalized} from '../../utils/conditionUtils';

import styles from './Conditions.module.scss';

type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

export const VariableComparisonSetup: React.FC<VariableComparisonSetupProps> = ({variables, varId, comparisonVarId, value, operator, valType = 'variable', onUpdate}) => {
  const {t} = useTranslation();
  // State for right operand type selection
  const [localValType, setLocalValType] = useState<'variable' | 'custom'>(valType);

  // Функция проверки, является ли тип числовым
  const isNumericType = (type?: string): boolean => {
    return type === 'integer' || type === 'float' || type === 'percent';
  };

  // Функция проверки, является ли тип строковым
  const isStringType = (type?: string): boolean => {
    return type === 'string';
  };

  // Функция проверки, является ли тип булевым
  const isBooleanType = (type?: string): boolean => {
    return type === 'boolean';
  };

  // Initialize default values
  useEffect(() => {
    if (!operator) {
      onUpdate({operator: 'eq'});
    }

    if (!valType) {
      onUpdate({valType: 'variable'});
      setLocalValType('variable');
    } else {
      setLocalValType(valType);
    }

    // Проверяем, что левая и правая переменные не совпадают
    if (varId && comparisonVarId && varId === comparisonVarId) {
      onUpdate({comparisonVarId: ''});
    }

    // Проверяем, что у левой и правой переменных совместимые типы
    if (varId && comparisonVarId) {
      const leftVar = variables.find((v) => v.id === varId);
      const rightVar = variables.find((v) => v.id === comparisonVarId);

      if (leftVar && rightVar) {
        const leftIsNumeric = isNumericType(leftVar.type);
        const rightIsNumeric = isNumericType(rightVar.type);
        const leftIsString = isStringType(leftVar.type);
        const rightIsString = isStringType(rightVar.type);
        const leftIsBoolean = isBooleanType(leftVar.type);
        const rightIsBoolean = isBooleanType(rightVar.type);

        // Если типы несовместимы, сбрасываем правую переменную
        if ((leftIsNumeric && !rightIsNumeric) || (leftIsString && !rightIsString) || (leftIsBoolean && !rightIsBoolean)) {
          onUpdate({comparisonVarId: ''});
        }
      }
    }
  }, [operator, valType, onUpdate, varId, comparisonVarId, variables]);

  // Handler for left variable change
  const handleLeftVariableChange = (variableId: string) => {
    // Если выбрана новая переменная, проверяем совместимость типа с правой переменной
    const selectedVariable = variables.find((v) => v.id === variableId);

    // Если новая левая переменная совпадает с правой, сбрасываем правую
    if (variableId === comparisonVarId) {
      onUpdate({
        varId: variableId,
        comparisonVarId: ''
      });
      return;
    }

    // Если правая переменная уже выбрана, проверяем совместимость типов
    if (comparisonVarId && selectedVariable) {
      const rightVariable = variables.find((v) => v.id === comparisonVarId);

      if (rightVariable) {
        const selectedIsNumeric = isNumericType(selectedVariable.type);
        const rightIsNumeric = isNumericType(rightVariable.type);
        const selectedIsString = isStringType(selectedVariable.type);
        const rightIsString = isStringType(rightVariable.type);
        const selectedIsBoolean = isBooleanType(selectedVariable.type);
        const rightIsBoolean = isBooleanType(rightVariable.type);

        // Если типы несовместимы, сбрасываем правую переменную
        if ((selectedIsNumeric && !rightIsNumeric) || (selectedIsString && !rightIsString) || (selectedIsBoolean && !rightIsBoolean)) {
          onUpdate({
            varId: variableId,
            comparisonVarId: ''
          });
          return;
        }
      }
    }

    // Просто обновляем идентификатор левой переменной
    onUpdate({varId: variableId});

    // Если тип переменной сменился и используется кастомное значение, сбрасываем его
    if (selectedVariable && valType === 'custom' && value !== undefined) {
      // Сбрасываем кастомное значение только если тип несовместим
      const currentType = typeof value;

      if (
        (isNumericType(selectedVariable.type) && currentType !== 'number') ||
        (isStringType(selectedVariable.type) && currentType !== 'string') ||
        (isBooleanType(selectedVariable.type) && currentType !== 'boolean')
      ) {
        onUpdate({value: ''});
      }
    }
  };

  // Handler for comparison operator change
  const handleOperatorChange = (op: Operator) => {
    onUpdate({operator: op});
  };

  // Handler for right value type change
  const handleRightValueTypeChange = (type: 'variable' | 'custom') => {
    setLocalValType(type);

    // Если тип изменился на 'variable'
    if (type === 'variable') {
      // Удаляем кастомное значение и устанавливаем тип, но сохраняем comparisonVarId если он уже есть
      onUpdate({
        valType: type,
        value: undefined,
        percentType: undefined // Сбрасываем флаг процентного типа
      });
    }
    // Если тип изменился на 'custom'
    else if (type === 'custom') {
      // Явно удаляем comparisonVarId и устанавливаем тип
      onUpdate({
        valType: type,
        comparisonVarId: undefined,
        value: value || '' // Сохраняем текущее значение, если оно есть
        // percentType определится при вводе значения
      });
    }
  };

  // Handler for right variable change
  const handleRightVariableChange = (variableId: string) => {
    // Иначе, просто обновляем правую переменную
    onUpdate({
      comparisonVarId: variableId,
      valType: 'variable',
      percentType: undefined // Сбрасываем флаг процентного типа
    });
  };

  // Handler for custom value change
  const handleCustomValueChange = (val: string) => {
    // Не обновляем, если значение пустое
    if (val.trim() === '') {
      onUpdate({value: ''});
      return;
    }

    if (!selectedLeftVariable) {
      // Если левая переменная не выбрана, просто сохраняем как строку
      onUpdate({value: val});
      return;
    }

    // В зависимости от типа левой переменной конвертируем значение
    if (isNumericType(selectedLeftVariable.type)) {
      // Для числовых типов преобразуем в число
      const numericValue = parseFloat(val);
      if (!isNaN(numericValue)) {
        // Для процентных переменных устанавливаем флаг percentType
        if (selectedLeftVariable.type === 'percent') {
          // Проверяем, что значение находится в допустимом диапазоне 0-100
          if (numericValue >= 0 && numericValue <= 100) {
            onUpdate({
              value: numericValue,
              percentType: true
            });
          }
        } else if (selectedLeftVariable.type === 'integer') {
          onUpdate({value: Math.round(numericValue)});
        } else {
          onUpdate({value: numericValue});
        }
      } else {
        // Если не удалось преобразовать, оставляем пустое значение
        onUpdate({value: ''});
      }
    } else if (isStringType(selectedLeftVariable.type)) {
      // Для строковых переменных сохраняем как есть
      onUpdate({value: val});
    } else if (isBooleanType(selectedLeftVariable.type)) {
      // Для булевого типа принимаем различные варианты ввода
      const normalizedValue = val.toLowerCase().trim();
      if (normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes' || normalizedValue === 'y') {
        onUpdate({value: true});
      } else if (normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === 'no' || normalizedValue === 'n') {
        onUpdate({value: false});
      } else {
        // Если не распознали значение, оставляем текущее или пустое
        // Но не сбрасываем ввод, чтобы пользователь мог продолжить ввод
        // onUpdate({value: ''});
      }
    } else {
      // Для всех остальных типов сохраняем как строку
      onUpdate({value: val});
    }
  };

  // Get selected left variable
  const selectedLeftVariable = variables.find((v) => v.id === varId);
  // Get selected right variable
  const selectedRightVariable = variables.find((v) => v.id === comparisonVarId);

  // Фильтруем переменные для левого выпадающего списка - показываем все типы
  const availableVariables = variables;

  // Фильтруем переменные для правого выпадающего списка по типу левой переменной
  let rightSelectVariables: Variable[] = [];

  if (selectedLeftVariable) {
    // Выбираем переменные с совместимым типом
    if (isNumericType(selectedLeftVariable.type)) {
      rightSelectVariables = variables.filter((v) => isNumericType(v.type) && v.id !== varId);
    } else if (isStringType(selectedLeftVariable.type)) {
      rightSelectVariables = variables.filter((v) => isStringType(v.type) && v.id !== varId);
    } else if (isBooleanType(selectedLeftVariable.type)) {
      rightSelectVariables = variables.filter((v) => isBooleanType(v.type) && v.id !== varId);
    }
  } else {
    // Если левая переменная не выбрана, показываем все переменные для правой
    rightSelectVariables = variables;
  }

  // Операторы сравнения в зависимости от типа переменной
  let operators: {value: Operator; label: string; symbol: string}[] = [];

  if (!selectedLeftVariable) {
    // Если переменная не выбрана, показываем все операторы
    operators = [
      {value: 'eq', label: getOperatorTextLocalized(t, 'eq'), symbol: '='},
      {value: 'neq', label: getOperatorTextLocalized(t, 'neq'), symbol: '!='},
      {value: 'lt', label: getOperatorTextLocalized(t, 'lt'), symbol: '<'},
      {value: 'gte', label: getOperatorTextLocalized(t, 'gte'), symbol: '≥'}
    ];
  } else if (isNumericType(selectedLeftVariable.type)) {
    // Для числовых переменных показываем все операторы
    operators = [
      {value: 'lt', label: getOperatorTextLocalized(t, 'lt'), symbol: '<'},
      {value: 'eq', label: getOperatorTextLocalized(t, 'eq'), symbol: '='},
      {value: 'gte', label: getOperatorTextLocalized(t, 'gte'), symbol: '≥'},
      {value: 'neq', label: getOperatorTextLocalized(t, 'neq'), symbol: '!='}
    ];
  } else if (isStringType(selectedLeftVariable.type)) {
    // Для строковых переменных показываем только == и !=
    operators = [
      {value: 'eq', label: getOperatorTextLocalized(t, 'eq'), symbol: '='},
      {value: 'neq', label: getOperatorTextLocalized(t, 'neq'), symbol: '!='}
    ];
  } else if (isBooleanType(selectedLeftVariable.type)) {
    // Для булевых переменных показываем только == и !=
    operators = [
      {value: 'eq', label: getOperatorTextLocalized(t, 'eq'), symbol: '='},
      {value: 'neq', label: getOperatorTextLocalized(t, 'neq'), symbol: '!='}
    ];
  }

  return (
    <Flex direction='column' gap='3'>
      <Text weight='regular' size='2'>
        {t('conditions_master.condition_set_var_text', 'Choose variable, which you want to compare')}
      </Text>

      <Box width='100%' className={styles.select_container}>
        {availableVariables.length > 0 ? (
          <Select.Root value={varId || ''} onValueChange={handleLeftVariableChange}>
            <Select.Trigger placeholder={t('conditions_master.choose_variable', 'Choose variable')} className={styles.select_trigger} />
            <Select.Content className={styles.select_content}>
              {availableVariables.map((variable) => (
                <Select.Item key={variable.id} value={variable.id} className={styles.select_item}>
                  <span className={styles.text_truncate}>
                    {variable.name} ({variable.type})
                  </span>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        ) : (
          <Text size='2' color='gray'>
            {t('conditions_master.no_variables_hint', 'No variables available. Create some variables first.')}
          </Text>
        )}
      </Box>

      <Text weight='regular' size='2' mt='2'>
        {t('conditions_master.condition_set_var_hint', 'Select how it compares:')}
      </Text>

      <Flex wrap='wrap' gap='2'>
        {operators.map((op) => (
          <Flex
            key={op.value}
            className={`${styles.compare_operator} ${operator === op.value ? styles.compare_operator_selected : styles.compare_operator_default}`}
            align='center'
            justify='center'
            gap='1'
            onClick={() => handleOperatorChange(op.value as Operator)}
          >
            <Text size='1' className={styles.text_truncate}>
              {t(`conditions_master.operator_${op.value}`, op.label)}
            </Text>
            <Text size='2' className={`${styles.compare_operator_label} ${styles.text_truncate}`}>
              {op.symbol}
            </Text>
          </Flex>
        ))}
      </Flex>

      <Text weight='regular' size='2' mt='2'>
        {t('conditions_master.compare_with', 'Compare with:')}
      </Text>

      <RadioGroup.Root value={localValType} onValueChange={(value) => handleRightValueTypeChange(value as 'variable' | 'custom')}>
        <Flex direction='column' gap='2'>
          <Flex
            gap='2'
            align='center'
            className={styles.radio_option}
            onClick={() => {
              // При клике на строку "Another variable" автоматически выбираем этот тип
              if (localValType !== 'variable') {
                handleRightValueTypeChange('variable');
              }
            }}
          >
            <RadioGroup.Item value='variable' />
            <Text size='2'>{t('conditions_master.another_variable', 'Another variable')}</Text>
          </Flex>

          {localValType === 'variable' && (
            <Box width='100%' className={styles.select_container}>
              <Select.Root value={comparisonVarId || ''} onValueChange={handleRightVariableChange} disabled={rightSelectVariables.length === 0}>
                <Select.Trigger
                  placeholder={
                    !selectedLeftVariable
                      ? t('conditions_master.choose_variable', 'Choose variable')
                      : rightSelectVariables.length > 0
                        ? t('conditions_master.choose_variable', 'Choose variable')
                        : t('conditions_master.no_variables_of_type', `No ${selectedLeftVariable.type} variables available`)
                  }
                  className={styles.select_trigger}
                />
                <Select.Content className={styles.select_content}>
                  {rightSelectVariables.map((variable) => (
                    <Select.Item key={variable.id} value={variable.id} className={styles.select_item}>
                      <span className={styles.text_truncate}>
                        {variable.name} ({variable.type})
                      </span>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
          )}

          <Flex
            gap='2'
            align='center'
            className={styles.radio_option}
            onClick={() => {
              // При клике на строку "Custom value" автоматически выбираем этот тип
              if (localValType !== 'custom') {
                handleRightValueTypeChange('custom');
              }
            }}
          >
            <RadioGroup.Item value='custom' />
            <Text size='2'>{t('conditions_master.custom_value', 'Custom value')}</Text>
          </Flex>

          {localValType === 'custom' && (
            <Flex gap='2' direction='column'>
              {selectedLeftVariable && isBooleanType(selectedLeftVariable.type) ? (
                // Для булевых переменных показываем кнопки переключения
                <Flex gap='2'>
                  <Button className={styles.boolean_button} variant={value === true ? 'solid' : 'soft'} onClick={() => onUpdate({value: true})}>
                    {t('conditions_master.condition_set_var_true', 'True')}
                  </Button>
                  <Button className={styles.boolean_button} variant={value === false ? 'solid' : 'soft'} onClick={() => onUpdate({value: false})}>
                    {t('conditions_master.condition_set_var_false', 'False')}
                  </Button>
                </Flex>
              ) : (
                // Для других типов показываем текстовое поле ввода
                <Flex align='center' gap='2'>
                  <TextField.Root
                    className={styles.custom_value_input}
                    placeholder={selectedLeftVariable ? t('conditions_master.enter_value', `Enter ${selectedLeftVariable.type} value`) : t('conditions_master.enter_value', 'Enter value')}
                    value={value !== undefined ? String(value) : ''}
                    onChange={(e) => handleCustomValueChange(e.target.value)}
                  />
                  {selectedLeftVariable?.type === 'percent' && <Text size='2'>%</Text>}
                </Flex>
              )}
            </Flex>
          )}
        </Flex>
      </RadioGroup.Root>
    </Flex>
  );
};
