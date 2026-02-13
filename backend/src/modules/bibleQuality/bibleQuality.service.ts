import { prisma } from "@config/prisma";
import { BibleQualityScore, BibleRecommendation, ScoringWeights, FieldLengthConfig } from "../../types/bibleQuality";

// Конфигурация весов по умолчанию
const DEFAULT_WEIGHTS: ScoringWeights = {
  completenessWeight: 40,
  qualityWeight: 40,
  consistencyWeight: 20,
  criticalFieldsWeight: 40,
  importantFieldsWeight: 20,
  optionalFieldsWeight: 10
};

// Конфигурация длин полей
const FIELD_LENGTH_CONFIG: FieldLengthConfig = {
  logline: { min: 20, max: 120, optimal: 80 },
  synopsis: { min: 300, max: 1500, optimal: 800 },
  setting: { min: 50, max: 500, optimal: 200 },
  targetAudience: { min: 20, max: 200, optimal: 100 },
  mainThemes: { min: 30, max: 300, optimal: 150 },
  atmosphere: { min: 20, max: 200, optimal: 100 },
  message: { min: 20, max: 300, optimal: 150 },
  references: { min: 30, max: 500, optimal: 200 },
  uniqueFeatures: { min: 30, max: 400, optimal: 200 },
  constraints: { min: 20, max: 300, optimal: 150 }
};

/**
 * Получение оценки качества библии проекта
 */
export const getBibleQualityService = async (projectId: string): Promise<BibleQualityScore | null> => {
  const bibleQuality = await prisma.bibleQuality.findUnique({
    where: { projectId }
  });

  if (!bibleQuality) {
    return null;
  }

  return {
    id: bibleQuality.id,
    projectId: bibleQuality.projectId,
    totalScore: bibleQuality.totalScore,
    completenessScore: bibleQuality.completenessScore,
    qualityScore: bibleQuality.qualityScore,
    consistencyScore: bibleQuality.consistencyScore,
    completeness: bibleQuality.completeness as any,
    recommendations: (bibleQuality.recommendations as any) as BibleRecommendation[],
    createdAt: bibleQuality.createdAt,
    updatedAt: bibleQuality.updatedAt
  };
};

/**
 * Создание или обновление оценки качества библии
 */
export const createOrUpdateBibleQualityService = async (
  projectId: string,
  forceRecalculate: boolean = false
): Promise<BibleQualityScore> => {
  // Проверяем существование проекта
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectInfo: true }
  });

  if (!project) {
    throw new Error("Проект не найден");
  }

  // Проверяем существующую оценку
  const existingQuality = await prisma.bibleQuality.findUnique({
    where: { projectId }
  });

  // Если оценка существует и не требуется принудительный пересчет
  if (existingQuality && !forceRecalculate) {
    return {
      id: existingQuality.id,
      projectId: existingQuality.projectId,
      totalScore: existingQuality.totalScore,
      completenessScore: existingQuality.completenessScore,
      qualityScore: existingQuality.qualityScore,
      consistencyScore: existingQuality.consistencyScore,
      completeness: existingQuality.completeness as any,
      recommendations: (existingQuality.recommendations as any) as BibleRecommendation[],
      createdAt: existingQuality.createdAt,
      updatedAt: existingQuality.updatedAt
    };
  }

  // Вычисляем новую оценку
  const qualityData = calculateBibleQuality(project.projectInfo);

  // Сохраняем или обновляем оценку
  const bibleQuality = await prisma.bibleQuality.upsert({
    where: { projectId },
    update: {
      totalScore: qualityData.totalScore,
      completenessScore: qualityData.completenessScore,
      qualityScore: qualityData.qualityScore,
      consistencyScore: qualityData.consistencyScore,
      completeness: qualityData.completeness,
      recommendations: qualityData.recommendations as any
    },
    create: {
      projectId,
      totalScore: qualityData.totalScore,
      completenessScore: qualityData.completenessScore,
      qualityScore: qualityData.qualityScore,
      consistencyScore: qualityData.consistencyScore,
      completeness: qualityData.completeness,
      recommendations: qualityData.recommendations as any
    }
  });

  return {
    id: bibleQuality.id,
    projectId: bibleQuality.projectId,
    totalScore: bibleQuality.totalScore,
    completenessScore: bibleQuality.completenessScore,
    qualityScore: bibleQuality.qualityScore,
    consistencyScore: bibleQuality.consistencyScore,
    completeness: bibleQuality.completeness as any,
    recommendations: (bibleQuality.recommendations as any) as BibleRecommendation[],
    createdAt: bibleQuality.createdAt,
    updatedAt: bibleQuality.updatedAt
  };
};

/**
 * Основная функция вычисления качества библии
 */
function calculateBibleQuality(projectInfo: any): Omit<BibleQualityScore, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> {
  const completenessData = calculateCompleteness(projectInfo);
  const qualityData = calculateQualityScore(projectInfo);
  const consistencyData = calculateConsistencyScore(projectInfo);
  const recommendations = generateRecommendations(projectInfo, completenessData, qualityData);

  // Вычисляем общий скор
  const totalScore = Math.round(
    (completenessData.score * DEFAULT_WEIGHTS.completenessWeight / 100) +
    (qualityData.score * DEFAULT_WEIGHTS.qualityWeight / 100) +
    (consistencyData.score * DEFAULT_WEIGHTS.consistencyWeight / 100)
  );

  return {
    totalScore,
    completenessScore: completenessData.score,
    qualityScore: qualityData.score,
    consistencyScore: consistencyData.score,
    completeness: completenessData.completeness,
    recommendations
  };
}

/**
 * Вычисление заполненности полей
 */
function calculateCompleteness(projectInfo: any) {
  const completeness = {
    critical: {
      logline: !!(projectInfo?.logline?.trim()),
      synopsis: !!(projectInfo?.synopsis?.trim()),
      genres: !!(projectInfo?.genres?.length > 0)
    },
    important: {
      setting: !!(projectInfo?.setting?.trim()),
      targetAudience: !!(projectInfo?.targetAudience?.trim()),
      mainThemes: !!(projectInfo?.mainThemes?.trim()),
      atmosphere: !!(projectInfo?.atmosphere?.trim())
    },
    optional: {
      message: !!(projectInfo?.message?.trim()),
      references: !!(projectInfo?.references?.trim()),
      uniqueFeatures: !!(projectInfo?.uniqueFeatures?.trim()),
      constraints: !!(projectInfo?.constraints?.trim())
    }
  };

  // Подсчитываем баллы по процентному соотношению от максимального веса
  const criticalFilledCount = Object.values(completeness.critical).filter(Boolean).length;
  const criticalTotalCount = Object.keys(completeness.critical).length;
  const criticalScore = (criticalFilledCount / criticalTotalCount) * DEFAULT_WEIGHTS.criticalFieldsWeight;

  const importantFilledCount = Object.values(completeness.important).filter(Boolean).length;
  const importantTotalCount = Object.keys(completeness.important).length;
  const importantScore = (importantFilledCount / importantTotalCount) * DEFAULT_WEIGHTS.importantFieldsWeight;

  const optionalFilledCount = Object.values(completeness.optional).filter(Boolean).length;
  const optionalTotalCount = Object.keys(completeness.optional).length;
  const optionalScore = (optionalFilledCount / optionalTotalCount) * DEFAULT_WEIGHTS.optionalFieldsWeight;

  const totalScore = criticalScore + importantScore + optionalScore;
  
  // Масштабируем до 100% (40+20+10 = 70% максимум, нужно масштабировать)
  const maxPossibleScore = DEFAULT_WEIGHTS.criticalFieldsWeight + DEFAULT_WEIGHTS.importantFieldsWeight + DEFAULT_WEIGHTS.optionalFieldsWeight;
  const scaledScore = (totalScore / maxPossibleScore) * 100;

  return {
    score: Math.round(scaledScore),
    completeness
  };
}

/**
 * Вычисление качества контента (пока упрощенная версия)
 */
function calculateQualityScore(projectInfo: any) {
  let score = 0;
  let maxScore = 0;

  // Проверяем логлайн
  if (projectInfo?.logline) {
    const loglineLength = projectInfo.logline.trim().length;
    const loglineConfig = FIELD_LENGTH_CONFIG.logline;
    
    maxScore += 25;
    if (loglineLength >= loglineConfig.min && loglineLength <= loglineConfig.max) {
      score += 25; // Оптимальная длина
    } else if (loglineLength > 0) {
      score += 15; // Есть логлайн, но не оптимальной длины
    }
  }

  // Проверяем синопсис
  if (projectInfo?.synopsis) {
    const synopsisLength = projectInfo.synopsis.trim().length;
    const synopsisConfig = FIELD_LENGTH_CONFIG.synopsis;
    
    maxScore += 35;
    if (synopsisLength >= synopsisConfig.min && synopsisLength <= synopsisConfig.max) {
      score += 35; // Оптимальная длина
    } else if (synopsisLength > 0) {
      score += 20; // Есть синопсис, но не оптимальной длины
    }
  }

  // Проверяем остальные поля на адекватную длину
  const fieldsToCheck = ['setting', 'targetAudience', 'mainThemes', 'atmosphere'];
  maxScore += fieldsToCheck.length * 10; // 10 баллов за каждое поле

  fieldsToCheck.forEach(field => {
    if (projectInfo?.[field]) {
      const fieldLength = projectInfo[field].trim().length;
      const fieldConfig = FIELD_LENGTH_CONFIG[field as keyof FieldLengthConfig];
      
      if (fieldLength >= fieldConfig.min && fieldLength <= fieldConfig.max) {
        score += 10;
      } else if (fieldLength > 0) {
        score += 5;
      }
    }
  });

  return {
    score: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  };
}

/**
 * Вычисление согласованности (пока упрощенная версия)
 */
function calculateConsistencyScore(projectInfo: any) {
  let score = 100; // Начинаем с максимального скора

  // В MVP версии считаем согласованность как базовую - будет расширена в следующих фазах
  // Простые проверки:
  
  // Проверяем, что есть хотя бы один жанр
  if (!projectInfo?.genres || projectInfo.genres.length === 0) {
    score -= 30;
  }

  // Проверяем наличие базовой информации для согласованности
  if (!projectInfo?.setting) {
    score -= 20;
  }

  if (!projectInfo?.atmosphere) {
    score -= 20;
  }

  return {
    score: Math.max(0, score)
  };
}

/**
 * Генерация рекомендаций
 */
function generateRecommendations(
  projectInfo: any,
  completenessData: any,
  _qualityData: any
): BibleRecommendation[] {
  const recommendations: BibleRecommendation[] = [];

  // Рекомендации по заполненности
  if (!completenessData.completeness.critical.logline) {
    recommendations.push({
      id: 'missing-logline',
      type: 'MISSING_FIELD',
      severity: 'critical',
      field: 'logline',
      title: 'Отсутствует логлайн',
      description: 'Логлайн - это краткое описание основной идеи проекта. Он помогает быстро понять суть истории.',
      actionText: 'Добавить логлайн'
    });
  }

  if (!completenessData.completeness.critical.synopsis) {
    recommendations.push({
      id: 'missing-synopsis',
      type: 'MISSING_FIELD',
      severity: 'critical',
      field: 'synopsis',
      title: 'Отсутствует синопсис',
      description: 'Синопсис раскрывает основной сюжет и ключевые повороты истории.',
      actionText: 'Добавить синопсис'
    });
  }

  if (!completenessData.completeness.critical.genres) {
    recommendations.push({
      id: 'missing-genres',
      type: 'MISSING_FIELD',
      severity: 'critical',
      field: 'genres',
      title: 'Не указаны жанры',
      description: 'Жанры помогают определить стиль и направление проекта.',
      actionText: 'Выбрать жанры'
    });
  }

  // Рекомендации по качеству
  if (projectInfo?.logline) {
    const loglineLength = projectInfo.logline.trim().length;
    const config = FIELD_LENGTH_CONFIG.logline;
    
    if (loglineLength < config.min) {
      recommendations.push({
        id: 'logline-too-short',
        type: 'TOO_SHORT',
        severity: 'important',
        field: 'logline',
        title: 'Логлайн слишком короткий',
        description: `Рекомендуемая длина логлайна: ${config.min}-${config.max} символов. Текущая длина: ${loglineLength} символов.`,
        actionText: 'Расширить логлайн'
      });
    } else if (loglineLength > config.max) {
      recommendations.push({
        id: 'logline-too-long',
        type: 'TOO_LONG',
        severity: 'important',
        field: 'logline',
        title: 'Логлайн слишком длинный',
        description: `Рекомендуемая длина логлайна: ${config.min}-${config.max} символов. Текущая длина: ${loglineLength} символов.`,
        actionText: 'Сократить логлайн'
      });
    }
  }

  if (projectInfo?.synopsis) {
    const synopsisLength = projectInfo.synopsis.trim().length;
    const config = FIELD_LENGTH_CONFIG.synopsis;
    
    if (synopsisLength < config.min) {
      recommendations.push({
        id: 'synopsis-too-short',
        type: 'TOO_SHORT',
        severity: 'important',
        field: 'synopsis',
        title: 'Синопсис слишком короткий',
        description: `Рекомендуемая длина синопсиса: ${config.min}-${config.max} символов. Текущая длина: ${synopsisLength} символов.`,
        actionText: 'Расширить синопсис'
      });
    } else if (synopsisLength > config.max) {
      recommendations.push({
        id: 'synopsis-too-long',
        type: 'TOO_LONG',
        severity: 'important',
        field: 'synopsis',
        title: 'Синопсис слишком длинный',
        description: `Рекомендуемая длина синопсиса: ${config.min}-${config.max} символов. Текущая длина: ${synopsisLength} символов.`,
        actionText: 'Сократить синопсис'
      });
    }
  }

  // Рекомендации по дополнительным полям
  if (!completenessData.completeness.important.setting) {
    recommendations.push({
      id: 'missing-setting',
      type: 'MISSING_FIELD',
      severity: 'important',
      field: 'setting',
      title: 'Не указан сеттинг',
      description: 'Сеттинг описывает мир, в котором происходят события истории.',
      actionText: 'Добавить сеттинг'
    });
  }

  if (!completenessData.completeness.important.targetAudience) {
    recommendations.push({
      id: 'missing-target-audience',
      type: 'MISSING_FIELD',
      severity: 'important',
      field: 'targetAudience',
      title: 'Не указана целевая аудитория',
      description: 'Целевая аудитория помогает понять, для кого создается проект.',
      actionText: 'Добавить целевую аудиторию'
    });
  }

  return recommendations;
}

// Импортируем универсальную функцию проверки доступа
export { checkUserProjectAccess } from "../../utils/projectAccess"; 