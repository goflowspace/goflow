/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import { AIProvider, AIRequestType, AISuggestionType } from '@prisma/client';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { PromptBuilder } from './providers/prompt-builder';
import { IWebSocketManager } from '../websocket/interfaces/websocket.interfaces';
import { ExecutionContext } from './v2/shared/types';
import { 
  SimplePipelineEngine, 
} from './pipeline';
import { CreditsServiceV3 } from '../payments/credits.service.v3';

// Интерфейс для контекста ветвления
export interface BranchingContext {
  strategy: 'new_branch' | 'add_choice' | 'parallel_narrative';
  existingNodeTypes: string[];
}

export interface AIContextData {
  nodeId?: string;
  surroundingNodes?: string[];
  suggestionType?: AISuggestionType;
  branchingContext?: BranchingContext;
  projectMeta?: {
    name: string;
    description?: string;
    genre?: string;
    entities?: any[];
    projectInfo?: any;
  };
  userPreferences?: {
    creativityLevel: number;
    activeTypes: AISuggestionType[];
  };
}



export class AIService {
  private prisma: PrismaClient;
  private pipelineEngine: SimplePipelineEngine;
  private creditsService: CreditsServiceV3;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.pipelineEngine = new SimplePipelineEngine();
    this.creditsService = new CreditsServiceV3();
  }

  /**
   * Получение настроек AI для пользователя
   */
  private async getUserAISettings(userId: string) {
    let settings = await this.prisma.aIUserSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Создаем дефолтные настройки
      settings = await this.prisma.aIUserSettings.create({
        data: {
          userId,
          proactiveMode: true,
          predictionRadius: 1,
          suggestionDelay: 3,
          preferredProvider: AIProvider.GEMINI,
          creativityLevel: 0.7,
          activeTypes: [AISuggestionType.STRUCTURE_ONLY, AISuggestionType.NEXT_NODES],
          learningEnabled: true
        }
      });
    }

    return settings;
  }


  /**
   * Генерация контента для полей библии проекта
   */
  async generateProjectBibleContent(
    userId: string,
    teamId: string,
    projectId: string,
    fieldType: string,
    baseDescription?: string
  ): Promise<{ content: string, suggestionId: string }> {
    const startTime = Date.now();
    
    try {
      // 1. Проверяем кредиты пользователя
      const creditsNeeded = 1; // Фиксированная стоимость для генерации текста
      const hasCredits = await this.creditsService.checkSufficientCredits(userId, creditsNeeded);
      if (!hasCredits) {
        throw new Error('Insufficient credits');
      }

      // 2. Получаем настройки пользователя
      const userSettings = await this.getUserAISettings(userId);

      // 3. Получаем существующую информацию о проекте
      const projectInfo = await this.prisma.projectInfo.findUnique({
        where: { projectId }
      });

      // 4. Строим контекст для генерации
      const context = await this.buildProjectBibleContext(
        projectId, 
        fieldType, 
        projectInfo, 
        baseDescription
      );

      // 5. Генерируем контент через выбранного провайдера
      const usedProvider = userSettings?.preferredProvider || AIProvider.GEMINI;
      const content = await this.callOpenAIForProjectBible(
        context,
        fieldType,
        userSettings
      );

      // 6. Сохраняем запрос и результат с правильным провайдером
      const responseTime = Date.now() - startTime;
      const suggestionId = await this.saveProjectBibleRequest(
        userId,
        teamId,
        projectId,
        fieldType,
        context,
        content,
        responseTime,
        usedProvider
      );

      return { content, suggestionId };
    } catch (error) {
      console.error('Project Bible Generation Error:', error);
      throw error;
    }
  }

  /**
   * Построение контекста для генерации библии проекта
   */
  private async buildProjectBibleContext(
    _projectId: string,
    _fieldType: string,
    projectInfo: any,
    baseDescription?: string
  ): Promise<string> {
    let context = '';

    // Добавляем базовое описание если есть (для логлайна и синопсиса)
    if (baseDescription) {
      context += `Описание идеи проекта: ${baseDescription}\n\n`;
    }

    // Добавляем существующую информацию о проекте
    if (projectInfo) {
      if (projectInfo.logline) {
        context += `Логлайн: ${projectInfo.logline}\n`;
      }
      if (projectInfo.synopsis) {
        context += `Синопсис: ${projectInfo.synopsis}\n`;
      }
      if (projectInfo.genres && projectInfo.genres.length > 0) {
        context += `Жанры: ${projectInfo.genres.join(', ')}\n`;
      }
      if (projectInfo.formats && projectInfo.formats.length > 0) {
        context += `Форматы: ${projectInfo.formats.join(', ')}\n`;
      }
      context += '\n';
    }

    return context;
  }

  /**
   * Вызов AI провайдера для генерации контента библии проекта
   */
  private async callOpenAIForProjectBible(
    context: string,
    fieldType: string,
    userSettings: any
  ): Promise<string> {
    // Используем провайдера для генерации контента библии
    const provider = AIProviderFactory.create(userSettings?.preferredProvider || AIProvider.GEMINI);
    
    // Используем специальный промпт для библии проекта
    const prompt = PromptBuilder.getProjectBiblePrompt(fieldType, context);
    
    const suggestions = await provider.generateSuggestions({
      context: prompt,
      userSettings,
      suggestionType: 'PROJECT_BIBLE' as AISuggestionType,
      maxTokens: 10000 // Лимит для генерации библии
    });

    return suggestions[0]?.description || '';
  }



  /**
   * Сохранение запроса генерации библии проекта
   */
  private async saveProjectBibleRequest(
    userId: string,
    teamId: string,
    projectId: string,
    fieldType: string,
    context: string,
    content: string,
    responseTime: number,
    provider: AIProvider
  ): Promise<string> {
    // Сохраняем AI запрос
    const request = await this.prisma.aIRequest.create({
      data: {
        userId,
        projectId,
        type: AIRequestType.GENERATION,
        context: {
          fieldType,
          baseContext: context
        },
        provider: provider,
        tokensUsed: Math.ceil(content.length / 4), // Примерная оценка
        creditsCharged: 1,
        responseTime,
        status: 'COMPLETED',
        result: {
          content,
          fieldType
        }
      }
    });

    // Создаем AI suggestion для возможности accept/reject
    const suggestion = await this.prisma.aISuggestion.create({
      data: {
        requestId: request.id,
        userId,
        projectId,
        type: 'PROJECT_BIBLE',
        title: `Generate ${fieldType}`,
        content: {
          fieldType,
          text: content,
          originalContext: context
        },
        confidence: 0.8,
        status: 'PENDING'
      }
    });

    console.log('Created AISuggestion:', {
      id: suggestion.id,
      status: suggestion.status,
      type: suggestion.type,
      fieldType,
      userId
    });

    // Списываем кредиты
    await this.creditsService.deductCredits(userId, 1, 'Bible content generation', undefined, teamId);

    return suggestion.id;
  }

  /**
   * Получить среднее время ответа AI за последний час
   */
  async getAverageResponseTime(
    type: AIRequestType,
    provider: AIProvider
  ): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await this.prisma.aIRequest.aggregate({
      where: {
        type,
        provider,
        status: 'COMPLETED',
        responseTime: {
          not: null
        },
        createdAt: {
          gte: oneHourAgo
        }
      },
      _avg: {
        responseTime: true
      },
      _count: {
        responseTime: true
      }
    });

    // Если нет данных за последний час, возвращаем 0
    if (!result._count.responseTime || result._count.responseTime === 0) {
      return 0;
    }

    // Конвертируем из миллисекунд в секунды и округляем до 1 знака после запятой
    const avgTimeMs = result._avg.responseTime || 0;
    return Math.round((avgTimeMs / 1000) * 10) / 10;
  }

  // ===== PIPELINE METHODS =====
   /**
    * Получение статуса выполнения пайплайна
    */
   async getPipelineStatus(requestId: string) {
     return this.pipelineEngine.getStatus(requestId);
   }

  // ===== ENTITY GENERATION METHODS =====

  /**
   * Генерация сущности через адаптированный пайплайн V3
   * Использует новый StreamingPipelineEngine с проверенными операциями
   */
  async generateEntityV3(
    userId: string,
    projectId: string,
    userDescription: string,
    context: ExecutionContext,
    wsManager: IWebSocketManager | undefined,
    options: {
      preferredEntityType?: string;
      customInstructions?: string;
      includeProjectInfo?: boolean;
      includeExistingEntities?: boolean;
      createInDatabase?: boolean;
    } = {}
  ) {
    console.log(`🚀 [V3] Starting entity generation for user ${userId} in project ${projectId}`);
    console.log(`📝 Description: "${userDescription.substring(0, 100)}..."`);
    console.log(`⚙️ Using adapted pipeline with StreamingPipelineEngine`);
    
    const startTime = Date.now();

    try {
      // Импортируем адаптированный пайплайн
      const { executeAdaptedEntityGenerationWithProgress } = await import('./pipeline');
      
      // Подготавливаем входные данные
      const input = {
        projectId,
        userDescription,
        preferredEntityType: options.preferredEntityType,
        customInstructions: options.customInstructions,
        includeProjectInfo: options.includeProjectInfo ?? true,
        includeExistingEntities: options.includeExistingEntities ?? true,
        executionOptions: {
          createInDatabase: options.createInDatabase ?? true
        }
      };

      // Запускаем пайплайн с прогрессом
      const result = await executeAdaptedEntityGenerationWithProgress(
        input,
        context,
        wsManager
      );

      const executionTime = Date.now() - startTime;
      
      console.log(`✅ [V3] Entity generation completed in ${executionTime}ms`);
      
      // Извлекаем данные о созданной сущности
      const createdEntity = result.entity || result.results?.create_entity?.createdEntity;
      const stepsCompleted = Object.keys(result.results || {}).filter(
        key => result.results[key] && !result.results[key].error && !result.results[key].skipped
      );

      return {
        success: true,
        data: {
          entity: createdEntity,
          results: result.results,
          pipeline: 'adapted-entity-generation-v3'
        },
        executionTime,
        stepsCompleted
      };

    } catch (error) {
      console.error('❌ [V3] Entity generation failed:', error);
      
      // Детальная информация об ошибке
      let details = {};
      if (error instanceof Error) {
        details = {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details,
        data: null
      };
    }
  }

  /**
   * Получение доступных типов сущностей для проекта
   * Вспомогательный метод для UI
   */
  async getAvailableEntityTypes(projectId: string) {
    try {
      console.log(`📋 Getting available entity types for project: ${projectId}`);

      const entityTypes = await this.prisma.entityType.findMany({
        where: { projectId },
        include: {
          parameters: {
            include: {
              parameter: true
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { order: 'asc' }
      });

      const formattedTypes = entityTypes.map(entityType => ({
        id: entityType.id,
        type: entityType.type,
        name: entityType.name,
        description: entityType.description,
        parametersCount: entityType.parameters.length,
        hasRequiredFields: entityType.parameters.some(etp => etp.required)
      }));

      console.log(`📋 Found ${formattedTypes.length} entity types`);

      return {
        success: true,
        data: formattedTypes
      };

    } catch (error) {
      console.error('❌ Failed to get entity types:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }

  /**
   * Предварительная оценка сложности генерации сущности
   * Для показа пользователю примерного времени и стоимости
   */
  async estimateEntityGeneration(
    projectId: string,
    userDescription: string,
    preferredEntityType?: string
  ) {
    try {
      console.log(`💰 Estimating entity generation cost for project: ${projectId}`);

      // Получаем контекст проекта для точной оценки
      const entityTypes = await this.prisma.entityType.findMany({
        where: { projectId },
        include: {
          parameters: true
        }
      });

      if (entityTypes.length === 0) {
        return {
          success: false,
          error: 'No entity types found in project',
          data: null
        };
      }

      // Определяем целевой тип сущности для оценки
      let targetType = entityTypes[0]; // По умолчанию первый
      
      if (preferredEntityType) {
        const preferred = entityTypes.find(et => 
          et.type === preferredEntityType || et.id === preferredEntityType
        );
        if (preferred) {
          targetType = preferred;
        }
      }

      // Базовая оценка стоимости
      const baseOperationCost = 10; // Стоимость операций анализа и создания
      const typeDetectionCost = 5 + Math.ceil(userDescription.length / 100); // За определение типа
      const fieldGenerationCost = 15 + (targetType.parameters.length * 2); // За генерацию полей
      
      const totalEstimatedCost = baseOperationCost + typeDetectionCost + fieldGenerationCost;
      
      // Примерное время (в секундах)
      const estimatedTime = Math.ceil(10 + (targetType.parameters.length * 2));

      console.log(`💰 Estimated cost: ${totalEstimatedCost} credits, time: ${estimatedTime}s`);

      return {
        success: true,
        data: {
          estimatedCost: totalEstimatedCost,
          estimatedTimeSeconds: estimatedTime,
          targetEntityType: {
            id: targetType.id,
            type: targetType.type,
            name: targetType.name,
            parametersCount: targetType.parameters.length
          },
          availableTypes: entityTypes.map(et => ({
            id: et.id,
            type: et.type,
            name: et.name,
            parametersCount: et.parameters.length
          }))
        }
      };

    } catch (error) {
      console.error('❌ Failed to estimate entity generation:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }
} 