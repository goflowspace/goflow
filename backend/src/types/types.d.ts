import { Request } from "express";

// Типы для информации о проекте
export interface ProjectInfo {
  id: string;
  projectId: string;
  
  // Основная информация
  logline: string | null;           // Логлайн – несколько строк
  synopsis: string | null;          // Синопсис – несколько строк
  
  // Категоризация
  genres: string[];                 // Жанры – выбор нескольких значений
  formats: string[];                // Формат – выбор нескольких значений
  status: string;                   // Статус проекта – выбор одного значения
  
  // Мир и сеттинг
  setting: string | null;           // Сеттинг – несколько строк
  targetAudience: string | null;    // Целевая аудитория – несколько строк
  mainThemes: string | null;        // Основные темы – несколько строк
  message: string | null;           // Посыл – несколько строк
  references: string | null;        // Референсы – несколько строк
  uniqueFeatures: string | null;    // Уникальные особенности – несколько строк
  atmosphere: string | null;        // Атмосфера – несколько строк
  visualStyle: string | null;       // Визуальный стиль – несколько строк
  constraints: string | null;       // Основные ограничения проекта – несколько строк
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}

// Жанры проекта
export type ProjectGenre = 
  | 'rpg'                    // RPG (Ролевая игра)
  | 'adventure'              // Adventure (Приключенческая)
  | 'visual_novel'           // Visual Novel (Визуальная новелла)
  | 'interactive_fiction'    // Interactive Fiction (Интерактивная литература)
  | 'dating_sim'             // Dating Sim (Симулятор свиданий)
  | 'detective'              // Detective (Детектив)
  | 'horror'                 // Horror (Хоррор)
  | 'fantasy'                // Fantasy (Фэнтези)
  | 'sci_fi'                 // Sci-Fi (Научная фантастика)
  | 'historical'             // Historical (Историческая)
  | 'comedy'                 // Comedy (Комедия)
  | 'drama'                  // Drama (Драма)
  | 'thriller'               // Thriller (Триллер)
  | 'romance'                // Romance (Романтика)
  | 'educational';           // Educational (Образовательная)

// Форматы проекта
export type ProjectFormat = 
  | 'visual_novel'           // Visual Novel (Визуальная новелла)
  | 'interactive_fiction'    // Interactive Fiction (Интерактивная литература)
  | 'dialogue_system'       // Dialogue System (Система диалогов)
  | 'quest'                  // Quest (Квест)
  | 'branching_story'        // Branching Story (Ветвящаяся история)
  | 'adventure'              // Adventure (Приключение)
  | 'text_adventure'         // Text Adventure (Текстовое приключение)
  | 'chat_fiction'           // Chat Fiction (Чат-история)
  | 'rpg_dialogue'           // RPG Dialogue (RPG диалоги)
  | 'cutscene_script'        // Cutscene Script (Сценарий катсцен)
  | 'game_tutorial'          // Game Tutorial (Игровой туториал)
  | 'character_backstory'    // Character Backstory (Предыстория персонажа)
  | 'worldbuilding'          // Worldbuilding (Построение мира)
  | 'interactive_lesson'     // Interactive Lesson (Интерактивный урок)
  | 'training_scenario'      // Training Scenario (Обучающий сценарий)
  | 'case_study'             // Case Study (Кейс-стади)
  | 'simulation_script'      // Simulation Script (Сценарий симуляции)
  | 'assessment_quest';      // Assessment Quest (Оценочный квест)

// Статусы проекта
export type ProjectInfoStatus = 
  | 'concept'                // Concept (Концепция)
  | 'pre_production'         // Pre-production (Пре-продакшн)
  | 'production'             // Production (Продакшн)
  | 'post_production'        // Post-production (Пост-продакшн)
  | 'testing'                // Testing (Тестирование)
  | 'release_ready'          // Release ready (Готов к релизу)
  | 'released';              // Released (Выпущен)

// DTO для создания/обновления информации о проекте
export interface CreateProjectInfoDto {
  logline?: string;
  synopsis?: string;
  genres?: ProjectGenre[];
  formats?: ProjectFormat[];
  status?: ProjectInfoStatus;
  setting?: string;
  targetAudience?: string;
  mainThemes?: string;
  message?: string;
  references?: string;
  uniqueFeatures?: string;
  atmosphere?: string;
  visualStyle?: string;
  constraints?: string;
}

export interface UpdateProjectInfoDto extends Partial<CreateProjectInfoDto> {}

// Ответ API с информацией о проекте
export interface ProjectInfoResponse {
  success: boolean;
  data: ProjectInfo;
  message?: string;
}

// ============= ТИПЫ ДЛЯ СИСТЕМЫ СУЩНОСТЕЙ =============

// Типы значений параметров
export type ParameterValueType = 
  | 'SHORT_TEXT'    // Однострочный текст
  | 'TEXT'          // Многострочный текст
  | 'SINGLE_SELECT' // Выбор одного значения из списка
  | 'MULTI_SELECT'  // Выбор нескольких значений из списка
  | 'MEDIA';        // Медиа файл (изображение)

// Типы сущностей по умолчанию
export type DefaultEntityType =
  | 'character'     // Персонаж
  | 'location'      // Локация
  | 'faction'       // Фракция
  | 'event'         // Событие
  | 'rule';         // Правило

// Интерфейс параметра сущности
export interface EntityParameter {
  id: string;
  projectId: string;
  name: string;
  valueType: ParameterValueType;
  options: string[];
  isDefault: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Интерфейс сущности
export interface Entity {
  id: string;
  projectId: string;
  name: string;
  entityTypeId: string;  // Ссылка на кастомный тип (обязательное поле)
  imageUrl?: MediaValue; // Изображение сущности (MediaValue структура)
  image?: MediaValue; // Изображение сущности (MediaValue структура)
  description?: string;
  values?: EntityValue[];
  createdAt: Date;
  updatedAt: Date;
}

// Новые интерфейсы для работы с изображениями
export interface ImageMetadata {
  width: number;
  height: number;
  size: number;      // размер в байтах
  mimeType: string;  // image/jpeg, image/png, image/webp
  filename: string;
  // AI generation metadata
  isAIGenerated?: boolean; // Флаг что изображение создано ИИ
  aiProvider?: 'openai' | 'gemini' | 'anthropic'; // Провайдер ИИ
  aiModel?: string; // Модель ИИ (например, 'dall-e-3', 'gemini-2.5-flash-image-preview')
  generatedAt?: Date; // Дата генерации ИИ
}

export interface ProcessedImage {
  dataUrl: string;      // base64 данные
  metadata: ImageMetadata;
}

export interface MediaValue {
  type: 'image';
  storage: 'gcs' | 'local';
  original: {
    gcsPath: string;          // Путь в GCS или локальный путь
    publicUrl?: string;       // Только для публичных изображений
    metadata: ImageMetadata;
    compressionRatio: number;
  };
  optimized: {
    gcsPath: string;          // Путь в GCS или локальный путь для оптимизированной версии
    publicUrl?: string;       
    metadata: ImageMetadata;
    compressionRatio: number;
  };
  thumbnail: {
    gcsPath: string;          // Путь в GCS или локальный путь
    publicUrl?: string;
    metadata: ImageMetadata;
    compressionRatio: number;
  };
  uploadedAt: Date;
  processedAt: Date;
}

export type SupportedImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

// Интерфейс для запроса загрузки изображения
export interface ImageUploadRequest {
  entityId: string;
  parameterId: string;
  imageData: string;  // base64
  filename: string;
}

// Интерфейс для ответа загрузки изображения
export interface ImageUploadResponse {
  success: boolean;
  data?: MediaValue;
  error?: string;
  warnings?: string[];
}

// Типы для GCS работы с изображениями
export interface GCSImagePath {
  teamId: string;
  projectId: string;
  entityId: string;
  parameterId: string;
  version: 'original' | 'optimized' | 'thumbnail';
  filename: string;
}

export interface SignedUrlRequest {
  imageIds: Array<{
    entityId: string;
    parameterId: string;
    version: 'original' | 'optimized' | 'thumbnail';
  }>;
  ttl?: number; // Time to live in seconds, default 24h
}

export interface SignedUrlResponse {
  success: boolean;
  data?: Array<{
    entityId: string;
    parameterId: string;
    version: 'original' | 'optimized' | 'thumbnail';
    signedUrl: string;
    expiresAt: Date;
  }>;
  error?: string;
}

export interface BatchAccessRequest {
  entityIds: string[];
  types: Array<'original' | 'optimized' | 'thumbnail'>;
  ttl?: number;
}

export interface StorageUsageStats {
  teamId: string;
  totalSizeBytes: number;
  imageCount: number;
  lastUpdated: Date;
}

// Интерфейс значения параметра сущности
export interface EntityValue {
  id: string;
  entityId: string;
  parameterId: string;
  value: any; // JSON значение
  parameter?: EntityParameter;
  createdAt: Date;
  updatedAt: Date;
}

// DTO для создания параметра сущности
export interface CreateEntityParameterDto {
  name: string;
  valueType: ParameterValueType;
  options?: string[];
  order?: number;
}

export interface UpdateEntityParameterDto extends Partial<CreateEntityParameterDto> {}

// DTO для создания сущности
export interface CreateEntityDto {
  name: string;
  entityType?: string;
  description?: string;
  imageUrl?: string;
  values?: Record<string, any>; // parameterId -> value
}

export interface UpdateEntityDto extends Partial<CreateEntityDto> {}

// DTO для обновления значений параметров
export interface UpdateEntityValuesDto {
  values: Array<{
    parameterId: string;
    value: any;
  }>;
}

// Ответы API для сущностей
export interface EntityParameterResponse {
  success: boolean;
  data: EntityParameter;
  message?: string;
}

export interface EntityParametersResponse {
  success: boolean;
  data: EntityParameter[];
}

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
