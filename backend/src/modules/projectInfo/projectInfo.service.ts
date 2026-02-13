import { prisma } from "@config/prisma";
import { CreateProjectInfoDto, UpdateProjectInfoDto, ProjectInfo } from "../../types/types";
import { createOrUpdateBibleQualityService } from "@modules/bibleQuality/bibleQuality.service";

/**
 * Получение информации о проекте
 */
export const getProjectInfoService = async (projectId: string): Promise<ProjectInfo | null> => {
  const projectInfo = await prisma.projectInfo.findUnique({
    where: {
      projectId: projectId
    }
  });

  return projectInfo;
};

/**
 * Создание информации о проекте
 */
export const createProjectInfoService = async (
  projectId: string, 
  data: CreateProjectInfoDto
): Promise<ProjectInfo> => {
  // Проверяем, что проект существует
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error("Проект не найден");
  }

  // Проверяем, не существует ли уже информация о проекте
  const existingInfo = await prisma.projectInfo.findUnique({
    where: { projectId }
  });

  if (existingInfo) {
    throw new Error("Информация о проекте уже существует");
  }

  const projectInfo = await prisma.projectInfo.create({
    data: {
      projectId,
      logline: data.logline,
      synopsis: data.synopsis,
      genres: data.genres || [],
      formats: data.formats || [],
      status: data.status || 'concept',
      setting: data.setting,
      targetAudience: data.targetAudience,
      mainThemes: data.mainThemes,
      message: data.message,
      references: data.references,
      uniqueFeatures: data.uniqueFeatures,
      atmosphere: data.atmosphere,
      visualStyle: data.visualStyle,
      constraints: data.constraints
    }
  });

  // Пересчитываем качество библии после создания
  try {
    await createOrUpdateBibleQualityService(projectId, true);
  } catch (error) {
    console.error('Failed to recalculate bible quality after project info creation:', error);
    // Не прерываем основную операцию из-за ошибки в оценке качества
  }

  return projectInfo;
};

/**
 * Обновление информации о проекте
 */
export const updateProjectInfoService = async (
  projectId: string, 
  data: UpdateProjectInfoDto
): Promise<ProjectInfo> => {
  // Проверяем существование информации о проекте
  const existingInfo = await prisma.projectInfo.findUnique({
    where: { projectId }
  });

  if (!existingInfo) {
    // Если информации нет, создаем новую
    return createProjectInfoService(projectId, data);
  }

  const projectInfo = await prisma.projectInfo.update({
    where: {
      projectId: projectId
    },
    data: {
      logline: data.logline,
      synopsis: data.synopsis,
      genres: data.genres,
      formats: data.formats,
      status: data.status,
      setting: data.setting,
      targetAudience: data.targetAudience,
      mainThemes: data.mainThemes,
      message: data.message,
      references: data.references,
      uniqueFeatures: data.uniqueFeatures,
      atmosphere: data.atmosphere,
      visualStyle: data.visualStyle,
      constraints: data.constraints
    }
  });

  // Пересчитываем качество библии после обновления
  try {
    await createOrUpdateBibleQualityService(projectId, true);
  } catch (error) {
    console.error('Failed to recalculate bible quality after project info update:', error);
    // Не прерываем основную операцию из-за ошибки в оценке качества
  }

  return projectInfo;
};

// Импортируем универсальную функцию проверки доступа
export { checkUserProjectAccess } from "../../utils/projectAccess"; 