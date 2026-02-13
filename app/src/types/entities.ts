// Типы значений параметров
export type ParameterValueType =
  | 'SHORT_TEXT' // Однострочный текст
  | 'TEXT' // Многострочный текст
  | 'NUMBER' // Число
  | 'BOOLEAN' // Булево значение (да/нет)
  | 'SINGLE_SELECT' // Выбор одного значения из списка
  | 'MULTI_SELECT' // Выбор нескольких значений из списка
  | 'MEDIA' // Медиа файл (изображение)
  | 'SINGLE_ENTITY' // Ссылка на одну сущность
  | 'MULTI_ENTITY'; // Ссылки на множество сущностей

// Интерфейсы для работы с изображениями
export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  mimeType: string;
  filename: string;
  // AI generation metadata
  isAIGenerated?: boolean; // Флаг что изображение создано ИИ
  aiProvider?: 'openai' | 'gemini' | 'anthropic'; // Провайдер ИИ
  aiModel?: string;
  generatedAt?: Date; // Дата генерации ИИ
}

export interface MediaValue {
  type: 'image';
  storage: 'gcs';
  original: {
    gcsPath: string; // Путь в GCS
    publicUrl?: string; // Только для публичных изображений
    metadata: ImageMetadata;
    compressionRatio: number;
  };
  optimized: {
    gcsPath: string; // Путь в GCS для оптимизированной версии
    publicUrl?: string;
    metadata: ImageMetadata;
    compressionRatio: number;
  };
  thumbnail: {
    gcsPath: string; // Путь в GCS
    publicUrl?: string;
    metadata: ImageMetadata;
    compressionRatio: number;
  };
  uploadedAt: Date;
  processedAt: Date;
}

// Типы для GCS API
export interface GCSImageRequest {
  entityId: string;
  parameterId: string;
  version: 'original' | 'optimized' | 'thumbnail';
}

export interface SignedUrlRequest {
  teamId: string;
  projectId: string;
  imageIds: GCSImageRequest[];
  ttl?: number;
}

export interface SignedUrlResponse {
  success: boolean;
  data?: Array<{
    entityId: string;
    parameterId: string;
    version: 'original' | 'optimized' | 'thumbnail';
    signedUrl: string;
    expiresAt: string;
  }>;
  error?: string;
}

export interface BatchAccessRequest {
  teamId: string;
  projectId: string;
  entityIds: string[];
  types: Array<'original' | 'optimized' | 'thumbnail'>;
  ttl?: number;
}

export interface ImageUploadGCSRequest {
  teamId: string;
  projectId: string;
  entityId: string;
  parameterId: string;
  imageData: string; // base64
  filename: string;
  // AI generation metadata
  aiMetadata?: {
    isAIGenerated?: boolean;
    aiProvider?: 'openai' | 'gemini' | 'anthropic';
    aiModel?: string;
    generatedAt?: Date;
  };
}

// Интерфейсы для значений параметров типа сущность
export interface SingleEntityValue {
  entityId: string;
  entity?: Entity; // Загруженная сущность (если доступна)
}

export interface MultiEntityValue {
  entityIds: string[];
  entities?: Entity[]; // Загруженные сущности (если доступны)
}

// ============= НОВЫЕ ИНТЕРФЕЙСЫ ДЛЯ ТИПОВ СУЩНОСТЕЙ =============

// Интерфейс типа сущности
export interface EntityType {
  id: string;
  projectId: string;
  name: string; // Название типа (например, "Персонаж")
  type: string; // Уникальный идентификатор (например, "character")
  description?: string;
  isDefault: boolean; // Предустановленный тип
  order: number;
  parameters?: EntityTypeParameter[]; // Параметры типа
  _count?: {
    entities: number; // Количество сущностей этого типа
  };
  createdAt: string;
  updatedAt: string;
}

// Интерфейс связи типа с параметром
export interface EntityTypeParameter {
  id: string;
  entityTypeId: string;
  parameterId: string;
  required: boolean; // Обязательный ли параметр для этого типа
  order: number;
  parameter?: EntityParameter; // Данные параметра
  createdAt: string;
  updatedAt: string;
}

// ============= ОБНОВЛЕННЫЕ ИНТЕРФЕЙСЫ =============

// Интерфейс параметра сущности
export interface EntityParameter {
  id: string;
  projectId: string;
  name: string;
  valueType: ParameterValueType;
  options: string[];
  order: number;
  entityTypes?: EntityTypeParameter[]; // Типы, использующие этот параметр
  createdAt: string;
  updatedAt: string;
}

// Интерфейс значения параметра сущности
export interface EntityValue {
  id: string;
  entityId: string;
  parameterId: string;
  value: any; // JSON значение
  parameter?: EntityParameter;
  createdAt: string;
  updatedAt: string;
}

// Интерфейс сущности
export interface Entity {
  id: string;
  projectId: string;
  name: string;
  entityTypeId: string; // Ссылка на кастомный тип (обязательное поле)
  image?: MediaValue; // Изображение сущности (MediaValue структура)
  description?: string;
  entityType?: EntityType; // Данные типа сущности
  values?: EntityValue[];
  createdAt: string;
  updatedAt: string;
}

// ============= DTO ДЛЯ ТИПОВ СУЩНОСТЕЙ =============

// DTO для создания типа сущности
export interface CreateEntityTypeDto {
  name: string;
  type: string;
  description?: string;
  order?: number;
}

export interface UpdateEntityTypeDto extends Partial<CreateEntityTypeDto> {
  id?: string; // ID типа для обновления
}

// DTO для добавления параметра к типу
export interface EntityTypeParameterDto {
  parameterId: string;
  required?: boolean;
  order?: number;
}

// ============= ОБНОВЛЕННЫЕ DTO =============

// DTO для создания параметра сущности
export interface CreateEntityParameterDto {
  name: string;
  valueType: ParameterValueType;
  options?: string[];
  order?: number;
}

export interface UpdateEntityParameterDto extends Partial<CreateEntityParameterDto> {
  id?: string; // ID параметра для обновления
}

// DTO для создания сущности
export interface CreateEntityDto {
  name: string;
  entityTypeId: string; // Обязательное поле для кастомного типа
  description?: string;
  image?: MediaValue; // Изображение сущности (MediaValue структура)
  values?: Record<string, any>; // parameterId -> value
}

export interface UpdateEntityDto extends Partial<CreateEntityDto> {
  id?: string; // ID сущности для обновления
}

// DTO для обновления значений параметров
export interface UpdateEntityValuesDto {
  values: Array<{
    parameterId: string;
    value: any;
  }>;
}

// ============= ОТВЕТЫ API =============

// Ответы для типов сущностей
export interface EntityTypeResponse {
  success: boolean;
  data: EntityType;
  message?: string;
}

export interface EntityTypesResponse {
  success: boolean;
  data: EntityType[];
}

// Ответы для параметров
export interface EntityParameterResponse {
  success: boolean;
  data: EntityParameter;
  message?: string;
}

export interface EntityParametersResponse {
  success: boolean;
  data: EntityParameter[];
}

// Ответы для сущностей
export interface EntityResponse {
  success: boolean;
  data: Entity;
  message?: string;
}

export interface EntitiesResponse {
  success: boolean;
  data: Entity[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============= QUERY ПАРАМЕТРЫ =============

export interface EntitiesQueryParams {
  entityTypeId?: string; // Поиск по кастомному типу
  search?: string;
  page?: number;
  limit?: number;
  includeOriginalImages?: boolean; // По умолчанию false - возвращать только thumbnail для экономии трафика
}

export interface ParametersQueryParams {
  valueType?: ParameterValueType;
  includeDefault?: boolean;
}

export interface EntityTypesQueryParams {
  includeDefault?: boolean;
}

// ============= КОНСТАНТЫ =============

export const PARAMETER_VALUE_TYPES: ParameterValueType[] = ['SHORT_TEXT', 'TEXT', 'NUMBER', 'BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'MEDIA', 'SINGLE_ENTITY', 'MULTI_ENTITY'];

// Лейблы для типов значений параметров
export const PARAMETER_VALUE_TYPE_LABELS: Record<ParameterValueType, string> = {
  SHORT_TEXT: 'Короткий текст',
  TEXT: 'Текст',
  NUMBER: 'Число',
  BOOLEAN: 'Да/Нет',
  SINGLE_SELECT: 'Выбор одного',
  MULTI_SELECT: 'Выбор нескольких',
  MEDIA: 'Медиа файл',
  SINGLE_ENTITY: 'Одна сущность',
  MULTI_ENTITY: 'Несколько сущностей'
};

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

// Функция для создания пустой сущности
export function createEmptyEntity(projectId: string, entityTypeId: string): CreateEntityDto {
  return {
    name: '',
    entityTypeId,
    description: '',
    values: {}
  };
}

// Функция для создания пустого параметра
export function createEmptyParameter(): CreateEntityParameterDto {
  return {
    name: '',
    valueType: 'SHORT_TEXT',
    options: [],
    order: 0
  };
}

// Функция для создания пустого типа сущности
export function createEmptyEntityType(): CreateEntityTypeDto {
  return {
    name: '',
    type: '',
    description: '',
    order: 0
  };
}

// Получить отображаемый тип сущности
export function getEntityTypeDisplay(entity: Entity): string {
  if (entity.entityType) {
    return entity.entityType.name;
  }

  return 'Неизвестный тип';
}

// Получить идентификатор типа сущности
export function getEntityTypeId(entity: Entity): string {
  return entity.entityTypeId;
}

// ============= ШАБЛОНЫ ПРОЕКТОВ =============

// Категории шаблонов (крупные категории)
export type TemplateCategory =
  | 'creative' // Творчество (истории, фэнтези, детективы)
  | 'learning' // Обучение (курсы, исследования, академические проекты)
  | 'professional' // Профессиональное (бизнес, продажи, процессы)
  | 'gaming' // Игровое (RPG, диалоги, квесты)
  | 'simulation'; // Симуляции (тренировки, сценарии)

// Конфигурация типа сущности в шаблоне
export interface TemplateEntityTypeConfig {
  type: string;
  nameTranslations: Record<string, string>; // {"en": "Character", "ru": "Персонаж"}
  descriptionTranslations?: Record<string, string>; // {"en": "Story characters", "ru": "Персонажи истории"}
  order: number;
  parameters: TemplateParameterConfig[];
}

// Конфигурация параметра в шаблоне
export interface TemplateParameterConfig {
  nameTranslations: Record<string, string>; // {"en": "Age", "ru": "Возраст"}
  valueType: ParameterValueType;
  required: boolean;
  order: number;
  optionsTranslations?: Record<string, string[]>; // {"en": ["Beginner", "Advanced"], "ru": ["Начальный", "Продвинутый"]}
}

// Конфигурация библии проекта в шаблоне
export interface TemplateProjectInfoConfig {
  loglineTranslations?: Record<string, string>;
  synopsisTranslations?: Record<string, string>;
  genres?: string[]; // Остаётся как есть - это предопределённые константы
  formats?: string[]; // Остаётся как есть - это предопределённые константы
  status?: string; // Остаётся как есть - это предопределённая константа
  settingTranslations?: Record<string, string>;
  targetAudienceTranslations?: Record<string, string>;
  mainThemesTranslations?: Record<string, string>;
  messageTranslations?: Record<string, string>;
  referencesTranslations?: Record<string, string>;
  uniqueFeaturesTranslations?: Record<string, string>;
  atmosphereTranslations?: Record<string, string>;
  constraintsTranslations?: Record<string, string>;
}

// Полная конфигурация шаблона
export interface TemplateConfig {
  entityTypes?: TemplateEntityTypeConfig[];
  projectInfo?: TemplateProjectInfoConfig;
  initialGraph?: any; // Начальный граф (опционально)
  variables?: any[]; // Предустановленные переменные (опционально)
}

// Интерфейс шаблона проекта
export interface ProjectTemplate {
  id: string;
  name: string; // Локализованное название
  type: string;
  description: string; // Локализованное описание
  categories: TemplateCategory[]; // Множественные категории
  isDefault: boolean;
  isActive: boolean;
  order: number;
  config: TemplateConfig;
  previewImage?: string;
  demoProjectId?: string;
  createdAt: string;
  updatedAt: string;
}

// DTO для создания шаблона
export interface CreateProjectTemplateDto {
  name: string;
  type: string;
  description?: string;
  categories: TemplateCategory[];
  order?: number;
  config: TemplateConfig;
  previewImage?: string;
}

export interface UpdateProjectTemplateDto extends Partial<CreateProjectTemplateDto> {
  isActive?: boolean;
}

// Ответы API для шаблонов
export interface ProjectTemplateResponse {
  success: boolean;
  data: ProjectTemplate;
  message?: string;
}

export interface ProjectTemplatesResponse {
  success: boolean;
  data: ProjectTemplate[];
}

// Query параметры для шаблонов
export interface TemplatesQueryParams {
  categories?: TemplateCategory[]; // Фильтр по нескольким категориям
  includeInactive?: boolean;
  includeDefault?: boolean;
}

// Константы для шаблонов
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['creative', 'learning', 'professional', 'gaming', 'simulation'];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  creative: 'Творчество',
  learning: 'Обучение',
  professional: 'Профессиональное',
  gaming: 'Игровое',
  simulation: 'Симуляции'
};

// ============= ОБНОВЛЕННЫЕ DTO ДЛЯ ПРОЕКТА =============

// Обновляем DTO создания проекта с поддержкой шаблонов
export interface CreateProjectWithTemplateDto {
  name?: string;
  templateId?: string; // ID шаблона для применения
  data?: any;
}
