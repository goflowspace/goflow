import { imageManager } from '../../services/storage/ImageManager';
import { MediaValue, ImageUploadResponse } from '../../types/types';
import { prisma } from '@config/prisma';

/**
 * Получает teamId по projectId
 */
const getTeamIdByProject = async (projectId: string): Promise<string> => {
  const teamProject = await prisma.teamProject.findFirst({
    where: { projectId: projectId },
    select: { teamId: true }
  });

  if (!teamProject) {
    throw new Error('Проект не найден в командах или не имеет привязки к команде');
  }

  return teamProject.teamId;
};

/**
 * Загрузка изображения для сущности через GCS (новая версия)
 */
export const uploadEntityImageGCSService = async (
  projectId: string,
  entityId: string, 
  parameterId: string,
  imageData: string,
  filename: string,
  userId: string,
  aiMetadata?: {
    isAIGenerated?: boolean;
    aiProvider?: 'openai' | 'gemini' | 'anthropic';
    aiModel?: string;
    generatedAt?: Date;
  }
): Promise<ImageUploadResponse> => {
  try {
    // Получаем teamId
    const teamId = await getTeamIdByProject(projectId);

    // Проверяем существование сущности и параметра
    const [entity, parameter] = await Promise.all([
      prisma.entity.findFirst({
        where: {
          id: entityId,
          projectId
        }
      }),
      prisma.entityParameter.findFirst({
        where: {
          id: parameterId,
          projectId
        }
      })
    ]);

    if (!entity) {
      throw new Error("Сущность не найдена");
    }

    if (!parameter) {
      throw new Error("Параметр не найден");
    }

    if (parameter.valueType !== 'MEDIA') {
      throw new Error("Параметр не является медиа-типом");
    }

    // Загружаем через ImageManager
    const mediaValue = await imageManager.uploadImage(
      teamId,
      projectId,
      entityId,
      parameterId,
      imageData,
      filename,
      userId,
      aiMetadata
    );

    // Сохраняем в БД (создаем или обновляем значение параметра)
    await prisma.entityValue.upsert({
      where: {
        entityId_parameterId: {
          entityId,
          parameterId
        }
      },
      update: {
        value: mediaValue as any
      },
      create: {
        entityId,
        parameterId,
        value: mediaValue as any
      }
    });

    return {
      success: true,
      data: mediaValue
    };
  } catch (error) {
    console.error('Error uploading entity image to GCS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ошибка сервера"
    };
  }
};

/**
 * Загрузка изображения для Entity.image через GCS
 */
export const uploadEntityAvatarGCSService = async (
  projectId: string,
  entityId: string,
  imageData: string,
  filename: string,
  userId: string,
  aiMetadata?: {
    isAIGenerated?: boolean;
    aiProvider?: 'openai' | 'gemini' | 'anthropic';
    aiModel?: string;
    generatedAt?: Date;
  }
): Promise<ImageUploadResponse> => {
  try {
    // Получаем teamId
    const teamId = await getTeamIdByProject(projectId);

    // Проверяем существование сущности
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        projectId
      }
    });

    if (!entity) {
      throw new Error("Сущность не найдена");
    }

    // Используем специальный parameterId для avatar
    const avatarParameterId = 'entity-avatar';

    // Загружаем через ImageManager
    const mediaValue = await imageManager.uploadImage(
      teamId,
      projectId,
      entityId,
      avatarParameterId,
      imageData,
      filename,
      userId,
      aiMetadata
    );

    // Обновляем Entity.image
    await prisma.entity.update({
      where: { id: entityId },
      data: {
        image: mediaValue as any
      }
    });

    return {
      success: true,
      data: mediaValue
    };
  } catch (error) {
    console.error('Error uploading entity avatar to GCS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ошибка сервера"
    };
  }
};

/**
 * Получение изображения сущности с поддержкой GCS
 */
export const getEntityImageGCSService = async (
  projectId: string,
  entityId: string,
  parameterId: string,
  userId: string,
  version: 'thumbnail' | 'optimized' | 'original' = 'optimized'
): Promise<{
  stream: NodeJS.ReadableStream;
  metadata: { contentType: string; size: number };
} | null> => {
  try {
    // Получаем teamId
    const teamId = await getTeamIdByProject(projectId);

    // Получаем изображение через ImageManager
    return await imageManager.getImageStream(
      teamId,
      projectId,
      entityId,
      parameterId,
      version,
      userId
    );
  } catch (error) {
    console.error('Error getting entity image from GCS:', error);
    return null;
  }
};

/**
 * Удаление изображения сущности через GCS
 */
export const deleteEntityImageGCSService = async (
  projectId: string,
  entityId: string,
  parameterId: string,
  userId: string
): Promise<boolean> => {
  try {
    // Получаем teamId
    const teamId = await getTeamIdByProject(projectId);

    // Удаляем из GCS
    await imageManager.deleteImage(
      teamId,
      projectId,
      entityId,
      parameterId,
      userId
    );

    // Удаляем из БД
    const deleted = await prisma.entityValue.deleteMany({
      where: {
        entityId,
        parameterId
      }
    });

    return deleted.count > 0;
  } catch (error) {
    console.error('Error deleting entity image from GCS:', error);
    return false;
  }
};

/**
 * Удаление Entity.image через GCS
 */
export const deleteEntityAvatarGCSService = async (
  projectId: string,
  entityId: string,
  userId: string
): Promise<boolean> => {
  try {
    // Получаем teamId
    const teamId = await getTeamIdByProject(projectId);

    // Удаляем из GCS
    await imageManager.deleteImage(
      teamId,
      projectId,
      entityId,
      'entity-avatar',
      userId
    );

    // Удаляем из БД
    await prisma.entity.update({
      where: { id: entityId },
      data: {
        image: null
      }
    });

    return true;
  } catch (error) {
    console.error('Error deleting entity avatar from GCS:', error);
    return false;
  }
};

/**
 * Проверяет, является ли MediaValue GCS-based
 */
export const isGCSMediaValue = (value: any): value is MediaValue => {
  return (
    value &&
    typeof value === 'object' &&
    value.type === 'image' &&
    value.storage === 'gcs' &&
    value.original &&
    value.optimized &&
    value.thumbnail &&
    typeof value.original.gcsPath === 'string' &&
    typeof value.optimized.gcsPath === 'string' &&
    typeof value.thumbnail.gcsPath === 'string'
  );
};

/**
 * Инициализация ImageManager при старте приложения
 */
export const initializeImageManager = async (): Promise<void> => {
  try {
    await imageManager.initialize();
    console.log('✅ ImageManager инициализирован');
  } catch (error) {
    console.error('❌ Ошибка инициализации ImageManager:', error);
    // В разработке не останавливаем сервер, в продакшене - да
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};
