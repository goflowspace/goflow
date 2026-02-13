import {useEffect} from 'react';

import {syncGraphToCanvas} from '../utils/syncGraphToCanvas';

/**
 * Хук для синхронизации GraphStore с CanvasStore
 * Выделен в отдельный хук для переиспользования и тестируемости
 */
export function useGraphCanvasSync(graphId: string, isProjectReady: boolean) {
  useEffect(() => {
    if (!isProjectReady) {
      return;
    }

    console.log('GraphCanvasSync: Setting up sync for graph:', graphId);
    const unsubscribe = syncGraphToCanvas();

    return () => {
      console.log('GraphCanvasSync: Cleaning up sync for graph:', graphId);
      unsubscribe?.();
    };
  }, [graphId, isProjectReady]);
}
