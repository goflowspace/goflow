import {useCallback, useEffect, useRef, useState} from 'react';

import {useReactFlow} from '@xyflow/react';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';

interface UseViewportSyncProps {
  graphId: string;
}

export function useViewportSync({graphId}: UseViewportSyncProps) {
  const reactFlowInstance = useReactFlow();
  const setLayerViewport = useGraphStore((s) => s.setLayerViewport);
  const setViewportCenter = useCanvasStore((s) => s.setViewportCenter);
  const [currentGraphId, setCurrentGraphId] = useState(graphId);
  const isFirstSync = useRef(true);

  // Добавляем ref для последнего сохраненного вьюпорта
  const lastViewportRef = useRef({x: 0, y: 0, zoom: 1});
  // Таймер для debounce
  const debounceTimerRef = useRef<number | null>(null);

  // Сохраняем текущее состояние вьюпорта в хранилище
  const saveCurrentViewport = useCallback(() => {
    const viewport = reactFlowInstance.getViewport();

    if (currentGraphId) {
      setLayerViewport(currentGraphId, viewport);

      // Также сохраняем центр просмотра для использования при копировании/вставке
      const center = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
      setViewportCenter(center);

      // Проверяем, изменился ли вьюпорт значительно
      const lastViewport = lastViewportRef.current;
      const isSignificantChange = Math.abs(lastViewport.x - viewport.x) > 1 || Math.abs(lastViewport.y - viewport.y) > 1 || Math.abs(lastViewport.zoom - viewport.zoom) > 0.01;

      if (isSignificantChange) {
        // Обновляем последний сохраненный вьюпорт
        lastViewportRef.current = {...viewport};
        // Сохраняем вьюпорт в хранилище
        setLayerViewport(currentGraphId, viewport);
      }
    }
  }, [currentGraphId, reactFlowInstance, setLayerViewport, setViewportCenter]);

  // Обработчик изменения вьюпорта (масштабирование, панорамирование)
  const handleViewportChange = useCallback(() => {
    if (currentGraphId) {
      // Очищаем предыдущий таймер, если он существует
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // Устанавливаем новый таймер для debounce (300ms)
      debounceTimerRef.current = window.setTimeout(() => {
        saveCurrentViewport();
        debounceTimerRef.current = null;
      }, 300);
    }
  }, [currentGraphId, saveCurrentViewport]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Функция обновления текущего ID графа
  const updateCurrentGraphId = useCallback(
    (newGraphId: string) => {
      if (currentGraphId && currentGraphId !== newGraphId && !isFirstSync.current) {
        // Сохраняем вьюпорт предыдущего графа перед сменой
        saveCurrentViewport();
      }
      setCurrentGraphId(newGraphId);
      isFirstSync.current = false;
    },
    [currentGraphId, saveCurrentViewport]
  );

  return {
    saveCurrentViewport,
    handleViewportChange,
    currentGraphId,
    updateCurrentGraphId
  };
}
