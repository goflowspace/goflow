import 'reflect-metadata';
import { Router, Request, Response } from "express";
import { ISyncController } from "./interfaces/sync.interfaces";
import { syncContainer } from "./di-container.inversify";
import { TYPES } from "./di.types";
import passport from "@config/passportConfig";
import { checkSyncHealth, checkOverallSyncHealth } from "./healthcheck";

const router = Router();

// Создаем функции-обертки для правильной привязки контекста
const processOperations = async (req: Request, res: Response) => {
  const syncController = syncContainer.get<ISyncController>(TYPES.SyncController);
  await syncController.processOperations(req, res);
};

const getSnapshot = async (req: Request, res: Response) => {
  const syncController = syncContainer.get<ISyncController>(TYPES.SyncController);
  await syncController.getSnapshot(req, res);
};

const getOperations = async (req: Request, res: Response) => {
  const syncController = syncContainer.get<ISyncController>(TYPES.SyncController);
  await syncController.getOperations(req, res);
};

// Все роуты требуют авторизации
// Новый эндпоинт для обработки операций
router.post("/:projectId/ops", 
  passport.authenticate("jwt", { session: false }), 
  processOperations
);

// Получение снимка графа
router.get("/:projectId/snapshot", 
  passport.authenticate("jwt", { session: false }), 
  getSnapshot
);

// Получение операций после указанной версии
router.get("/:projectId/operations", 
  passport.authenticate("jwt", { session: false }), 
  getOperations
);

// Эндпоинт для проверки состояния синхронизации (диагностика)
router.get("/:projectId/health", 
  passport.authenticate("jwt", { session: false }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const health = await checkSyncHealth(projectId);
      
      res.json({
        success: true,
        health
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }
);

// Эндпоинт для проверки общего состояния системы синхронизации
router.get("/system/health", 
  passport.authenticate("jwt", { session: false }),
  async (_req: Request, res: Response) => {
    try {
      const health = await checkOverallSyncHealth();
      
      res.json({
        success: true,
        health
      });
    } catch (error) {
      console.error('Overall health check error:', error);
      res.status(500).json({
        success: false,
        error: 'System health check failed'
      });
    }
  }
);

export default router; 