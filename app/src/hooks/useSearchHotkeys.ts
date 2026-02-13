import {useEffect} from 'react';

import {useSearchStore} from '../store/useSearchStore';
import {isModifierKeyPressed} from '../utils/keyboardModifiers';

/**
 * Хук для обработки горячих клавиш поиска (Cmd+F/Ctrl+F)
 */
export function useSearchHotkeys() {
  const {toggleSearchPanel, setSearchOpenedByHotkey} = useSearchStore();

  // Используем прямой обработчик для лучшей поддержки всех вариантов Cmd+F/Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем нажатия клавиш в полях ввода
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Определяем Cmd+F (Mac) или Ctrl+F (Windows/Linux)
      const isModifierPressed = isModifierKeyPressed(e);
      const isFKey = e.key.toLowerCase() === 'f' || e.code === 'KeyF';

      if (isModifierPressed && isFKey) {
        // Предотвращаем действие по умолчанию (поиск браузера)
        e.preventDefault();
        e.stopPropagation();

        // Устанавливаем флаг, что поиск открыт через хоткей
        setSearchOpenedByHotkey(true);

        // Открываем панель поиска
        toggleSearchPanel();
      }
    };

    // Добавляем обработчик с высоким приоритетом
    document.addEventListener('keydown', handleKeyDown, {capture: true});

    // Очищаем обработчик при размонтировании
    return () => {
      document.removeEventListener('keydown', handleKeyDown, {capture: true});
    };
  }, [toggleSearchPanel, setSearchOpenedByHotkey]);
}
