import { prisma } from "@config/prisma";
import { MediaValue } from "../../types/types.d";
import { imageManager } from "../../services/storage/ImageManager";

/**
 * Проверяет, содержит ли объект изображения пути к GCS файлам
 * Учитывает структуру {set: mediaValue} от Prisma JSON операций
 */
const hasGCSPaths = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  
  // Проверяем Prisma структуру {set: mediaValue}
  const actualValue = value.set || value;
  
  // Проверяем различные возможные структуры GCS изображений
  return (
    (actualValue?.storage === 'gcs') ||
    (actualValue?.original?.gcsPath && typeof actualValue.original.gcsPath === 'string') ||
    (actualValue?.optimized?.gcsPath && typeof actualValue.optimized.gcsPath === 'string') ||
    (actualValue?.thumbnail?.gcsPath && typeof actualValue.thumbnail.gcsPath === 'string') ||
    (actualValue?.gcsPath && typeof actualValue.gcsPath === 'string')
  );
};

// Утилитарная функция для оптимизации MediaValue (исключение original)
const optimizeMediaValue = (mediaValue: any, includeOriginal: boolean = false): any => {
  if (!mediaValue || typeof mediaValue !== 'object') {
    return mediaValue;
  }

  // Если это MediaValue структура
  if (mediaValue.type === 'image' && mediaValue.thumbnail) {
    if (!includeOriginal && mediaValue.original) {
      // Сохраняем AI метаданные из original.metadata перед удалением original
      const aiMetadata = mediaValue.original.metadata ? {
        isAIGenerated: mediaValue.original.metadata.isAIGenerated,
        aiProvider: mediaValue.original.metadata.aiProvider,
        aiModel: mediaValue.original.metadata.aiModel,
        generatedAt: mediaValue.original.metadata.generatedAt
      } : {};

      // Возвращаем копию без original для экономии трафика, но с AI метаданными в thumbnail
      const { original, ...optimized } = mediaValue;
      
      // Добавляем AI метаданные в thumbnail.metadata для сохранения информации
      if (optimized.thumbnail && optimized.thumbnail.metadata) {
        optimized.thumbnail.metadata = {
          ...optimized.thumbnail.metadata,
          ...aiMetadata
        };
      }
      
      return optimized;
    }
  }

  return mediaValue;
};

// Рекурсивная функция для обработки всех MediaValue в объекте
const optimizeEntityImages = (obj: any, includeOriginal: boolean = false): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => optimizeEntityImages(item, includeOriginal));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'image' || (typeof value === 'object' && value !== null && (value as any).type === 'image')) {
      result[key] = optimizeMediaValue(value, includeOriginal);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = optimizeEntityImages(value, includeOriginal);
    } else {
      result[key] = value;
    }
  }
  return result;
};

// Утилитарная функция для исправления структуры image и оптимизации изображений
// TODO: В будущем можно убрать проверку image.set когда все existing данные будут исправлены
const fixImageStructure = (entity: any, includeOriginalImages: boolean = false) => {
  // Исправляем legacy структуру { set: mediaValue } если она еще существует в БД
  if (entity && entity.image && typeof entity.image === 'object') {
    const image = entity.image as any;
    if (image.set) {
      entity.image = image.set;
    }
  }

  // Оптимизируем все изображения в сущности
  return optimizeEntityImages(entity, includeOriginalImages);
};

/**
 * Обогащение сущности связанными сущностями для параметров типа SINGLE_ENTITY и MULTI_ENTITY
 */
const enrichEntityWithRelatedEntities = async (entity: any, includeOriginalImages: boolean = false) => {
  if (!entity.values || entity.values.length === 0) {
    return entity;
  }

  // Ищем параметры типа SINGLE_ENTITY и MULTI_ENTITY
  const entityParameters = entity.values.filter((value: any) => 
    value.parameter && (value.parameter.valueType === 'SINGLE_ENTITY' || value.parameter.valueType === 'MULTI_ENTITY')
  );

  if (entityParameters.length === 0) {
    return entity;
  }

  // Собираем все ID сущностей, которые нужно загрузить
  const entityIdsToLoad = new Set<string>();
  
  for (const param of entityParameters) {
    if (param.parameter.valueType === 'SINGLE_ENTITY' && param.value?.entityId) {
      entityIdsToLoad.add(param.value.entityId);
    } else if (param.parameter.valueType === 'MULTI_ENTITY' && param.value?.entityIds && Array.isArray(param.value.entityIds)) {
      param.value.entityIds.forEach((id: string) => entityIdsToLoad.add(id));
    }
  }

  if (entityIdsToLoad.size === 0) {
    return entity;
  }

  // Загружаем связанные сущности одним запросом
  const relatedEntities = await prisma.entity.findMany({
    where: {
      id: { in: Array.from(entityIdsToLoad) },
      projectId: entity.projectId
    },
    include: {
      entityType: true
    }
  });

  // Создаем индекс для быстрого поиска
  const entitiesIndex = new Map(relatedEntities.map(e => [e.id, fixImageStructure(e, includeOriginalImages)]));

  // Обогащаем значения параметров данными сущностей
  const enrichedValues = entity.values.map((value: any) => {
    if (!value.parameter) return value;

    if (value.parameter.valueType === 'SINGLE_ENTITY' && value.value?.entityId) {
      const relatedEntity = entitiesIndex.get(value.value.entityId);
      return {
        ...value,
        value: {
          ...value.value,
          entity: relatedEntity || null
        }
      };
    } else if (value.parameter.valueType === 'MULTI_ENTITY' && value.value?.entityIds && Array.isArray(value.value.entityIds)) {
      const relatedEntitiesList = value.value.entityIds
        .map((id: string) => entitiesIndex.get(id))
        .filter(Boolean);
      
      return {
        ...value,
        value: {
          ...value.value,
          entities: relatedEntitiesList
        }
      };
    }

    return value;
  });

  return {
    ...entity,
    values: enrichedValues
  };
};

// Типы для TypeScript
export interface CreateEntityParameterDto {
  name: string;
  valueType: 'SHORT_TEXT' | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'MEDIA' | 'SINGLE_ENTITY' | 'MULTI_ENTITY';
  options?: string[];
  order?: number;
}

export interface UpdateEntityParameterDto extends Partial<CreateEntityParameterDto> {}

// Новые интерфейсы для типов сущностей
export interface CreateEntityTypeDto {
  name: string;
  type: string;
  description?: string;
  order?: number;
}

export interface UpdateEntityTypeDto extends Partial<CreateEntityTypeDto> {}

export interface EntityTypeParameterDto {
  parameterId: string;
  required?: boolean;
  order?: number;
}

export interface CreateEntityDto {
  name: string;
  entityTypeId: string;   // Обязательное поле для кастомного типа
  description?: string;
  image?: MediaValue | null;
  values?: Record<string, any>;
}

export interface UpdateEntityDto extends Partial<CreateEntityDto> {}

export interface EntitiesQueryParams {
  entityTypeId?: string; // Поиск по кастомному типу
  search?: string;
  page?: number | string; // Может быть number или string из query параметров
  limit?: number | string; // Может быть number или string из query параметров
  includeOriginalImages?: boolean | string; // Может быть boolean или string из query параметров
}

export interface ParametersQueryParams {
  valueType?: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'MEDIA' | 'MULTIPLE';
  includeDefault?: boolean;
}

export interface EntityTypesQueryParams {
  includeDefault?: boolean;
}

// Интерфейс для предустановленного типа сущности
interface DefaultEntityTypeTemplate {
  name: string;
  type: string;
  description: string;
  isDefault: boolean;
  order: number;
  parameters: {
    name: string;
    valueType: string;
    required: boolean;
    order: number;
    options?: string[];
  }[];
}

// Предустановленные типы сущностей с параметрами
const DEFAULT_ENTITY_TYPES: DefaultEntityTypeTemplate[] = [
  // Пустой массив - проекты "Без шаблона" не будут иметь предустановленных типов сущностей
];

// ============= ТИПЫ СУЩНОСТЕЙ =============

/**
 * Получение всех типов сущностей проекта
 */
export const getEntityTypesService = async (
  projectId: string,
  query: EntityTypesQueryParams = {}
) => {
  const { includeDefault = true } = query;
  
  const where: any = { projectId };
  
  if (!includeDefault) {
    where.isDefault = false;
  }

  return await prisma.entityType.findMany({
    where,
    include: {
      parameters: {
        include: {
          parameter: true
        },
        orderBy: { order: 'asc' }
      },
      _count: {
        select: { entities: true }
      }
    },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'asc' }
    ]
  });
};

/**
 * Получение типа сущности по ID
 */
export const getEntityTypeService = async (projectId: string, typeId: string) => {
  const entityType = await prisma.entityType.findFirst({
    where: {
      id: typeId,
      projectId
    },
    include: {
      parameters: {
        include: {
          parameter: true
        },
        orderBy: { order: 'asc' }
      },
      _count: {
        select: { entities: true }
      }
    }
  });

  if (!entityType) {
    throw new Error("Тип сущности не найден");
  }

  return entityType;
};

/**
 * Создание типа сущности
 */
export const createEntityTypeService = async (
  projectId: string,
  data: CreateEntityTypeDto
) => {
  // Проверяем, что проект существует
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error("Проект не найден");
  }

  // Проверяем уникальность типа в проекте
  const existingType = await prisma.entityType.findFirst({
    where: {
      projectId,
      type: data.type
    }
  });

  if (existingType) {
    throw new Error("Тип с таким идентификатором уже существует");
  }

  return await prisma.entityType.create({
    data: {
      projectId,
      name: data.name,
      type: data.type,
      description: data.description,
      order: data.order || 0,
      isDefault: false
    },
    include: {
      parameters: {
        include: {
          parameter: true
        }
      }
    }
  });
};

/**
 * Обновление типа сущности
 */
export const updateEntityTypeService = async (
  projectId: string,
  typeId: string,
  data: UpdateEntityTypeDto
) => {
  // Проверяем существование типа
  const existingType = await prisma.entityType.findFirst({
    where: {
      id: typeId,
      projectId
    }
  });

  if (!existingType) {
    throw new Error("Тип сущности не найден");
  }

  // Если обновляется идентификатор типа, проверяем уникальность
  if (data.type && data.type !== existingType.type) {
    const duplicateType = await prisma.entityType.findFirst({
      where: {
        projectId,
        type: data.type,
        id: { not: typeId }
      }
    });

    if (duplicateType) {
      throw new Error("Тип с таким идентификатором уже существует");
    }
  }

  return await prisma.entityType.update({
    where: { id: typeId },
    data: {
      name: data.name,
      type: data.type,
      description: data.description,
      order: data.order
    },
    include: {
      parameters: {
        include: {
          parameter: true
        }
      }
    }
  });
};

/**
 * Удаление типа сущности
 */
export const deleteEntityTypeService = async (projectId: string, typeId: string) => {
  // Проверяем существование типа
  const existingType = await prisma.entityType.findFirst({
    where: {
      id: typeId,
      projectId
    },
    include: {
      _count: {
        select: { entities: true }
      }
    }
  });

  if (!existingType) {
    throw new Error("Тип сущности не найден");
  }

  // Проверяем, нет ли связанных сущностей
  if (existingType._count.entities > 0) {
    throw new Error(`Невозможно удалить тип. Найдено ${existingType._count.entities} сущностей этого типа. Сначала удалите или переместите их в другой тип.`);
  }

  // Удаляем тип (связанные EntityTypeParameter удалятся каскадно)
  return await prisma.entityType.delete({
    where: { id: typeId }
  });
};

/**
 * Добавление параметра к типу сущности
 */
export const addParameterToTypeService = async (
  projectId: string,
  typeId: string,
  data: EntityTypeParameterDto
) => {
  // Проверяем существование типа и параметра
  const [entityType, parameter] = await Promise.all([
    prisma.entityType.findFirst({
      where: { id: typeId, projectId }
    }),
    prisma.entityParameter.findFirst({
      where: { id: data.parameterId, projectId }
    })
  ]);

  if (!entityType) {
    throw new Error("Тип сущности не найден");
  }

  if (!parameter) {
    throw new Error("Параметр не найден");
  }

  // Проверяем, не добавлен ли уже этот параметр к типу
  const existingLink = await prisma.entityTypeParameter.findFirst({
    where: {
      entityTypeId: typeId,
      parameterId: data.parameterId
    }
  });

  if (existingLink) {
    throw new Error("Параметр уже добавлен к этому типу");
  }

  return await prisma.entityTypeParameter.create({
    data: {
      entityTypeId: typeId,
      parameterId: data.parameterId,
      required: data.required || false,
      order: data.order || 0
    },
    include: {
      parameter: true
    }
  });
};

/**
 * Удаление параметра из типа сущности
 */
export const removeParameterFromTypeService = async (
  projectId: string,
  typeId: string,
  parameterId: string
) => {
  // Проверяем существование связи
  const existingLink = await prisma.entityTypeParameter.findFirst({
    where: {
      entityTypeId: typeId,
      parameterId,
      entityType: {
        projectId
      }
    }
  });

  if (!existingLink) {
    throw new Error("Связь между типом и параметром не найдена");
  }

  // Удаляем связь
  return await prisma.entityTypeParameter.delete({
    where: { id: existingLink.id }
  });
};

/**
 * Инициализация предустановленных типов сущностей для нового проекта
 */
export const initializeDefaultEntityTypesService = async (projectId: string, txClient?: any) => {
  const executeInTransaction = async (tx: any) => {
    const createdTypes = [];

    for (const typeData of DEFAULT_ENTITY_TYPES) {
      // Создаем тип сущности
      const entityType = await tx.entityType.create({
        data: {
          projectId,
          name: typeData.name,
          type: typeData.type,
          description: typeData.description,
          isDefault: typeData.isDefault,
          order: typeData.order
        }
      });

      // Создаем параметры для этого типа
      for (const paramData of typeData.parameters) {
        // Создаем параметр
        const parameter = await tx.entityParameter.create({
          data: {
            projectId,
            name: paramData.name,
            valueType: paramData.valueType as any,
            order: paramData.order
          }
        });

        // Связываем параметр с типом
        await tx.entityTypeParameter.create({
          data: {
            entityTypeId: entityType.id,
            parameterId: parameter.id,
            required: paramData.required,
            order: paramData.order
          }
        });
      }

      createdTypes.push(entityType);
    }

    return createdTypes;
  };

  // Если передан транзакционный клиент, используем его, иначе создаем новую транзакцию
  if (txClient) {
    return executeInTransaction(txClient);
  } else {
    return await prisma.$transaction(executeInTransaction);
  }
};

// ============= ПАРАМЕТРЫ СУЩНОСТЕЙ =============

/**
 * Получение всех параметров проекта
 */
export const getEntityParametersService = async (
  projectId: string, 
  query: ParametersQueryParams = {}
) => {
  const { valueType, includeDefault = true } = query;

  const where: any = { projectId };
  
  if (valueType) {
    where.valueType = valueType;
  }
  
  if (!includeDefault) {
    where.isDefault = false;
  }

  return await prisma.entityParameter.findMany({
    where,
    orderBy: [
      { order: 'asc' },
      { createdAt: 'asc' }
    ]
  });
};

/**
 * Получение параметра по ID
 */
export const getEntityParameterService = async (projectId: string, parameterId: string) => {
  return await prisma.entityParameter.findFirst({
    where: {
      id: parameterId,
      projectId
    }
  });
};

/**
 * Создание параметра сущности
 */
export const createEntityParameterService = async (
  projectId: string, 
  data: CreateEntityParameterDto
) => {
  // Проверяем, что проект существует
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error("Проект не найден");
  }

  return await prisma.entityParameter.create({
    data: {
      projectId,
      name: data.name,
      valueType: data.valueType,
      options: data.options || [],
      order: data.order || 0
    }
  });
};

/**
 * Обновление параметра сущности
 */
export const updateEntityParameterService = async (
  projectId: string,
  parameterId: string,
  data: UpdateEntityParameterDto
) => {
  // Проверяем существование параметра
  const existingParameter = await prisma.entityParameter.findFirst({
    where: {
      id: parameterId,
      projectId
    }
  });

  if (!existingParameter) {
    throw new Error("Параметр не найден");
  }

  return await prisma.entityParameter.update({
    where: { id: parameterId },
    data: {
      name: data.name,
      valueType: data.valueType,
      options: data.options,
      order: data.order
    }
  });
};

/**
 * Удаление параметра сущности
 */
export const deleteEntityParameterService = async (
  projectId: string,
  parameterId: string
) => {
  // Проверяем существование параметра
  const existingParameter = await prisma.entityParameter.findFirst({
    where: {
      id: parameterId,
      projectId
    }
  });

  if (!existingParameter) {
    throw new Error("Параметр не найден");
  }

  // Удаляем параметр (связанные значения удалятся каскадно)
  return await prisma.entityParameter.delete({
    where: { id: parameterId }
  });
};

/**
 * Комплексная валидация параметров для типа сущности
 * Фильтрует несуществующие параметры и проверяет связи с сущностями
 */
const validateAndFilterEntityParameters = async (
  projectId: string,
  entityTypeId: string,
  values: Record<string, any>
): Promise<{ validValues: Record<string, any>; warnings: string[] }> => {
  if (!values || Object.keys(values).length === 0) {
    return { validValues: {}, warnings: [] };
  }

  const warnings: string[] = [];

  // Получаем все параметры для данного типа сущности
  const entityType = await prisma.entityType.findUnique({
    where: { 
      id: entityTypeId,
      projectId // Дополнительная проверка принадлежности к проекту
    },
    include: {
      parameters: {
        include: {
          parameter: true
        }
      }
    }
  });

  if (!entityType) {
    throw new Error("Тип сущности не найден");
  }

  // Создаем Map для быстрого поиска параметров по ID
  const validParametersMap = new Map(
    entityType.parameters.map(etp => [etp.parameter.id, etp])
  );

  // Фильтруем только валидные параметры (этап 1: проверка существования параметров)
  const filteredValues: Record<string, any> = {};

  for (const [parameterId, value] of Object.entries(values)) {
    const entityTypeParam = validParametersMap.get(parameterId);
    
    if (!entityTypeParam) {
      warnings.push(`Параметр с ID ${parameterId} не существует в типе сущности "${entityType.name}" - игнорирован`);
      continue;
    }

    // Параметр существует в типе сущности, добавляем его
    filteredValues[parameterId] = value;
  }

  // Этап 2: Валидация связей с сущностями для SINGLE_ENTITY и MULTI_ENTITY параметров
  if (Object.keys(filteredValues).length > 0) {
    const { validValues: relationValidatedValues, warnings: relationWarnings } = await validateAndFilterEntityRelations(
      projectId,
      filteredValues,
      Object.keys(filteredValues)
    );

    warnings.push(...relationWarnings);
    return { validValues: relationValidatedValues, warnings };
  }

  return { validValues: filteredValues, warnings };
};

/**
 * Валидация и фильтрация значений параметров типа SINGLE_ENTITY и MULTI_ENTITY
 * Удаляет связи с несуществующими сущностями вместо генерации ошибки
 */
const validateAndFilterEntityRelations = async (
  projectId: string,
  values: Record<string, any>,
  parameterIds: string[]
): Promise<{ validValues: Record<string, any>; warnings: string[] }> => {
  if (!values || Object.keys(values).length === 0) {
    return { validValues: {}, warnings: [] };
  }

  const warnings: string[] = [];
  const finalValidValues: Record<string, any> = {};

  // Получаем параметры для валидации
  const parameters = await prisma.entityParameter.findMany({
    where: {
      id: { in: parameterIds },
      projectId
    }
  });

  const entityIdsToValidate = new Set<string>();
  const parameterData = new Map<string, {
    parameter: any;
    value: any;
    relatedEntityIds: string[];
  }>();

  // Этап 1: Собираем все ID сущностей для проверки и подготавливаем данные
  for (const parameter of parameters) {
    const value = values[parameter.id];
    
    if (!value) {
      finalValidValues[parameter.id] = value;
      continue;
    }

    if (parameter.valueType === 'SINGLE_ENTITY') {
      if (value.entityId && typeof value.entityId === 'string') {
        entityIdsToValidate.add(value.entityId);
        parameterData.set(parameter.id, {
          parameter,
          value,
          relatedEntityIds: [value.entityId]
        });
      } else if (value.entityId) {
        warnings.push(`Неверный формат значения для параметра "${parameter.name}". Ожидается объект с полем entityId - значение игнорировано`);
        continue;
      } else {
        // Если entityId пустой, это нормально
        finalValidValues[parameter.id] = value;
      }
    } else if (parameter.valueType === 'MULTI_ENTITY') {
      if (value.entityIds && Array.isArray(value.entityIds)) {
        const validEntityIds: string[] = [];
        
        value.entityIds.forEach((id: any) => {
          if (typeof id === 'string') {
            entityIdsToValidate.add(id);
            validEntityIds.push(id);
          } else {
            warnings.push(`Неверный ID сущности в параметре "${parameter.name}": ${id} - игнорирован`);
          }
        });
        
        if (validEntityIds.length > 0) {
          parameterData.set(parameter.id, {
            parameter,
            value: { ...value, entityIds: validEntityIds },
            relatedEntityIds: validEntityIds
          });
        } else {
          // Если не осталось валидных ID, просто копируем значение без entityIds
          finalValidValues[parameter.id] = value;
        }
      } else if (value.entityIds) {
        warnings.push(`Неверный формат значения для параметра "${parameter.name}". Ожидается объект с полем entityIds (массив) - значение игнорировано`);
        continue;
      } else {
        finalValidValues[parameter.id] = value;
      }
    } else {
      // Для других типов параметров просто копируем значение
      finalValidValues[parameter.id] = value;
    }
  }

  // Этап 2: Проверяем существование всех указанных сущностей
  if (entityIdsToValidate.size > 0) {
    const existingEntities = await prisma.entity.findMany({
      where: {
        id: { in: Array.from(entityIdsToValidate) },
        projectId
      },
      select: { id: true }
    });

    const existingEntityIds = new Set(existingEntities.map(e => e.id));

    // Этап 3: Обрабатываем параметры с проверкой существования связанных сущностей
    for (const [parameterId, data] of parameterData.entries()) {
      const { parameter, value, relatedEntityIds } = data;

      if (parameter.valueType === 'SINGLE_ENTITY') {
        const entityId = relatedEntityIds[0];
        if (existingEntityIds.has(entityId)) {
          // Сущность существует - добавляем параметр
          finalValidValues[parameterId] = value;
        } else {
          // Сущность не существует - игнорируем параметр
          warnings.push(`Связанная сущность с ID ${entityId} не найдена для параметра "${parameter.name}" - связь удалена`);
        }
      } else if (parameter.valueType === 'MULTI_ENTITY') {
        // Фильтруем только существующие сущности
        const existingIds = relatedEntityIds.filter(id => existingEntityIds.has(id));
        const missingIds = relatedEntityIds.filter(id => !existingEntityIds.has(id));

        // Логируем отсутствующие сущности
        for (const missingId of missingIds) {
          warnings.push(`Связанная сущность с ID ${missingId} не найдена для параметра "${parameter.name}" - ID удален из списка`);
        }

        if (existingIds.length > 0) {
          // Есть валидные связи - добавляем параметр с отфильтрованным массивом
          finalValidValues[parameterId] = {
            ...value,
            entityIds: existingIds
          };
        } else {
          // Не осталось валидных связей - удаляем параметр
          warnings.push(`Параметр "${parameter.name}" удален - не осталось валидных связей`);
        }
      }
    }
  } else {
    // Нет сущностей для проверки - добавляем все параметры как есть
    for (const [parameterId, data] of parameterData.entries()) {
      finalValidValues[parameterId] = data.value;
    }
  }

  return { validValues: finalValidValues, warnings };
};

// ============= СУЩНОСТИ =============

/**
 * Получение всех сущностей проекта
 */
export const getEntitiesService = async (
  projectId: string, 
  query: EntitiesQueryParams = {}
) => {
  const { entityTypeId, search, page: pageRaw = 1, limit: limitRaw = 20, includeOriginalImages: includeOriginalImagesRaw = false } = query;
  
  // Преобразуем page и limit в числа (так как из query могут прийти строки)
  const page = typeof pageRaw === 'string' ? parseInt(pageRaw, 10) : pageRaw;
  const limit = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : limitRaw;
  
  // Преобразуем строку в boolean (так как из query может прийти строка)
  const includeOriginalImages = typeof includeOriginalImagesRaw === 'string' 
    ? includeOriginalImagesRaw === 'true' 
    : Boolean(includeOriginalImagesRaw);
  
  const where: any = { projectId };

  if (entityTypeId) {
    where.entityTypeId = entityTypeId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [entities, total] = await Promise.all([
    prisma.entity.findMany({
      where,
      include: {
        entityType: true, // Включаем данные типа
        values: {
          include: {
            parameter: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.entity.count({ where })
  ]);

  // Обогащаем сущности связанными данными и исправляем структуру image
  const enrichedEntities = await Promise.all(
    entities.map(async entity => {
      const enrichedEntity = await enrichEntityWithRelatedEntities(entity, includeOriginalImages);
      return fixImageStructure(enrichedEntity, includeOriginalImages);
    })
  );

  return {
    entities: enrichedEntities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Получение сущности по ID
 */
export const getEntityService = async (
  projectId: string, 
  entityId: string, 
  includeOriginalImagesRaw: boolean | string = false
) => {
  // Преобразуем строку в boolean (так как из query может прийти строка)
  const includeOriginalImages = typeof includeOriginalImagesRaw === 'string' 
    ? includeOriginalImagesRaw === 'true' 
    : Boolean(includeOriginalImagesRaw);

  const entity = await prisma.entity.findFirst({
    where: {
      id: entityId,
      projectId
    },
    include: {
      entityType: true, // Включаем данные типа
      values: {
        include: {
          parameter: true
        }
      }
    }
  });

  if (!entity) {
    throw new Error("Сущность не найдена");
  }

  const enrichedEntity = await enrichEntityWithRelatedEntities(entity, includeOriginalImages);
  return fixImageStructure(enrichedEntity, includeOriginalImages);
};

/**
 * Создание сущности
 */
export const createEntityService = async (
  projectId: string, 
  data: CreateEntityDto
) => {
  // Проверяем, что проект существует
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error("Проект не найден");
  }

  // Проверяем, что тип сущности существует
  const entityType = await prisma.entityType.findFirst({
    where: {
      id: data.entityTypeId,
      projectId
    }
  });

  if (!entityType) {
    throw new Error("Тип сущности не найден");
  }

  // Создаем сущность
  const entity = await prisma.entity.create({
    data: {
      projectId,
      name: data.name,
      entityTypeId: data.entityTypeId,
      description: data.description,
      image: data.image as any
    }
  });

  // Если переданы значения параметров, валидируем и создаем их
  if (data.values && Object.keys(data.values).length > 0) {
    // Фильтруем параметры, оставляя только те, которые существуют в типе сущности
    const { validValues, warnings } = await validateAndFilterEntityParameters(
      projectId, 
      data.entityTypeId, 
      data.values
    );

    // Логируем предупреждения, если есть неверные параметры
    if (warnings.length > 0) {
      console.warn('⚠️ Entity creation warnings:', warnings);
      warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    if (Object.keys(validValues).length > 0) {
      // Фильтруем null и undefined значения
      const finalValues = Object.entries(validValues).filter(([_parameterId, value]) => 
        value !== null && value !== undefined
      );
      
      if (finalValues.length > 0) {
        await Promise.all(
          finalValues.map(([parameterId, value]) =>
            prisma.entityValue.create({
              data: {
                entityId: entity.id,
                parameterId,
                value
              }
            })
          )
        );
      }
    }
  }

  // Возвращаем сущность с полными данными
  const createdEntity = await prisma.entity.findUnique({
    where: { id: entity.id },
    include: {
      entityType: true,
      values: {
        include: {
          parameter: true
        }
      }
    }
  });

  return fixImageStructure(createdEntity, true); // При создании возвращаем полные данные
};

/**
 * Обновление сущности
 */
export const updateEntityService = async (
  projectId: string, 
  entityId: string, 
  data: UpdateEntityDto
) => {
  // Проверяем, что сущность существует и принадлежит проекту
  const existingEntity = await prisma.entity.findFirst({
    where: {
      id: entityId,
      projectId
    }
  });

  if (!existingEntity) {
    throw new Error("Сущность не найдена");
  }

  // Если обновляется тип сущности, проверяем его существование
  if (data.entityTypeId) {
    const entityType = await prisma.entityType.findFirst({
      where: {
        id: data.entityTypeId,
        projectId
      }
    });

    if (!entityType) {
      throw new Error("Тип сущности не найден");
    }
  }

  // Подготавливаем данные для обновления
  const updateData: any = {
    name: data.name,
    entityTypeId: data.entityTypeId,
    description: data.description,
  };

  // Обновляем image напрямую
  if (data.image !== undefined) {
    updateData.image = data.image as any;
  }

  // Обновляем основные поля сущности
  await prisma.entity.update({
    where: { id: entityId },
    data: updateData
  });

  // Если переданы значения параметров, обновляем их
  if (data.values) {
    // Используем обновленный тип сущности или существующий
    const targetEntityTypeId = data.entityTypeId || existingEntity.entityTypeId;
    
    // Фильтруем параметры, оставляя только те, которые существуют в типе сущности
    const { validValues, warnings } = await validateAndFilterEntityParameters(
      projectId, 
      targetEntityTypeId, 
      data.values
    );

    // Логируем предупреждения, если есть неверные параметры
    if (warnings.length > 0) {
      console.warn('⚠️ Entity update warnings:', warnings);
      warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    // Удаляем старые значения
    await prisma.entityValue.deleteMany({
      where: { entityId }
    });

    if (Object.keys(validValues).length > 0) {
      // Создаем новые значения, исключая null и undefined
      const finalValues = Object.entries(validValues).filter(([_parameterId, value]) => 
        value !== null && value !== undefined
      );
      
      if (finalValues.length > 0) {
        await Promise.all(
          finalValues.map(([parameterId, value]) =>
            prisma.entityValue.create({
              data: {
                entityId,
                parameterId,
                value
              }
            })
          )
        );
      }
    }
  }

  // Возвращаем обновленную сущность с полными данными
  const updatedEntity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      entityType: true,
      values: {
        include: {
          parameter: true
        }
      }
    }
  });

  return fixImageStructure(updatedEntity, true); // При обновлении возвращаем полные данные
};

/**
 * Получает teamId по projectId
 */
const getTeamIdByProject = async (projectId: string): Promise<string> => {
  const teamProject = await prisma.teamProject.findFirst({
    where: { projectId: projectId },
    select: { teamId: true }
  });

  if (!teamProject) {
    throw new Error('Проект не найден в командах или не имеет привязки к команде');
  }

  return teamProject.teamId;
};

/**
 * Удаление сущности с очисткой изображений из GCS
 */
export const deleteEntityService = async (
  projectId: string,
  entityId: string,
  userId?: string
) => {
  // Получаем полную сущность с изображениями
  const existingEntity = await prisma.entity.findFirst({
    where: {
      id: entityId,
      projectId
    },
    include: {
      values: {
        include: {
          parameter: true
        }
      }
    }
  });

  if (!existingEntity) {
    throw new Error("Сущность не найдена");
  }

  // Удаляем изображения из GCS если есть userId для проверки доступа
  if (userId) {
    try {
      const teamId = await getTeamIdByProject(projectId);

      // Проверяем, есть ли у сущности изображения (аватар или MEDIA параметры)
      const hasAvatar = existingEntity.image && hasGCSPaths(existingEntity.image);
      const hasMediaParams = existingEntity.values.some(
        (value: any) => value.parameter.valueType === 'MEDIA' && hasGCSPaths(value.value)
      );

      if (hasAvatar || hasMediaParams) {
        await imageManager.deleteEntityImages(teamId, projectId, entityId, userId);
        console.log(`✅ Удалены изображения сущности ${entityId} из GCS`);
      }

    } catch (imageCleanupError) {
      console.error(`❌ Ошибка при удалении изображений сущности ${entityId}:`, imageCleanupError);
      // Не останавливаем удаление сущности из-за ошибок с изображениями
    }
  }

  // Удаляем сущность из БД (связанные значения удалятся каскадно)
  return await prisma.entity.delete({
    where: { id: entityId }
  });
};

/**
 * Обновление значений параметров сущности
 */
export const updateEntityValuesService = async (
  projectId: string,
  entityId: string,
  values: Array<{ parameterId: string; value: any }>
) => {
  // Проверяем существование сущности
  const existingEntity = await prisma.entity.findFirst({
    where: {
      id: entityId,
      projectId
    }
  });

  if (!existingEntity) {
    throw new Error("Сущность не найдена");
  }

  // Сначала фильтруем параметры, оставляя только существующие в типе сущности
  const valuesRecord = values.reduce((acc, { parameterId, value }) => {
    acc[parameterId] = value;
    return acc;
  }, {} as Record<string, any>);

  const { validValues, warnings } = await validateAndFilterEntityParameters(
    projectId, 
    existingEntity.entityTypeId, 
    valuesRecord
  );

  // Логируем предупреждения, если есть неверные параметры или связи
  if (warnings.length > 0) {
    console.warn('⚠️ Entity values update warnings:', warnings);
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  const validParameterIds = Object.keys(validValues);

  // Удаляем старые значения для обновляемых параметров
  await prisma.entityValue.deleteMany({
    where: {
      entityId,
      parameterId: { in: validParameterIds }
    }
  });

  // Создаем новые значения, исключая null и undefined
  const finalValues = Object.entries(validValues).filter(([_parameterId, value]) => 
    value !== null && value !== undefined
  );
  
  if (finalValues.length > 0) {
    await Promise.all(
      finalValues.map(([parameterId, value]) =>
        prisma.entityValue.create({
          data: {
            entityId,
            parameterId,
            value
          }
        })
      )
    );
  }

  // Возвращаем обновленную сущность
  return await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      values: {
        include: {
          parameter: true
        }
      }
    }
  });
};

// Импортируем универсальную функцию проверки доступа
export { checkUserProjectAccess } from "../../utils/projectAccess"; 