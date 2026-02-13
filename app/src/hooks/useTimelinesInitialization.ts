import {useEffect} from 'react';

import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {ProjectDataService} from '@services/projectDataService';

import {useGraphStore} from '@store/useGraphStore';
import {useTimelinesStore} from '@store/useTimelinesStore';

/**
 * Хук для инициализации таймлайнов при загрузке проекта
 * Теперь работает с новым API и не конфликтует с загрузкой с сервера
 */
export const useTimelinesInitialization = () => {
  const {timelineId: routeTimelineId} = useCurrentRoute();
  const hasLoadedFromStorage = useGraphStore((state) => state.hasLoadedFromStorage);
  const switchToTimeline = useGraphStore((state) => state.switchToTimeline);
  const currentTimelineIdInGraph = useGraphStore((state) => state.currentTimelineId);

  const {switchTimeline, currentTimelineId: currentTimelineIdInTimelines, timelines, loading} = useTimelinesStore();

  // Избегаем пересоздания массива timelines в каждом рендере
  const timelinesLength = timelines.length;
  const timelineIds = timelines.map((t) => t.id).join(',');

  // Синхронизируем текущий таймлайн между stores и route
  // Только после того, как таймлайны загрузились и не во время loading
  useEffect(() => {
    // Пропускаем инициализацию если нет таймлайна в URL (например, во время редиректа)
    if (!hasLoadedFromStorage || !routeTimelineId || loading || timelines.length === 0) {
      return;
    }

    const timelineExists = timelines.some((t) => t.id === routeTimelineId);

    if (timelineExists) {
      // Если URL содержит другой таймлайн, переключаемся на него
      if (currentTimelineIdInTimelines !== routeTimelineId) {
        console.log('🔄 Switching to timeline from URL:', routeTimelineId);
        switchTimeline(routeTimelineId);
      }

      // Синхронизируем с GraphStore
      if (currentTimelineIdInGraph !== routeTimelineId) {
        console.log('🔄 Syncing GraphStore to timeline:', routeTimelineId);
        switchToTimeline(routeTimelineId);
      }
    } else {
      console.warn(
        `⚠️ Timeline ${routeTimelineId} from URL not found in loaded timelines (${timelines.length})`,
        timelines.map((t) => t.id)
      );

      // Если таймлайн из URL не найден, переключаемся на первый доступный
      // Но только если у нас еще нет активного таймлайна И URL содержит валидный timeline ID
      // (чтобы избежать циклов при routeTimelineId = undefined)
      if (timelines.length > 0 && !currentTimelineIdInTimelines && routeTimelineId && routeTimelineId !== 'undefined') {
        const firstTimeline = timelines[0];
        console.log('🔄 Switching to first available timeline:', firstTimeline.id);
        switchTimeline(firstTimeline.id);
        if (currentTimelineIdInGraph !== firstTimeline.id) {
          switchToTimeline(firstTimeline.id);
        }
      }
    }
  }, [
    hasLoadedFromStorage,
    routeTimelineId,
    currentTimelineIdInTimelines,
    currentTimelineIdInGraph,
    timelinesLength,
    timelineIds,
    loading
    // Убираем switchTimeline, switchToTimeline и timelines чтобы избежать бесконечного цикла
  ]);
};
