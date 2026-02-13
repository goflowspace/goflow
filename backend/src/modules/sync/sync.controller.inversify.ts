import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { ISyncService, ISyncController, ISyncRepository } from './interfaces/sync.interfaces';
import { logger } from '@config/logger';
import { TYPES } from './di.types';

@injectable()
export class SyncController implements ISyncController {
  constructor(
    @inject(TYPES.SyncService) private syncService: ISyncService,
    @inject(TYPES.SyncRepository) private syncRepository: ISyncRepository
  ) {}

  /**
   * POST /api/sync/:projectId/ops
   * Обрабатывает пакет операций от клиента
   */
  async processOperations(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      
      // Измеряем время авторизации
      if (req.timing) {
        req.timing.addMetric('ops_auth', 'Operations authorization check');
      }
      
      if (!userId) {
        if (req.timing) {
          req.timing.endMetric('ops_auth');
        }
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      // Измеряем время валидации входных данных
      if (req.timing) {
        req.timing.endMetric('ops_auth');
        req.timing.addMetric('ops_validation', 'Operations input validation');
      }

      if (!projectId) {
        if (req.timing) {
          req.timing.endMetric('ops_validation');
        }
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      const batch = req.body;
      
      // Валидация входных данных
      if (!batch.operations || !Array.isArray(batch.operations)) {
        if (req.timing) {
          req.timing.endMetric('ops_validation');
        }
        res.status(400).json({
          success: false,
          error: 'Operations array is required'
        });
        return;
      }

      if (!batch.deviceId) {
        if (req.timing) {
          req.timing.endMetric('ops_validation');
        }
        res.status(400).json({
          success: false,
          error: 'Device ID is required'
        });
        return;
      }

      // Измеряем время обработки операций в БД
      if (req.timing) {
        req.timing.endMetric('ops_validation');
        req.timing.addMetric('ops_processing', 'Operations batch processing');
        req.timing.addSimpleMetric('ops_count', batch.operations.length, 'Number of operations in batch');
      }

      // Обрабатываем операции
      const result = await this.syncService.processOperationsBatch(
        userId,
        projectId,
        batch
      );

      if (req.timing) {
        req.timing.endMetric('ops_processing');
        req.timing.addMetric('ops_response', 'Operations response serialization');
      }

      res.json(result);

      if (req.timing) {
        req.timing.endMetric('ops_response');
      }
    } catch (error: any) {
      logger.error('Error processing operations:', error);
      
      if (error.message === 'Access denied') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      if (error.message === 'Project not found') {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/sync/:projectId/snapshot
   * Получает текущий снимок графа
   */
  async getSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      // Измеряем время авторизации
      if (req.timing) {
        req.timing.addMetric('snapshot_auth', 'Snapshot authorization check');
      }

      if (!userId) {
        if (req.timing) {
          req.timing.endMetric('snapshot_auth');
        }
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      // Измеряем время проверки доступа к проекту
      if (req.timing) {
        req.timing.endMetric('snapshot_auth');
        req.timing.addMetric('snapshot_access_check', 'Project access validation');
      }

      const hasAccess = await this.syncRepository.checkUserAccess(userId, projectId);
      if (!hasAccess) {
        if (req.timing) {
          req.timing.endMetric('snapshot_access_check');
        }
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Измеряем время получения снимка из БД
      if (req.timing) {
        req.timing.endMetric('snapshot_access_check');
        req.timing.addMetric('snapshot_db_query', 'Graph snapshot database query');
      }

      const snapshot = await this.syncService.getGraphSnapshot(userId, projectId);
      
      if (req.timing) {
        req.timing.endMetric('snapshot_db_query');
        req.timing.addMetric('snapshot_serialization', 'Snapshot data serialization');
      }
      
      res.json({
        success: true,
        ...snapshot
      });

      if (req.timing) {
        req.timing.endMetric('snapshot_serialization');
      }
    } catch (error: any) {
      logger.error('Error getting snapshot:', error);
      
      if (error.message === 'Access denied') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      if (error.message === 'Project not found') {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/sync/:projectId/operations
   * Получает операции после указанной версии
   */
  async getOperations(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      const sinceVersion = parseInt(req.query.since as string) || 0;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const result = await this.syncService.getOperationsSince(
        userId, 
        projectId, 
        sinceVersion
      );
      
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      logger.error('Error getting operations:', error);
      
      if (error.message === 'Access denied') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 