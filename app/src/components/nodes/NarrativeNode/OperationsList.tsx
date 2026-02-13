import React, {MouseEvent, useEffect, useMemo, useState} from 'react';

import {ChevronDownIcon, ChevronUpIcon, LightningBoltIcon, PlusIcon} from '@radix-ui/react-icons';
import {Button} from '@radix-ui/themes';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';
import {useOperationsStore} from '@store/useOperationsStore';

import {getCommandManager} from '../../../commands/CommandManager';
import {OperationMasterDialog} from './OperationMasterDialog';

import s from './NarrativeNode.module.scss';
import vs from './VariableStyles.module.scss';

interface OperationsListProps {
  nodeId: string;
  className?: string;
  isExpanded?: boolean;
  onExpandToggle?: (expanded: boolean) => void;
}

export const OperationsList = ({nodeId, className, isExpanded: propIsExpanded, onExpandToggle}: OperationsListProps) => {
  const {t} = useTranslation();
  // Используем состояние из пропсов, если оно передано, иначе локальное состояние
  const [localIsExpanded, setLocalIsExpanded] = useState(true);

  // Определяем, какое состояние использовать
  const isControlled = propIsExpanded !== undefined;
  const isExpanded = isControlled ? propIsExpanded : localIsExpanded;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  const {toggleOperation, toggleAllNodeOperations, getOperationParts} = useOperationsStore();
  const commandManager = getCommandManager();

  // Получаем сырые данные операций
  const rawOperations = useGraphStore((state) => {
    const layer = state.layers[state.currentGraphId];
    const node = layer?.nodes[nodeId];
    return node?.type === 'narrative' ? node.operations : undefined;
  });

  // Мемоизируем отсортированный массив операций
  const operations = useMemo(() => {
    if (rawOperations && rawOperations.length > 0) {
      return [...rawOperations].sort((a, b) => a.order - b.order);
    }
    return [];
  }, [rawOperations]);
  const hasOperations = operations.length > 0;

  // Проверяем, есть ли хотя бы одна включенная операция
  const hasEnabledOperations = hasOperations && operations.some((op) => op.enabled);

  // Обработчик предотвращения всплытия событий для контейнера операций
  const handleContainerClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  // Обработчик включения/выключения всех операций
  const handleToggleAll = (e: MouseEvent) => {
    e.stopPropagation();
    // Если есть хотя бы одна включенная операция, то выключаем все, иначе включаем все
    toggleAllNodeOperations(nodeId, !hasEnabledOperations);
  };

  // Обработчик изменения состояния раскрытия
  const handleExpandToggle = (e: MouseEvent) => {
    e.stopPropagation();
    const newExpandedState = !isExpanded;

    if (isControlled && onExpandToggle) {
      // Если компонент контролируемый, вызываем колбэк
      onExpandToggle(newExpandedState);
    } else {
      // Иначе меняем локальное состояние
      setLocalIsExpanded(newExpandedState);
    }

    // Создаем событие для обновления канваса немедленно
    // и после завершения анимации
    const animationDuration = 160; // мс, соответствует transition в CSS

    // Принудительно обновляем DOM и затем запускаем обновление соединений
    setTimeout(() => {
      // Находим родительский элемент узла
      const parentElement = document.querySelector(`[data-id="${nodeId}"]`);
      if (parentElement) {
        // Сразу обновляем для начала перерисовки
        const updateNodeEvent = new CustomEvent('updateNodeInternals', {
          detail: {nodeId}
        });
        document.dispatchEvent(updateNodeEvent);

        // Затем обновляем после окончания анимации для корректировки позиций
        setTimeout(() => {
          const finalUpdateEvent = new CustomEvent('updateNodeInternals', {
            detail: {nodeId}
          });
          document.dispatchEvent(finalUpdateEvent);
        }, animationDuration);
      }
    }, 10); // Небольшая задержка для обеспечения обновления DOM
  };

  // Обработчик открытия модального окна создания операции
  const handleOpenCreateModal = (e: MouseEvent) => {
    e.stopPropagation();
    setSelectedOperationId(null);
    setIsCreateModalOpen(true);
  };

  // Обработчик открытия модального окна редактирования операции
  const handleOpenEditModal = (e: MouseEvent, operationId: string) => {
    e.stopPropagation();
    setSelectedOperationId(operationId);
    setIsCreateModalOpen(true);
  };

  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setSelectedOperationId(null);
  };

  // Обработчик переключения состояния операции
  const handleToggleOperation = (e: MouseEvent, operationId: string) => {
    e.stopPropagation();
    toggleOperation(operationId);
  };

  // Обработчик удаления операции теперь использует CommandManager
  const handleDeleteOperation = (operationId: string, e: MouseEvent) => {
    e.stopPropagation();
    commandManager.deleteOperation(operationId);
  };

  // Рендер заголовка раздела операций
  const renderHeader = () => (
    <div className={s.operations_header} onClick={handleContainerClick}>
      <Button variant='ghost' size='1' className={cls(vs.toggle_all_button, {[vs.disabled]: !hasEnabledOperations})} onClick={handleToggleAll} disabled={!hasOperations}>
        <LightningBoltIcon width={14} height={14} />
      </Button>

      <span className={cls(s.operations_title, {[s.no_operations]: !hasOperations})} onClick={handleExpandToggle}>
        {hasOperations ? t('node_operations.title', 'Operations ({{count}})', {count: operations.length}) : t('node_operations.no_operations', 'No operations')}

        {hasOperations && (
          <Button variant='ghost' size='1' className={s.collapse_button}>
            {isExpanded ? <ChevronUpIcon width={10} height={10} /> : <ChevronDownIcon width={10} height={10} />}
          </Button>
        )}
      </span>

      <Button variant='ghost' size='1' className={s.add_operation_button} onClick={handleOpenCreateModal}>
        <PlusIcon />
      </Button>
    </div>
  );

  // Рендер списка операций
  const renderOperationsList = () => {
    if (!hasOperations) return null;

    return (
      <div className={cls(vs.operations_list, {[vs.operations_list_collapsed]: !isExpanded})} onClick={handleContainerClick}>
        {operations.map((operation, index) => {
          const parts = getOperationParts(operation.id);

          return (
            <div key={operation.id} className={s.operation_item} onClick={handleContainerClick}>
              <span className={s.operation_number}>{index + 1}.</span>

              <div className={s.operation_buttons}>
                <Button variant='soft' color='gray' size='1' className={cls(vs.toggle_operation_button, {[vs.disabled]: !operation.enabled})} onClick={(e) => handleToggleOperation(e, operation.id)}>
                  <LightningBoltIcon width={14} height={14} />
                </Button>

                <Button variant='soft' size='1' className={cls(s.operation_button, {[s.disabled]: !operation.enabled})} onClick={(e) => handleOpenEditModal(e, operation.id)}>
                  {parts ? (
                    <>
                      <span className={vs.variable_name}>{parts.variableName}</span>
                      {parts.operator && <span className={s.operator}>{parts.operator}</span>}
                      {parts.value && <span className={s.value}>{parts.value}</span>}
                    </>
                  ) : (
                    t('node_operations.operation_unknown', 'Unknown operation')
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // При изменении количества операций, уведомляем родительский компонент
  useEffect(() => {
    if (isControlled && onExpandToggle && hasOperations) {
      onExpandToggle(isExpanded);
    }
  }, [operations.length, isControlled, onExpandToggle, isExpanded, hasOperations]);

  return (
    <div className={cls(s.operations_container, className)} onClick={handleContainerClick}>
      {renderHeader()}
      {renderOperationsList()}

      {isCreateModalOpen && <OperationMasterDialog isOpen={isCreateModalOpen} nodeId={nodeId} operationId={selectedOperationId} onClose={handleCloseModal} />}
    </div>
  );
};
