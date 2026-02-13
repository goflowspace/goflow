import { Router } from "express";
import { authenticateJWT } from "@middlewares/auth.middleware";
import { asyncHandler } from "@middlewares/errorHandler";
import { 
    getProjectTemplates,
    getProjectTemplate
} from "./templates.controller";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticateJWT);

// ============= МАРШРУТЫ ДЛЯ ШАБЛОНОВ =============

/**
 * GET /api/project-templates
 * Получение всех шаблонов проектов
 * Query параметры:
 * - category: фильтр по категории
 * - includeInactive: включать неактивные шаблоны
 * - includeDefault: включать предустановленные шаблоны
 */
router.get("/", asyncHandler(getProjectTemplates));

/**
 * GET /api/project-templates/:templateId
 * Получение шаблона по ID
 */
router.get("/:templateId", asyncHandler(getProjectTemplate));

export default router; 