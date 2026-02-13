import { 
  BaseBibleGenerationOperation
} from './base-bible-generation.operation';

/**
 * Операция генерации сеттинга проекта
 * Специализируется на создании детального описания места и времени действия
 */
export class SettingGenerationOperation extends BaseBibleGenerationOperation {
  
  protected fieldType = 'setting';
  protected defaultCreativityLevel = 0.7;
  protected defaultTemperature = 0.8;
  protected maxTokens = 10000; // Увеличено в 2 раза для Gemini
  protected maxContentLength = 1000;

  constructor() {
    super(
      'setting_generation',
      'Setting Generation',
      '1.0.0'
    );
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Создание сеттингов для творческих проектов

Твоя экспертиза:
- Проектирование миров и локаций
- Понимание влияния окружения на сюжет
- Создание атмосферных описаний
- Историческая и географическая достоверность
- Визуальная и сенсорная детализация

Принципы создания сеттинга:
- Функциональность (сеттинг служит истории)
- Достоверность (правдоподобие мира)
- Атмосферность (передача настроения)
- Уникальность (запоминающиеся детали)
- Практичность (возможность реализации)

Структура: ВРЕМЯ + МЕСТО + ЛОКАЦИИ + ОСОБЕННОСТИ + ВЛИЯНИЕ НА СЮЖЕТ`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ИНСТРУКЦИИ ДЛЯ СЕТТИНГА:

1. ВРЕМЕННОЙ КОНТЕКСТ:
   - Определи исторический период или эпоху
   - Укажи сезон и время года (если важно)
   - Опиши временные рамки действия
   - Учитывай технологический уровень

2. ГЕОГРАФИЧЕСКИЙ КОНТЕКСТ:
   - Определи регион, страну, город
   - Опиши климат и природные условия
   - Укажи особенности ландшафта
   - Рассмотри культурные особенности места

3. КЛЮЧЕВЫЕ ЛОКАЦИИ:
   - Перечисли 3-5 основных мест действия
   - Опиши их назначение и важность для сюжета
   - Добавь уникальные детали каждой локации
   - Покажи связи между локациями

4. АТМОСФЕРНЫЕ ДЕТАЛИ:
   - Визуальные элементы (цвета, свет, архитектура)
   - Звуковое окружение (шумы, музыка, тишина)
   - Запахи и тактильные ощущения
   - Погодные условия и их влияние

5. СОЦИАЛЬНЫЙ КОНТЕКСТ:
   - Описание общества и его структуры
   - Политическая обстановка (если релевантно)
   - Экономические условия
   - Культурные нормы и традиции

6. ВЛИЯНИЕ НА СЮЖЕТ:
   - Как сеттинг влияет на события
   - Какие ограничения или возможности создает
   - Как отражает темы проекта
   - Способы использования в драматургии

СТРУКТУРА ОПИСАНИЯ:

ПЕРВЫЙ АБЗАЦ - ОБЩИЙ КОНТЕКСТ:
"Действие происходит в [время] в [место]. [Общая характеристика мира/эпохи]. [Ключевая особенность, которая влияет на историю]."

ВТОРОЙ АБЗАЦ - ОСНОВНЫЕ ЛОКАЦИИ:
"Главные события развиваются в [локация 1], [локация 2] и [локация 3]. [Описание каждой локации и ее значения]. [Связи между местами]."

ТРЕТИЙ АБЗАЦ - АТМОСФЕРА И ДЕТАЛИ:
"Мир характеризуется [визуальные детали], [звуковое окружение] и [особые атмосферные элементы]. [Сенсорные детали]. [Уникальные особенности]."

ЧЕТВЕРТЫЙ АБЗАЦ - ВЛИЯНИЕ НА ИСТОРИЮ:
"Сеттинг [как влияет на персонажей], [какие создает препятствия/возможности] и [как отражает темы]. [Драматургическое использование]."

ЖАНРОВЫЕ ОСОБЕННОСТИ:
- СКИ-ФИ: технологии, космос, будущее
- ФЭНТЕЗИ: магия, мифические существа, альтернативные миры
- ИСТОРИЧЕСКИЙ: достоверность эпохи, культурные детали
- СОВРЕМЕННЫЙ: актуальные реалии, узнаваемые места
- ХОРРОР: зловещие локации, изоляция, угнетающая атмосфера
- ТРИЛЛЕР: городская среда, скрытые места, напряженная обстановка

ПРИМЕРЫ КАЧЕСТВЕННЫХ СЕТТИНГОВ:
- "Готэм-сити 1940-х: мрачный мегаполис с арт-деко архитектурой, где коррупция пронизывает все уровни власти"
- "Постапокалиптический Лондон 2087 года: затопленный город-остров, где выжившие живут на крышах небоскребов"
- "Маленький техасский городок 1980-х: консервативное сообщество с секретами, где все знают друг друга"

ВАЖНО: Максимальная длина описания сеттинга - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(сеттинг|setting|место действия):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации сеттинга. Попробуйте еще раз с более детальным описанием контекста проекта.';
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====



  /**
   * Валидация качества сеттинга
   */
  validateSettingQuality(setting: string): {
    isValid: boolean;
    issues: string[];
    score: number;
    elements: {
      hasTime: boolean;
      hasPlace: boolean;
      hasLocations: boolean;
      hasAtmosphere: boolean;
      hasStoryConnection: boolean;
    };
  } {
    const issues: string[] = [];
    let score = 100;
    
    // Проверка длины
    const wordCount = setting.split(/\s+/).length;
    if (wordCount < 150) {
      issues.push('Слишком короткий (меньше 150 слов)');
      score -= 20;
    }
    if (wordCount > 600) {
      issues.push('Слишком длинный (больше 600 слов)');
      score -= 10;
    }

    // Анализ ключевых элементов
    const elements = {
      hasTime: this.hasTimeContext(setting),
      hasPlace: this.hasPlaceContext(setting),
      hasLocations: this.hasSpecificLocations(setting),
      hasAtmosphere: this.hasAtmosphericDetails(setting),
      hasStoryConnection: this.hasStoryConnection(setting)
    };

    if (!elements.hasTime) {
      issues.push('Не указан временной контекст');
      score -= 15;
    }
    if (!elements.hasPlace) {
      issues.push('Не ясен географический контекст');
      score -= 20;
    }
    if (!elements.hasLocations) {
      issues.push('Не описаны конкретные локации');
      score -= 25;
    }
    if (!elements.hasAtmosphere) {
      issues.push('Недостаточно атмосферных деталей');
      score -= 15;
    }
    if (!elements.hasStoryConnection) {
      issues.push('Не показана связь с сюжетом');
      score -= 15;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score),
      elements
    };
  }

  /**
   * Проверка временного контекста
   */
  private hasTimeContext(setting: string): boolean {
    const timeWords = [
      'год', 'эпоха', 'период', 'время', 'век', 'столетие',
      'современность', 'будущее', 'прошлое', 'настоящее',
      'война', 'мир', 'революция', 'кризис', 'бум'
    ];
    
    const settingLower = setting.toLowerCase();
    return timeWords.some(word => settingLower.includes(word));
  }

  /**
   * Проверка географического контекста
   */
  private hasPlaceContext(setting: string): boolean {
    const placeWords = [
      'город', 'деревня', 'страна', 'континент', 'остров',
      'планета', 'мир', 'вселенная', 'регион', 'область',
      'север', 'юг', 'восток', 'запад', 'океан', 'море'
    ];
    
    const settingLower = setting.toLowerCase();
    return placeWords.some(word => settingLower.includes(word));
  }

  /**
   * Проверка конкретных локаций
   */
  private hasSpecificLocations(setting: string): boolean {
    const locationWords = [
      'дом', 'офис', 'школа', 'больница', 'парк', 'улица',
      'здание', 'комната', 'площадь', 'мост', 'станция',
      'кафе', 'ресторан', 'магазин', 'театр', 'церковь'
    ];
    
    const settingLower = setting.toLowerCase();
    return locationWords.some(word => settingLower.includes(word));
  }

  /**
   * Проверка атмосферных деталей
   */
  private hasAtmosphericDetails(setting: string): boolean {
    const atmosphereWords = [
      'атмосфера', 'настроение', 'цвет', 'свет', 'тень',
      'звук', 'шум', 'тишина', 'запах', 'аромат',
      'холод', 'тепло', 'ветер', 'дождь', 'снег'
    ];
    
    const settingLower = setting.toLowerCase();
    return atmosphereWords.some(word => settingLower.includes(word));
  }

  /**
   * Проверка связи с сюжетом
   */
  private hasStoryConnection(setting: string): boolean {
    const storyWords = [
      'влияет', 'создает', 'формирует', 'определяет',
      'ограничивает', 'позволяет', 'способствует',
      'препятствует', 'символизирует', 'отражает'
    ];
    
    const settingLower = setting.toLowerCase();
    return storyWords.some(word => settingLower.includes(word));
  }

  /**
   * Извлечение ключевых локаций из сеттинга
   */
  extractKeyLocations(setting: string): string[] {
    // Ищем упоминания конкретных мест
    const locationPatterns = [
      /(?:в|на|у)\s+([А-Я][а-я]+(?:\s+[А-Я][а-я]+)*)/g,
      /([А-Я][а-я]+(?:\s+[а-я]+)*)\s+(?:служит|является|представляет)/g
    ];
    
    const locations: string[] = [];
    
    locationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(setting)) !== null) {
        const location = match[1].trim();
        if (location.length > 3 && !locations.includes(location)) {
          locations.push(location);
        }
      }
    });
    
    return locations.slice(0, 5); // Максимум 5 локаций
  }
}