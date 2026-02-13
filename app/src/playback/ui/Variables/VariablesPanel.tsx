import React, {useState} from 'react';

import {CheckIcon, Pencil1Icon} from '@radix-ui/react-icons';
import {Box, Button, Flex, IconButton, ScrollArea, Slider, Switch, Text, TextField} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {Variable, VariableType} from '../../../types/variables';
import {formatVariableValue} from '../../../utils/variableFormatters';
import {StoryEngine} from '../../engine/interfaces/StoryEngine';

import styles from './VariablesPanel.module.css';

interface VariablesPanelProps {
  variables: Record<string, Variable>;
  expanded: boolean;
  onToggle: () => void;
  engine: StoryEngine;
  onVariableChange?: () => void;
}

export const VariablesPanel: React.FC<VariablesPanelProps> = ({variables, expanded, onToggle, engine, onVariableChange}) => {
  const {t} = useTranslation();

  // Локальное состояние для редактируемых переменных
  const [editingVariables, setEditingVariables] = useState<Record<string, string | number | boolean>>({});
  // Состояние режима редактирования
  const [isEditMode, setIsEditMode] = useState(false);
  // Состояние для отслеживания ошибок
  const [error, setError] = useState<string | null>(null);

  // Функция для получения актуального значения переменной из движка
  const getActualVariableValue = (id: string): Variable | null => {
    const engineState = engine.getState();
    return engineState.variables[id] || variables[id] || null;
  };

  // Функция для изменения значения переменной
  const updateVariable = (id: string, value: string | number | boolean) => {
    if (engine) {
      try {
        // Применяем изменение в движке
        engine.setVariableManually(id, value);

        // Вызываем callback, если он передан
        if (onVariableChange) {
          onVariableChange();
        }

        setError(null);

        // Принудительно обновляем компонент
        setEditingVariables((prev) => ({...prev}));
      } catch (err) {
        setError(`${t('playback.variables_panel.update_error')} ${(err as Error).message}`);
        console.error('Error updating variable:', err);
      }
    }
  };

  // Функция для переключения режима редактирования
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    // Сбрасываем редактируемые переменные при выходе из режима редактирования
    if (isEditMode) {
      setEditingVariables({});
      setError(null);
    }
  };

  // Обработчик изменения значения в инпуте для числовых типов
  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>, id: string, type: VariableType) => {
    const value = e.target.value;
    const numValue = type === 'integer' ? parseInt(value, 10) : parseFloat(value);

    if (!isNaN(numValue)) {
      setEditingVariables({...editingVariables, [id]: value});
    }
  };

  // Обработчик изменения значения в инпуте для текстовых типов
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    setEditingVariables({...editingVariables, [id]: e.target.value});
  };

  // Обработчик потери фокуса для применения изменений
  const handleInputBlur = (id: string, type: VariableType) => {
    if (id in editingVariables) {
      let value = editingVariables[id];

      if (type === 'integer') {
        value = parseInt(String(value), 10);
      } else if (type === 'float') {
        value = parseFloat(String(value));
      } else if (type === 'percent') {
        value = parseFloat(String(value)) / 100;
      }

      updateVariable(id, value);

      // Удаляем из редактируемых после применения
      const newEditingVariables = {...editingVariables};
      delete newEditingVariables[id];
      setEditingVariables(newEditingVariables);
    }
  };

  // Обработчики для кнопок увеличения/уменьшения значений
  const handleIncrement = (id: string, type: VariableType) => {
    const actualVariable = getActualVariableValue(id);
    if (!actualVariable) return;

    let newValue: number;

    if (type === 'integer') {
      newValue = Math.round(Number(actualVariable.value) + 1);
    } else {
      // float
      newValue = Number((Number(actualVariable.value) + 0.1).toFixed(2));
    }

    updateVariable(id, newValue);
  };

  const handleDecrement = (id: string, type: VariableType) => {
    const actualVariable = getActualVariableValue(id);
    if (!actualVariable) return;

    let newValue: number;

    if (type === 'integer') {
      newValue = Math.round(Number(actualVariable.value) - 1);
    } else {
      // float
      newValue = Number((Number(actualVariable.value) - 0.1).toFixed(2));
    }

    updateVariable(id, newValue);
  };

  // Рендер интерактивного редактора значения переменной
  const renderVariableEditor = (id: string, variable: Variable) => {
    if (!variable) return null;

    // Получаем актуальное значение из движка
    const actualVariable = getActualVariableValue(id);
    if (!actualVariable) return null;

    switch (actualVariable.type) {
      case 'boolean':
        return (
          <Switch
            checked={Boolean(actualVariable.value)}
            onCheckedChange={(checked) => {
              updateVariable(id, checked);
            }}
          />
        );
      case 'integer':
        return (
          <Flex gap='1' style={{width: '100%'}}>
            <Button
              size='1'
              variant='soft'
              onClick={() => {
                handleDecrement(id, 'integer');
              }}
            >
              -
            </Button>
            <TextField.Root
              size='1'
              value={id in editingVariables ? String(editingVariables[id]) : String(Math.round(Number(actualVariable.value)))}
              onChange={(e) => handleNumberInputChange(e, id, 'integer')}
              onBlur={() => handleInputBlur(id, 'integer')}
              style={{flex: 1, minWidth: 0}}
            />
            <Button
              size='1'
              variant='soft'
              onClick={() => {
                handleIncrement(id, 'integer');
              }}
            >
              +
            </Button>
          </Flex>
        );
      case 'float':
        return (
          <Flex gap='1' style={{width: '100%'}}>
            <Button
              size='1'
              variant='soft'
              onClick={() => {
                handleDecrement(id, 'float');
              }}
            >
              -
            </Button>
            <TextField.Root
              size='1'
              value={id in editingVariables ? String(editingVariables[id]) : Number(actualVariable.value).toFixed(2)}
              onChange={(e) => handleNumberInputChange(e, id, 'float')}
              onBlur={() => handleInputBlur(id, 'float')}
              style={{flex: 1, minWidth: 0}}
            />
            <Button
              size='1'
              variant='soft'
              onClick={() => {
                handleIncrement(id, 'float');
              }}
            >
              +
            </Button>
          </Flex>
        );
      case 'percent':
        return (
          <Flex direction='column' gap='1' className={styles['variable-percent']}>
            <Flex justify='between'>
              <Text size='1'>{Math.round(Number(actualVariable.value) * 100)}%</Text>
            </Flex>
            <Slider
              value={[Number(actualVariable.value) * 100]}
              min={0}
              max={100}
              step={1}
              size='1'
              variant='surface'
              onValueChange={(value) => {
                // Мгновенное визуальное обновление
                const newValue = value[0] / 100;
                updateVariable(id, newValue);
              }}
              style={{width: '100%'}}
            />
          </Flex>
        );
      case 'string':
      default:
        return (
          <TextField.Root
            size='1'
            value={id in editingVariables ? String(editingVariables[id]) : String(actualVariable.value)}
            onChange={(e) => {
              handleTextInputChange(e, id);
            }}
            onBlur={() => handleInputBlur(id, 'string')}
            style={{width: '100%'}}
          />
        );
    }
  };

  // Рендер только значения переменной без возможности редактирования
  const renderVariableValue = (id: string, variable: Variable) => {
    // Получаем актуальное значение из движка
    const actualVariable = getActualVariableValue(id);
    if (!actualVariable) return null;

    const formattedValue = formatVariableValue(actualVariable.value, actualVariable.type);
    return (
      <Text
        size='2'
        weight='medium'
        className={styles['variable-value']}
        style={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'right'
        }}
        title={formattedValue}
      >
        {formattedValue}
      </Text>
    );
  };

  return (
    <Flex direction='column' gap='2' style={{height: '100%'}}>
      <Flex align='center' justify='between'>
        <Flex align='center' gap='2'>
          <IconButton variant='ghost' size='1' onClick={toggleEditMode} aria-label={isEditMode ? t('playback.variables_panel.edit_mode_finish') : t('playback.variables_panel.edit_mode_start')}>
            {isEditMode ? <CheckIcon /> : <Pencil1Icon />}
          </IconButton>
          <Text size='1' color='gray'>
            {isEditMode ? t('playback.variables_panel.edit_mode_active') : t('playback.variables_panel.view_mode')}
          </Text>
        </Flex>
      </Flex>

      {error && (
        <Text size='1' className={styles['error-message']}>
          {error}
        </Text>
      )}

      <ScrollArea style={{flex: 1}}>
        <Flex direction='column' gap='3'>
          {Object.entries(variables).map(([id, variable]) => {
            if (!variable) return null;

            return (
              <Flex key={id} justify='between' align='center' gap='2' style={{minWidth: 0}}>
                <Text
                  size='2'
                  color='gray'
                  style={{
                    minWidth: '100px',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={variable.name}
                >
                  {variable.name}:
                </Text>
                <Box
                  style={{
                    minWidth: '120px',
                    maxWidth: '120px',
                    flex: 1
                  }}
                >
                  {isEditMode ? renderVariableEditor(id, variable) : renderVariableValue(id, variable)}
                </Box>
              </Flex>
            );
          })}
        </Flex>
      </ScrollArea>
    </Flex>
  );
};
