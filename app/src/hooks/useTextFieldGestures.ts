import {MutableRefObject, useEffect, useRef} from 'react';

/**
 * Интерфейс для событий жестов, которых нет в стандартном DOM API TypeScript
 */
interface GestureEvent extends Event {
  scale: number;
  rotation: number;
  clientX: number;
  clientY: number;
}

/**
 * Создаем собственное событие для сигнализации о готовности к жестам
 */
const createGestureReadyEvent = () => {
  try {
    return new Event('gestureready', {bubbles: true});
  } catch (e) {
    // Для старых браузеров
    const evt = document.createEvent('Event');
    evt.initEvent('gestureready', true, true);
    return evt;
  }
};

/**
 * Хук для улучшения работы с текстовыми полями в React Go Flow
 * Предотвращает конфликты с масштабированием и панорамированием при редактировании текста
 *
 * @param ref Ссылка на DOM элемент текстового поля
 */
export function useTextFieldGestures(ref: MutableRefObject<HTMLElement | null>) {
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;

    // Обработчик фокуса для предотвращения конфликтов при редактировании
    const handleFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).getAttribute('contenteditable') === 'true') {
        isEditingRef.current = true;

        // Добавляем класс nowheel при необходимости
        if (e.target instanceof HTMLElement) {
          e.target.classList.add('nowheel');
          // Добавляем атрибут data-no-zoom для дополнительной идентификации
          e.target.setAttribute('data-no-zoom', 'true');
        }
      }
    };

    // Обработчик потери фокуса
    const handleBlur = (e: FocusEvent) => {
      if (isEditingRef.current) {
        isEditingRef.current = false;
      }
    };

    // Прямой обработчик колесика мыши для предотвращения зума
    const handleWheel = (e: WheelEvent) => {
      // Если это попытка масштабирования (Ctrl+wheel)
      if (e.ctrlKey || e.metaKey) {
        // Полностью блокируем событие
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Обработчик клавиатуры для выхода из редактирования по клавишам
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingRef.current && (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey))) {
        isEditingRef.current = false;
      }
    };

    // Добавляем слушатели событий
    element.addEventListener('focus', handleFocus, true);
    element.addEventListener('blur', handleBlur, true);
    element.addEventListener('keydown', handleKeyDown, {capture: true});
    element.addEventListener('wheel', handleWheel, {capture: true, passive: false});

    return () => {
      // Удаляем слушатели событий при размонтировании
      element.removeEventListener('focus', handleFocus, true);
      element.removeEventListener('blur', handleBlur, true);
      element.removeEventListener('keydown', handleKeyDown, {capture: true});
      element.removeEventListener('wheel', handleWheel, {capture: true});
    };
  }, [ref]);
}
