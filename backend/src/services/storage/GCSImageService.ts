import { Storage, Bucket } from '@google-cloud/storage';
import { IImageStorageService } from './IImageStorageService';
import { MediaValue, GCSImagePath, ImageMetadata } from '../../types/types';
import { GCS_CONFIG } from '../../types/constants';
import { env, isDev } from '@config/env';

/**
 * Реализация хранилища изображений в Google Cloud Storage
 */
export class GCSImageService implements IImageStorageService {
  private storage: Storage;
  private bucket: Bucket;

  constructor() {
    // Инициализация клиента GCS
    const storageConfig: any = {
      projectId: GCS_CONFIG.PROJECT_ID,
    };

    // В локальной разработке используем ADC (gcloud auth application-default login)
    // В продакшене - тоже ADC (автоматически через Cloud Run/Compute Engine)
    // Keyfile поддержка оставлена для случаев, когда нужно
    if (isDev && env.GOOGLE_APPLICATION_CREDENTIALS && env.GOOGLE_APPLICATION_CREDENTIALS.length > 0) {
      console.log('🔐 Using Service Account keyfile for GCS');
      storageConfig.keyFilename = env.GOOGLE_APPLICATION_CREDENTIALS;
    } else {
      console.log('🔐 Using Application Default Credentials for GCS');
      // ADC будут использованы автоматически
    }

    this.storage = new Storage(storageConfig);
    this.bucket = this.storage.bucket(GCS_CONFIG.BUCKET_NAME);
  }

  /**
   * Генерирует путь к файлу в GCS
   */
  private buildGCSPath(pathData: GCSImagePath): string {
    // Уникальный timestamp уже включен в filename из generateImagePaths()
    return `${pathData.teamId}/${pathData.projectId}/entities/${pathData.entityId}/${pathData.parameterId}/${pathData.version}_${pathData.filename}`;
  }

  /**
   * Загружает обработанные изображения в GCS
   */
  async uploadProcessedImages(
    paths: {
      original: GCSImagePath;
      optimized: GCSImagePath;
      thumbnail: GCSImagePath;
    },
    images: {
      original: { buffer: Buffer; metadata: ImageMetadata };
      optimized: { buffer: Buffer; metadata: ImageMetadata };
      thumbnail: { buffer: Buffer; metadata: ImageMetadata };
    },
    userId: string
  ): Promise<MediaValue> {
    try {
      const uploadPromises = [
        this.uploadSingleImage(paths.original, images.original.buffer, images.original.metadata, userId),
        this.uploadSingleImage(paths.optimized, images.optimized.buffer, images.optimized.metadata, userId),
        this.uploadSingleImage(paths.thumbnail, images.thumbnail.buffer, images.thumbnail.metadata, userId),
      ];

      const [originalResult, optimizedResult, thumbnailResult] = await Promise.all(uploadPromises);

      const now = new Date();

      return {
        type: 'image',
        storage: 'gcs',
        original: {
          gcsPath: originalResult.gcsPath,
          metadata: images.original.metadata,
          compressionRatio: images.original.metadata.size / images.original.buffer.length
        },
        optimized: {
          gcsPath: optimizedResult.gcsPath,
          metadata: images.optimized.metadata,
          compressionRatio: images.optimized.metadata.size / images.optimized.buffer.length
        },
        thumbnail: {
          gcsPath: thumbnailResult.gcsPath,
          metadata: images.thumbnail.metadata,
          compressionRatio: images.thumbnail.metadata.size / images.thumbnail.buffer.length
        },
        uploadedAt: now,
        processedAt: now
      };
    } catch (error) {
      throw new Error(`Ошибка загрузки изображений в GCS: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Загружает одно изображение в GCS
   */
  private async uploadSingleImage(
    pathData: GCSImagePath,
    buffer: Buffer,
    metadata: ImageMetadata,
    userId: string
  ): Promise<{ gcsPath: string }> {
    const gcsPath = this.buildGCSPath(pathData);
    const file = this.bucket.file(gcsPath);

    const customMetadata = {
      originalFilename: metadata.filename,
      uploadedBy: userId,
      teamId: pathData.teamId,
      projectId: pathData.projectId,
      entityId: pathData.entityId,
      parameterId: pathData.parameterId,
      version: pathData.version,
      // AI generation metadata
      ...(metadata.isAIGenerated && {
        isAIGenerated: 'true',
        aiProvider: metadata.aiProvider || '',
        aiModel: metadata.aiModel || '',
        generatedAt: metadata.generatedAt instanceof Date ? metadata.generatedAt.toISOString() : ''
      })
    };

    await file.save(buffer, {
      metadata: {
        contentType: metadata.mimeType,
        metadata: customMetadata
      },
      resumable: false, // Для небольших файлов
    });

    return { gcsPath };
  }

  /**
   * Генерирует signed URL для доступа к изображению
   */
  async generateSignedUrl(path: GCSImagePath, ttlSeconds: number): Promise<string> {
    try {
      // Находим файл по шаблону (так как в пути есть timestamp)
      const gcsPath = await this.findLatestImagePath(path);
      
      if (!gcsPath) {
        console.error('❌ Image not found for path:', path);
        throw new Error('Изображение не найдено');
      }

      const file = this.bucket.file(gcsPath);
      
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (ttlSeconds * 1000),
      });

      return signedUrl;
    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      throw new Error(`Ошибка генерации signed URL: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Генерирует множественные signed URLs
   */
  async generateBatchSignedUrls(
    requests: Array<{
      path: GCSImagePath;
      ttlSeconds: number;
    }>
  ): Promise<Array<{
    path: GCSImagePath;
    signedUrl: string;
    expiresAt: Date;
  }>> {
    const results = await Promise.allSettled(
      requests.map(async (req) => {
        const signedUrl = await this.generateSignedUrl(req.path, req.ttlSeconds);
        return {
          path: req.path,
          signedUrl,
          expiresAt: new Date(Date.now() + (req.ttlSeconds * 1000))
        };
      })
    );

    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Удаляет все версии изображения
   */
  async deleteImage(paths: {
    original: GCSImagePath;
    optimized: GCSImagePath;
    thumbnail: GCSImagePath;
  }): Promise<void> {
    try {
      const deletePromises = [
        this.deleteSingleImage(paths.original),
        this.deleteSingleImage(paths.optimized),
        this.deleteSingleImage(paths.thumbnail),
      ];

      await Promise.allSettled(deletePromises);
    } catch (error) {
      console.error('Ошибка удаления изображений:', error);
      // Не пробрасываем ошибку, так как частичное удаление допустимо
    }
  }

  /**
   * Удаляет всю папку сущности (все изображения и параметры)
   */
  async deleteEntityFolder(teamId: string, projectId: string, entityId: string): Promise<void> {
    try {
      const prefix = `${teamId}/${projectId}/entities/${entityId}/`;
      const [files] = await this.bucket.getFiles({ prefix });

      if (files.length > 0) {
        // Удаляем все файлы параллельно
        const deletePromises = files.map(file => 
          file.delete({ ignoreNotFound: true }).catch(error => {
            console.warn(`⚠️ Не удалось удалить файл ${file.name}:`, error);
          })
        );

        await Promise.allSettled(deletePromises);
      }
    } catch (error) {
      console.error(`❌ Ошибка удаления папки сущности:`, error);
      throw error;
    }
  }

  /**
   * Удаляет одно изображение
   */
  private async deleteSingleImage(path: GCSImagePath): Promise<void> {
    try {
      const gcsPath = await this.findLatestImagePath(path);
      if (gcsPath) {
        await this.bucket.file(gcsPath).delete({ ignoreNotFound: true });
      }
    } catch (error) {
      console.warn(`⚠️ Ошибка удаления файла:`, path, error);
    }
  }

  /**
   * Получает изображение как stream для proxy
   */
  async getImageStream(path: GCSImagePath): Promise<{
    stream: NodeJS.ReadableStream;
    metadata: { contentType: string; size: number };
  }> {
    try {
      const gcsPath = await this.findLatestImagePath(path);
      
      if (!gcsPath) {
        throw new Error('Изображение не найдено');
      }

      const file = this.bucket.file(gcsPath);
      const [metadata] = await file.getMetadata();
      
      const stream = file.createReadStream();

      return {
        stream,
        metadata: {
          contentType: metadata.contentType || 'image/jpeg',
          size: metadata.size ? parseInt(metadata.size as string, 10) : 0
        }
      };
    } catch (error) {
      throw new Error(`Ошибка получения stream изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Проверяет существование изображения
   */
  async imageExists(path: GCSImagePath): Promise<boolean> {
    try {
      const gcsPath = await this.findLatestImagePath(path);
      return !!gcsPath;
    } catch (error) {
      return false;
    }
  }

  /**
   * Получает размер изображения
   */
  async getImageSize(path: GCSImagePath): Promise<number> {
    try {
      const gcsPath = await this.findLatestImagePath(path);
      
      if (!gcsPath) {
        return 0;
      }

      const file = this.bucket.file(gcsPath);
      const [metadata] = await file.getMetadata();
      
      return metadata.size ? parseInt(metadata.size as string, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Получает общий размер всех изображений команды
   */
  async getTeamStorageUsage(teamId: string): Promise<{
    totalSize: number;
    imageCount: number;
  }> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `${teamId}/`,
      });

      let totalSize = 0;
      let imageCount = 0;

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        if (metadata.size) {
          totalSize += parseInt(metadata.size as string, 10);
          imageCount++;
        }
      }

      return { totalSize, imageCount };
    } catch (error) {
      console.error('Ошибка подсчета использования хранилища:', error);
      return { totalSize: 0, imageCount: 0 };
    }
  }

  /**
   * Находит актуальный путь к изображению (с учетом уникального timestamp+random в имени)
   */
  private async findLatestImagePath(path: GCSImagePath): Promise<string | null> {
    try {
      const prefix = `${path.teamId}/${path.projectId}/entities/${path.entityId}/${path.parameterId}/${path.version}_`;
      
      const [files] = await this.bucket.getFiles({
        prefix,
        maxResults: 10, // Ограничиваем для производительности
      });

      if (files.length === 0) {
        return null;
      }

      // Сортируем по имени (timestamp_random в имени) и берем последний по timestamp
      const sortedFiles = files.sort((a, b) => {
        // Извлекаем timestamp из имени файла (format: version_timestamp_random.ext)
        const extractTimestamp = (filename: string) => {
          const parts = filename.split('_');
          return parts.length >= 2 ? parseInt(parts[1], 10) || 0 : 0;
        };

        const timestampA = extractTimestamp(a.name);
        const timestampB = extractTimestamp(b.name);
        
        return timestampB - timestampA; // Сортируем по убыванию timestamp
      });
      
      return sortedFiles[0].name;
    } catch (error) {
      console.error('Ошибка поиска изображения:', error);
      return null;
    }
  }

  /**
   * Инициализация bucket (создание если не существует)
   */
  async initializeBucket(): Promise<void> {
    try {
      console.log(`🔍 Проверка доступа к GCS проекту: ${GCS_CONFIG.PROJECT_ID}`);
      
      // Проверяем права доступа
      await this.testGCSAccess();
      
      const [bucketExists] = await this.bucket.exists();
      
      if (!bucketExists) {
        console.log(`📦 Создание bucket: ${GCS_CONFIG.BUCKET_NAME}`);
        
        await this.storage.createBucket(GCS_CONFIG.BUCKET_NAME, {
          location: GCS_CONFIG.REGION,
          storageClass: 'STANDARD',
          uniformBucketLevelAccess: true
        });

        console.log(`✅ Bucket ${GCS_CONFIG.BUCKET_NAME} создан`);
      } else {
        console.log(`✅ Bucket ${GCS_CONFIG.BUCKET_NAME} существует`);
      }
    } catch (error) {
      console.error('❌ Детали ошибки GCS:', error);
      throw new Error(`Ошибка инициализации bucket: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Проверяет доступ к GCS
   */
  private async testGCSAccess(): Promise<void> {
    try {
      // Пробуем получить список buckets для проверки прав
      const [buckets] = await this.storage.getBuckets();
      console.log(`✅ GCS доступ подтвержден. Найдено ${buckets.length} buckets`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
        throw new Error(`
❌ Нет прав доступа к GCS. Возможные решения:

1. Проверьте Application Default Credentials:
   gcloud auth application-default login

2. Убедитесь, что у вашего аккаунта есть права:
   - Storage Object Admin (или Storage Admin)
   - Права на проект: ${GCS_CONFIG.PROJECT_ID}

3. Если используете Service Account keyfile:
   - Проверьте путь: ${env.GOOGLE_APPLICATION_CREDENTIALS || 'не задан'}
   - Проверьте права Service Account

Детали: ${errorMessage}
        `);
      }
      
      throw new Error(`Ошибка доступа к GCS: ${errorMessage}`);
    }
  }
}
