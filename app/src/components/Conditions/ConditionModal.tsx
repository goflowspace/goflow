'use client';

import React, {useCallback, useEffect, useMemo, useReducer, useRef} from 'react';

import {Cross2Icon, TrashIcon} from '@radix-ui/react-icons';
import {Box, Button, Dialog, Flex, Separator, Text} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import {nanoid} from 'nanoid';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';

import {
  trackConditionCreationComparison,
  trackConditionCreationHappened,
  trackConditionCreationNotHappened,
  trackConditionCreationProbability,
  trackConditionDelete,
  trackConditionMasterClosed,
  trackConditionMasterOpened
} from '../../services/analytics';
import {useUIStore} from '../../store/useUIStore';
import {Condition, ConditionGroup, ConditionType} from '../../types/nodes';
import {Variable} from '../../types/variables';
import {ConditionPreview, ConditionTypePicker, NodeHappenedSetup, ProbabilitySetup, VariableComparisonSetup} from './index';

import styles from './Conditions.module.scss';

interface ConditionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCondition: (condition: Condition) => void;
  variables: Variable[];
  existingCondition?: Condition; // For editing an existing condition
  onDeleteCondition?: (condition: Condition) => void;
  edgeConditions?: ConditionGroup[]; // Все существующие условия на связи
  edgeId?: string; // Идентификатор связи, для которой создается/редактируется условие
}

// Типы действий для редьюсера
type ConditionAction =
  | {type: 'INIT_NEW'; initialType: ConditionType}
  | {type: 'INIT_EXISTING'; condition: Condition}
  | {type: 'CHANGE_TYPE'; conditionType: ConditionType}
  | {type: 'UPDATE_CONDITION'; updates: Partial<Condition>};

// Функция для очистки свойств, не относящихся к конкретному типу условия
const getCleanCondition = (currentCondition: Partial<Condition>, newType: ConditionType): Partial<Condition> => {
  // Общие свойства для всех типов
  const cleanCondition: Partial<Condition> = {
    id: currentCondition.id,
    type: newType
  };

  // Добавляем соответствующие свойства в зависимости от типа
  switch (newType) {
    case ConditionType.PROBABILITY:
      if (currentCondition.probability !== undefined) {
        cleanCondition.probability = currentCondition.probability;
      }
      break;

    case ConditionType.VARIABLE_COMPARISON:
      // Для сравнения переменных
      if (currentCondition.varId !== undefined) {
        cleanCondition.varId = currentCondition.varId;
      }
      if (currentCondition.operator !== undefined) {
        cleanCondition.operator = currentCondition.operator;
      } else {
        cleanCondition.operator = 'eq';
      }
      if (currentCondition.valType !== undefined) {
        cleanCondition.valType = currentCondition.valType;
      } else {
        cleanCondition.valType = 'variable';
      }

      // Сохраняем comparisonVarId только если тип значения 'variable'
      if (currentCondition.valType === 'variable' && currentCondition.comparisonVarId !== undefined) {
        cleanCondition.comparisonVarId = currentCondition.comparisonVarId;
      }

      // Сохраняем value только если тип значения 'custom'
      if (currentCondition.valType === 'custom' && currentCondition.value !== undefined) {
        cleanCondition.value = currentCondition.value;
        // Явно удаляем поле comparisonVarId при valType = 'custom'
        cleanCondition.comparisonVarId = undefined;
      }
      break;

    case ConditionType.NODE_HAPPENED:
    case ConditionType.NODE_NOT_HAPPENED:
      // Для условий посещения узла
      if (currentCondition.nodeId !== undefined) {
        cleanCondition.nodeId = currentCondition.nodeId;
      }
      break;
  }

  return cleanCondition;
};

// Редьюсер для управления состоянием условия
const conditionReducer = (state: Partial<Condition>, action: ConditionAction): Partial<Condition> => {
  switch (action.type) {
    case 'INIT_NEW':
      return {
        id: nanoid(),
        type: action.initialType
      };

    case 'INIT_EXISTING':
      return {...action.condition};

    case 'CHANGE_TYPE':
      return getCleanCondition(state, action.conditionType);

    case 'UPDATE_CONDITION':
      return {...state, ...action.updates};

    default:
      return state;
  }
};

// Функция для проверки валидности условия
const isConditionValid = (condition: Partial<Condition>): boolean => {
  if (!condition.type) return false;

  switch (condition.type) {
    case ConditionType.PROBABILITY:
      return typeof condition.probability === 'number';

    case ConditionType.VARIABLE_COMPARISON:
      return Boolean(
        condition.varId &&
          condition.operator &&
          (condition.valType === 'variable' ? Boolean(condition.comparisonVarId) : condition.value !== undefined && (typeof condition.value === 'boolean' || condition.value !== ''))
      );

    case ConditionType.NODE_HAPPENED:
    case ConditionType.NODE_NOT_HAPPENED:
      return Boolean(condition.nodeId);

    default:
      return false;
  }
};

export const ConditionModal: React.FC<ConditionModalProps> = ({open, onOpenChange, onAddCondition, variables, existingCondition, onDeleteCondition, edgeConditions = [], edgeId}) => {
  const {t} = useTranslation();
  // Используем useReducer вместо нескольких useState для управления состоянием условия
  const [condition, dispatch] = useReducer(conditionReducer, {id: nanoid(), type: ConditionType.PROBABILITY});
  // Используем ref для отслеживания первого открытия
  const openTrackedRef = useRef(false);
  // Ref для отслеживания события закрытия
  const closeEventSentRef = useRef(false);
  // Получаем состояние сайдбара для аналитики
  const isSidebarOpened = useUIStore((state) => state.isSidebarOpen);

  const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  // Проверка на наличие условия типа Probability среди существующих условий
  const hasProbabilityCondition = useMemo(() => {
    return edgeConditions.some((group) => group.conditions.some((cond: Condition) => cond.type === ConditionType.PROBABILITY && (!existingCondition || cond.id !== existingCondition.id)));
  }, [edgeConditions, existingCondition]);

  // Определяем типы условий, которые следует отключить
  const disabledTypes = useMemo<ConditionType[]>(() => {
    return hasProbabilityCondition ? [ConditionType.PROBABILITY] : [];
  }, [hasProbabilityCondition]);

  // Инициализация условия при открытии модального окна
  useEffect(() => {
    if (!open) return;

    if (existingCondition) {
      // Если редактируем существующее условие
      dispatch({type: 'INIT_EXISTING', condition: existingCondition});
    } else {
      // Если создаем новое условие
      const initialType = hasProbabilityCondition ? ConditionType.VARIABLE_COMPARISON : ConditionType.PROBABILITY;
      dispatch({type: 'INIT_NEW', initialType});
    }
  }, [open, existingCondition, hasProbabilityCondition]);

  // Обработчики событий
  const handleConditionTypeChange = useCallback((type: ConditionType) => {
    dispatch({type: 'CHANGE_TYPE', conditionType: type});
  }, []);

  const handleConditionUpdate = useCallback((updates: Partial<Condition>) => {
    dispatch({type: 'UPDATE_CONDITION', updates});
  }, []);

  // Обработчик закрытия с учетом хранилища модальных окон
  const handleClose = useCallback(() => {
    if (!closeEventSentRef.current) {
      trackConditionMasterClosed('CloseButton', existingCondition ? 'existing' : 'new', projectId, timelineId);
      closeEventSentRef.current = true;
    }
    onOpenChange(false);
  }, [existingCondition, onOpenChange]);

  const handleAddCondition = useCallback(() => {
    if (!isConditionValid(condition)) return;

    // Создаем финальную копию условия для сохранения
    const finalCondition = {...condition} as Condition;

    // Для variable_comparison с valType='custom' удаляем поле comparisonVarId
    if (finalCondition.type === ConditionType.VARIABLE_COMPARISON && finalCondition.valType === 'custom') {
      delete finalCondition.comparisonVarId;
    }

    // Отправляем соответствующее событие аналитики в зависимости от типа условия
    const mode = existingCondition ? 'existing' : 'new';

    switch (finalCondition.type) {
      case ConditionType.VARIABLE_COMPARISON: {
        const varType = variables.find((v) => v.id === finalCondition.varId)?.type;
        const variableTypeMap: Record<string, 'String' | 'Integer' | 'Float' | 'Percent' | 'Boolean'> = {
          string: 'String',
          number: 'Float',
          boolean: 'Boolean'
        };
        trackConditionCreationComparison(mode, finalCondition.operator as any, finalCondition.valType || 'variable', variableTypeMap[varType || 'number'] || 'Integer', projectId, timelineId);
        break;
      }
      case ConditionType.PROBABILITY:
        trackConditionCreationProbability(mode, 'custom', finalCondition.probability || 0.5, projectId, timelineId);
        break;
      case ConditionType.NODE_HAPPENED: {
        trackConditionCreationHappened(mode, finalCondition.nodeType === 'narrative' ? 'Narrative' : 'Choice', projectId, timelineId);
        break;
      }
      case ConditionType.NODE_NOT_HAPPENED: {
        trackConditionCreationNotHappened(mode, finalCondition.nodeType === 'narrative' ? 'Narrative' : 'Choice', projectId, timelineId);
        break;
      }
    }

    onAddCondition(finalCondition);
    // Устанавливаем флаг, что событие закрытия уже обработано (не отправляем)
    closeEventSentRef.current = true;
    handleClose();
  }, [condition, onAddCondition, handleClose, existingCondition, variables]);

  const handleDeleteCondition = useCallback(() => {
    if (existingCondition && onDeleteCondition) {
      trackConditionDelete('master', projectId, timelineId);
      onDeleteCondition(existingCondition);
      handleClose();
    }
  }, [existingCondition, onDeleteCondition, handleClose]);

  // Обновляем состояние модального окна при открытии/закрытии
  useEffect(() => {
    if (open) {
      // Отправляем событие только при первом открытии
      if (!openTrackedRef.current) {
        trackConditionMasterOpened(existingCondition ? 'Inspector' : 'Object', existingCondition ? 'existing' : 'new', isSidebarOpened, projectId, timelineId);
        openTrackedRef.current = true;
      }

      // Сбрасываем флаг отправки события закрытия при каждом открытии
      closeEventSentRef.current = false;
    } else {
      // Сбрасываем флаг при закрытии
      openTrackedRef.current = false;
    }
  }, [open, existingCondition]);

  // Обработчик клавиши Escape для закрытия диалога
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape, true); // Используем capture фазу
      return () => document.removeEventListener('keydown', handleEscape, true);
    }
  }, [open, handleClose]);

  // Компоненты для настройки различных типов условий
  const renderSetupComponent = useCallback(() => {
    switch (condition.type) {
      case ConditionType.PROBABILITY:
        return <ProbabilitySetup probability={condition.probability} onUpdate={(prob: number) => handleConditionUpdate({probability: prob})} />;

      case ConditionType.VARIABLE_COMPARISON:
        return (
          <VariableComparisonSetup
            variables={variables}
            varId={condition.varId}
            comparisonVarId={condition.comparisonVarId}
            value={condition.value}
            operator={condition.operator}
            valType={condition.valType}
            onUpdate={handleConditionUpdate}
          />
        );

      case ConditionType.NODE_HAPPENED:
      case ConditionType.NODE_NOT_HAPPENED:
        return (
          <NodeHappenedSetup
            nodeId={condition.nodeId}
            edgeId={edgeId}
            onUpdate={(nodeId: string, nodeType?: 'narrative' | 'choice') => {
              const updates: Partial<Condition> = {nodeId};
              if (nodeType) {
                updates.nodeType = nodeType;
              }
              handleConditionUpdate(updates);
            }}
          />
        );

      default:
        return null;
    }
  }, [
    condition.type,
    condition.probability,
    condition.varId,
    condition.comparisonVarId,
    condition.value,
    condition.operator,
    condition.valType,
    condition.nodeId,
    variables,
    handleConditionUpdate,
    edgeId
  ]);

  // Мемоизируем компоненты для предотвращения ненужных перерисовок
  const typePicker = useMemo(
    () => <ConditionTypePicker selectedType={condition.type} onTypeSelect={handleConditionTypeChange} disabledTypes={disabledTypes} />,
    [condition.type, handleConditionTypeChange, disabledTypes]
  );

  const setupComponent = useMemo(() => renderSetupComponent(), [renderSetupComponent]);

  const previewComponent = useMemo(() => <ConditionPreview condition={condition as Condition} variables={variables} />, [condition, variables]);

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content className={styles.modal_content}>
        <Dialog.Title>
          <Flex className={styles.modal_title_container}>
            <Text size='5' weight='bold'>
              {existingCondition ? t('conditions_master.edit_condition_button', 'Update condition') : t('conditions_master.add_condition_button', 'Add condition')}
            </Text>
            <Dialog.Close>
              <Button variant='ghost' size='2' color='gray'>
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        {/* Step 1: Choose condition type */}
        <Box className={styles.step_container}>
          <Text size='2' className={styles.step_label}>
            <Text className={styles.step_label_bold}>{t('conditions_master.condition_type_heading', 'Step 1: Choose condition type')}</Text>
          </Text>
          {typePicker}
        </Box>

        {/* Step 2: Setup chosen condition */}
        <Box className={styles.step_container}>
          <Text size='2' className={styles.step_label}>
            <Text className={styles.step_label_bold}>{t('conditions_master.condition_set_heading', 'Step 2: Set up')}</Text>
          </Text>
          {setupComponent}
        </Box>

        {/* Preview condition */}
        <Box className={styles.preview_container}>
          <Separator size='4' />
          <Text size='2' className={styles.preview_title}>
            {t('conditions_master.condition_preview_hint', 'Preview condition')}
          </Text>
          {previewComponent}
        </Box>

        {/* Action buttons */}
        <Flex gap='2' mt='4' justify='end'>
          {existingCondition && onDeleteCondition && (
            <Button variant='soft' color='red' onClick={handleDeleteCondition}>
              <TrashIcon /> {t('conditions_master.delete_condition_button', 'Delete')}
            </Button>
          )}
          <Button variant='solid' color='gray' onClick={handleClose}>
            {t('conditions_master.cancel_button', 'Cancel')}
          </Button>
          <Button variant='solid' onClick={handleAddCondition} disabled={!isConditionValid(condition)}>
            {existingCondition ? t('conditions_master.edit_condition_button', 'Update condition') : t('conditions_master.add_condition_button', 'Add condition')}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
