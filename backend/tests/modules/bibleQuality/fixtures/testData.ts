import { BibleQualityScore, BibleRecommendation, RecommendationType } from "../../../../src/types/bibleQuality";

/**
 * Базовые данные проекта для тестов
 */
export const baseProjectData = {
  id: 'test-project-id',
  name: 'Test Project',
  creatorId: 'test-user-id',
  data: { nodes: [], connections: [] },
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z')
};

/**
 * Полные данные projectInfo для высокого качества
 */
export const completeProjectInfo = {
  logline: 'Качественный логлайн проекта оптимальной длины для получения максимального балла',
  synopsis: `Развернутый синопсис проекта, который подробно описывает основные события, персонажей и сюжетные линии. 
  Этот текст создан специально для тестирования алгоритма оценки качества библии проекта и содержит достаточное 
  количество информации для получения высокой оценки качества контента. В синопсисе раскрываются ключевые конфликты, 
  мотивации персонажей и основные повороты сюжета, что позволяет получить полное представление о проекте.`,
  genres: ['драма', 'триллер', 'психологическая драма'],
  setting: 'Современный мегаполис с развитой инфраструктурой, где переплетаются различные социальные слои и технологические вызовы создают основу для конфликта',
  targetAudience: 'Взрослая аудитория 25-45 лет, интересующаяся качественной драматургией и психологическими триллерами',
  mainThemes: 'Темы социальной справедливости, личностного роста, преодоления жизненных трудностей и поиска смысла в современном мире',
  atmosphere: 'Напряженная, но вселяющая надежду атмосфера с элементами психологической драмы и социального реализма',
  message: 'Каждый человек способен изменить свою жизнь и повлиять на окружающий мир, несмотря на внешние обстоятельства',
  references: 'Отсылки к классическим произведениям социального реализма, современной драматургии и работам известных психологов',
  uniqueFeatures: 'Инновационный подход к раскрытию психологии персонажей через их социальное окружение и внутренние монологи',
  constraints: 'Ограниченный бюджет требует творческого подхода к визуализации масштабных сцен и использования практических эффектов'
};

/**
 * Минимальные данные projectInfo
 */
export const minimalProjectInfo = {
  logline: 'Короткий логлайн',
  synopsis: '',
  genres: [],
  setting: '',
  targetAudience: '',
  mainThemes: '',
  atmosphere: '',
  message: '',
  references: '',
  uniqueFeatures: '',
  constraints: ''
};

/**
 * Частично заполненные данные projectInfo
 */
export const partialProjectInfo = {
  logline: 'Логлайн средней длины для тестирования оценки качества проекта',
  synopsis: 'Синопсис проекта средней длины, который содержит основную информацию о сюжете, но требует дополнения деталями о персонажах и финальном акте истории для получения максимальной оценки качества.',
  genres: ['драма', 'триллер'],
  setting: 'Современный город с его проблемами и возможностями',
  targetAudience: '',
  mainThemes: 'Основные темы проекта',
  atmosphere: 'Напряженная атмосфера',
  message: '',
  references: '',
  uniqueFeatures: '',
  constraints: ''
};

/**
 * Данные с очень длинными полями (превышают рекомендуемые лимиты)
 */
export const overlongProjectInfo = {
  logline: 'A'.repeat(200), // Слишком длинный логлайн (норма 20-120)
  synopsis: 'B'.repeat(2000), // Слишком длинный синопсис (норма 300-1500)
  genres: ['драма'],
  setting: 'C'.repeat(600), // Слишком длинный сеттинг (норма 50-500)
  targetAudience: 'D'.repeat(300), // Слишком длинная целевая аудитория (норма 20-200)
  mainThemes: 'E'.repeat(400), // Слишком длинные темы (норма 30-300)
  atmosphere: 'F'.repeat(300), // Слишком длинная атмосфера (норма 20-200)
  message: 'G'.repeat(400), // Слишком длинное послание (норма 20-300)
  references: 'H'.repeat(600), // Слишком длинные ссылки (норма 30-500)
  uniqueFeatures: 'I'.repeat(500), // Слишком длинные особенности (норма 30-400)
  constraints: 'J'.repeat(400) // Слишком длинные ограничения (норма 20-300)
};

/**
 * Генерация рекомендаций для тестов
 */
export const createRecommendation = (
  id: string,
  type: RecommendationType,
  severity: 'critical' | 'important' | 'optional',
  field: string,
  title: string,
  description: string,
  actionText?: string
): BibleRecommendation => ({
  id,
  type,
  severity,
  field,
  title,
  description,
  actionText
});

/**
 * Стандартные рекомендации для тестов
 */
export const standardRecommendations = {
  missingLogline: createRecommendation(
    'missing-logline',
    'MISSING_FIELD',
    'critical',
    'logline',
    'Отсутствует логлайн',
    'Логлайн - это краткое описание основной идеи проекта. Он помогает быстро понять суть истории.',
    'Добавить логлайн'
  ),
  missingSynopsis: createRecommendation(
    'missing-synopsis',
    'MISSING_FIELD',
    'critical',
    'synopsis',
    'Отсутствует синопсис',
    'Синопсис раскрывает основной сюжет и ключевые повороты истории.',
    'Добавить синопсис'
  ),
  missingGenres: createRecommendation(
    'missing-genres',
    'MISSING_FIELD',
    'critical',
    'genres',
    'Не указаны жанры',
    'Жанры помогают определить стиль и направление проекта.',
    'Выбрать жанры'
  ),
  loglineTooShort: createRecommendation(
    'logline-too-short',
    'TOO_SHORT',
    'important',
    'logline',
    'Логлайн слишком короткий',
    'Рекомендуемая длина логлайна: 20-120 символов.',
    'Расширить логлайн'
  ),
  loglineTooLong: createRecommendation(
    'logline-too-long',
    'TOO_LONG',
    'important',
    'logline',
    'Логлайн слишком длинный',
    'Рекомендуемая длина логлайна: 20-120 символов.',
    'Сократить логлайн'
  ),
  synopsisTooShort: createRecommendation(
    'synopsis-too-short',
    'TOO_SHORT',
    'important',
    'synopsis',
    'Синопсис слишком короткий',
    'Рекомендуемая длина синопсиса: 300-1500 символов.',
    'Расширить синопсис'
  ),
  synopsisTooLong: createRecommendation(
    'synopsis-too-long',
    'TOO_LONG',
    'important',
    'synopsis',
    'Синопсис слишком длинный',
    'Рекомендуемая длина синопсиса: 300-1500 символов.',
    'Сократить синопсис'
  ),
  missingSetting: createRecommendation(
    'missing-setting',
    'MISSING_FIELD',
    'important',
    'setting',
    'Не указан сеттинг',
    'Сеттинг описывает мир, в котором происходят события истории.',
    'Добавить сеттинг'
  ),
  missingTargetAudience: createRecommendation(
    'missing-target-audience',
    'MISSING_FIELD',
    'important',
    'targetAudience',
    'Не указана целевая аудитория',
    'Целевая аудитория помогает понять, для кого создается проект.',
    'Добавить целевую аудиторию'
  )
};

/**
 * Создание полного объекта BibleQualityScore для тестов
 */
export const createBibleQualityScore = (overrides: Partial<BibleQualityScore> = {}): BibleQualityScore => ({
  id: 'test-quality-id',
  projectId: 'test-project-id',
  totalScore: 85,
  completenessScore: 90,
  qualityScore: 80,
  consistencyScore: 85,
  completeness: {
    critical: {
      logline: true,
      synopsis: true,
      genres: true
    },
    important: {
      setting: true,
      targetAudience: false,
      mainThemes: true,
      atmosphere: true
    },
    optional: {
      message: false,
      references: true,
      uniqueFeatures: false,
      constraints: false
    }
  },
  recommendations: [],
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides
});

/**
 * Создание проекта с данными для тестов
 */
export const createTestProject = (projectInfoOverrides: any = {}) => ({
  ...baseProjectData,
  projectInfo: {
    ...completeProjectInfo,
    ...projectInfoOverrides
  }
});

/**
 * Данные проекта для различных сценариев качества
 */
export const qualityScenarios = {
  // Высокое качество - все поля заполнены оптимально
  highQuality: createTestProject(),
  
  // Среднее качество - основные поля заполнены
  mediumQuality: createTestProject(partialProjectInfo),
  
  // Низкое качество - минимум данных
  lowQuality: createTestProject(minimalProjectInfo),
  
  // Проблемы с длиной полей
  lengthIssues: createTestProject(overlongProjectInfo),
  
  // Только критичные поля
  criticalOnly: createTestProject({
    logline: 'Логлайн оптимальной длины для получения максимального балла качества',
    synopsis: 'Синопсис достаточной длины, который содержит всю необходимую информацию о проекте, включая описание сюжета, персонажей и основных конфликтов для корректной оценки качества библии проекта.',
    genres: ['драма', 'триллер'],
    setting: '',
    targetAudience: '',
    mainThemes: '',
    atmosphere: '',
    message: '',
    references: '',
    uniqueFeatures: '',
    constraints: ''
  }),
  
  // Пустой проект
  empty: createTestProject({
    logline: '',
    synopsis: '',
    genres: [],
    setting: '',
    targetAudience: '',
    mainThemes: '',
    atmosphere: '',
    message: '',
    references: '',
    uniqueFeatures: '',
    constraints: ''
  })
};

/**
 * Ожидаемые результаты для различных сценариев
 */
export const expectedResults = {
  highQuality: {
    totalScore: { min: 90, max: 100 },
    completenessScore: 100,
    qualityScore: { min: 85, max: 100 },
    consistencyScore: { min: 80, max: 100 },
    recommendationsCount: { min: 0, max: 2 }
  },
  
  mediumQuality: {
    totalScore: { min: 60, max: 80 },
    completenessScore: { min: 60, max: 80 },
    qualityScore: { min: 60, max: 85 },
    consistencyScore: { min: 70, max: 90 },
    recommendationsCount: { min: 2, max: 5 }
  },
  
  lowQuality: {
    totalScore: { min: 0, max: 30 },
    completenessScore: { min: 0, max: 20 },
    qualityScore: { min: 0, max: 30 },
    consistencyScore: { min: 0, max: 70 },
    recommendationsCount: { min: 5, max: 10 }
  },
  
  lengthIssues: {
    totalScore: { min: 40, max: 60 },
    completenessScore: 100, // все поля заполнены
    qualityScore: { min: 10, max: 30 }, // низкое из-за длины
    consistencyScore: { min: 70, max: 90 },
    recommendationsCount: { min: 8, max: 12 }
  }
};

/**
 * Утилита для проверки диапазона значений
 */
export const expectInRange = (value: number, min: number, max: number, fieldName?: string) => {
  const context = fieldName ? ` for ${fieldName}` : '';
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
  expect(value).toEqual(expect.any(Number));
};

/**
 * Утилита для проверки структуры BibleQualityScore
 */
export const expectValidBibleQualityStructure = (quality: any) => {
  expect(quality).toHaveProperty('id');
  expect(quality).toHaveProperty('projectId');
  expect(quality).toHaveProperty('totalScore');
  expect(quality).toHaveProperty('completenessScore');
  expect(quality).toHaveProperty('qualityScore');
  expect(quality).toHaveProperty('consistencyScore');
  expect(quality).toHaveProperty('completeness');
  expect(quality).toHaveProperty('recommendations');
  expect(quality).toHaveProperty('createdAt');
  expect(quality).toHaveProperty('updatedAt');
  
  // Проверяем структуру completeness
  expect(quality.completeness).toHaveProperty('critical');
  expect(quality.completeness).toHaveProperty('important');
  expect(quality.completeness).toHaveProperty('optional');
  
  expect(quality.completeness.critical).toHaveProperty('logline');
  expect(quality.completeness.critical).toHaveProperty('synopsis');
  expect(quality.completeness.critical).toHaveProperty('genres');
  
  // Проверяем что scores в допустимом диапазоне
  expectInRange(quality.totalScore, 0, 100, 'totalScore');
  expectInRange(quality.completenessScore, 0, 100, 'completenessScore');
  expectInRange(quality.qualityScore, 0, 100, 'qualityScore');
  expectInRange(quality.consistencyScore, 0, 100, 'consistencyScore');
  
  // Проверяем что recommendations это массив
  expect(Array.isArray(quality.recommendations)).toBe(true);
};

/**
 * Мок Prisma для различных сценариев
 */
export const createPrismaMocks = () => ({
  project: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  bibleQuality: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
});

/**
 * Настройка стандартных моков для успешного сценария
 */
export const setupSuccessfulMocks = (prismaMocks: any, project: any, quality?: any) => {
  prismaMocks.project.findFirst.mockResolvedValue(project);
  prismaMocks.project.findUnique.mockResolvedValue(project);
  
  if (quality) {
    prismaMocks.bibleQuality.findUnique.mockResolvedValue(quality);
  } else {
    prismaMocks.bibleQuality.findUnique.mockResolvedValue(null);
    prismaMocks.bibleQuality.upsert.mockImplementation((args: any) => {
      return Promise.resolve({
        id: 'generated-id',
        projectId: project.id,
        ...args.create,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

/**
 * Настройка моков для сценария отсутствия доступа
 */
export const setupNoAccessMocks = (prismaMocks: any) => {
  prismaMocks.project.findFirst.mockResolvedValue(null);
};

/**
 * Настройка моков для сценария ошибки
 */
export const setupErrorMocks = (prismaMocks: any, errorMessage: string = 'Test error') => {
  prismaMocks.project.findFirst.mockRejectedValue(new Error(errorMessage));
}; 