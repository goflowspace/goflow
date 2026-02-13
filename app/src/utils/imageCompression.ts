/**
 * Клиентские утилиты для сжатия изображений
 * Оптимизируют изображения перед отправкой на бэкенд
 */

// Константы лимитов (должны совпадать с бэкендом)
export const IMAGE_LIMITS = {
  ORIGINAL_MAX_SIZE: 10485760, // 10MB
  OPTIMIZED_MAX_SIZE: 2097152, // 2MB
  THUMBNAIL_MAX_SIZE: 524288, // 500KB
  THUMBNAIL_MAX_DIMENSION: 450, // 450px
  OPTIMIZED_MAX_DIMENSION: 1920, // 1920px для optimized версии
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'] as const,
  MAX_INPUT_SIZE: 10485760 // 10MB лимит для исходного файла
} as const;

export type SupportedImageFormat = (typeof IMAGE_LIMITS.SUPPORTED_FORMATS)[number];

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  mimeType: string;
  filename: string;
}

export interface CompressedImageResult {
  dataUrl: string;
  metadata: ImageMetadata;
  compressionRatio: number;
}

export interface ImageCompressionOptions {
  maxSize: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'webp';
}

/**
 * Конвертирует файл в base64
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!IMAGE_LIMITS.SUPPORTED_FORMATS.includes(file.type as any)) {
      reject(new Error(`Неподдерживаемый формат: ${file.type}`));
      return;
    }

    if (file.size > IMAGE_LIMITS.MAX_INPUT_SIZE) {
      reject(new Error(`Файл слишком большой: ${Math.round(file.size / 1024 / 1024)}MB`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

/**
 * Получает метаданные изображения из DataURL
 */
export function getImageMetadata(dataUrl: string, filename: string): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();

    img.onload = () => {
      const size = Math.round((dataUrl.length * 3) / 4);
      const mimeType = dataUrl.split(';')[0].split(':')[1];

      resolve({
        width: img.width,
        height: img.height,
        size,
        mimeType,
        filename
      });
    };

    img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
    img.src = dataUrl;
  });
}

/**
 * Создает canvas элемент с изображением
 */
function createImageCanvas(img: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas не поддерживается');
  }

  canvas.width = width;
  canvas.height = height;

  // Улучшенное качество рендеринга
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Вычисляет новые размеры с сохранением пропорций
 */
function calculateDimensions(originalWidth: number, originalHeight: number, maxWidth?: number, maxHeight?: number): {width: number; height: number} {
  let {width, height} = {width: originalWidth, height: originalHeight};

  if (maxWidth && width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (maxHeight && height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return {width: Math.round(width), height: Math.round(height)};
}

/**
 * Сжимает изображение до указанных параметров
 */
export async function compressImage(dataUrl: string, options: ImageCompressionOptions): Promise<CompressedImageResult> {
  const {maxSize, quality = 0.9, maxWidth, maxHeight, format = 'jpeg'} = options;

  return new Promise((resolve, reject) => {
    const img = new window.Image();

    img.onload = async () => {
      try {
        const originalSize = Math.round((dataUrl.length * 3) / 4);

        // Вычисляем новые размеры
        const {width, height} = calculateDimensions(img.width, img.height, maxWidth, maxHeight);

        // Создаем canvas
        const canvas = createImageCanvas(img, width, height);

        // Начинаем с высокого качества и постепенно снижаем
        let currentQuality = Math.min(quality, 0.95);
        let result: string;
        let attempts = 0;
        const maxAttempts = 10;

        do {
          const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
          result = canvas.toDataURL(mimeType, currentQuality);
          const currentSize = Math.round((result.length * 3) / 4);

          if (currentSize <= maxSize) {
            break;
          }

          currentQuality *= 0.8; // Снижаем качество на 20%
          attempts++;

          if (currentQuality < 0.1) {
            currentQuality = 0.1;
          }
        } while (attempts < maxAttempts);

        // Если даже с минимальным качеством не помещается - уменьшаем размер
        if (Math.round((result.length * 3) / 4) > maxSize && (maxWidth || maxHeight)) {
          const scaleFactor = Math.sqrt(maxSize / Math.round((result.length * 3) / 4)) * 0.9;
          const newWidth = Math.round(width * scaleFactor);
          const newHeight = Math.round(height * scaleFactor);

          const smallerCanvas = createImageCanvas(img, newWidth, newHeight);
          const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
          result = smallerCanvas.toDataURL(mimeType, 0.8);
        }

        const finalSize = Math.round((result.length * 3) / 4);
        const metadata = await getImageMetadata(result, `compressed_${Date.now()}.${format === 'webp' ? 'webp' : 'jpg'}`);

        resolve({
          dataUrl: result,
          metadata,
          compressionRatio: originalSize / finalSize
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
    img.src = dataUrl;
  });
}

/**
 * Создает thumbnail изображения
 */
export async function createThumbnail(dataUrl: string, maxDimension: number = IMAGE_LIMITS.THUMBNAIL_MAX_DIMENSION): Promise<CompressedImageResult> {
  return compressImage(dataUrl, {
    maxSize: IMAGE_LIMITS.THUMBNAIL_MAX_SIZE,
    maxWidth: maxDimension,
    maxHeight: maxDimension,
    quality: 0.85,
    format: 'jpeg'
  });
}

/**
 * Полная обработка изображения для отправки на сервер
 */
export async function processImageForUpload(file: File): Promise<{
  original: CompressedImageResult;
  thumbnail: CompressedImageResult;
  filename: string;
}> {
  try {
    // Конвертируем файл в dataUrl
    const dataUrl = await fileToDataUrl(file);

    // Сжимаем основное изображение
    const original = await compressImage(dataUrl, {
      maxSize: IMAGE_LIMITS.ORIGINAL_MAX_SIZE,
      quality: 0.9,
      format: 'jpeg'
    });

    // Создаем thumbnail
    const thumbnail = await createThumbnail(dataUrl);

    return {
      original,
      thumbnail,
      filename: file.name
    };
  } catch (error) {
    throw new Error(`Ошибка обработки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Валидация файла изображения
 */
export function validateImageFile(file: File): {valid: boolean; error?: string} {
  if (!file) {
    return {valid: false, error: 'Файл не выбран'};
  }

  if (!IMAGE_LIMITS.SUPPORTED_FORMATS.includes(file.type as any)) {
    return {
      valid: false,
      error: `Неподдерживаемый формат. Поддерживаются: ${IMAGE_LIMITS.SUPPORTED_FORMATS.join(', ')}`
    };
  }

  if (file.size > IMAGE_LIMITS.MAX_INPUT_SIZE) {
    return {
      valid: false,
      error: `Файл слишком большой: ${Math.round(file.size / 1024 / 1024)}MB. Максимум: ${IMAGE_LIMITS.MAX_INPUT_SIZE / 1024 / 1024}MB`
    };
  }

  return {valid: true};
}

/**
 * Утилита для отображения размера файла в человекочитаемом формате
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Конвертирует base64 DataURL в File объект
 */
export function dataUrlToFile(
  dataUrl: string,
  filename: string,
  aiMetadata?: {
    isAIGenerated?: boolean;
    aiProvider?: 'openai' | 'gemini' | 'anthropic';
    aiModel?: string;
    generatedAt?: Date;
  }
): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, {type: mime});
}
