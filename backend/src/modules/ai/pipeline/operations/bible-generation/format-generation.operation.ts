import { 
  BaseBibleGenerationOperation
} from './base-bible-generation.operation';
import { 
  projectFormats, 
  FORMAT_DISPLAY_NAMES 
} from '../../../../projectInfo/projectInfo.validation';

/**
 * Операция генерации форматов проекта
 * Специализируется на определении формата медиапроекта (фильм, сериал, игра и т.д.)
 */
export class FormatGenerationOperation extends BaseBibleGenerationOperation {
  
  protected fieldType = 'formats';
  protected defaultCreativityLevel = 0.6;
  protected defaultTemperature = 0.6;
  protected maxTokens = 10000;
  protected maxContentLength = 2000;

  constructor() {
    super(
      'format_generation',
      'Format Generation',
      '1.0.0'
    );
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Определение форматов медиапроектов

Твоя экспертиза:
- Современные медиаформаты и платформы
- Особенности производства разных форматов
- Рыночные тренды и потребительские предпочтения
- Технические и бюджетные ограничения форматов

Принципы работы с форматами:
- Учитывай масштаб и сложность проекта
- Анализируй целевую аудиторию и платформы
- Рассматривай коммерческие аспекты
- Предлагай современные и актуальные форматы`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ИНСТРУКЦИИ ДЛЯ ФОРМАТОВ:

1. АНАЛИЗ ПРОЕКТА:
   - Оцени масштаб и сложность истории
   - Определи потенциальную длительность
   - Проанализируй бюджетные требования
   - Рассмотри целевую аудиторию

2. ВЫБОР ФОРМАТА:
   - Укажи основной формат (наиболее подходящий)
   - Предложи альтернативные форматы
   - Объясни преимущества каждого формата
   - Учитывай современные тренды

3. ФОРМАТ ОТВЕТА:
   Представь результат в виде списка:
   1. Основной формат - обоснование
   2. Альтернативный формат - объяснение
   3. Дополнительный формат - возможности

4. СОВРЕМЕННЫЕ ФОРМАТЫ:
   - Рассматривай интерактивные форматы
   - Принимай во внимание мультиплатформенность

Доступные форматы проекта:
${projectFormats.map(format => `- ${format}: ${FORMAT_DISPLAY_NAMES[format]}`).join('\n')}

ВАЖНО: 
- Используй ТОЛЬКО эти форматы из списка выше. Не придумывай новые форматы!
- Максимальная длина описания форматов - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string[] {
    const stringContent = Array.isArray(content) ? content.join(', ') : content;
    console.log(`🔄 Processing formats content`);
    
    // Извлекаем список форматов из текста
    const formats = this.extractListFromText(stringContent, 4);
    
    if (formats.length === 0) {
      console.log(`⚠️ Could not parse formats from content, using defaults`);
      return ['visual_novel', 'interactive_fiction']; // Используем ключи из projectFormats
    }

    // Очищаем форматы и мапим на реальные ключи из projectFormats
    const cleanedFormats = formats.map(format => {
      // Убираем объяснения после тире и двоеточий
      let cleaned = format.split(/[\-\:]/)[0].trim();
      // Убираем слова типа "формат", "основной" и т.д.
      cleaned = cleaned.replace(/^(формат|основной|альтернативный|дополнительный)\s*/i, '');
      
      // Мапим на реальные ключи форматов
      return this.mapToProjectFormat(cleaned);
    }).filter(format => format !== null) as string[];

    console.log(`✅ Processed formats:`, cleanedFormats);
    return cleanedFormats.length > 0 ? cleanedFormats : ['visual_novel'];
  }

  protected getErrorContent(): string[] {
    return ['visual_novel']; // Возвращаем валидный ключ формата
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Мапит текст на ключ формата из projectFormats
   */
  private mapToProjectFormat(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // Прямое совпадение с ключами
    const directMatch = projectFormats.find(format => format === lowerText);
    if (directMatch) {
      return directMatch;
    }
    
    // Поиск по названиям
    const byDisplayName = projectFormats.find(format => 
      FORMAT_DISPLAY_NAMES[format].toLowerCase().includes(lowerText) ||
      lowerText.includes(format.replace('_', ' '))
    );
    if (byDisplayName) {
      return byDisplayName;
    }
    
    // Дополнительные мапинги для часто используемых терминов
    const mappings: Record<string, typeof projectFormats[number]> = {
      'визуальная новелла': 'visual_novel',
      'новелла': 'visual_novel',
      'интерактивная литература': 'interactive_fiction',
      'литература': 'interactive_fiction',
      'система диалогов': 'dialogue_system',
      'диалоги': 'dialogue_system',
      'квест': 'quest',
      'ветвящаяся история': 'branching_story',
      'история': 'branching_story',
      'приключение': 'adventure',
      'текстовое приключение': 'text_adventure',
      'чат история': 'chat_fiction',
      'чат': 'chat_fiction',
      'рпг диалоги': 'rpg_dialogue',
      'рпг': 'rpg_dialogue',
      'сценарий катсцен': 'cutscene_script',
      'катсцены': 'cutscene_script',
      'туториал': 'game_tutorial',
      'обучение': 'game_tutorial',
      'предыстория': 'character_backstory',
      'биография': 'character_backstory',
      'мир': 'worldbuilding',
      'построение мира': 'worldbuilding',
      'урок': 'interactive_lesson',
      'обучающий': 'training_scenario',
      'тренировка': 'training_scenario',
      'кейс': 'case_study',
      'симуляция': 'simulation_script',
      'оценка': 'assessment_quest'
    };
    
    const mapped = mappings[lowerText];
    if (mapped) {
      return mapped;
    }
    
    console.log(`⚠️ Could not map format "${text}" to project formats`);
    return null;
  }



  /**
   * Получение рекомендаций по формату на основе контекста
   */
  getFormatRecommendations(projectContext: string, genres: string[] = []): string[] {
    const context = projectContext.toLowerCase();
    
    // Анализируем тип контента
    if (context.includes('игра') || context.includes('рпг') || genres.includes('rpg')) {
      return ['rpg_dialogue', 'quest'];
    }
    
    if (context.includes('история') || context.includes('рассказ') || genres.includes('adventure')) {
      return ['branching_story', 'text_adventure'];
    }
    
    if (context.includes('новелла') || context.includes('литература') || genres.includes('visual_novel')) {
      return ['visual_novel', 'interactive_fiction'];
    }
    
    if (context.includes('обучение') || context.includes('урок') || genres.includes('educational')) {
      return ['interactive_lesson', 'training_scenario'];
    }
    
    if (context.includes('диалог') || context.includes('разговор')) {
      return ['dialogue_system', 'chat_fiction'];
    }
    
    if (context.includes('персонаж') || context.includes('герой')) {
      return ['character_backstory', 'visual_novel'];
    }
    
    if (context.includes('мир') || context.includes('вселенная')) {
      return ['worldbuilding', 'branching_story'];
    }
    
    if (context.includes('интерактив') || context.includes('выбор')) {
      return ['interactive_fiction', 'quest'];
    }
    
    if (context.includes('чат') || context.includes('сообщения')) {
      return ['chat_fiction', 'dialogue_system'];
    }
    
    // По умолчанию
    return ['visual_novel', 'interactive_fiction'];
  }

  /**
   * Проверка совместимости формата с жанром
   */
  isFormatCompatible(format: string, genres: string[]): boolean {
    // Проверяем, что формат и жанры существуют в наших константах
    if (!projectFormats.includes(format as any)) {
      return false;
    }
    
    // Некоторые комбинации форматов и жанров несовместимы
    const incompatibleCombinations = [
      { format: 'chat_fiction', genres: ['historical'] }, // Чат-история плохо подходит для исторических сюжетов
      { format: 'rpg_dialogue', genres: ['dating_sim'] }, // RPG диалоги не подходят для симуляторов свиданий
      { format: 'assessment_quest', genres: ['horror'] }, // Оценочные квесты не подходят для хоррора
      { format: 'interactive_lesson', genres: ['thriller'] } // Интерактивные уроки не подходят для триллеров
    ];

    return !incompatibleCombinations.some(combo => 
      format === combo.format && genres.some(genre => combo.genres.includes(genre))
    );
  }
}