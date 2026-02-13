import sharp from 'sharp';
import { 
  ImageMetadata, 
  SupportedImageFormat, 
  GCSImagePath 
} from '../../types/types';
import { IMAGE_LIMITS } from '../../types/constants';

/**
 * Результат обработки изображения
 */
export interface ProcessedImageResult {
  original: { buffer: Buffer; metadata: ImageMetadata };
  optimized: { buffer: Buffer; metadata: ImageMetadata };
  thumbnail: { buffer: Buffer; metadata: ImageMetadata };
}

/**
 * Сервис обработки изображений для GCS
 * Создает original, optimized и thumbnail версии
 */
export class ImageProcessingV2 {
  
  /**
   * Обрабатывает base64 изображение и создает все необходимые версии
   */
  static async processImage(
    base64Data: string,
    filename: string,
    skipSizeCheck: boolean = false,
    aiMetadata?: {
      isAIGenerated?: boolean;
      aiProvider?: 'openai' | 'gemini' | 'anthropic';
      aiModel?: string;
      generatedAt?: Date;
    }
  ): Promise<ProcessedImageResult> {
    try {
      // Валидация входных данных
      if (!this.validateBase64Image(base64Data)) {
        throw new Error('Некорректный формат изображения');
      }

      const buffer = this.base64ToBuffer(base64Data);
      const originalSize = buffer.length;

      if (!skipSizeCheck && originalSize > IMAGE_LIMITS.ORIGINAL_MAX_SIZE) {
        throw new Error(`Размер файла слишком большой: ${Math.round(originalSize / 1024 / 1024 * 100) / 100}MB`);
      }

      // Получаем метаданные оригинала
      const originalMetadata = await this.extractBufferMetadata(buffer, filename, aiMetadata);

      // Обрабатываем все версии параллельно
      const [optimizedResult, thumbnailResult] = await Promise.all([
        this.createOptimizedImage(buffer, filename, aiMetadata),
        this.createThumbnail(buffer, filename, IMAGE_LIMITS.THUMBNAIL_MAX_DIMENSION, 80, aiMetadata),
      ]);

      return {
        original: {
          buffer,
          metadata: originalMetadata
        },
        optimized: optimizedResult,
        thumbnail: thumbnailResult
      };

    } catch (error) {
      throw new Error(`Ошибка обработки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Создает оптимизированную версию изображения
   */
  static async createOptimizedImage(
    inputBuffer: Buffer,
    filename: string,
    aiMetadata?: {
      isAIGenerated?: boolean;
      aiProvider?: 'openai' | 'gemini' | 'anthropic';
      aiModel?: string;
      generatedAt?: Date;
    }
  ): Promise<{ buffer: Buffer; metadata: ImageMetadata }> {
    try {
      let quality = 85;
      let optimizedBuffer = inputBuffer;
      let iterations = 0;
      const maxIterations = 8;

      const inputMetadata = await sharp(inputBuffer).metadata();

      // Если изображение больше OPTIMIZED_MAX_DIMENSION, уменьшаем размер
      if (inputMetadata.width && inputMetadata.width > IMAGE_LIMITS.OPTIMIZED_MAX_DIMENSION) {
        optimizedBuffer = await sharp(inputBuffer)
          .resize(IMAGE_LIMITS.OPTIMIZED_MAX_DIMENSION, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 90, progressive: true })
          .toBuffer();
      }

      // Итеративно снижаем качество до достижения нужного размера
      while (optimizedBuffer.length > IMAGE_LIMITS.OPTIMIZED_MAX_SIZE && iterations < maxIterations) {
        quality -= 10;
        if (quality < 30) quality = 30;

        optimizedBuffer = await sharp(inputBuffer)
          .resize(IMAGE_LIMITS.OPTIMIZED_MAX_DIMENSION, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality, progressive: true })
          .toBuffer();

        iterations++;
      }

      // Если все еще слишком большой, дополнительно уменьшаем размеры
      if (optimizedBuffer.length > IMAGE_LIMITS.OPTIMIZED_MAX_SIZE) {
        const scaleFactor = Math.sqrt(IMAGE_LIMITS.OPTIMIZED_MAX_SIZE / optimizedBuffer.length) * 0.9;
        const targetWidth = Math.floor(IMAGE_LIMITS.OPTIMIZED_MAX_DIMENSION * scaleFactor);

        optimizedBuffer = await sharp(inputBuffer)
          .resize(targetWidth, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 70, progressive: true })
          .toBuffer();
      }

      const metadata = await this.extractBufferMetadata(optimizedBuffer, `optimized_${filename}`, aiMetadata);

      return {
        buffer: optimizedBuffer,
        metadata
      };
    } catch (error) {
      throw new Error(`Ошибка создания optimized изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Создает thumbnail изображения
   */
  static async createThumbnail(
    inputBuffer: Buffer,
    filename: string,
    maxDimension: number = IMAGE_LIMITS.THUMBNAIL_MAX_DIMENSION,
    quality: number = 80,
    aiMetadata?: {
      isAIGenerated?: boolean;
      aiProvider?: 'openai' | 'gemini' | 'anthropic';
      aiModel?: string;
      generatedAt?: Date;
    }
  ): Promise<{ buffer: Buffer; metadata: ImageMetadata }> {
    try {
      let thumbnailBuffer = await sharp(inputBuffer)
        .resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality, progressive: true })
        .toBuffer();

      // Если thumbnail слишком большой, снижаем качество
      let currentQuality = quality;
      while (thumbnailBuffer.length > IMAGE_LIMITS.THUMBNAIL_MAX_SIZE && currentQuality > 30) {
        currentQuality -= 15;
        thumbnailBuffer = await sharp(inputBuffer)
          .resize(maxDimension, maxDimension, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: currentQuality, progressive: true })
          .toBuffer();
      }

      const metadata = await this.extractBufferMetadata(thumbnailBuffer, `thumbnail_${filename}`, aiMetadata);

      return {
        buffer: thumbnailBuffer,
        metadata
      };
    } catch (error) {
      throw new Error(`Ошибка создания thumbnail: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Извлекает метаданные из buffer
   */
  static async extractBufferMetadata(
    buffer: Buffer, 
    filename: string,
    aiMetadata?: {
      isAIGenerated?: boolean;
      aiProvider?: 'openai' | 'gemini' | 'anthropic';
      aiModel?: string;
      generatedAt?: Date;
    }
  ): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      if (!metadata.width || !metadata.height || !metadata.format) {
        throw new Error('Не удалось извлечь метаданные изображения');
      }

      const mimeType = `image/${metadata.format}` as SupportedImageFormat;
      
      if (!IMAGE_LIMITS.SUPPORTED_FORMATS.includes(mimeType)) {
        throw new Error(`Неподдерживаемый формат: ${metadata.format}`);
      }

      return {
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
        mimeType,
        filename,
        // AI generation metadata
        isAIGenerated: aiMetadata?.isAIGenerated || false,
        aiProvider: aiMetadata?.aiProvider,
        aiModel: aiMetadata?.aiModel,
        generatedAt: aiMetadata?.generatedAt
      };
    } catch (error) {
      throw new Error(`Ошибка извлечения метаданных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Конвертирует base64 в Buffer
   */
  static base64ToBuffer(base64Data: string): Buffer {
    const base64Content = base64Data.split(',')[1];
    if (!base64Content) {
      throw new Error('Некорректный формат base64');
    }
    return Buffer.from(base64Content, 'base64');
  }

  /**
   * Проверяет валидность base64 изображения
   */
  static validateBase64Image(base64Data: string): boolean {
    const base64Pattern = /^data:image\/(jpeg|jpg|png|webp);base64,/;
    return base64Pattern.test(base64Data);
  }

  /**
   * Генерирует структуру путей для GCS с уникальными именами для сброса кэша
   */
  static generateImagePaths(
    teamId: string,
    projectId: string,
    entityId: string,
    parameterId: string,
    filename: string
  ): {
    original: GCSImagePath;
    optimized: GCSImagePath;
    thumbnail: GCSImagePath;
  } {
    // Создаем уникальный префикс для имени файла (timestamp + random)
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniquePrefix = `${timestamp}_${randomSuffix}`;
    
    // Извлекаем расширение из оригинального файла
    const fileExtension = filename.includes('.') ? filename.split('.').pop() : 'jpg';
    const uniqueFilename = `${uniquePrefix}.${fileExtension}`;
    
    const basePathData = {
      teamId,
      projectId,
      entityId,
      parameterId,
      filename: uniqueFilename // Уникальное имя файла
    };

    console.log('🔄 Generated unique filename for cache busting:', uniqueFilename);

    return {
      original: { ...basePathData, version: 'original' },
      optimized: { ...basePathData, version: 'optimized' },
      thumbnail: { ...basePathData, version: 'thumbnail' }
    };
  }
}
