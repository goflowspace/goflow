import { Router } from "express";
import { authenticateJWT } from "@middlewares/auth.middleware";
import { validate } from "@middlewares/validation.middleware";
import { asyncHandler } from "@middlewares/errorHandler";
import {
  getProjectInfo,
  createProjectInfo,
  updateProjectInfo
} from "./projectInfo.controller";
import {
  createProjectInfoSchema,
  updateProjectInfoSchema,
  projectIdParamSchema
} from "./projectInfo.validation";
import { z } from "zod";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticateJWT);

// GET /api/projects/:id/info - получение информации о проекте
router.get(
  "/:id/info",
  validate(z.object({ params: projectIdParamSchema })),
  asyncHandler(getProjectInfo)
);

// POST /api/projects/:id/info - создание информации о проекте
router.post(
  "/:id/info",
  validate(z.object({ 
    params: projectIdParamSchema,
    body: createProjectInfoSchema 
  })),
  asyncHandler(createProjectInfo)
);

// PUT /api/projects/:id/info - обновление информации о проекте
router.put(
  "/:id/info",
  validate(z.object({ 
    params: projectIdParamSchema,
    body: updateProjectInfoSchema 
  })),
  asyncHandler(updateProjectInfo)
);

export default router; 