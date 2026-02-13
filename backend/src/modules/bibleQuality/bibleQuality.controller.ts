import { Request, Response } from "express";
import { 
  getBibleQualityService, 
  createOrUpdateBibleQualityService
} from "./bibleQuality.service";
import { checkUserProjectAccess } from "../../utils/projectAccess";

/**
 * Получение оценки качества библии проекта
 * GET /api/projects/:id/bible-quality
 */
export const getBibleQuality = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user.id;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    const bibleQuality = await getBibleQualityService(projectId);

    if (!bibleQuality) {
      // Если оценки еще нет, создаем ее
      const newQuality = await createOrUpdateBibleQualityService(projectId);
      return res.json({
        success: true,
        data: newQuality
      });
    }

    res.json({
      success: true,
      data: bibleQuality
    });
  } catch (error) {
    console.error('Get Bible Quality Error:', error);
    res.status(500).json({
      success: false,
      error: "Ошибка при получении оценки качества библии"
    });
  }
};

/**
 * Пересчет оценки качества библии проекта
 * POST /api/projects/:id/bible-quality/recalculate
 */
export const recalculateBibleQuality = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user.id;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    // Принудительно пересчитываем оценку
    const bibleQuality = await createOrUpdateBibleQualityService(projectId, true);

    res.json({
      success: true,
      data: bibleQuality
    });
  } catch (error) {
    console.error('Recalculate Bible Quality Error:', error);
    res.status(500).json({
      success: false,
      error: "Ошибка при пересчете оценки качества библии"
    });
  }
}; 