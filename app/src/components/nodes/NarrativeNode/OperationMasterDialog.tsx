import React, {useEffect, useMemo, useRef, useState} from 'react';

import {Cross2Icon, TrashIcon} from '@radix-ui/react-icons';
import {Box, Button, Dialog, Flex, Grid, RadioGroup, Select, Text, TextField} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import {OperationTarget, OperationTargetType, OperationType, VariableOperation} from '@types-folder/variables';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';
import {useOperationsStore} from '@store/useOperationsStore';
import {useUIStore} from '@store/useUIStore';
import {useVariablesStore} from '@store/useVariablesStore';

import {getCommandManager} from '../../../commands/CommandManager';
import {trackOperationCreation, trackOperationMasterClosed, trackOperationMasterOpened} from '../../../services/analytics';
import {formatVariableValue} from '../../../utils/variableFormatters';
import VariableTypeIcon from './VariableTypeIcon';

import s from './OperationMasterDialog.module.scss';
import vs from './VariableStyles.module.scss';

interface OperationMasterDialogProps {
  isOpen: boolean;
  nodeId: string;
  operationId: string | null;
  onClose: () => void;
}

export const OperationMasterDialog = ({isOpen, nodeId, operationId, onClose}: OperationMasterDialogProps) => {
  const {t} = useTranslation();
  // Состояния для мастера операций
  const [selectedVariableId, setSelectedVariableId] = useState<string>('');
  const [selectedOperationType, setSelectedOperationType] = useState<OperationType | ''>('');
  const [targetType, setTargetType] = useState<OperationTargetType | ''>('');
  const [targetVariableId, setTargetVariableId] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('');
  const [booleanValue, setBooleanValue] = useState<boolean | null>(null);

  // Реф для отслеживания предыдущего состояния открытия
  const prevIsOpenRef = useRef(false);

  // Получаем данные из хранилищ
  const {variables} = useVariablesStore();
  const {addOperation, updateOperation, getVariableById} = useOperationsStore();
  // Получаем состояние сайдбара для аналитики
  const isSidebarOpened = useUIStore((state) => state.isSidebarOpen);
  // Получаем экземпляр CommandManager
  const commandManager = getCommandManager();
  // Получаем графовое хранилище для доступа к операциям нарративного узла
  const {currentGraphId, layers} = useGraphStore();
  const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  // Находим текущий узел и его операции
  const currentLayer = layers[currentGraphId];
  const currentNode = currentLayer?.nodes[nodeId];
  const nodeOperations = currentNode?.type === 'narrative' ? currentNode.operations || [] : [];

  // Проверяем наличие переменных
  const hasVariables = variables.length > 0;

  // Текущая операция (если редактируем)
  const currentOperation = operationId ? nodeOperations.find((op: VariableOperation) => op.id === operationId) : null;

  // Текущая переменная
  const selectedVariable = variables.find((v) => v.id === selectedVariableId);

  // Доступные типы операций в зависимости от типа переменной
  const getAvailableOperationTypes = () => {
    if (!selectedVariable) return [];

    const commonTypes: OperationType[] = ['override'];

    switch (selectedVariable.type) {
      case 'integer':
      case 'float':
      case 'percent':
        return [...commonTypes, 'addition', 'subtract', 'multiply', 'divide'];
      case 'boolean':
        return [...commonTypes, 'invert'];
      case 'string':
        return [...commonTypes, 'join'];
      default:
        return commonTypes;
    }
  };

  // Инициализация состояния при редактировании
  useEffect(() => {
    if (currentOperation) {
      setSelectedVariableId(currentOperation.variableId);
      setSelectedOperationType(currentOperation.operationType);

      // Инициализация цели
      if (currentOperation.target) {
        setTargetType(currentOperation.target.type);

        if (currentOperation.target.type === 'variable') {
          setTargetVariableId(currentOperation.target.variableId || '');
        } else {
          // Особая обработка для boolean
          const variable = variables.find((v) => v.id === currentOperation.variableId);
          if (variable?.type === 'boolean' && currentOperation.operationType === 'override') {
            setBooleanValue(currentOperation.target.value === true);
          } else if (variable?.type === 'percent') {
            // Для процентных значений умножаем на 100 при отображении
            const percentValue = Number(currentOperation.target.value) * 100;
            setCustomValue(percentValue.toString());
          } else {
            setCustomValue(String(currentOperation.target.value));
          }
        }
      }
    }
  }, [currentOperation, variables]);

  // Форматирование значения для предпросмотра
  const formatPreviewValue = (value: string, type: string) => {
    if (type === 'percent') {
      // Просто добавляем знак процента, значение уже в процентах
      const numValue = parseFloat(value);
      return `${numValue.toFixed(1)}%`;
    }
    return formatVariableValue(value, type);
  };

  // Генерация текста предпросмотра для новой операции
  const generatePreviewText = () => {
    // Базовое сообщение, если переменная не выбрана
    if (!selectedVariableId) return t('node_operations.master_var_hint', 'Choose variable, which you want to operate with:');

    const variable = getVariableById(selectedVariableId);
    if (!variable) return t('node_operations.master_var_placeholder', 'Choose variable');

    const variableName = variable.name;

    // Если тип операции не выбран, выводим сообщение о выбранной переменной
    if (!selectedOperationType) {
      return `${t('node_operations.master_var_hint', 'Choose variable, which you want to operate with:')} "${variableName}"`;
    }

    // Формируем описание в зависимости от типа операции
    switch (selectedOperationType) {
      case 'override': {
        if (targetType === 'variable') {
          if (!targetVariableId) {
            return t('node_operations.preview_override_var_select', 'Variable "{{name}}" will be set to [select a variable]', {name: variableName});
          }

          const targetVariable = getVariableById(targetVariableId);
          return targetVariable
            ? t('node_operations.preview_override_var_target', 'Variable "{{name}}" will be set to the value of "{{target}}"', {name: variableName, target: targetVariable.name})
            : t('node_operations.preview_override_var_not_found', 'Variable "{{name}}" will be set to [variable not found]', {name: variableName});
        } else {
          if (variable.type === 'boolean') {
            if (booleanValue === null) {
              return t('node_operations.preview_override_bool_select', 'Variable "{{name}}" will be set to [select true or false]', {name: variableName});
            }
            return t('node_operations.preview_override_bool_value', 'Variable "{{name}}" will be set to {{value}}', {
              name: variableName,
              value: booleanValue ? t('variables_form.value_true', 'true') : t('variables_form.value_false', 'false')
            });
          } else {
            return customValue
              ? t('node_operations.preview_override_custom', 'Variable "{{name}}" will be set to {{value}}', {
                  name: variableName,
                  value: formatPreviewValue(customValue, variable.type)
                })
              : t('node_operations.preview_override_custom_enter', 'Variable "{{name}}" will be set to [enter a value]', {name: variableName});
          }
        }
      }
      case 'invert': {
        return t('node_operations.preview_invert', 'Variable "{{name}}" will be inverted (true → false or false → true)', {name: variableName});
      }
      case 'join': {
        if (targetType === 'variable') {
          if (!targetVariableId) {
            return t('node_operations.preview_join_var_select', 'Variable "{{name}}" will be joined with [select a variable]', {name: variableName});
          }

          const targetVariable = getVariableById(targetVariableId);
          return targetVariable
            ? t('node_operations.preview_join_var_target', 'Variable "{{name}}" will be joined with "{{target}}"', {name: variableName, target: targetVariable.name})
            : t('node_operations.preview_join_var_not_found', 'Variable "{{name}}" will be joined with [variable not found]', {name: variableName});
        } else {
          return customValue
            ? t('node_operations.preview_join_custom', 'Variable "{{name}}" will be joined with "{{value}}"', {name: variableName, value: customValue})
            : t('node_operations.preview_join_custom_enter', 'Variable "{{name}}" will be joined with [enter a text]', {name: variableName});
        }
      }
      case 'addition': {
        if (targetType === 'variable') {
          if (!targetVariableId) {
            return t('node_operations.preview_addition_var_select', 'Variable "{{name}}" will be increased by [select a variable]', {name: variableName});
          }

          const targetVariable = getVariableById(targetVariableId);
          return targetVariable
            ? t('node_operations.preview_addition_var_target', 'Variable "{{name}}" will be increased by the value of "{{target}}"', {name: variableName, target: targetVariable.name})
            : t('node_operations.preview_addition_var_not_found', 'Variable "{{name}}" will be increased by [variable not found]', {name: variableName});
        } else {
          return customValue
            ? t('node_operations.preview_addition_custom', 'Variable "{{name}}" will be increased by {{value}}', {name: variableName, value: formatPreviewValue(customValue, variable.type)})
            : t('node_operations.preview_addition_custom_enter', 'Variable "{{name}}" will be increased by [enter a value]', {name: variableName});
        }
      }
      case 'subtract': {
        if (targetType === 'variable') {
          if (!targetVariableId) {
            return t('node_operations.preview_subtract_var_select', 'Variable "{{name}}" will be decreased by [select a variable]', {name: variableName});
          }

          const targetVariable = getVariableById(targetVariableId);
          return targetVariable
            ? t('node_operations.preview_subtract_var_target', 'Variable "{{name}}" will be decreased by the value of "{{target}}"', {name: variableName, target: targetVariable.name})
            : t('node_operations.preview_subtract_var_not_found', 'Variable "{{name}}" will be decreased by [variable not found]', {name: variableName});
        } else {
          return customValue
            ? t('node_operations.preview_subtract_custom', 'Variable "{{name}}" will be decreased by {{value}}', {name: variableName, value: formatPreviewValue(customValue, variable.type)})
            : t('node_operations.preview_subtract_custom_enter', 'Variable "{{name}}" will be decreased by [enter a value]', {name: variableName});
        }
      }
      case 'multiply': {
        if (targetType === 'variable') {
          if (!targetVariableId) {
            return t('node_operations.preview_multiply_var_select', 'Variable "{{name}}" will be multiplied by [select a variable]', {name: variableName});
          }

          const targetVariable = getVariableById(targetVariableId);
          return targetVariable
            ? t('node_operations.preview_multiply_var_target', 'Variable "{{name}}" will be multiplied by the value of "{{target}}"', {name: variableName, target: targetVariable.name})
            : t('node_operations.preview_multiply_var_not_found', 'Variable "{{name}}" will be multiplied by [variable not found]', {name: variableName});
        } else {
          return customValue
            ? t('node_operations.preview_multiply_custom', 'Variable "{{name}}" will be multiplied by {{value}}', {name: variableName, value: formatPreviewValue(customValue, variable.type)})
            : t('node_operations.preview_multiply_custom_enter', 'Variable "{{name}}" will be multiplied by [enter a value]', {name: variableName});
        }
      }
      case 'divide': {
        if (targetType === 'variable') {
          if (!targetVariableId) {
            return t('node_operations.preview_divide_var_select', 'Variable "{{name}}" will be divided by [select a variable]', {name: variableName});
          }

          const targetVariable = getVariableById(targetVariableId);
          return targetVariable
            ? t('node_operations.preview_divide_var_target', 'Variable "{{name}}" will be divided by the value of "{{target}}"', {name: variableName, target: targetVariable.name})
            : t('node_operations.preview_divide_var_not_found', 'Variable "{{name}}" will be divided by [variable not found]', {name: variableName});
        } else {
          return customValue
            ? t('node_operations.preview_divide_custom', 'Variable "{{name}}" will be divided by {{value}}', {name: variableName, value: formatPreviewValue(customValue, variable.type)})
            : t('node_operations.preview_divide_custom_enter', 'Variable "{{name}}" will be divided by [enter a value]', {name: variableName});
        }
      }
      default:
        return t('node_operations.preview_unknown', 'Unknown operation on variable "{{name}}"', {name: variableName});
    }
  };

  // Предпросмотр операции
  const previewText = useMemo(() => {
    // При редактировании операции, генерируем предпросмотр на основе текущих значений формы,
    // а не берем из хранилища, чтобы видеть изменения в режиме реального времени
    return generatePreviewText();
  }, [selectedVariableId, selectedOperationType, targetType, targetVariableId, customValue, booleanValue, getVariableById, variables]);

  // Проверка, все ли необходимые поля заполнены
  const isFormValid = () => {
    if (!selectedVariableId || !selectedOperationType) return false;

    // Инверт не требует цели
    if (selectedOperationType === 'invert') return true;

    // Проверка для boolean переменных с операцией override
    const variable = variables.find((v) => v.id === selectedVariableId);
    if (variable?.type === 'boolean' && selectedOperationType === 'override') {
      // Для boolean переменных проверяем, что значение было явно выбрано
      return booleanValue !== null;
    }

    // Для других операций требуется выбранный тип цели и его значение
    if (!targetType) return false;

    // Для других операций нужна цель
    if (targetType === 'variable') {
      return !!targetVariableId;
    } else {
      return !!customValue;
    }
  };

  // Сброс состояния формы
  const resetForm = () => {
    setSelectedVariableId('');
    setSelectedOperationType('');
    setTargetType('');
    setTargetVariableId('');
    setCustomValue('');
    setBooleanValue(null);
  };

  // Обработчик изменения значения, контролирующий ввод для целых чисел
  const handleCustomValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Если тип переменной integer, то разрешаем только ввод целых чисел
    if (selectedVariable?.type === 'integer') {
      // Разрешаем только цифры и знак минус в начале
      if (/^-?\d*$/.test(newValue)) {
        // Удаляем начальные нули, но сохраняем одиночный 0
        if (newValue === '0' || newValue === '-0') {
          setCustomValue(newValue);
        } else if (newValue.startsWith('0') && newValue.length > 1) {
          // Убираем начальные нули (00123 -> 123)
          const trimmedValue = newValue.replace(/^0+/, '');
          setCustomValue(trimmedValue);
        } else if (newValue.startsWith('-0') && newValue.length > 2) {
          // Для отрицательных чисел (-00123 -> -123)
          const trimmedValue = '-' + newValue.substring(1).replace(/^0+/, '');
          setCustomValue(trimmedValue);
        } else {
          setCustomValue(newValue);
        }
      }
    }
    // Для процентных переменных разрешаем числа от 0 до 100
    else if (selectedVariable?.type === 'percent') {
      // Проверяем, соответствует ли ввод допустимому формату
      if (/^\d*\.?\d*$/.test(newValue)) {
        // Если введена просто точка или пустая строка, то разрешаем ввод
        if (newValue === '.' || newValue === '') {
          setCustomValue(newValue);
        } else {
          // Проверяем числовое значение
          const numValue = parseFloat(newValue);
          // Если это число и оно в пределах от 0 до 100, то разрешаем ввод
          if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
            setCustomValue(newValue);
          }
        }
      }
    } else {
      // Для остальных типов не ограничиваем ввод
      setCustomValue(newValue);
    }
  };

  // Сохранение операции
  const handleSave = () => {
    // Проверка, что форма валидна
    if (!isFormValid()) return;

    // Формирование цели операции
    let target: OperationTarget | undefined;

    if (selectedOperationType !== 'invert') {
      if (targetType === 'variable') {
        target = {
          type: 'variable',
          value: '', // Это заполнится из переменной
          variableId: targetVariableId
        };
      } else if (targetType === 'custom') {
        // Определяем тип переменной
        const variable = variables.find((v) => v.id === selectedVariableId);

        if (variable?.type === 'boolean' && selectedOperationType === 'override') {
          if (booleanValue !== null) {
            target = {
              type: 'custom',
              value: booleanValue
            };
          } else {
            return;
          }
        } else if (variable?.type === 'integer') {
          target = {
            type: 'custom',
            value: parseInt(customValue, 10)
          };
        } else if (variable?.type === 'float') {
          target = {
            type: 'custom',
            value: parseFloat(customValue)
          };
        } else if (variable?.type === 'percent') {
          // При сохранении делим на 100, так как в движке работаем с десятичными дробями
          const percentValue = parseFloat(customValue) / 100;
          target = {
            type: 'custom',
            value: percentValue
          };
        } else {
          target = {
            type: 'custom',
            value: customValue
          };
        }
      } else {
        // Если тип цели не выбран, не позволяем сохранить
        return;
      }
    }

    const operationId = currentOperation?.id;
    const variable = variables.find((v) => v.id === selectedVariableId);

    if (currentOperation) {
      // Обновляем существующую операцию
      updateOperation(currentOperation.id, {
        variableId: selectedVariableId,
        operationType: selectedOperationType as OperationType,
        target
      });
    } else {
      // Создаем новую операцию
      addOperation(nodeId, selectedVariableId, selectedOperationType as OperationType, target);
    }

    // Отправляем событие создания операции
    if (variable && selectedOperationType) {
      trackOperationCreation(operationId ? 'existing' : 'new', selectedOperationType as OperationType, variable.type, target?.type || '', operationId || '', projectId, timelineId);
    }

    // Закрываем диалог и сбрасываем форму
    onClose();
    resetForm();
  };

  // Удаление операции (если редактируем существующую)
  const handleDelete = () => {
    if (operationId) {
      // Используем CommandManager для удаления
      commandManager.deleteOperation(operationId);

      // Отправляем событие закрытия мастера операций с удалением
      trackOperationMasterClosed('DeleteButton', 'existing', projectId, timelineId);

      onClose();
    }
  };

  // Рендер шага 1: выбор переменной
  const renderStep1 = () => (
    <div className={s.step}>
      <Text as='div' weight='bold' className={s.step_title}>
        {t('node_operations.master_var_heading', 'Step 1: Choose variable for operation')}
      </Text>

      {hasVariables ? (
        <Box width='230px'>
          <Select.Root value={selectedVariableId} onValueChange={setSelectedVariableId}>
            <Select.Trigger placeholder={t('node_operations.master_var_placeholder', 'Choose variable')} style={{width: '100%'}} />
            <Select.Content className={s.select_content}>
              <Select.Group>
                {variables.map((variable) => (
                  <Select.Item key={variable.id} value={variable.id} className={s.select_item}>
                    <Flex align='center' gap='2'>
                      <VariableTypeIcon type={variable.type} />
                      <Text>{variable.name}</Text>
                    </Flex>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Box>
      ) : (
        <Text as='div' size='2' className={s.error_text}>
          {t('conditions_master.no_variables_hint', 'No variables available. Create some variables first.')}
        </Text>
      )}

      {selectedVariable && (
        <Flex align='baseline' gap='1'>
          <Text as='p' size='1' weight='bold' className={vs.variable_type_info}>
            <Text as='span' className={vs.variable_type_info_bold}>
              {t('node_operations.master_var_type_hint', 'Variable type:')}
            </Text>
            {selectedVariable.type.charAt(0).toUpperCase() + selectedVariable.type.slice(1)}
          </Text>
        </Flex>
      )}
    </div>
  );

  // Рендер шага 2: Выбор операции
  const renderStep2 = () => {
    const isActive = !!selectedVariableId && hasVariables;

    return (
      <div className={cls(s.step, {[s.inactive_step]: !isActive})}>
        <Text size='2' weight='bold' className={s.step_title}>
          {t('node_operations.master_operation_heading', 'Step 2: Choose operation')}
        </Text>

        <Grid columns={{initial: '3', sm: '5'}} gap='3' className={s.operation_buttons}>
          {(isActive ? getAvailableOperationTypes() : ['override', 'addition', 'subtract', 'multiply', 'divide']).map((type) => {
            let label = '';
            let hint = '';

            switch (type) {
              case 'override':
                label = t('node_operations.master_num_overr_button_text', 'Override (=)');
                hint = t('node_operations.master_num_overr_button_hint', 'Set new value');
                break;
              case 'subtract':
                label = t('node_operations.master_math_subs_button_text', 'Subtract (-)');
                hint = t('node_operations.master_math_subs_button_hint', 'e.g. - 10');
                break;
              case 'addition':
                label = t('node_operations.master_math_add_button_text', 'Addition (+)');
                hint = t('node_operations.master_math_add_button_hint', 'e.g. + 10');
                break;
              case 'multiply':
                label = t('node_operations.master_math_mult_button_text', 'Multiply (*)');
                hint = t('node_operations.master_math_mult_button_hint', 'e.g. * 10');
                break;
              case 'divide':
                label = t('node_operations.master_math_div_button_text', 'Divide (/)');
                hint = t('node_operations.master_math_div_button_hint', 'e.g. / 10');
                break;
              case 'invert':
                label = t('node_operations.master_bool_inv_button_text', 'Invert (!)');
                hint = t('node_operations.master_bool_inv_button_hint', 'true → false or false → true');
                break;
              case 'join':
                label = t('node_operations.master_str_join_button_text', 'Join');
                hint = t('node_operations.master_str_join_button_hint', 'ab+cd = abcd');
                break;
            }

            return (
              <Button
                key={type}
                size='2'
                variant={'outline'}
                color='gray'
                onClick={() => setSelectedOperationType(type as OperationType)}
                className={cls(s.operation__modal_button, {[s.active]: selectedOperationType === type})}
              >
                <div className={s.operation_button_content}>
                  <Text>{label}</Text>
                  <Text size='1' className={s.operation_button_hint}>
                    {hint}
                  </Text>
                </div>
              </Button>
            );
          })}
        </Grid>
      </div>
    );
  };

  // Рендер шага 3: Выбор цели
  const renderStep3 = () => {
    const isActive = !!selectedVariableId && !!selectedOperationType && hasVariables;
    const shouldShowContent = selectedOperationType !== 'invert';

    // Если операция - инверт, показываем шаг, но без содержимого
    if (isActive && selectedOperationType === 'invert') {
      return (
        <div className={s.step}>
          <Text as='div' size='2' weight='bold' className={s.step_title}>
            {t('node_operations.master_bool_target_heading', 'Step 3: Choose target')}
          </Text>
          <Text as='p' size='2' className={s.step_description}>
            {t('node_operations.master_bool_inv_button_hint', 'true → false or false → true')}
          </Text>
        </div>
      );
    }

    return (
      <div className={cls(s.step, {[s.inactive_step]: !isActive})}>
        <Text as='div' size='2' weight='bold' className={s.step_title}>
          {selectedVariable?.type === 'boolean' ? t('node_operations.master_bool_target_heading', 'Step 3: Choose target') : t('node_operations.master_std_target_heading', 'Step 3: Choose target')}
        </Text>

        {shouldShowContent && selectedVariable?.type === 'boolean' && (
          <Flex gap='2' className={s.boolean_buttons}>
            <Button
              variant={booleanValue === true ? 'solid' : 'soft'}
              onClick={() => {
                setBooleanValue(true);
                setTargetType('custom');
              }}
            >
              {t('node_operations.master_bool_target_true_button', 'True')}
            </Button>
            <Button
              variant={booleanValue === false ? 'solid' : 'soft'}
              onClick={() => {
                setBooleanValue(false);
                setTargetType('custom');
              }}
            >
              {t('node_operations.master_bool_target_false_button', 'False')}
            </Button>
          </Flex>
        )}

        {shouldShowContent && selectedVariable?.type !== 'boolean' && (
          <>
            {/* Получаем список совместимых переменных для выбора цели */}
            {(() => {
              const compatibleVariables = variables.filter((v) => v.id !== selectedVariableId && v.type === selectedVariable?.type);
              const hasCompatibleVariables = compatibleVariables.length > 0;

              return (
                <>
                  <RadioGroup.Root
                    value={targetType}
                    onValueChange={(value) => {
                      const newTargetType = value as OperationTargetType;
                      setTargetType(newTargetType);

                      // Если перешли на выбор переменной, но нет совместимых переменных,
                      // возвращаемся к пользовательскому значению
                      if (newTargetType === 'variable' && !hasCompatibleVariables) {
                        setTargetType('custom');
                      }
                    }}
                  >
                    <Flex direction='column' gap='2'>
                      <Text as='label' size='2' color={!hasCompatibleVariables ? 'gray' : undefined}>
                        <Flex gap='2' align='center'>
                          <RadioGroup.Item value='variable' disabled={!hasCompatibleVariables} />
                          {t('node_operations.master_std_target_var_text', 'Variable')}
                          {!hasCompatibleVariables && (
                            <Text as='p' size='1' color='gray'>
                              {t('conditions_master.no_variables_hint', '(No compatible variables found.)')}
                            </Text>
                          )}
                        </Flex>
                      </Text>

                      {targetType === 'variable' && hasCompatibleVariables && (
                        <Box width='250px'>
                          <Select.Root value={targetVariableId} onValueChange={setTargetVariableId}>
                            <Select.Trigger className={s.select_root} placeholder={t('node_operations.master_std_target_var_placeholder', 'Choose variable')} />
                            <Select.Content className={s.select_content}>
                              {compatibleVariables.map((variable) => (
                                <Select.Item key={variable.id} value={variable.id} className={s.select_item}>
                                  <Flex align='center' gap='2'>
                                    <VariableTypeIcon type={variable.type} />
                                    {variable.name}
                                  </Flex>
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </Box>
                      )}

                      <Text as='label' size='2'>
                        <Flex gap='2' align='center'>
                          <RadioGroup.Item value='custom' /> {t('node_operations.master_std_target_value_text', 'Custom value')}
                        </Flex>
                      </Text>

                      {targetType === 'custom' && (
                        <TextField.Root
                          className={s.select_root}
                          placeholder={t('node_operations.master_std_target_value_placeholder', 'Value')}
                          value={customValue}
                          onChange={handleCustomValueChange}
                          type={selectedVariable?.type === 'integer' || selectedVariable?.type === 'float' || selectedVariable?.type === 'percent' ? 'number' : 'text'}
                        >
                          {selectedVariable?.type === 'percent' && (
                            <TextField.Slot side='right'>
                              <Text size='2'>%</Text>
                            </TextField.Slot>
                          )}
                        </TextField.Root>
                      )}
                    </Flex>
                  </RadioGroup.Root>
                </>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  // Рендер превью операции
  const renderPreview = () => {
    const isReady = !!selectedVariableId; // Показываем превью, если выбрана хотя бы переменная

    return (
      <div className={cls(s.preview, {[s.inactive_step]: !isReady})}>
        <Text as='div' size='2' weight='bold' className={s.preview_title}>
          {t('node_operations.master_preview_heading', 'Preview operation')}
        </Text>
        <Text as='p' size='2' className={s.preview_text}>
          {previewText || t('node_operations.master_preview_heading', 'Operation preview will appear here')}
        </Text>
      </div>
    );
  };

  // Обработчик закрытия с учетом хранилища модальных окон
  const handleClose = () => {
    // Отправляем событие закрытия мастера операций при отмене
    trackOperationMasterClosed('CancelButton', currentOperation ? 'existing' : 'new', projectId, timelineId);

    onClose();
  };

  // Обновляем состояние модального окна при открытии/закрытии
  useEffect(() => {
    if (isOpen) {
      // Отправляем событие открытия мастера операций только при первом открытии
      if (!prevIsOpenRef.current) {
        trackOperationMasterOpened('Object', currentOperation ? 'existing' : 'new', isSidebarOpened, projectId, timelineId);
      }
    }

    // Обновляем предыдущее состояние
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentOperation]);

  // Обработчик клавиши Escape для закрытия диалога
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape, true); // Используем capture фазу
      return () => document.removeEventListener('keydown', handleEscape, true);
    }
  }, [isOpen, handleClose]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Content className={s.dialog}>
        <Dialog.Title className={s.dialog_title}>
          {currentOperation ? t('node_operations.master_update_operation_button', 'Edit operation') : t('node_operations.master_add_operation_button', 'Add operation')}
        </Dialog.Title>

        <Dialog.Close>
          <Button variant='ghost' size='1' className={s.close_button}>
            <Cross2Icon />
          </Button>
        </Dialog.Close>

        <div className={s.content}>
          {renderStep1()}
          {renderStep2()}
          {renderStep3()}
          {renderPreview()}
        </div>

        <Flex gap='3' justify='between' mt='4'>
          {currentOperation && (
            <Button color='red' variant='soft' size='3' onClick={handleDelete} className={s.delete_button}>
              <TrashIcon /> {t('node_operations.master_delete_operation_button', 'Delete')}
            </Button>
          )}

          <Flex gap='3' align='center' style={{marginLeft: 'auto'}}>
            <Button variant='soft' size='4' color='gray' onClick={handleClose}>
              {t('node_operations.master_cancel_button', 'Cancel')}
            </Button>

            <Button disabled={!isFormValid() || !hasVariables} onClick={handleSave} size='4' className={isFormValid() && hasVariables ? s.primary_button : undefined}>
              {currentOperation ? t('node_operations.master_update_operation_button', 'Update operation') : t('node_operations.master_add_operation_button', 'Add operation')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
