import {useEffect, useRef, useState} from 'react';

import {Entity} from '@types-folder/entities';

import {useTeamStore} from '@store/useTeamStore';

import {imageGCSService} from '../services/imageGCS.service';
import {isOSS} from '../utils/edition';
import {isGCSMediaValue} from '../utils/imageAdapterUtils';
import {useCurrentProject} from './useCurrentProject';

interface ImageUrls {
  [entityId: string]: {
    [version: string]: string;
  };
}

interface BatchImageState {
  urls: ImageUrls;
  loading: boolean;
  error: string | null;
  loadedAt: Date | null;
}

/**
 * Hook для эффективной загрузки изображений множественных сущностей
 * Использует batch API для минимизации количества запросов
 */
export const useEntityImagesBatch = (entities: Entity[], types: Array<'original' | 'optimized' | 'thumbnail'> = ['thumbnail'], autoLoad: boolean = true) => {
  const {projectId} = useCurrentProject();
  const {currentTeam} = useTeamStore();

  const [state, setState] = useState<BatchImageState>({
    urls: {},
    loading: false,
    error: null,
    loadedAt: null
  });

  // Ref для отслеживания актуального списка сущностей
  const entitiesRef = useRef<Entity[]>([]);
  const typesRef = useRef<Array<'original' | 'optimized' | 'thumbnail'>>([]);

  // Проверяем, изменился ли список сущностей
  const entitiesChanged =
    entities.length !== entitiesRef.current.length || entities.some((entity, index) => entity.id !== entitiesRef.current[index]?.id) || types.some((type, index) => type !== typesRef.current[index]);

  const loadImages = async (force: boolean = false) => {
    const teamId = currentTeam?.id || (isOSS() ? 'local' : null);
    if (!projectId || !teamId || entities.length === 0) {
      setState((prev) => ({...prev, urls: {}, loadedAt: null}));
      return;
    }

    // Если данные не изменились и force не установлен, пропускаем
    if (!force && !entitiesChanged && state.loadedAt) {
      return;
    }

    // Фильтруем только сущности с валидными GCS изображениями
    const entitiesWithGCSImages = entities.filter((entity) => isGCSMediaValue(entity.image));

    if (entitiesWithGCSImages.length === 0) {
      setState((prev) => ({
        ...prev,
        urls: {},
        loading: false,
        error: null,
        loadedAt: new Date()
      }));
      return;
    }

    setState((prev) => ({...prev, loading: true, error: null}));

    try {
      const entityIds = entitiesWithGCSImages.map((entity) => entity.id);

      const urlsMap = await imageGCSService.getBatchAccess(teamId, projectId, entityIds, types);

      // Преобразуем Map в обычный объект для state
      const urlsObject: ImageUrls = {};
      urlsMap.forEach((versionMap, entityId) => {
        urlsObject[entityId] = {};
        versionMap.forEach((url, version) => {
          urlsObject[entityId][version] = url;
        });
      });

      setState((prev) => ({
        ...prev,
        urls: urlsObject,
        loading: false,
        error: null,
        loadedAt: new Date()
      }));

      // Обновляем ref для отслеживания изменений
      entitiesRef.current = entities;
      typesRef.current = types;
    } catch (err) {
      console.error('Ошибка batch загрузки изображений:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Неизвестная ошибка',
        loadedAt: null
      }));
    }
  };

  // Автоматическая загрузка при изменении данных
  useEffect(() => {
    if (autoLoad) {
      loadImages();
    }
  }, [projectId, currentTeam?.id, entitiesChanged, autoLoad]);

  // Функция для получения URL конкретного изображения
  const getImageUrl = (entityId: string, version: 'original' | 'optimized' | 'thumbnail' = 'thumbnail'): string | null => {
    return state.urls[entityId]?.[version] || null;
  };

  // Функция для получения thumbnail URL (наиболее частый случай)
  const getThumbnailUrl = (entityId: string): string | null => {
    return getImageUrl(entityId, 'thumbnail');
  };

  // Функция для принудительной перезагрузки
  const reload = () => {
    loadImages(true);
  };

  // Функция для предзагрузки изображений в браузер
  const preloadImages = (entityIds: string[], version: 'original' | 'optimized' | 'thumbnail' = 'thumbnail') => {
    entityIds.forEach((entityId) => {
      const url = getImageUrl(entityId, version);
      if (url) {
        const img = new window.Image();
        img.src = url;
        // Браузер автоматически кэширует изображение
      }
    });
  };

  return {
    // Данные
    urls: state.urls,
    loading: state.loading,
    error: state.error,
    loadedAt: state.loadedAt,

    // Функции
    getImageUrl,
    getThumbnailUrl,
    reload,
    preloadImages,

    // Метаинформация
    hasImages: Object.keys(state.urls).length > 0,
    loadedEntityCount: Object.keys(state.urls).length,
    totalEntityCount: entities.filter((e) => isGCSMediaValue(e.image)).length
  };
};

/**
 * Упрощенный hook только для thumbnail изображений
 */
export const useEntityThumbnails = (entities: Entity[], autoLoad: boolean = true) => {
  return useEntityImagesBatch(entities, ['thumbnail'], autoLoad);
};

/**
 * Hook для предзагрузки изображений при наведении/скролле
 */
export const useImagePreloader = () => {
  const preloadedImages = useRef(new Set<string>());

  const preloadImage = (url: string): void => {
    if (preloadedImages.current.has(url)) {
      return; // Уже предзагружено
    }

    const img = new window.Image();
    img.onload = () => preloadedImages.current.add(url);
    img.onerror = () => console.warn('Не удалось предзагрузить изображение:', url);
    img.src = url;
  };

  const preloadImages = (urls: string[]): void => {
    urls.forEach(preloadImage);
  };

  const clearPreloadedCache = (): void => {
    preloadedImages.current.clear();
  };

  return {
    preloadImage,
    preloadImages,
    clearPreloadedCache,
    preloadedCount: preloadedImages.current.size
  };
};
