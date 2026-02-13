import { Router, Request, Response } from 'express';
import { WebSocketSystem } from './di-container.inversify';
import { WEBSOCKET_TYPES } from './di.types';
import { IPresenceService } from './interfaces/websocket.interfaces';
import { asyncHandler } from '@middlewares/asyncHandler';

const router = Router();

/**
 * GET /api/presence/:projectId/:timelineId/:layerId
 * Получение всех присутствующих в слое (для отладки)
 */
router.get('/:projectId/:timelineId/:layerId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { projectId, timelineId, layerId } = req.params;
    
    if (!projectId || !timelineId || !layerId) {
      return res.status(400).json({ 
        error: 'projectId, timelineId и layerId обязательны' 
      });
    }

    // Получаем PresenceService из DI контейнера
    const wsSystem = WebSocketSystem.getInstance();
    const presenceService = wsSystem.get<IPresenceService>(WEBSOCKET_TYPES.PresenceService);
    
    const layerPresence = presenceService.getLayerPresence(projectId, timelineId, layerId);
    
    res.json({
      projectId,
      timelineId,
      layerId,
      presence: layerPresence,
      count: layerPresence.length,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error getting layer presence:', error);
    res.status(500).json({ 
      error: 'Ошибка получения presence данных',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/presence/user/:userId/color
 * Получение цвета пользователя (для отладки)
 */
router.get('/user/:userId/color', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }

    const wsSystem = WebSocketSystem.getInstance();
    const presenceService = wsSystem.get<IPresenceService>(WEBSOCKET_TYPES.PresenceService);
    
    const userColor = presenceService.getUserColor(userId);
    
    res.json({
      userId,
      color: userColor,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error getting user color:', error);
    res.status(500).json({ 
      error: 'Ошибка получения цвета пользователя',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export { router as presenceRoutes };
