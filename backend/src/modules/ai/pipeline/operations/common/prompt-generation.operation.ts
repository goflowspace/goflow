import { BaseAIOperation } from '../../base/base-ai-operation';
import { ExecutionContext, ValidationResult, OperationRequirements, ComplexityLevel, AIOperationCategory } from '../../interfaces/operation.interface';
import { AIOperationConfig } from '../../interfaces/ai-operation.interface';
import { AIProvider } from '@prisma/client';

// ===== ТИПЫ =====

export interface PromptGenerationInput {
  contextData: any; // Любые данные контекста (сущность, проект, библия и т.д.)
  taskDescription: string; // Описание того, что нужно сделать
  targetDomain: PromptDomain; // Область применения
  outputFormat?: string; // Желаемый формат выходного промпта
  additionalRequirements?: string[]; // Дополнительные требования
  customInstructions?: string; // Кастомные инструкции
  targetAudience?: string; // Целевая аудитория результата
  qualityLevel?: 'basic' | 'professional' | 'expert'; // Уровень качества
}

export interface PromptGenerationOutput {
  optimizedPrompt: string; // Готовый оптимизированный промпт
  confidence: number; // Уверенность в качестве промпта (0.0-1.0)
  reasoning: string; // Обоснование выбранного подхода
  suggestedParameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }; // Рекомендуемые параметры для AI
  domainSpecificTips?: string[]; // Советы специфичные для домена
  estimatedTokens?: number; // Оценка количества токенов
}

export type PromptDomain = 
  | 'image_generation' // Генерация изображений
  | 'text_generation' // Генерация текста
  | 'content_analysis' // Анализ контента
  | 'creative_writing' // Творческое письмо
  | 'code_generation' // Генерация кода
  | 'translation' // Перевод
  | 'summarization' // Суммаризация
  | 'question_answering' // Ответы на вопросы
  | 'classification' // Классификация
  | 'entity_extraction' // Извлечение сущностей
  | 'custom'; // Кастомная задача

// ===== ОПЕРАЦИЯ =====

export class PromptGenerationOperation extends BaseAIOperation {
  
  // Оптимальные параметры для разных доменов
  private readonly domainParameters: Record<PromptDomain, Partial<PromptGenerationOutput['suggestedParameters']>> = {
    image_generation: { temperature: 0.8, maxTokens: 300 },
    text_generation: { temperature: 0.7, maxTokens: 1000 },
    content_analysis: { temperature: 0.3, maxTokens: 800 },
    creative_writing: { temperature: 0.9, maxTokens: 1500 },
    code_generation: { temperature: 0.2, maxTokens: 2000 },
    translation: { temperature: 0.3, maxTokens: 1000 },
    summarization: { temperature: 0.4, maxTokens: 500 },
    question_answering: { temperature: 0.3, maxTokens: 800 },
    classification: { temperature: 0.1, maxTokens: 200 },
    entity_extraction: { temperature: 0.2, maxTokens: 600 },
    custom: { temperature: 0.5, maxTokens: 1000 }
  };

  constructor() {
    super(
      'prompt_generation',
      'Prompt Generation Operation',
      '1.0.0',
      AIOperationCategory.CONTENT_GENERATION,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: ['ai_generation'],
        maxTokens: 10000,
        timeout: 30000
      } as OperationRequirements
    );
  }

  // ===== ВАЛИДАЦИЯ =====

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];
    
    if (!input.contextData) {
      errors.push('contextData is required');
    }
    
    if (!input.taskDescription || typeof input.taskDescription !== 'string' || input.taskDescription.trim().length === 0) {
      errors.push('taskDescription must be a non-empty string');
    }
    
    if (!input.targetDomain || !this.isValidDomain(input.targetDomain)) {
      errors.push(`targetDomain must be one of: ${Object.keys(this.domainParameters).join(', ')}`);
    }
    
    if (input.qualityLevel && !['basic', 'professional', 'expert'].includes(input.qualityLevel)) {
      errors.push('qualityLevel must be: basic, professional, or expert');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidDomain(domain: string): domain is PromptDomain {
    return Object.keys(this.domainParameters).includes(domain);
  }

  // ===== AI КОНФИГУРАЦИЯ =====

  getAIConfig(_context: ExecutionContext, userSettings?: any): AIOperationConfig {
    return {
      preferredProvider: userSettings?.preferredProvider || AIProvider.GEMINI,
      preferredModel: userSettings?.preferredModel || 'gemini-2.5-flash-lite',
      creativityLevel: 0.7, // Средний уровень креативности для генерации промптов
      maxTokens: 10000,
      temperature: 0.7
    };
  }

  // ===== ПРОМПТЫ =====

  getSystemPrompt(input: PromptGenerationInput, _context: ExecutionContext): string {
    const qualityLevel = input.qualityLevel || 'expert';
    
    return `Ты эксперт по созданию оптимальных промптов для AI систем. Твоя специализация - анализ контекста и создание максимально эффективных промптов для конкретных задач.

ТВОЯ РОЛЬ: Prompt Engineering Expert

ЗАДАЧА: Создать оптимизированный промпт для домена "${input.targetDomain}" с уровнем качества "${qualityLevel}".

ПРИНЦИПЫ ЭФФЕКТИВНЫХ ПРОМПТОВ:
- Четкость и конкретность инструкций
- Правильная структура и последовательность
- Контекстная релевантность
- Оптимальная длина и детализация
- Использование лучших практик для конкретного домена

ЗНАНИЯ О ДОМЕНАХ:
- IMAGE_GENERATION: Визуальные описания, стили, композиция, техники
- TEXT_GENERATION: Стиль письма, тон, структура, жанровые особенности
- CONTENT_ANALYSIS: Критерии анализа, метрики, методы оценки
- CREATIVE_WRITING: Нарративные техники, развитие персонажей, атмосфера
- CODE_GENERATION: Языки программирования, паттерны, best practices
- TRANSLATION: Языковые нюансы, культурный контекст, точность
- SUMMARIZATION: Ключевые точки, структура, сжатие информации
- QUESTION_ANSWERING: Формат ответов, источники, достоверность
- CLASSIFICATION: Категории, критерии, точность классификации
- ENTITY_EXTRACTION: Типы сущностей, форматы, структурированные данные

УРОВНИ КАЧЕСТВА:
- BASIC: Простые, понятные промпты для базовых задач
- PROFESSIONAL: Детализированные промпты с best practices
- EXPERT: Высокооптимизированные промпты с продвинутыми техниками

ТРЕБОВАНИЯ К ВЫХОДУ:
- Анализируй предоставленный контекст глубоко
- Создавай промпты, максимально подходящие для указанной задачи
- Учитывай специфику домена и целевую аудиторию
- Предлагай конкретные параметры AI для оптимальных результатов
- Объясняй свои решения и подходы

Отвечай ТОЛЬКО в формате JSON без дополнительных комментариев.`;
  }

  getUserPrompt(_input: PromptGenerationInput, _context: ExecutionContext): string {
    return `КОНТЕКСТ ДЛЯ АНАЛИЗА:
{{contextDataFormatted}}

ЗАДАЧА: {{taskDescription}}

ЦЕЛЕВОЙ ДОМЕН: {{targetDomain}}

УРОВЕНЬ КАЧЕСТВА: {{qualityLevel}}

ФОРМАТ ВЫВОДА: {{outputFormat}}

ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ:
{{additionalRequirements}}

КАСТОМНЫЕ ИНСТРУКЦИИ:
{{customInstructions}}

ЦЕЛЕВАЯ АУДИТОРИЯ: {{targetAudience}}

СОЗДАЙ оптимальный промпт для указанной задачи, проанализировав контекст и учтив все требования.

Верни результат в JSON формате:
{
  "optimizedPrompt": "Созданный оптимизированный промпт",
  "confidence": 0.85,
  "suggestedParameters": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "topP": 0.9,
    "frequencyPenalty": 0.0,
    "presencePenalty": 0.0
  },
  "domainSpecificTips": [
    "Совет 1 специфичный для домена",
    "Совет 2 о том, как улучшить результаты"
  ],
  "estimatedTokens": 500
}`;
  }

  protected getPromptVariables(input: PromptGenerationInput, _context: ExecutionContext): Record<string, any> {    
    // Форматируем контекстные данные для промпта
    const contextDataFormatted = this.formatContextData(input.contextData);
    
    return {
      contextDataFormatted,
      taskDescription: input.taskDescription,
      targetDomain: input.targetDomain,
      qualityLevel: input.qualityLevel || 'professional',
      outputFormat: input.outputFormat || 'Стандартный промпт',
      additionalRequirements: input.additionalRequirements?.join('\n- ') || 'Нет дополнительных требований',
      customInstructions: input.customInstructions || 'Нет кастомных инструкций',
      targetAudience: input.targetAudience || 'Общая аудитория'
    };
  }

  // ===== ОБРАБОТКА РЕЗУЛЬТАТА =====

  public processAIResult(aiResult: any, input: PromptGenerationInput, _context: ExecutionContext): PromptGenerationOutput {
    let parsedResult: any;

    try {
      // Извлекаем данные из структуры aiResult
      const rawData = aiResult.data || aiResult;
      
      // Парсим JSON ответ от AI
      if (typeof rawData === 'string') {
        parsedResult = JSON.parse(rawData);
      } else {
        parsedResult = rawData;
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse AI result as JSON, using fallback');
      const fallbackData = aiResult.data || aiResult;
      parsedResult = {
        optimizedPrompt: fallbackData.toString(),
        confidence: 0.5,
        reasoning: 'AI вернул неструктурированный ответ'
      };
    }

    // Применяем домен-специфичные параметры
    const domainParams = this.domainParameters[input.targetDomain] || {};
    
    // Создаем итоговый результат
    const result: PromptGenerationOutput = {
      optimizedPrompt: parsedResult.optimizedPrompt || 'Промпт не был сгенерирован',
      confidence: Math.min(Math.max(parsedResult.confidence || 0.5, 0.0), 1.0),
      reasoning: parsedResult.reasoning || 'Обоснование недоступно',
      suggestedParameters: {
        ...domainParams,
        ...parsedResult.suggestedParameters
      },
      domainSpecificTips: parsedResult.domainSpecificTips || [],
      estimatedTokens: parsedResult.estimatedTokens || this.estimateTokens(parsedResult.optimizedPrompt || '')
    };

    // Добавляем домен-специфичные советы если их нет
    if (result.domainSpecificTips!.length === 0) {
      result.domainSpecificTips = this.getDefaultTipsForDomain(input.targetDomain);
    }

    return result;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  private formatContextData(contextData: any): string {
    if (!contextData) {
      return 'Контекст не предоставлен';
    }

    try {
      if (typeof contextData === 'string') {
        return contextData;
      }
      
      if (typeof contextData === 'object') {
        // Форматируем объект в читаемый вид
        const formatted = Object.entries(contextData)
          .map(([key, value]) => `${key}: ${this.formatValue(value)}`)
          .join('\n');
        return formatted;
      }
      
      return String(contextData);
    } catch (error) {
      return 'Ошибка форматирования контекста';
    }
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'не указано';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  }

  private estimateTokens(text: string): number {
    // Простая оценка токенов (примерно 4 символа на токен для английского)
    return Math.ceil(text.length / 4);
  }

  private getDefaultTipsForDomain(domain: PromptDomain): string[] {
    const tips: Record<PromptDomain, string[]> = {
      image_generation: [
        'Используй конкретные визуальные дескрипторы',
        'Указывай стиль арта и технику',
        'Добавляй детали композиции и освещения'
      ],
      text_generation: [
        'Четко определяй тон и стиль письма',
        'Указывай целевую аудиторию',
        'Структурируй требования к формату'
      ],
      content_analysis: [
        'Определяй конкретные критерии анализа',
        'Указывай желаемый формат результата',
        'Просить примеры в ответе'
      ],
      creative_writing: [
        'Задавай атмосферу и настроение',
        'Указывай жанр и стиль повествования',
        'Определяй точку зрения и голос'
      ],
      code_generation: [
        'Указывай язык программирования',
        'Определяй стиль кода и соглашения',
        'Просить комментарии и документацию'
      ],
      translation: [
        'Указывай целевую аудиторию перевода',
        'Определяй уровень формальности',
        'Учитывай культурные особенности'
      ],
      summarization: [
        'Определяй желаемую длину резюме',
        'Указывай ключевые аспекты для выделения',
        'Структурируй формат вывода'
      ],
      question_answering: [
        'Определяй уровень детализации ответа',
        'Указывай требования к источникам',
        'Структурируй формат ответа'
      ],
      classification: [
        'Четко определяй категории',
        'Указывай критерии классификации',
        'Просить уровень уверенности'
      ],
      entity_extraction: [
        'Определяй типы сущностей для извлечения',
        'Указывай формат структурированного вывода',
        'Просить валидацию извлеченных данных'
      ],
      custom: [
        'Четко определяй цель и ожидания',
        'Структурируй требования',
        'Приводи примеры желаемого результата'
      ]
    };

    return tips[domain] || tips.custom;
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  /**
   * Используем прямой вызов AI вместо generateSuggestions
   */
  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'callAIWithMetadata';
  }
}