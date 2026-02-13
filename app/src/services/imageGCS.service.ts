import {BatchAccessRequest, GCSImageRequest, ImageUploadGCSRequest, MediaValue, SignedUrlRequest, SignedUrlResponse} from '@types-folder/entities';

import {api} from './api';

/**
 * Интерфейс для кэширования signed URLs
 */
interface CachedUrl {
  url: string;
  expiresAt: Date;
  version: 'original' | 'optimized' | 'thumbnail';
}

/**
 * Сервис для работы с GCS изображениями
 * Реализует гибридную стратегию: proxy для thumbnail, signed URLs для больших изображений
 */
export class ImageGCSService {
  private urlCache = new Map<string, CachedUrl>();
  private loadingPromises = new Map<string, Promise<string>>();

  /**
   * Строит ключ для кэширования URL
   */
  private buildCacheKey(teamId: string, projectId: string, entityId: string, parameterId: string, version: string): string {
    return `${teamId}:${projectId}:${entityId}:${parameterId}:${version}`;
  }

  /**
   * Получает URL для thumbnail через proxy (кэшируется браузером)
   */
  getThumbnailProxyUrl(teamId: string, projectId: string, entityId: string, parameterId: string, mediaValue?: MediaValue): string {
    // Генерируем cache buster на основе имени файла
    let cacheBuster: string | undefined;

    if (mediaValue && mediaValue.thumbnail?.gcsPath) {
      // Используем имя файла как cache buster - это надежнее чем парсинг timestamp
      const pathParts = mediaValue.thumbnail.gcsPath.split('/');
      const filename = pathParts[pathParts.length - 1];
      cacheBuster = filename;
    }

    return api.getThumbnailProxyUrl(teamId, projectId, entityId, parameterId, cacheBuster);
  }

  /**
   * Загружает изображение в GCS
   */
  async uploadImage(request: ImageUploadGCSRequest): Promise<MediaValue> {
    try {
      console.log('📤 Uploading to GCS:', request);

      const mediaValue = await api.uploadImageGCS(request);

      console.log('📥 GCS Upload response:', mediaValue);

      // Очищаем кэш для этого изображения
      this.clearImageCache(request.teamId, request.projectId, request.entityId, request.parameterId);

      return mediaValue;
    } catch (error) {
      console.error('❌ GCS Upload failed:', error);
      throw new Error(`Ошибка загрузки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получает signed URL для большого изображения
   */
  async getSignedUrl(teamId: string, projectId: string, entityId: string, parameterId: string, version: 'original' | 'optimized' | 'thumbnail' = 'optimized'): Promise<string> {
    const cacheKey = this.buildCacheKey(teamId, projectId, entityId, parameterId, version);

    // Проверяем кэш
    const cached = this.urlCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.url;
    }

    // Проверяем, не загружается ли уже этот URL
    const loadingKey = `${cacheKey}:loading`;
    if (this.loadingPromises.has(loadingKey)) {
      return await this.loadingPromises.get(loadingKey)!;
    }

    // Создаем промис для загрузки
    const loadingPromise = this.fetchSignedUrl(teamId, projectId, [
      {
        entityId,
        parameterId,
        version
      }
    ]).then((urls) => {
      if (urls.length === 0) {
        throw new Error('URL не получен');
      }
      return urls[0].signedUrl;
    });

    this.loadingPromises.set(loadingKey, loadingPromise);

    try {
      const url = await loadingPromise;

      // Кэшируем результат
      this.urlCache.set(cacheKey, {
        url,
        expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000), // 20 часов (запас)
        version
      });

      return url;
    } finally {
      this.loadingPromises.delete(loadingKey);
    }
  }

  /**
   * Получает multiple signed URLs за один запрос
   */
  async getBatchSignedUrls(
    teamId: string,
    projectId: string,
    requests: GCSImageRequest[]
  ): Promise<
    Array<{
      entityId: string;
      parameterId: string;
      version: 'original' | 'optimized' | 'thumbnail';
      signedUrl: string;
    }>
  > {
    try {
      // Фильтруем запросы, исключая те, что есть в кэше
      const uncachedRequests: GCSImageRequest[] = [];
      const cachedResults: Array<{
        entityId: string;
        parameterId: string;
        version: 'original' | 'optimized' | 'thumbnail';
        signedUrl: string;
      }> = [];

      for (const request of requests) {
        const cacheKey = this.buildCacheKey(teamId, projectId, request.entityId, request.parameterId, request.version);
        const cached = this.urlCache.get(cacheKey);

        if (cached && cached.expiresAt > new Date()) {
          cachedResults.push({
            entityId: request.entityId,
            parameterId: request.parameterId,
            version: request.version,
            signedUrl: cached.url
          });
        } else {
          uncachedRequests.push(request);
        }
      }

      // Если все URLs в кэше
      if (uncachedRequests.length === 0) {
        return cachedResults;
      }

      // Загружаем недостающие URLs
      const newUrls = await this.fetchSignedUrl(teamId, projectId, uncachedRequests);

      // Кэшируем новые URLs
      newUrls.forEach((urlData) => {
        const cacheKey = this.buildCacheKey(teamId, projectId, urlData.entityId, urlData.parameterId, urlData.version);
        this.urlCache.set(cacheKey, {
          url: urlData.signedUrl,
          expiresAt: new Date(urlData.expiresAt),
          version: urlData.version
        });
      });

      // Объединяем кэшированные и новые результаты
      return [...cachedResults, ...newUrls];
    } catch (error) {
      console.error('Ошибка получения batch signed URLs:', error);
      return [];
    }
  }

  /**
   * Batch доступ для списков сущностей (оптимизированный)
   */
  async getBatchAccess(teamId: string, projectId: string, entityIds: string[], types: Array<'original' | 'optimized' | 'thumbnail'> = ['thumbnail']): Promise<Map<string, Map<string, string>>> {
    try {
      const request: BatchAccessRequest = {
        teamId,
        projectId,
        entityIds,
        types
      };

      const response = await api.getBatchImageAccess(request);

      if (!response.success || !response.data) {
        return new Map();
      }

      // Организуем результат в удобную структуру
      const resultMap = new Map<string, Map<string, string>>();

      response.data.forEach((urlData: any) => {
        if (!resultMap.has(urlData.entityId)) {
          resultMap.set(urlData.entityId, new Map());
        }
        resultMap.get(urlData.entityId)!.set(urlData.version, urlData.signedUrl);

        // Кэшируем URL
        const cacheKey = this.buildCacheKey(teamId, projectId, urlData.entityId, urlData.parameterId, urlData.version);
        this.urlCache.set(cacheKey, {
          url: urlData.signedUrl,
          expiresAt: new Date(urlData.expiresAt),
          version: urlData.version
        });
      });

      return resultMap;
    } catch (error) {
      console.error('Ошибка batch access:', error);
      return new Map();
    }
  }

  /**
   * Внутренний метод для запроса signed URLs у API
   */
  private async fetchSignedUrl(
    teamId: string,
    projectId: string,
    imageIds: GCSImageRequest[]
  ): Promise<
    Array<{
      entityId: string;
      parameterId: string;
      version: 'original' | 'optimized' | 'thumbnail';
      signedUrl: string;
      expiresAt: string;
    }>
  > {
    const response = await api.getImageSignedUrls({
      teamId,
      projectId,
      imageIds
    });

    if (!response.success) {
      throw new Error(response.error || 'Ошибка получения signed URL');
    }

    return response.data || [];
  }

  /**
   * Удаляет изображение из GCS и кэша
   */
  async deleteImage(teamId: string, projectId: string, entityId: string, parameterId: string): Promise<boolean> {
    try {
      const response = await api.deleteImageGCS(teamId, projectId, entityId, parameterId);

      if (response.success) {
        this.clearImageCache(teamId, projectId, entityId, parameterId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Ошибка удаления изображения:', error);
      return false;
    }
  }

  /**
   * Получает статистику использования хранилища команды
   */
  async getStorageUsage(teamId: string): Promise<{
    totalSizeBytes: number;
    imageCount: number;
    formattedSize: string;
  } | null> {
    try {
      const data = await api.getStorageUsage(teamId);

      return {
        totalSizeBytes: data.totalSizeBytes,
        imageCount: data.imageCount,
        formattedSize: this.formatFileSize(data.totalSizeBytes)
      };
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return null;
    }
  }

  /**
   * Очищает кэш для конкретного изображения
   */
  clearImageCache(teamId: string, projectId: string, entityId: string, parameterId: string): void {
    const versions = ['original', 'optimized', 'thumbnail'];
    versions.forEach((version) => {
      const cacheKey = this.buildCacheKey(teamId, projectId, entityId, parameterId, version);
      this.urlCache.delete(cacheKey);
    });
  }

  /**
   * Очистка всего кэша (например, при смене проекта)
   */
  clearAllCache(): void {
    this.urlCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Очистка устаревших записей из кэша
   */
  cleanExpiredCache(): void {
    const now = new Date();
    for (const [key, cached] of this.urlCache.entries()) {
      if (cached.expiresAt <= now) {
        this.urlCache.delete(key);
      }
    }
  }

  /**
   * Форматирует размер файла в человекочитаемом формате
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Singleton instance
export const imageGCSService = new ImageGCSService();

// Очистка кэша каждые 30 минут
setInterval(
  () => {
    imageGCSService.cleanExpiredCache();
  },
  30 * 60 * 1000
);
