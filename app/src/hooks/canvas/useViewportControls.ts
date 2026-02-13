import React, {MutableRefObject, RefObject, useCallback, useRef} from 'react';

import {Viewport, useReactFlow} from '@xyflow/react';

import {useCanvasStore} from '@store/useCanvasStore';

import {useGestureHandlers} from './useGestureHandlers';

interface UseViewportControlsProps {
  wrapperRef: RefObject<HTMLDivElement | null>;
  onViewportChange?: (viewport: Viewport) => void;
  // Добавляем опциональный lastViewportRef для хранения последнего состояния вьюпорта
  lastViewportRef?: MutableRefObject<{x: number; y: number; zoom: number} | null>;
  // Добавляем isPanningRef для отслеживания состояния панорамирования
  isPanningRef?: MutableRefObject<boolean>;
}

/**
 * Хук для централизованного управления вьюпортом
 * Обеспечивает удобные функции для масштабирования, панорамирования и т.д.
 */
export function useViewportControls({wrapperRef, onViewportChange, lastViewportRef, isPanningRef}: UseViewportControlsProps) {
  const reactFlowInstance = useReactFlow();

  // Состояние панорамирования правой кнопкой мыши
  const isDraggingRef = useRef(false);
  const initialMousePosRef = useRef<{x: number; y: number} | null>(null);

  // Используем переданный lastViewportRef или создаем свой, если не передан
  const internalViewportRef = useRef<Viewport | null>(null);
  const initialViewportRef = lastViewportRef || internalViewportRef;

  // Обработчик изменения вьюпорта - вызывается после изменений вьюпорта
  const handleViewportChangeCallback = useCallback(() => {
    if (onViewportChange) {
      onViewportChange(reactFlowInstance.getViewport());
    }
  }, [reactFlowInstance, onViewportChange]);

  // Интегрируем оптимизированный хук для обработки жестов
  const {handleGesture, zoomToPointer, panCanvas} = useGestureHandlers({
    wrapperRef,
    onViewportChange: handleViewportChangeCallback
  });

  // Обработчики для перетаскивания правой кнопкой мыши
  const startPanning = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (event.button === 2) {
        // правая кнопка мыши
        event.preventDefault();

        // Сохраняем начальную позицию и вьюпорт
        isDraggingRef.current = true;
        initialMousePosRef.current = {x: event.clientX, y: event.clientY};
        initialViewportRef.current = reactFlowInstance.getViewport();

        // Устанавливаем состояние панорамирования для отключения AutoConnect
        if (isPanningRef) {
          isPanningRef.current = true;
        }

        // Также обновляем состояние в CanvasStore для доступа из других компонентов
        const {setIsPanning} = useCanvasStore.getState();
        setIsPanning(true);

        // Устанавливаем курсор перетаскивания
        if (wrapperRef.current) {
          wrapperRef.current.style.cursor = 'grabbing';
        }
      }
    },
    [reactFlowInstance, wrapperRef, initialViewportRef, isPanningRef]
  );

  const movePanning = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (isDraggingRef.current && initialMousePosRef.current && initialViewportRef.current) {
        const dx = event.clientX - initialMousePosRef.current.x;
        const dy = event.clientY - initialMousePosRef.current.y;

        reactFlowInstance.setViewport(
          {
            x: initialViewportRef.current.x + dx,
            y: initialViewportRef.current.y + dy,
            zoom: initialViewportRef.current.zoom
          },
          {duration: 0}
        );
      }
    },
    [reactFlowInstance, initialViewportRef]
  );

  const stopPanning = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (event.button === 2 && isDraggingRef.current) {
        event.preventDefault();

        // Сбрасываем состояние перетаскивания
        isDraggingRef.current = false;
        initialMousePosRef.current = null;

        // Сбрасываем состояние панорамирования для включения AutoConnect
        if (isPanningRef) {
          isPanningRef.current = false;
        }

        // Также сбрасываем состояние в CanvasStore
        const {setIsPanning} = useCanvasStore.getState();
        setIsPanning(false);

        // Возвращаем обычный курсор
        if (wrapperRef.current) {
          wrapperRef.current.style.cursor = '';
        }

        // Уведомляем об изменении viewport
        if (onViewportChange) {
          handleViewportChangeCallback();
        }
      }
    },
    [reactFlowInstance, wrapperRef, onViewportChange, handleViewportChangeCallback, isPanningRef]
  );

  // Функции для клавиатурного управления
  const zoomIn = useCallback(() => {
    try {
      // Получаем размеры контейнера
      const containerBounds = wrapperRef.current?.getBoundingClientRect();
      if (containerBounds) {
        // Создаем событие "мыши" с координатами в центре экрана
        const centerEvent = {
          clientX: containerBounds.left + containerBounds.width / 2,
          clientY: containerBounds.top + containerBounds.height / 2
        } as MouseEvent;

        // Используем zoomToPointer для масштабирования относительно центра
        zoomToPointer(centerEvent, 1.2);
      } else {
        // Fallback к простому масштабированию
        const viewport = reactFlowInstance.getViewport();
        reactFlowInstance.setViewport({...viewport, zoom: viewport.zoom * 1.2}, {duration: 150});

        if (onViewportChange) {
          setTimeout(() => handleViewportChangeCallback(), 150);
        }
      }
    } catch (error) {
      // Fallback к простому масштабированию при ошибке
      const viewport = reactFlowInstance.getViewport();
      reactFlowInstance.setViewport({...viewport, zoom: viewport.zoom * 1.2}, {duration: 150});

      if (onViewportChange) {
        setTimeout(() => handleViewportChangeCallback(), 150);
      }
    }
  }, [reactFlowInstance, onViewportChange, handleViewportChangeCallback, zoomToPointer, wrapperRef]);

  const zoomOut = useCallback(() => {
    try {
      // Получаем размеры контейнера
      const containerBounds = wrapperRef.current?.getBoundingClientRect();
      if (containerBounds) {
        // Создаем событие "мыши" с координатами в центре экрана
        const centerEvent = {
          clientX: containerBounds.left + containerBounds.width / 2,
          clientY: containerBounds.top + containerBounds.height / 2
        } as MouseEvent;

        // Используем zoomToPointer для масштабирования относительно центра
        zoomToPointer(centerEvent, 0.8);
      } else {
        // Fallback к простому масштабированию
        const viewport = reactFlowInstance.getViewport();
        reactFlowInstance.setViewport({...viewport, zoom: viewport.zoom * 0.8}, {duration: 150});

        if (onViewportChange) {
          setTimeout(() => handleViewportChangeCallback(), 150);
        }
      }
    } catch (error) {
      // Fallback к простому масштабированию при ошибке
      const viewport = reactFlowInstance.getViewport();
      reactFlowInstance.setViewport({...viewport, zoom: viewport.zoom * 0.8}, {duration: 150});

      if (onViewportChange) {
        setTimeout(() => handleViewportChangeCallback(), 150);
      }
    }
  }, [reactFlowInstance, onViewportChange, handleViewportChangeCallback, zoomToPointer, wrapperRef]);

  const resetView = useCallback(() => {
    try {
      reactFlowInstance.fitView({duration: 500});
    } catch (error) {
      // Игнорируем ошибки
    }

    if (onViewportChange) {
      setTimeout(() => {
        try {
          handleViewportChangeCallback();
        } catch (err) {
          // Игнорируем ошибки
        }
      }, 500);
    }
  }, [reactFlowInstance, onViewportChange, handleViewportChangeCallback]);

  // Функция для сброса масштаба в 100%
  const resetZoomTo100 = useCallback(() => {
    try {
      // Получаем размеры контейнера
      const containerBounds = wrapperRef.current?.getBoundingClientRect();
      const viewport = reactFlowInstance.getViewport();

      if (containerBounds) {
        // Создаем событие "мыши" с координатами в центре экрана
        const centerEvent = {
          clientX: containerBounds.left + containerBounds.width / 2,
          clientY: containerBounds.top + containerBounds.height / 2
        } as MouseEvent;

        // Получаем позицию курсора на холсте
        const pointerX = centerEvent.clientX - containerBounds.left;
        const pointerY = centerEvent.clientY - containerBounds.top;

        // Вычисляем позицию курсора в мировых координатах
        const worldX = (pointerX - viewport.x) / viewport.zoom;
        const worldY = (pointerY - viewport.y) / viewport.zoom;

        // Вычисляем новую позицию viewportа для zoom = 1
        const newX = pointerX - worldX * 1; // 1 - это новый масштаб (100%)
        const newY = pointerY - worldY * 1;

        // Применяем новый viewport с анимацией
        reactFlowInstance.setViewport(
          {
            x: newX,
            y: newY,
            zoom: 1
          },
          {duration: 300}
        );
      } else {
        // Fallback к простому масштабированию
        reactFlowInstance.setViewport(
          {
            x: viewport.x,
            y: viewport.y,
            zoom: 1
          },
          {duration: 300}
        );
      }
    } catch (error) {
      // Fallback при ошибке
      const viewport = reactFlowInstance.getViewport();
      reactFlowInstance.setViewport(
        {
          x: viewport.x,
          y: viewport.y,
          zoom: 1
        },
        {duration: 300}
      );
    }

    if (onViewportChange) {
      setTimeout(() => {
        try {
          handleViewportChangeCallback();
        } catch (err) {
          // Игнорируем ошибки
        }
      }, 300);
    }
  }, [reactFlowInstance, onViewportChange, handleViewportChangeCallback, wrapperRef]);

  return {
    // Базовые функции для управления вьюпортом
    zoomToPointer,
    panCanvas,
    handleViewportChange: handleViewportChangeCallback,

    // Клавиатурные команды
    zoomIn,
    zoomOut,
    resetView,
    resetZoomTo100,

    // Обработчики для панорамирования мышью
    handleMouseDown: startPanning,
    handleMouseMove: movePanning,
    handleMouseUp: stopPanning,

    // Обработчик жестов
    handleGesture,

    // Флаг, показывающий активно ли перетаскивание
    isDragging: isDraggingRef.current
  };
}

/**
 * Хук для проверки наличия узлов на холсте
 * @returns boolean - true, если на холсте есть хотя бы один узел
 */
export const useHasNodes = (): boolean => {
  const nodes = useCanvasStore((state) => state.nodes);
  return nodes.length > 0;
};
