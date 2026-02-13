// backend/src/modules/ai/v2/operations/translation/NodeTranslationOperationV2.ts
import { AbstractAIOperation } from '../../core/AbstractAIOperation';
import { 
  AIOperationInput, 
  AIOperationOutput, 
  ExecutionContext, 
  OperationAIConfig, 
  QualityLevel, 
  AIProvider, 
  GeminiModel
} from '../../shared/types';

/**
 * Входные данные для операции перевода узла v2
 */
export interface NodeTranslationInputV2 extends AIOperationInput {
  projectId: string;
  userDescription?: string;
  
  // Основной контент для перевода
  originalText: string;
  
  // Языковые настройки
  sourceLanguage: string; // en, ru, fr, es, pt, de, ja, ko, zh-CN
  targetLanguage: string;
  
  // Контекст для улучшения перевода
  precedingContext?: string; // Текст предыдущего узла для контекста
  followingContext?: string; // Текст следующего узла для контекста
  
  // Информация о проекте
  projectBible?: {
    synopsis?: string;
    genre?: string;
    setting?: string;
    targetAudience?: string;
    tone?: string;
  };
  
  // Настройки перевода
  preserveMarkup?: boolean; // Сохранять HTML/Markdown разметку
  translationStyle?: 'literal' | 'adaptive' | 'creative'; // Стиль перевода
  
  // Дополнительные требования
  additionalRequirements?: string;
}

/**
 * Выходные данные операции перевода узла v2
 */
export interface NodeTranslationOutputV2 extends AIOperationOutput {
  translatedText: string;
  confidence: number; // 0-1, уверенность в качестве перевода
  detectedStyle: {
    tone: string;
    register: string; // формальный/неформальный
    literaryDevice?: string; // использованные литературные приёмы
  };
  translationNotes?: string[]; // Заметки переводчика о сложностях
  warnings?: string[]; // Предупреждения о потенциальных проблемах
  metadata: {
    originalWordCount: number;
    translatedWordCount: number;
    preservedMarkup: boolean;
  };
}

/**
 * Операция перевода узла v2
 * Переводит текст нарративного узла с учетом контекста и стиля проекта
 */
export class NodeTranslationOperationV2 extends AbstractAIOperation<
  NodeTranslationInputV2,
  NodeTranslationOutputV2
> {
  readonly id = 'node-translation-v2';
  readonly name = 'Node Translation V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.3, // Низкая температура для точности перевода
        maxTokens: 2000,
        retries: 1,
        timeout: 30000
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.3,
        maxTokens: 3000,
        retries: 2,
        timeout: 45000
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.PRO,
        temperature: 0.2, // Очень низкая температура для максимальной точности
        maxTokens: 4000,
        retries: 3,
        timeout: 60000
      }
    }
  };

  protected validateAdditional(input: NodeTranslationInputV2): string[] {
    const errors: string[] = [];

    if (!input.projectId?.trim()) {
      errors.push('projectId обязателен');
    }

    if (!input.originalText?.trim()) {
      errors.push('originalText обязателен и не может быть пустым');
    }

    if (!input.sourceLanguage?.trim()) {
      errors.push('sourceLanguage обязателен');
    }

    if (!input.targetLanguage?.trim()) {
      errors.push('targetLanguage обязателен');
    }

    if (input.sourceLanguage === input.targetLanguage) {
      errors.push('sourceLanguage и targetLanguage должны различаться');
    }

    // Проверка поддерживаемых языков
    const supportedLanguages = ['en', 'ru', 'fr', 'es', 'pt', 'de', 'ja', 'ko', 'zh-CN'];
    if (input.sourceLanguage && !supportedLanguages.includes(input.sourceLanguage)) {
      errors.push(`sourceLanguage должен быть одним из: ${supportedLanguages.join(', ')}`);
    }

    if (input.targetLanguage && !supportedLanguages.includes(input.targetLanguage)) {
      errors.push(`targetLanguage должен быть одним из: ${supportedLanguages.join(', ')}`);
    }

    return errors;
  }

  protected getSystemPrompt(_context: ExecutionContext): string {
    return `Вы профессиональный переводчик художественной литературы с глубоким пониманием нарративных техник и культурных особенностей.

ВАША РОЛЬ:
- Переводить нарративный текст, сохраняя литературный стиль и эмоциональное воздействие
- Учитывать контекст истории и жанровые особенности
- Адаптировать культурные референсы для целевой аудитории
- Сохранять оригинальные стилистические приёмы (метафоры, аллитерации, ритм)

ПРИНЦИПЫ ПЕРЕВОДА:
1. ТОЧНОСТЬ: Передавать смысл без искажений
2. СТИЛЬ: Сохранять авторский голос и тон
3. ЧИТАЕМОСТЬ: Текст должен звучать естественно на целевом языке
4. КОНТЕКСТ: Учитывать предыдущий и последующий текст
5. ЖАНР: Соблюдать конвенции жанра на целевом языке

ФОРМАТИРОВАНИЕ:
- Если текст содержит HTML/Markdown разметку, сохраняйте её точно
- Переводите только содержимое тегов, не сами теги
- Сохраняйте структуру абзацев и переносы строк

КУЛЬТУРНАЯ АДАПТАЦИЯ:
- Адаптируйте идиомы и поговорки
- Локализуйте референсы при необходимости
- Сохраняйте имена собственные, если не указано иное
- Учитывайте формальность/неформальность обращений`;
  }

  protected getUserPrompt(input: NodeTranslationInputV2, _context: ExecutionContext): string {
    const languageNames: Record<string, string> = {
      'en': 'английского',
      'ru': 'русского', 
      'fr': 'французского',
      'es': 'испанского',
      'pt': 'португальского',
      'de': 'немецкого',
      'ja': 'японского',
      'ko': 'корейского',
      'zh-CN': 'китайского (упрощённого)'
    };

    const sourceLanguageName = languageNames[input.sourceLanguage] || input.sourceLanguage;
    const targetLanguageName = languageNames[input.targetLanguage] || input.targetLanguage;

    let prompt = `ЗАДАЧА: Переведите следующий нарративный текст с ${sourceLanguageName} языка на ${targetLanguageName} язык.

ОРИГИНАЛЬНЫЙ ТЕКСТ:
"""
${input.originalText}
"""

ЯЗЫК ПЕРЕВОДА: ${input.targetLanguage.toUpperCase()}`;

    // Добавляем контекст, если есть
    if (input.precedingContext || input.followingContext) {
      prompt += `\n\nКОНТЕКСТ ИСТОРИИ:`;
      
      if (input.precedingContext) {
        prompt += `\nПредыдущий текст: "${input.precedingContext}"`;
      }
      
      if (input.followingContext) {
        prompt += `\nСледующий текст: "${input.followingContext}"`;
      }
    }

    // Добавляем информацию о проекте
    if (input.projectBible) {
      prompt += `\n\nИНФОРМАЦИЯ О ПРОЕКТЕ:`;
      
      if (input.projectBible.genre) {
        prompt += `\nЖанр: ${input.projectBible.genre}`;
      }
      
      if (input.projectBible.setting) {
        prompt += `\nСеттинг: ${input.projectBible.setting}`;
      }
      
      if (input.projectBible.targetAudience) {
        prompt += `\nЦелевая аудитория: ${input.projectBible.targetAudience}`;
      }
      
      if (input.projectBible.tone) {
        prompt += `\nТон: ${input.projectBible.tone}`;
      }
    }

    // Добавляем настройки перевода
    if (input.translationStyle) {
      const styleDescriptions = {
        'literal': 'максимально близко к оригиналу',
        'adaptive': 'с адаптацией под целевой язык',
        'creative': 'с творческой интерпретацией для лучшего воздействия'
      };
      prompt += `\n\nСТИЛЬ ПЕРЕВОДА: ${styleDescriptions[input.translationStyle]}`;
    }

    if (input.preserveMarkup) {
      prompt += `\n\nВАЖНО: Сохраните всю HTML/Markdown разметку точно как в оригинале!`;
    }

    if (input.additionalRequirements) {
      prompt += `\n\nДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ: ${input.additionalRequirements}`;
    }

    prompt += `\n\nВЕРНИТЕ РЕЗУЛЬТАТ В JSON ФОРМАТЕ:
{
  "translatedText": "переведенный текст",
  "confidence": числовое значение от 0 до 1,
  "detectedStyle": {
    "tone": "определенный тон текста",
    "register": "формальный или неформальный",
    "literaryDevice": "использованные литературные приёмы (необязательно)"
  },
  "translationNotes": ["заметки о сложностях перевода"],
  "warnings": ["предупреждения о потенциальных проблемах"],
  "metadata": {
    "originalWordCount": количество слов в оригинале,
    "translatedWordCount": количество слов в переводе,
    "preservedMarkup": true/false
  }
}`;

    return prompt;
  }

  protected getRequiredJSONFields(): string[] {
    return [
      'translatedText',
      'confidence',
      'detectedStyle',
      'metadata'
    ];
  }

  parseResult(aiResult: string, input: NodeTranslationInputV2, realCostUSD: number, creditsCharged: number): NodeTranslationOutputV2 {
    try {
      const parsed = this.parseJSONSafely(aiResult, this.name);
      
      // Валидация обязательных полей
      if (!parsed.translatedText || typeof parsed.translatedText !== 'string') {
        throw new Error('translatedText обязателен и должен быть строкой');
      }

      if (parsed.translatedText.trim() === '') {
        throw new Error('translatedText не может быть пустым');
      }

      // Подсчитываем слова
      const originalWordCount = input.originalText.trim().split(/\s+/).length;
      const translatedWordCount = parsed.translatedText.trim().split(/\s+/).length;

      return {
        translatedText: parsed.translatedText,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
        detectedStyle: {
          tone: parsed.detectedStyle?.tone || 'неопределен',
          register: parsed.detectedStyle?.register || 'неопределен',
          literaryDevice: parsed.detectedStyle?.literaryDevice || undefined
        },
        translationNotes: Array.isArray(parsed.translationNotes) ? parsed.translationNotes : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        metadata: {
          originalWordCount,
          translatedWordCount,
          preservedMarkup: parsed.metadata?.preservedMarkup || false,
          ...parsed.metadata
        },
        realCostUSD,
        creditsCharged
      };
    } catch (error) {
      throw new Error(`Ошибка парсинга результата перевода: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }
}
