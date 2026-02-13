import { Router } from "express";
import { authenticateJWT } from "@middlewares/auth.middleware";
import { asyncHandler } from "@middlewares/errorHandler";
import {
  getBibleQuality,
  recalculateBibleQuality
} from "./bibleQuality.controller";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticateJWT);

/**
 * GET /api/projects/:id/bible-quality
 * Получение оценки качества библии проекта
 */
router.get('/:id/bible-quality', asyncHandler(getBibleQuality));

/**
 * POST /api/projects/:id/bible-quality/recalculate  
 * Пересчет оценки качества библии проекта
 */
router.post('/:id/bible-quality/recalculate', asyncHandler(recalculateBibleQuality));

export default router; 