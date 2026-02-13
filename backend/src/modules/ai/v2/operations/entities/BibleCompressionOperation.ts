// backend/src/modules/ai/v2/operations/entities/BibleCompressionOperation.ts
import { AbstractAIOperation } from '../../core/AbstractAIOperation';
import {
  AIOperationInput,
  AIOperationOutput,
  QualityLevel,
  AIProvider,
  GeminiModel,
  OperationAIConfig,
} from '../../shared/types';

export interface BibleCompressionInput extends AIOperationInput {
  /** Полная библия проекта */
  bible: any;
  /** Контекст проекта */
  context?: string;
  /** Уровень сжатия: light, medium, heavy */
  compressionLevel: 'light' | 'medium' | 'heavy';
}

export interface BibleCompressionOutput extends AIOperationOutput {
  /** Сжатая версия библии */
  compressedContent: string;
  /** Коэффициент сжатия */
  compressionRatio: number;
  /** Ключевые элементы, которые были сохранены */
  preservedElements: string[];
}

/**
 * Операция для сжатия библии проекта
 * Создает краткую, но информативную версию библии для оптимизации AI операций
 */
export class BibleCompressionOperation extends AbstractAIOperation<
  BibleCompressionInput,
  BibleCompressionOutput
> {
  readonly id = 'bible-compression';
  readonly name = 'Bible Compression';
  readonly version = '1.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.3,
        maxTokens: 2000,
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.4,
        maxTokens: 3000,
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.PRO,
        temperature: 0.3,
        maxTokens: 4000,
      }
    }
  };

  protected getSystemPrompt(): string {
    return `Ты - эксперт по сжатию текстовой информации для проектов.

ЗАДАЧА: Сжать библию проекта, сохранив самую важную информацию для генерации сущностей.

ПРИНЦИПЫ СЖАТИЯ:
1. Сохрани ключевые элементы сюжета, персонажей, мира
2. Убери лишние детали и повторения
3. Сохрани стилистические особенности и тон
4. Сфокусируйся на элементах, важных для создания новых сущностей
5. Структурируй информацию логично

ФОРМАТ ОТВЕТА (JSON):
{
  "compressedContent": "Сжатая версия библии",
  "compressionRatio": 0.3,
  "preservedElements": ["элемент1", "элемент2"]
}`;
  }

  protected getUserPrompt(input: BibleCompressionInput): string {
    const { bible, existingEntityTypes, compressionLevel } = input;

    let compressionInstructions = '';
    switch (compressionLevel) {
      case 'light':
        compressionInstructions = 'Легкое сжатие: удали только явные повторения и незначительные детали. Целевое сжатие: 70-80% от оригинала.';
        break;
      case 'medium':
        compressionInstructions = 'Среднее сжатие: оставь ключевые элементы, убери второстепенные детали. Целевое сжатие: 40-60% от оригинала.';
        break;
      case 'heavy':
        compressionInstructions = 'Сильное сжатие: оставь только самые важные элементы. Целевое сжатие: 20-30% от оригинала.';
        break;
    }

    const bibleText = this.formatBibleForCompression(bible);

    return `${compressionInstructions}

БИБЛИЯ ПРОЕКТА ДЛЯ СЖАТИЯ:
${bibleText} 
Существующие типы сущностей: ${existingEntityTypes}

Создай сжатую версию, сохранив информацию, важную для создания новых сущностей (персонажей, локаций, предметов и т.д.).`;
  }

  /**
   * Форматирует библию для сжатия
   */
  private formatBibleForCompression(bible: any): string {
    if (!bible) return 'Библия проекта отсутствует';

    const sections = [];

    // Базовая информация
    if (bible.synopsis) {
      sections.push(`СИНОПСИС:\n${bible.synopsis}`);
    }

    if (bible.logline) {
      sections.push(`ЛОГЛАЙН:\n${bible.logline}`);
    }

    // Жанры и сеттинг
    if (bible.genres) {
      sections.push(`ЖАНРЫ: ${Array.isArray(bible.genres) ? bible.genres.join(', ') : bible.genres}`);
    }

    if (bible.setting) {
      sections.push(`СЕТТИНГ:\n${bible.setting}`);
    }

    // Темы и атмосфера
    if (bible.themes) {
      sections.push(`ТЕМЫ: ${Array.isArray(bible.themes) ? bible.themes.join(', ') : bible.themes}`);
    }

    if (bible.atmosphere) {
      sections.push(`АТМОСФЕРА:\n${bible.atmosphere}`);
    }

    // Уникальные особенности
    if (bible.uniqueFeatures) {
      sections.push(`УНИКАЛЬНЫЕ ОСОБЕННОСТИ:\n${bible.uniqueFeatures}`);
    }

    return sections.join('\n\n');
  }

  parseResult(aiResult: string, input: BibleCompressionInput, realCostUSD: number, creditsCharged: number): BibleCompressionOutput {
    try {
      const parsed = JSON.parse(aiResult);
      
      // Рассчитываем реальный коэффициент сжатия
      const originalLength = this.formatBibleForCompression(input.bible).length;
      const compressedLength = parsed.compressedContent?.length || 0;
      const actualCompressionRatio = originalLength > 0 ? compressedLength / originalLength : 0;

      return {
        compressedContent: parsed.compressedContent || '',
        compressionRatio: actualCompressionRatio,
        preservedElements: parsed.preservedElements || [],
        metadata: {
          realCostUSD,
          creditsCharged,
          originalLength,
          compressedLength,
          targetCompressionLevel: input.compressionLevel
        }
      };
    } catch (error) {
      // Fallback: создаем базовое сжатие
      const bibleText = this.formatBibleForCompression(input.bible);
      const lines = bibleText.split('\n');
      const compressedLines = lines.filter(line => line.trim().length > 10); // Убираем короткие строки
      const compressedContent = compressedLines.slice(0, Math.ceil(lines.length * 0.6)).join('\n');

      return {
        compressedContent,
        compressionRatio: compressedContent.length / bibleText.length,
        preservedElements: ['synopsis', 'characters', 'setting'],
        metadata: {
          realCostUSD,
          creditsCharged,
          error: 'Failed to parse AI response, used fallback compression'
        },
        // Flag for DB tracking - this will mark the operation as FAILED in database
        error: true,
        message: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
