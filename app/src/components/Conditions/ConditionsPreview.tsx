'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {CubeIcon, EyeNoneIcon, EyeOpenIcon, PlusIcon, RulerSquareIcon, TrashIcon} from '@radix-ui/react-icons';
import {Badge, Box, Button, Card, Flex, IconButton, Text} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import {nanoid} from 'nanoid';
import {useTranslation} from 'react-i18next';

import {getCommandManager} from '../../commands/CommandManager';
import {trackConditionDelete} from '../../services/analytics';
import {useGraphStore} from '../../store/useGraphStore';
import {useVariablesStore} from '../../store/useVariablesStore';
import {Condition, ConditionGroup} from '../../types/nodes';
import {formatConditionValue, getConditionGroups, getConditionIconProps, getOperatorSymbol} from '../../utils/conditionUtils';
import {getAllNodesFromAllLayers} from '../../utils/getAllNodesFromAllLayers';
import {getNodeTitle} from '../../utils/getNodeTitle';

import styles from './Conditions.module.scss';

interface ConditionsPreviewProps {
  edgeId: string;
  position: {x: number; y: number};
  onOpenConditionModal: (conditionType?: 'AND' | 'OR', existingCondition?: Condition) => void;
  onClose: () => void;
}

// Функция получения иконки с использованием утилиты getConditionIconProps
const getConditionIcon = (type: string) => {
  const {iconName, size = 24} = getConditionIconProps(type);

  switch (iconName) {
    case 'CubeIcon':
      return <CubeIcon height={`${size}px`} width={`${size}px`} />;
    case 'RulerSquareIcon':
      return <RulerSquareIcon height={`${size}px`} width={`${size}px`} />;
    case 'EyeOpenIcon':
      return <EyeOpenIcon height={`${size}px`} width={`${size}px`} />;
    case 'EyeNoneIcon':
      return <EyeNoneIcon height={`${size}px`} width={`${size}px`} />;
    default:
      return null;
  }
};

// Определяем основной компонент без React.memo в начале
export const ConditionsPreview: React.FC<ConditionsPreviewProps> = ({edgeId, position, onOpenConditionModal, onClose}) => {
  const {t} = useTranslation();
  // Реф для отслеживания кликов вне компонента
  const previewRef = useRef<HTMLDivElement>(null);

  // Состояния для drag-n-drop функциональности
  const [draggingCondition, setDraggingCondition] = useState<Condition | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<'AND' | 'OR' | null>(null);
  const [dropTarget, setDropTarget] = useState<'AND' | 'OR' | null>(null);

  // Обработчик кликов вне компонента через родительский элемент
  useEffect(() => {
    // Функция обработки клика вне компонента
    const handleOutsideClick = (event: MouseEvent) => {
      // Если клик был не в окне предпросмотра
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
        // Проверяем, был ли клик внутри модального окна условий или его backdrop
        const target = event.target as HTMLElement;

        // Проверяем различные селекторы, которые могут относиться к модальному окну
        const isModalContent = target.closest('.rt-DialogContent') || target.closest('.modal_content');
        const isModalBackdrop = target.closest('[style*="backdrop-filter: blur"]') || target.closest('[style*="background: rgba(0, 0, 0, 0.3)"]');
        const isInModalForeignObject = target.closest('.modal_foreignobject') || target.closest('.modal_container');

        // Если клик был в модальном окне или его компонентах, не закрываем предпросмотр
        if (isModalContent || isModalBackdrop || isInModalForeignObject) {
          return;
        }

        // Иначе закрываем окно предпросмотра
        onClose();
      }
    };

    // Обработчик нажатия ESC
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Добавляем обработчики событий сразу же, без задержки
    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  // Get the connection data from the graph store with useMemo
  const graphStore = useGraphStore();
  const edge = useMemo(() => {
    const currentLayer = graphStore.layers[graphStore.currentGraphId];
    return currentLayer?.edges[edgeId];
  }, [graphStore, edgeId]);

  // Get variables for conditions
  const variables = useVariablesStore((state) => state.variables);
  const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  // Мемоизируем доступ к текущему слою
  const currentLayer = useMemo(() => graphStore.layers[graphStore.currentGraphId], [graphStore]);

  // Получаем все узлы из всех слоев
  const allNodes = useMemo(() => {
    const nodes = getAllNodesFromAllLayers(graphStore.layers);
    return nodes.reduce(
      (acc, node) => {
        acc[node.id] = node.node;
        return acc;
      },
      {} as Record<string, any>
    );
  }, [graphStore.layers]);

  // Локальное состояние для групп условий
  const [localConditionGroups, setLocalConditionGroups] = useState<ConditionGroup[]>([
    {id: nanoid(), operator: 'AND', conditions: []},
    {id: nanoid(), operator: 'OR', conditions: []}
  ]);

  // Получаем группы условий и обновляем локальное состояние только при изменении edge.conditions
  useEffect(() => {
    if (edge && edge.conditions) {
      const newGroups = getConditionGroups(edge.conditions);
      setLocalConditionGroups(newGroups);
    }
  }, [edge?.conditions]);

  // Получаем группы условий разных типов с useMemo
  const {localAndGroup, localOrGroup} = useMemo(() => {
    const andGroup = localConditionGroups.find((group) => group.operator === 'AND') || {id: '', operator: 'AND', conditions: []};
    const orGroup = localConditionGroups.find((group) => group.operator === 'OR') || {id: '', operator: 'OR', conditions: []};
    return {localAndGroup: andGroup, localOrGroup: orGroup};
  }, [localConditionGroups]);

  // Get text description for condition value
  const getConditionValueText = useCallback(
    (condition: Condition) => {
      switch (condition.type) {
        case 'probability':
          return `${((condition.probability || 0) * 100).toFixed(3).replace(/\.?0+$/, '')}%`;
        case 'variable_comparison': {
          const leftVar = variables.find((v) => v.id === condition.varId);
          if (!leftVar) return t('conditions_master.na', 'N/A');

          const op = getOperatorSymbol(condition.operator || 'eq');

          if (condition.valType === 'variable') {
            const rightVar = variables.find((v) => v.id === condition.comparisonVarId);
            return (
              <>
                <Badge radius='large' size='1' variant='surface' color='gray' className={styles.condition_preview_badge}>
                  <Text className={styles.text_truncate}>{leftVar.name}</Text>
                </Badge>{' '}
                {op}{' '}
                {rightVar ? (
                  <Badge radius='large' size='1' variant='surface' color='gray' className={`${styles.condition_preview_badge} ${styles.text_truncate}`}>
                    <Text className={styles.text_truncate}>{rightVar.name}</Text>
                  </Badge>
                ) : (
                  '?'
                )}
              </>
            );
          } else {
            return (
              <>
                <Badge size='1' variant='surface' color='gray' className={`${styles.condition_preview_badge} ${styles.text_truncate}`}>
                  {leftVar.name}
                </Badge>{' '}
                {op} {formatConditionValue(condition, variables)}
              </>
            );
          }
        }
        case 'node_happened':
        case 'node_not_happened': {
          // Проверяем сначала в текущем слое, затем во всех слоях
          let node = currentLayer?.nodes[condition.nodeId || ''];

          // Если узел не найден в текущем слое, ищем во всех слоях
          if (!node && condition.nodeId) {
            node = allNodes[condition.nodeId];
          }

          if (!node) return t('conditions_master.node_not_found', 'Node not found');

          // Используем утилиту для получения заголовка узла
          return getNodeTitle(node);
        }
        default:
          return 'N/A';
      }
    },
    [variables, currentLayer, allNodes, t]
  );

  // Функции для перетаскивания условий
  const handleDragStart = useCallback((condition: Condition, groupType: 'AND' | 'OR', event: React.MouseEvent) => {
    event.stopPropagation();
    setDraggingCondition(condition);
    setDraggingFrom(groupType);

    // Добавляем класс для стилизации во время перетаскивания
    document.body.classList.add('dragging-condition');
  }, []);

  const handleDragOver = useCallback((groupType: 'AND' | 'OR', event: React.DragEvent) => {
    event.preventDefault();
    setDropTarget(groupType);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingCondition(null);
    setDraggingFrom(null);
    setDropTarget(null);

    // Удаляем класс стилизации
    document.body.classList.remove('dragging-condition');
  }, []);

  // Функция для перемещения одиночного условия из OR в AND
  const checkAndConvertSingleOrCondition = useCallback((groups: ConditionGroup[]) => {
    // Получаем группы AND и OR
    const orGroup = groups.find((g) => g.operator === 'OR');
    const andGroup = groups.find((g) => g.operator === 'AND');

    // Если в группе OR только одно условие и группа AND существует,
    // перемещаем условие из OR в AND
    if (orGroup && andGroup && orGroup.conditions.length === 1) {
      const conditionToMove = orGroup.conditions[0];

      // Создаем обновленные группы
      const updatedGroups = groups.map((group) => {
        if (group.operator === 'OR') {
          // Очищаем группу OR
          return {
            ...group,
            conditions: []
          };
        }
        if (group.operator === 'AND') {
          // Добавляем условие в группу AND
          return {
            ...group,
            conditions: [...group.conditions, conditionToMove]
          };
        }
        return group;
      });

      return updatedGroups;
    }

    // Если нет необходимости в преобразовании, возвращаем исходные группы
    return groups;
  }, []);

  const handleDrop = useCallback(
    (targetGroupType: 'AND' | 'OR', event: React.DragEvent) => {
      event.preventDefault();

      if (draggingCondition && draggingFrom && draggingFrom !== targetGroupType) {
        // Перемещаем условие между группами
        const sourceGroup = draggingFrom === 'AND' ? localAndGroup : localOrGroup;
        const targetGroup = targetGroupType === 'AND' ? localAndGroup : localOrGroup;

        // Удаляем условие из исходной группы
        const updatedSourceGroup = {
          ...sourceGroup,
          conditions: sourceGroup.conditions.filter((c) => c.id !== draggingCondition.id)
        };

        // Добавляем условие в целевую группу
        const updatedTargetGroup = {
          ...targetGroup,
          conditions: [...targetGroup.conditions, draggingCondition]
        };

        // Обновляем группы условий
        let updatedGroups = localConditionGroups.map((group) => {
          if (group.operator === draggingFrom) return updatedSourceGroup;
          if (group.operator === targetGroupType) return updatedTargetGroup;
          return group;
        });

        // Проверяем, не осталось ли в группе OR только одно условие
        updatedGroups = checkAndConvertSingleOrCondition(updatedGroups);

        // Обновляем локальное состояние сразу
        setLocalConditionGroups(updatedGroups);

        // Используем CommandManager для обновления в хранилище
        requestAnimationFrame(() => {
          getCommandManager().updateEdgeConditions(edgeId, updatedGroups);
        });
      }

      // Сбрасываем состояние перетаскивания
      handleDragEnd();
    },
    [draggingCondition, draggingFrom, localAndGroup, localOrGroup, localConditionGroups, edgeId, handleDragEnd, checkAndConvertSingleOrCondition]
  );

  // Handle condition deletion (for both AND and OR groups)
  const handleDeleteCondition = useCallback(
    (conditionId: string, groupType: 'AND' | 'OR', event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (!edge) return;

      const group = groupType === 'AND' ? localAndGroup : localOrGroup;
      if (!group) return;

      // Трекаем событие удаления условия
      trackConditionDelete('preview', projectId, timelineId);

      // Filter out the condition to be deleted from the group
      const updatedGroup = {
        ...group,
        conditions: group.conditions.filter((c) => c.id !== conditionId)
      };

      // Create a copy of the groups array and update the appropriate group
      let updatedGroups = localConditionGroups.map((g) => {
        if (g.operator === groupType) return updatedGroup;
        return g;
      });

      // Проверяем, не осталось ли в группе OR только одно условие
      updatedGroups = checkAndConvertSingleOrCondition(updatedGroups);

      // Обновляем локальное состояние сразу
      setLocalConditionGroups(updatedGroups);

      // Используем CommandManager для обновления в хранилище
      // Используем requestAnimationFrame, чтобы сначала обновился UI
      requestAnimationFrame(() => {
        getCommandManager().updateEdgeConditions(edgeId, updatedGroups);
      });
    },
    [edge, localAndGroup, localOrGroup, localConditionGroups, edgeId, checkAndConvertSingleOrCondition]
  );

  // Обработчик для редактирования условия
  const handleEditCondition = useCallback(
    (condition: Condition) => {
      // Проверяем, что функция onOpenConditionModal доступна
      if (typeof onOpenConditionModal === 'function') {
        // Важно: не вызываем onClose() здесь, чтобы окно предпросмотра
        // не закрывалось при редактировании существующего условия
        onOpenConditionModal(undefined, condition);
      }
    },
    [onOpenConditionModal]
  );

  // Обработчик изменения оператора (конвертация AND -> OR и наоборот)
  const handleChangeOperator = useCallback(
    (condition1: Condition, condition2: Condition, currentOperator: 'AND' | 'OR') => {
      // Обновляем локальное состояние
      let updatedGroups = [...localConditionGroups];

      // Проверяем, в каких группах находятся условия
      const condition1InAnd = localAndGroup.conditions.some((c) => c.id === condition1.id);
      const condition2InAnd = localAndGroup.conditions.some((c) => c.id === condition2.id);
      const condition1InOr = localOrGroup.conditions.some((c) => c.id === condition1.id);
      const condition2InOr = localOrGroup.conditions.some((c) => c.id === condition2.id);

      // Частный случай: условия в разных группах (между AND и OR)
      if ((condition1InAnd && condition2InOr) || (condition1InOr && condition2InAnd)) {
        if (currentOperator === 'AND') {
          // Случай между группами AND->OR: перемещаем AND условие в OR
          if (condition1InAnd && condition2InOr) {
            // Удаляем условие из группы AND
            const updatedAndGroup = {
              ...localAndGroup,
              conditions: localAndGroup.conditions.filter((c) => c.id !== condition1.id)
            };

            // Перемещаем условие в начало массива OR
            const updatedOrGroup = {
              ...localOrGroup,
              conditions: [condition1, ...localOrGroup.conditions]
            };

            updatedGroups = updatedGroups.map((group) => {
              if (group.operator === 'AND') return updatedAndGroup;
              if (group.operator === 'OR') return updatedOrGroup;
              return group;
            });
          }
        } else if (currentOperator === 'OR') {
          // Случай между группами OR->AND: перемещаем OR условие в AND
          if (condition1InOr && condition2InAnd) {
            // Удаляем условие из группы OR
            const updatedOrGroup = {
              ...localOrGroup,
              conditions: localOrGroup.conditions.filter((c) => c.id !== condition1.id)
            };

            // Добавляем условие в конец массива AND
            const updatedAndGroup = {
              ...localAndGroup,
              conditions: [...localAndGroup.conditions, condition1]
            };

            updatedGroups = updatedGroups.map((group) => {
              if (group.operator === 'OR') return updatedOrGroup;
              if (group.operator === 'AND') return updatedAndGroup;
              return group;
            });
          }
        }
      }
      // Обычный случай: оба условия в одной группе
      else if (currentOperator === 'AND' && condition1InAnd && condition2InAnd) {
        // Перемещаем условия из AND в OR
        const andConditions = localAndGroup.conditions.filter((c) => c.id !== condition1.id && c.id !== condition2.id);

        const updatedAndGroup = {
          ...localAndGroup,
          conditions: andConditions
        };

        const updatedOrGroup = {
          ...localOrGroup,
          conditions: [...localOrGroup.conditions, condition1, condition2]
        };

        updatedGroups = updatedGroups.map((group) => {
          if (group.operator === 'AND') return updatedAndGroup;
          if (group.operator === 'OR') return updatedOrGroup;
          return group;
        });
      } else if (currentOperator === 'OR' && condition1InOr && condition2InOr) {
        // Перемещаем условия из OR в AND
        const orConditions = localOrGroup.conditions.filter((c) => c.id !== condition1.id && c.id !== condition2.id);

        const updatedOrGroup = {
          ...localOrGroup,
          conditions: orConditions
        };

        const updatedAndGroup = {
          ...localAndGroup,
          conditions: [...localAndGroup.conditions, condition1, condition2]
        };

        updatedGroups = updatedGroups.map((group) => {
          if (group.operator === 'OR') return updatedOrGroup;
          if (group.operator === 'AND') return updatedAndGroup;
          return group;
        });
      } else {
        // Не делаем обновлений, если неожиданная ситуация
        return;
      }

      // Проверяем, не осталось ли в группе OR только одно условие
      updatedGroups = checkAndConvertSingleOrCondition(updatedGroups);

      // Обновляем локальное состояние
      setLocalConditionGroups(updatedGroups);

      // Используем CommandManager для обновления в хранилище
      requestAnimationFrame(() => {
        getCommandManager().updateEdgeConditions(edgeId, updatedGroups);
      });
    },
    [localConditionGroups, localAndGroup, localOrGroup, edgeId, checkAndConvertSingleOrCondition]
  );

  // Обработчик для добавления нового условия
  const handleAddCondition = useCallback(
    (conditionType: 'AND' | 'OR') => {
      if (typeof onOpenConditionModal === 'function') {
        // Важно: не вызываем onClose() здесь, чтобы окно предпросмотра
        // не закрывалось при открытии окна добавления условий
        onOpenConditionModal(conditionType);
      }
    },
    [onOpenConditionModal]
  );

  // Компонент для карточки условия
  const ConditionCard = React.memo(({condition, groupType, isBeingDragged}: {condition: Condition; groupType: 'AND' | 'OR'; isBeingDragged: boolean}) => {
    // Для устранения необходимости предварительного клика перед перетаскиванием
    // используем mousedown для сохранения drag-and-drop поведения
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        // Проверяем, что клик был не на кнопке удаления
        if ((e.target as HTMLElement).closest('.' + styles.delete_condition_button)) {
          return;
        }

        // Если пользователь начинает перетаскивание (нажал кнопку мыши и начал движение),
        // запускаем перетаскивание напрямую
        const handleMouseMove = (moveEvent: MouseEvent) => {
          // Убираем слушатели, так как мы уже решили, что пользователь хочет перетаскивать
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);

          // Вызываем обработчик начала перетаскивания
          handleDragStart(condition, groupType, e);
        };

        // Если пользователь просто кликнул (нажал и отпустил без движения),
        // обрабатываем как обычный клик
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        // Добавляем временные слушатели для отслеживания движения
        document.addEventListener('mousemove', handleMouseMove, {once: true});
        document.addEventListener('mouseup', handleMouseUp, {once: true});
      },
      [condition, groupType]
    );

    // Перехватываем обычное поведение dragstart элемента,
    // чтобы использовать наш собственный обработчик
    const handleDragStartNative = useCallback(
      (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', condition.id);
        handleDragStart(condition, groupType, e as any);
      },
      [condition, groupType]
    );

    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        // Если клик был на кнопке удаления, не открываем редактирование
        if ((e.target as HTMLElement).closest('.' + styles.delete_condition_button)) {
          return;
        }

        // Вызываем редактирование условия
        handleEditCondition(condition);
      },
      [condition]
    );

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        handleDeleteCondition(condition.id, groupType, e);
      },
      [condition.id, groupType]
    );

    return (
      <Card
        draggable={true}
        onDragStart={handleDragStartNative}
        onDragEnd={handleDragEnd}
        onMouseDown={handleMouseDown}
        className={styles.condition_card}
        style={{
          opacity: isBeingDragged ? 0.5 : 1,
          cursor: 'grab'
        }}
        onClick={handleCardClick}
      >
        <Flex gap='10px' align='center' style={{width: '80%'}}>
          <Box className={styles.condition_icon_container}>{getConditionIcon(condition.type)}</Box>
          <Text size='2' className={styles.text_truncate}>
            {getConditionValueText(condition)}
          </Text>
        </Flex>

        <IconButton size='1' variant='ghost' color='crimson' className={styles.delete_condition_button} onClick={handleDelete}>
          <TrashIcon className={styles.trash_icon} />
        </IconButton>
      </Card>
    );
  });

  // Сохраняем displayName для React DevTools
  ConditionCard.displayName = 'ConditionCard';

  // Компонент для кнопки-оператора
  const OperatorButton = React.memo(({text, operatorType, onClick}: {text: string; operatorType: 'AND' | 'OR'; onClick: () => void}) => (
    <div className={styles.operator_button_container}>
      <button onClick={onClick} className={styles.operator_button}>
        {text}
      </button>
      <Text size='1' color='gray' className={styles.operator_hint} style={{fontStyle: 'italic', textAlign: 'center', width: '100%', display: 'block'}}>
        {operatorType === 'AND' ? t('conditions_master.click_to_switch_or', 'Click to switch to OR') : t('conditions_master.click_to_switch_and', 'Click to switch to AND')}
      </Text>
    </div>
  ));

  OperatorButton.displayName = 'OperatorButton';

  // Компонент для кнопки добавления условия
  const AddConditionButton = React.memo(({onClick, operatorType, isFirstCondition = false}: {onClick: () => void; operatorType: 'AND' | 'OR'; isFirstCondition?: boolean}) => {
    const handleButtonClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      },
      [onClick]
    );

    return (
      <Button variant='soft' size='2' color='indigo' onClick={handleButtonClick} className={isFirstCondition ? styles.add_first_condition_button : styles.add_condition_button}>
        <Box className={styles.button_icon_container}>
          <PlusIcon />
        </Box>
        {isFirstCondition
          ? t('conditions_dialog.add_condition_button', 'Add first condition')
          : operatorType === 'AND'
            ? t('conditions_master.add_new_and', 'Add new "AND" condition')
            : t('conditions_master.add_new_or', 'Add new "OR" condition')}
      </Button>
    );
  });

  AddConditionButton.displayName = 'AddConditionButton';

  // Компонент для промежуточной кнопки-оператора
  const IntermediateOperatorButton = React.memo(({text, operatorType, onClick}: {text: string; operatorType: 'AND' | 'OR'; onClick: () => void}) => (
    <div className={styles.intermediate_operator_button_container}>
      <button onClick={onClick} className={styles.intermediate_operator_button}>
        {text}
      </button>
      <Text size='1' color='gray' className={styles.operator_hint} style={{fontStyle: 'italic', textAlign: 'center', width: '100%', display: 'block'}}>
        {operatorType === 'AND' ? t('conditions_master.click_to_switch_or', 'Click to switch to OR') : t('conditions_master.click_to_switch_and', 'Click to switch to AND')}
      </Text>
    </div>
  ));

  IntermediateOperatorButton.displayName = 'IntermediateOperatorButton';

  // Стили для контейнера с useMemo
  const containerStyle = useMemo(
    () => ({
      left: `${position.x}px`,
      top: `${position.y}px`
    }),
    [position.x, position.y]
  );

  // Мемоизируем обработчики для AND группы
  const handleAndDragOver = useCallback((e: React.DragEvent) => handleDragOver('AND', e), [handleDragOver]);
  const handleAndDrop = useCallback((e: React.DragEvent) => handleDrop('AND', e), [handleDrop]);
  const handleAddAndCondition = useCallback(() => handleAddCondition('AND'), [handleAddCondition]);

  // Мемоизируем обработчики для OR группы
  const handleOrDragOver = useCallback((e: React.DragEvent) => handleDragOver('OR', e), [handleDragOver]);
  const handleOrDrop = useCallback((e: React.DragEvent) => handleDrop('OR', e), [handleDrop]);
  const handleAddOrCondition = useCallback(() => handleAddCondition('OR'), [handleAddCondition]);

  // ВАЖНО: перемещаем проверку edge ПОСЛЕ объявления всех хуков
  // React требует, чтобы хуки всегда вызывались в одном и том же порядке
  if (!edge) {
    return null;
  }

  // Отрисовка содержимого с фиксированными размерами и позиционированием
  return (
    <div ref={previewRef} className={styles.conditions_preview_container} style={containerStyle} onClick={(e) => e.stopPropagation()}>
      {/* Если нет никаких условий, показываем текст с кнопкой добавления первого условия */}
      {localAndGroup.conditions.length === 0 && localOrGroup.conditions.length === 0 ? (
        <>
          <Box className={styles.empty_container}>
            <Text size='2' weight='medium'>
              {t('conditions_dialog.no_conditions_hint', 'There is no conditions')}
            </Text>
          </Box>

          <AddConditionButton onClick={handleAddAndCondition} operatorType='AND' isFirstCondition />
        </>
      ) : (
        <Flex direction='column' gap='12px' width='100%'>
          {/* Список всех условий с AND */}
          {localAndGroup.conditions.length > 0 && (
            <>
              <div className={`${dropTarget === 'AND' ? 'drop-target' : ''} ${styles.and_conditions_container}`} onDragOver={handleAndDragOver} onDragLeave={handleDragLeave} onDrop={handleAndDrop}>
                {localAndGroup.conditions.map((condition, index) => {
                  const handleOperatorClick = () => {
                    if (index + 1 < localAndGroup.conditions.length) {
                      handleChangeOperator(condition, localAndGroup.conditions[index + 1], 'AND');
                    }
                  };

                  return (
                    <React.Fragment key={condition.id}>
                      <ConditionCard condition={condition} groupType='AND' isBeingDragged={draggingCondition?.id === condition.id} />

                      {/* Оператор AND между условиями */}
                      {index < localAndGroup.conditions.length - 1 && <OperatorButton text={t('conditions_master.and', 'AND')} operatorType='AND' onClick={handleOperatorClick} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          )}

          {/* Бейдж AND между последним условием из AND-группы и OR-контейнером */}
          {localAndGroup.conditions.length > 0 && localOrGroup.conditions.length > 0 && (
            <IntermediateOperatorButton
              text={t('conditions_master.and', 'AND')}
              operatorType='AND'
              onClick={() => {
                if (localAndGroup.conditions.length > 0 && localOrGroup.conditions.length > 0) {
                  // Берем последнее условие из AND-группы и первое условие из OR-группы
                  const lastAndCondition = localAndGroup.conditions[localAndGroup.conditions.length - 1];
                  const firstOrCondition = localOrGroup.conditions[0];

                  // Используем AND как текущий оператор (чтобы поменять на OR)
                  handleChangeOperator(lastAndCondition, firstOrCondition, 'AND');
                }
              }}
            />
          )}

          {/* OR Conditions Section - только если есть условия OR */}
          {localOrGroup.conditions.length > 0 && (
            <div className={`${styles.or_conditions_container} ${dropTarget === 'OR' ? 'drop-target' : ''}`} onDragOver={handleOrDragOver} onDragLeave={handleDragLeave} onDrop={handleOrDrop}>
              {localOrGroup.conditions.map((condition, index) => {
                const handleOperatorClick = () => {
                  if (index + 1 < localOrGroup.conditions.length) {
                    handleChangeOperator(condition, localOrGroup.conditions[index + 1], 'OR');
                  }
                };

                return (
                  <React.Fragment key={condition.id}>
                    <ConditionCard condition={condition} groupType='OR' isBeingDragged={draggingCondition?.id === condition.id} />

                    {/* Оператор OR между условиями */}
                    {index < localOrGroup.conditions.length - 1 && <OperatorButton text={t('conditions_master.or', 'OR')} operatorType='OR' onClick={handleOperatorClick} />}
                  </React.Fragment>
                );
              })}

              {/* Кнопка добавления нового OR условия */}
              <AddConditionButton onClick={handleAddOrCondition} operatorType='OR' />
            </div>
          )}

          {/* Добавляем возможность перетаскивания в AND группу */}
          <div className={`${dropTarget === 'AND' ? 'drop-target' : ''}`} onDragOver={handleAndDragOver} onDragLeave={handleDragLeave} onDrop={handleAndDrop}>
            {/* Кнопка добавления нового AND условия */}
            <AddConditionButton onClick={handleAddAndCondition} operatorType='AND' />
          </div>
        </Flex>
      )}
    </div>
  );
};

// Устанавливаем displayName для React DevTools
ConditionsPreview.displayName = 'ConditionsPreview';

// Экспортируем компонент по умолчанию, обернутый в React.memo
export default React.memo(ConditionsPreview);
