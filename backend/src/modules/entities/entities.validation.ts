import { z } from "zod";

// Типы значений параметров
export const parameterValueTypes = [
  'SHORT_TEXT',
  'TEXT',
  'NUMBER',
  'BOOLEAN',
  'SINGLE_SELECT', 
  'MULTI_SELECT',
  'MEDIA',
  'SINGLE_ENTITY',
  'MULTI_ENTITY'
] as const;

// Типы сущностей по умолчанию
export const defaultEntityTypes = [
  'character',    // Персонаж
  'location',     // Локация
  'faction',      // Фракция
  'event',        // Событие
  'rule'          // Правило
] as const;

// ============= СХЕМЫ ДЛЯ ТИПОВ СУЩНОСТЕЙ =============

// Валидация для создания типа сущности
export const createEntityTypeSchema = z.object({
  name: z.string()
    .min(1, 'Название типа не может быть пустым')
    .max(100, 'Название типа не может содержать более 100 символов'),
    
  type: z.string()
    .min(1, 'Идентификатор типа не может быть пустым')
    .max(50, 'Идентификатор типа не может содержать более 50 символов')
    .regex(/^[a-z0-9_]+$/, 'Идентификатор типа может содержать только строчные буквы, цифры и подчеркивания'),
    
  description: z.string()
    .max(500, 'Описание не может содержать более 500 символов')
    .optional(),
    
  order: z.number()
    .int('Порядок должен быть целым числом')
    .min(0, 'Порядок не может быть отрицательным')
    .optional()
    .default(0)
});

// Валидация для обновления типа сущности
export const updateEntityTypeSchema = createEntityTypeSchema.partial();

// Валидация для добавления параметра к типу
export const addParameterToTypeSchema = z.object({
  parameterId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID параметра'),
    
  required: z.boolean()
    .optional()
    .default(false),
    
  order: z.number()
    .int('Порядок должен быть целым числом')
    .min(0, 'Порядок не может быть отрицательным')
    .optional()
    .default(0)
});

// Валидация для запросов типов сущностей
export const entityTypesQuerySchema = z.object({
  includeDefault: z.coerce.boolean().optional().default(true)
});

// ============= СУЩЕСТВУЮЩИЕ СХЕМЫ =============

// Валидация для создания параметра сущности
export const createEntityParameterSchema = z.object({
  name: z.string()
    .min(1, 'Имя параметра не может быть пустым')
    .max(100, 'Имя параметра не может содержать более 100 символов'),
    
  valueType: z.enum(parameterValueTypes, {
    errorMap: () => ({ 
      message: `Тип значения должен быть одним из: ${parameterValueTypes.join(', ')}` 
    })
  }),
  
  options: z.array(z.string())
    .max(50, 'Максимум 50 опций')
    .optional()
    .default([]),
    
  order: z.number()
    .int('Порядок должен быть целым числом')
    .min(0, 'Порядок не может быть отрицательным')
    .optional()
    .default(0)
});

// Валидация для обновления параметра сущности
export const updateEntityParameterSchema = createEntityParameterSchema.partial();

// Валидация для создания сущности
export const createEntitySchema = z.object({
  name: z.string()
    .min(1, 'Имя сущности не может быть пустым')
    .max(200, 'Имя сущности не может содержать более 200 символов'),
    
  entityTypeId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID типа сущности'),
    
  description: z.string()
    .max(1000, 'Описание не может содержать более 1000 символов')
    .optional(),
    
  image: z.any()
    .optional(), // MediaValue структура
    
  // Значения параметров
  values: z.record(z.string(), z.any()) // parameterId -> value
    .optional()
    .default({})
});

// Валидация для обновления сущности
export const updateEntitySchema = createEntitySchema.partial();

// Валидация для значения параметра сущности
export const entityValueSchema = z.object({
  parameterId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID параметра'),
    
  value: z.any() // Может быть string, string[], object для медиа и т.д.
});

// Валидация для обновления значений параметров сущности
export const updateEntityValuesSchema = z.object({
  values: z.array(z.object({
    parameterId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID параметра'),
    value: z.any()
  }))
    .min(1, 'Необходимо указать хотя бы одно значение')
});

// Валидация для загрузки изображения
export const uploadImageSchema = z.object({
  parameterId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID параметра'),
    
  imageData: z.string()
    .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, 'Некорректный формат изображения')
    .refine((data) => {
      // Проверяем размер base64 (приблизительно)
      const base64Content = data.split(',')[1];
      if (!base64Content) return false;
      const sizeInBytes = Math.floor((base64Content.length * 3) / 4);
      return sizeInBytes <= 2097152; // 2MB лимит для исходного файла
    }, 'Размер файла превышает 2MB'),
    
  filename: z.string()
    .min(1, 'Имя файла не может быть пустым')
    .max(255, 'Имя файла не может содержать более 255 символов')
    .regex(/^[^\/\\:*?"<>|]+\.(jpg|jpeg|png|webp)$/i, 'Некорректное имя файла или расширение')
});

// Валидация параметров маршрута
export const projectIdParamSchema = z.object({
  projectId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID проекта')
});

export const entityIdParamSchema = z.object({
  entityId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID сущности')
});

export const parameterIdParamSchema = z.object({
  parameterId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID параметра')
});

// Валидация запросов для поиска сущностей
export const entitiesQuerySchema = z.object({
  entityTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID типа сущности').optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  includeOriginalImages: z.coerce.boolean().optional().default(false) // По умолчанию не включаем original для экономии трафика
});

export const parametersQuerySchema = z.object({
  valueType: z.enum(parameterValueTypes).optional(),
  includeDefault: z.coerce.boolean().optional().default(true)
});

// Валидация запросов для получения единичной сущности
export const entityQuerySchema = z.object({
  includeOriginalImages: z.coerce.boolean().optional().default(false) // По умолчанию не включаем original для экономии трафика
});

 