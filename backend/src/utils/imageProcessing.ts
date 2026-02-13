import sharp from 'sharp';
import { 
  ImageMetadata, 
  ProcessedImage, 
  SupportedImageFormat
} from '../types/types';

// Legacy интерфейс для AI обработки изображений (с dataUrl)
export interface LegacyMediaValue {
  type: 'image';
  original: {
    dataUrl: string;
    metadata: ImageMetadata;
    compressionRatio: number;
  };
  thumbnail: {
    dataUrl: string;
    metadata: ImageMetadata;
    compressionRatio: number;
  };
  uploadedAt: Date;
  processedAt: Date;
}
import { IMAGE_LIMITS } from '../types/constants';

/**
 * Извлекает метаданные из base64 изображения
 */
export async function extractImageMetadata(
  base64Data: string, 
  filename: string,
  aiMetadata?: {
    isAIGenerated?: boolean;
    aiProvider?: 'openai' | 'gemini' | 'anthropic';
    aiModel?: string;
    generatedAt?: Date;
  }
): Promise<ImageMetadata> {
  try {
    // Убираем префикс data:image/...;base64,
    const base64Content = base64Data.split(',')[1];
    if (!base64Content) {
      throw new Error('Некорректный формат base64');
    }

    const buffer = Buffer.from(base64Content, 'base64');
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new Error('Не удалось извлечь метаданные изображения');
    }

    // Определяем MIME тип
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
 * Проверяет, является ли строка валидным base64 изображением
 */
export function validateBase64Image(base64Data: string): boolean {
  const base64Pattern = /^data:image\/(jpeg|jpg|png|webp);base64,/;
  return base64Pattern.test(base64Data);
}

/**
 * Получает размер base64 изображения в байтах
 */
export function getBase64Size(base64Data: string): number {
  const base64Content = base64Data.split(',')[1];
  if (!base64Content) return 0;
  
  // Учитываем padding и вычисляем реальный размер
  const padding = (base64Content.match(/=/g) || []).length;
  return Math.floor((base64Content.length * 3) / 4) - padding;
}

/**
 * Создает thumbnail из base64 изображения
 */
export async function createThumbnail(
  base64Data: string,
  maxDimension: number = IMAGE_LIMITS.THUMBNAIL_MAX_DIMENSION,
  quality: number = 85
): Promise<string> {
  try {
    const base64Content = base64Data.split(',')[1];
    if (!base64Content) {
      throw new Error('Некорректный формат base64');
    }

    const inputBuffer = Buffer.from(base64Content, 'base64');
    
    // Создаем thumbnail с сохранением пропорций
    const thumbnailBuffer = await sharp(inputBuffer)
      .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    // Конвертируем обратно в base64
    const thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
    
    return thumbnailBase64;
  } catch (error) {
    throw new Error(`Ошибка создания thumbnail: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Оптимизирует изображение для соответствия лимитам
 */
export async function optimizeImage(
  base64Data: string,
  maxSize: number,
  filename: string,
  aiMetadata?: {
    isAIGenerated?: boolean;
    aiProvider?: 'openai' | 'gemini' | 'anthropic';
    aiModel?: string;
    generatedAt?: Date;
  }
): Promise<ProcessedImage> {
  try {
    const base64Content = base64Data.split(',')[1];
    if (!base64Content) {
      throw new Error('Некорректный формат base64');
    }

    let inputBuffer = Buffer.from(base64Content, 'base64');
    let quality = 95;
    let optimizedBuffer = inputBuffer;
    let iterations = 0;
    const maxIterations = 10;

    // Итеративно снижаем качество до достижения нужного размера
    while (optimizedBuffer.length > maxSize && iterations < maxIterations) {
      quality -= 10;
      if (quality < 20) quality = 20;

      optimizedBuffer = await sharp(inputBuffer)
        .jpeg({ quality, progressive: true })
        .toBuffer();

      iterations++;
    }

    // Если даже с минимальным качеством не помещается, уменьшаем размер
    if (optimizedBuffer.length > maxSize) {
      const metadata = await sharp(inputBuffer).metadata();
      const scaleFactor = Math.sqrt(maxSize / optimizedBuffer.length) * 0.9; // Добавляем запас
      
      const newWidth = Math.floor((metadata.width || 800) * scaleFactor);
      const newHeight = Math.floor((metadata.height || 600) * scaleFactor);

      optimizedBuffer = await sharp(inputBuffer)
        .resize(newWidth, newHeight)
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
    }

    const optimizedBase64 = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
    const metadata = await extractImageMetadata(optimizedBase64, filename, aiMetadata);

    return {
      dataUrl: optimizedBase64,
      metadata
    };
  } catch (error) {
    throw new Error(`Ошибка оптимизации изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Полная обработка изображения: создание оптимизированной версии и thumbnail
 */
export async function processImage(
  base64Data: string,
  filename: string,
  skipSizeCheck: boolean = false,
  aiMetadata?: {
    isAIGenerated?: boolean;
    aiProvider?: 'openai' | 'gemini' | 'anthropic';
    aiModel?: string;
    generatedAt?: Date;
  }
): Promise<LegacyMediaValue> {
  try {
    // Валидация входных данных
    if (!validateBase64Image(base64Data)) {
      throw new Error('Некорректный формат изображения');
    }

    const originalSize = getBase64Size(base64Data);
    if (!skipSizeCheck && originalSize > IMAGE_LIMITS.ORIGINAL_MAX_SIZE * 2) { // Даем запас для исходного файла
      throw new Error(`Размер файла слишком большой: ${Math.round(originalSize / 1024 / 1024 * 100) / 100}MB`);
    }

    const now = new Date();

    // Создаем оптимизированную версию основного изображения
    const original = await optimizeImage(
      base64Data, 
      IMAGE_LIMITS.ORIGINAL_MAX_SIZE, 
      filename,
      aiMetadata
    );

    // Создаем thumbnail
    const thumbnailBase64 = await createThumbnail(base64Data);
    const thumbnailMetadata = await extractImageMetadata(thumbnailBase64, `thumb_${filename}`, aiMetadata);

    // Проверяем, что thumbnail не превышает лимит
    if (thumbnailMetadata.size > IMAGE_LIMITS.THUMBNAIL_MAX_SIZE) {
      // Если thumbnail слишком большой, создаем с более низким качеством
      const smallerThumbnail = await createThumbnail(base64Data, IMAGE_LIMITS.THUMBNAIL_MAX_DIMENSION, 60);
      const smallerMetadata = await extractImageMetadata(smallerThumbnail, `thumb_${filename}`, aiMetadata);
      
          return {
      type: 'image',
      original: {
        dataUrl: original.dataUrl,
        metadata: original.metadata,
        compressionRatio: original.metadata.size / originalSize
      },
      thumbnail: {
        dataUrl: smallerThumbnail,
        metadata: smallerMetadata,
        compressionRatio: smallerMetadata.size / originalSize
      },
      uploadedAt: now,
      processedAt: now
    };
    }

    return {
      type: 'image',
      original: {
        dataUrl: original.dataUrl,
        metadata: original.metadata,
        compressionRatio: original.metadata.size / originalSize
      },
      thumbnail: {
        dataUrl: thumbnailBase64,
        metadata: thumbnailMetadata,
        compressionRatio: thumbnailMetadata.size / originalSize
      },
      uploadedAt: now,
      processedAt: now
    };
  } catch (error) {
    throw new Error(`Ошибка обработки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Проверяет, является ли значение параметра изображением
 */
export function isMediaValue(value: any): value is LegacyMediaValue {
  return (
    value &&
    typeof value === 'object' &&
    value.type === 'image' &&
    value.original &&
    value.thumbnail &&
    typeof value.original.dataUrl === 'string' &&
    typeof value.thumbnail.dataUrl === 'string'
  );
} 