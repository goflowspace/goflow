export interface BibleQualityScore {
  id: string;
  projectId: string;
  
  // Общий скор качества (0-100)
  totalScore: number;
  
  // Детализация по категориям
  completenessScore: number;    // Заполненность полей (0-100)
  qualityScore: number;         // Качество контента (0-100)
  consistencyScore: number;     // Согласованность (0-100)
  
  // Детализация заполненности
  completeness: {
    // Критичные поля (обязательные)
    critical: {
      logline: boolean;           // 15 баллов
      synopsis: boolean;          // 15 баллов  
      genres: boolean;            // 10 баллов
    };
    
    // Важные поля
    important: {
      setting: boolean;           // 5 баллов
      targetAudience: boolean;    // 5 баллов
      mainThemes: boolean;        // 5 баллов
      atmosphere: boolean;        // 5 баллов
    };
    
    // Дополнительные поля
    optional: {
      message: boolean;           // 2.5 балла
      references: boolean;        // 2.5 балла
      uniqueFeatures: boolean;    // 2.5 балла
      constraints: boolean;       // 2.5 балла
    };
  };
  
  // Рекомендации для улучшения
  recommendations: BibleRecommendation[];
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}

export interface BibleRecommendation {
  id: string;
  type: RecommendationType;
  severity: 'critical' | 'important' | 'optional';
  field: string;                 // Поле, к которому относится рекомендация
  title: string;                 // Краткое описание проблемы
  description: string;           // Подробное описание
  actionText?: string;           // Текст кнопки действия (если применимо)
}

export type RecommendationType = 
  | 'MISSING_FIELD'              // Отсутствует обязательное поле
  | 'EMPTY_FIELD'                // Поле пустое
  | 'TOO_SHORT'                  // Слишком короткий контент
  | 'TOO_LONG'                   // Слишком длинный контент
  | 'INCONSISTENT_GENRE'         // Несоответствие жанрам
  | 'INCONSISTENT_SETTING'       // Несоответствие сеттингу
  | 'POOR_QUALITY'               // Низкое качество контента
  | 'SUGGESTION'                 // Предложение улучшения
  | 'AI_AVAILABLE';              // Доступна ИИ-помощь

// DTO для создания/обновления оценки
export interface CreateBibleQualityDto {
  projectId: string;
  forceRecalculate?: boolean;    // Принудительный пересчет
}

// Конфигурация весов для алгоритма скоринга
export interface ScoringWeights {
  // Веса категорий (сумма должна быть 100)
  completenessWeight: number;    // По умолчанию 40
  qualityWeight: number;         // По умолчанию 40  
  consistencyWeight: number;     // По умолчанию 20
  
  // Веса полей заполненности
  criticalFieldsWeight: number;  // По умолчанию 40 (из completenessWeight)
  importantFieldsWeight: number; // По умолчанию 20 (из completenessWeight)
  optionalFieldsWeight: number;  // По умолчанию 10 (из completenessWeight)
}

// Конфигурация минимальных длин для полей
export interface FieldLengthConfig {
  logline: { min: number; max: number; optimal: number };
  synopsis: { min: number; max: number; optimal: number };
  setting: { min: number; max: number; optimal: number };
  targetAudience: { min: number; max: number; optimal: number };
  mainThemes: { min: number; max: number; optimal: number };
  atmosphere: { min: number; max: number; optimal: number };
  message: { min: number; max: number; optimal: number };
  references: { min: number; max: number; optimal: number };
  uniqueFeatures: { min: number; max: number; optimal: number };
  constraints: { min: number; max: number; optimal: number };
} 