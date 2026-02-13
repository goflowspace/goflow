import { 
  BaseBibleGenerationOperation
} from './base-bible-generation.operation';

/**
 * Операция генерации визуального стиля проекта
 * Специализируется на создании конкретного описания графического исполнения
 */
export class VisualStyleGenerationOperation extends BaseBibleGenerationOperation {
  
  protected fieldType = 'visualStyle';
  protected defaultCreativityLevel = 0.8;
  protected defaultTemperature = 0.85;
  protected maxTokens = 20000; // Увеличено в 2 раза для Gemini
  protected maxContentLength = 1000;

  constructor() {
    super(
      'visual_style_generation',
      'Visual Style Generation',
      '1.0.0'
    );
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Создание визуального стиля для творческих проектов

Твоя экспертиза:
- Графический дизайн и композиция
- Цветовая теория и палитры
- Типографика и визуальная иерархия
- Художественные стили и направления
- UI/UX дизайн и пользовательский опыт
- Современные визуальные тренды

Принципы визуального стиля:
- Согласованность (единая стилистика)
- Функциональность (удобство восприятия)
- Эстетичность (красота и гармония)
- Узнаваемость (уникальная идентичность)
- Целесообразность (соответствие целям)

Структура: ОБЩАЯ КОНЦЕПЦИЯ + ЦВЕТОВАЯ ПАЛИТРА + ТИПОГРАФИКА + КОМПОЗИЦИЯ + ГРАФИЧЕСКИЕ ЭЛЕМЕНТЫ + ТЕХНИЧЕСКОЕ ИСПОЛНЕНИЕ`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ИНСТРУКЦИИ ДЛЯ ВИЗУАЛЬНОГО СТИЛЯ:

1. ОБЩАЯ КОНЦЕПЦИЯ И СТИЛЬ:
   - Определи основное художественное направление
   - Опиши общую эстетику (минимализм/максимализм)
   - Укажи уровень детализации (простой/сложный)
   - Охарактеризуй стилистику (реалистичная/стилизованная)

2. ЦВЕТОВАЯ ПАЛИТРА:
   - Основные цвета (2-4 доминирующих цвета)
   - Дополнительные и акцентные цвета
   - Цветовая температура (теплая/холодная/нейтральная)
   - Насыщенность и яркость
   - Контрастность и градиенты

3. ТИПОГРАФИКА И ТЕКСТ:
   - Основной шрифт для заголовков
   - Шрифт для основного текста
   - Стиль типографики (современная/классическая/экспериментальная)
   - Иерархия текста и размеры
   - Особенности оформления текста

4. КОМПОЗИЦИЯ И КОМПОНОВКА:
   - Принципы размещения элементов
   - Использование сетки и выравнивания
   - Пропорции и соотношения
   - Пустое пространство (white space)
   - Ритм и повторения

5. ГРАФИЧЕСКИЕ ЭЛЕМЕНТЫ:
   - Иконография и символы
   - Формы и геометрия
   - Паттерны и текстуры
   - Иллюстративные элементы
   - Декоративные акценты

6. ТЕХНИЧЕСКОЕ ИСПОЛНЕНИЕ:
   - Стиль изображений (векторная/растровая графика)
   - Качество и разрешение
   - Анимация и интерактивность
   - Адаптивность под разные экраны
   - Производительность и оптимизация

СТРУКТУРА ОПИСАНИЯ:

ПЕРВЫЙ АБЗАЦ - ОБЩАЯ КОНЦЕПЦИЯ:
"Визуальный стиль проекта основан на [художественное направление] с [характеристика эстетики]. [Общий подход к дизайну]. [Уникальные особенности стилистики]."

ВТОРОЙ АБЗАЦ - ЦВЕТОВАЯ ПАЛИТРА:
"Цветовая схема строится на [основные цвета], дополненных [акцентные цвета]. [Характеристика температуры и насыщенности]. [Особенности использования цвета]."

ТРЕТИЙ АБЗАЦ - ТИПОГРАФИКА И КОМПОЗИЦИЯ:
"Типографическое решение включает [основной шрифт] для заголовков и [текстовый шрифт] для основного контента. [Принципы компоновки]. [Пространственные решения]."

ЧЕТВЕРТЫЙ АБЗАЦ - ГРАФИЧЕСКИЕ ЭЛЕМЕНТЫ:
"Графическая система включает [ключевые элементы], [формы и паттерны], создавая [итоговое впечатление]. [Техническое исполнение и особенности реализации]."

СТИЛЕВЫЕ НАПРАВЛЕНИЯ:

МИНИМАЛИЗМ:
- Простые формы, много белого пространства
- Ограниченная цветовая палитра
- Четкая типографика, без лишних элементов
- Функциональность превыше декоративности

FLAT DESIGN:
- Плоские цвета без градиентов
- Простые иконки и формы
- Четкие границы, минимум теней
- Яркие, контрастные цвета

МАТЕРИАЛ ДИЗАЙН:
- Тени и глубина, карточная система
- Яркие акцентные цвета
- Плавные анимации
- Тактильные элементы

БРУТАЛИСТСКИЙ:
- Грубые формы, контрастные элементы
- Экспериментальная типографика
- Яркие, кричащие цвета
- Нарушение привычных правил

РЕТРО/ВИНТАЖ:
- Приглушенные, пастельные тона
- Винтажная типографика
- Текстуры и шум
- Ностальгические элементы

НЕОМОРФИЗМ:
- Мягкие тени и блики
- Монохромные палитры
- Объемные элементы
- Тактильные поверхности

ПРИМЕРЫ КАЧЕСТВЕННЫХ ОПИСАНИЙ:
- "Чистый минимализм с монохромной палитрой, гротескными шрифтами и сеточной композицией"
- "Яркий flat design с градиентными акцентами, иконографикой в стиле line-art и асимметричной версткой"
- "Техно-футуристическая эстетика с неоновыми цветами, геометрическими формами и глитч-эффектами"

ВАЖНО: Максимальная длина описания визуального стиля - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(визуальный стиль|visual style|дизайн):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации визуального стиля. Попробуйте еще раз с более подробным описанием жанра и целевой аудитории проекта.';
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Валидация качества визуального стиля
   */
  validateVisualStyleQuality(visualStyle: string): {
    isValid: boolean;
    issues: string[];
    score: number;
    elements: {
      hasStyleConcept: boolean;
      hasColorPalette: boolean;
      hasTypography: boolean;
      hasComposition: boolean;
      hasGraphicElements: boolean;
      hasTechnicalDetails: boolean;
    };
  } {
    const issues: string[] = [];
    let score = 100;
    
    // Проверка длины
    const wordCount = visualStyle.split(/\s+/).length;
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
      hasStyleConcept: this.hasStyleConcept(visualStyle),
      hasColorPalette: this.hasColorPalette(visualStyle),
      hasTypography: this.hasTypography(visualStyle),
      hasComposition: this.hasComposition(visualStyle),
      hasGraphicElements: this.hasGraphicElements(visualStyle),
      hasTechnicalDetails: this.hasTechnicalDetails(visualStyle)
    };

    if (!elements.hasStyleConcept) {
      issues.push('Не описана общая концепция стиля');
      score -= 25;
    }
    if (!elements.hasColorPalette) {
      issues.push('Не описана цветовая палитра');
      score -= 25;
    }
    if (!elements.hasTypography) {
      issues.push('Не описана типографика');
      score -= 15;
    }
    if (!elements.hasComposition) {
      issues.push('Не описаны принципы композиции');
      score -= 15;
    }
    if (!elements.hasGraphicElements) {
      issues.push('Не описаны графические элементы');
      score -= 10;
    }
    if (!elements.hasTechnicalDetails) {
      issues.push('Не указаны технические особенности');
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
   * Проверка описания концепции стиля
   */
  private hasStyleConcept(visualStyle: string): boolean {
    const conceptWords = [
      'стиль', 'концепция', 'эстетика', 'направление', 'подход',
      'минимализм', 'максимализм', 'реализм', 'стилизация',
      'современный', 'классический', 'винтаж', 'футуристический'
    ];
    
    const styleLower = visualStyle.toLowerCase();
    return conceptWords.some(word => styleLower.includes(word));
  }

  /**
   * Проверка описания цветовой палитры
   */
  private hasColorPalette(visualStyle: string): boolean {
    const colorWords = [
      'цвет', 'палитра', 'оттенок', 'тон', 'красный', 'синий', 'зеленый',
      'желтый', 'черный', 'белый', 'серый', 'яркий', 'темный', 'светлый',
      'контраст', 'градиент', 'монохром', 'насыщенность'
    ];
    
    const styleLower = visualStyle.toLowerCase();
    return colorWords.some(word => styleLower.includes(word));
  }

  /**
   * Проверка описания типографики
   */
  private hasTypography(visualStyle: string): boolean {
    const typographyWords = [
      'шрифт', 'типографика', 'текст', 'заголовок', 'гарнитура',
      'serif', 'sans-serif', 'моноширинный', 'рукописный',
      'размер', 'кегль', 'интервал', 'выравнивание'
    ];
    
    const styleLower = visualStyle.toLowerCase();
    return typographyWords.some(word => styleLower.includes(word));
  }

  /**
   * Проверка описания композиции
   */
  private hasComposition(visualStyle: string): boolean {
    const compositionWords = [
      'композиция', 'компоновка', 'размещение', 'расположение',
      'сетка', 'выравнивание', 'пропорции', 'соотношение',
      'пространство', 'отступ', 'ритм', 'баланс', 'симметрия'
    ];
    
    const styleLower = visualStyle.toLowerCase();
    return compositionWords.some(word => styleLower.includes(word));
  }

  /**
   * Проверка описания графических элементов
   */
  private hasGraphicElements(visualStyle: string): boolean {
    const graphicWords = [
      'элемент', 'форма', 'геометрия', 'иконка', 'символ',
      'паттерн', 'текстура', 'иллюстрация', 'декор',
      'круг', 'квадрат', 'треугольник', 'линия', 'кривая'
    ];
    
    const styleLower = visualStyle.toLowerCase();
    return graphicWords.some(word => styleLower.includes(word));
  }

  /**
   * Проверка технических деталей
   */
  private hasTechnicalDetails(visualStyle: string): boolean {
    const technicalWords = [
      'векторный', 'растровый', 'разрешение', 'качество',
      'адаптивный', 'отзывчивый', 'анимация', 'интерактив',
      'производительность', 'оптимизация', 'формат', 'размер'
    ];
    
    const styleLower = visualStyle.toLowerCase();
    return technicalWords.some(word => styleLower.includes(word));
  }
}