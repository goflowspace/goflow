import fs from 'fs/promises';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { IImageStorageService } from './IImageStorageService';
import { MediaValue, GCSImagePath, ImageMetadata } from '../../types/types';

const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || '/data/uploads';

/**
 * Реализация хранилища изображений на локальной файловой системе (для OSS edition)
 */
export class LocalStorageService implements IImageStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = LOCAL_UPLOAD_DIR;
    // Создаем корневую директорию при инициализации
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
    console.log(`📁 LocalStorageService initialized at: ${this.baseDir}`);
  }

  /**
   * Генерирует локальный путь к файлу
   */
  private buildLocalPath(pathData: GCSImagePath): string {
    return path.join(
      this.baseDir,
      pathData.teamId,
      pathData.projectId,
      'entities',
      pathData.entityId,
      pathData.parameterId,
      `${pathData.version}_${pathData.filename}`
    );
  }

  /**
   * Генерирует относительный путь (для хранения в БД)
   */
  private buildRelativePath(pathData: GCSImagePath): string {
    return `${pathData.teamId}/${pathData.projectId}/entities/${pathData.entityId}/${pathData.parameterId}/${pathData.version}_${pathData.filename}`;
  }

  /**
   * Создает директорию для файла если не существует
   */
  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

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
    _userId: string
  ): Promise<MediaValue> {
    const uploadPromises = [
      this.uploadSingleImage(paths.original, images.original.buffer),
      this.uploadSingleImage(paths.optimized, images.optimized.buffer),
      this.uploadSingleImage(paths.thumbnail, images.thumbnail.buffer),
    ];

    await Promise.all(uploadPromises);

    const now = new Date();

    return {
      type: 'image',
      storage: 'local',
      original: {
        gcsPath: this.buildRelativePath(paths.original),
        metadata: images.original.metadata,
        compressionRatio: images.original.metadata.size / images.original.buffer.length
      },
      optimized: {
        gcsPath: this.buildRelativePath(paths.optimized),
        metadata: images.optimized.metadata,
        compressionRatio: images.optimized.metadata.size / images.optimized.buffer.length
      },
      thumbnail: {
        gcsPath: this.buildRelativePath(paths.thumbnail),
        metadata: images.thumbnail.metadata,
        compressionRatio: images.thumbnail.metadata.size / images.thumbnail.buffer.length
      },
      uploadedAt: now,
      processedAt: now
    };
  }

  private async uploadSingleImage(pathData: GCSImagePath, buffer: Buffer): Promise<void> {
    const filePath = this.buildLocalPath(pathData);
    await this.ensureDir(filePath);
    await fs.writeFile(filePath, buffer);
  }

  async generateSignedUrl(pathArg: GCSImagePath, _ttlSeconds: number): Promise<string> {
    // В локальном хранилище возвращаем путь через API proxy
    const relativePath = await this.findLatestImagePath(pathArg);
    if (!relativePath) {
      throw new Error('Изображение не найдено');
    }
    return `/images/local/${relativePath}`;
  }

  async generateBatchSignedUrls(
    requests: Array<{ path: GCSImagePath; ttlSeconds: number }>
  ): Promise<Array<{ path: GCSImagePath; signedUrl: string; expiresAt: Date }>> {
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

  async deleteImage(paths: {
    original: GCSImagePath;
    optimized: GCSImagePath;
    thumbnail: GCSImagePath;
  }): Promise<void> {
    await Promise.allSettled([
      this.deleteSingleImage(paths.original),
      this.deleteSingleImage(paths.optimized),
      this.deleteSingleImage(paths.thumbnail),
    ]);
  }

  private async deleteSingleImage(pathData: GCSImagePath): Promise<void> {
    try {
      const relativePath = await this.findLatestImagePath(pathData);
      if (relativePath) {
        const fullPath = path.join(this.baseDir, relativePath);
        await fs.unlink(fullPath);
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }
  }

  async deleteEntityFolder(teamId: string, projectId: string, entityId: string): Promise<void> {
    const entityDir = path.join(this.baseDir, teamId, projectId, 'entities', entityId);
    try {
      await fs.rm(entityDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️ Ошибка удаления папки сущности:`, error);
    }
  }

  async getImageStream(pathArg: GCSImagePath): Promise<{
    stream: NodeJS.ReadableStream;
    metadata: { contentType: string; size: number };
  }> {
    const relativePath = await this.findLatestImagePath(pathArg);
    if (!relativePath) {
      throw new Error('Изображение не найдено');
    }

    const fullPath = path.join(this.baseDir, relativePath);
    const stats = await fs.stat(fullPath);

    // Определяем content type по расширению
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    const stream = createReadStream(fullPath);

    return {
      stream: stream as unknown as NodeJS.ReadableStream,
      metadata: {
        contentType: contentTypeMap[ext] || 'image/jpeg',
        size: stats.size
      }
    };
  }

  async imageExists(pathArg: GCSImagePath): Promise<boolean> {
    const relativePath = await this.findLatestImagePath(pathArg);
    return !!relativePath;
  }

  async getImageSize(pathArg: GCSImagePath): Promise<number> {
    try {
      const relativePath = await this.findLatestImagePath(pathArg);
      if (!relativePath) return 0;

      const fullPath = path.join(this.baseDir, relativePath);
      const stats = await fs.stat(fullPath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  async getTeamStorageUsage(teamId: string): Promise<{
    totalSize: number;
    imageCount: number;
  }> {
    let totalSize = 0;
    let imageCount = 0;

    const teamDir = path.join(this.baseDir, teamId);
    try {
      await this.walkDir(teamDir, (_filePath, stats) => {
        totalSize += stats.size;
        imageCount++;
      });
    } catch {
      // Директория может не существовать
    }

    return { totalSize, imageCount };
  }

  /**
   * Находит актуальный файл по префиксу (аналогично GCS)
   */
  private async findLatestImagePath(pathArg: GCSImagePath): Promise<string | null> {
    try {
      const dir = path.join(
        this.baseDir,
        pathArg.teamId,
        pathArg.projectId,
        'entities',
        pathArg.entityId,
        pathArg.parameterId
      );

      const prefix = `${pathArg.version}_`;

      const files = await fs.readdir(dir);
      const matching = files.filter(f => f.startsWith(prefix));

      if (matching.length === 0) return null;

      // Сортируем по timestamp в имени файла
      matching.sort((a, b) => {
        const extractTimestamp = (filename: string) => {
          const parts = filename.split('_');
          return parts.length >= 2 ? parseInt(parts[1], 10) || 0 : 0;
        };
        return extractTimestamp(b) - extractTimestamp(a);
      });

      return path.join(
        pathArg.teamId,
        pathArg.projectId,
        'entities',
        pathArg.entityId,
        pathArg.parameterId,
        matching[0]
      );
    } catch {
      return null;
    }
  }

  /**
   * Рекурсивный обход директории
   */
  private async walkDir(
    dir: string,
    callback: (_filePath: string, stats: import('fs').Stats) => void
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walkDir(fullPath, callback);
      } else {
        const stats = await fs.stat(fullPath);
        callback(fullPath, stats);
      }
    }
  }
}
