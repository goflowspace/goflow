import React, {MutableRefObject, RefObject, useCallback} from 'react';

interface UseCanvasEventsProps {
  wrapperRef: RefObject<HTMLDivElement | null>;
  setCursorPos: (pos: {x: number; y: number} | null) => void;
  setIsPanning: (isPanning: boolean) => void;
  isPanning: boolean | MutableRefObject<boolean>;
}

export function useCanvasEvents({wrapperRef, setCursorPos, setIsPanning, isPanning}: UseCanvasEventsProps) {
  // Вспомогательная функция для получения текущего значения isPanning
  const getIsPanning = useCallback(() => {
    // Если isPanning - это ref, возвращаем его current значение
    if (typeof isPanning === 'object' && 'current' in isPanning) {
      return isPanning.current;
    }
    // Иначе возвращаем сам isPanning
    return isPanning;
  }, [isPanning]);

  // Обработчик для контекстного меню (правая кнопка мыши)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent browser context menu
  }, []);

  // Предотвращаем стандартное поведение перетаскивания
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Пустой обработчик для onMouseMove, все обрабатывается через глобальный обработчик
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Пустая функция, реальная обработка происходит в глобальном обработчике
  }, []);

  // Обработчик для отслеживания положения курсора (для отображения призраков)
  const trackMousePosition = useCallback(
    (e: globalThis.MouseEvent) => {
      if (wrapperRef.current) {
        const bounds = wrapperRef.current.getBoundingClientRect();
        // Используем requestAnimationFrame для оптимизации
        requestAnimationFrame(() => {
          setCursorPos({
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top
          });
        });
      }
    },
    [wrapperRef, setCursorPos]
  );

  // Обработчик для отпускания мыши при выходе за пределы канваса
  const handleMouseLeave = useCallback(() => {
    if (getIsPanning()) {
      setIsPanning(false);
      if (wrapperRef.current) {
        wrapperRef.current.style.cursor = '';
      }
    }
  }, [getIsPanning, setIsPanning, wrapperRef]);

  return {
    handleContextMenu,
    handleDragStart,
    handleMouseMove,
    trackMousePosition,
    handleMouseLeave
  };
}
