import React from 'react';

import {ImagePlaceholder} from '../components/common/ImagePlaceholder';
import {MediaValue} from '../types/entities';

/**
 * Утилиты для работы с GCS изображениями
 */

// Проверка, является ли MediaValue валидным GCS форматом
export const isGCSMediaValue = (value: any): value is MediaValue => {
  // Проверяем на unset значение из MongoDB/Prisma
  if (value && value.unset === true) {
    return false;
  }

  return value && typeof value === 'object' && value.type === 'image' && (value.storage === 'gcs' || value.storage === 'local') && value.thumbnail && typeof value.thumbnail.gcsPath === 'string';
};

/**
 * Функция для получения proxy URL thumbnail из GCS (deprecated - используйте imageGCSService.getThumbnailProxyUrl)
 */
export const getThumbnailProxyUrl = (teamId: string, projectId: string, entityId: string, parameterId: string, mediaValue?: MediaValue): string => {
  // Генерируем cache buster на основе имени файла
  let cacheBuster = '';

  if (mediaValue && mediaValue.thumbnail?.gcsPath) {
    const pathParts = mediaValue.thumbnail.gcsPath.split('/');
    const filename = pathParts[pathParts.length - 1];
    // Используем полное имя файла как cache buster - надежнее чем парсинг
    cacheBuster = `?v=${encodeURIComponent(filename)}`;
  }

  return `/images/proxy/thumbnail/${teamId}/${projectId}/${entityId}/${parameterId}${cacheBuster}`;
};

/**
 * Проверяет, есть ли у сущности изображение
 */
export const hasEntityImage = (entity: {image?: MediaValue}): boolean => {
  return entity.image ? isGCSMediaValue(entity.image) : false;
};

/**
 * Получает метаданные изображения из GCS MediaValue
 */
export const getImageMetadata = (
  mediaValue: MediaValue
): {
  width: number;
  height: number;
  size: number;
  mimeType: string;
} | null => {
  if (!mediaValue || !isGCSMediaValue(mediaValue)) return null;

  const metadata = mediaValue.thumbnail?.metadata;

  if (!metadata) return null;

  return {
    width: metadata.width,
    height: metadata.height,
    size: metadata.size,
    mimeType: metadata.mimeType
  };
};

/**
 * Создает fallback изображение для ошибок загрузки
 */
export const createImageFallback = (alt: string = '', size: {width?: number; height?: number} = {}): React.ReactElement => {
  const sizeType = size.width && size.width <= 32 ? 'small' : size.width && size.width <= 64 ? 'medium' : 'large';

  return <ImagePlaceholder size={sizeType} alt={alt} style={size} />;
};
