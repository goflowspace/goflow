import {useCallback, useEffect, useRef} from 'react';

import {useReactFlow} from '@xyflow/react';

import {NodePosition} from './positioningLogic';

/**
 * Хранилище для текущей позиции курсора в координатах flow
 */
class CursorTracker {
  private static instance: CursorTracker;
  private currentPosition: NodePosition | null = null;
  private reactFlowInstance: any = null;

  private constructor() {}

  public static getInstance(): CursorTracker {
    if (!CursorTracker.instance) {
      CursorTracker.instance = new CursorTracker();
    }
    return CursorTracker.instance;
  }

  public setReactFlowInstance(instance: any): void {
    this.reactFlowInstance = instance;
  }

  public updatePosition(clientX: number, clientY: number): void {
    if (!this.reactFlowInstance || !this.reactFlowInstance.screenToFlowPosition) {
      return;
    }

    try {
      // Используем screenToFlowPosition с глобальными координатами
      // React Flow сам учитывает viewport и контейнер
      const flowPosition = this.reactFlowInstance.screenToFlowPosition({
        x: clientX,
        y: clientY
      });

      this.currentPosition = {
        x: flowPosition.x,
        y: flowPosition.y
      };
    } catch (error) {
      this.currentPosition = null;
    }
  }

  public getCurrentPosition(): NodePosition | null {
    return this.currentPosition;
  }

  public resetPosition(): void {
    this.currentPosition = null;
  }
}

/**
 * Hook для отслеживания позиции курсора в React Go Flow
 */
export function useCursorTracking() {
  const reactFlow = useReactFlow();
  const tracker = CursorTracker.getInstance();
  const isInitialized = useRef(false);

  // Инициализируем трекер с экземпляром React Go Flow
  useEffect(() => {
    if (reactFlow && !isInitialized.current) {
      tracker.setReactFlowInstance(reactFlow);
      isInitialized.current = true;
    }
  }, [reactFlow, tracker]);

  // Обработчик движения мыши
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      tracker.updatePosition(event.clientX, event.clientY);
    },
    [tracker]
  );

  // Подписываемся на события движения мыши
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove, {passive: true});

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  // Функция для получения текущей позиции курсора
  const getCurrentCursorPosition = useCallback(() => {
    return tracker.getCurrentPosition();
  }, [tracker]);

  return {
    getCurrentCursorPosition
  };
}

/**
 * Функция для получения текущей позиции курсора без hook
 */
export function getCurrentCursorPosition(): NodePosition | null {
  return CursorTracker.getInstance().getCurrentPosition();
}
