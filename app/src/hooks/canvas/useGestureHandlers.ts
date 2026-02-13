import {RefObject, useCallback, useRef} from 'react';

import {useReactFlow} from '@xyflow/react';

interface UseGestureHandlersProps {
  wrapperRef: RefObject<HTMLDivElement | null>;
  onViewportChange?: () => void;
}

/**
 * Хук для унифицированной обработки жестов масштабирования и панорамирования
 * Обрабатывает:
 * - Пинч-зум (сенсорный ввод)
 * - Колесо мыши для масштабирования и панорамирования
 * - Масштабирование с Ctrl/Cmd+колесо
 * - Горизонтальное панорамирование с Shift+колесо
 */
export function useGestureHandlers({wrapperRef, onViewportChange}: UseGestureHandlersProps) {
  const reactFlowInstance = useReactFlow();

  // Хранит состояние для пинч-жестов
  const gestureStateRef = useRef({
    isActive: false,
    startZoom: 1,
    startDistance: 0
  });

  // Получает границы канваса для вычисления координат
  const getCanvasBounds = useCallback(() => {
    if (wrapperRef.current) {
      return wrapperRef.current.getBoundingClientRect();
    }
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }, [wrapperRef]);

  // Преобразует экранные координаты в координаты канваса
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const bounds = getCanvasBounds();
      return {
        x: clientX - bounds.left,
        y: clientY - bounds.top
      };
    },
    [getCanvasBounds]
  );

  // Определяет тип события колеса для правильной обработки
  const classifyWheelEvent = useCallback((event: WheelEvent) => {
    // Определяем, это колесо мыши или тачпад по deltaMode и величине deltaY
    const isMouse = event.deltaMode !== 0 || Math.abs(event.deltaY) > 100;

    return {
      isMouse,
      isZoomEvent: event.ctrlKey || event.metaKey, // Ctrl/Cmd+колесо = масштабирование
      isPanEvent: event.shiftKey, // Shift+колесо = горизонтальное панорамирование
      zoomDirection: event.deltaY < 0 ? 1 : -1 // Направление масштабирования
    };
  }, []);

  // Масштабирование относительно положения курсора
  const zoomToPointer = useCallback(
    (event: MouseEvent | WheelEvent | TouchEvent, zoomFactor: number) => {
      try {
        // Получаем текущий viewport
        const viewport = reactFlowInstance.getViewport();

        // Координаты курсора зависят от типа события
        let clientX: number, clientY: number;

        if ('clientX' in event) {
          // Мышиное событие
          clientX = event.clientX;
          clientY = event.clientY;
        } else if ('touches' in event && event.touches.length > 0) {
          // Сенсорное событие
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
        } else {
          // Если координаты недоступны, используем центр канваса
          const bounds = getCanvasBounds();
          clientX = bounds.left + bounds.width / 2;
          clientY = bounds.top + bounds.height / 2;
        }

        // Вычисляем позицию курсора на канвасе
        const {x: pointerX, y: pointerY} = screenToCanvas(clientX, clientY);

        // Вычисляем позицию курсора в мировых координатах
        const worldX = (pointerX - viewport.x) / viewport.zoom;
        const worldY = (pointerY - viewport.y) / viewport.zoom;

        // Новый масштаб
        const newZoom = viewport.zoom * zoomFactor;

        // Ограничиваем масштаб минимальным и максимальным значениями
        const clampedZoom = Math.max(0.01, Math.min(newZoom, 2.5));

        // Вычисляем новую позицию viewport
        const newX = pointerX - worldX * clampedZoom;
        const newY = pointerY - worldY * clampedZoom;

        // Применяем новый viewport без анимации для отзывчивости
        reactFlowInstance.setViewport(
          {
            x: newX,
            y: newY,
            zoom: clampedZoom
          },
          {duration: 0}
        );

        // Уведомляем об изменении
        if (onViewportChange) {
          requestAnimationFrame(onViewportChange);
        }
      } catch (error) {
        console.warn('Zoom to pointer failed, using fallback', error);

        // Fallback: масштабирование без привязки к курсору
        const viewport = reactFlowInstance.getViewport();
        const newZoom = Math.max(0.01, Math.min(viewport.zoom * zoomFactor, 2.5));

        reactFlowInstance.setViewport(
          {
            ...viewport,
            zoom: newZoom
          },
          {duration: 0}
        );

        if (onViewportChange) {
          requestAnimationFrame(onViewportChange);
        }
      }
    },
    [reactFlowInstance, screenToCanvas, getCanvasBounds, onViewportChange]
  );

  // Панорамирование на указанное смещение
  const panCanvas = useCallback(
    (dx: number, dy: number) => {
      const viewport = reactFlowInstance.getViewport();

      reactFlowInstance.setViewport(
        {
          x: viewport.x + dx,
          y: viewport.y + dy,
          zoom: viewport.zoom
        },
        {duration: 0}
      );

      if (onViewportChange) {
        requestAnimationFrame(onViewportChange);
      }
    },
    [reactFlowInstance, onViewportChange]
  );

  // Универсальный обработчик жестов
  const handleGesture = useCallback(
    (event: Event) => {
      // Обработка сенсорных жестов (пинч)
      if (event.type === 'gesturestart' || event.type === 'gesturechange' || event.type === 'gestureend') {
        event.preventDefault(); // Предотвращаем стандартное поведение браузера

        const gestureEvent = event as any; // TypeScript не имеет встроенных типов для gesture events

        if (event.type === 'gesturestart') {
          // Запоминаем начальное состояние
          const viewport = reactFlowInstance.getViewport();
          gestureStateRef.current = {
            isActive: true,
            startZoom: viewport.zoom,
            startDistance: gestureEvent.scale
          };
        } else if (event.type === 'gesturechange' && gestureStateRef.current.isActive) {
          // Рассчитываем коэффициент масштабирования на основе изменения расстояния
          const scaleChange = gestureEvent.scale / gestureStateRef.current.startDistance;
          const scaleFactor = scaleChange > 1.02 ? 1.02 : scaleChange < 0.98 ? 0.98 : 1;

          if (scaleFactor !== 1) {
            // Масштабируем с учетом центра жеста
            zoomToPointer(gestureEvent, scaleFactor);

            // Обновляем опорную точку для следующего шага
            gestureStateRef.current.startDistance = gestureEvent.scale;
          }
        } else if (event.type === 'gestureend') {
          // Завершаем жест
          gestureStateRef.current.isActive = false;
        }

        return; // Не обрабатываем дальше, если это жест
      }

      // Обработка колеса мыши
      if (event.type === 'wheel') {
        const wheelEvent = event as WheelEvent;
        const {isMouse, isZoomEvent, isPanEvent, zoomDirection} = classifyWheelEvent(wheelEvent);

        // Масштабирование при Ctrl/Cmd+колесо
        if (isZoomEvent) {
          event.preventDefault();
          const zoomFactor = zoomDirection > 0 ? 1.1 : 0.9;
          zoomToPointer(wheelEvent, zoomFactor);
          return;
        }

        // Горизонтальное панорамирование при Shift+колесо
        if (isPanEvent) {
          event.preventDefault();
          const panSpeed = isMouse ? 15 : 3; // Больше скорость для колеса, меньше для тачпада
          panCanvas(wheelEvent.deltaY * panSpeed, 0);
          return;
        }

        // Обычное прокручивание колесом мыши (не тачпад) = масштабирование
        if (isMouse) {
          event.preventDefault();
          const zoomFactor = zoomDirection > 0 ? 1.1 : 0.9;
          zoomToPointer(wheelEvent, zoomFactor);
        }
        // Прокручивание тачпадом без модификаторов не перехватываем
      }
    },
    [reactFlowInstance, zoomToPointer, panCanvas, classifyWheelEvent]
  );

  return {
    handleGesture,
    zoomToPointer,
    panCanvas
  };
}
