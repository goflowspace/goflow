import { 
  BaseBibleGenerationOperation
} from './base-bible-generation.operation';
import { 
  projectGenres, 
  GENRE_DISPLAY_NAMES 
} from '../../../../projectInfo/projectInfo.validation';

/**
 * Операция генерации жанров проекта
 * Специализируется на определении основных и дополнительных жанров
 */
export class GenreGenerationOperation extends BaseBibleGenerationOperation {
  
  protected fieldType = 'genres';
  protected defaultCreativityLevel = 0.6;
  protected defaultTemperature = 0.7;
  protected maxTokens = 10000; // Увеличено в 2 раза для Gemini
  protected maxContentLength = 500;

  constructor() {
    super(
      'genre_generation',
      'Genre Generation',
      '1.0.0'
    );
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  protected getFieldSpecificSystemPrompt(): string {
    return `
Специализация: Определение жанров творческих проектов

Твоя экспертиза:
- Современная жанровая классификация в кино, сериалах, играх
- Понимание жанровых конвенций и ожиданий аудитории
- Анализ смешения жанров и гибридных форм
- Жанровые тренды и современные подходы

Принципы работы с жанрами:
- Определяй основной жанр (доминирующий)
- Указывай дополнительные жанры (поджанры, элементы)
- Учитывай современные жанровые гибриды
- Объясняй жанровый выбор через призму целевой аудитории`;
  }

  protected getFieldSpecificInstructions(): string {
    return `ИНСТРУКЦИИ ДЛЯ ЖАНРОВ:

1. АНАЛИЗ КОНТЕКСТА:
   - Определи основную эмоциональную направленность проекта
   - Выяви ключевые сюжетные элементы и конфликты
   - Проанализируй тональность и атмосферу

2. ОПРЕДЕЛЕНИЕ ЖАНРОВ:
   - Укажи 1 основной жанр (главный)
   - Добавь 1-3 дополнительных жанра/поджанра
   - Объясни, как жанры проявляются в проекте
   - Укажи особенности жанровых конвенций

3. ФОРМАТ ОТВЕТА:
   Представь результат в виде списка:
   1. Основной жанр - объяснение
   2. Дополнительный жанр - объяснение
   3. Элементы жанра - объяснение

4. СОВРЕМЕННЫЕ ПОДХОДЫ:
   - Рассмотри жанровые гибриды (например, sci-fi thriller)
   - Учитывай новые жанровые течения
   - Принимай во внимание платформенную специфику

Доступные жанры проекта:
${projectGenres.map(genre => `- ${genre}: ${GENRE_DISPLAY_NAMES[genre]}`).join('\n')}

ВАЖНО: 
- Используй ТОЛЬКО эти жанры из списка выше. Не придумывай новые жанры!
- Максимальная длина описания жанров - ${this.maxContentLength} символов.`;
  }

  protected processFieldContent(content: string | string[], _input: any): string[] {
    const stringContent = Array.isArray(content) ? content.join(', ') : content;
    console.log(`🔄 Processing genres content`);
    
    // Извлекаем список жанров из текста
    const genres = this.extractListFromText(stringContent, 5);
    
    if (genres.length === 0) {
      console.log(`⚠️ Could not parse genres from content, using defaults`);
      return ['fantasy', 'adventure']; // Используем ключи из projectGenres
    }

    // Очищаем жанры и мапим на реальные ключи из projectGenres
    const cleanedGenres = genres.map(genre => {
      // Убираем объяснения после тире и двоеточий  
      let cleaned = genre.split(/[\-\:]/)[0].trim();
      // Убираем слова типа "жанр", "элементы" и т.д.
      cleaned = cleaned.replace(/^(жанр|элементы|основной|дополнительный)\s*/i, '');
      
      // Мапим на реальные ключи жанров
      return this.mapToProjectGenre(cleaned);
    }).filter(genre => genre !== null) as string[];

    console.log(`✅ Processed genres:`, cleanedGenres);
    return cleanedGenres.length > 0 ? cleanedGenres : ['fantasy'];
  }

  protected getErrorContent(): string[] {
    return ['fantasy']; // Возвращаем валидный ключ жанра
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Мапит текст на ключ жанра из projectGenres
   */
  private mapToProjectGenre(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // Прямое совпадение с ключами
    const directMatch = projectGenres.find(genre => genre === lowerText);
    if (directMatch) {
      return directMatch;
    }
    
    // Поиск по названиям
    const byDisplayName = projectGenres.find(genre => 
      GENRE_DISPLAY_NAMES[genre].toLowerCase().includes(lowerText) ||
      lowerText.includes(genre)
    );
    if (byDisplayName) {
      return byDisplayName;
    }
    
    // Дополнительные мапинги для часто используемых терминов
    const mappings: Record<string, typeof projectGenres[number]> = {
      'рпг': 'rpg',
      'приключение': 'adventure', 
      'приключенческий': 'adventure',
      'приключения': 'adventure',
      'визуальная новелла': 'visual_novel',
      'новелла': 'visual_novel',
      'интерактивная литература': 'interactive_fiction',
      'симулятор': 'dating_sim',
      'свидания': 'dating_sim',
      'детектив': 'detective',
      'детективный': 'detective',
      'хоррор': 'horror',
      'ужас': 'horror',
      'ужасы': 'horror',
      'фэнтези': 'fantasy',
      'фантастика': 'sci_fi',
      'научная фантастика': 'sci_fi',
      'фантастический': 'sci_fi',
      'исторический': 'historical',
      'история': 'historical',
      'комедия': 'comedy',
      'юмор': 'comedy',
      'драма': 'drama',
      'драматический': 'drama',
      'триллер': 'thriller',
      'романтика': 'romance',
      'любовь': 'romance',
      'обучение': 'educational',
      'образование': 'educational',
      'обучающий': 'educational'
    };
    
    const mapped = mappings[lowerText];
    if (mapped) {
      return mapped;
    }
    
    console.log(`⚠️ Could not map genre "${text}" to project genres`);
    return null;
  }



  /**
   * Получение рекомендаций по жанру на основе контекста
   */
  getGenreRecommendations(projectContext: string): string[] {
    const context = projectContext.toLowerCase();
    
    if (context.includes('будущее') || context.includes('технолог')) {
      return ['sci_fi', 'thriller'];
    }
    if (context.includes('любовь') || context.includes('отношения')) {
      return ['romance', 'drama'];
    }
    if (context.includes('смех') || context.includes('юмор')) {
      return ['comedy', 'adventure'];
    }
    if (context.includes('страх') || context.includes('ужас')) {
      return ['horror', 'thriller'];
    }
    if (context.includes('преступ') || context.includes('детектив')) {
      return ['detective', 'thriller'];
    }
    if (context.includes('магия') || context.includes('фэнтези')) {
      return ['fantasy', 'adventure'];
    }
    if (context.includes('игра') || context.includes('рпг')) {
      return ['rpg', 'adventure'];
    }
    if (context.includes('история') || context.includes('прошлое')) {
      return ['historical', 'drama'];
    }
    if (context.includes('обучение') || context.includes('урок')) {
      return ['educational', 'interactive_fiction'];
    }
    
    return ['fantasy', 'adventure']; // По умолчанию
  }
}