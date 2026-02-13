import { env } from "@config/env";

// Константы для ограничений изображений
export const IMAGE_LIMITS = {
  ORIGINAL_MAX_SIZE: 10485760,   // 10MB
  OPTIMIZED_MAX_SIZE: 2097152,   // 2MB  
  THUMBNAIL_MAX_SIZE: 524288,    // 500KB
  THUMBNAIL_MAX_DIMENSION: 450,  // 450px
  OPTIMIZED_MAX_DIMENSION: 1920, // 1920px для optimized версии
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

// Константы для GCS (значения по умолчанию для OSS когда GCS не используется)
export const GCS_CONFIG = {
  BUCKET_NAME: env.GCS_BUCKET_NAME || 'not-configured',
  PROJECT_ID: env.GCP_PROJECT_ID || 'not-configured',
  REGION: 'europe-west1',
  // Время жизни signed URLs
  THUMBNAIL_URL_TTL: 4 * 60 * 60,      // 4 часа
  LARGE_IMAGE_URL_TTL: 24 * 60 * 60,   // 24 часа
  // Кэширование
  REDIS_CACHE_PREFIX: 'signed-url:',
  THUMBNAIL_CACHE_TTL: 4 * 60 * 60,    // 4 часа
} as const;

export type SupportedImageFormat = typeof IMAGE_LIMITS.SUPPORTED_FORMATS[number]; 