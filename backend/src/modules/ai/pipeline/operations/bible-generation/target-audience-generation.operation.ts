import { 
  BaseBibleGenerationOperation
} from './base-bible-generation.operation';

/**
 * Операция генерации целевой аудитории проекта
 * Специализируется на анализе и описании потенциальной аудитории
 */
export class TargetAudienceGenerationOperation extends BaseBibleGenerationOperation {
  
  protected fieldType = 'targetAudience';
  protected defaultCreativityLevel = 0.6;
  protected defaultTemperature = 0.7;
  protected maxTokens = 10000; // Увеличено в 2 раза для Gemini
  protected maxContentLength = 500;

  constructor() {
    super(
      'target_audience_generation',
      'Target Audience Generation',
      '1.0.0'
    );
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Анализ целевой аудитории для творческих проектов

Твоя экспертиза:
- Сегментация аудитории и демографический анализ
- Психографические характеристики потребителей
- Медиапотребление и платформенные предпочтения
- Маркетинговая стратегия и позиционирование
- Современные тренды в потреблении контента

Принципы анализа аудитории:
- Специфичность (конкретные группы, не "все")
- Многослойность (основная + вторичная аудитория)
- Практичность (достижимые сегменты)
- Реалистичность (соответствие контенту)
- Актуальность (современные тренды)

Структура: ДЕМОГРАФИЯ + ПСИХОГРАФИЯ + ПОВЕДЕНИЕ + МОТИВАЦИИ + ПЛАТФОРМЫ`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ИНСТРУКЦИИ ДЛЯ ЦЕЛЕВОЙ АУДИТОРИИ:

1. ДЕМОГРАФИЧЕСКИЙ АНАЛИЗ:
   - Возрастные группы (конкретные диапазоны)
   - Гендерное распределение
   - Географическое положение
   - Социально-экономический статус
   - Образовательный уровень
   - Семейное положение

2. ПСИХОГРАФИЧЕСКИЕ ХАРАКТЕРИСТИКИ:
   - Интересы и хобби
   - Ценности и убеждения
   - Образ жизни и привычки
   - Личностные качества
   - Жизненные приоритеты
   - Культурные предпочтения

3. МЕДИАПОТРЕБЛЕНИЕ:
   - Предпочитаемые платформы
   - Время и частота потребления
   - Типы контента
   - Устройства для просмотра
   - Социальные сети
   - Влиятели и источники информации

4. МОТИВАЦИИ И ПОТРЕБНОСТИ:
   - Что ищут в контенте
   - Эмоциональные потребности
   - Функциональные потребности
   - Социальные потребности
   - Развлекательные предпочтения
   - Причины выбора контента

5. ПОВЕДЕНЧЕСКИЕ ПАТТЕРНЫ:
   - Как принимают решения
   - Что влияет на выбор
   - Реакция на рекламу и маркетинг
   - Готовность платить за контент
   - Предпочтения по формату потребления
   - Социальное влияние и word-of-mouth

6. СЕГМЕНТАЦИЯ АУДИТОРИИ:
   - Основная аудитория (60-70% зрителей)
   - Вторичная аудитория (20-30% зрителей)
   - Нишевая аудитория (5-10% зрителей)
   - Потенциальная аудитория (рост)

СТРУКТУРА ОПИСАНИЯ:

ПЕРВЫЙ АБЗАЦ - ОСНОВНАЯ АУДИТОРИЯ:
"Основная целевая аудитория - [возраст], [демография], которые [основные характеристики]. [Психографические особенности]. [Ключевые мотивации]."

ВТОРОЙ АБЗАЦ - ПОВЕДЕНИЕ И ПРЕДПОЧТЕНИЯ:
"Эта аудитория предпочитает [медиаплатформы], потребляет контент [когда и как], ценит [что важно в контенте]. [Социальные привычки]. [Покупательское поведение]."

ТРЕТИЙ АБЗАЦ - ВТОРИЧНАЯ АУДИТОРИЯ:
"Вторичная аудитория включает [характеристики], которые могут заинтересоваться проектом благодаря [причины интереса]. [Отличия от основной аудитории]."

ЧЕТВЕРТЫЙ АБЗАЦ - ПОДХОД К АУДИТОРИИ:
"Для привлечения аудитории следует [стратегические рекомендации], используя [каналы коммуникации] и подчеркивая [ключевые ценности]. [Потенциал роста]."

ПРИМЕРЫ КАЧЕСТВЕННЫХ ОПИСАНИЙ:

ЖАНРОВАЯ СПЕЦИФИКА:
- ДРАМА: "Взрослая аудитория 25-45 лет, ценящая психологическую глубину и реалистичные человеческие истории"
- ЭКШН: "Молодые люди 16-35 лет, активные пользователи соцсетей, ищущие адреналин и зрелищность"
- КОМЕДИЯ: "Широкая аудитория 18-50 лет, потребляющая развлекательный контент для снятия стресса"
- ХОРРОР: "Любители жанра 18-35 лет, активные в фан-сообществах, ищущие новые острые ощущения"

ПЛАТФОРМЕННАЯ СПЕЦИФИКА:
- КИНОТЕАТРЫ: "Аудитория, ценящая premium опыт и готовая платить за качественное развлечение"
- СТРИМИНГ: "Привычные к просмотру дома, ценящие удобство и разнообразие выбора"
- YOUTUBE: "Молодая аудитория, привычная к коротким форматам и интерактивности"
- СОЦИАЛЬНЫЕ СЕТИ: "Мобильная аудитория, потребляющая контент фрагментарно"

КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ:
- Конкретные возрастные диапазоны (не "молодые", а "18-25 лет")
- Специфические интересы (не "развлечения", а "настольные игры, инди-музыка")
- Конкретные платформы (не "интернет", а "TikTok, Instagram, Netflix")
- Конкретные мотивации (не "интересно", а "эскапизм, социальное одобрение")

ОШИБКИ, КОТОРЫХ СТОИТ ИЗБЕГАТЬ:
"Все возрасты" - слишком широко
"Молодежь" - неконкретно
"Любители кино" - очевидно
"Образованные люди" - расплывчато
"Средний класс" - без контекста

ВАЖНО: Максимальная длина описания целевой аудитории - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(целевая аудитория|target audience|аудитория):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации описания целевой аудитории. Попробуйте еще раз с более подробным описанием жанра и концепции проекта.';
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====



  /**
   * Валидация качества описания аудитории
   */
  validateAudienceQuality(audience: string): {
    isValid: boolean;
    issues: string[];
    score: number;
    elements: {
      hasDemographics: boolean;
      hasPsychographics: boolean;
      hasBehavior: boolean;
      hasMotivations: boolean;
      hasSegmentation: boolean;
    };
  } {
    const issues: string[] = [];
    let score = 100;
    
    // Проверка длины
    const wordCount = audience.split(/\s+/).length;
    if (wordCount < 80) {
      issues.push('Слишком короткий (меньше 80 слов)');
      score -= 20;
    }
    if (wordCount > 400) {
      issues.push('Слишком длинный (больше 400 слов)');
      score -= 10;
    }

    // Анализ ключевых элементов
    const elements = {
      hasDemographics: this.hasDemographicInfo(audience),
      hasPsychographics: this.hasPsychographicInfo(audience),
      hasBehavior: this.hasBehaviorInfo(audience),
      hasMotivations: this.hasMotivationInfo(audience),
      hasSegmentation: this.hasSegmentationInfo(audience)
    };

    if (!elements.hasDemographics) {
      issues.push('Недостаточно демографической информации');
      score -= 25;
    }
    if (!elements.hasPsychographics) {
      issues.push('Не описаны психографические характеристики');
      score -= 20;
    }
    if (!elements.hasBehavior) {
      issues.push('Не описано потребительское поведение');
      score -= 15;
    }
    if (!elements.hasMotivations) {
      issues.push('Не ясны мотивации аудитории');
      score -= 20;
    }
    if (!elements.hasSegmentation) {
      issues.push('Нет сегментации аудитории');
      score -= 10;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score),
      elements
    };
  }

  /**
   * Проверка демографической информации
   */
  private hasDemographicInfo(audience: string): boolean {
    const demographicWords = [
      'возраст', 'лет', 'мужчины', 'женщины', 'пол',
      'образование', 'доход', 'семья', 'работа', 'профессия'
    ];
    
    const audienceLower = audience.toLowerCase();
    return demographicWords.some(word => audienceLower.includes(word));
  }

  /**
   * Проверка психографической информации
   */
  private hasPsychographicInfo(audience: string): boolean {
    const psychographicWords = [
      'интересы', 'хобби', 'ценности', 'убеждения', 'стиль жизни',
      'предпочтения', 'характер', 'личность', 'мировоззрение'
    ];
    
    const audienceLower = audience.toLowerCase();
    return psychographicWords.some(word => audienceLower.includes(word));
  }

  /**
   * Проверка поведенческой информации
   */
  private hasBehaviorInfo(audience: string): boolean {
    const behaviorWords = [
      'смотрят', 'потребляют', 'покупают', 'выбирают',
      'платформы', 'устройства', 'время', 'частота',
      'социальные сети', 'стриминг', 'кинотеатры'
    ];
    
    const audienceLower = audience.toLowerCase();
    return behaviorWords.some(word => audienceLower.includes(word));
  }

  /**
   * Проверка мотивационной информации
   */
  private hasMotivationInfo(audience: string): boolean {
    const motivationWords = [
      'мотивация', 'потребности', 'ищут', 'хотят', 'ценят',
      'развлечение', 'образование', 'эмоции', 'статус',
      'эскапизм', 'социализация', 'самореализация'
    ];
    
    const audienceLower = audience.toLowerCase();
    return motivationWords.some(word => audienceLower.includes(word));
  }

  /**
   * Проверка сегментации
   */
  private hasSegmentationInfo(audience: string): boolean {
    const segmentationWords = [
      'основная', 'вторичная', 'главная', 'дополнительная',
      'сегмент', 'группа', 'категория', 'также', 'кроме того'
    ];
    
    const audienceLower = audience.toLowerCase();
    return segmentationWords.some(word => audienceLower.includes(word));
  }

  /**
   * Извлечение демографических характеристик
   */
  extractDemographics(audience: string): {
    ageRange?: string;
    gender?: string;
    education?: string;
    income?: string;
  } {
    const demographics: any = {};
    
    // Извлечение возраста
    const ageMatch = audience.match(/(\d+)\-?(\d+)?\s*лет/);
    if (ageMatch) {
      demographics.ageRange = ageMatch[2] ? `${ageMatch[1]}-${ageMatch[2]}` : `${ageMatch[1]}+`;
    }
    
    // Извлечение пола
    if (audience.toLowerCase().includes('мужчин')) {
      demographics.gender = audience.toLowerCase().includes('женщин') ? 'mixed' : 'male';
    } else if (audience.toLowerCase().includes('женщин')) {
      demographics.gender = 'female';
    }
    
    return demographics;
  }
}