import { BaseAIOperation } from '../base/base-ai-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../interfaces/operation.interface';
import { AIOperationConfig } from '../interfaces/ai-operation.interface';

interface ConsistencyCheckInput {
  projectData: {
    synopsis?: string;
    logline?: string;
    genres?: string[];
    atmosphere?: string;
    mainThemes?: string;
    targetAudience?: string;
  };
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    fields: Record<string, any>;
  }>;
  relationships?: Array<{
    fromEntityId: string;
    toEntityId: string;
    relationType: string;
  }>;
  checkTypes?: Array<'thematic' | 'logical' | 'character' | 'world' | 'tone'>;
}

interface ConsistencyCheckOutput {
  overallConsistency: number; // 0-1, общий уровень согласованности
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    category: 'thematic' | 'logical' | 'character' | 'world' | 'tone';
    description: string;
    severity: number; // 0-1
    affectedEntities: string[];
    suggestions?: string[];
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    description: string;
    actionable: boolean;
  }>;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    entitiesChecked: number;
    consistencyByCategory: Record<string, number>;
  };
}

/**
 * Улучшенная операция проверки согласованности проекта с SOLID архитектурой
 * Демонстрирует принципы:
 * - SRP: Фокус только на проверке согласованности
 * - OCP: Легко расширяется новыми типами проверок
 * - DRY: AI логика вынесена в базовый класс
 */
export class ImprovedConsistencyCheckOperation extends BaseAIOperation {
  
  // Типы проверок по умолчанию
  private readonly defaultCheckTypes = ['thematic', 'logical', 'character', 'world', 'tone'] as const;

  constructor() {
    super(
      'improved_consistency_check',
      'Improved Consistency Check',
      '2.0.0',
      AIOperationCategory.QUALITY_ASSURANCE,
      ComplexityLevel.COMPLEX,
      {
        requiredCapabilities: ['text_analysis', 'logical_reasoning'],
        maxTokens: 10000,
        timeout: 25000
      }
    );
  }

  // ===== ВАЛИДАЦИЯ =====

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input) {
      errors.push('Input is required');
      return { isValid: false, errors };
    }

    if (!input.projectData || typeof input.projectData !== 'object') {
      errors.push('Project data is required and must be an object');
    }

    if (!input.entities || !Array.isArray(input.entities)) {
      errors.push('Entities are required and must be an array');
    }

    // Для генерации библии проекта entities могут быть пустыми
    // Проверяем, что есть либо entities, либо достаточно данных проекта
    if (input.entities && input.entities.length === 0) {
      const hasProjectData = input.projectData && 
        (input.projectData.synopsis || input.projectData.logline || 
         input.projectData.genres?.length > 0 || input.projectData.mainThemes);
      
      if (!hasProjectData) {
        errors.push('Either entities or sufficient project data is required for consistency check');
      }
    }

    // Проверяем структуру сущностей
    if (input.entities && Array.isArray(input.entities)) {
      for (const entity of input.entities) {
        if (!entity.id || !entity.name || !entity.type) {
          errors.push('Each entity must have id, name, and type');
          break;
        }
      }
    }

    // Проверяем типы проверок
    if (input.checkTypes && Array.isArray(input.checkTypes)) {
      const validTypes = ['thematic', 'logical', 'character', 'world', 'tone'];
      const invalidTypes = input.checkTypes.filter((type: string) => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        errors.push(`Invalid check types: ${invalidTypes.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== AI КОНФИГУРАЦИЯ =====

  getAIConfig(_context: ExecutionContext, userSettings?: any): AIOperationConfig {
    const baseConfig = super.getAIConfig(_context, userSettings);
    
    // Специфичная конфигурация для проверки согласованности
    return {
      ...baseConfig,
      creativityLevel: 0.3, // Низкая креативность для объективного анализа
      preferredModel: userSettings?.preferredModel || 'gemini-2.5-flash-lite',
      maxTokens: 2500, // Достаточно для детального анализа
      temperature: 0.4 // Балансируем между точностью и разнообразием
    };
  }

  // ===== ПРОМПТЫ =====

  getSystemPrompt(input: any, _context: ExecutionContext): string {
    const typedInput = input as ConsistencyCheckInput;
    const checkTypes = typedInput.checkTypes || this.defaultCheckTypes;
    
    return `Ты эксперт по анализу согласованности творческих проектов и нарративной логике.

Твоя задача - провести всесторонний анализ согласованности проекта и выявить потенциальные проблемы.

Типы проверок для анализа: ${checkTypes.join(', ')}

Принципы анализа:
- Будь объективным и конструктивным
- Ищи логические противоречия и несоответствия
- Проверяй соответствие элементов общей концепции
- Учитывай жанровые конвенции и ожидания аудитории
- Предлагай конкретные решения проблем

Критерии оценки:
- ТЕМАТИЧЕСКАЯ СОГЛАСОВАННОСТЬ: соответствие персонажей и событий основным темам
- ЛОГИЧЕСКАЯ СОГЛАСОВАННОСТЬ: отсутствие противоречий в фактах и причинно-следственных связях
- ХАРАКТЕРНАЯ СОГЛАСОВАННОСТЬ: соответствие действий персонажей их характерам
- МИРОВАЯ СОГЛАСОВАННОСТЬ: соответствие элементов правилам и логике мира
- ТОНАЛЬНАЯ СОГЛАСОВАННОСТЬ: единство стиля и атмосферы

Форматирование:
- Отвечай в формате JSON
- Укажи конкретные проблемы с примерами
- Предлагай практические решения
- Оценивай серьезность каждой проблемы`;
  }

  getUserPrompt(_input: any, _context: ExecutionContext): string {
    return `ДАННЫЕ ПРОЕКТА:
{{projectData}}

СУЩНОСТИ ДЛЯ ПРОВЕРКИ:
{{entitiesData}}

СВЯЗИ МЕЖДУ СУЩНОСТЯМИ:
{{relationshipsData}}

ТИПЫ ПРОВЕРОК:
{{checkTypes}}

Проведи всесторонний анализ согласованности проекта и выяви все потенциальные проблемы.

Верни результат в JSON формате:
{
  "overallConsistency": 0.75,
  "issues": [
    {
      "type": "error|warning|suggestion",
      "category": "thematic|logical|character|world|tone",
      "description": "детальное описание проблемы",
      "severity": 0.8,
      "affectedEntities": ["entity_id1", "entity_id2"],
      "suggestions": ["конкретное предложение по решению"]
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "description": "рекомендация по улучшению",
      "actionable": true
    }
  ],
  "consistencyByCategory": {
    "thematic": 0.8,
    "logical": 0.9,
    "character": 0.7,
    "world": 0.85,
    "tone": 0.75
  }
}`;
  }

  protected getPromptVariables(input: any, _context: ExecutionContext): Record<string, any> {
    const typedInput = input as ConsistencyCheckInput;
    const baseVariables = super.getPromptVariables(input, _context);
    
    // Форматируем данные проекта
    const projectDataParts = [];
    if (typedInput.projectData.synopsis) {
      projectDataParts.push(`Синопсис: ${typedInput.projectData.synopsis}`);
    }
    if (typedInput.projectData.logline) {
      projectDataParts.push(`Логлайн: ${typedInput.projectData.logline}`);
    }
    if (typedInput.projectData.genres?.length) {
      projectDataParts.push(`Жанры: ${typedInput.projectData.genres.join(', ')}`);
    }
    if (typedInput.projectData.atmosphere) {
      projectDataParts.push(`Атмосфера: ${typedInput.projectData.atmosphere}`);
    }
    if (typedInput.projectData.mainThemes) {
      projectDataParts.push(`Основные темы: ${typedInput.projectData.mainThemes}`);
    }
    if (typedInput.projectData.targetAudience) {
      projectDataParts.push(`Целевая аудитория: ${typedInput.projectData.targetAudience}`);
    }
    
    // Форматируем сущности
    const entitiesText = typedInput.entities?.length > 0 
      ? typedInput.entities
          .map(entity => {
            const fieldsText = Object.entries(entity.fields)
              .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
              .join('\n');
            
            return `- ${entity.name} (${entity.type}):
  ID: ${entity.id}
  Описание: ${entity.description || 'отсутствует'}
  Поля:
${fieldsText}`;
          })
          .join('\n\n')
      : 'Сущности для проверки не предоставлены. Анализируем только данные проекта.';
    
    // Форматируем связи
    const relationshipsText = typedInput.relationships?.length ? 
      typedInput.relationships
        .map(rel => `- ${rel.fromEntityId} → ${rel.toEntityId} (${rel.relationType})`)
        .join('\n') : 'Связи между сущностями не указаны';
    
    return {
      ...baseVariables,
      projectData: projectDataParts.length > 0 ? 
        projectDataParts.join('\n') : 'Данные проекта не предоставлены',
      entitiesData: entitiesText,
      relationshipsData: relationshipsText,
      checkTypes: (typedInput.checkTypes || this.defaultCheckTypes).join(', ')
    };
  }

  // ===== ОБРАБОТКА РЕЗУЛЬТАТОВ =====

  processAIResult(aiResult: any, input: any, _context: ExecutionContext): ConsistencyCheckOutput {
    const typedInput = input as ConsistencyCheckInput;
    
    try {
      // Обрабатываем результат от AI (callAIWithMetadata возвращает content напрямую)
      const responseContent = aiResult.content || aiResult.data || aiResult;

      if (!responseContent) {
        throw new Error('No content returned from AI provider');
      }

      // Парсим JSON из ответа
      const parsedResult = this.parseConsistencyResult(responseContent);
      
      // Подсчитываем статистику
      const totalIssues = parsedResult.issues.length;
      const criticalIssues = parsedResult.issues.filter(issue => 
        issue.type === 'error' || issue.severity > 0.7
      ).length;
      
      const result = {
        overallConsistency: parsedResult.overallConsistency,
        issues: parsedResult.issues,
        recommendations: parsedResult.recommendations,
        summary: {
          totalIssues,
          criticalIssues,
          entitiesChecked: typedInput.entities?.length || 0,
          consistencyByCategory: parsedResult.consistencyByCategory
        },
        // Добавляем поля для интерфейса
        content: `Проверка согласованности завершена. Общий уровень согласованности: ${Math.round(parsedResult.overallConsistency * 100)}%. Обнаружено ${totalIssues} проблем${criticalIssues > 0 ? `, из них ${criticalIssues} критических` : ''}.`,
        explanation: totalIssues === 0 
          ? 'Анализ показал высокую согласованность всех элементов библии проекта. Противоречий не обнаружено.'
          : `Выявлены некоторые несоответствия, требующие внимания. Рекомендуется проработать ${criticalIssues} критических замечаний для улучшения согласованности проекта.`
      };

      return result;

    } catch (error) {
      console.error('❌ Failed to process AI result for consistency check:', error);
      
      // Fallback: возвращаем базовый результат
      return {
        overallConsistency: 0.5,
        issues: [{
          type: 'error',
          category: 'logical',
          description: 'Ошибка анализа согласованности. Попробуйте еще раз.',
          severity: 0.8,
          affectedEntities: [],
          suggestions: ['Перезапустите анализ с другими параметрами']
        }],
        recommendations: [{
          priority: 'high',
          description: 'Необходимо повторить анализ согласованности',
          actionable: true
        }],
        summary: {
          totalIssues: 1,
          criticalIssues: 1,
          entitiesChecked: typedInput.entities?.length || 0,
          consistencyByCategory: {
            thematic: 0.5,
            logical: 0.5,
            character: 0.5,
            world: 0.5,
            tone: 0.5
          }
        }
      };
    }
  }

  // ===== КАСТОМНАЯ СТОИМОСТЬ =====

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    const typedInput = input as ConsistencyCheckInput;
    
    let costMultiplier = 1.0;
    
    // Увеличиваем стоимость для большого количества сущностей
    if (typedInput.entities && Array.isArray(typedInput.entities)) {
      const entityCount = typedInput.entities.length;
      if (entityCount > 20) costMultiplier += 0.8;
      else if (entityCount > 10) costMultiplier += 0.5;
      else if (entityCount > 5) costMultiplier += 0.3;
    }
    
    // Увеличиваем стоимость для сложных данных проекта
    if (typedInput.projectData) {
      const projectDataSize = JSON.stringify(typedInput.projectData).length;
      if (projectDataSize > 2000) costMultiplier += 0.4;
      else if (projectDataSize > 1000) costMultiplier += 0.2;
    }
    
    // Увеличиваем стоимость для большого количества типов проверок
    const checkTypesCount = typedInput.checkTypes?.length || this.defaultCheckTypes.length;
    if (checkTypesCount === this.defaultCheckTypes.length) costMultiplier += 0.3;
    
    return costMultiplier;
  }

  // ===== ПЕРЕОПРЕДЕЛЕНИЕ МЕТОДОВ AI =====

  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'callAIWithMetadata';
  }

  protected getSuggestionType(): string {
    return 'STRUCTURE_ONLY';
  }



  protected getDefaultCreativityLevel(): number {
    return 0.3;
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Парсинг результата проверки согласованности
   */
  private parseConsistencyResult(responseContent: any): {
    overallConsistency: number;
    issues: any[];
    recommendations: any[];
    consistencyByCategory: Record<string, number>;
  } {
    try {
      // Обрабатываем разные форматы ответа
      let content = '';
      
      if (typeof responseContent === 'string') {
        content = responseContent;
      } else if (responseContent && (responseContent.description || responseContent.content)) {
        content = responseContent.description || responseContent.content || '';
      } else {
        content = JSON.stringify(responseContent);
      }
      
      // Пытаемся найти JSON в ответе
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsedData = JSON.parse(jsonMatch[0]);
      
      return {
        overallConsistency: Math.max(0, Math.min(1, parsedData.overallConsistency || 0.5)),
        issues: Array.isArray(parsedData.issues) ? parsedData.issues : [],
        recommendations: Array.isArray(parsedData.recommendations) ? parsedData.recommendations : [],
        consistencyByCategory: parsedData.consistencyByCategory || {
          thematic: 0.5,
          logical: 0.5,
          character: 0.5,
          world: 0.5,
          tone: 0.5
        }
      };
      
    } catch (error) {
      console.warn('⚠️ Failed to parse consistency check result, using heuristic analysis');
      
      // Fallback: простой анализ на основе описания
      const description = typeof responseContent === 'string' ? responseContent : 
                         (responseContent?.description || responseContent?.content || '');
      return this.heuristicConsistencyAnalysis(description);
    }
  }

  /**
   * Эвристический анализ согласованности
   */
  private heuristicConsistencyAnalysis(description: string): {
    overallConsistency: number;
    issues: any[];
    recommendations: any[];
    consistencyByCategory: Record<string, number>;
  } {
    const lowerDescription = description.toLowerCase();
    
    // Простые эвристики для определения проблем
    const problemKeywords = [
      'противоречие', 'несоответствие', 'ошибка', 'проблема', 
      'конфликт', 'нелогично', 'странно'
    ];
    
    const hasProblems = problemKeywords.some(keyword => 
      lowerDescription.includes(keyword)
    );
    
    const overallConsistency = hasProblems ? 0.6 : 0.8;
    
    const issues = hasProblems ? [{
      type: 'warning',
      category: 'logical',
      description: 'Обнаружены потенциальные проблемы согласованности',
      severity: 0.6,
      affectedEntities: [],
      suggestions: ['Требуется детальный анализ проекта']
    }] : [];
    
    return {
      overallConsistency,
      issues,
      recommendations: [{
        priority: 'medium',
        description: 'Рекомендуется провести более детальный анализ',
        actionable: true
      }],
      consistencyByCategory: {
        thematic: overallConsistency,
        logical: overallConsistency,
        character: overallConsistency,
        world: overallConsistency,
        tone: overallConsistency
      }
    };
  }
}