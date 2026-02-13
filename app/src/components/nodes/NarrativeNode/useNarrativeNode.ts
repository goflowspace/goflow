import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {useTranslation} from 'react-i18next';
import {useNodeSelection} from 'src/hooks/useNodeSelection';
import {useTextFieldGestures} from 'src/hooks/useTextFieldGestures';

import {useGraphStore} from '@store/useGraphStore';

import {getCommandManager} from '../../../commands/CommandManager';
import {DELAYS} from './constants';
import {adjustCardHeight, adjustTextAreaHeight, updateNodeConnections} from './utils';

interface NarrativeNodeData {
  title: string;
  text: string;
  attachedEntities?: string[];
}

/**
 * Хук для управления логикой нарративного узла
 */
export const useNarrativeNode = (id: string, data: any) => {
  const {t} = useTranslation();
  const commandManager = getCommandManager();

  // Извлекаем данные узла
  const {title: initTitle = '', text: initText = '', attachedEntities: initAttachedEntities = [], isAILoading = false} = data as NarrativeNodeData & {isAILoading?: boolean};
  const [title, setTitle] = useState(initTitle);
  const [text, setText] = useState(initText);
  const [attachedEntities, setAttachedEntities] = useState<string[]>(initAttachedEntities);
  const [isEditing, setIsEditing] = useState(false);

  // Референсы для доступа к DOM-элементам
  const titleRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const staticTextRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardWrapperRef = useRef<HTMLDivElement>(null);

  // Получаем сырые данные операций
  const rawNodeOperations = useGraphStore((state) => {
    const layer = state.layers[state.currentGraphId];
    const node = layer?.nodes[id];
    return node?.type === 'narrative' ? node.operations : undefined;
  });

  // Мемоизируем отсортированный массив операций
  const nodeOperations = useMemo(() => {
    if (rawNodeOperations && rawNodeOperations.length > 0) {
      return [...rawNodeOperations].sort((a, b) => a.order - b.order);
    }
    return [];
  }, [rawNodeOperations]);

  // Состояние для отслеживания раскрытия списка операций
  const [isOperationsExpanded, setIsOperationsExpanded] = useState(true);

  // Применяем обработчики жестов к текстовым полям
  useTextFieldGestures(titleRef);
  useTextFieldGestures(textRef);

  // Универсальный обработчик сохранения изменений
  const saveIfChanged = useCallback(() => {
    const currentAttachedEntities = data?.attachedEntities || [];
    const hasEntitiesChanged = JSON.stringify(attachedEntities) !== JSON.stringify(currentAttachedEntities);

    if (title !== data?.title || text !== data?.text || hasEntitiesChanged) {
      commandManager.editNarrativeNode(id, {title, text, attachedEntities});
    }
  }, [title, text, attachedEntities, data?.title, data?.text, data?.attachedEntities, commandManager, id]);

  // Полноценная функция сохранения с отключением режима редактирования
  const saveChanges = useCallback(() => {
    saveIfChanged();
    setIsEditing(false);
  }, [saveIfChanged]);

  // Ссылки на поля для хука выделения
  const fieldsRefs = {
    title: titleRef,
    text: textRef
  };

  // Функция для установки курсора в конец текста
  const setCursorToEnd = useCallback((element: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (element) {
      // Устанавливаем таймаут, чтобы убедиться, что элемент получил фокус
      setTimeout(() => {
        // Получаем длину текста и устанавливаем курсор в конец
        const length = element.value.length;
        element.setSelectionRange(length, length);
      }, 0);
    }
  }, []);

  // Используем хук для управления выделением
  const {
    isSelected,
    editingFields,
    handleNodeSelect: originalHandleNodeSelect,
    activateFieldEditing: originalActivateFieldEditing,
    deactivateAllEditing,
    handleKeyDown
  } = useNodeSelection(id, fieldsRefs, saveChanges, undefined, isAILoading);

  // Переопределяем activateFieldEditing для сохранения изменений при переключении полей
  const activateFieldEditing = useCallback(
    (fieldName: string, event?: React.MouseEvent) => {
      // Вызываем оригинальную функцию активации
      originalActivateFieldEditing(fieldName, event);

      // Устанавливаем курсор в конец текста
      if (fieldName === 'title') {
        setCursorToEnd(titleRef.current);
      } else if (fieldName === 'text') {
        setCursorToEnd(textRef.current);
      }
    },
    [originalActivateFieldEditing, setCursorToEnd]
  );

  // Переопределяем handleNodeSelect для активации только при выделении
  const handleNodeSelect = useCallback(() => {
    if (!isSelected) {
      // Если узел не выделен, просто выделяем его
      originalHandleNodeSelect();
    }
    // Убираем логику активации поля text при одинарном клике
    // Теперь для редактирования нужен двойной клик по конкретному полю
  }, [isSelected, originalHandleNodeSelect]);

  // Переопределяем обработчик клавиш для сохранения перед выходом из режима редактирования
  const handleCustomKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Если нажата клавиша Enter (без Shift) - сохраняем перед выходом из режима редактирования
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        saveIfChanged();
      }

      // Передаем управление стандартному обработчику
      handleKeyDown(e);
    },
    [handleKeyDown, saveIfChanged]
  );

  // Обработчик изменения текста
  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    adjustTextAreaHeight(textRef.current);
    updateCardHeight();
  }, []);

  // Обработчик изменения заголовка
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  // Функция обновления высоты карточки
  const updateCardHeight = useCallback(() => {
    adjustCardHeight({
      cardRef,
      staticTextRef,
      textRef,
      isEditingText: editingFields.text,
      id
    });
  }, [editingFields.text, id]);

  // Обработчик изменения состояния раскрытия списка операций
  const handleOperationsExpandToggle = useCallback(
    (expanded: boolean) => {
      setIsOperationsExpanded(expanded);

      // После изменения состояния пересчитываем высоту с небольшой задержкой,
      // чтобы DOM успел обновиться и высота списка операций была корректной
      const animationDuration = DELAYS.UPDATE_AFTER_OPERATION_TOGGLE;

      // Принудительно обновляем DOM и затем запускаем обновление соединений
      setTimeout(() => {
        updateCardHeight();
        updateNodeConnections(id);

        // Обновляем еще раз после анимации
        setTimeout(() => {
          updateCardHeight();
          updateNodeConnections(id);
        }, animationDuration);
      }, 10);
    },
    [updateCardHeight, id]
  );

  // Обработчик для blur, точно как в useChoiceNode
  const handleBlur = useCallback(() => {
    deactivateAllEditing(false);
    saveChanges();
  }, [deactivateAllEditing, saveChanges]);

  // Начало редактирования
  useEffect(() => {
    if (editingFields.text || editingFields.title) {
      setIsEditing(true);

      // Устанавливаем курсор в конец текста при активации поля
      if (editingFields.title) {
        setCursorToEnd(titleRef.current);
      }
      if (editingFields.text) {
        setCursorToEnd(textRef.current);
      }
    }
  }, [editingFields, setCursorToEnd]);

  // Обновляем высоту при изменении текста
  useEffect(() => {
    adjustTextAreaHeight(textRef.current);
    updateCardHeight();
  }, [text, updateCardHeight]);

  // Обновляем локальное состояние, когда приходят новые данные
  useEffect(() => {
    if (data && !isEditing) {
      if (data.title !== title) {
        setTitle((data as any).title || '');
      }
      if (data.text !== text) {
        setText((data as any).text || '');
      }
      const currentAttachedEntities = (data as any).attachedEntities || [];
      if (JSON.stringify(currentAttachedEntities) !== JSON.stringify(attachedEntities)) {
        setAttachedEntities(currentAttachedEntities);
      }
    }
  }, [data, title, text, attachedEntities, isEditing]);

  // Обновляем высоту при изменении списка операций
  useEffect(() => {
    updateCardHeight();
    updateNodeConnections(id);
  }, [nodeOperations.length, updateCardHeight, id]);

  // Инициализация при первом рендере
  useEffect(() => {
    // После загрузки сразу корректируем высоту
    updateCardHeight();
  }, [updateCardHeight]);

  // Обновляем соединения при изменении флага раскрытия списка операций
  useEffect(() => {
    const timer = setTimeout(() => {
      updateNodeConnections(id);
    }, DELAYS.UPDATE_CONNECTIONS);

    return () => clearTimeout(timer);
  }, [isOperationsExpanded, id]);

  return {
    title,
    text,
    attachedEntities,
    isEditing,
    isSelected,
    editingFields,
    nodeOperations,
    isOperationsExpanded,
    titleRef,
    textRef,
    staticTextRef,
    cardRef,
    cardWrapperRef,
    setTitle,
    setText,
    setAttachedEntities,
    handleTextChange,
    handleTitleChange,
    handleNodeSelect,
    activateFieldEditing,
    deactivateAllEditing,
    handleCustomKeyDown,
    handleBlur,
    handleOperationsExpandToggle,
    saveChanges,
    updateCardHeight
  };
};
