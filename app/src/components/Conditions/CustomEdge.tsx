'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {ExclamationTriangleIcon, PlusIcon} from '@radix-ui/react-icons';
import {Button, ContextMenu, Text} from '@radix-ui/themes';
import {EdgeProps, getBezierPath, useReactFlow} from '@xyflow/react';
import {nanoid} from 'nanoid';
import {useTranslation} from 'react-i18next';

import {getCommandManager} from '../../commands/CommandManager';
import {useEditorSettingsStore} from '../../store/useEditorSettingsStore';
import {useToolStore} from '../../store/useToolsStore';
import {useVariablesStore} from '../../store/useVariablesStore';
import {Condition, ConditionGroup} from '../../types/nodes';
import {getColorScheme} from '../../utils/colorSchemes';
import {getConditionGroups} from '../../utils/conditionUtils';
import {hasErrorsForEdge, validateGraph} from '../../utils/conditionValidator';
import {ConditionModal} from './ConditionModal';
import {EdgeConditionBadge} from './EdgeConditionBadge';

import styles from './Conditions.module.scss';

const CustomEdgeComponent: React.FC<EdgeProps> = ({id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, style = {}, markerEnd, data}) => {
  const {t} = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isWarningHovered, setIsWarningHovered] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{x: number; y: number} | null>(null);
  const [conditionType, setConditionType] = useState<'AND' | 'OR'>('AND');
  const [activeGroupType, setActiveGroupType] = useState<'AND' | 'OR'>('AND');
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
  const [hasError, setHasError] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null); // Реф для доступа к элементу предпросмотра

  // Get tool state to determine if we're in edit mode
  const activeTool = useToolStore((state) => state.activeTool);
  const isEditable = activeTool === 'cursor';

  // Get variables for conditions
  const variables = useVariablesStore((state) => state.variables);

  // Получаем настройки редактора
  const linkThickness = useEditorSettingsStore((state) => state.linkThickness);
  const canvasColor = useEditorSettingsStore((state) => state.canvasColor);
  const linkStyle = useEditorSettingsStore((state) => state.linkStyle);

  // Получаем цветовую схему на основе выбранного цвета холста
  const colorScheme = useMemo(() => getColorScheme(canvasColor), [canvasColor]);

  // Проверяем корректно типы данных для условий
  const edgeData = data as {conditions?: ConditionGroup[]} | undefined;
  const hasCondition = edgeData?.conditions && edgeData.conditions.length > 0 && edgeData.conditions.some((group) => group.conditions && group.conditions.length > 0);

  // Get React Go Flow instance to access edges for validation
  const reactFlow = useReactFlow();

  // Мемоизируем результаты вычислений для валидации
  const edges = useMemo(() => reactFlow.getEdges(), [reactFlow]);

  const nodes = useMemo(() => {
    return reactFlow.getNodes().reduce(
      (acc, node) => {
        acc[node.id] = node;
        return acc;
      },
      {} as Record<string, any>
    );
  }, [reactFlow]);

  const outgoingEdgesCount = useMemo(
    () =>
      edges.filter((edge) => {
        // Используем sourceHandle, если оно есть, иначе source
        const edgeSource = 'sourceHandle' in edge ? (edge as any).sourceHandle : edge.source;
        return edgeSource === source;
      }).length,
    [edges, source]
  );

  const hasMultipleOutgoingEdges = outgoingEdgesCount > 1;

  // Проверяем, должна ли анимироваться эта связь (значение предвычислено в Canvas)
  const isConnectedToSelectedNode = useMemo(() => {
    return Boolean(data?.shouldAnimate);
  }, [data?.shouldAnimate]);

  // Проверяем, должна ли быть полупрозрачной эта связь (режим фокусировки)
  const shouldBeFaded = useMemo(() => {
    return Boolean(data?.shouldBeFaded);
  }, [data?.shouldBeFaded]);

  // Получаем путь для отрисовки линии (мемоизируем результат)
  const pathData = useMemo(
    () =>
      getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
      }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  );

  const [edgePath, labelX, labelY] = pathData;

  // Вычисляем позицию для бейджа условий (по центру связи)
  const conditionBadgeX = labelX;
  const conditionBadgeY = labelY;

  // Validate conditions on mount and when edges/nodes change
  useEffect(() => {
    // Validate the graph
    const validationResult = validateGraph(nodes, edges);

    // Check if this edge has errors
    const currentEdgeHasError = hasErrorsForEdge(id, validationResult);

    setHasError(currentEdgeHasError);
  }, [id, nodes, edges, hasCondition]);

  // Определяем базовую толщину связи в зависимости от настройки
  const baseThickness = useMemo(() => {
    switch (linkThickness) {
      case 'thin':
        return 1.5;
      case 'regular':
        return 2.5;
      case 'thick':
        return 3.5;
      default:
        return 1.5;
    }
  }, [linkThickness]);

  // Определяем паттерн штриховки в зависимости от толщины
  const dashPattern = useMemo(() => {
    switch (linkThickness) {
      case 'thin':
        return '6 5';
      case 'regular':
        return '8 6';
      case 'thick':
        return '10 7';
      default:
        return '6 5';
    }
  }, [linkThickness]);

  // Стиль связи
  const edgeStyle = useMemo(() => {
    // Цвета из цветовой схемы
    const normalColor = colorScheme.edgeColors.normal;
    const selectedColor = colorScheme.edgeColors.selected;
    const tempColor = colorScheme.edgeColors.temp;

    // Для выбранных связей увеличиваем толщину
    const selectedThickness = baseThickness + 0.5;

    // Определяем стиль линии на основе настройки и условий
    let dashStyle = 'none';

    // Если связь НЕ анимированная, но выбран dash стиль
    if (!isConnectedToSelectedNode && linkStyle === 'dash') {
      // Используем обычную пунктирную линию
      dashStyle = dashPattern;
    }
    // Для анимированных связей dashStyle останется 'none',
    // так как stroke-dasharray устанавливается через CSS класс

    return {
      stroke: selected ? selectedColor : normalColor,
      strokeWidth: selected ? selectedThickness : baseThickness,
      strokeDasharray: dashStyle,
      opacity: shouldBeFaded ? 0.3 : 1,
      ...style
    };
  }, [selected, hasCondition, hasMultipleOutgoingEdges, style, baseThickness, dashPattern, colorScheme, linkStyle, isConnectedToSelectedNode, shouldBeFaded]);

  // Расширенный путь для области ховера (с большей шириной) - мемоизируем результат
  const hoverPath = useMemo(
    () =>
      getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
      })[0],
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  );

  // Обработчик наведения мыши
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // Обработчик ухода мыши
  const handleMouseLeave = useCallback(() => {
    // Если курсор над кнопкой, то не скрываем кнопку
    if (!isButtonHovered) {
      // Возвращаем таймаут, но уменьшаем его до минимума
      setTimeout(() => {
        setIsHovered(false);
      }, 10);
    }
  }, [isButtonHovered]);

  // Обработчики для кнопки
  const handleButtonMouseEnter = useCallback(() => {
    setIsButtonHovered(true);
    setIsHovered(true); // Убеждаемся, что кнопка видима
  }, []);

  const handleButtonMouseLeave = useCallback(() => {
    setIsButtonHovered(false);
    // Даем небольшую задержку перед скрытием кнопки
    setTimeout(() => {
      if (!isHovered) {
        setIsHovered(false);
      }
    }, 100);
  }, [isHovered]);

  // Обработчик клика на видимой линии связи
  const handleEdgeClick = useCallback(
    (event: React.MouseEvent<SVGPathElement, MouseEvent>) => {
      // Останавливаем всплытие события для предотвращения выбора других элементов
      event.stopPropagation();

      // Выбираем эту связь в React Go Flow
      const edge = reactFlow.getEdge(id);
      if (edge) {
        reactFlow.setEdges(
          reactFlow.getEdges().map((e) => ({
            ...e,
            selected: e.id === id
          }))
        );
      }
    },
    [reactFlow, id]
  );

  // Обработчик клика на невидимой области ховера
  const handleHoverPathClick = useCallback(
    (event: React.MouseEvent<SVGPathElement, MouseEvent>) => {
      // Не выбираем связь, если курсор находится над кнопкой добавления условий
      // или над иконкой предупреждения
      if (isButtonHovered || isWarningHovered) {
        // Останавливаем всплытие, но не выбираем связь
        event.stopPropagation();
        return;
      }

      // В противном случае, вызываем обычный обработчик клика на связи
      handleEdgeClick(event);
    },
    [isButtonHovered, isWarningHovered, handleEdgeClick]
  );

  // Модифицируем функцию открытия окна предпросмотра
  const handleOpenPreview = useCallback(() => {
    // Снимаем выделение со всех связей перед открытием предпросмотра
    // Применяем более безопасный способ обновления, чтобы избежать бесконечного цикла
    reactFlow.setEdges((edges) =>
      edges.map((e) => ({
        ...e,
        selected: false
      }))
    );

    // Передаем просто координаты центра связи без корректировок
    const edgeCenter = {
      x: labelX,
      y: labelY
    };

    // Используем глобальную функцию для отображения окна предпросмотра через оверлей
    if (window.goflow && window.goflow.showConditionsPreview) {
      window.goflow.showConditionsPreview({
        position: edgeCenter,
        edgeId: id,
        onOpenConditionModal: handleOpenConditionModal
      });
    } else {
      // Fallback для обратной совместимости - устанавливаем состояние напрямую
      setIsPreviewOpen(true);
    }
  }, [reactFlow, labelX, labelY, id]);

  // Упростим и мемоизируем функцию handleButtonClick
  const handleButtonClick = useCallback(
    (event: React.MouseEvent) => {
      // Останавливаем всплытие, чтобы не сработал клик на линии связи
      event.stopPropagation();
      event.preventDefault();

      // Открываем модальное окно с условиями
      handleOpenPreview();
    },
    [handleOpenPreview]
  );

  // Обработчик открытия окна для добавления нового условия
  const handleOpenConditionModal = useCallback(
    (conditionType?: 'AND' | 'OR', existingCondition?: Condition) => {
      // Если доступна новая глобальная функция, используем ее
      if (window.goflow && window.goflow.openConditionModal) {
        const edgeCenter = {
          x: labelX,
          y: labelY
        };

        window.goflow.openConditionModal({
          edgeId: id,
          position: edgeCenter,
          conditionType,
          existingCondition
        });
      } else {
        // Используем старую логику как fallback
        // Сначала устанавливаем настройки для модального окна
        if (existingCondition) {
          // Режим редактирования условия
          setEditingCondition(existingCondition);
          setActiveGroupType('AND'); // Не важно для редактирования
        } else {
          // Режим добавления нового условия
          setEditingCondition(null);

          // Устанавливаем тип условия, по умолчанию 'AND'
          const typeToUse = conditionType || 'AND';
          setConditionType(typeToUse);
          setActiveGroupType(typeToUse);
        }

        // Открываем модальное окно без задержки, так как больше не закрываем предпросмотр
        setIsConditionModalOpen(true);
      }
    },
    [labelX, labelY, id]
  );
  // Определяем, можно ли добавлять условия на эту связь
  // Разрешаем добавление условий на любые связи, кроме единственной исходящей связи от узла
  const canAddConditions = isEditable && (hasMultipleOutgoingEdges || hasCondition);

  // Нужно ли показывать кнопку добавления условий при наведении
  // (для любых ребер, кроме единственной исходящей связи)
  const shouldShowAddButton = canAddConditions && (isHovered || isButtonHovered);

  // Показывать предупреждение только если это ребро имеет ошибку валидации
  // но не показывать, если пользователь навел мышь и видит кнопку добавления
  const shouldShowErrorWarning = hasError && !(isHovered || isButtonHovered);

  // Позволяем просматривать/редактировать условия на любой связи, у которой есть условия,
  // или на любой связи, кроме единственной исходящей
  const canManageConditions = hasCondition || hasMultipleOutgoingEdges;

  // Обработчики для кнопки предупреждения
  const handleWarningMouseEnter = useCallback(() => {
    setIsWarningHovered(true);
  }, []);

  const handleWarningMouseLeave = useCallback(() => {
    setIsWarningHovered(false);
  }, []);

  // Обработчик для открытия окна предпросмотра условий
  const handleOpenConditionPreview = useCallback(
    (e: React.MouseEvent) => {
      // Останавливаем всплытие события
      e.stopPropagation();
      e.preventDefault();

      // Открываем окно предпросмотра
      handleOpenPreview();
    },
    [handleOpenPreview]
  );

  // Обработчик клика вне модального окна
  const handleOutsideClick = useCallback(
    (event: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
        setIsPreviewOpen(false);
      }
    },
    [previewRef]
  );

  // Обработчик нажатия клавиши Escape
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsPreviewOpen(false);
    }
  }, []);

  // Настройка обработчиков для закрытия окна
  useEffect(() => {
    if (isPreviewOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);

      // Блокируем взаимодействие с графом под окном
      document.body.style.pointerEvents = 'auto';
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);

      // Восстанавливаем взаимодействие с графом
      document.body.style.pointerEvents = '';
    };
  }, [isPreviewOpen, handleOutsideClick, handleEscapeKey]);

  // Расчет оптимальной позиции для окна предпросмотра
  // чтобы оно не выходило за границы экрана
  const getPreviewPosition = () => {
    // Размеры окна предпросмотра
    const previewWidth = 340;
    const previewHeight = 400;

    // Получаем размеры viewport и графа
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    const viewportWidth = reactFlowBounds?.width || window.innerWidth;
    const viewportHeight = reactFlowBounds?.height || window.innerHeight;

    // Расчет начальной позиции (по центру связи)
    let x = labelX - previewWidth / 2;
    let y = labelY - 220; // Выше линии связи

    // Отступы от края
    const padding = 20;

    // Проверяем и корректируем позицию по горизонтали
    if (x < padding) {
      x = padding;
    } else if (x + previewWidth > viewportWidth - padding) {
      x = viewportWidth - previewWidth - padding;
    }

    // Проверяем и корректируем позицию по вертикали
    if (y < padding) {
      y = padding;
    } else if (y + previewHeight > viewportHeight - padding) {
      y = viewportHeight - previewHeight - padding;
    }

    return {x, y};
  };

  // Обработчик правого клика для контекстного меню
  const handleContextMenu = useCallback((event: React.MouseEvent<SVGPathElement, MouseEvent>) => {
    event.preventDefault();
    event.stopPropagation();

    // Получаем позицию для контекстного меню
    setMenuPosition({
      x: event.clientX,
      y: event.clientY
    });
  }, []);

  // Обработчик закрытия контекстного меню
  const handleCloseMenu = useCallback(() => {
    setMenuPosition(null);
  }, []);

  // Обработчик, который выбирает правильную функцию в зависимости от контекста
  const handleAddCondition = useCallback(
    (condition: Condition) => {
      // Скрываем модальное окно
      setIsConditionModalOpen(false);

      // Проверяем, редактируем ли мы существующее условие
      if (editingCondition) {
        // Режим редактирования
        const commandManager = getCommandManager();
        const conditionGroups = getConditionGroups(edgeData?.conditions || []);

        let found = false;
        let updatedGroups = [...conditionGroups];

        // Ищем и обновляем существующее условие в группах
        updatedGroups = updatedGroups.map((group) => {
          const condIndex = group.conditions.findIndex((c) => c.id === editingCondition.id);

          if (condIndex !== -1) {
            found = true;
            const updatedConditions = [...group.conditions];
            updatedConditions[condIndex] = condition;

            return {
              ...group,
              conditions: updatedConditions
            };
          }

          return group;
        });

        if (found) {
          // Обновляем условия на ребре
          commandManager.updateEdgeConditions(id, updatedGroups);
          setEditingCondition(null);
        }

        return;
      }

      // Добавляем новое условие
      const commandManager = getCommandManager();
      const conditionGroups = getConditionGroups(edgeData?.conditions || []);
      const updatedGroups = [...conditionGroups];

      // Добавляем условие в соответствующую группу
      if (activeGroupType === 'AND') {
        const andGroup = updatedGroups.find((group) => group.operator === 'AND');

        if (andGroup) {
          // Добавляем условие в существующую AND группу
          const andGroupIndex = updatedGroups.findIndex((group) => group.operator === 'AND');
          updatedGroups[andGroupIndex] = {
            ...updatedGroups[andGroupIndex],
            conditions: [...updatedGroups[andGroupIndex].conditions, condition]
          };
        } else {
          // Создаем новую AND группу
          const newGroup: ConditionGroup = {
            id: nanoid(),
            operator: 'AND',
            conditions: [condition]
          };
          updatedGroups.push(newGroup);
        }
      } else {
        const orGroup = updatedGroups.find((group) => group.operator === 'OR');

        if (orGroup) {
          // Добавляем условие в существующую OR группу
          const orGroupIndex = updatedGroups.findIndex((group) => group.operator === 'OR');
          updatedGroups[orGroupIndex] = {
            ...updatedGroups[orGroupIndex],
            conditions: [...updatedGroups[orGroupIndex].conditions, condition]
          };
        } else {
          // Создаем новую OR группу
          const newGroup: ConditionGroup = {
            id: nanoid(),
            operator: 'OR',
            conditions: [condition]
          };
          updatedGroups.push(newGroup);
        }
      }

      // Обновляем условия на ребре
      commandManager.updateEdgeConditions(id, updatedGroups);

      // Сбрасываем состояние
      setEditingCondition(null);
    },
    [activeGroupType, id, edgeData, editingCondition]
  );

  // Обработчик удаления условия при редактировании
  const handleDeleteCondition = useCallback(
    (condition: Condition) => {
      if (!edgeData || !condition) return;

      // Находим группу, содержащую условие
      const conditionGroups = getConditionGroups(edgeData.conditions);

      // Ищем условие во всех группах
      for (const group of conditionGroups) {
        const conditionIndex = group.conditions.findIndex((c) => c.id === condition.id);

        if (conditionIndex !== -1) {
          // Нашли условие - удаляем его из группы
          const updatedGroup = {
            ...group,
            conditions: group.conditions.filter((c) => c.id !== condition.id)
          };

          // Обновляем группы условий
          const updatedGroups = conditionGroups.map((g) => (g.operator === group.operator ? updatedGroup : g));

          // Обновляем в хранилище
          getCommandManager().updateEdgeConditions(id, updatedGroups);

          // Закрываем только модальное окно, но не окно предпросмотра
          setIsConditionModalOpen(false);
          setEditingCondition(null);
          break;
        }
      }
    },
    [edgeData, id]
  );

  return (
    <>
      {/* Видимая линия связи */}
      <path
        id={id}
        className={`react-flow__edge-path ${isConnectedToSelectedNode ? styles.animated_edge : ''}`}
        d={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
        onClick={handleEdgeClick}
        onContextMenu={handleContextMenu}
      />

      {/* Невидимая линия с увеличенной областью для ховера */}
      <path
        d={hoverPath}
        className={styles.hover_path}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleHoverPathClick}
        onContextMenu={handleContextMenu}
        // Отключаем поинтер-события, когда курсор над кнопкой
        style={{pointerEvents: isButtonHovered || isWarningHovered ? 'none' : 'auto'}}
      />

      {/* Восклицательный знак - предупреждение о проблеме с условием */}
      {shouldShowErrorWarning && (
        <foreignObject
          width={30}
          height={30}
          x={labelX - 15}
          y={labelY - 15}
          className={styles.edge_button_foreignobject}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onMouseEnter={handleWarningMouseEnter}
          onMouseLeave={handleWarningMouseLeave}
          style={{zIndex: 20}} // Высокий z-index для перекрытия
        >
          <div className={`${styles.warning_button} ${isWarningHovered ? styles.warning_button_hovered : styles.warning_button_normal}`} onClick={handleButtonClick}>
            {isWarningHovered ? <PlusIcon className={styles.warning_icon_hovered} /> : <ExclamationTriangleIcon className={styles.warning_icon_normal} />}
          </div>
        </foreignObject>
      )}

      {/* Кнопка при наведении - показывать для всех ребер, которые могут иметь условия */}
      {shouldShowAddButton && (
        <foreignObject
          width={30}
          height={30}
          x={labelX - 15}
          y={labelY - 15}
          className={styles.edge_button_foreignobject}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          style={{zIndex: 20}} // Высокий z-index для перекрытия
        >
          <Button size='1' className={`${styles.add_condition_button_container} ${hasError ? styles.add_condition_button_error : styles.add_condition_button_normal}`} onClick={handleButtonClick}>
            <PlusIcon className={hasError ? styles.add_condition_icon_error : styles.add_condition_icon_normal} />
          </Button>
        </foreignObject>
      )}

      {/* Индикатор условий */}
      {hasCondition && <EdgeConditionBadge edgeId={id} x={conditionBadgeX} y={conditionBadgeY} onClick={handleOpenConditionPreview} hasError={shouldShowErrorWarning} />}

      {/* Контекстное меню - показывать только если можно управлять условиями */}
      {menuPosition && canManageConditions && (
        <ContextMenu.Root onOpenChange={handleCloseMenu}>
          <ContextMenu.Content
            className={styles.context_menu_content}
            style={{
              left: menuPosition.x,
              top: menuPosition.y
            }}
          >
            <ContextMenu.Item onClick={handleOpenPreview}>
              <div className={styles.context_menu_item}>
                <PlusIcon />
                {t('conditions_master.manage_conditions', 'Manage Conditions')}
              </div>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      )}

      {/* Модальное окно добавления/редактирования условия */}
      {isConditionModalOpen && (
        <foreignObject width={600} height={600} x={labelX - 300} y={labelY - 300} className={styles.modal_foreignobject}>
          <div className={styles.modal_container}>
            <ConditionModal
              open={isConditionModalOpen}
              onOpenChange={(open) => setIsConditionModalOpen(open)}
              onAddCondition={handleAddCondition}
              onDeleteCondition={handleDeleteCondition}
              existingCondition={editingCondition || undefined}
              variables={variables}
              edgeId={id}
            />
          </div>
        </foreignObject>
      )}

      {/* Если нет условий, показываем заглушку и кнопку */}
      {(!edgeData?.conditions || edgeData.conditions.length === 0) && (
        <div className={styles.no_conditions_container}>
          <Text size='2' color='gray'>
            {t('conditions_dialog.no_conditions_hint', 'There is no conditions')}
          </Text>
          <Button variant='ghost' onClick={() => handleOpenConditionModal('AND')}>
            <PlusIcon /> {t('conditions_dialog.add_condition_button', 'Add first condition')}
          </Button>
        </div>
      )}
    </>
  );
};

export const CustomEdge = React.memo(CustomEdgeComponent);
