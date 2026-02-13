import { Request, Response } from "express";
import { 
  getProjectInfoService, 
  createProjectInfoService, 
  updateProjectInfoService
} from "./projectInfo.service";
import { checkUserProjectAccess } from "../../utils/projectAccess";

/**
 * Получение информации о проекте
 * GET /api/projects/:id/info
 */
export const getProjectInfo = async (req: Request, res: Response) => {
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

  const projectInfo = await getProjectInfoService(projectId);

  if (!projectInfo) {
    return res.status(404).json({
      success: false,
      error: "Информация о проекте не найдена"
    });
  }

  res.json({
    success: true,
    data: projectInfo
  });
};

/**
 * Создание информации о проекте
 * POST /api/projects/:id/info
 */
export const createProjectInfo = async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const userId = (req as any).user.id;
  const data = req.body;

  // Проверяем доступ к проекту
  const hasAccess = await checkUserProjectAccess(userId, projectId, true);
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: "Нет доступа к проекту"
    });
  }

  const projectInfo = await createProjectInfoService(projectId, data);

  res.status(201).json({
    success: true,
    data: projectInfo,
    message: "Информация о проекте создана"
  });
};

/**
 * Обновление информации о проекте
 * PUT /api/projects/:id/info
 */
export const updateProjectInfo = async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const userId = (req as any).user.id;
  const data = req.body;

  // Проверяем доступ к проекту
  const hasAccess = await checkUserProjectAccess(userId, projectId, true);
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: "Нет доступа к проекту"
    });
  }

  const projectInfo = await updateProjectInfoService(projectId, data);

  res.json({
    success: true,
    data: projectInfo,
    message: "Информация о проекте обновлена"
  });
}; 