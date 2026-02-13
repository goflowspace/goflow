import { Router, Request, Response } from 'express';
import path from 'path';
import { createReadStream, existsSync } from 'fs';
import { authenticateJWT } from '../../middlewares/auth.middleware';
import {
  getThumbnailProxy,
  generateAccessTokens,
  getBatchAccess,
  uploadImage,
  deleteImage,
  getStorageUsage
} from './images.controller';
import { asyncHandler } from '@middlewares/asyncHandler';
import { isOSS } from '@config/edition';

const router = Router();

// Для OSS: маршрут отдачи локальных файлов
if (isOSS()) {
  router.get('/local/*', (req: Request, res: Response) => {
    const relativePath = req.params[0];
    if (!relativePath) {
      res.status(400).json({ error: 'Path required' });
      return;
    }
    
    // Защита от path traversal
    const normalizedPath = path.normalize(relativePath);
    if (normalizedPath.includes('..')) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }
    
    const uploadDir = process.env.LOCAL_UPLOAD_DIR || '/data/uploads';
    const fullPath = path.join(uploadDir, normalizedPath);
    
    if (!existsSync(fullPath)) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    
    res.set({
      'Content-Type': contentTypeMap[ext] || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });
    
    createReadStream(fullPath).pipe(res);
  });
}

// Proxy для thumbnail изображений (частые запросы) - без обязательной аутентификации
router.get('/proxy/thumbnail/:teamId/:projectId/:entityId/:parameterId', asyncHandler(getThumbnailProxy));

// OPTIONS для preflight запросов  
router.options('/proxy/thumbnail/:teamId/:projectId/:entityId/:parameterId', (_req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*', // Для изображений разрешаем любой origin
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Max-Age': '86400', // 24 часа
  });
  res.status(204).end();
});

// Все остальные routes требуют аутентификации
router.use(authenticateJWT);

// Генерация signed URLs для больших изображений
router.post('/access-tokens', asyncHandler(generateAccessTokens));

// Batch доступ к изображениям
router.post('/batch-access', asyncHandler(getBatchAccess));

// Загрузка изображения
router.post('/upload', asyncHandler(uploadImage));

// Удаление изображения
router.delete('/:teamId/:projectId/:entityId/:parameterId', asyncHandler(deleteImage));

// Статистика использования хранилища
router.get('/storage-usage/:teamId', asyncHandler(getStorageUsage));

export default router;
