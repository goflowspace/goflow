import React, {useEffect, useRef, useState} from 'react';

interface UseFPSTrackerProps {
  isPanningRef?: React.MutableRefObject<boolean>;
  updateInterval?: number; // Интервал обновления в миллисекундах
}

/**
 * Оптимизированный хук для отслеживания FPS (кадров в секунду)
 * Использует requestAnimationFrame для измерения частоты обновления
 * Поддерживает дебаунс и отключение во время панорамирования
 */
export const useFPSTracker = ({
  isPanningRef,
  updateInterval = 2000 // Обновляем каждые 2 секунды вместо 1
}: UseFPSTrackerProps = {}): number => {
  const [fps, setFps] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | null>(null);
  const updateTimeoutRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const calculateFPS = () => {
      const now = performance.now();

      // Отключаем FPS tracker во время панорамирования для экономии ресурсов
      if (isPanningRef && isPanningRef.current) {
        rafIdRef.current = requestAnimationFrame(calculateFPS);
        return;
      }

      frameCountRef.current++;

      // Обновляем FPS с заданным интервалом
      if (now - lastTimeRef.current >= updateInterval) {
        const actualFPS = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));

        // Дебаунс обновления UI: обновляем не чаще чем раз в 500мс
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
        if (timeSinceLastUpdate >= 500) {
          // Используем setTimeout для дебаунса вместо немедленного setFps
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }

          updateTimeoutRef.current = window.setTimeout(() => {
            setFps(actualFPS);
            lastUpdateTimeRef.current = performance.now();
          }, 100); // Задержка 100мс для дебаунса
        }

        // Сброс счетчика
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(calculateFPS);
    };

    rafIdRef.current = requestAnimationFrame(calculateFPS);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [isPanningRef, updateInterval]);

  return fps;
};
