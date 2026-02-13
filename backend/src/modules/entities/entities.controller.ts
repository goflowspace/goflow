import { Request, Response } from "express";
import {
  // Типы сущностей
  getEntityTypesService,
  getEntityTypeService,
  createEntityTypeService,
  updateEntityTypeService,
  deleteEntityTypeService,
  addParameterToTypeService,
  removeParameterFromTypeService,
  // Параметры сущностей
  getEntityParametersService,
  getEntityParameterService,
  createEntityParameterService,
  updateEntityParameterService,
  deleteEntityParameterService,
  getEntitiesService,
  getEntityService,
  createEntityService,
  updateEntityService,
  deleteEntityService,
  updateEntityValuesService,
  checkUserProjectAccess,
  // Работа с изображениями - старые функции удалены, используем GCS API
} from "./entities.service";

// ============= ТИПЫ СУЩНОСТЕЙ =============

/**
 * Получение всех типов сущностей проекта
 * GET /api/projects/:projectId/entity-types
 */
export const getEntityTypes = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user.id;
    const query = req.query;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    console.log(`🎯 getEntityTypes: hasAccess=${hasAccess} for userId=${userId}, projectId=${projectId}`);
    
    if (!hasAccess) {
      console.log(`❌ getEntityTypes: denying access due to hasAccess=false`);
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }
    
    console.log(`✅ getEntityTypes: proceeding with hasAccess=true`);

    const entityTypes = await getEntityTypesService(projectId, query);

    res.json({
      success: true,
      data: entityTypes
    });
  } catch (error) {
    console.error('Error getting entity types:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Получение типа сущности по ID
 * GET /api/projects/:projectId/entity-types/:typeId
 */
export const getEntityType = async (req: Request, res: Response) => {
  try {
    const { id: projectId, typeId } = req.params;
    const userId = (req as any).user.id;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    const entityType = await getEntityTypeService(projectId, typeId);

    res.json({
      success: true,
      data: entityType
    });
  } catch (error) {
    console.error('Error getting entity type:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Создание типа сущности
 * POST /api/projects/:projectId/entity-types
 */
export const createEntityType = async (req: Request, res: Response) => {
  try {
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

    const entityType = await createEntityTypeService(projectId, data);

    res.status(201).json({
      success: true,
      data: entityType,
      message: "Тип сущности создан"
    });
  } catch (error) {
    console.error('Error creating entity type:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Обновление типа сущности
 * PUT /api/projects/:projectId/entity-types/:typeId
 */
export const updateEntityType = async (req: Request, res: Response) => {
  try {
    const { id: projectId, typeId } = req.params;
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

    const entityType = await updateEntityTypeService(projectId, typeId, data);

    res.json({
      success: true,
      data: entityType,
      message: "Тип сущности обновлен"
    });
  } catch (error) {
    console.error('Error updating entity type:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Удаление типа сущности
 * DELETE /api/projects/:projectId/entity-types/:typeId
 */
export const deleteEntityType = async (req: Request, res: Response) => {
  try {
    const { id: projectId, typeId } = req.params;
    const userId = (req as any).user.id;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    await deleteEntityTypeService(projectId, typeId);

    res.json({
      success: true,
      message: "Тип сущности удален"
    });
  } catch (error) {
    console.error('Error deleting entity type:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Добавление параметра к типу сущности
 * POST /api/projects/:projectId/entity-types/:typeId/parameters
 */
export const addParameterToType = async (req: Request, res: Response) => {
  try {
    const { id: projectId, typeId } = req.params;
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

    const link = await addParameterToTypeService(projectId, typeId, data);

    res.status(201).json({
      success: true,
      data: link,
      message: "Параметр добавлен к типу"
    });
  } catch (error) {
    console.error('Error adding parameter to type:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Удаление параметра из типа сущности
 * DELETE /api/projects/:projectId/entity-types/:typeId/parameters/:parameterId
 */
export const removeParameterFromType = async (req: Request, res: Response) => {
  try {
    const { id: projectId, typeId, parameterId } = req.params;
    const userId = (req as any).user.id;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    await removeParameterFromTypeService(projectId, typeId, parameterId);

    res.json({
      success: true,
      message: "Параметр удален из типа"
    });
  } catch (error) {
    console.error('Error removing parameter from type:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

// ============= ПАРАМЕТРЫ СУЩНОСТЕЙ =============

/**
 * Получение всех параметров проекта
 * GET /api/projects/:projectId/entities/parameters
 */
export const getEntityParameters = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user.id;
    const query = req.query;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    console.log(`🎯 getEntityParameters: hasAccess=${hasAccess} for userId=${userId}, projectId=${projectId}`);
    
    if (!hasAccess) {
      console.log(`❌ getEntityParameters: denying access due to hasAccess=false`);
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }
    
    console.log(`✅ getEntityParameters: proceeding with hasAccess=true`);

    const parameters = await getEntityParametersService(projectId, query);

    res.json({
      success: true,
      data: parameters
    });
  } catch (error) {
    console.error('Error getting entity parameters:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Получение параметра по ID
 * GET /api/projects/:projectId/entities/parameters/:parameterId
 */
export const getEntityParameter = async (req: Request, res: Response) => {
  try {
    const { id: projectId, parameterId } = req.params;
    const userId = (req as any).user.id;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    const parameter = await getEntityParameterService(projectId, parameterId);

    if (!parameter) {
      return res.status(404).json({
        success: false,
        error: "Параметр не найден"
      });
    }

    res.json({
      success: true,
      data: parameter
    });
  } catch (error) {
    console.error('Error getting entity parameter:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Создание параметра сущности
 * POST /api/projects/:projectId/entities/parameters
 */
export const createEntityParameter = async (req: Request, res: Response) => {
  try {
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

    const parameter = await createEntityParameterService(projectId, data);

    res.status(201).json({
      success: true,
      data: parameter,
      message: "Параметр создан"
    });
  } catch (error) {
    console.error('Error creating entity parameter:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Обновление параметра сущности
 * PUT /api/projects/:projectId/entities/parameters/:parameterId
 */
export const updateEntityParameter = async (req: Request, res: Response) => {
  try {
    const { id: projectId, parameterId } = req.params;
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

    const parameter = await updateEntityParameterService(projectId, parameterId, data);

    res.json({
      success: true,
      data: parameter,
      message: "Параметр обновлен"
    });
  } catch (error) {
    console.error('Error updating entity parameter:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Удаление параметра сущности
 * DELETE /api/projects/:projectId/entities/parameters/:parameterId
 */
export const deleteEntityParameter = async (req: Request, res: Response) => {
  try {
    const { id: projectId, parameterId } = req.params;
    const userId = (req as any).user.id;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    await deleteEntityParameterService(projectId, parameterId);

    res.json({
      success: true,
      message: "Параметр удален"
    });
  } catch (error) {
    console.error('Error deleting entity parameter:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};



// ============= СУЩНОСТИ =============

/**
 * Получение всех сущностей проекта
 * GET /api/projects/:projectId/entities
 */
export const getEntities = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user.id;
    const query = req.query;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    const result = await getEntitiesService(projectId, query);

    res.json({
      success: true,
      data: result.entities,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting entities:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Получение сущности по ID
 * GET /api/projects/:projectId/entities/:entityId
 */
export const getEntity = async (req: Request, res: Response) => {
  try {
    const { id: projectId, entityId } = req.params;
    const userId = (req as any).user.id;
    const { includeOriginalImages = 'false' } = req.query;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    const entity = await getEntityService(projectId, entityId, includeOriginalImages as string);

    if (!entity) {
      return res.status(404).json({
        success: false,
        error: "Сущность не найдена"
      });
    }

    res.json({
      success: true,
      data: entity
    });
  } catch (error) {
    console.error('Error getting entity:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Создание сущности
 * POST /api/projects/:projectId/entities
 */
export const createEntity = async (req: Request, res: Response) => {
  try {
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

    const entity = await createEntityService(projectId, data);

    res.status(201).json({
      success: true,
      data: entity,
      message: "Сущность создана"
    });
  } catch (error) {
    console.error('Error creating entity:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Обновление сущности
 * PUT /api/projects/:projectId/entities/:entityId
 */
export const updateEntity = async (req: Request, res: Response) => {
  try {
    const { id: projectId, entityId } = req.params;
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

    const entity = await updateEntityService(projectId, entityId, data);

    res.json({
      success: true,
      data: entity,
      message: "Сущность обновлена"
    });
  } catch (error) {
    console.error('Error updating entity:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Удаление сущности
 * DELETE /api/projects/:projectId/entities/:entityId
 */
export const deleteEntity = async (req: Request, res: Response) => {
  try {
    const { id: projectId, entityId } = req.params;
    const userId = (req as any).user.id;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    await deleteEntityService(projectId, entityId, userId);

    res.json({
      success: true,
      message: "Сущность удалена"
    });
  } catch (error) {
    console.error('Error deleting entity:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
};

/**
 * Обновление значений параметров сущности
 * PUT /api/projects/:projectId/entities/:entityId/values
 */
export const updateEntityValues = async (req: Request, res: Response) => {
  try {
    const { id: projectId, entityId } = req.params;
    const userId = (req as any).user.id;
    const { values } = req.body;

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Нет доступа к проекту"
      });
    }

    const entity = await updateEntityValuesService(projectId, entityId, values);

    res.json({
      success: true,
      data: entity,
      message: "Значения параметров обновлены"
    });
  } catch (error) {
    console.error('Error updating entity values:', error);
    const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
    res.status(400).json({ 
      success: false,
      error: errMessage 
    });
  }
}; 

// ============= ИЗОБРАЖЕНИЯ СУЩНОСТЕЙ =============
// Старое API удалено - теперь используется только GCS API
// См. entitiesGCS.routes.ts для новых endpoints 