import { BaseAIOperation } from '../../base/base-ai-operation';
import { ExecutionContext, ValidationResult, OperationRequirements, ComplexityLevel, AIOperationCategory } from '../../interfaces/operation.interface';
import { AIOperationConfig } from '../../interfaces/ai-operation.interface';
import { AIProvider } from '@prisma/client';

// ===== ТИПЫ =====

export interface EntityContextAnalysisInput {
  entityData: {
    name: string;
    description?: string;
    entityType: {
      id: string;
      name: string;
      type: string; // character, location, faction, event, rule
    };
    values: Record<string, any>; // параметры сущности
  };
  projectBible: {
    synopsis?: string;
    logline?: string;
    genres?: string[];
    setting?: string;
    atmosphere?: string;
    mainThemes?: string;
    targetAudience?: string;
    references?: string;
    uniqueFeatures?: string;
    constraints?: string;
  };
  userSettings?: {
    preferredProvider?: string;
    preferredModel?: string;
    creativityLevel?: number;
  };
  customPromptRequirements?: string[]; // Дополнительные требования пользователя
}

export interface EntityContextAnalysisOutput {
  enrichedContext: {
    // Основная информация о сущности
    entityInfo: {
      name: string;
      type: string;
      description: string;
      category: 'character' | 'location' | 'faction' | 'event' | 'rule';
    };
    
    // Структурированные параметры сущности
    entityAttributes: {
      appearance?: string;
      personality?: string;
      background?: string;
      relationships?: string;
      abilities?: string;
      equipment?: string;
      location?: string;
      culture?: string;
      history?: string;
      other: Record<string, any>;
    };
    
    // Контекст из библии проекта
    projectContext: {
      worldSetting: string;
      visualStyle: string;
      atmosphere: string;
      genres: string[];
      themes: string;
    };
    
    // Рекомендации для генерации изображения
    imageGuidance: {
      suggestedAspectRatio: string;
      styleDirection: string;
      focusElements: string[];
      avoidElements: string[];
      userRequirements: string[]; // Дополнительные требования пользователя
    };
  };
  
  confidence: number; // Уверенность в полноте контекста (0.0-1.0)
  reasoning: string; // Обоснование анализа
}

// ===== ОПЕРАЦИЯ =====

export class EntityContextAnalysisOperation extends BaseAIOperation {
  constructor() {
    super(
      'entity_context_analysis',
      'Entity Context Analysis Operation',
      '1.0.0',
      AIOperationCategory.CONTENT_ANALYSIS,
      ComplexityLevel.SIMPLE,
      {
        requiredCapabilities: ['context_understanding'],
        maxTokens: 10000,
        timeout: 15000
      } as OperationRequirements
    );
  }

  // ===== ВАЛИДАЦИЯ =====

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];
    
    if (!input.entityData) {
      errors.push('entityData is required');
    } else {
      if (!input.entityData.name || typeof input.entityData.name !== 'string') {
        errors.push('entityData.name must be a non-empty string');
      }
      
      if (!input.entityData.entityType || !input.entityData.entityType.type) {
        errors.push('entityData.entityType.type is required');
      }
    }
    
    if (!input.projectBible || typeof input.projectBible !== 'object') {
      errors.push('projectBible must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== AI КОНФИГУРАЦИЯ =====

  getAIConfig(_context: ExecutionContext, userSettings?: any): AIOperationConfig {
    return {
      preferredProvider: userSettings?.preferredProvider || AIProvider.GEMINI,
      preferredModel: userSettings?.preferredModel || 'gemini-2.5-flash-lite',
      creativityLevel: 0.3, // Низкий уровень креативности для анализа
      maxTokens: 10000,
      temperature: 0.3
    };
  }

  // ===== ПРОМПТЫ =====

  getSystemPrompt(_input: any, _context: ExecutionContext): string {
    return `Ты эксперт по анализу контекста для генерации изображений. Твоя специализация - структурирование данных о сущностях в рамках творческих проектов.

ТВОЯ РОЛЬ: Entity Context Analyst

ЗАДАЧА: Проанализировать данные сущности и библии проекта, чтобы создать структурированный контекст для генерации изображения.

ПРИНЦИПЫ АНАЛИЗА:
- Извлекай ключевую визуальную информацию
- Структурируй данные по категориям
- Учитывай стиль и атмосферу проекта
- Определяй фокусные элементы для изображения
- Исключай неподходящие элементы

КАТЕГОРИИ ПАРАМЕТРОВ СУЩНОСТИ:
- APPEARANCE: Внешность, физическое описание
- PERSONALITY: Личность, характер (влияет на позу, выражение)
- BACKGROUND: Предыстория (влияет на стиль одежды, окружение)
- RELATIONSHIPS: Отношения (могут влиять на символику)
- ABILITIES: Способности (влияют на атрибуты, эффекты)
- EQUIPMENT: Снаряжение, одежда, аксессуары
- LOCATION: Местоположение, окружение
- CULTURE: Культурные особенности
- HISTORY: Исторический контекст

ТИПЫ СУЩНОСТЕЙ:
- CHARACTER: Персонаж - фокус на внешность, одежду, позу
- LOCATION: Локация - фокус на архитектуру, ландшафт, атмосферу
- FACTION: Фракция - фокус на символику, стиль, идентичность
- EVENT: Событие - фокус на действие, динамику, участников
- RULE: Правило - фокус на концептуальное представление

КОНТЕКСТ БИБЛИИ ПРОЕКТА:
- Извлекай визуальный стиль из жанров и атмосферы
- Учитывай сеттинг для определения эпохи и места
- Используй темы для эмоциональной направленности

Отвечай ТОЛЬКО в формате JSON без дополнительных комментариев.`;
  }

  getUserPrompt(_input: any, _context: ExecutionContext): string {
    return `ДАННЫЕ СУЩНОСТИ:
Имя: {{entityName}}
Тип: {{entityType}} ({{entityCategory}})
Описание: {{entityDescription}}

ПАРАМЕТРЫ СУЩНОСТИ:
{{entityParameters}}

БИБЛИЯ ПРОЕКТА:
Жанры: {{projectGenres}}
Сеттинг: {{projectSetting}}
Атмосфера: {{projectAtmosphere}}
Основные темы: {{projectThemes}}
Синопсис: {{projectSynopsis}}
Референсы: {{projectReferences}}

{{#if userRequirements}}
ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ ПОЛЬЗОВАТЕЛЯ:
{{#each userRequirements}}
- {{this}}
{{/each}}
{{/if}}

ПРОАНАЛИЗИРУЙ контекст и создай структурированные данные для генерации изображения сущности.

Верни результат в JSON формате:
{
  "enrichedContext": {
    "entityInfo": {
      "name": "Имя сущности",
      "type": "Тип сущности",
      "description": "Обогащенное описание для изображения",
      "category": "character|location|faction|event|rule"
    },
    "entityAttributes": {
      "appearance": "Описание внешности (если применимо)",
      "personality": "Черты личности, влияющие на визуал",
      "background": "Контекст предыстории",
      "relationships": "Важные связи",
      "abilities": "Способности и навыки",
      "equipment": "Снаряжение и аксессуары",
      "location": "Местоположение/окружение",
      "culture": "Культурные особенности",
      "history": "Исторический контекст",
      "other": {}
    },
    "projectContext": {
      "worldSetting": "Мир и эпоха проекта",
      "visualStyle": "Предполагаемый визуальный стиль",
      "atmosphere": "Атмосфера и настроение",
      "genres": ["жанр1", "жанр2"],
      "themes": "Основные темы проекта"
    },
    "imageGuidance": {
      "suggestedAspectRatio": "1:1",
      "styleDirection": "Рекомендации по стилю изображения",
      "focusElements": ["элемент1", "элемент2"],
      "avoidElements": ["что_избегать1", "что_избегать2"]
    }
  },
  "confidence": 0.85,
  "reasoning": "Подробное объяснение анализа и рекомендаций"
}`;
  }

  protected getPromptVariables(input: any, _context: ExecutionContext): Record<string, any> {
    const typedInput = input as EntityContextAnalysisInput;
    
    return {
      entityName: typedInput.entityData.name,
      entityType: typedInput.entityData.entityType.name,
      entityCategory: typedInput.entityData.entityType.type,
      entityDescription: typedInput.entityData.description || 'Описание не предоставлено',
      entityParameters: this.formatEntityParameters(typedInput.entityData.values),
      projectGenres: Array.isArray(typedInput.projectBible.genres) 
        ? typedInput.projectBible.genres.join(', ') 
        : (typedInput.projectBible.genres || 'Не указано'),
      projectSetting: typedInput.projectBible.setting || 'Не указано',
      projectAtmosphere: typedInput.projectBible.atmosphere || 'Не указано',
      projectThemes: typedInput.projectBible.mainThemes || 'Не указано',
      projectSynopsis: typedInput.projectBible.synopsis || 'Не указано',
      projectReferences: typedInput.projectBible.references || 'Не указано',
      userRequirements: typedInput.customPromptRequirements || []
    };
  }

  // ===== ОБРАБОТКА РЕЗУЛЬТАТА =====

  public processAIResult(aiResult: any, input: any, _context: ExecutionContext): EntityContextAnalysisOutput {
    const typedInput = input as EntityContextAnalysisInput;
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
      // Создаем базовый контекст без AI анализа
      return this.createFallbackContext(typedInput);
    }

    // Валидируем и дополняем результат
    const result: EntityContextAnalysisOutput = {
      enrichedContext: {
        entityInfo: {
          name: parsedResult.enrichedContext?.entityInfo?.name || typedInput.entityData.name,
          type: parsedResult.enrichedContext?.entityInfo?.type || typedInput.entityData.entityType.name,
          description: parsedResult.enrichedContext?.entityInfo?.description || typedInput.entityData.description || '',
          category: this.normalizeCategory(typedInput.entityData.entityType.type)
        },
        entityAttributes: {
          appearance: parsedResult.enrichedContext?.entityAttributes?.appearance,
          personality: parsedResult.enrichedContext?.entityAttributes?.personality,
          background: parsedResult.enrichedContext?.entityAttributes?.background,
          relationships: parsedResult.enrichedContext?.entityAttributes?.relationships,
          abilities: parsedResult.enrichedContext?.entityAttributes?.abilities,
          equipment: parsedResult.enrichedContext?.entityAttributes?.equipment,
          location: parsedResult.enrichedContext?.entityAttributes?.location,
          culture: parsedResult.enrichedContext?.entityAttributes?.culture,
          history: parsedResult.enrichedContext?.entityAttributes?.history,
          other: parsedResult.enrichedContext?.entityAttributes?.other || {}
        },
        projectContext: {
          worldSetting: parsedResult.enrichedContext?.projectContext?.worldSetting || 'Современный мир',
          visualStyle: parsedResult.enrichedContext?.projectContext?.visualStyle || 'Реалистичный',
          atmosphere: parsedResult.enrichedContext?.projectContext?.atmosphere || 'Нейтральная',
          genres: Array.isArray(parsedResult.enrichedContext?.projectContext?.genres) 
            ? parsedResult.enrichedContext.projectContext.genres 
            : [],
          themes: parsedResult.enrichedContext?.projectContext?.themes || 'Не указано'
        },
        imageGuidance: {
          suggestedAspectRatio: '1:1', // Всегда квадратное как требуется
          styleDirection: parsedResult.enrichedContext?.imageGuidance?.styleDirection || 'Стандартный стиль проекта',
          focusElements: Array.isArray(parsedResult.enrichedContext?.imageGuidance?.focusElements) 
            ? parsedResult.enrichedContext.imageGuidance.focusElements 
            : [],
          avoidElements: Array.isArray(parsedResult.enrichedContext?.imageGuidance?.avoidElements) 
            ? parsedResult.enrichedContext.imageGuidance.avoidElements 
            : [],
          userRequirements: typedInput.customPromptRequirements || [] // Добавляем пользовательские требования
        }
      },
      confidence: Math.min(Math.max(parsedResult.confidence || 0.5, 0.0), 1.0),
      reasoning: parsedResult.reasoning || 'Автоматический анализ контекста'
    };

    return result;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  private formatEntityParameters(values: Record<string, any>): string {
    if (!values || Object.keys(values).length === 0) {
      return 'Параметры не заданы';
    }

    return Object.entries(values)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${this.formatParameterValue(value)}`)
      .join('\n');
  }

  private formatParameterValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object' && value !== null) {
      // Проверяем на наличие base64 изображений в объекте
      const jsonStr = JSON.stringify(value);
      if (jsonStr.length > 1000 || jsonStr.includes('data:image/') || jsonStr.includes('base64,')) {
        return '[Медиа-контент исключен]';
      }
      return jsonStr;
    }
    
    // Проверяем строки на наличие base64 изображений
    const stringValue = String(value);
    if (stringValue.length > 1000 || stringValue.includes('data:image/') || stringValue.includes('base64,')) {
      return '[Медиа-контент исключен]';
    }
    
    return stringValue;
  }

  private normalizeCategory(type: string): 'character' | 'location' | 'faction' | 'event' | 'rule' {
    const normalized = type.toLowerCase();
    if (['character', 'location', 'faction', 'event', 'rule'].includes(normalized)) {
      return normalized as 'character' | 'location' | 'faction' | 'event' | 'rule';
    }
    return 'character'; // fallback
  }

  private createFallbackContext(input: EntityContextAnalysisInput): EntityContextAnalysisOutput {
    return {
      enrichedContext: {
        entityInfo: {
          name: input.entityData.name,
          type: input.entityData.entityType.name,
          description: input.entityData.description || '',
          category: this.normalizeCategory(input.entityData.entityType.type)
        },
        entityAttributes: {
          other: input.entityData.values
        },
        projectContext: {
          worldSetting: input.projectBible.setting || 'Не указано',
          visualStyle: 'Стандартный',
          atmosphere: input.projectBible.atmosphere || 'Нейтральная',
          genres: Array.isArray(input.projectBible.genres) ? input.projectBible.genres : [],
          themes: input.projectBible.mainThemes || 'Не указано'
        },
        imageGuidance: {
          suggestedAspectRatio: '1:1',
          styleDirection: 'Стандартный стиль проекта',
          focusElements: [input.entityData.name],
          avoidElements: [],
          userRequirements: input.customPromptRequirements || [] // Добавляем пользовательские требования
        }
      },
      confidence: 0.3,
      reasoning: 'Базовый анализ без AI обработки'
    };
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  /**
   * Используем прямой вызов AI вместо generateSuggestions
   */
  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'callAIWithMetadata';
  }
}