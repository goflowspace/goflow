import { 
  BaseBibleGenerationOperation
} from './base-bible-generation.operation';

/**
 * Операция генерации синопсиса проекта
 * Специализируется на создании структурированного описания сюжета
 */
export class SynopsisGenerationOperation extends BaseBibleGenerationOperation {
  
  protected fieldType = 'synopsis';
  protected defaultCreativityLevel = 0.8;
  protected defaultTemperature = 0.8;
  protected maxTokens = 10000; // Увеличено для Gemini
  protected maxContentLength = 4000;

  constructor() {
    super(
      'synopsis_generation',
      'Synopsis Generation',
      '1.0.0'
    );
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Создание синопсисов для творческих проектов

Твоя экспертиза:
- Структура драматургии и сюжетостроения
- Техники создания захватывающих описаний
- Развитие персонажей и конфликтов
- Адаптация под разные жанры и форматы

Принципы создания синопсиса:
- Структурированность (завязка, развитие, кульминация, развязка)
- Динамичность (интересно читать)
- Полнота (все основные сюжетные линии)
- Ясность (понятная причинно-следственная связь)
- Эмоциональность (передача атмосферы и тона)

Длина: 2-4 абзаца (300-600 слов) для полноценного описания`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ИНСТРУКЦИИ ДЛЯ СИНОПСИСА:

1. СТРУКТУРА СИНОПСИСА:
   
   ПЕРВЫЙ АБЗАЦ - ЗАВЯЗКА:
   - Представь главного героя и его мир
   - Опиши исходную ситуацию
   - Покажи катализатор (событие, которое запускает историю)
   - Сформулируй основной конфликт

   ВТОРОЙ АБЗАЦ - РАЗВИТИЕ:
   - Покажи попытки героя решить проблему
   - Опиши основные препятствия и противников
   - Развивай отношения между персонажами
   - Усложняй ситуацию, повышай ставки

   ТРЕТИЙ АБЗАЦ - КУЛЬМИНАЦИЯ:
   - Приведи к главному столкновению/выбору
   - Покажи критический момент истории
   - Раскрой, как герой меняется
   - Подведи к разрешению конфликта

   ЧЕТВЕРТЫЙ АБЗАЦ (опционально) - РАЗВЯЗКА:
   - Покажи последствия событий
   - Опиши новое состояние мира/героя
   - Дай эмоциональное завершение
   - Намекни на темы и послание

2. КЛЮЧЕВЫЕ ЭЛЕМЕНТЫ:
   - Главный герой: кто он, чего хочет
   - Антагонист: кто/что противостоит герою
   - Центральный конфликт: внешний и внутренний
   - Ставки: что герой может потерять/получить
   - Арка персонажа: как герой меняется
   - Тематика: о чем на самом деле история

3. СТИЛИСТИЧЕСКИЕ ТРЕБОВАНИЯ:
   - Настоящее время (как происходящее сейчас)
   - Активный залог (делает описание динамичным)
   - Конкретные детали (избегай абстракций)
   - Эмоциональная окраска (передавай атмосферу)
   - Связность (плавные переходы между частями)

4. ЖАНРОВЫЕ ОСОБЕННОСТИ:
   - ДРАМА: акцент на внутренних конфликтах и эмоциях
   - ЭКШН: динамичные события и внешние препятствия
   - ТРИЛЛЕР: нагнетание напряжения и саспенса
   - КОМЕДИЯ: юмористические ситуации и характеры
   - ХОРРОР: элементы страха и нарастающая угроза
   - СКИ-ФИ/ФЭНТЕЗИ: уникальные элементы мира

5. ЧТО ВКЛЮЧАТЬ:
   Основные сюжетные повороты
   Ключевых персонажей и их мотивации
   Центральную тему и атмосферу
   Эмоциональную арку героя
   Разрешение основного конфликта

6. ЧТО НЕ ВКЛЮЧАТЬ:
   Мелкие подробности и второстепенные сюжетные линии
   Излишние имена и даты
   Спойлеры концовки (в питчевых синопсисах)
   Оценочные суждения ("удивительный", "невероятный")
   Вопросы к читателю

ПРИМЕР СТРУКТУРЫ:
"[Герой] живет в [мир/ситуация], но когда [событие], он [действие]. Однако [препятствие] заставляет его [новое действие], что приводит к [последствия]. В кульминационном [событие] герой должен [выбор/действие], что [результат] и [изменение героя/мира]."

ВАЖНО: Максимальная длина синопсиса - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string {
    const stringContent = Array.isArray(content) ? content.join(' ') : content;
    let processed = stringContent.trim().replace(/^(синопсис|synopsis):\s*/i, '');
    return processed;
  }

  protected getErrorContent(): string {
    return 'Ошибка генерации синопсиса. Попробуйте еще раз с более подробным контекстом проекта.';
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Валидация качества синопсиса
   */
  validateSynopsisQuality(synopsis: string): {
    isValid: boolean;
    issues: string[];
    score: number;
    structure: {
      hasSteup: boolean;
      hasConflict: boolean;
      hasClimax: boolean;
      hasResolution: boolean;
    };
  } {
    const issues: string[] = [];
    let score = 100;
    
    // Проверка длины
    const wordCount = synopsis.split(/\s+/).length;
    if (wordCount < 200) {
      issues.push('Слишком короткий (меньше 200 слов)');
      score -= 20;
    }
    if (wordCount > 800) {
      issues.push('Слишком длинный (больше 800 слов)');
      score -= 10;
    }

    // Проверка структуры
    const paragraphs = synopsis.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length < 2) {
      issues.push('Недостаточно структурированный (мало абзацев)');
      score -= 15;
    }

    // Анализ структурных элементов
    const structure = {
      hasSteup: this.hasSetup(synopsis),
      hasConflict: this.hasConflict(synopsis),
      hasClimax: this.hasClimax(synopsis),
      hasResolution: this.hasResolution(synopsis)
    };

    if (!structure.hasSteup) {
      issues.push('Не ясна завязка и представление героя');
      score -= 20;
    }
    if (!structure.hasConflict) {
      issues.push('Не ясен основной конфликт');
      score -= 25;
    }
    if (!structure.hasClimax) {
      issues.push('Отсутствует кульминация');
      score -= 20;
    }
    if (!structure.hasResolution) {
      issues.push('Нет разрешения конфликта');
      score -= 15;
    }

    // Проверка персонажей
    if (!this.hasProtagonist(synopsis)) {
      issues.push('Не ясен главный герой');
      score -= 20;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score),
      structure
    };
  }

  /**
   * Проверка наличия завязки
   */
  private hasSetup(synopsis: string): boolean {
    const setupWords = [
      'живет', 'работает', 'является', 'находится', 'мечтает',
      'обычный', 'простой', 'нормальный', 'повседневный'
    ];
    
    const firstParagraph = synopsis.split(/\n\s*\n/)[0] || '';
    return setupWords.some(word => firstParagraph.toLowerCase().includes(word));
  }

  /**
   * Проверка наличия конфликта
   */
  private hasConflict(synopsis: string): boolean {
    const conflictWords = [
      'но', 'однако', 'внезапно', 'неожиданно', 'когда',
      'противостоит', 'борется', 'сражается', 'препятствие',
      'проблема', 'угроза', 'опасность', 'вызов'
    ];
    
    const synopsisLower = synopsis.toLowerCase();
    return conflictWords.some(word => synopsisLower.includes(word));
  }

  /**
   * Проверка наличия кульминации
   */
  private hasClimax(synopsis: string): boolean {
    const climaxWords = [
      'финальный', 'решающий', 'последний', 'кульминация',
      'столкновение', 'битва', 'выбор', 'должен', 'вынужден',
      'критический', 'главный', 'окончательный'
    ];
    
    const synopsisLower = synopsis.toLowerCase();
    return climaxWords.some(word => synopsisLower.includes(word));
  }

  /**
   * Проверка наличия разрешения
   */
  private hasResolution(synopsis: string): boolean {
    const resolutionWords = [
      'в итоге', 'в результате', 'наконец', 'в конце',
      'побеждает', 'решает', 'находит', 'спасает',
      'понимает', 'осознает', 'меняется', 'становится'
    ];
    
    const lastParagraph = synopsis.split(/\n\s*\n/).slice(-1)[0] || '';
    return resolutionWords.some(word => lastParagraph.toLowerCase().includes(word));
  }

  /**
   * Проверка наличия протагониста
   */
  private hasProtagonist(synopsis: string): boolean {
    const protagonistWords = [
      'герой', 'героиня', 'главный', 'персонаж',
      'он', 'она', 'его', 'ее', 'ему', 'ей'
    ];
    
    const synopsisLower = synopsis.toLowerCase();
    return protagonistWords.some(word => synopsisLower.includes(word));
  }

  /**
   * Анализ тематической структуры синопсиса
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  analyzeThematicStructure(_synopsis: string): {
    themes: string[];
    tone: string;
    genre: string;
  } {
    // Это заглушка для будущей функциональности
    // В реальной реализации здесь был бы анализ тем и тона
    return {
      themes: [],
      tone: 'neutral',
      genre: 'unknown'
    };
  }
}