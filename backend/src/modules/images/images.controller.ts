import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { imageManager } from '../../services/storage/ImageManager';
import { SignedUrlRequest, BatchAccessRequest } from '../../types/types';
import { env } from '../../config/env';
import { isOSS } from '../../config/edition';
import { getOrCreateOSSUser } from '../../middlewares/auth.middleware';

/**
 * Proxy для thumbnail изображений (частые запросы)
 * GET /api/images/proxy/thumbnail/:teamId/:projectId/:entityId/:parameterId?token=jwt_token
 * Поддерживает аутентификацию через JWT заголовок или query параметр
 */
export const getThumbnailProxy = async (req: Request, res: Response) => {
  try {
    const { teamId, projectId, entityId, parameterId } = req.params;
    const token = req.query.token as string;

    // Если нет токена в query, пытаемся получить из JWT middleware
    let userId = (req as any).user?.id;

    // В OSS режиме пропускаем auth — используем реального OSS user
    if (isOSS() && !userId) {
      const ossUser = await getOrCreateOSSUser();
      userId = ossUser.id;
    }

    // Если токен передан в query, верифицируем его
    if (token && !userId) {
      try {
        const decoded = jwt.verify(token, env.jwtSecret);
        userId = (decoded as any).id;
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Недействительный токен'
        });
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован'
      });
    }

    const { stream, metadata } = await imageManager.getImageStream(
      teamId,
      projectId,
      entityId,
      parameterId,
      'thumbnail',
      userId
    );

    // Удаляем возможный глобальный заголовок credentials от CORS middleware,
    // так как для изображений используем открытый доступ без credentials
    res.removeHeader('Access-Control-Allow-Credentials');

    // Устанавливаем заголовки для кэширования и CORS
    res.set({
      'Content-Type': metadata.contentType,
      'Content-Length': metadata.size.toString(),
      'Cache-Control': 'public, max-age=3600', // 1 час кэш в браузере
      'ETag': `"${entityId}-${parameterId}-thumbnail"`,
      'Access-Control-Allow-Origin': '*', // Для изображений разрешаем любой origin
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });

    // Поддержка conditional requests
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === `"${entityId}-${parameterId}-thumbnail"`) {
      return res.status(304).end();
    }

    stream.pipe(res);
  } catch (error) {
    console.error('Error in thumbnail proxy:', error);
    const errMessage = error instanceof Error ? error.message : 'Ошибка сервера';
    res.status(500).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Генерация signed URLs для больших изображений
 * POST /api/images/access-tokens
 */
export const generateAccessTokens = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован'
      });
    }

    const { teamId, projectId, ...requestData } = req.body as {
      teamId: string;
      projectId: string;
    } & SignedUrlRequest;

    // Валидация входных данных
    if (!teamId || !projectId || !requestData.imageIds || !Array.isArray(requestData.imageIds)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректные параметры запроса'
      });
    }

    const result = await imageManager.generateSignedUrls(
      teamId,
      projectId,
      requestData,
      userId
    );

    res.json(result);
  } catch (error) {
    console.error('Error generating access tokens:', error);
    const errMessage = error instanceof Error ? error.message : 'Ошибка сервера';
    res.status(500).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Batch доступ к изображениям (для списков сущностей)
 * POST /api/images/batch-access
 */
export const getBatchAccess = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован'
      });
    }

    const { teamId, projectId, ...requestData } = req.body as {
      teamId: string;
      projectId: string;
    } & BatchAccessRequest;

    console.log('🖼️ Batch access request:', {
      userId,
      teamId,
      projectId,
      requestData
    });

    // Валидация входных данных
    if (!teamId || !projectId || !requestData.entityIds || !Array.isArray(requestData.entityIds) || !requestData.types || !Array.isArray(requestData.types)) {
      console.error('❌ Invalid batch access request parameters');
      return res.status(400).json({
        success: false,
        error: 'Некорректные параметры запроса'
      });
    }

    const result = await imageManager.generateBatchAccess(
      teamId,
      projectId,
      requestData,
      userId
    );

    console.log('📥 Batch access result:', result);

    res.json(result);
  } catch (error) {
    console.error('Error in batch access:', error);
    const errMessage = error instanceof Error ? error.message : 'Ошибка сервера';
    res.status(500).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Загрузка изображения в новую GCS систему
 * POST /api/images/upload
 */
export const uploadImage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован'
      });
    }

    const { 
      teamId, 
      projectId, 
      entityId, 
      parameterId, 
      imageData, 
      filename,
      aiMetadata
    } = req.body;

    // Валидация входных данных
    if (!teamId || !projectId || !entityId || !parameterId || !imageData || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют обязательные поля'
      });
    }

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

    res.status(201).json({
      success: true,
      data: mediaValue,
      message: 'Изображение успешно загружено'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    const errMessage = error instanceof Error ? error.message : 'Ошибка сервера';
    res.status(500).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Удаление изображения
 * DELETE /api/images/:teamId/:projectId/:entityId/:parameterId
 */
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { teamId, projectId, entityId, parameterId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован'
      });
    }

    await imageManager.deleteImage(
      teamId,
      projectId,
      entityId,
      parameterId,
      userId
    );

    res.json({
      success: true,
      message: 'Изображение удалено'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    const errMessage = error instanceof Error ? error.message : 'Ошибка сервера';
    res.status(500).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Получение статистики использования хранилища
 * GET /api/images/storage-usage/:teamId
 */
export const getStorageUsage = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован'
      });
    }

    const stats = await imageManager.getStorageUsage(teamId, userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting storage usage:', error);
    const errMessage = error instanceof Error ? error.message : 'Ошибка сервера';
    res.status(500).json({ 
      success: false,
      error: errMessage 
    });
  }
};
