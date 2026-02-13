import { 
  BaseBibleGenerationOperation
} from './base-bible-generation.operation';

/**
 * Операция генерации атмосферы проекта
 * Специализируется на создании описания общего настроения, тона и стиля
 */
export class AtmosphereGenerationOperation extends BaseBibleGenerationOperation {
  
  protected fieldType = 'atmosphere';
  protected defaultCreativityLevel = 0.8;
  protected defaultTemperature = 0.9;
  protected maxTokens = 10000; // Увеличено в 2 раза для Gemini
  protected maxContentLength = 500;

  constructor() {
    super(
      'atmosphere_generation',
      'Atmosphere Generation',
      '1.0.0'
    );
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Создание атмосферы для творческих проектов

Твоя экспертиза:
- Понимание эмоционального воздействия
- Создание настроения через детали
- Визуальная и звуковая стилистика
- Психология восприятия аудитории
- Жанровые атмосферные конвенции

Принципы создания атмосферы:
- Сенсорность (задействование всех чувств)
- Последовательность (единый тон)
- Эмоциональность (воздействие на чувства)
- Символичность (глубинные смыслы)
- Узнаваемость (соответствие жанру)

Структура: ОБЩИЙ ТОН + ВИЗУАЛЬНЫЙ СТИЛЬ + ЗВУКОВАЯ ПАЛИТРА + ЭМОЦИОНАЛЬНАЯ ОКРАСКА + СИМВОЛИЗМ`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ИНСТРУКЦИИ ДЛЯ АТМОСФЕРЫ:

1. ОБЩИЙ ТОН И НАСТРОЕНИЕ:
   - Определи доминирующую эмоцию проекта
   - Опиши энергетику (спокойная/динамичная)
   - Укажи уровень напряженности
   - Охарактеризуй темп повествования

2. ВИЗУАЛЬНАЯ СТИЛИСТИКА:
   - Цветовая палитра (теплые/холодные тона)
   - Освещение (яркое/приглушенное/контрастное)
   - Композиция (симметрия/хаос/баланс)
   - Текстуры и материалы
   - Визуальные мотивы и символы

3. ЗВУКОВОЕ ОКРУЖЕНИЕ:
   - Музыкальный стиль и инструменты
   - Природные звуки и шумы
   - Ритм и темп звукового ряда
   - Использование тишины
   - Звуковые эффекты и акценты

4. ЭМОЦИОНАЛЬНАЯ ПАЛИТРА:
   - Основные эмоции персонажей
   - Эмоциональная динамика (спады/подъемы)
   - Психологическое состояние
   - Внутреннее напряжение
   - Катарсис и разрядка

5. СИМВОЛИЧЕСКОЕ НАПОЛНЕНИЕ:
   - Ключевые символы и метафоры
   - Архетипические образы
   - Культурные коды и отсылки
   - Глубинные смыслы
   - Подтексты и скрытые значения

6. ЖАНРОВОЕ СООТВЕТСТВИЕ:
   - Соблюдение жанровых ожиданий
   - Уникальные атмосферные элементы
   - Баланс знакомого и неожиданного
   - Современное переосмысление классики

СТРУКТУРА ОПИСАНИЯ:

ПЕРВЫЙ АБЗАЦ - ОБЩЕЕ НАСТРОЕНИЕ:
"Проект пронизан [основная эмоция/настроение]. [Характеристика тона]. [Энергетика и темп]. [Общее впечатление]."

ВТОРОЙ АБЗАЦ - ВИЗУАЛЬНАЯ СТИЛИСТИКА:
"Визуально мир характеризуется [цветовая палитра], [освещение] и [ключевые визуальные элементы]. [Композиционные особенности]. [Символические визуальные мотивы]."

ТРЕТИЙ АБЗАЦ - ЗВУКОВАЯ ПАЛИТРА:
"Звуковой ряд строится на [музыкальный стиль/инструменты], [природные звуки] и [особые звуковые эффекты]. [Ритм и динамика]. [Использование тишины и пауз]."

ЧЕТВЕРТЫЙ АБЗАЦ - ЭМОЦИОНАЛЬНОЕ ВОЗДЕЙСТВИЕ:
"Атмосфера создает ощущение [эмоциональное воздействие], погружая аудиторию в [психологическое состояние]. [Символическое значение]. [Связь с темами проекта]."

ЖАНРОВЫЕ АТМОСФЕРЫ:

ДРАМА:
- Интимность, эмоциональная глубина
- Натуральное освещение, реалистичные цвета
- Тишина, минималистичная музыка
- Внутреннее напряжение, катарсис

ТРИЛЛЕР:
- Напряженность, саспенс
- Контрастное освещение, холодные тона
- Дисгармоничная музыка, резкие звуки
- Тревога, неопределенность

ХОРРОР:
- Зловещность, страх
- Темные тона, резкие контрасты
- Дискомфортные звуки, тишина
- Ужас, беспомощность

КОМЕДИЯ:
- Легкость, веселье
- Яркие цвета, хорошее освещение
- Ритмичная музыка, забавные звуки
- Радость, смех, облегчение

СКИ-ФИ:
- Футуристичность, загадочность
- Холодные тона, неоновые акценты
- Электронная музыка, космические звуки
- Удивление, технологический восторг

ФЭНТЕЗИ:
- Волшебство, эпичность
- Богатая цветовая палитра
- Оркестровая музыка, природные звуки
- Чудо, приключенческий дух

ПРИМЕРЫ КАЧЕСТВЕННЫХ ОПИСАНИЙ:
- "Мрачная элегантность нуара с дождливыми улицами, неоновыми отражениями и саксофонным джазом"
- "Пастельная меланхолия инди-драмы с естественным светом, акустической гитарой и долгими паузами"
- "Техно-готическая эстетика киберпанка с неоновой геометрией, синтетическими битами и цифровым гулом"

ВАЖНО: Максимальная длина описания атмосферы - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(атмосфера|atmosphere|настроение):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации атмосферы. Попробуйте еще раз с более подробным описанием жанра и настроения проекта.';
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Валидация качества атмосферы
   */
  validateAtmosphereQuality(atmosphere: string): {
    isValid: boolean;
    issues: string[];
    score: number;
    elements: {
      hasMood: boolean;
      hasVisualElements: boolean;
      hasSoundElements: boolean;
      hasEmotionalImpact: boolean;
      hasSymbolism: boolean;
    };
  } {
    const issues: string[] = [];
    let score = 100;
    
    // Проверка длины
    const wordCount = atmosphere.split(/\s+/).length;
    if (wordCount < 100) {
      issues.push('Слишком короткий (меньше 100 слов)');
      score -= 20;
    }
    if (wordCount > 500) {
      issues.push('Слишком длинный (больше 500 слов)');
      score -= 10;
    }

    // Анализ ключевых элементов
    const elements = {
      hasMood: this.hasMoodDescription(atmosphere),
      hasVisualElements: this.hasVisualDescription(atmosphere),
      hasSoundElements: this.hasSoundDescription(atmosphere),
      hasEmotionalImpact: this.hasEmotionalDescription(atmosphere),
      hasSymbolism: this.hasSymbolicElements(atmosphere)
    };

    if (!elements.hasMood) {
      issues.push('Не описано общее настроение');
      score -= 25;
    }
    if (!elements.hasVisualElements) {
      issues.push('Недостаточно визуальных элементов');
      score -= 20;
    }
    if (!elements.hasSoundElements) {
      issues.push('Не описаны звуковые элементы');
      score -= 15;
    }
    if (!elements.hasEmotionalImpact) {
      issues.push('Не ясно эмоциональное воздействие');
      score -= 20;
    }
    if (!elements.hasSymbolism) {
      issues.push('Отсутствуют символические элементы');
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
   * Проверка описания настроения
   */
  private hasMoodDescription(atmosphere: string): boolean {
    const moodWords = [
      'настроение', 'атмосфера', 'тон', 'ощущение', 'впечатление',
      'мрачный', 'светлый', 'тревожный', 'спокойный', 'напряженный',
      'меланхолия', 'эйфория', 'тоска', 'радость', 'грусть'
    ];
    
    const atmosphereLower = atmosphere.toLowerCase();
    return moodWords.some(word => atmosphereLower.includes(word));
  }

  /**
   * Проверка визуального описания
   */
  private hasVisualDescription(atmosphere: string): boolean {
    const visualWords = [
      'цвет', 'свет', 'тень', 'освещение', 'палитра', 'яркий',
      'темный', 'контраст', 'композиция', 'визуальный',
      'красный', 'синий', 'желтый', 'зеленый', 'черный', 'белый'
    ];
    
    const atmosphereLower = atmosphere.toLowerCase();
    return visualWords.some(word => atmosphereLower.includes(word));
  }

  /**
   * Проверка звукового описания
   */
  private hasSoundDescription(atmosphere: string): boolean {
    const soundWords = [
      'звук', 'музыка', 'мелодия', 'ритм', 'тишина', 'шум',
      'эхо', 'голос', 'инструмент', 'аккорд', 'нота',
      'саундтрек', 'акустика', 'гармония', 'диссонанс'
    ];
    
    const atmosphereLower = atmosphere.toLowerCase();
    return soundWords.some(word => atmosphereLower.includes(word));
  }

  /**
   * Проверка эмоционального описания
   */
  private hasEmotionalDescription(atmosphere: string): boolean {
    const emotionalWords = [
      'эмоция', 'чувство', 'переживание', 'воздействие',
      'страх', 'радость', 'грусть', 'тревога', 'восторг',
      'напряжение', 'расслабление', 'возбуждение', 'умиротворение'
    ];
    
    const atmosphereLower = atmosphere.toLowerCase();
    return emotionalWords.some(word => atmosphereLower.includes(word));
  }

  /**
   * Проверка символических элементов
   */
  private hasSymbolicElements(atmosphere: string): boolean {
    const symbolWords = [
      'символ', 'метафора', 'образ', 'смысл', 'значение',
      'отражает', 'символизирует', 'олицетворяет', 'воплощает',
      'архетип', 'мотив', 'подтекст', 'аллегория'
    ];
    
    const atmosphereLower = atmosphere.toLowerCase();
    return symbolWords.some(word => atmosphereLower.includes(word));
  }

  /**
   * Анализ эмоциональной температуры атмосферы
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  analyzeEmotionalTemperature(_atmosphere: string): {
    warmth: number; // -1 (холодная) до 1 (теплая)
    energy: number; // -1 (спокойная) до 1 (энергичная)
    tension: number; // 0 (расслабленная) до 1 (напряженная)
  } {
    // Это заглушка для будущей функциональности
    // В реальной реализации здесь был бы анализ эмоциональной окраски
    return {
      warmth: 0,
      energy: 0,
      tension: 0
    };
  }
}