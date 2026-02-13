import React, {MutableRefObject, RefObject, useCallback, useRef} from 'react';

import {useReactFlow} from '@xyflow/react';

interface UseZoomPanHandlersProps {
  wrapperRef: RefObject<HTMLDivElement | null>;
  handleViewportChange: () => void;
  setIsPanning: (isPanning: boolean) => void;
  setIsRightMouseDown: (isDown: boolean) => void;
  isRightMouseDown: boolean | MutableRefObject<boolean>; // Поддержка как булевых значений, так и рефов
}

export function useZoomPanHandlers({wrapperRef, handleViewportChange, setIsPanning, setIsRightMouseDown, isRightMouseDown}: UseZoomPanHandlersProps) {
  const reactFlowInstance = useReactFlow();
  const initialMousePositionRef = useRef<{x: number; y: number} | null>(null);
  const lastViewportRef = useRef<{x: number; y: number; zoom: number} | null>(null);

  // Вспомогательная функция для получения текущего значения isRightMouseDown
  const getIsRightMouseDown = useCallback(() => {
    // Если isRightMouseDown - это ref, возвращаем его current значение
    if (typeof isRightMouseDown === 'object' && 'current' in isRightMouseDown) {
      return isRightMouseDown.current;
    }
    // Иначе возвращаем сам isRightMouseDown
    return isRightMouseDown;
  }, [isRightMouseDown]);

  // Обработчик колеса мыши для горизонтальной прокрутки при зажатом Shift
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      // Если это щипок для масштабирования (с Ctrl/Cmd), то не обрабатываем здесь
      if (event.ctrlKey || event.metaKey) {
        return;
      }

      // При зажатом Shift используем колесо для горизонтальной прокрутки
      if (event.shiftKey) {
        event.preventDefault();
        const viewportData = reactFlowInstance.getViewport();
        reactFlowInstance.setViewport({
          x: viewportData.x - event.deltaY,
          y: viewportData.y,
          zoom: viewportData.zoom
        });

        // Сохраняем состояние вьюпорта после ручной настройки
        handleViewportChange();
      }
    },
    [reactFlowInstance, handleViewportChange]
  );

  // Обработчик нажатия правой кнопки мыши для панорамирования
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Проверяем, нажата ли правая кнопка мыши
      if (e.button === 2) {
        e.preventDefault();
        setIsRightMouseDown(true);
        setIsPanning(true);

        // Сохраняем начальную позицию мыши для расчета смещения
        initialMousePositionRef.current = {x: e.clientX, y: e.clientY};

        // Сохраняем текущий viewport для применения смещения
        lastViewportRef.current = reactFlowInstance.getViewport();

        if (wrapperRef.current) {
          wrapperRef.current.style.cursor = 'grabbing';
        }
      }
    },
    [reactFlowInstance, wrapperRef, setIsRightMouseDown, setIsPanning]
  );

  // Обработчик отпускания правой кнопки мыши
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Проверяем, отпущена ли правая кнопка мыши
      if (e.button === 2) {
        e.preventDefault();
        setIsRightMouseDown(false);
        setIsPanning(false);

        // Сбрасываем сохраненные данные о перетаскивании
        initialMousePositionRef.current = null;
        lastViewportRef.current = null;

        if (wrapperRef.current) {
          wrapperRef.current.style.cursor = '';
        }
      }
    },
    [wrapperRef, setIsRightMouseDown, setIsPanning]
  );

  // Функция для масштабирования относительно положения курсора
  const zoomToPointer = useCallback(
    (event: WheelEvent, zoomStep: number) => {
      try {
        // Получаем текущий viewport
        const viewport = reactFlowInstance.getViewport();

        // Получаем размеры и позицию холста
        let reactFlowBounds;
        if (wrapperRef.current) {
          reactFlowBounds = wrapperRef.current.getBoundingClientRect();
        } else {
          // Fallback на размер видимой области
          reactFlowBounds = {
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight
          };
        }

        // Вычисляем позицию курсора на холсте
        const pointerX = event.clientX - reactFlowBounds.left;
        const pointerY = event.clientY - reactFlowBounds.top;

        // Вычисляем позицию курсора в мировых координатах (с учетом текущего масштаба)
        const worldX = (pointerX - viewport.x) / viewport.zoom;
        const worldY = (pointerY - viewport.y) / viewport.zoom;

        // Более точный и быстрый коэффициент масштабирования
        const amount = Math.abs(event.deltaY) > 100 ? 0.2 : 0.05;
        const scaleFactor = zoomStep > 0 ? 1 + amount : 1 - amount;

        const newZoom = viewport.zoom * scaleFactor;

        // Вычисляем новую позицию viewportа, чтобы курсор оставался над той же точкой
        const newX = pointerX - worldX * newZoom;
        const newY = pointerY - worldY * newZoom;

        // Применяем новый viewport без анимации для максимальной отзывчивости
        reactFlowInstance.setViewport(
          {
            x: newX,
            y: newY,
            zoom: newZoom
          },
          {duration: 0}
        );

        // Сохраняем состояние вьюпорта после масштабирования
        requestAnimationFrame(() => handleViewportChange());
      } catch (error) {
        // Fallback: выполнить обычное масштабирование без привязки к курсору
        const viewport = reactFlowInstance.getViewport();
        const amount = 0.1;
        const newZoom = viewport.zoom * (zoomStep > 0 ? 1 + amount : 1 - amount);
        reactFlowInstance.setViewport({...viewport, zoom: newZoom}, {duration: 0});
        requestAnimationFrame(() => handleViewportChange());
      }
    },
    [reactFlowInstance, handleViewportChange, wrapperRef]
  );

  // Обработчик для перетаскивания правой кнопкой мыши
  const handleRightMouseDrag = useCallback(
    (e: MouseEvent) => {
      // Обрабатываем только если правая кнопка мыши нажата и у нас сохранена начальная позиция
      if (getIsRightMouseDown() && initialMousePositionRef.current) {
        // Вычисляем смещение мыши с момента начала перетаскивания
        const dx = e.clientX - initialMousePositionRef.current.x;
        const dy = e.clientY - initialMousePositionRef.current.y;

        // Если есть сохраненный последний viewport, применяем смещение к нему
        if (lastViewportRef.current) {
          reactFlowInstance.setViewport(
            {
              x: lastViewportRef.current.x + dx,
              y: lastViewportRef.current.y + dy,
              zoom: lastViewportRef.current.zoom
            },
            {duration: 0}
          );
        }
      }
    },
    [getIsRightMouseDown, reactFlowInstance]
  );

  return {
    handleWheel,
    handleMouseDown,
    handleMouseUp,
    zoomToPointer,
    handleRightMouseDrag,
    initialMousePositionRef,
    lastViewportRef
  };
}
