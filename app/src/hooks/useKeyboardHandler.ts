import React, {useEffect} from 'react';

import {isModifierKeyPressed} from '../utils/keyboardModifiers';

export interface KeyboardShortcut {
  key: string;
  modifierKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: (e: KeyboardEvent) => void;
  /**
   * Если true, сочетание клавиш будет активно при вводе в текстовых полях
   */
  activeInInputs?: boolean;
}

/**
 * Хук для централизованной обработки клавиатурных сочетаний
 *
 * @param shortcuts - массив сочетаний клавиш для обработки
 * @param deps - зависимости useEffect
 */
export const useKeyboardHandler = (shortcuts: KeyboardShortcut[], deps: React.DependencyList = []): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Проверяем, находимся ли мы в поле ввода
      const isInInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable);

      // Обрабатываем каждое сочетание клавиш
      for (const shortcut of shortcuts) {
        // Пропускаем сочетания, которые не должны работать в полях ввода
        if (isInInput && !shortcut.activeInInputs) {
          continue;
        }

        // Проверяем, соответствует ли нажатая клавиша ожидаемой
        const isKeyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase() || e.code === `Key${shortcut.key.toUpperCase()}`;

        // Проверяем модификаторы
        const isModifierMatch = shortcut.modifierKey ? isModifierKeyPressed(e) : !isModifierKeyPressed(e);
        const isShiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
        const isAltMatch = shortcut.altKey ? e.altKey : !e.altKey;

        // Если все условия соответствуют, вызываем callback
        if (isKeyMatch && isModifierMatch && isShiftMatch && isAltMatch) {
          // Предотвращаем действия по умолчанию и прекращаем всплытие
          e.preventDefault();
          e.stopPropagation();

          // Вызываем callback
          shortcut.callback(e);

          // Прерываем цикл после обработки первого совпадения
          break;
        }
      }
    };

    // Добавляем обработчик с высоким приоритетом
    document.addEventListener('keydown', handleKeyDown, {capture: true});

    // Очищаем обработчик при размонтировании
    return () => {
      document.removeEventListener('keydown', handleKeyDown, {capture: true});
    };
  }, deps);
};
