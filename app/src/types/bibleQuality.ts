export interface BibleQualityScore {
  id: string;
  projectId: string;

  // Общий скор качества (0-100)
  totalScore: number;

  // Детализация по категориям
  completenessScore: number; // Заполненность полей (0-100)
  qualityScore: number; // Качество контента (0-100)
  consistencyScore: number; // Согласованность (0-100)

  // Детализация заполненности
  completeness: {
    // Критичные поля (обязательные)
    critical: {
      logline: boolean; // 15 баллов
      synopsis: boolean; // 15 баллов
      genres: boolean; // 10 баллов
    };

    // Важные поля
    important: {
      setting: boolean; // 5 баллов
      targetAudience: boolean; // 5 баллов
      mainThemes: boolean; // 5 баллов
      atmosphere: boolean; // 5 баллов
    };

    // Дополнительные поля
    optional: {
      message: boolean; // 2.5 балла
      references: boolean; // 2.5 балла
      uniqueFeatures: boolean; // 2.5 балла
      constraints: boolean; // 2.5 балла
    };
  };

  // Рекомендации для улучшения
  recommendations: BibleRecommendation[];

  // Метаданные
  createdAt: string;
  updatedAt: string;
}

export interface BibleRecommendation {
  id: string;
  type: RecommendationType;
  severity: 'critical' | 'important' | 'optional';
  field: string; // Поле, к которому относится рекомендация
  title: string; // Краткое описание проблемы
  description: string; // Подробное описание
  actionText?: string; // Текст кнопки действия (если применимо)
}

export type RecommendationType =
  | 'MISSING_FIELD' // Отсутствует обязательное поле
  | 'EMPTY_FIELD' // Поле пустое
  | 'TOO_SHORT' // Слишком короткий контент
  | 'TOO_LONG' // Слишком длинный контент
  | 'INCONSISTENT_GENRE' // Несоответствие жанрам
  | 'INCONSISTENT_SETTING' // Несоответствие сеттингу
  | 'POOR_QUALITY' // Низкое качество контента
  | 'SUGGESTION' // Предложение улучшения
  | 'AI_AVAILABLE'; // Доступна ИИ-помощь

// Утилиты для работы с цветовой палитрой скора
export const getBibleQualityColor = (score: number): string => {
  if (score >= 80) return '#10b981'; // green-500
  if (score >= 60) return '#f59e0b'; // yellow-500
  if (score >= 40) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
};

export const getBibleQualityGradient = (score: number): string => {
  if (score >= 80) return 'from-green-400 to-green-600';
  if (score >= 60) return 'from-yellow-400 to-yellow-600';
  if (score >= 40) return 'from-orange-400 to-orange-600';
  return 'from-red-400 to-red-600';
};

export const getBibleQualityText = (score: number): string => {
  if (score >= 80) return 'Отлично';
  if (score >= 60) return 'Хорошо';
  if (score >= 40) return 'Удовлетворительно';
  return 'Требует доработки';
};
