'use client';

import React, {useEffect, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {CommitIcon, PlusCircledIcon, ShadowInnerIcon, SwitchIcon, TextIcon, TokensIcon, VercelLogoIcon} from '@radix-ui/react-icons';
import * as Tabs from '@radix-ui/react-tabs';
import {Button, ChevronDownIcon, Dialog, Flex, Separator, Switch, Text, TextField} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';

import {trackVariableCreation, trackVariableMasterClosed} from '../../services/analytics';
import {generateInternalName, useVariablesStore} from '../../store/useVariablesStore';
import {Variable, VariableType} from '../../types/variables';
import {formatVariableValue} from '../../utils/variableFormatters';

import s from './Sidebar.module.scss';

// Модальное окно для добавления/редактирования переменной
const VariableFormDialog = ({
  isOpen,
  onClose,
  variableToEdit,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  variableToEdit?: Variable;
  onSave: (name: string, type: VariableType, value: string | number | boolean, description?: string, internalName?: string) => void;
}) => {
  const {t} = useTranslation();
  const isEditMode = !!variableToEdit;
  const [name, setName] = useState(variableToEdit?.name || '');
  const [internalName, setInternalName] = useState(variableToEdit?.internalName || '');
  const [type, setType] = useState<VariableType>(variableToEdit?.type || 'integer');
  const [value, setValue] = useState<string>('');
  const [description, setDescription] = useState(variableToEdit?.description || '');
  // Флаг для отслеживания ручного редактирования внутреннего имени
  const [internalNameEdited, setInternalNameEdited] = useState(false);
  // Флаг для отображения диалога подтверждения удаления
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const projectId = useCurrentProject().projectId || ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  const deleteVariableWithRelatedItems = useVariablesStore((s) => s.deleteVariableWithRelatedItems);

  // Сбрасываем состояние при изменении режима или переменной
  useEffect(() => {
    if (variableToEdit) {
      setName(variableToEdit.name);
      setInternalName(variableToEdit.internalName || generateInternalName(variableToEdit.name));
      setType(variableToEdit.type);

      // Для процентных значений преобразуем из внутреннего формата (0-1) в отображаемый (0-100%)
      if (variableToEdit.type === 'percent' && typeof variableToEdit.value === 'number') {
        setValue(String(Math.round(variableToEdit.value * 100)));
      } else {
        setValue(String(variableToEdit.value));
      }

      setDescription(variableToEdit.description || '');
      setInternalNameEdited(false); // Сбрасываем флаг при новом редактировании
    } else {
      setName('');
      setInternalName('');
      setType('integer');
      setValue(''); // Оставляем пустым, чтобы отображался placeholder
      setDescription('');
      setInternalNameEdited(false);
    }
  }, [variableToEdit, isOpen]);

  // Обновляем внутреннее имя при изменении пользовательского имени
  useEffect(() => {
    // Обновляем внутреннее имя только если пользователь его не редактировал вручную
    if (!internalNameEdited && name) {
      setInternalName(generateInternalName(name));
    }
  }, [name, internalNameEdited]);

  // Валидация внутреннего имени
  const validateInternalName = (name: string): boolean => {
    // Внутреннее имя должно содержать только латинские буквы, цифры, подчеркивания
    // Должно начинаться с буквы или подчеркивания
    return /^[a-z_][a-z0-9_]*$/.test(name);
  };

  // Обработчик изменения внутреннего имени
  const handleInternalNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value.toLowerCase();

    // Если поле полностью очищено, сбрасываем флаг редактирования
    if (newValue === '') {
      setInternalName('');
      setInternalNameEdited(false); // Сбрасываем флаг при полном очищении поля
      return;
    }

    // Проверяем, начинается ли новое значение с цифры
    if (/^\d/.test(newValue)) {
      // Если начинается с цифры, заменяем её на 'var'
      newValue = 'var' + newValue;
    }

    // Разрешаем только латинские буквы, цифры и подчеркивания
    if (/^[a-z_][a-z0-9_]*$/.test(newValue) || newValue === '') {
      setInternalName(newValue);
      setInternalNameEdited(true); // Помечаем, что пользователь редактировал внутреннее имя
    }
  };

  // Валидация поля ввода в зависимости от типа
  const validateInput = (val: string, type: VariableType): boolean => {
    if (!val.trim()) return false;

    switch (type) {
      case 'integer': {
        // Целые числа от -2147483648 до 2147483647
        if (!/^-?\d+$/.test(val)) return false;
        const intVal = parseInt(val, 10);
        return intVal >= -2147483648 && intVal <= 2147483647;
      }
      case 'float': {
        // Числа с плавающей точкой с точностью до 2 знаков после запятой
        if (!/^-?\d+(\.\d{0,2})?$/.test(val)) return false;
        const floatVal = parseFloat(val);
        return floatVal >= -2147483648 && floatVal <= 2147483647;
      }
      case 'percent': {
        // Процентные значения от 0% до 100%
        if (!/^\d+(\.\d{0,2})?$/.test(val)) return false;
        const numVal = parseFloat(val);
        return numVal >= 0 && numVal <= 100;
      }
      case 'boolean':
        return val === 'true' || val === 'false';
      case 'string':
        // Строки от 1 до 144 символов
        return val.length >= 1 && val.length <= 144;
      default:
        return true;
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Валидация ввода на лету в зависимости от типа
    if (type === 'integer') {
      // Разрешаем только цифры и минус в начале
      if (/^-?\d*$/.test(newValue)) {
        // Проверяем диапазон только для полного числа
        if (newValue === '' || newValue === '-') {
          setValue(newValue);
        } else {
          const num = parseInt(newValue, 10);
          if (num >= -2147483648 && num <= 2147483647) {
            setValue(newValue);
          }
        }
      }
    } else if (type === 'float') {
      // Разрешаем цифры, одну точку и до двух знаков после точки
      if (/^-?\d*\.?\d{0,2}$/.test(newValue)) {
        // Для дробных чисел проверяем диапазон только если есть числовое значение
        if (newValue === '' || newValue === '-' || newValue === '.' || newValue === '-.') {
          setValue(newValue);
        } else {
          const num = parseFloat(newValue);
          if (!isNaN(num) && num >= -2147483648 && num <= 2147483647) {
            setValue(newValue);
          }
        }
      }
    } else if (type === 'percent') {
      // Разрешаем цифры, одну точку и до двух знаков после точки для процентов (0-100%)
      if (/^\d*\.?\d{0,2}$/.test(newValue)) {
        const num = parseFloat(newValue);
        if (isNaN(num) || (num >= 0 && num <= 100)) {
          setValue(newValue);
        }
      }
    } else if (type === 'boolean') {
      // Для boolean разрешаем только true/false
      if (newValue === 'true' || newValue === 'false' || newValue === '') {
        setValue(newValue);
      }
    } else if (type === 'string') {
      // Для строк ограничение до 144 символов
      if (newValue.length <= 144) {
        setValue(newValue);
      }
    } else {
      // Для строк ограничений нет
      setValue(newValue);
    }
  };

  // Обработчик смены типа переменной
  const handleTypeChange = (newType: VariableType) => {
    setType(newType);

    // При смене типа очищаем значение, чтобы отображался placeholder
    if (newType === 'boolean') {
      setValue('false');
    } else {
      setValue('');
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (!validateInput(value, type)) return;
    if (!validateInternalName(internalName)) return;

    let typedValue: string | number | boolean = value;

    switch (type) {
      case 'integer':
        typedValue = parseInt(value, 10);
        break;
      case 'float':
        typedValue = parseFloat(value);
        break;
      case 'percent': {
        // Преобразуем процентное значение от 0-100% во внутреннее значение 0.00-1.00
        const percentValue = parseFloat(value);
        typedValue = percentValue / 100;
        // Убедимся, что значение в диапазоне [0, 1]
        typedValue = Math.max(0, Math.min(1, typedValue));
        break;
      }
      case 'boolean':
        typedValue = value === 'true';
        break;
      case 'string':
        // Убедимся, что длина строки не более 144 символов
        typedValue = value.substring(0, 144);
        break;
    }

    // Отправляем событие создания переменной
    trackVariableCreation(isEditMode ? 'existing' : 'new', type, projectId, timelineId);

    onSave(name, type, typedValue, description, internalName);
    // Закрываем диалог без отправки события закрытия
    onClose();
  };

  const handleDelete = () => {
    if (variableToEdit) {
      // Показываем диалог подтверждения перед удалением
      setShowDeleteConfirm(true);
    }
  };

  // Обработчик подтверждения удаления
  const confirmDelete = () => {
    if (variableToEdit) {
      // Используем интегрированную функцию для удаления переменной и связанных элементов
      deleteVariableWithRelatedItems(variableToEdit.id);

      // Закрываем диалог подтверждения и форму
      setShowDeleteConfirm(false);
      onClose();
      trackVariableMasterClosed('DeleteButton', 'existing', projectId, timelineId);
    }
  };

  // Получаем плейсхолдер для поля ввода
  const getPlaceholder = (): string => {
    switch (type) {
      case 'integer':
        return t('variables_form.placeholder_integer', 'e.g. 1, 10, 15');
      case 'float':
        return t('variables_form.placeholder_float', 'e.g. 3.14, -10.55, 30.5');
      case 'percent':
        return t('variables_form.placeholder_percent', 'e.g. 10%, 25%');
      case 'string':
        return t('variables_form.placeholder_string', "e.g. 'Peter', 'apples'");
      case 'boolean':
        return t('variables_form.placeholder_boolean', 'true or false');
      default:
        return '';
    }
  };

  // Получаем заголовок для поля ввода значения
  const getValueFieldLabel = (): string => {
    switch (type) {
      case 'integer':
        return t('variables_form.value_integer', 'Integer value');
      case 'float':
        return t('variables_form.value_float', 'Fractional value');
      case 'percent':
        return t('variables_form.value_percent', 'Percent value');
      case 'string':
        return t('variables_form.value_string', 'String value');
      case 'boolean':
        return t('variables_form.value_boolean', 'Boolean value');
      default:
        return t('variables_form.value', 'Value');
    }
  };

  // Обработчик закрытия с учетом хранилища модальных окон
  const handleClose = (closeMethod: 'CancelButton' | 'ClickOutsideWindow' | 'ConfirmationButton' | 'DeleteButton' | 'CloseButton' = 'CloseButton') => {
    onClose();
    trackVariableMasterClosed(closeMethod, isEditMode ? 'existing' : 'new', projectId, timelineId);
  };

  // Обработчик клавиши Escape для закрытия диалога
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose('CloseButton');
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape, true); // Используем capture фазу
      return () => document.removeEventListener('keydown', handleEscape, true);
    }
  }, [isOpen]);

  return (
    <>
      <Dialog.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose('ClickOutsideWindow');
          }
        }}
      >
        <Dialog.Content className={s.variable_form_dialog}>
          <Dialog.Title>{isEditMode ? t('variables_form.edit_variable', 'Edit variable') : t('variables_form.add_variable', 'Add variable')}</Dialog.Title>

          <Flex direction='column' gap='5'>
            <div className={s.variable_form_container}>
              {/* Шаг 1: Выбор типа переменной */}
              <Text as='div' size='2' weight='bold' className={s.variable_step_title}>
                {t('variables_form.step1', 'Step 1:')}
                <Text weight='medium'> {t('variables_form.choose_type', 'Choose variable type')}</Text>
              </Text>

              <Tabs.Root value={type} onValueChange={(value) => handleTypeChange(value as VariableType)} className={s.type_selection_grid}>
                <Tabs.List className={s.tabs_list} aria-label={t('variables_form.choose_type', 'Choose variable type')}>
                  <Tabs.Trigger value='integer' className={`${s.type_select_item} ${type === 'integer' ? s.selected : ''}`}>
                    <Text weight='medium'>{t('variables_form.type_integer', 'Integers')}</Text>
                    <Text size='1' color='gray'>
                      {t('variables_form.placeholder_integer', 'e.g. 2, 35, 100')}
                    </Text>
                  </Tabs.Trigger>

                  <Tabs.Trigger value='float' className={`${s.type_select_item} ${type === 'float' ? s.selected : ''}`}>
                    <Text weight='medium'>{t('variables_form.type_float', 'Fractional')}</Text>
                    <Text size='1' color='gray'>
                      {t('variables_form.placeholder_float', 'e.g. 3.14, 15.55')}
                    </Text>
                  </Tabs.Trigger>

                  <Tabs.Trigger value='percent' className={`${s.type_select_item} ${type === 'percent' ? s.selected : ''}`}>
                    <Text weight='medium'>{t('variables_form.type_percent', 'Percent')}</Text>
                    <Text size='1' color='gray'>
                      {t('variables_form.placeholder_percent', 'e.g. 10%, 50%')}
                    </Text>
                  </Tabs.Trigger>

                  <Tabs.Trigger value='string' className={`${s.type_select_item} ${type === 'string' ? s.selected : ''}`}>
                    <Text weight='medium'>{t('variables_form.type_string', 'String')}</Text>
                    <Text size='1' color='gray'>
                      {t('variables_form.placeholder_string', `e.g. 'Apple';`)}
                    </Text>
                  </Tabs.Trigger>

                  <Tabs.Trigger value='boolean' className={`${s.type_select_item} ${type === 'boolean' ? s.selected : ''}`}>
                    <Text weight='medium'>{t('variables_form.type_boolean', 'Boolean')}</Text>
                    <Text size='1' color='gray'>
                      {t('variables_form.placeholder_boolean', 'true or false')}
                    </Text>
                  </Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>
            </div>

            <div className={s.variable_form_container}>
              {/* Шаг 2: Имя переменной */}
              <Text as='div' size='2' weight='bold' className={s.variable_step_title}>
                {t('variables_form.step2', 'Step 2:')}
                <Text weight='regular'> {t('variables_form.set_name', 'Set variable name')}</Text>
              </Text>

              <Flex direction='column' gap='2' className={s.variable_form_flex}>
                <Flex direction='column' gap='1' className={s.variable_form_field}>
                  <Text as='label' size='2' weight='medium'>
                    {t('variables_form.custom_name', 'Custom name')}
                  </Text>
                  <TextField.Root placeholder={t('variables_form.custom_name_placeholder', 'Type any name')} value={name} onChange={(e) => setName(e.target.value)} className={s.variable_form_input} />
                </Flex>

                <Flex direction='column' gap='1' className={s.variable_form_field}>
                  <Text as='label' size='2' weight='medium'>
                    {t('variables_form.internal_name', 'Internal name')}
                  </Text>
                  <TextField.Root
                    placeholder={t('variables_form.internal_name_placeholder', 'Type any name')}
                    value={internalName}
                    onChange={handleInternalNameChange}
                    className={s.variable_internal_name_input}
                  />
                </Flex>
              </Flex>
            </div>

            <div className={s.variable_form_container}>
              {/* Шаг 3: Значение */}
              <Text as='div' size='2' weight='bold' className={s.variable_step_title}>
                {t('variables_form.step3', 'Step 3:')}
                <Text weight='regular'> {t('variables_form.set_default', 'Set default value')}</Text>
              </Text>

              {/* Для типа boolean используем переключатель */}
              <Flex direction='column' gap='1' className={s.variable_form_flex}>
                <Text as='label' size='2' weight='medium'>
                  {getValueFieldLabel()}
                </Text>
                {type === 'boolean' ? (
                  <Flex align='center' gap='2' className={s.variable_switch_container}>
                    <Switch checked={value === 'true'} onCheckedChange={(checked) => setValue(checked ? 'true' : 'false')} className={s.variable_button} />
                    <Text size='2' className={s.variable_switch_label}>
                      {value === 'true' ? t('variables_form.value_true', 'True') : t('variables_form.value_false', 'False')}
                    </Text>
                  </Flex>
                ) : (
                  <TextField.Root placeholder={getPlaceholder()} value={value} onChange={handleValueChange} className={s.variable_form_input}>
                    <TextField.Slot side='left'>
                      <VariableTypeIcon type={type} />
                    </TextField.Slot>
                  </TextField.Root>
                )}
              </Flex>
            </div>
          </Flex>

          <Flex className={s.variable_buttons_container}>
            {isEditMode && (
              <Button color='red' variant='soft' size='3' onClick={handleDelete} className={s.variable_delete_button}>
                {t('variables_form.delete', 'Delete variable')}
              </Button>
            )}
            <span className={s.variable_spacer}></span>
            <Button variant='soft' onClick={() => handleClose('CancelButton')} size='4' className={s.variable_button}>
              {t('variables_form.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !validateInput(value, type) || !validateInternalName(internalName)}
              size='4'
              className={!name.trim() || !validateInput(value, type) || !validateInternalName(internalName) ? '' : s.variable_button}
            >
              {isEditMode ? t('variables_form.save', 'Save changes') : t('variables_form.add_variable', 'Add variable')}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Диалог подтверждения удаления */}
      <Dialog.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <Dialog.Content size='2' className={s.variable_confirm_dialog}>
          <Dialog.Title>{t('variables_form.delete_confirm_title', 'Delete variable: {{name}}', {name: variableToEdit?.name})}</Dialog.Title>
          <Dialog.Description>
            {t('variables_form.delete_confirm_desc', 'Are you sure? This variable is used in conditions or operations. Deleting it will delete all conditions and operations that use this variable!')}
          </Dialog.Description>

          <Flex gap='3' mt='4' justify='end'>
            <Button variant='soft' onClick={() => setShowDeleteConfirm(false)} className={s.variable_button}>
              {t('variables_form.delete_confirm_cancel', 'Cancel')}
            </Button>
            <Button color='red' onClick={confirmDelete} className={s.variable_button}>
              {t('variables_form.delete_confirm_delete', 'Delete')}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

// Компонент для отображения значения переменной в соответствии с ее типом
const VariableValue = ({variable}: {variable: Variable}) => {
  const truncateText = (text: string, maxLength: number = 15) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Используем утилиту для форматирования значения в зависимости от типа
  const formattedValue = formatVariableValue(variable.value, variable.type);
  return (
    <Text size='1' className={s.variable_value_text}>
      {truncateText(formattedValue)}
    </Text>
  );
};

// Компонент для иконки типа переменной
const VariableTypeIcon = ({type}: {type: VariableType}) => {
  switch (type) {
    case 'string':
      return <TextIcon />;
    case 'integer':
      return <ShadowInnerIcon />;
    case 'float':
      return <CommitIcon />;
    case 'percent':
      return <VercelLogoIcon />;
    case 'boolean':
      return <SwitchIcon />;
    default:
      return <div className={s.variable_icon} />;
  }
};

// Компонент для отображения панели переменных
const VariablesPanel = ({isAddDialogOpen, onCloseAddDialog}: {isAddDialogOpen: boolean; onCloseAddDialog: () => void}) => {
  const variables = useVariablesStore((s) => s.variables);
  const {addVariable, updateVariable} = useVariablesStore();
  const {t} = useTranslation();

  const [variableToEdit, setVariableToEdit] = useState<Variable | undefined>(undefined);

  const handleVariableClick = (variable: Variable) => {
    setVariableToEdit(variable);
  };

  const saveVariable = (name: string, type: VariableType, value: string | number | boolean, description?: string, internalName?: string) => {
    if (variableToEdit) {
      updateVariable(variableToEdit.id, {name, type, value, description, internalName});
    } else {
      addVariable(name, type, value, description, internalName);
    }

    setVariableToEdit(undefined);
  };

  return (
    <div className={s.variables_panel}>
      {variables.length === 0 ? (
        <Text size='1' color='gray' align='center' className={s.empty_variables_message}>
          {t('variables_form.empty_list', 'You have not added any global variables yet.')}
        </Text>
      ) : (
        <div className={s.variables_list}>
          {variables.map((variable) => (
            <div key={variable.id} className={s.variable_row} onClick={() => handleVariableClick(variable)}>
              <div className={s.variable_name}>
                <div className={s.variable_icon}>
                  <VariableTypeIcon type={variable.type} />
                </div>
                <Text size='2' className={s.variable_name_text}>
                  {variable.name}
                </Text>
              </div>
              <div className={s.variable_value}>
                <VariableValue variable={variable} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Диалог добавления переменной */}
      <VariableFormDialog isOpen={isAddDialogOpen} onClose={onCloseAddDialog} onSave={saveVariable} />

      {/* Диалог редактирования переменной */}
      <VariableFormDialog isOpen={!!variableToEdit} onClose={() => setVariableToEdit(undefined)} variableToEdit={variableToEdit} onSave={saveVariable} />
    </div>
  );
};

export default VariablesPanel;
