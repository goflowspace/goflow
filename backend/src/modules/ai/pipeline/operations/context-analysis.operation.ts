import { BaseOperation } from '../base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../interfaces/operation.interface';

/**
 * Операция для анализа контекста проекта и определения стратегии генерации
 */
export class ContextAnalysisOperation extends BaseOperation {
  constructor() {
    super(
      'context_analysis',
      'Project Context Analysis',
      '1.0.0',
      AIOperationCategory.CONTENT_ANALYSIS,
      ComplexityLevel.SIMPLE,
      {
        requiredCapabilities: ['context_understanding'],
        maxTokens: 10000,
        timeout: 10000
      }
    );
  }

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      errors.push('Input must be an object');
      return { isValid: false, errors };
    }

    if (!input.baseDescription || typeof input.baseDescription !== 'string') {
      errors.push('baseDescription is required and must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(
    input: any, 
    _context: ExecutionContext
  ): Promise<{
    data: any;
    tokensUsed?: number;
    model?: string;
  }> {
    const { baseDescription, existingProjectInfo, forceRegeneration = false } = input;

    try {
      // Анализируем существующие поля
      const fieldsStatus = this.analyzeExistingFields(existingProjectInfo);
      
      // Определяем приоритеты генерации
      const generationPriorities = this.determineGenerationPriorities(fieldsStatus, forceRegeneration);
      
      // Создаем обогащенный контекст
      const enrichedContext = this.createEnrichedContext(baseDescription, existingProjectInfo);

      console.log('🔍 Project context analysis completed');
      console.log(`📊 Force regeneration: ${forceRegeneration}`);
      console.log(`📊 Fields to generate: ${generationPriorities.missingFields.length}`);
      console.log(`⚡ Priority fields: ${generationPriorities.criticalFields.join(', ')}`);

      return {
        data: {
          fieldsStatus,
          generationPriorities,
          enrichedContext,
          metadata: {
            analyzedAt: new Date().toISOString(),
            totalFields: Object.keys(fieldsStatus).length,
            filledFields: Object.values(fieldsStatus).filter(Boolean).length,
            forceRegeneration
          }
        },
        tokensUsed: 50, // Локальная операция, минимальное использование токенов
        model: 'local-analysis'
      };

    } catch (error) {
      console.error('Context analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to analyze project context: ${errorMessage}`);
    }
  }

  /**
   * Анализирует заполненность полей проекта
   */
  private analyzeExistingFields(projectInfo: any): Record<string, boolean> {
    const fields = [
      'genres', 'formats', 'logline', 'synopsis', 'setting', 
      'targetAudience', 'mainThemes', 'atmosphere',
      'message', 'references', 'uniqueFeatures', 'visualStyle', 'constraints'
    ];

    const fieldsStatus: Record<string, boolean> = {};

    fields.forEach(field => {
      if (field === 'genres' || field === 'formats') {
        fieldsStatus[field] = projectInfo?.[field] && Array.isArray(projectInfo[field]) && projectInfo[field].length > 0;
      } else {
        fieldsStatus[field] = !!(projectInfo?.[field]?.trim());
      }
    });

    return fieldsStatus;
  }

  /**
   * Определяет приоритеты генерации на основе зависимостей
   */
  private determineGenerationPriorities(fieldsStatus: Record<string, boolean>, forceRegeneration: boolean) {
    // Критические поля в порядке зависимости
    const criticalOrder = ['genres', 'formats', 'logline', 'synopsis', 'setting'];
    
    // Дополнительные поля (можно генерировать параллельно)
    const additionalFields = ['targetAudience', 'mainThemes', 'atmosphere', 'uniqueFeatures', 'message', 'references', 'visualStyle', 'constraints'];

    let missingFields: string[];
    
    if (forceRegeneration) {
      // При принудительной регенерации включаем ВСЕ поля
      missingFields = Object.keys(fieldsStatus);
      console.log('🔄 Force regeneration enabled - all fields will be regenerated');
    } else {
      // Обычный режим - только незаполненные поля
      missingFields = Object.entries(fieldsStatus)
        .filter(([_, filled]) => !filled)
        .map(([field, _]) => field);
      console.log('📝 Standard mode - only empty fields will be generated');
    }

    // Критические поля в правильном порядке (заполненные или незаполненные в зависимости от режима)
    const criticalFields = criticalOrder.filter(field => missingFields.includes(field));
    
    // Дополнительные поля (заполненные или незаполненные в зависимости от режима)
    const additionalMissingFields = additionalFields.filter(field => missingFields.includes(field));

    // Группируем дополнительные поля для параллельной генерации
    const parallelGroups = this.groupFieldsForParallel(additionalMissingFields);

    console.log(`🎯 Fields to regenerate: ${missingFields.join(', ')}`);

    return {
      missingFields,
      criticalFields,
      additionalFields: additionalMissingFields,
      parallelGroups,
      hasWork: missingFields.length > 0
    };
  }

  /**
   * Группирует поля для параллельной генерации
   */
  private groupFieldsForParallel(fields: string[]) {
    return {
      groupA: fields.filter(f => ['targetAudience', 'mainThemes'].includes(f)),
      groupB: fields.filter(f => ['atmosphere', 'visualStyle', 'uniqueFeatures'].includes(f)),
      groupC: fields.filter(f => ['message', 'references', 'constraints'].includes(f))
    };
  }

  /**
   * Создает обогащенный контекст для генерации
   */
  private createEnrichedContext(baseDescription: string, existingInfo: any): string {
    let context = `Базовое описание проекта: ${baseDescription}`;

    if (existingInfo) {
      if (existingInfo.genres && existingInfo.genres.length > 0) {
        context += `\nЖанры: ${existingInfo.genres.join(', ')}`;
      }
      
      if (existingInfo.logline) {
        context += `\nЛоглайн: ${existingInfo.logline}`;
      }
      
      if (existingInfo.synopsis) {
        context += `\nСинопсис: ${existingInfo.synopsis}`;
      }
      
      if (existingInfo.setting) {
        context += `\nСеттинг: ${existingInfo.setting}`;
      }
      
      if (existingInfo.atmosphere) {
        context += `\nАтмосфера: ${existingInfo.atmosphere}`;
      }
      
      if (existingInfo.visualStyle) {
        context += `\nВизуальный стиль: ${existingInfo.visualStyle}`;
      }
    }

    return context;
  }

  protected calculateCustomCost(_input: any, _context: ExecutionContext): number {
    // Локальная операция анализа, минимальная стоимость
    return 1;
  }
} 