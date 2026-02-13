import { MediaValue, GCSImagePath, ImageMetadata } from '../../types/types';

/**
 * Интерфейс для работы с изображениями в хранилище
 * Обеспечивает унификацию и возможность легкого переключения между провайдерами
 */
export interface IImageStorageService {
  /**
   * Загружает обработанные изображения (original, optimized, thumbnail) в хранилище
   */
  uploadProcessedImages(
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
  ): Promise<MediaValue>;

  /**
   * Генерирует signed URL для доступа к изображению
   */
  generateSignedUrl(
    path: GCSImagePath,
    ttlSeconds: number
  ): Promise<string>;

  /**
   * Генерирует множественные signed URLs за один запрос
   */
  generateBatchSignedUrls(
    requests: Array<{
      path: GCSImagePath;
      ttlSeconds: number;
    }>
  ): Promise<Array<{
    path: GCSImagePath;
    signedUrl: string;
    expiresAt: Date;
  }>>;

  /**
   * Удаляет все версии изображения
   */
  deleteImage(paths: {
    original: GCSImagePath;
    optimized: GCSImagePath;
    thumbnail: GCSImagePath;
  }): Promise<void>;

  /**
   * Удаляет все изображения сущности (всю папку entityId)
   */
  deleteEntityFolder(teamId: string, projectId: string, entityId: string): Promise<void>;

  /**
   * Получает изображение как stream (для proxy)
   */
  getImageStream(path: GCSImagePath): Promise<{
    stream: NodeJS.ReadableStream;
    metadata: {
      contentType: string;
      size: number;
    };
  }>;

  /**
   * Проверяет существование изображения
   */
  imageExists(path: GCSImagePath): Promise<boolean>;

  /**
   * Получает информацию о размере файла
   */
  getImageSize(path: GCSImagePath): Promise<number>;

  /**
   * Получает общий размер всех изображений команды
   */
  getTeamStorageUsage(teamId: string): Promise<{
    totalSize: number;
    imageCount: number;
  }>;
}
