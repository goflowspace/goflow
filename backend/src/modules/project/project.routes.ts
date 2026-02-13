import 'reflect-metadata';
import {Router} from "express";
import {
    createProject, createProjectFromImport,
    deleteProject,
    getUserProjects,
    updateProject,
    importToProject,
    duplicateProject
} from "@modules/project/project.controller";
import { ISyncController } from "@modules/sync/interfaces/sync.interfaces";
import { TYPES } from "@modules/sync/di.types";
import { syncContainer } from "@modules/sync/di-container.inversify";
import { asyncHandler } from '@middlewares/errorHandler';
import { authenticateJWT } from '@middlewares/auth.middleware';
import { validate } from "@middlewares/validation.middleware";
import {
    getProjectInfo,
    createProjectInfo,
    updateProjectInfo
} from "@modules/projectInfo/projectInfo.controller";
import {
    createProjectInfoSchema,
    updateProjectInfoSchema,
    projectIdParamSchema
} from "@modules/projectInfo/projectInfo.validation";
import {
    getBibleQuality,
    recalculateBibleQuality
} from "@modules/bibleQuality/bibleQuality.controller";
import entitiesRoutes from "@modules/entities/entities.routes";
import { z } from "zod";

const router = Router();

// Создаем функции-обертки для правильной работы с DI
const processOperations = async (req: any, res: any) => {
    // Переименовываем параметр для совместимости
    req.params.projectId = req.params.id;
    const syncController = syncContainer.get<ISyncController>(TYPES.SyncController);
    await syncController.processOperations(req, res);
};

const getSnapshot = async (req: any, res: any) => {
    req.params.projectId = req.params.id;
    const syncController = syncContainer.get<ISyncController>(TYPES.SyncController);
    await syncController.getSnapshot(req, res);
};

const getOperations = async (req: any, res: any) => {
    req.params.projectId = req.params.id;
    const syncController = syncContainer.get<ISyncController>(TYPES.SyncController);
    await syncController.getOperations(req, res);
};

router.get("/", authenticateJWT, asyncHandler(getUserProjects));
router.post("/", authenticateJWT, asyncHandler(createProject));
router.post("/import-file", authenticateJWT, asyncHandler(createProjectFromImport));

router.put("/:id", authenticateJWT, asyncHandler(updateProject));
router.delete("/:id", authenticateJWT, asyncHandler(deleteProject));
router.post("/:id/duplicate", authenticateJWT, asyncHandler(duplicateProject));
router.post("/:id/import", authenticateJWT, asyncHandler(importToProject));

// Роуты синхронизации
router.post("/:id/sync", authenticateJWT, asyncHandler(processOperations));
router.post("/:id/ops", authenticateJWT, asyncHandler(processOperations));
router.get("/:id/snapshot", authenticateJWT, asyncHandler(getSnapshot));
router.get("/:id/operations", authenticateJWT, asyncHandler(getOperations));

// Роуты для информации о проекте
router.get("/:id/info", 
  authenticateJWT,
  validate(z.object({ params: projectIdParamSchema })),
  asyncHandler(getProjectInfo)
);

router.post("/:id/info", 
  authenticateJWT,
  validate(z.object({ 
    params: projectIdParamSchema,
    body: createProjectInfoSchema 
  })),
  asyncHandler(createProjectInfo)
);

router.put("/:id/info", 
  authenticateJWT,
  validate(z.object({ 
    params: projectIdParamSchema,
    body: updateProjectInfoSchema 
  })),
  asyncHandler(updateProjectInfo)
);

// Роуты для оценки качества библии
router.get("/:id/bible-quality", 
  authenticateJWT,
  validate(z.object({ params: projectIdParamSchema })),
  asyncHandler(getBibleQuality)
);

router.post("/:id/bible-quality/recalculate", 
  authenticateJWT,
  validate(z.object({ params: projectIdParamSchema })),
  asyncHandler(recalculateBibleQuality)
);

// Подключаем роуты сущностей
router.use("/", entitiesRoutes);

export default router;
