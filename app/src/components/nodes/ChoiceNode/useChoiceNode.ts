import React, {useCallback, useEffect, useRef, useState} from 'react';

import {useReactFlow} from '@xyflow/react';
import {useNodeSelection} from 'src/hooks/useNodeSelection';
import {useTextFieldGestures} from 'src/hooks/useTextFieldGestures';

import {useGraphStore} from '@store/useGraphStore';

import {getCommandManager} from '../../../commands/CommandManager';
import {DELAYS} from './constants';
import {calculateHeightFromText, calculateLinesFromText, updateNodeConnections} from './utils';

interface ChoiceNodeData {
  text: string;
  offsetY?: number;
  height?: number;
  isAILoading?: boolean;
}

/**
 * Хук для управления логикой узла выбора
 */
export const useChoiceNode = (id: string, data: ChoiceNodeData) => {
  const {setNodes} = useReactFlow();
  const graphStore = useGraphStore();
  const commandManager = getCommandManager();

  // Извлекаем данные узла
  const {text: initText = '', height: initHeight, isAILoading = false} = data;
  const [text, setText] = useState(initText);
  const [isEditing, setIsEditing] = useState(false);
  const [nodeHeight, setNodeHeight] = useState(initHeight || calculateHeightFromText(initText));

  // Референсы для доступа к DOM-элементам
  const textRef = useRef<HTMLTextAreaElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Применяем обработчики жестов к текстовым полям
  useTextFieldGestures(textRef);

  // Количество строк для текстового поля
  const estimatedRows = calculateLinesFromText(text);

  // Функция для установки курсора в конец текста
  const setCursorToEnd = useCallback((element: HTMLTextAreaElement | null) => {
    if (element) {
      // Устанавливаем таймаут, чтобы убедиться, что элемент получил фокус
      setTimeout(() => {
        // Получаем длину текста и устанавливаем курсор в конец
        const length = element.value.length;
        element.setSelectionRange(length, length);
      }, 0);
    }
  }, []);

  // Функция для сброса прокрутки к началу текста в textarea
  const resetScrollToTop = useCallback(() => {
    if (textRef.current) {
      // Сбрасываем прокрутку самого textarea к началу
      textRef.current.scrollTop = 0;
    }
    if (textContainerRef.current) {
      // Также сбрасываем прокрутку контейнера к началу
      textContainerRef.current.scrollTop = 0;
    }
  }, []);

  // Функция для обновления высоты узла в хранилище и React Go Flow
  const updateNodeHeight = useCallback(
    (newText: string) => {
      // Рассчитываем высоту на основе текста
      const newHeight = calculateHeightFromText(newText);

      if (newHeight !== nodeHeight) {
        setNodeHeight(newHeight);

        // Получаем текущее состояние графа
        const currentGraphId = graphStore.currentGraphId;
        const currentLayer = graphStore.layers[currentGraphId];

        if (!currentLayer || !currentLayer.nodes[id]) return;

        // Проверяем, что текущий узел - это узел выбора
        const currentNode = currentLayer.nodes[id];
        if (currentNode.type !== 'choice') return;

        // Обновляем узел с новой высотой
        const updatedNode = {
          ...currentNode,
          data: {
            ...currentNode.data,
            height: newHeight
          }
        };

        // Создаем объект с обновленными узлами
        const updatedNodes = {
          ...currentLayer.nodes,
          [id]: updatedNode
        };

        // Обновляем слой
        const updatedLayer = {
          ...currentLayer,
          nodes: updatedNodes
        };

        // Обновляем слои в хранилище
        graphStore.layers = {
          ...graphStore.layers,
          [currentGraphId]: updatedLayer
        };

        // Сохраняем изменения в localStorage
        graphStore.saveToDb();

        // Обновляем React Go Flow узлы
        setNodes((nodes) =>
          nodes.map((node) => {
            if (node.id === id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  height: newHeight
                },
                height: newHeight
              };
            }
            return node;
          })
        );

        // Обновляем соединения после изменения высоты
        updateNodeConnections(id, DELAYS.UPDATE_CONNECTIONS);
      }
    },
    [id, setNodes, graphStore]
  );

  // Функция сохранения изменений
  const saveChanges = useCallback(() => {
    if (text !== data?.text) {
      // Сохраняем текст через командный менеджер
      commandManager.editChoiceNodeText(id, text);

      // Убеждаемся, что высота также обновлена
      updateNodeHeight(text);
    }
    setIsEditing(false);
  }, [id, text, data?.text, commandManager, updateNodeHeight]);

  // Ссылки на поля для хука выделения
  const fieldsRefs = {
    text: textRef
  };

  // Используем хук для управления выделением
  const {
    editingFields,
    handleNodeSelect,
    activateFieldEditing: originalActivateFieldEditing,
    deactivateAllEditing,
    handleKeyDown
  } = useNodeSelection(id, fieldsRefs, saveChanges, undefined, isAILoading);

  // Переопределяем activateFieldEditing для установки курсора в конец текста
  const activateFieldEditing = useCallback(
    (fieldName: string, event?: React.MouseEvent) => {
      // Вызываем оригинальную функцию активации
      originalActivateFieldEditing(fieldName, event);

      // Устанавливаем курсор в конец текста
      if (fieldName === 'text') {
        setCursorToEnd(textRef.current);
      }
    },
    [originalActivateFieldEditing, setCursorToEnd]
  );

  // Обработчик изменения текста
  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
  }, []);

  // Обработчик потери фокуса
  const handleBlur = useCallback(() => {
    deactivateAllEditing(false);
    saveChanges();
    // Сбрасываем прокрутку к началу текста после выхода из режима редактирования
    setTimeout(() => {
      resetScrollToTop();
    }, 0);
  }, [deactivateAllEditing, saveChanges, resetScrollToTop]);

  // Обновляем высоту при изменении текста
  useEffect(() => {
    const newHeight = calculateHeightFromText(text);

    if (newHeight !== nodeHeight) {
      updateNodeHeight(text);
    }
  }, [text, nodeHeight]);

  // Обновляем флаг редактирования
  useEffect(() => {
    if (editingFields.text) {
      setIsEditing(true);

      // Устанавливаем курсор в конец текста при активации редактирования
      setCursorToEnd(textRef.current);
    } else if (isEditing) {
      // При деактивации поля редактирования сбрасываем прокрутку
      setIsEditing(false);
      resetScrollToTop();
    }
  }, [editingFields.text, setCursorToEnd, isEditing, resetScrollToTop]);

  // Обновляем текст, если он изменился извне
  useEffect(() => {
    if (data?.text !== text && !isEditing && data) {
      setText(data.text);
      // Также обновляем высоту при получении нового текста извне
      const newHeight = calculateHeightFromText(data.text);
      if (newHeight !== nodeHeight) {
        updateNodeHeight(data.text);
      }
      // Сбрасываем прокрутку при получении нового текста
      resetScrollToTop();
    }
  }, [data?.text, text, isEditing, nodeHeight, resetScrollToTop]);

  return {
    text,
    isEditing,
    nodeHeight,
    editingFields,
    estimatedRows,
    textRef,
    textContainerRef,
    handleTextChange,
    handleNodeSelect,
    activateFieldEditing,
    deactivateAllEditing,
    handleKeyDown,
    handleBlur,
    saveChanges
  };
};
