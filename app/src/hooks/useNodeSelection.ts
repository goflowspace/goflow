import React, {useCallback, useEffect, useRef, useState} from 'react';

import {useCanvasStore} from '@store/useCanvasStore';
import {useEditingStore} from '@store/useEditingStore';
import {useGraphStore} from '@store/useGraphStore';
import {useUIStore} from '@store/useUIStore';

import {trackObjectEditing} from '../services/analytics';
import {NODE_EDIT_ACTIVATION_EVENT} from './useGlobalHotkeys';

/**
 * Маппинг типа узла в формат для аналитики
 */
const mapNodeTypeToObjectType = (nodeType: string): 'Narrative' | 'Choice' | 'Layer' | 'Note' | 'Link' | 'Condition' => {
  switch (nodeType) {
    case 'narrative':
      return 'Narrative';
    case 'choice':
      return 'Choice';
    case 'layer':
      return 'Layer';
    case 'note':
      return 'Note';
    default:
      return 'Narrative'; // Fallback
  }
};

/**
 * Маппинг имени поля в формат для аналитики
 */
const mapFieldNameToPropertyType = (fieldName: string): 'Name' | 'Text' => {
  switch (fieldName) {
    case 'title':
    case 'name':
      return 'Name';
    case 'text':
    case 'desc':
    default:
      return 'Text';
  }
};

/**
 * Получает зум холста в процентах
 */
const getCanvasZoomPercent = (currentGraphId: string, getLayerViewport: (layerId: string) => {x: number; y: number; zoom: number} | null): number => {
  const viewport = getLayerViewport(currentGraphId);
  return Math.round((viewport?.zoom || 1) * 100);
};

/**
 * Получает разрешение экрана пользователя
 */
const getDisplayResolution = (): string => {
  if (typeof window !== 'undefined' && window.screen) {
    return `${window.screen.width}x${window.screen.height}`;
  }
  return '1920x1080'; // Fallback
};

/**
 * Хук для управления двойным выделением узлов:
 * - первый клик по узлу выделяет сам узел (рамку)
 * - второй клик активирует редактирование
 *
 * @param id ID узла
 * @param fieldsRefs Объект с ссылками на поля редактирования
 * @param saveChanges Функция сохранения изменений
 * @param onEditingStateChange Опциональный колбэк при изменении состояния редактирования
 * @param isAILoading Флаг, указывающий, что узел находится в процессе AI генерации
 */
export const useNodeSelection = (
  id: string,
  fieldsRefs: Record<string, React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>>,
  saveChanges: () => void,
  onEditingStateChange?: (isEditing: boolean) => void,
  isAILoading?: boolean
) => {
  // Состояние редактирования конкретных полей с правильной типизацией
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});

  // Флаг, показывающий, редактируется ли хотя бы одно поле
  const isEditingAnyField = Object.values(editingFields).some(Boolean);

  // Получаем функцию выделения узла из стора канваса
  const selectNode = useCanvasStore((state) => state.selectNode);
  const nodes = useCanvasStore((state) => state.nodes);

  // Получаем функции из хранилища редактирования
  const {registerEditingNode, unregisterEditingNode, addDeactivationHandler, removeDeactivationHandler} = useEditingStore();

  // Получаем данные для аналитики
  const isSidebarOpened = useUIStore((state) => state.isSidebarOpen);
  const currentGraphId = useGraphStore((state) => state.currentGraphId);
  const getLayerViewport = useGraphStore((state) => state.getLayerViewport);

  // Проверяем, выделен ли узел
  const isSelected = nodes.some((node) => node.id === id && node.selected);

  // Используем useRef для сохранения текущего состояния редактирования
  const isEditingRef = useRef(false);

  // Функция для активации редактирования конкретного поля
  const activateFieldEditing = useCallback(
    (fieldName: string, event?: React.MouseEvent) => {
      // Останавливаем всплытие события, чтобы не срабатывало повторное выделение узла
      event?.stopPropagation();

      // Запоминаем координаты клика, если они есть
      const clickX = event?.clientX;
      const clickY = event?.clientY;

      // Проверяем, редактируются ли другие поля (не текущее)
      const isEditingOtherFields = Object.entries(editingFields).some(([key, value]) => key !== fieldName && value === true);

      if (isSelected) {
        // Если узел уже в режиме редактирования для других полей,
        // сохраняем текущие изменения перед переключением на новое поле
        if (isEditingOtherFields) {
          // Вызываем сохранение текущих изменений
          saveChanges();
        }

        // Отмечаем, что начали редактирование
        isEditingRef.current = true;

        // Регистрируем узел в режиме редактирования, если еще не зарегистрирован
        if (!isEditingAnyField) {
          registerEditingNode(id);
        }

        // Создаем новое состояние редактирования, где активно только выбранное поле
        setEditingFields((prev) => {
          // Создаем новый объект состояния, где все поля выключены
          const newState: Record<string, boolean> = {};

          // Для каждого поля устанавливаем false
          Object.keys(prev).forEach((key) => {
            newState[key] = false;
          });

          // Убеждаемся, что выбранное поле активно
          newState[fieldName] = true;

          // Вызываем колбэк при входе в режим редактирования
          if (onEditingStateChange && !isEditingAnyField) {
            onEditingStateChange(true);
          }

          return newState;
        });

        // Отправляем событие аналитики о начале редактирования
        const currentNode = nodes.find((node) => node.id === id);
        if (currentNode && currentNode.type) {
          const objectType = mapNodeTypeToObjectType(currentNode.type);
          const propertyEdited = mapFieldNameToPropertyType(fieldName);
          const canvasZoomPercent = getCanvasZoomPercent(currentGraphId, getLayerViewport);
          const displayResolution = getDisplayResolution();

          trackObjectEditing(objectType, propertyEdited, 'Object', isSidebarOpened, canvasZoomPercent, displayResolution);
        }

        // Фокусируемся на поле с небольшой задержкой
        setTimeout(() => {
          const fieldRef = fieldsRefs[fieldName];
          if (fieldRef?.current) {
            fieldRef.current.focus();

            if (fieldRef.current instanceof HTMLInputElement || fieldRef.current instanceof HTMLTextAreaElement) {
              // Добавляем класс, предотвращающий перетаскивание узла во время редактирования
              fieldRef.current.classList.add('nodrag', 'nowheel', 'nopan');

              // Запрещаем распространение событий до ReactFlow в режиме редактирования
              const preventPropagation = (e: Event) => {
                e.stopPropagation();
              };

              // Добавляем обработчики для предотвращения захвата событий ReflowJS
              fieldRef.current.addEventListener('mousedown', preventPropagation);
              fieldRef.current.addEventListener('mousemove', preventPropagation);

              // Очищаем обработчики при blur
              fieldRef.current.addEventListener(
                'blur',
                () => {
                  fieldRef.current?.removeEventListener('mousedown', preventPropagation);
                  fieldRef.current?.removeEventListener('mousemove', preventPropagation);
                },
                {once: true}
              );
            }
          }
        }, 10);
      } else {
        // Если узел не выделен, просто выделяем его
        selectNode(id);
      }
    },
    [isSelected, fieldsRefs, editingFields, isEditingAnyField, onEditingStateChange, registerEditingNode, id, selectNode, saveChanges]
  );

  // Функция для обработки клика по узлу в статическом режиме
  const handleNodeSelect = useCallback(() => {
    // Если узел не выделен, выделяем его
    if (!isSelected) {
      selectNode(id);
    }
    // Если узел уже выделен, активируем редактирование для первого доступного поля
    else {
      const fieldNames = Object.keys(fieldsRefs);
      if (fieldNames.length > 0) {
        activateFieldEditing(fieldNames[0]);
      }
    }
  }, [id, selectNode, isSelected, fieldsRefs, activateFieldEditing]);

  // Функция для деактивации редактирования всех полей
  // maintainSelection - указывает, нужно ли поддерживать выделение узла после деактивации
  const deactivateAllEditing = useCallback(
    (maintainSelection = true) => {
      if (isEditingAnyField) {
        // Сохраняем изменения перед отключением режима редактирования
        saveChanges();
        setEditingFields({});

        // Вызываем колбэк, если выходим из режима редактирования
        if (onEditingStateChange) {
          onEditingStateChange(false);
        }

        // Отменяем регистрацию узла в режиме редактирования
        unregisterEditingNode(id);

        // Сбрасываем флаг редактирования
        isEditingRef.current = false;

        // Явно поддерживаем выделение узла после выхода из режима редактирования,
        // Но только если это обычный выход (не перед созданием нового узла) и maintainSelection=true
        if (maintainSelection) {
          selectNode(id);
        }
      }
    },
    [isEditingAnyField, saveChanges, onEditingStateChange, selectNode, id, unregisterEditingNode, isEditingRef]
  );

  // Регистрируем обработчик деактивации при монтировании компонента
  useEffect(() => {
    // Добавляем обработчик деактивации для этого узла
    const deactivationHandler = () => deactivateAllEditing(true);
    addDeactivationHandler(id, deactivationHandler);

    // Удаляем обработчик при размонтировании
    return () => {
      removeDeactivationHandler(id);
      unregisterEditingNode(id);
    };
  }, [id, addDeactivationHandler, removeDeactivationHandler, unregisterEditingNode]);

  // Обработчик клика вне узла
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      // Проверяем, что клик был не по полям редактирования
      const isOutsideFields = !Object.values(fieldsRefs).some((ref) => ref.current && ref.current.contains(e.target as Node));

      if (isOutsideFields && isEditingAnyField) {
        // Когда клик вне узла, НЕ поддерживаем выделение
        deactivateAllEditing(false);
      }
    },
    [fieldsRefs, isEditingAnyField, deactivateAllEditing]
  );

  // Добавляем обработчик клика по документу для сохранения при клике вне узла
  useEffect(() => {
    if (isEditingAnyField) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [isEditingAnyField, handleOutsideClick]);

  // При нажатии Escape или Enter сохраняем и выходим из режима редактирования
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Всегда останавливаем распространение событий клавиатуры в режиме редактирования
      e.stopPropagation();

      if (e.key === 'Escape') {
        // Сразу деактивируем при Escape, сохраняем выделение
        deactivateAllEditing(true);
      } else if (e.key === 'Enter') {
        // Если нажат Shift+Enter, позволяем добавить перенос строки
        if (e.metaKey || e.ctrlKey) {
          // Ничего не делаем, позволяем добавить перенос строки
          return;
        } else if (!e.shiftKey) {
          // Для простого Enter (без Shift) предотвращаем стандартное поведение (добавление переноса строки)
          e.preventDefault();

          // Для Enter добавим небольшую задержку, чтобы убедиться, что состояние обновилось
          setTimeout(() => {
            deactivateAllEditing(true);
          }, 10);
        }
      }
    },
    [deactivateAllEditing]
  );

  // Слушаем кастомное событие для активации редактирования по Enter
  useEffect(() => {
    const handleNodeEditActivation = (e: CustomEvent) => {
      // Если мы уже в режиме редактирования, не делаем ничего
      if (isEditingRef.current) return;

      // Получаем актуальное состояние выделения в момент получения события
      const currentNodes = useCanvasStore.getState().nodes;
      const nodeIsCurrentlySelected = currentNodes.some((node) => node.id === id && node.selected);

      if (e.detail.nodeId === id && nodeIsCurrentlySelected) {
        // Блокируем активацию редактирования, если узел загружается через AI
        if (isAILoading) {
          return;
        }

        // Используем небольшую задержку для стабильной работы после создания нового узла
        setTimeout(() => {
          // Проверяем, что узел все еще выделен и не находится в режиме редактирования
          if (isEditingRef.current) return;

          const updatedNodes = useCanvasStore.getState().nodes;
          const stillSelected = updatedNodes.some((n) => n.id === id && n.selected);
          if (!stillSelected) return;

          // Активируем нужное поле в зависимости от типа узла
          if (e.detail.nodeType === 'narrative') {
            // Для нарратива активируем поле text
            if (fieldsRefs.text) {
              activateFieldEditing('text');
            }
          } else if (e.detail.nodeType === 'choice') {
            // Для выбора активируем поле text
            if (fieldsRefs.text) {
              activateFieldEditing('text');
            }
          }
        }, 50);
      }
    };

    // Добавляем слушателя для кастомного события
    document.addEventListener(NODE_EDIT_ACTIVATION_EVENT, handleNodeEditActivation as EventListener);

    return () => {
      document.removeEventListener(NODE_EDIT_ACTIVATION_EVENT, handleNodeEditActivation as EventListener);
    };
  }, [id, activateFieldEditing, fieldsRefs, isEditingRef, isAILoading]);

  return {
    isSelected,
    isEditingAnyField,
    editingFields,
    handleNodeSelect,
    activateFieldEditing,
    deactivateAllEditing,
    handleKeyDown
  };
};
