import {useEffect} from 'react';

import {useNotebookStore} from '../store/useNotebookStore';
import {isModifierKeyPressed} from '../utils/keyboardModifiers';

/**
 * Хук для обработки горячих клавиш блокнота (Cmd+N/Ctrl+N)
 */
export function useNotebookHotkeys() {
  const {toggleNotebookPanel} = useNotebookStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем нажатия клавиш в полях ввода
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Определяем Cmd+N (Mac) или Ctrl+N (Windows/Linux)
      const isModifierPressed = isModifierKeyPressed(e);
      const isNKey = e.key.toLowerCase() === 'n' || e.code === 'KeyN';

      if (isModifierPressed && isNKey) {
        // Предотвращаем действие по умолчанию (новое окно браузера)
        e.preventDefault();
        e.stopPropagation();

        // Открываем панель блокнота
        toggleNotebookPanel();
      }
    };

    // Добавляем обработчик с высоким приоритетом
    document.addEventListener('keydown', handleKeyDown, {capture: true});

    // Очищаем обработчик при размонтировании
    return () => {
      document.removeEventListener('keydown', handleKeyDown, {capture: true});
    };
  }, [toggleNotebookPanel]);
}
