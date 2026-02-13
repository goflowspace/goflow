import React, {useCallback, useEffect, useState} from 'react';

import {MediaValue} from '@types-folder/entities';

import {useCurrentProject} from '../../../hooks/useCurrentProject';
import {imageGCSService} from '../../../services/imageGCS.service';
import {useTeamStore} from '../../../store/useTeamStore';
import {isOSS} from '../../../utils/edition';
import {isGCSMediaValue} from '../../../utils/imageAdapterUtils';
import {ImagePlaceholder} from '../ImagePlaceholder';

interface GCSImageProps {
  mediaValue: MediaValue | null | undefined;
  entityId: string;
  parameterId: string;
  version?: 'thumbnail' | 'optimized' | 'original';
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
}

/**
 * Компонент для отображения изображений из GCS
 * Поддерживает proxy для thumbnail и signed URLs для больших изображений
 */
export const GCSImage: React.FC<GCSImageProps> = ({
  mediaValue,
  entityId,
  parameterId,
  version = 'thumbnail',
  alt = '',
  className = '',
  style = {},
  fallback = <ImagePlaceholder />,
  onLoad,
  onError,
  lazy = true
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);

  const {projectId} = useCurrentProject();
  const {currentTeam} = useTeamStore();

  // Intersection Observer для lazy loading
  const imgRef = React.useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!lazy) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {rootMargin: '50px'}
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);

  // Загрузка URL изображения
  const loadImageUrl = useCallback(async () => {
    const teamId = currentTeam?.id || (isOSS() ? 'local' : null);
    if (!mediaValue || !projectId || !teamId || !isInView) return;

    // Проверяем, что это GCS/local MediaValue
    if (mediaValue.storage !== 'gcs' && mediaValue.storage !== 'local') {
      console.warn('MediaValue не является GCS/local типом:', mediaValue);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      if (version === 'thumbnail') {
        // Для thumbnail используем proxy URL с cache busting
        const proxyUrl = imageGCSService.getThumbnailProxyUrl(teamId, projectId, entityId, parameterId, mediaValue);
        setImageUrl(proxyUrl);
      } else {
        // Для больших изображений получаем signed URL
        const signedUrl = await imageGCSService.getSignedUrl(teamId, projectId, entityId, parameterId, version);
        setImageUrl(signedUrl);
      }
    } catch (error) {
      console.error('Ошибка загрузки GCS изображения:', error);
      setHasError(true);
      onError?.();
    } finally {
      setIsLoading(false);
    }
  }, [mediaValue, projectId, currentTeam?.id, entityId, parameterId, version, isInView, onError]);

  useEffect(() => {
    loadImageUrl();
  }, [loadImageUrl]);

  // Обработчики изображения
  const handleImageLoad = useCallback(() => {
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    console.error('Ошибка загрузки изображения:', imageUrl);
    setHasError(true);
    onError?.();
  }, [imageUrl, onError]);

  // Если нет MediaValue или ошибка - показываем fallback
  if (!mediaValue || hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  // Если загружается - показываем placeholder
  if (isLoading || !imageUrl) {
    return <ImagePlaceholder className={className} style={style} />;
  }

  return <img ref={imgRef} src={imageUrl} alt={alt} className={`gcs-image ${className}`} style={style} onLoad={handleImageLoad} onError={handleImageError} loading={lazy ? 'lazy' : 'eager'} />;
};

/**
 * Упрощенный компонент для thumbnail изображений (только proxy)
 */
export const GCSThumbnail: React.FC<{
  mediaValue: MediaValue | null | undefined;
  entityId: string;
  parameterId: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}> = (props) => {
  return <GCSImage {...props} version='thumbnail' />;
};

/**
 * Hook для предзагрузки изображений списка сущностей
 */
export const usePreloadEntityImages = (entities: Array<{id: string; image?: MediaValue}>, version: 'thumbnail' | 'optimized' = 'thumbnail') => {
  const {projectId} = useCurrentProject();
  const {currentTeam} = useTeamStore();
  const [preloadedUrls, setPreloadedUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const teamId = currentTeam?.id || (isOSS() ? 'local' : null);
    if (!projectId || !teamId || entities.length === 0) return;

    const loadUrls = async () => {
      try {
        // Собираем все entityId, у которых есть изображения
        const entityIds = entities.filter((entity) => isGCSMediaValue(entity.image)).map((entity) => entity.id);

        if (entityIds.length === 0) return;

        // Получаем batch URLs
        const urlsMap = await imageGCSService.getBatchAccess(teamId, projectId, entityIds, [version]);

        // Обновляем состояние
        const newPreloadedUrls = new Map<string, string>();
        urlsMap.forEach((versionMap, entityId) => {
          const url = versionMap.get(version);
          if (url) {
            newPreloadedUrls.set(entityId, url);
          }
        });

        setPreloadedUrls(newPreloadedUrls);
      } catch (error) {
        console.error('Ошибка предзагрузки изображений:', error);
      }
    };

    loadUrls();
  }, [entities, projectId, currentTeam?.id, version]);

  return preloadedUrls;
};

export default GCSImage;
