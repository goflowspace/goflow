import { Router } from "express";
import { authenticateJWT } from "@middlewares/auth.middleware";
import { validate } from "@middlewares/validation.middleware";
import { asyncHandler } from "@middlewares/errorHandler";
import {
  // Типы сущностей
  getEntityTypes,
  getEntityType,
  createEntityType,
  updateEntityType,
  deleteEntityType,
  addParameterToType,
  removeParameterFromType,
  // Параметры сущностей
  getEntityParameters,
  getEntityParameter,
  createEntityParameter,
  updateEntityParameter,
  deleteEntityParameter,
  // Сущности
  getEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
  updateEntityValues,
  // Изображения - старое API удалено
} from "./entities.controller";
import {
  // Схемы для типов сущностей
  createEntityTypeSchema,
  updateEntityTypeSchema,
  addParameterToTypeSchema,
  entityTypesQuerySchema,
  // Схемы для параметров
  createEntityParameterSchema,
  updateEntityParameterSchema,
  createEntitySchema,
  updateEntitySchema,
  updateEntityValuesSchema,
  entitiesQuerySchema,
  parametersQuerySchema,
  entityQuerySchema,
  // Схемы для изображений - старые схемы удалены
} from "./entities.validation";
import { z } from "zod";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticateJWT);

// Схемы для валидации параметров маршрутов
const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID проекта')
});

const typeIdSchema = z.object({
  typeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID типа')
});

const entityIdSchema = z.object({
  entityId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID сущности')
});

const parameterIdSchema = z.object({
  parameterId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID параметра')
});

// ============= ТИПЫ СУЩНОСТЕЙ =============

// GET /api/projects/:id/entity-types - получение всех типов сущностей проекта
router.get(
  "/:id/entity-types",
  validate(z.object({ 
    params: idParamSchema,
    query: entityTypesQuerySchema 
  })),
  asyncHandler(getEntityTypes)
);

// GET /api/projects/:id/entity-types/:typeId - получение типа сущности по ID
router.get(
  "/:id/entity-types/:typeId",
  validate(z.object({ 
    params: idParamSchema.merge(typeIdSchema)
  })),
  asyncHandler(getEntityType)
);

// POST /api/projects/:id/entity-types - создание типа сущности
router.post(
  "/:id/entity-types",
  validate(z.object({ 
    params: idParamSchema,
    body: createEntityTypeSchema 
  })),
  asyncHandler(createEntityType)
);

// PUT /api/projects/:id/entity-types/:typeId - обновление типа сущности
router.put(
  "/:id/entity-types/:typeId",
  validate(z.object({ 
    params: idParamSchema.merge(typeIdSchema),
    body: updateEntityTypeSchema 
  })),
  asyncHandler(updateEntityType)
);

// DELETE /api/projects/:id/entity-types/:typeId - удаление типа сущности
router.delete(
  "/:id/entity-types/:typeId",
  validate(z.object({ 
    params: idParamSchema.merge(typeIdSchema)
  })),
  asyncHandler(deleteEntityType)
);

// POST /api/projects/:id/entity-types/:typeId/parameters - добавление параметра к типу
router.post(
  "/:id/entity-types/:typeId/parameters",
  validate(z.object({ 
    params: idParamSchema.merge(typeIdSchema),
    body: addParameterToTypeSchema 
  })),
  asyncHandler(addParameterToType)
);

// DELETE /api/projects/:id/entity-types/:typeId/parameters/:parameterId - удаление параметра из типа
router.delete(
  "/:id/entity-types/:typeId/parameters/:parameterId",
  validate(z.object({ 
    params: idParamSchema.merge(typeIdSchema).merge(parameterIdSchema)
  })),
  asyncHandler(removeParameterFromType)
);

// ============= ПАРАМЕТРЫ СУЩНОСТЕЙ =============

// GET /api/projects/:id/entities/parameters - получение всех параметров проекта
router.get(
  "/:id/entities/parameters",
  validate(z.object({ 
    params: idParamSchema,
    query: parametersQuerySchema 
  })),
  asyncHandler(getEntityParameters)
);



// GET /api/projects/:id/entities/parameters/:parameterId - получение параметра по ID
router.get(
  "/:id/entities/parameters/:parameterId",
  validate(z.object({ 
    params: idParamSchema.merge(parameterIdSchema)
  })),
  asyncHandler(getEntityParameter)
);

// POST /api/projects/:id/entities/parameters - создание параметра
router.post(
  "/:id/entities/parameters",
  validate(z.object({ 
    params: idParamSchema,
    body: createEntityParameterSchema 
  })),
  asyncHandler(createEntityParameter)
);

// PUT /api/projects/:id/entities/parameters/:parameterId - обновление параметра
router.put(
  "/:id/entities/parameters/:parameterId",
  validate(z.object({ 
    params: idParamSchema.merge(parameterIdSchema),
    body: updateEntityParameterSchema 
  })),
  asyncHandler(updateEntityParameter)
);

// DELETE /api/projects/:id/entities/parameters/:parameterId - удаление параметра
router.delete(
  "/:id/entities/parameters/:parameterId",
  validate(z.object({ 
    params: idParamSchema.merge(parameterIdSchema)
  })),
  asyncHandler(deleteEntityParameter)
);

// ============= СУЩНОСТИ =============

// GET /api/projects/:id/entities - получение всех сущностей проекта
router.get(
  "/:id/entities",
  validate(z.object({ 
    params: idParamSchema,
    query: entitiesQuerySchema 
  })),
  asyncHandler(getEntities)
);

// GET /api/projects/:id/entities/:entityId - получение сущности по ID
router.get(
  "/:id/entities/:entityId",
  validate(z.object({ 
    params: idParamSchema.merge(entityIdSchema),
    query: entityQuerySchema
  })),
  asyncHandler(getEntity)
);

// POST /api/projects/:id/entities - создание сущности
router.post(
  "/:id/entities",
  validate(z.object({ 
    params: idParamSchema,
    body: createEntitySchema 
  })),
  asyncHandler(createEntity)
);

// PUT /api/projects/:id/entities/:entityId - обновление сущности
router.put(
  "/:id/entities/:entityId",
  validate(z.object({ 
    params: idParamSchema.merge(entityIdSchema),
    body: updateEntitySchema 
  })),
  asyncHandler(updateEntity)
);

// DELETE /api/projects/:id/entities/:entityId - удаление сущности
router.delete(
  "/:id/entities/:entityId",
  validate(z.object({ 
    params: idParamSchema.merge(entityIdSchema)
  })),
  asyncHandler(deleteEntity)
);

// PUT /api/projects/:id/entities/:entityId/values - обновление значений параметров сущности
router.put(
  "/:id/entities/:entityId/values",
  validate(z.object({ 
    params: idParamSchema.merge(entityIdSchema),
    body: updateEntityValuesSchema 
  })),
  asyncHandler(updateEntityValues)
);

// ============= ИЗОБРАЖЕНИЯ СУЩНОСТЕЙ =============
// Старое API удалено - теперь используется только GCS API

export default router; 