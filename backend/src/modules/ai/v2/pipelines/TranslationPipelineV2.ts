// backend/src/modules/ai/v2/pipelines/TranslationPipelineV2.ts
import { AIPipeline } from '../core/AIPipeline';
import { PipelineStep } from '../shared/pipeline-types';
import { QualityLevel } from '../shared/types';

// Импорт операции
import { NodeTranslationOperationV2, NodeTranslationInputV2, NodeTranslationOutputV2 } from '../operations/translation/NodeTranslationOperationV2';

/**
 * Входные данные для пайплайна перевода v2
 */
export interface TranslationPipelineInputV2 {
  projectId: string;
  userDescription?: string;
  
  // Основной контент для перевода
  originalText: string;
  
  // Языковые настройки
  sourceLanguage: string; // en, ru, fr, es, pt
  targetLanguage: string;
  
  // Контекст для улучшения перевода
  precedingContext?: string; // Текст предыдущего узла для контекста
  followingContext?: string; // Текст следующего узла для контекста
  
  // Информация о проекте для контекста
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
  
  // Настройки качества
  qualityLevel?: QualityLevel;
}

/**
 * Выходные данные пайплайна перевода v2
 */
export interface TranslationPipelineOutputV2 {
  // Результат операции перевода
  translation: NodeTranslationOutputV2;
  
  // Метаинформация о пайплайне
  pipelineMetadata: {
    pipelineId: string;
    version: string;
    qualityLevel: QualityLevel;
    executionTime: number;
    totalCost: number;
    totalCredits: number;
  };
}

/**
 * Пайплайн перевода v2
 * Простой пайплайн состоящий из одной операции перевода с контекстом
 * Может использоваться как для одиночных переводов, так и для батч-переводов
 */
export class TranslationPipelineV2 extends AIPipeline {
  
  constructor() {
    // Создаем экземпляр операции перевода
    const translationOperation = new NodeTranslationOperationV2();
    
    // Определяем шаги пайплайна (только один шаг)
    const steps: PipelineStep[] = [
      {
        id: 'translate_node',
        operation: translationOperation,
        dependencies: [], // Нет зависимостей, единственная операция
        qualityLevel: QualityLevel.STANDARD, // Стандартное качество по умолчанию
        mapInput: (_results, pipelineInput: TranslationPipelineInputV2): NodeTranslationInputV2 => ({
          projectId: pipelineInput.projectId,
          userDescription: pipelineInput.userDescription || `Перевод текста с ${pipelineInput.sourceLanguage} на ${pipelineInput.targetLanguage}`,
          originalText: pipelineInput.originalText,
          sourceLanguage: pipelineInput.sourceLanguage,
          targetLanguage: pipelineInput.targetLanguage,
          precedingContext: pipelineInput.precedingContext,
          followingContext: pipelineInput.followingContext,
          projectBible: pipelineInput.projectBible,
          preserveMarkup: pipelineInput.preserveMarkup ?? true, // По умолчанию сохраняем разметку
          translationStyle: pipelineInput.translationStyle ?? 'adaptive', // По умолчанию адаптивный стиль
          additionalRequirements: pipelineInput.additionalRequirements
        })
      }
    ];

    // Инициализируем пайплайн
    super(
      'translation-pipeline-v2',
      'Translation Pipeline V2',
      'Пайплайн перевода нарративного текста с учетом контекста проекта и соседних узлов',
      '2.0.0',
      steps
    );
  }

  /**
   * Подготовка входных данных для пайплайна
   * Валидирует и нормализует входные данные перед выполнением
   */
  static prepareInput(input: TranslationPipelineInputV2): TranslationPipelineInputV2 {
    // Валидация обязательных полей
    if (!input.projectId?.trim()) {
      throw new Error('projectId обязателен для пайплайна перевода');
    }

    if (!input.originalText?.trim()) {
      throw new Error('originalText обязателен и не может быть пустым');
    }

    if (!input.sourceLanguage?.trim()) {
      throw new Error('sourceLanguage обязателен');
    }

    if (!input.targetLanguage?.trim()) {
      throw new Error('targetLanguage обязателен');
    }

    if (input.sourceLanguage === input.targetLanguage) {
      throw new Error('sourceLanguage и targetLanguage должны различаться');
    }

    // Проверка поддерживаемых языков
    const supportedLanguages = ['en', 'ru', 'fr', 'es', 'pt', 'de', 'ja', 'ko', 'zh-CN'];
    if (!supportedLanguages.includes(input.sourceLanguage)) {
      throw new Error(`Исходный язык "${input.sourceLanguage}" не поддерживается. Поддерживаемые языки: ${supportedLanguages.join(', ')}`);
    }

    if (!supportedLanguages.includes(input.targetLanguage)) {
      throw new Error(`Целевой язык "${input.targetLanguage}" не поддерживается. Поддерживаемые языки: ${supportedLanguages.join(', ')}`);
    }

    return input;
  }

  /**
   * Обработка результатов пайплайна
   * Преобразует внутренний результат в внешний формат
   */
  static processOutput(
    results: Map<string, any>, 
    qualityLevel: QualityLevel, 
    executionTime: number
  ): TranslationPipelineOutputV2 {
    const translationResult = results.get('translate_node');
    
    if (!translationResult) {
      throw new Error('Результат операции перевода не найден');
    }

    // Подсчитываем общую стоимость и кредиты
    const totalCost = translationResult.realCostUSD || 0;
    const totalCredits = translationResult.creditsCharged || 0;

    return {
      translation: translationResult,
      pipelineMetadata: {
        pipelineId: 'translation-pipeline-v2',
        version: '2.0.0',
        qualityLevel,
        executionTime,
        totalCost,
        totalCredits
      }
    };
  }

  /**
   * Создает конфигурацию для батч-перевода
   * Позволяет переводить несколько текстов с общими настройками
   */
  static createBatchConfig(
    texts: string[],
    baseConfig: Omit<TranslationPipelineInputV2, 'originalText'>
  ): TranslationPipelineInputV2[] {
    return texts.map(text => ({
      ...baseConfig,
      originalText: text,
      userDescription: `${baseConfig.userDescription || 'Батч-перевод'} (элемент ${texts.indexOf(text) + 1} из ${texts.length})`
    }));
  }
}
