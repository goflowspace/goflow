import { 
  BaseBibleGenerationOperation
} from './base-bible-generation.operation';

/**
 * Операция генерации логлайна проекта
 * Специализируется на создании краткого, цепляющего описания проекта
 */
export class LoglineGenerationOperation extends BaseBibleGenerationOperation {
  
  protected fieldType = 'logline';
  protected defaultCreativityLevel = 0.8;
  protected defaultTemperature = 0.8;
  protected maxTokens = 10000; // Увеличено в 2 раза для Gemini
  protected maxContentLength = 500;

  constructor() {
    super(
      'logline_generation',
      'Logline Generation',
      '1.0.0'
    );
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Создание логлайнов для творческих проектов

Твоя экспертиза:
- Структура эффективного логлайна
- Техники создания интриги и хука
- Понимание индустриальных стандартов
- Адаптация под разные медиаформаты

Принципы создания логлайна:
- Краткость (1-2 предложения, до 50 слов)
- Ясность (понятно о чем проект)
- Интрига (заставляет хотеть узнать больше)
- Конфликт (центральная проблема/вызов)
- Ставки (что поставлено на карту)

Структура логлайна: ГЕРОЙ + КОНФЛИКТ/СИТУАЦИЯ + СТАВКИ`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ИНСТРУКЦИИ ДЛЯ ЛОГЛАЙНА:

1. АНАЛИЗ ОСНОВЫ:
   - Определи главного героя/протагониста
   - Выяви центральный конфликт или вызов
   - Установи ставки (что герой может потерять/получить)
   - Найди уникальный крючок истории

2. СТРУКТУРА ЛОГЛАЙНА:
   Используй проверенную формулу:
   "Когда [ситуация], [герой] должен [действие], иначе [последствия]"
   
   Альтернативные структуры:
   - "[Герой] пытается [цель], но [препятствие]"
   - "В мире где [сеттинг], [герой] [конфликт]"

3. ТРЕБОВАНИЯ К КАЧЕСТВУ:
   - Длина: 1-2 предложения (максимум 50 слов)
   - Ясность: понятно даже без контекста
   - Интрига: вызывает желание узнать больше
   - Избегай имен собственных (кроме очень известных)
   - Не раскрывай концовку

4. ЖАНРОВЫЕ ОСОБЕННОСТИ:
   - Экшн: упор на действие и опасность
   - Драма: акцент на эмоциональном конфликте
   - Комедия: намек на юмористическую ситуацию
   - Триллер: создание напряжения и угрозы
   - Хоррор: элемент страха и неизвестности

5. ПРОВЕРОЧНЫЕ ВОПРОСЫ:
   - Понятно ли, кто главный герой?
   - Ясен ли основной конфликт?
   - Очевидны ли ставки?
   - Вызывает ли желание узнать больше?

Примеры качественных логлайнов:
- "Когда гигантская акула терроризирует пляжный курорт, местный шериф должен убить ее, прежде чем она съест всех туристов."
- "Программист обнаруживает, что его реальность - компьютерная симуляция, и должен выбрать между комфортной ложью и опасной правдой."

ВАЖНО: Максимальная длина логлайна - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(логлайн|logline):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации логлайна. Попробуйте еще раз.';
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Валидация качества логлайна
   */
  validateLoglineQuality(logline: string): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Проверка длины
    const wordCount = logline.split(/\s+/).length;
    if (wordCount > 50) {
      issues.push('Слишком длинный (больше 50 слов)');
      score -= 20;
    }
    if (wordCount < 10) {
      issues.push('Слишком короткий (меньше 10 слов)');
      score -= 15;
    }

    // Проверка структуры
    if (!this.hasProtagonist(logline)) {
      issues.push('Не ясен главный герой');
      score -= 25;
    }
    
    if (!this.hasConflict(logline)) {
      issues.push('Не ясен основной конфликт');
      score -= 25;
    }
    
    if (!this.hasStakes(logline)) {
      issues.push('Не ясны ставки');
      score -= 15;
    }

    // Проверка интриги
    if (!this.hasIntrigue(logline)) {
      issues.push('Недостаточно интриги');
      score -= 10;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  /**
   * Проверка наличия протагониста
   */
  private hasProtagonist(logline: string): boolean {
    const protagonistWords = [
      'герой', 'героиня', 'человек', 'женщина', 'мужчина', 'ребенок',
      'подросток', 'студент', 'врач', 'учитель', 'полицейский', 'детектив',
      'ученый', 'программист', 'художник', 'писатель', 'журналист'
    ];
    
    const loglineLower = logline.toLowerCase();
    return protagonistWords.some(word => loglineLower.includes(word));
  }

  /**
   * Проверка наличия конфликта
   */
  private hasConflict(logline: string): boolean {
    const conflictWords = [
      'должен', 'пытается', 'борется', 'сражается', 'противостоит',
      'вынужден', 'стремится', 'пытается', 'борется', 'преследует',
      'убегает', 'спасает', 'защищает', 'ищет', 'расследует'
    ];
    
    const loglineLower = logline.toLowerCase();
    return conflictWords.some(word => loglineLower.includes(word));
  }

  /**
   * Проверка наличия ставок
   */
  private hasStakes(logline: string): boolean {
    const stakesWords = [
      'иначе', 'или', 'прежде чем', 'до того как', 'чтобы не',
      'ради', 'спасти', 'потерять', 'выжить', 'умереть', 'погибнуть',
      'разрушить', 'уничтожить', 'спасти мир', 'спасти семью'
    ];
    
    const loglineLower = logline.toLowerCase();
    return stakesWords.some(word => loglineLower.includes(word));
  }

  /**
   * Проверка наличия интриги
   */
  private hasIntrigue(logline: string): boolean {
    const intrigueWords = [
      'тайна', 'секрет', 'загадка', 'неожиданно', 'внезапно',
      'обнаруживает', 'узнает', 'понимает', 'выясняет',
      'странный', 'необычный', 'мистический', 'таинственный'
    ];
    
    const loglineLower = logline.toLowerCase();
    return intrigueWords.some(word => loglineLower.includes(word));
  }

  /**
   * Генерация альтернативных версий логлайна
   */
  generateLoglineVariations(baseLogline: string): string[] {
    // Это заглушка для будущей функциональности
    // В реальной реализации здесь была бы логика создания вариаций
    return [
      baseLogline,
      // Можно добавить алгоритмы перефразирования
    ];
  }
}