import { IImageStorageService } from './IImageStorageService';
import { GCSImageService } from './GCSImageService';
import { LocalStorageService } from './LocalStorageService';
import { ImageProcessingV2 } from './ImageProcessingV2';
import { 
  MediaValue, 
  GCSImagePath, 
  SignedUrlRequest, 
  SignedUrlResponse, 
  BatchAccessRequest,
  StorageUsageStats 
} from '../../types/types';
import { GCS_CONFIG } from '../../types/constants';
import { checkUserProjectAccess } from '../../utils/projectAccess';
import { isOSS } from '@config/edition';

/**
 * Фабрика для создания сервиса хранилища в зависимости от edition
 */
function createStorageService(): IImageStorageService {
  if (isOSS()) {
    return new LocalStorageService();
  }
  return new GCSImageService();
}

/**
 * Центральный менеджер для работы с изображениями
 * Реализует гибридный подход: proxy для thumbnail, on-demand для больших изображений
 */
export class ImageManager {
  private storageService: IImageStorageService;
  private urlCache = new Map<string, { url: string; expiresAt: Date }>();

  constructor() {
    this.storageService = createStorageService();
  }

  /**
   * Инициализация сервиса
   */
  async initialize(): Promise<void> {
    if (this.storageService instanceof GCSImageService) {
      await this.storageService.initializeBucket();
    }
    // LocalStorageService не требует дополнительной инициализации
  }

  /**
   * Загружает изображение: обрабатывает и сохраняет в GCS
   */
  async uploadImage(
    teamId: string,
    projectId: string,
    entityId: string,
    parameterId: string,
    base64Data: string,
    filename: string,
    userId: string,
    aiMetadata?: {
      isAIGenerated?: boolean;
      aiProvider?: 'openai' | 'gemini' | 'anthropic';
      aiModel?: string;
      generatedAt?: Date;
    }
  ): Promise<MediaValue> {
    try {
      // Проверяем доступ пользователя к проекту
      const hasAccess = await checkUserProjectAccess(userId, projectId);
      if (!hasAccess) {
        throw new Error('Нет доступа к проекту');
      }

      // НОВОЕ: Удаляем старое изображение перед загрузкой нового (если существует)
      try {
        await this.deleteImageIfExists(teamId, projectId, entityId, parameterId);
        console.log('🗑️ Old image deleted successfully before uploading new one');
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete old image (might not exist):', deleteError);
        // Продолжаем загрузку нового изображения даже если не удалось удалить старое
      }

      // Обрабатываем изображение
      const processedImages = await ImageProcessingV2.processImage(base64Data, filename, false, aiMetadata);

      // Генерируем пути для GCS
      const paths = ImageProcessingV2.generateImagePaths(
        teamId,
        projectId,
        entityId,
        parameterId,
        filename
      );

      // Загружаем в GCS
      const mediaValue = await this.storageService.uploadProcessedImages(paths, processedImages, userId);

      // Очищаем кэш для этого изображения (если была старая версия)
      this.clearImageCache(teamId, projectId, entityId, parameterId);

      return mediaValue;
    } catch (error) {
      throw new Error(`Ошибка загрузки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получает изображение как stream (для proxy thumbnail)
   */
  async getImageStream(
    teamId: string,
    projectId: string,
    entityId: string,
    parameterId: string,
    version: 'original' | 'optimized' | 'thumbnail',
    userId: string,
    filename: string = 'image.jpg'
  ): Promise<{
    stream: NodeJS.ReadableStream;
    metadata: { contentType: string; size: number };
  }> {
    try {
      // Проверяем доступ
      const hasAccess = await checkUserProjectAccess(userId, projectId);
      if (!hasAccess) {
        throw new Error('Нет доступа к проекту');
      }

      const path: GCSImagePath = {
        teamId,
        projectId,
        entityId,
        parameterId,
        version,
        filename
      };

      return await this.storageService.getImageStream(path);
    } catch (error) {
      throw new Error(`Ошибка получения изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Генерирует signed URLs для больших изображений (on-demand)
   */
  async generateSignedUrls(
    teamId: string,
    projectId: string,
    request: SignedUrlRequest,
    userId: string
  ): Promise<SignedUrlResponse> {
    try {
      // Проверяем доступ
      const hasAccess = await checkUserProjectAccess(userId, projectId);
      if (!hasAccess) {
        return {
          success: false,
          error: 'Нет доступа к проекту'
        };
      }

      const ttl = request.ttl || GCS_CONFIG.LARGE_IMAGE_URL_TTL;
      const results = [];

      for (const imageRequest of request.imageIds) {
        try {
          // Проверяем кэш
          const cacheKey = this.buildCacheKey(teamId, projectId, imageRequest.entityId, imageRequest.parameterId, imageRequest.version);
          const cached = this.urlCache.get(cacheKey);

          if (cached && cached.expiresAt > new Date()) {
            // Используем кэшированный URL
            results.push({
              entityId: imageRequest.entityId,
              parameterId: imageRequest.parameterId,
              version: imageRequest.version,
              signedUrl: cached.url,
              expiresAt: cached.expiresAt
            });
            continue;
          }

          // Генерируем новый signed URL
          const path: GCSImagePath = {
            teamId,
            projectId,
            entityId: imageRequest.entityId,
            parameterId: imageRequest.parameterId,
            version: imageRequest.version,
            filename: 'image.jpg' // Фактическое имя найдется автоматически
          };

          const signedUrl = await this.storageService.generateSignedUrl(path, ttl);
          const expiresAt = new Date(Date.now() + (ttl * 1000));

          // Кэшируем URL
          this.urlCache.set(cacheKey, { url: signedUrl, expiresAt });

          results.push({
            entityId: imageRequest.entityId,
            parameterId: imageRequest.parameterId,
            version: imageRequest.version,
            signedUrl,
            expiresAt
          });
        } catch (error) {
          console.warn(`Не удалось сгенерировать URL для ${imageRequest.entityId}/${imageRequest.parameterId}:`, error);
          // Пропускаем проблемные изображения, но не останавливаем весь процесс
        }
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Batch доступ к изображениям (для загрузки списков сущностей)
   */
  async generateBatchAccess(
    teamId: string,
    projectId: string,
    request: BatchAccessRequest,
    userId: string
  ): Promise<SignedUrlResponse> {
    try {
      // Проверяем доступ
      const hasAccess = await checkUserProjectAccess(userId, projectId);
      if (!hasAccess) {
        return {
          success: false,
          error: 'Нет доступа к проекту'
        };
      }

      // Создаем запросы для всех комбинаций entityId + type
      const imageRequests = [];
      for (const entityId of request.entityIds) {
        for (const version of request.types) {
          // Для entity avatars используем стандартный parameterId
          imageRequests.push({
            entityId,
            parameterId: 'entity-avatar', // Стандартный parameterId для avatars сущностей
            version
          });
        }
      }

      console.log('🔗 Generated image requests for batch:', imageRequests);
      
      const result = await this.generateSignedUrls(teamId, projectId, {
        imageIds: imageRequests,
        ttl: request.ttl
      }, userId);
      
      console.log('✅ Batch signed URLs result:', result);
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Удаляет изображение из GCS
   */
  async deleteImage(
    teamId: string,
    projectId: string,
    entityId: string,
    parameterId: string,
    userId: string,
    filename: string = 'image.jpg'
  ): Promise<void> {
    try {
      // Проверяем доступ
      const hasAccess = await checkUserProjectAccess(userId, projectId);
      if (!hasAccess) {
        throw new Error('Нет доступа к проекту');
      }

      const paths = ImageProcessingV2.generateImagePaths(
        teamId,
        projectId,
        entityId,
        parameterId,
        filename
      );

      await this.storageService.deleteImage(paths);

      // Очищаем кэш
      this.clearImageCache(teamId, projectId, entityId, parameterId);
    } catch (error) {
      throw new Error(`Ошибка удаления изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Удаляет все изображения сущности (всю папку entityId)
   */
  async deleteEntityImages(
    teamId: string,
    projectId: string,
    entityId: string,
    userId: string
  ): Promise<void> {
    try {
      // Проверяем доступ
      const hasAccess = await checkUserProjectAccess(userId, projectId);
      if (!hasAccess) {
        throw new Error('Нет доступа к проекту');
      }

      await this.storageService.deleteEntityFolder(teamId, projectId, entityId);

      // Очищаем весь кэш для данной сущности
      const cacheKeys = Array.from(this.urlCache.keys()).filter(key => 
        key.includes(`${teamId}:${projectId}:${entityId}:`)
      );
      cacheKeys.forEach(key => this.urlCache.delete(key));

    } catch (error) {
      throw new Error(`Ошибка удаления изображений сущности: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получает статистику использования хранилища командой
   */
  async getStorageUsage(teamId: string, _userId: string): Promise<StorageUsageStats> {
    try {
      // TODO: Добавить проверку доступа к команде
      
      const { totalSize, imageCount } = await this.storageService.getTeamStorageUsage(teamId);

      return {
        teamId,
        totalSizeBytes: totalSize,
        imageCount,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error(`Ошибка получения статистики: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Строит ключ для кэширования URL
   */
  private buildCacheKey(
    teamId: string,
    projectId: string,
    entityId: string,
    parameterId: string,
    version: string
  ): string {
    return `${GCS_CONFIG.REDIS_CACHE_PREFIX}${teamId}:${projectId}:${entityId}:${parameterId}:${version}`;
  }

  /**
   * Очищает кэш для конкретного изображения
   */
  private clearImageCache(
    teamId: string,
    projectId: string,
    entityId: string,
    parameterId: string
  ): void {
    const versions = ['original', 'optimized', 'thumbnail'];
    versions.forEach(version => {
      const cacheKey = this.buildCacheKey(teamId, projectId, entityId, parameterId, version);
      this.urlCache.delete(cacheKey);
    });
  }

  /**
   * Удаляет изображение если оно существует (без выброса ошибки если не найдено)
   */
  private async deleteImageIfExists(
    teamId: string,
    projectId: string,
    entityId: string,
    parameterId: string,
    filename: string = 'image.jpg'
  ): Promise<void> {
    try {
      const paths = ImageProcessingV2.generateImagePaths(
        teamId,
        projectId,
        entityId,
        parameterId,
        filename
      );

      // Проверяем, существуют ли изображения перед удалением
      const existsCheck = await Promise.all([
        this.storageService.imageExists(paths.original),
        this.storageService.imageExists(paths.optimized), 
        this.storageService.imageExists(paths.thumbnail)
      ]);

      const hasAnyImages = existsCheck.some(exists => exists);
      if (hasAnyImages) {
        await this.storageService.deleteImage(paths);
        console.log('🗑️ Deleted existing images for entity:', entityId);
      }
    } catch (error) {
      // Не выбрасываем ошибку, так как удаление старого изображения - не критично
      console.warn('Warning: Could not delete old image:', error);
    }
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
}

// Singleton instance
export const imageManager = new ImageManager();
