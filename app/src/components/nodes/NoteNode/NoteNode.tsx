'use client';

import React, {FocusEvent, memo, useCallback, useEffect, useRef, useState} from 'react';

import {TextArea} from '@radix-ui/themes';
import {NodeProps} from '@xyflow/react';
import cls from 'classnames';
import {getCommandManager} from 'src/commands/CommandManager';
import {NODE_EDIT_ACTIVATION_EVENT} from 'src/hooks/useGlobalHotkeys';

import {useCanvasStore} from '@store/useCanvasStore';

import s from './NoteNode.module.scss';

const NoteNode = memo(({id, data, selected}: NodeProps) => {
  const [editing, setEditing] = useState(false);
  const noteText = (data?.text as string) || '';
  const [localText, setLocalText] = useState(noteText);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const textAreaContainerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const textDivRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const initialEditRef = useRef(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousHeightRef = useRef<number | undefined>(undefined);

  const commandManager = getCommandManager();
  const {selectNode} = useCanvasStore();

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

  // Обновляем состояние текста при изменении данных извне
  useEffect(() => {
    setLocalText(noteText);
  }, [noteText]);

  // Listen to global edit activation event
  useEffect(() => {
    const handleEditActivation = (e: CustomEvent) => {
      if (e.detail && e.detail.nodeId === id) {
        setEditing(true);
      }
    };

    document.addEventListener(NODE_EDIT_ACTIVATION_EVENT, handleEditActivation as EventListener);
    return () => {
      document.removeEventListener(NODE_EDIT_ACTIVATION_EVENT, handleEditActivation as EventListener);
    };
  }, [id]);

  // Функция для безопасного обновления высоты с дебаунсом
  const debouncedUpdateHeight = useCallback(() => {
    // Очищаем предыдущий таймаут, если он существует
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Устанавливаем новый таймаут с минимальной задержкой
    updateTimeoutRef.current = setTimeout(() => {
      // Используем активный элемент для расчета высоты
      const activeElement = editing && textAreaRef.current ? textAreaRef.current : textDivRef.current;

      if (nodeRef.current && activeElement) {
        // Минимальная высота заметки
        const minHeight = 120;

        // Добавляем отступы к фактической высоте контента
        // Используем scrollHeight для точного измерения, включая невидимый текст
        const contentHeight = activeElement.scrollHeight + 20;
        const newHeight = Math.max(contentHeight, minHeight);

        // Обновляем только если высота действительно изменилась и отличается от предыдущего значения
        if (newHeight !== previousHeightRef.current) {
          previousHeightRef.current = newHeight;
          setHeight(newHeight);
        }
      }
    }, 1); // Уменьшаем задержку до 10 мс для более быстрого отклика
  }, [editing]);

  // Обновляем высоту при изменении текста заметки
  useEffect(() => {
    debouncedUpdateHeight();

    const elementToObserve = editing && textAreaRef.current ? textAreaContainerRef.current : textDivRef.current;

    if (typeof ResizeObserver !== 'undefined' && elementToObserve) {
      const resizeObserver = new ResizeObserver(debouncedUpdateHeight);
      resizeObserver.observe(elementToObserve);
      return () => {
        resizeObserver.disconnect();
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }
      };
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, [noteText, localText, editing, debouncedUpdateHeight]);

  // Focus the textarea when editing is enabled
  useEffect(() => {
    if (editing && textAreaRef.current) {
      textAreaRef.current.focus();
      setCursorToEnd(textAreaRef.current);
    } else if (!editing) {
      // Сбрасываем флаг, если режим редактирования отключен
      initialEditRef.current = false;
    }
  }, [editing, localText, setCursorToEnd]);

  // Start editing when double clicking on the node
  const handleDoubleClick = useCallback(() => {
    setEditing(true);
  }, []);

  // Handle node selection and edit activation
  const handleClick = useCallback(() => {
    if (selected) {
      // Если заметка уже выделена, то активируем режим редактирования
      setEditing(true);
    } else {
      // Иначе просто выделяем заметку
      selectNode(id);
    }
  }, [id, selectNode, selected]);

  // Предотвращаем перетаскивание при клике на текстовую область во время редактирования
  const handleTextAreaClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Предотвращаем завершение редактирования при клике внутри текстовой области
  const handleTextAreaMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Обработчик изменения текста - запускаем обновление высоты сразу
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalText(e.target.value);

      // Немедленно обновляем высоту при больших изменениях текста
      // Получаем примерную разницу в длине текста
      const lengthDifference = Math.abs(e.target.value.length - localText.length);

      // Если изменение значительное (удаление/вставка большого фрагмента), обновляем сразу
      if (lengthDifference > 30) {
        // Запускаем обновление без задержки для больших изменений
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        const activeElement = textAreaRef.current;
        if (nodeRef.current && activeElement) {
          const minHeight = 120;
          const contentHeight = activeElement.scrollHeight + 20;
          const newHeight = Math.max(contentHeight, minHeight);

          if (newHeight !== previousHeightRef.current) {
            previousHeightRef.current = newHeight;
            setHeight(newHeight);
          }
        } else {
          // Если элемент недоступен, используем дебаунсированное обновление
          debouncedUpdateHeight();
        }
      } else {
        // Для небольших изменений используем дебаунс
        debouncedUpdateHeight();
      }
    },
    [localText, debouncedUpdateHeight]
  );

  // Обработчик нажатия клавиш при редактировании заметки
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Выход из режима редактирования по Escape
      if (e.key === 'Escape') {
        setEditing(false);
        // Если текст изменился, сохраняем изменения
        if (localText !== noteText) {
          commandManager.editNote(id, localText);
        }
      }
    },
    [id, localText, noteText, commandManager]
  );

  // Blur handler to update the node when editing completes
  const handleBlur = useCallback(
    (e: FocusEvent<HTMLTextAreaElement>) => {
      setEditing(false);
      // Используем CommandManager для сохранения текста заметки, только если он изменился
      if (e.target.value !== noteText) {
        commandManager.editNote(id, e.target.value);
      }
    },
    [id, noteText, commandManager]
  );

  const noteBackground = (data?.color as string) || '#fffad1';

  return (
    <div
      ref={nodeRef}
      className={cls(s.note_wrapper, {
        [s.selected]: selected,
        nodrag: editing,
        [s.faded]: data?.shouldBeFaded
      })}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        backgroundColor: noteBackground,
        height: height
      }}
    >
      {editing ? (
        <div ref={textAreaContainerRef} className={s.note_input_container} onMouseDown={handleTextAreaMouseDown} onClick={handleTextAreaClick}>
          <TextArea ref={textAreaRef} value={localText} onChange={handleTextChange} onBlur={handleBlur} onKeyDown={handleKeyDown} placeholder='Add note text here...' className='nodrag' />
        </div>
      ) : (
        <div ref={textDivRef} className={s.note_text}>
          {noteText || 'Add note text here...'}
        </div>
      )}
    </div>
  );
});

NoteNode.displayName = 'NoteNode';

export default NoteNode;
