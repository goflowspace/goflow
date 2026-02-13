import {useEffect, useRef} from 'react';

import {ProjectDataService} from '@services/projectDataService';

import {useGraphStore} from '@store/useGraphStore';

import {getCommandManager} from '../commands/CommandManager';
import {trackRedoUsed, trackUndoUsed} from '../services/analytics';

// Функция для дебаунсинга
const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;

  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Хук для обработки горячих клавиш Undo/Redo
 */
export function useUndoRedoKeyboardShortcuts() {
  // Добавляем флаг для отслеживания обработки команды
  const isProcessingRef = useRef(false);
  // Сохраняем последнее время обработки команды
  const lastCommandTimeRef = useRef(0);
  // Минимальный промежуток между командами (мс)
  const COMMAND_COOLDOWN = 300;

  useEffect(() => {
    const commandManager = getCommandManager();
    const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
    const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

    // Дебаунсированная версия undo/redo для предотвращения быстрых повторных нажатий
    const debouncedUndo = debounce(() => {
      // Отправляем событие в аналитику перед выполнением команды
      trackUndoUsed('hotkey', projectId, timelineId);
      commandManager.undo();
    }, 50);

    const debouncedRedo = debounce(() => {
      // Отправляем событие в аналитику перед выполнением команды
      trackRedoUsed('hotkey', projectId, timelineId);
      commandManager.redo();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем сочетания клавиш в полях ввода
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) {
        return;
      }

      // Проверяем, прошло ли достаточно времени с последней команды
      const now = Date.now();
      if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN) {
        e.preventDefault(); // Предотвращаем быстрые повторные нажатия
        return;
      }

      // Если уже обрабатываем команду, игнорируем новые нажатия
      if (isProcessingRef.current) {
        e.preventDefault();
        return;
      }

      // Cmd+Z (Mac) или Ctrl+Z (Windows/Linux) для Undo
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();

        isProcessingRef.current = true;
        lastCommandTimeRef.current = now;

        debouncedUndo();

        // Разблокируем обработку через задержку
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 200);

        return;
      }

      // Cmd+Shift+Z (Mac) или Ctrl+Shift+Z (Windows/Linux) для Redo
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && e.shiftKey) {
        e.preventDefault();

        isProcessingRef.current = true;
        lastCommandTimeRef.current = now;

        debouncedRedo();

        // Разблокируем обработку через задержку
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 200);

        return;
      }
    };

    // Добавляем обработчик на весь документ
    document.addEventListener('keydown', handleKeyDown);

    // Очищаем обработчик при размонтировании
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
