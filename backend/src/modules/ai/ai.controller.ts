import { Request, Response } from 'express';
import { AIService } from './ai.service';
import { PrismaClient, AIProvider } from '@prisma/client';
import { CreditsServiceV3 } from '../payments/credits.service.v3';
import { PipelinePricingService } from './v2/services/PipelinePricingService';
import { 
  GenerateProjectBibleContentInput,
  TranslateNodePipelineInput,
  BatchTranslateTimelineInput,
  EstimateBatchTranslationInput,
  CancelBatchTranslationInput
} from './ai.validation';

import { BibleGenerationPipeline, executeBibleGenerationWithProgress } from './v2/pipelines/BibleGenerationPipeline';
import { 
  SingleFieldBiblePipeline, 
  executeSingleFieldGenerationWithProgress,
} from './v2/pipelines/SingleFieldBiblePipeline';
import { ExtendedBibleGenerationInput } from './v2/pipelines/SingleFieldBiblePipeline';
import { 
  EntityImageGenerationPipelineV2Instance,
  executeEntityImageGenerationWithProgress,
  EntityImageGenerationPipelineInputV2
} from './v2/pipelines/EntityImageGenerationPipelineV2';
import { 
  executeNarrativeTextGenerationWithProgress,
  NarrativeTextGenerationPipelineInputV2
} from './v2/pipelines/NarrativeTextGenerationPipelineV2';
import { 
  executeNextNodeGenerationWithProgress,
  NextNodeGenerationPipelineInputV2,
  NextNodeGenerationPipelineOutputV2
} from './v2/pipelines/NextNodeGenerationPipelineV2';
import { 
  TranslationPipelineV2,
  TranslationPipelineInputV2
} from './v2/pipelines/TranslationPipelineV2';
import { StreamingPipelineEngine } from './v2/core/PipelineEngine';
import { PrecedingNodeData } from './v2/types/PrecedingNodeData';
import { getProjectInfoService, updateProjectInfoService } from '../projectInfo/projectInfo.service';
import { checkUserProjectAccess } from '../../utils/projectAccess';
import { checkMemberAIAccess } from '../team/team.service';
import { LocalizationService } from '../localization/localization.service';

import { ImageGenerationOperation } from './pipeline/operations/common/image-generation.operation';
import { OperationRegistry } from './pipeline/factory/operation-registry';

import { WEBSOCKET_TYPES } from '../websocket/di.types';
import { IWebSocketManager } from '../websocket/interfaces/websocket.interfaces';
import { getActiveWebSocketSystem as getWSSystem } from '../websocket/websocket-registry';
import { batchTranslationManager } from './batch-translation-manager';

/**
 * Получает активную WebSocket систему (Redis или in-memory)
 */
async function getActiveWebSocketSystem(): Promise<{ getContainer(): any }> {
  const system = getWSSystem();
  if (!system) {
    throw new Error('WebSocket system not initialized. Please check server startup.');
  }
  return system;
}
import { CollaborationEventType } from '../../types/websocket.types';

import { AdaptedEntityGenerationPipelineInstance } from './v2/pipelines/adapted-entity-generation-pipeline';
import { QualityLevel } from './v2/shared/types';

const prisma = new PrismaClient();
const aiService = new AIService(prisma);
const creditsService = new CreditsServiceV3();
const localizationService = new LocalizationService(prisma);

/**
 * Проверяет доступ к ИИ для пользователя в команде
 */
async function checkAIAccessPermission(userId: string, teamId: string | undefined): Promise<boolean> {
  if (!teamId) {
    // Если нет teamId, разрешаем (персональный аккаунт)
    return true;
  }
  
  // Проверяем доступ к ИИ в команде
  return await checkMemberAIAccess(teamId, userId);
}


/**
 * Принятие AI предложения
 * POST /api/ai/suggestions/:id/accept
 */
export const acceptSuggestion = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const userId = req.user!.id;

    const suggestion = await prisma.aISuggestion.findUnique({
      where: { id }
    });

    if (!suggestion || suggestion.userId !== userId) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.status !== 'PENDING') {
      return res.status(400).json({ error: 'Suggestion already processed' });
    }

    const updatedSuggestion = await prisma.aISuggestion.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        userFeedback: feedback,
        appliedAt: new Date()
      }
    });

    console.log('Accepted AISuggestion:', {
      id: updatedSuggestion.id,
      status: updatedSuggestion.status,
      type: updatedSuggestion.type,
      feedback,
      userId
    });

    res.json({
      success: true,
      message: 'Suggestion accepted'
    });

  } catch (error: any) {
    console.error('Accept Suggestion Error:', error);
    res.status(500).json({ 
      error: 'Failed to accept suggestion',
      message: error.message
    });
  }
};

/**
 * Отклонение AI предложения
 * POST /api/ai/suggestions/:id/reject
 */
export const rejectSuggestion = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const userId = req.user!.id;

    const suggestion = await prisma.aISuggestion.findUnique({
      where: { id }
    });

    if (!suggestion || suggestion.userId !== userId) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.status !== 'PENDING') {
      return res.status(400).json({ error: 'Suggestion already processed' });
    }

    const updatedSuggestion = await prisma.aISuggestion.update({
      where: { id },
      data: {
        status: 'REJECTED',
        userFeedback: feedback
      }
    });

    console.log('Rejected AISuggestion:', {
      id: updatedSuggestion.id,
      status: updatedSuggestion.status,
      type: updatedSuggestion.type,
      feedback,
      userId
    });

    res.json({
      success: true,
      message: 'Suggestion rejected'
    });

  } catch (error: any) {
    console.error('Reject Suggestion Error:', error);
    res.status(500).json({ 
      error: 'Failed to reject suggestion',
      message: error.message
    });
  }
};

/**
 * Получение настроек AI пользователя
 * GET /api/ai/settings
 */
export const getAISettings = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;

    let settings = await prisma.aIUserSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Создаем дефолтные настройки, если их нет
      settings = await prisma.aIUserSettings.create({
        data: {
          userId,
          proactiveMode: true,
          predictionRadius: 1,
          suggestionDelay: 3,
          preferredProvider: AIProvider.GEMINI,
          creativityLevel: 0.7,
          activeTypes: ['STRUCTURE_ONLY', 'NEXT_NODES'],
          learningEnabled: true
        }
      });
    }

    res.json({
      success: true,
      settings
    });

  } catch (error: any) {
    console.error('Get AI Settings Error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI settings',
      message: error.message
    });
  }
};

/**
 * Обновление настроек AI пользователя
 * PUT /api/ai/settings
 */
export const updateAISettings = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const {
      proactiveMode,
      predictionRadius,
      suggestionDelay,
      preferredProvider,
      creativityLevel,
      activeTypes,
      learningEnabled
    } = req.body;

    const settings = await prisma.aIUserSettings.upsert({
      where: { userId },
      update: {
        proactiveMode,
        predictionRadius,
        suggestionDelay,
        preferredProvider,
        creativityLevel,
        activeTypes,
        learningEnabled
      },
      create: {
        userId,
        proactiveMode: proactiveMode ?? true,
        predictionRadius: predictionRadius ?? 1,
        suggestionDelay: suggestionDelay ?? 3,
        preferredProvider: preferredProvider ?? AIProvider.GEMINI,
        creativityLevel: creativityLevel ?? 0.7,
        activeTypes: activeTypes ?? ['STRUCTURE_ONLY', 'NEXT_NODES'],
        learningEnabled: learningEnabled ?? true
      }
    });

    res.json({
      success: true,
      settings
    });

  } catch (error: any) {
    console.error('Update AI Settings Error:', error);
    res.status(500).json({ 
      error: 'Failed to update AI settings',
      message: error.message
    });
  }
};

/**
 * Получение баланса кредитов пользователя
 * GET /api/ai/credits
 */
export const getCreditsBalance = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;

    // Получаем баланс через новый CreditsService
    const teamId = req.teamId;
    const balance = await creditsService.getUserCreditsBalance(userId, teamId);
    const transactions = await creditsService.getCreditTransactions(userId, 10, teamId);

    res.json({
      success: true,
      credits: {
        balance: balance.total,
        bonusCredits: balance.personal.bonus,
        subscriptionCredits: balance.personal.subscription,
        plan: 'BASIC', // Базовый план по умолчанию
        monthlyLimit: 500, // Месячный лимит по умолчанию
        usedThisMonth: 0, // TODO: Реализовать подсчет через UsageStats
        usedToday: 0, // TODO: Реализовать подсчет через UsageStats
        resetDate: new Date(), // TODO: Реализовать логику сброса
        recentTransactions: transactions
      }
    });

  } catch (error: any) {
    console.error('Get Credits Error:', error);
    res.status(500).json({ 
      error: 'Failed to get credits balance',
      message: error.message
    });
  }
};

/**
 * Получение истории AI предложений пользователя
 * GET /api/ai/suggestions/history
 */
export const getSuggestionsHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const { projectId, limit = 20, offset = 0 } = req.query;

    const where: any = { userId };
    if (projectId) {
      where.projectId = projectId;
    }

    const suggestions = await prisma.aISuggestion.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.aISuggestion.count({ where });

    res.json({
      success: true,
      suggestions,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: total > Number(offset) + suggestions.length
      }
    });

  } catch (error: any) {
    console.error('Get Suggestions History Error:', error);
    res.status(500).json({ 
      error: 'Failed to get suggestions history',
      message: error.message
    });
  }
}; 

/**
 * Получить среднее время ответа AI за последний час
 * GET /api/ai/average-response-time?type=SUGGESTION&provider=OPENAI
 */
export const getAverageResponseTime = async (
  req: Request,
  res: Response
) => {
  try {
    const { type, provider } = req.query;

    if (!type || !provider) {
      return res.status(400).json({ 
        error: 'Type and provider are required',
        message: 'Please provide both type and provider query parameters'
      });
    }

    // Валидация типа запроса
    const validTypes = ['SUGGESTION', 'ANALYSIS', 'GENERATION', 'ENTITY_CREATE', 'CONTEXT_BUILD'];
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({ 
        error: 'Invalid request type',
        message: `Type must be one of: ${validTypes.join(', ')}`
      });
    }

    // Валидация провайдера
    const validProviders = ['OPENAI', 'ANTHROPIC', 'VERTEX', 'GEMINI'];
    if (!validProviders.includes(provider as string)) {
      return res.status(400).json({ 
        error: 'Invalid provider',
        message: `Provider must be one of: ${validProviders.join(', ')}`
      });
    }

    const aiService = new AIService(prisma);
    const averageTime = await aiService.getAverageResponseTime(
      type as any,
      provider as any
    );

    res.json({
      success: true,
      data: {
        type,
        provider,
        averageResponseTimeSeconds: averageTime,
        message: averageTime === 0 ? 'No data available for the last hour' : undefined
      }
    });

  } catch (error: any) {
    console.error('Get Average Response Time Error:', error);
    res.status(500).json({ 
      error: 'Failed to get average response time',
      message: error.message
    });
  }
};

// ===== PIPELINE ENDPOINTS =====

/**
 * Комплексная генерация библии проекта
 */
export const generateComprehensiveBible = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { baseDescription } = req.body;
    const userId = req.user!.id;
    const teamId = req.teamId;

    if (!baseDescription?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Базовое описание проекта обязательно'
      });
    }

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }

    // Рассчитываем стоимость пайплайна динамически (используем стандартный уровень качества)
    const pipelineCost = PipelinePricingService.calculatePipelineCost('bible-generation-v2');
    const creditsNeeded = pipelineCost ? pipelineCost.totalCredits : 20; // fallback на старое значение
    const hasCredits = await creditsService.checkSufficientCredits(userId, creditsNeeded);
    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Insufficient credits for comprehensive project bible generation'
      });
    }

    console.log(`🎯 Starting comprehensive bible generation for project ${projectId}`);

    // Получаем существующую информацию о проекте
    const existingProjectInfo = await getProjectInfoService(projectId);

    // Настройки пользователя (можно расширить)
    const userSettings = {
      preferredProvider: AIProvider.GEMINI
    };

    // Получаем WebSocketManager из DI контейнера
    let wsManager: IWebSocketManager | undefined = undefined;
    try {
      console.log('🔌 Attempting to get WebSocket manager for AI pipeline...');
      const wsSystem = await getActiveWebSocketSystem();
      wsManager = wsSystem.getContainer().get(WEBSOCKET_TYPES.WebSocketManager) as IWebSocketManager;
      
      if (wsManager) {
        console.log('✅ WebSocket manager successfully obtained for AI pipeline');
        console.log('🔍 WebSocket manager details:', {
          hasManager: !!wsManager,
          managerType: wsManager.constructor.name
        });
      } else {
        console.warn('⚠️ WebSocket manager is null');
      }
    } catch (error) {
      console.error('❌ Failed to get WebSocket manager:', error);
    }

    // Подготавливаем входные данные для нового пайплайна v2
    const input = {
      projectName: `Project ${projectId}`,
      projectContext: baseDescription.trim(),
      additionalContext: {
        existingFields: existingProjectInfo ? {
          synopsis: existingProjectInfo.synopsis,
          logline: existingProjectInfo.logline,
          genres: existingProjectInfo.genres,
          setting: existingProjectInfo.setting,
          atmosphere: existingProjectInfo.atmosphere,
          target_audience: existingProjectInfo.targetAudience,
          themes: existingProjectInfo.mainThemes,
          message: existingProjectInfo.message,
          unique_features: existingProjectInfo.uniqueFeatures,
          references: existingProjectInfo.references,
          visual_style: existingProjectInfo.visualStyle,
          constraints: existingProjectInfo.constraints
        } : {},
        projectGenres: existingProjectInfo?.genres || [],
        targetAudience: existingProjectInfo?.targetAudience || undefined
      },
      userSettings: userSettings,
      userTier: 'business', // Пока фиксированно
      provider: userSettings.preferredProvider || AIProvider.GEMINI
    };

    console.log('🚀 Starting new Bible Generation Pipeline v2 with params:', {
      projectId,
      userId,
      hasWsManager: !!wsManager,
      inputKeys: Object.keys(input),
      projectName: input.projectName
    });

    // Создаем контекст выполнения
    const context = {
      userId,
      projectId,
      requestId: `comprehensive-bible-v2-${Date.now()}`,
      qualityLevel: QualityLevel.STANDARD,
      startTime: new Date(),
      priority: 'high' as const,
      userTier: 'business' as const,
      metadata: {
        wsManager: wsManager
      }
    };

    // Запускаем новый пайплайн v2
    const pipelineResult = await executeBibleGenerationWithProgress(input, context, wsManager);

    if (!pipelineResult) {
      throw new Error('Bible generation pipeline execution failed');
    }

    console.log(`✅ Bible generation completed for project ${projectId}`);
    console.log(`📊 Generated ${pipelineResult.summary.successfulSteps} out of ${pipelineResult.summary.totalSteps} fields`);
    
    if (pipelineResult.summary.hasPartialFailure) {
      console.log(`⚠️ Pipeline completed with partial failure: ${pipelineResult.summary.failedSteps} fields failed`);
      console.log(`📋 Failed fields:`, pipelineResult.errors);
    }

    // Списываем кредиты после успешного выполнения
    try {
      await creditsService.deductCredits(userId, creditsNeeded, 'Comprehensive project bible generation', undefined, teamId);
      console.log(`💳 Deducted ${creditsNeeded} credits for comprehensive bible generation`);
    } catch (creditsError) {
      console.error('Failed to deduct credits:', creditsError);
      // Не прерываем основную операцию из-за ошибки списания
    }
    
    // Используем успешно сгенерированные поля
    const result = pipelineResult.results;
    const fieldsGenerated = pipelineResult.summary.successfulSteps;

    // Если были сгенерированы новые поля, обновляем информацию о проекте
    if (fieldsGenerated > 0) {
      try {
        // Создаем объект для обновления, объединяя существующие и новые данные
        // Маппинг полей из v2 пайплайна к полям проекта
        const updateData: any = {};
        
        if (result.synopsis) updateData.synopsis = result.synopsis;
        if (result.logline) updateData.logline = result.logline;
        if (result.genres) updateData.genres = result.genres;
        if (result.setting) updateData.setting = result.setting;
        if (result.atmosphere) updateData.atmosphere = result.atmosphere;
        if (result.target_audience) updateData.targetAudience = result.target_audience;
        if (result.themes) updateData.mainThemes = result.themes;
        if (result.message) updateData.message = result.message;
        if (result.unique_features) updateData.uniqueFeatures = result.unique_features;
        if (result.references) updateData.references = result.references;
        if (result.visual_style) updateData.visualStyle = result.visual_style;
        if (result.constraints) updateData.constraints = result.constraints;

        // Обновляем информацию о проекте
        await updateProjectInfoService(projectId, updateData);
        console.log(`💾 Updated project info with ${fieldsGenerated} new fields`);
      } catch (updateError) {
        console.error('Failed to update project info:', updateError);
        // Не прерываем основную операцию из-за ошибки сохранения
      }
    }

    // Подготавливаем ответ с учетом частичных ошибок
    const hasPartialFailure = pipelineResult.summary.hasPartialFailure;
    const statusCode = hasPartialFailure ? 206 : 200; // 206 - Partial Content для частичного успеха

    res.status(statusCode).json({
      success: !hasPartialFailure, // false если есть ошибки
      partialSuccess: hasPartialFailure, // указывает на частичный успех
      data: {
        generatedContent: {
          synopsis: result.synopsis,
          logline: result.logline,
          genres: result.genres,
          setting: result.setting,
          atmosphere: result.atmosphere,
          targetAudience: result.target_audience,
          mainThemes: result.themes,
          message: result.message,
          uniqueFeatures: result.unique_features,
          references: result.references,
          visualStyle: result.visual_style,
          constraints: result.constraints
        },
        metadata: {
          requestId: context.requestId,
          fieldsGenerated,
          totalFields: pipelineResult.summary.totalSteps,
          failedFields: pipelineResult.summary.failedSteps,
          totalCost: 0, // TODO: Добавить подсчет стоимости в v2 пайплайне
          totalTime: Date.now() - context.startTime.getTime(),
          completedAt: new Date().toISOString()
        },
        errors: pipelineResult.errors, // информация об ошибках
        analysis: null, // TODO: Добавить анализ в v2 пайплайне если нужно
        consistency: null // TODO: Добавить проверку согласованности в v2 пайплайне если нужно
      },
      message: hasPartialFailure 
        ? `Частичная генерация: ${fieldsGenerated} из ${pipelineResult.summary.totalSteps} полей сгенерированы успешно`
        : 'Библия проекта успешно сгенерирована'
    });

  } catch (error) {
    console.error('Comprehensive bible generation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при генерации библии проекта',
      error: errorMessage
    });
  }
}

/**
 * Генерация отдельного поля библии проекта через новый v2 пайплайн
 * POST /api/ai/project-bible-field-v2
 */
export const generateProjectBibleFieldV2 = async (
  req: Request<{}, {}, GenerateProjectBibleContentInput>,
  res: Response
) => {
  try {
    const { projectId, fieldType, baseDescription } = req.body;
    const userId = req.user!.id;
    const teamId = req.teamId;

    if (!projectId || !fieldType) {
      return res.status(400).json({ 
        error: 'Project ID and field type are required' 
      });
    }

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }

    // Рассчитываем стоимость пайплайна одного поля динамически (используем стандартный уровень качества)
    const pipelineCost = PipelinePricingService.calculateSingleFieldBibleCost(fieldType);
    const creditsNeeded = pipelineCost ? pipelineCost.totalCredits : 3; // fallback на старое значение
    const hasCredits = await creditsService.checkSufficientCredits(userId, creditsNeeded);
    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Insufficient credits for project bible field generation'
      });
    }

    // Проверяем доступ к проекту
    const projectAccess = await checkUserProjectAccess(userId, projectId);

    if (!projectAccess) {
      return res.status(403).json({ error: 'Access denied to project' });
    }

    // Получаем контекст проекта
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    const projectInfo = await prisma.projectInfo.findUnique({
      where: { projectId }
    });

    // Формируем контекст проекта
    let projectContext = `Проект: ${project?.name || 'Без названия'}\n`;
    if (projectInfo?.genres && projectInfo.genres.length > 0) {
      projectContext += `Жанры: ${projectInfo.genres.join(', ')}\n`;
    }
    if (projectInfo?.logline) {
      projectContext += `Логлайн: ${projectInfo.logline}\n`;
    }
    if (projectInfo?.synopsis) {
      projectContext += `Синопсис: ${projectInfo.synopsis}\n`;
    }
    if (baseDescription) {
      projectContext += `Дополнительная информация: ${baseDescription}`;
    }

    // Собираем существующие поля для контекста
    const existingFields: Record<string, any> = {};
    if (projectInfo) {
      if (projectInfo.synopsis) existingFields.synopsis = projectInfo.synopsis;
      if (projectInfo.logline) existingFields.logline = projectInfo.logline;
      if (projectInfo.genres) existingFields.genres = projectInfo.genres;
      if (projectInfo.setting) existingFields.setting = projectInfo.setting;
      if (projectInfo.atmosphere) existingFields.atmosphere = projectInfo.atmosphere;
      if (projectInfo.targetAudience) existingFields.targetAudience = projectInfo.targetAudience;
      if (projectInfo.mainThemes) existingFields.mainThemes = projectInfo.mainThemes;
      if (projectInfo.message) existingFields.message = projectInfo.message;
      if (projectInfo.uniqueFeatures) existingFields.uniqueFeatures = projectInfo.uniqueFeatures;
      if (projectInfo.references) existingFields.references = projectInfo.references;
      if (projectInfo.visualStyle) existingFields.visualStyle = projectInfo.visualStyle;
      if (projectInfo.constraints) existingFields.constraints = projectInfo.constraints;
    }

    // Получаем настройки пользователя
    const userSettings = await prisma.aIUserSettings.findUnique({
      where: { userId }
    });

    // Получаем WebSocketManager
    let wsManager: IWebSocketManager | undefined = undefined;
    try {
      console.log('🔌 Attempting to get WebSocket manager for v2 single field generation...');
      const wsSystem = await getActiveWebSocketSystem();
      wsManager = wsSystem.getContainer().get(WEBSOCKET_TYPES.WebSocketManager) as IWebSocketManager;
      
      if (wsManager) {
        console.log('✅ WebSocket manager successfully obtained for v2 field generation');
      } else {
        console.warn('⚠️ WebSocket manager is null');
      }
    } catch (error) {
      console.error('❌ Failed to get WebSocket manager:', error);
    }

    // Подготавливаем входные данные для v2 пайплайна
    const input: ExtendedBibleGenerationInput = {
      fieldType,
      projectName: project?.name || `Project ${projectId}`,
      projectContext: projectContext.trim(),
      additionalContext: {
        existingFields,
        baseDescription // Передаем для определения языка
      },
      userSettings: userSettings || {},
      userTier: 'business',
      provider: userSettings?.preferredProvider || AIProvider.GEMINI
    };

    console.log(`🚀 Starting Single Field Generation v2 for field "${fieldType}" in project "${input.projectName}"`);

    // Создаем контекст выполнения
    const context = {
      userId,
      projectId,
      requestId: `single-field-v2-${fieldType}-${Date.now()}`,
      qualityLevel: QualityLevel.STANDARD,
      startTime: new Date(),
      priority: 'normal' as const,
      userTier: 'business' as const,
      metadata: {
        wsManager: wsManager,
        fieldType
      }
    };

    // Запускаем v2 пайплайн
    const result = await executeSingleFieldGenerationWithProgress(input, context, wsManager);

    if (!result) {
      throw new Error('Single field generation pipeline execution failed');
    }

    console.log(`✅ Single field generation completed for "${fieldType}"`);

    // Списываем кредиты после успешного выполнения
    try {
      await creditsService.deductCredits(userId, creditsNeeded, `Bible field generation: ${fieldType}`, undefined, teamId);
      console.log(`💳 Deducted ${creditsNeeded} credits for bible field generation: ${fieldType}`);
    } catch (creditsError) {
      console.error('Failed to deduct credits:', creditsError);
      // Не прерываем основную операцию из-за ошибки списания
    }

    // В v2 пайплайнах основной трекинг происходит через AIPipelineExecution (создается автоматически в движке)
    // Но для совместимости с системой suggestions создаем минимальный AIRequest 
    const request = await prisma.aIRequest.create({
      data: {
        userId,
        projectId,
        type: 'GENERATION',
        context: {
          fieldType,
          pipelineId: SingleFieldBiblePipeline.id,
          version: '2.0.0'
        },
        provider: userSettings?.preferredProvider || 'GEMINI',
        status: 'COMPLETED'
      }
    });

    // Создаем suggestion для accept/reject механизма
    const suggestion = await prisma.aISuggestion.create({
      data: {
        requestId: request.id,
        userId,
        projectId,
        type: 'PROJECT_BIBLE_PIPELINE',
        title: `V2 Pipeline: Generate ${fieldType}`,
        content: {
          fieldType,
          text: typeof result.fieldContent === 'string' ? result.fieldContent : JSON.stringify(result.fieldContent),
          metadata: result.metadata,
          pipelineId: SingleFieldBiblePipeline.id,
          version: '2.0.0'
        },
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      content: result.fieldContent,
      fieldType: result.fieldType,
      suggestionId: suggestion.id,
      metadata: {
        pipelineId: SingleFieldBiblePipeline.id,
        pipelineVersion: '2.0.0',
        totalTime: Date.now() - context.startTime.getTime(),
        stepsExecuted: 1,
        ...result.metadata
      }
    });

  } catch (error: any) {
    console.error('Single Field Generation v2 Pipeline Error:', error);
    
    if (error.message === 'Insufficient credits') {
      return res.status(402).json({ 
        error: 'Insufficient credits', 
        message: 'You need more credits to generate AI content' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate project bible field via v2 pipeline',
      message: error.message
    });
  }
};

// ===== ENTITY GENERATION ENDPOINTS =====

/**
 * Получение доступных типов сущностей для проекта
 * GET /api/ai/entity/types/:projectId
 */
export const getAvailableEntityTypes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required',
        error: 'Validation error'
      });
    }

    console.log(`📋 Getting entity types for project ${projectId}`);

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project',
        error: 'Authorization error'
      });
    }

    const result = await aiService.getAvailableEntityTypes(projectId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get entity types',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Entity types retrieved successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Failed to get entity types:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error getting entity types',
      error: errorMessage
    });
  }
};

/**
 * Предварительная оценка генерации сущности
 * POST /api/ai/entity/estimate
 */
export const estimateEntityGeneration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { projectId, userDescription, preferredEntityType } = req.body;

    // Валидация входных данных
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required and must be a string',
        error: 'Validation error'
      });
    }

    if (!userDescription || typeof userDescription !== 'string' || userDescription.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Entity description is required and must be a non-empty string',
        error: 'Validation error'
      });
    }

    console.log(`💰 Estimating entity generation for project ${projectId}`);

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project',
        error: 'Authorization error'
      });
    }

    const result = await aiService.estimateEntityGeneration(
      projectId,
      userDescription.trim(),
      preferredEntityType
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to estimate entity generation',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Entity generation estimated successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Failed to estimate entity generation:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error estimating entity generation',
      error: errorMessage
    });
  }
};

/**
 * Получение структуры пайплайна
 * GET /api/ai/pipeline/structure?type=entity_generation
 */
export const getPipelineStructure = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    if (!type || typeof type !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Pipeline type is required',
        error: 'Validation error'
      });
    }

    console.log(`📋 Getting pipeline structure for type: ${type}`);

    let structure;
    
    switch (type) {
      case 'entity_generation':
        structure = AdaptedEntityGenerationPipelineInstance.getPipelineStructure();
        break;
        
      case 'comprehensive_bible':
        // Возвращаем структуру нового пайплайна v2 напрямую из пайплайна
        structure = BibleGenerationPipeline.getPipelineStructure();
        break;

      case 'entity_image_generation':
        structure = EntityImageGenerationPipelineV2Instance.getPipelineStructure();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown pipeline type: ${type}`,
          error: 'Validation error',
          availableTypes: ['entity_generation', 'comprehensive_bible', 'entity_image_generation']
        });
    }

    res.json({
      success: true,
      message: 'Pipeline structure retrieved successfully',
      data: structure
    });

  } catch (error) {
    console.error('Failed to get pipeline structure:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error getting pipeline structure',
      error: errorMessage
    });
  }
};

/**
 * Генерация сущности через адаптированный пайплайн V3
 * POST /api/ai/v3/entity/generate
 * 
 * Использует новый StreamingPipelineEngine с проверенными операциями
 */
export const generateEntityV3 = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const teamId = req.teamId;
    const { 
      projectId, 
      userDescription, 
      preferredEntityType,
      additionalContext,
      includeProjectInfo = true,
      includeExistingEntities = true,
      createInDatabase = true,
      priority = 'normal',
      qualityLevel = 'standard' // 'fast' | 'standard' | 'expert'
    } = req.body;

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }

    // Валидация входных данных
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required and must be a string',
        error: 'Validation error'
      });
    }

    if (!userDescription || typeof userDescription !== 'string' || userDescription.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Entity description is required and must be a non-empty string',
        error: 'Validation error'
      });
    }

    if (userDescription.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Entity description must be at least 10 characters long',
        error: 'Validation error'
      });
    }

    // Рассчитываем стоимость пайплайна генерации сущности динамически (используем стандартный уровень качества)
    const pipelineCost = PipelinePricingService.calculatePipelineCost('adapted-entity-generation');
    const creditsNeeded = pipelineCost ? pipelineCost.totalCredits : 15; // fallback на старое значение
    const hasCredits = await creditsService.checkSufficientCredits(userId, creditsNeeded);
    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Insufficient credits for entity generation'
      });
    }

    console.log(`🚀 [V3] Entity generation request from user ${userId} for project ${projectId}`);
    console.log(`📝 Description: "${userDescription.substring(0, 100)}..."`);
    console.log(`⚙️ Quality level: ${qualityLevel}`);

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project',
        error: 'Authorization error'
      });
    }

    // Получаем WebSocketManager
    let wsManager: IWebSocketManager | undefined = undefined;
    try {
      console.log('🔌 Getting WebSocket manager for V3 entity generation...');
      const wsSystem = await getActiveWebSocketSystem();
      wsManager = wsSystem.getContainer().get(WEBSOCKET_TYPES.WebSocketManager) as IWebSocketManager;
      
      if (!wsManager) {
        console.warn('⚠️ WebSocket manager not available, continuing without real-time updates');
      }
    } catch (error) {
      console.error('❌ Failed to get WebSocket manager:', error);
    }

    // Преобразуем qualityLevel в enum
    const qualityMap = {
      'fast': QualityLevel.FAST,
      'standard': QualityLevel.STANDARD,
      'expert': QualityLevel.EXPERT
    };

    const context: any = {
      userId,
      projectId,
      requestId: `entity-gen-v3-${Date.now()}`,
      qualityLevel: qualityMap[qualityLevel as keyof typeof qualityMap] || QualityLevel.STANDARD,
      startTime: new Date(),
      priority: priority as 'low' | 'normal' | 'high',
      userTier: 'business' as const,
      metadata: {
        wsManager: wsManager,
        version: 'v3'
      },
      sharedData: new Map(),
      previousResults: new Map()
    };

    // Запускаем генерацию через адаптированный пайплайн V3
    const result = await aiService.generateEntityV3(
      userId,
      projectId,
      userDescription.trim(),
      context,
      wsManager,
      {
        preferredEntityType,
        customInstructions: additionalContext,
        includeProjectInfo,
        includeExistingEntities,
        createInDatabase
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Entity generation failed',
        error: result.error,
        details: result.details
      });
    }

    // Списываем кредиты после успешного выполнения
    try {
      await creditsService.deductCredits(userId, creditsNeeded, 'Entity generation V3', undefined, teamId);
      console.log(`💳 Deducted ${creditsNeeded} credits for entity V3 generation`);
    } catch (creditsError) {
      console.error('Failed to deduct credits:', creditsError);
      // Не прерываем основную операцию из-за ошибки списания
    }

    // Возвращаем успешный результат
    res.json({
      success: true,
      message: 'Entity generated successfully using V3 pipeline',
      data: result.data,
      metadata: {
        pipeline: 'adapted-entity-generation',
        version: '3.0.0',
        executionTime: result.executionTime,
        stepsCompleted: result.stepsCompleted
      }
    });

  } catch (error) {
    console.error('❌ [V3] Entity generation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during V3 entity generation',
      error: errorMessage
    });
  }
};

// ===== IMAGE GENERATION ENDPOINTS =====

/**
 * Генерация изображения для сущности
 * POST /api/ai/entity/generate-image
 */
export const generateEntityImage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const teamId = req.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: "TeamId не найден в запросе"
      });
    }

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }
    const { 
      projectId, 
      entityId,
      customPrompt,
      aspectRatio = '1:1',
      safetyFilterLevel = 'standard'
    } = req.body;

    // Валидация входных данных
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required and must be a string',
        error: 'Validation error'
      });
    }

    if (!entityId || typeof entityId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Entity ID is required and must be a string',
        error: 'Validation error'
      });
    }

    // Рассчитываем стоимость пайплайна генерации изображения динамически (используем стандартный уровень качества)
    const pipelineCost = PipelinePricingService.calculatePipelineCost('entity-image-generation-pipeline-v2');
    const creditsNeeded = pipelineCost ? pipelineCost.totalCredits : 8; // fallback на старое значение
    const hasCredits = await creditsService.checkSufficientCredits(userId, creditsNeeded);
    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Insufficient credits for entity image generation'
      });
    }

    console.log(`🎨 Image generation request from user ${userId} for entity ${entityId} in project ${projectId}`);

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project',
        error: 'Authorization error'
      });
    }

    // Получаем данные сущности
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        projectId: projectId
      },
      include: {
        values: {
          include: {
            parameter: true
          }
        }
      }
    });

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
        error: 'Entity not found'
      });
    }

    // Строим промпт из данных сущности
    let prompt = '';
    
    // Всегда собираем базовый художественный промпт из полей сущности
    let baseDescription = '';
      
      // Определяем основное описание
      if (entity.description && entity.description.trim()) {
        baseDescription = entity.description.trim();
      } else if (entity.name) {
        baseDescription = entity.name;
      }
      
      // Собираем дополнительные характеристики
      const characteristics: string[] = [];
      
      for (const value of entity.values) {
        if (value.value && value.parameter) {
          const paramName = value.parameter.name.toLowerCase();
          const paramValue = value.value.toString().trim();
          
          // Фильтруем и обрабатываем параметры для художественного описания
          if (!['id', 'created_at', 'updated_at', 'project_id', 'entity_type_id'].includes(paramName) && paramValue) {
            // Обрабатываем разные типы параметров для естественного описания
            if (['age', 'years', 'year'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`${paramValue} years old`);
            } else if (['color', 'colour'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`${paramValue} colored`);
            } else if (['size', 'height', 'width', 'length'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`${paramValue} in size`);
            } else if (['material', 'made', 'composition'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`made of ${paramValue}`);
            } else if (['style', 'appearance', 'look', 'design'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`with ${paramValue} style`);
            } else if (['profession', 'job', 'class', 'role', 'occupation'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`${paramValue}`);
            } else if (['location', 'place', 'origin', 'homeland'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`from ${paramValue}`);
            } else if (['weapon', 'equipment', 'gear'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`wielding ${paramValue}`);
            } else if (['personality', 'trait', 'nature'].some(keyword => paramName.includes(keyword))) {
              characteristics.push(`${paramValue} in nature`);
            } else {
              // Общий случай - добавляем как дескриптор
              characteristics.push(paramValue);
            }
          }
        }
      }
      
      if (!baseDescription && characteristics.length === 0 && (!customPrompt || !customPrompt.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Entity has no content to generate image from and no custom prompt provided.',
          error: 'Insufficient data'
        });
      }
      
      // Собираем естественное описание, если есть данные
      const descriptionParts = [];
      if (baseDescription) {
        descriptionParts.push(baseDescription);
      }
      if (characteristics.length > 0) {
        descriptionParts.push(characteristics.join(', '));
      }
      
      if (descriptionParts.length > 0) {
        const entityDescription = descriptionParts.join(', ');
        
        // Определяем подходящий стиль арта
        let artStyle = 'detailed digital art';
        const lowerDesc = entityDescription.toLowerCase();
        
        if (lowerDesc.includes('character') || lowerDesc.includes('person') || lowerDesc.includes('warrior') || 
            lowerDesc.includes('mage') || lowerDesc.includes('trader') || lowerDesc.includes('hero') ||
            lowerDesc.includes('knight') || lowerDesc.includes('wizard') || lowerDesc.includes('rogue')) {
          artStyle = 'character concept art, portrait style';
        } else if (lowerDesc.includes('weapon') || lowerDesc.includes('sword') || lowerDesc.includes('armor') || 
                   lowerDesc.includes('shield') || lowerDesc.includes('item') || lowerDesc.includes('artifact')) {
          artStyle = 'item illustration, detailed object art';
        } else if (lowerDesc.includes('place') || lowerDesc.includes('location') || lowerDesc.includes('forest') || 
                   lowerDesc.includes('castle') || lowerDesc.includes('city') || lowerDesc.includes('temple')) {
          artStyle = 'environment concept art, landscape';
        } else if (lowerDesc.includes('creature') || lowerDesc.includes('monster') || lowerDesc.includes('beast') || 
                   lowerDesc.includes('dragon') || lowerDesc.includes('animal')) {
          artStyle = 'creature design, fantasy art';
        }
        
        // Создаем оптимизированный промпт без текстовых лейблов
        prompt = `${entityDescription}, ${artStyle}, high quality, detailed, fantasy style, clean background, no text, no labels`;
      } else {
        // Если нет данных сущности, используем базовый промпт
        prompt = 'detailed digital art, high quality, fantasy style, clean background, no text, no labels';
      }

    // Если предоставлен customPrompt, используем его
    if (customPrompt && customPrompt.trim()) {
      const basePrompt = prompt || 'detailed digital art';
      // Комбинируем базовый промпт с пользовательским комментарием
      prompt = `${basePrompt}, ${customPrompt.trim()}`;
      console.log(`💭 Using custom prompt addition: ${customPrompt.trim()}`);
    }

    // Регистрируем операцию если она не зарегистрирована
    if (!OperationRegistry.isRegistered('image_generation')) {
      OperationRegistry.register('image_generation', () => new ImageGenerationOperation());
    }

    // Создаем операцию генерации изображения
    const imageOperation = OperationRegistry.create('image_generation');
    
    // Подготавливаем входные данные
    const input = {
      prompt,
      aspectRatio,
      safetyFilterLevel
    };

    // Контекст выполнения
    const context = {
      userId,
      projectId,
      sessionId: `entity-image-${entityId}-${Date.now()}`,
      requestId: `img-gen-${Date.now()}`,
      startTime: new Date(),
      sharedData: new Map(),
      previousResults: new Map()
    };

    console.log(`🎯 Generating image with prompt: ${prompt.substring(0, 100)}...`);

    // Выполняем генерацию изображения
    const result = await imageOperation.execute(input, context);

    if (!result.success || !result.data) {
      return res.status(400).json({
        success: false,
        message: 'Image generation failed',
        error: result.error || 'Unknown error'
      });
    }

    // Обрабатываем изображение: создаем оптимизированную версию и thumbnail
    const base64Data = result.data.imageBase64;
    
    // Добавляем data:image prefix если его нет
    const dataUrl = base64Data.startsWith('data:') 
      ? base64Data 
      : `data:image/png;base64,${base64Data}`;
      
    // Сохраняем результат без дополнительной обработки (используем GCS upload)
    // TODO: Интегрировать с imageManager для загрузки в GCS после генерации

    // Списываем кредиты после успешного выполнения
    try {
      await creditsService.deductCredits(userId, creditsNeeded, 'Entity image generation', undefined, teamId);
      console.log(`💳 Deducted ${creditsNeeded} credits for entity image generation`);
    } catch (creditsError) {
      console.error('Failed to deduct credits:', creditsError);
      // Не прерываем основную операцию из-за ошибки списания
    }

    // Возвращаем результат с обработанным изображением
    res.json({
      success: true,
      data: {
        entityId,
        prompt,
        processedImage: dataUrl,
        metadata: result.data.metadata,
        cost: result.metadata?.cost || 0,
        tokensUsed: result.metadata?.tokensUsed || 0,
        executionTime: result.metadata?.executionTime || 0
      }
    });

  } catch (error) {
    console.error('Entity image generation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during image generation',
      error: errorMessage
    });
  }
};

/**
 * Генерация изображения для сущности с использованием пайплайна v2
 * POST /api/ai/entity/generate-image-pipeline
 */
export const generateEntityImagePipeline = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const teamId = req.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: "TeamId не найден в запросе"
      });
    }

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }

    const { 
      projectId, 
      entityId,
      customPromptRequirements,
      userSettings,
      imageProvider = 'gemini', // Новый параметр: 'gemini' или 'openai'
      imageQuality = 'medium', // Изменено на medium по умолчанию
      aspectRatio,
      stylePreference,
      processImage = true
    } = req.body;

    // Валидация входных данных
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required and must be a string',
        error: 'Validation error'
      });
    }

    if (!entityId || typeof entityId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Entity ID is required and must be a string',
        error: 'Validation error'
      });
    }

    // Рассчитываем стоимость пайплайна генерации изображения V2 динамически (используем стандартный уровень качества)
    const pipelineCost = PipelinePricingService.calculatePipelineCost('entity-image-generation-pipeline-v2');
    const creditsNeeded = pipelineCost ? pipelineCost.totalCredits : 10; // fallback на старое значение
    const hasCredits = await creditsService.checkSufficientCredits(userId, creditsNeeded);
    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Insufficient credits for image generation via pipeline'
      });
    }

    console.log(`🖼️ Entity image pipeline v2 request from user ${userId} for entity ${entityId} in project ${projectId}`);

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project',
        error: 'Authorization error'
      });
    }

    // Получаем WebSocketManager
    let wsManager: IWebSocketManager | undefined = undefined;
    try {
      console.log('🔌 Attempting to get WebSocket manager for image generation pipeline v2...');
      const wsSystem = await getActiveWebSocketSystem();
      wsManager = wsSystem.getContainer().get(WEBSOCKET_TYPES.WebSocketManager) as IWebSocketManager;
      console.log('✅ WebSocket manager obtained successfully');
    } catch (error) {
      console.warn('⚠️ WebSocket manager not available, continuing without real-time updates');
    }

    // Получаем полные данные сущности
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        projectId: projectId
      },
      include: {
        entityType: true,
        values: {
          include: {
            parameter: true
          }
        }
      }
    });

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
        error: 'Entity not found'
      });
    }

    // Получаем библию проекта
    const projectInfo = await prisma.project.findUnique({
      where: { id: projectId },
      include: { projectInfo: true }
    });

    // Подготавливаем данные сущности (исключаем изображения для экономии токенов)
    const entityData = {
      name: entity.name,
      description: entity.description,
      entityType: {
        id: entity.entityType.id,
        name: entity.entityType.name,
        type: entity.entityType.type
      },
      values: {} as Record<string, any>
    };

    // Собираем значения параметров, исключая изображения (тип MEDIA)
    entity.values.forEach(value => {
      if (value.parameter && value.value !== null) {
        // Исключаем параметры с типом MEDIA чтобы избежать передачи изображений в промпт
        if (value.parameter.valueType !== 'MEDIA') {
          entityData.values[value.parameter.name] = value.value;
        } else {
          // Для MEDIA параметров сохраняем только информацию о наличии медиа
          entityData.values[value.parameter.name] = '[Изображение присутствует]';
        }
      }
    });

    // Подготавливаем библию проекта
    const projectBible = projectInfo?.projectInfo ? {
      synopsis: projectInfo.projectInfo.synopsis,
      logline: projectInfo.projectInfo.logline,
      genres: projectInfo.projectInfo.genres,
      setting: projectInfo.projectInfo.setting,
      atmosphere: projectInfo.projectInfo.atmosphere,
      mainThemes: projectInfo.projectInfo.mainThemes,
      targetAudience: projectInfo.projectInfo.targetAudience,
      references: projectInfo.projectInfo.references,
      uniqueFeatures: projectInfo.projectInfo.uniqueFeatures,
      visualStyle: projectInfo.projectInfo.visualStyle,
      constraints: projectInfo.projectInfo.constraints
    } : {};

    // Подготавливаем входные данные для пайплайна v2
    const input: EntityImageGenerationPipelineInputV2 = EntityImageGenerationPipelineV2Instance.prepareInput(
      { ...entityData, projectId },
      projectBible,
      userSettings,
      customPromptRequirements,
      imageProvider,
      imageQuality,
      aspectRatio,
      stylePreference,
      processImage
    );

    console.log(`🚀 Starting entity image generation pipeline v2 for entity: ${entity.name}`);

    // Создаем контекст выполнения для v2
    const context = {
      userId,
      projectId,
      requestId: `entity-image-pipeline-v2-${entityId}-${Date.now()}`,
      qualityLevel: QualityLevel.STANDARD,
      startTime: new Date(),
      priority: 'normal' as const,
      userTier: 'business' as const,
      metadata: {
        wsManager: wsManager,
        entityId: entityId,
        entityName: entity.name,
        customPromptRequirements: customPromptRequirements || []
      }
    };

    // WebSocket уведомление о начале
    if (wsManager) {
      await wsManager.emitToProject(projectId, {
        type: CollaborationEventType.AI_PIPELINE_STARTED,
        payload: {
          requestId: context.requestId,
          status: 'started',
          currentStep: 'pipeline_start',
          stepName: 'Подготовка пайплайна v2',
          stepDescription: 'Инициализация генерации изображения сущности с новой архитектурой',
          progress: 0,
          startTime: context.startTime,
          estimatedTimeRemaining: 60000,
          metadata: {
            pipelineType: 'entity_image_generation_v2',
            entityName: entity.name,
            entityType: entity.entityType.type,
            version: '2.0.0',
            imageProvider: input.imageProvider,
            imageQuality: input.imageQuality
          }
        },
        userId,
        projectId,
        timestamp: Date.now()
      });
    }

    // Выполняем пайплайн v2
    const result = await executeEntityImageGenerationWithProgress(input, context, wsManager);

    if (!result || !result.finalImage) {
      return res.status(500).json({
        success: false,
        message: 'Image generation pipeline v2 execution failed',
        error: 'No image was generated'
      });
    }

    console.log(`✅ Entity image generation v2 completed for: ${entity.name}`);

    // Списываем кредиты после успешного выполнения
    try {
      await creditsService.deductCredits(userId, creditsNeeded, 'Entity image generation via pipeline V2', undefined, teamId);
      console.log(`💳 Deducted ${creditsNeeded} credits for entity image pipeline generation`);
    } catch (creditsError) {
      console.error('Failed to deduct credits:', creditsError);
      // Не прерываем основную операцию из-за ошибки списания
    }

    // Создаем минимальный AIRequest для совместимости с системой suggestions
    const request = await prisma.aIRequest.create({
      data: {
        userId,
        projectId,
        type: 'GENERATION',
        context: {
          entityId,
          entityName: entity.name,
          pipelineId: EntityImageGenerationPipelineV2Instance.id,
          version: '2.0.0',
          imageProvider: input.imageProvider,
          imageQuality: input.imageQuality
        },
        provider: (imageProvider?.toUpperCase() as AIProvider) || AIProvider.GEMINI,
        status: 'COMPLETED'
      }
    });

    // Создаем suggestion для accept/reject механизма
    const suggestion = await prisma.aISuggestion.create({
      data: {
        requestId: request.id,
        type: 'STRUCTURE_ONLY', // Используем существующий тип, так как ENTITY_IMAGE не определен в схеме
        title: `Изображение для сущности ${entity.name}`,
        content: {
          entityId,
          entityName: entity.name,
          finalImage: result.finalImage,
          stepResults: result.stepResults,
          pipelineType: 'entity_image_generation_v2',
          metadata: {
            pipelineVersion: '2.0.0',
            executionTime: Date.now() - context.startTime.getTime(),
            imageProvider: input.imageProvider,
            imageQuality: input.imageQuality,
            hasProcessedImage: !!result.finalImage?.processedImage
          }
        },
        confidence: result.stepResults?.contextAnalysis?.confidence || 0.8,
        status: 'PENDING',
        userId,
        projectId
      }
    });

    // Возвращаем результат в формате совместимом со старым пайплайном
    const finalImage = result.finalImage;
    const promptResult = result.stepResults?.promptGeneration;
    const contextResult = result.stepResults?.contextAnalysis;
    
    // Формируем processedImage как в старом пайплайне
    const processedImage = finalImage?.processedImage ? {
      original: {
        dataUrl: finalImage.processedImage,
        metadata: {
          width: finalImage.metadata?.width || 1024,
          height: finalImage.metadata?.height || 1024,
          size: finalImage.metadata?.processedFileSize || 0,
          mimeType: 'image/png',
          filename: 'generated-image.png'
        }
      },
      thumbnail: {
        dataUrl: finalImage.processedImage, // Используем то же изображение для совместимости
        metadata: {
          width: Math.min(finalImage.metadata?.width || 1024, 450),
          height: Math.min(finalImage.metadata?.height || 1024, 450),
          size: Math.floor((finalImage.metadata?.processedFileSize || 0) * 0.3),
          mimeType: 'image/png',
          filename: 'generated-image-thumb.png'
        }
      }
    } : null;

    const executionTime = Date.now() - context.startTime.getTime();

    res.json({
      success: true,
      data: {
        entityId,
        prompt: finalImage?.prompt || promptResult?.imagePrompt?.mainPrompt || 'Generated image',
        processedImage, // ← Совместимость со старым клиентом
        metadata: {
          ...finalImage?.metadata,
          pipelineVersion: '2.0.0',
          confidence: contextResult?.confidence || 0,
          promptConfidence: promptResult?.confidence || 0,
          totalCost: 0, // ← Добавляем для совместимости
          executionTime: executionTime // ← Добавляем для совместимости
        },
        cost: 0, // В v2 пока не считаем стоимость
        tokensUsed: 0, // В v2 пока не считаем токены
        executionTime: executionTime,
        // Новая структура для клиента EntityForm.tsx - он ищет finalImage.processedImage
        finalImage: {
          ...result.finalImage,
          processedImage: processedImage // ← Добавляем processedImage в finalImage
        },
        stepResults: result.stepResults,
        suggestionId: suggestion.id
      }
    });

  } catch (error) {
    console.error('Entity image generation pipeline v2 failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during image generation pipeline v2',
      error: errorMessage
    });
  }
};

/**
 * Generate narrative text for a node using v2 pipeline
 * POST /api/ai/narrative/generate-text
 */
export const generateNarrativeText = async (req: Request, res: Response) => {
  try {
    const { 
      nodeData, 
      precedingNodes, 
      generationOptions = {},
      customPromptRequirements = []
    } = req.body;
    const userId = req.user!.id;
    const teamId = req.teamId;

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }

    // Validate required data
    if (!nodeData || !nodeData.id) {
      return res.status(400).json({
        success: false,
        message: 'nodeData with id is required'
      });
    }

    if (!Array.isArray(precedingNodes)) {
      return res.status(400).json({
        success: false,
        message: 'precedingNodes must be an array'
      });
    }

    const projectId = nodeData.projectId || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'projectId is required'
      });
    }

    // Рассчитываем стоимость пайплайна генерации нарративного текста динамически (используем стандартный уровень качества)
    const pipelineCost = PipelinePricingService.calculatePipelineCost('narrative-text-generation-pipeline-v2');
    const creditsNeeded = pipelineCost ? pipelineCost.totalCredits : 5; // fallback на старое значение
    const hasCredits = await creditsService.checkSufficientCredits(userId, creditsNeeded);
    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Insufficient credits for narrative text generation'
      });
    }

    // Check user access to project
    const hasAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project'
      });
    }

    // Получаем библию проекта на бэкенде
    const projectBible = await getProjectInfoService(projectId) || {};

    // Create AI request first
    const aiRequest = await prisma.aIRequest.create({
      data: {
        type: 'GENERATION',
        projectId: projectId,
        userId: userId,
        context: {
          nodeId: nodeData.id,
          nodeTitle: nodeData.title,
          pipelineVersion: '2.0.0'
        },
        provider: AIProvider.GEMINI,
        status: 'PENDING'
      }
    });

    // Create AI suggestion record
    const suggestion = await prisma.aISuggestion.create({
      data: {
        requestId: aiRequest.id,
        type: 'REPHRASE_NARRATIVE', // Use existing type for narrative text generation
        status: 'PENDING',
        projectId: projectId,
        nodeId: nodeData.id,
        userId: userId,
        title: nodeData.title ? `Generate narrative text for node: ${nodeData.title}` : 'Generate narrative text for untitled node',
        content: {
          request: 'generate_narrative_text',
          nodeTitle: nodeData.title || ''
        }
      }
    });

    console.log(`🚀 Starting narrative text generation pipeline v2 for node "${nodeData.title || 'untitled'}" (suggestion: ${suggestion.id})`);

    // Prepare pipeline input
    const input: NarrativeTextGenerationPipelineInputV2 = {
      projectId: projectId,
      nodeData: {
        id: nodeData.id,
        title: nodeData.title,
        existingText: nodeData.existingText,
        attachedEntities: nodeData.attachedEntities || [],
        position: nodeData.position
      },
      precedingNodes: precedingNodes,
      projectBible: projectBible || {},
      generationOptions: {
        targetLength: 'auto',
        preferredTone: 'auto',
        preserveExistingStyle: true,
        includeEntityReferences: true,
        contentRating: 'PG-13',
        ...generationOptions
      },
      userSettings: {},
      customPromptRequirements: customPromptRequirements
    };

    // Execution context
    const context = {
      userId: userId,
      projectId: projectId,
      requestId: suggestion.id,
      qualityLevel: QualityLevel.STANDARD,
      startTime: new Date()
    };

    // Get WebSocket manager for real-time updates
    let wsManager: IWebSocketManager | undefined = undefined;
    try {
      const wsSystem = await getActiveWebSocketSystem();
      wsManager = wsSystem.getContainer().get(WEBSOCKET_TYPES.WebSocketManager) as IWebSocketManager;
    } catch (error) {
      console.warn('Failed to get WebSocket manager:', error);
    }

    // Execute pipeline with progress tracking
    const startTime = Date.now();
    const result = await executeNarrativeTextGenerationWithProgress(
      input,
      context,
      wsManager
    );
    const executionTime = Date.now() - startTime;

    // Update suggestion and request with results
    
    // Extract final text from the pipeline result
    let finalText = null;
    
    // Try to get finalText from the pipeline result
    if (result.finalText && result.finalText.content) {
      finalText = result.finalText;
      console.log('✅ Found finalText in result.finalText');
    }
    // Fallback: try to get from step results
    else if (result.stepResults && result.stepResults.textGeneration) {
      const textGenStep = result.stepResults.textGeneration;
      if (textGenStep.generatedText && textGenStep.generatedText.content) {
        finalText = {
          content: textGenStep.generatedText.content,
          wordCount: textGenStep.generatedText.wordCount || 0,
          estimatedReadingTime: textGenStep.generatedText.estimatedReadingTime || 0,
          appliedStyle: textGenStep.appliedStyle || {},
          contextualReferences: textGenStep.contextualReferences || {},
          safetyApproved: false, // Will be set from safety validation
          contentRating: 'PG-13'
        };
        console.warn('✅ Extracted finalText from stepResults.textGeneration');
      }
    }
    
    // Update AI request
    await prisma.aIRequest.update({
      where: { id: aiRequest.id },
      data: {
        status: finalText ? 'COMPLETED' : 'FAILED',
        result: {
          generatedText: finalText?.content || '',
          wordCount: finalText?.wordCount || 0,
          executionTime: executionTime
        },
        tokensUsed: 100, // Approximate
        creditsCharged: 5,
        responseTime: executionTime
      }
    });

    // Update suggestion
    await prisma.aISuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: finalText ? 'ACCEPTED' : 'REJECTED', // Use valid suggestion statuses
        content: {
          request: 'generate_narrative_text',
          nodeTitle: nodeData.title,
          result: finalText?.content || '',
          wordCount: finalText?.wordCount || 0,
          executionTime: executionTime
        }
      }
    });

    console.log(`✅ Narrative text generation completed in ${executionTime}ms`);

    // Check if we have valid generated text
    if (!finalText || !finalText.content) {
      console.error('❌ No valid text generated by pipeline');
      return res.status(500).json({
        success: false,
        message: 'Failed to generate text: No content produced by AI pipeline',
        data: {},
        debug: {
          finalText: finalText,
          resultKeys: Object.keys(result || {}),
          stepResultsKeys: result.stepResults ? Object.keys(result.stepResults) : []
        }
      });
    }

    // Списываем кредиты после успешного выполнения
    try {
      await creditsService.deductCredits(userId, creditsNeeded, 'Narrative text generation', undefined, teamId);
      console.log(`💳 Deducted ${creditsNeeded} credits for narrative text generation`);
    } catch (creditsError) {
      console.error('Failed to deduct credits:', creditsError);
      // Не прерываем основную операцию из-за ошибки списания
    }

    // Send response compatible with frontend expectations
    res.json({
      success: true,
      message: 'Narrative text generated successfully',
      data: {
        generatedText: finalText.content,
        wordCount: finalText.wordCount || 0,
        appliedStyle: finalText.appliedStyle || {},
        contextualReferences: finalText.contextualReferences || {},
        safetyApproved: finalText.safetyApproved || false,
        contentRating: finalText.contentRating || 'PG-13',
        metadata: {
          executionTime: executionTime,
          pipelineVersion: '2.0.0',
          totalSteps: 5
        },
        stepResults: result.stepResults,
        suggestionId: suggestion.id
      }
    });

  } catch (error) {
    console.error('Narrative text generation pipeline v2 failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during narrative text generation pipeline v2',
      error: errorMessage
    });
  }
};

/**
 * Generate next node using v2 pipeline
 * POST /api/ai/canvas/next-node
 */
export const generateNextNode = async (req: Request, res: Response) => {
  try {
    const {
      nodeData,
      precedingNodes,
      generationOptions = {}
    } = req.body;
    const userId = req.user!.id;
    const teamId = req.teamId;

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }

    // Validate required fields
    if (!nodeData?.id) {
      return res.status(400).json({
        success: false,
        message: 'Node ID is required'
      });
    }

    if (!Array.isArray(precedingNodes)) {
      return res.status(400).json({
        success: false,
        message: 'precedingNodes must be an array'
      });
    }

    // Extract projectId from nodeData or use from request
    const projectId = req.body.projectId || nodeData.projectId;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Рассчитываем стоимость пайплайна генерации следующего узла динамически (используем стандартный уровень качества)
    const pipelineCost = PipelinePricingService.calculatePipelineCost('next-node-generation-pipeline-v2');
    const creditsNeeded = pipelineCost ? pipelineCost.totalCredits : 7; // fallback на старое значение
    const hasCredits = await creditsService.checkSufficientCredits(userId, creditsNeeded);
    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Insufficient credits for next node generation'
      });
    }

    // Check user access to project
    const hasAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project'
      });
    }

    // Получаем библию проекта на бэкенде
    const projectBible = await getProjectInfoService(projectId) || {};

    // Получаем существующие сущности проекта
    const entitiesFromDB = await prisma.entity.findMany({
      where: { projectId },
      include: {
        entityType: {
          select: {
            type: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Ограничиваем количество для производительности
    });

    const existingEntities = entitiesFromDB.map(entity => ({
      id: entity.id,
      name: entity.name,
      type: (entity.entityType?.type || 'object') as 'character' | 'location' | 'object' | 'concept',
      description: entity.description || undefined,
      tags: [] // TODO: Добавить поддержку tags в модель Entity если нужно
    }));

    console.log(`🚀 Starting next node generation pipeline v2 for node "${nodeData.id}" (user: ${userId})`);

    // Create AI request record for tracking
    const aiRequest = await prisma.aIRequest.create({
      data: {
        userId: userId,
        projectId: projectId,
        type: 'GENERATION' as any,
        provider: 'GEMINI' as any,
        context: {
          nodeId: nodeData.id,
          projectId: projectId,
          precedingNodesCount: precedingNodes.length,
          generationOptions: generationOptions
        } as any,
        status: 'PENDING'
      }
    });

    // Create AI suggestion record
    const suggestion = await prisma.aISuggestion.create({
      data: {
        requestId: aiRequest.id,
        type: 'NEXT_NODES',
        status: 'PENDING',
        projectId: projectId,
        nodeId: nodeData.id,
        userId: userId,
        title: `Generate next node after: ${nodeData.title || nodeData.id}`,
        content: {
          request: 'generate_next_node',
          nodeTitle: nodeData.title || '',
          generationOptions: generationOptions
        }
      }
    });

    // Prepare pipeline input
    const pipelineInput: NextNodeGenerationPipelineInputV2 = {
      projectId: projectId,
      currentNodeId: nodeData.id,
      precedingNodes: precedingNodes as PrecedingNodeData[],
      projectBible: projectBible || {},
      existingEntities: existingEntities,
      generationOptions: {
        nodeCount: 1,
        targetLength: 'auto',
        preferredTone: 'auto',
        includeChoices: false,
        includeEntitySuggestions: true,
        ...generationOptions
      },
      userSettings: {
        preferredQuality: QualityLevel.STANDARD,
        creativityLevel: 'moderate'
      }
    };

    // Execution context
    const context = {
      userId: userId,
      projectId: projectId,
      requestId: suggestion.id,
      qualityLevel: QualityLevel.STANDARD,
      startTime: new Date()
    };

    // Get WebSocket manager for real-time updates
    let wsManager: IWebSocketManager | undefined = undefined;
    try {
      const wsSystem = await getActiveWebSocketSystem();
      wsManager = wsSystem.getContainer().get(WEBSOCKET_TYPES.WebSocketManager) as IWebSocketManager;
    } catch (wsError) {
      console.warn('⚠️ WebSocket system not available for real-time updates:', wsError);
    }

    // Execute pipeline with streaming support
    let pipelineResult: NextNodeGenerationPipelineOutputV2;
    
    try {
      pipelineResult = await executeNextNodeGenerationWithProgress(pipelineInput, context, wsManager);
      
      console.log(`✅ Next node generation pipeline completed successfully in ${pipelineResult.pipelineMetadata.totalExecutionTime}ms`);

      // Списываем кредиты после успешного выполнения
      try {
        await creditsService.deductCredits(userId, creditsNeeded, 'Next node generation', undefined, teamId);
        console.log(`💳 Deducted ${creditsNeeded} credits for next node generation`);
      } catch (creditsError) {
        console.error('Failed to deduct credits:', creditsError);
        // Не прерываем основную операцию из-за ошибки списания
      }

      // Update AI request status
      await prisma.aIRequest.update({
        where: { id: aiRequest.id },
        data: { 
          status: 'COMPLETED'
        }
      });

      // Update suggestion status
      await prisma.aISuggestion.update({
        where: { id: suggestion.id },
        data: { 
          status: 'PENDING' as any,
          confidence: pipelineResult.pipelineMetadata.overallConfidence / 100
        }
      });

    } catch (pipelineError) {
      console.error('❌ Next node generation pipeline failed:', pipelineError);
      
      // Update AI request with error
      await prisma.aIRequest.update({
        where: { id: aiRequest.id },
        data: { 
          status: 'FAILED'
        }
      });
      
      throw pipelineError;
    }

    // Send WebSocket notification of completion
    if (wsManager) {
      try {
        wsManager.emitToProject(projectId, {
          type: CollaborationEventType.AI_PIPELINE_COMPLETED,
          payload: {
            suggestionId: suggestion.id,
            pipelineType: 'next_node_generation',
            success: true,
            results: {
              nodesGenerated: pipelineResult.generatedNodes.length,
              executionTime: pipelineResult.pipelineMetadata.totalExecutionTime
            }
          },
          userId: userId,
          projectId: projectId,
          timestamp: Date.now()
        });
      } catch (wsError) {
        console.warn('⚠️ Failed to send WebSocket completion notification:', wsError);
      }
    }

    // Return successful response
    res.json({
      success: true,
      data: pipelineResult,
      metadata: {
        suggestionId: suggestion.id,
        requestId: aiRequest.id,
        executionTime: pipelineResult.pipelineMetadata.totalExecutionTime,
        pipelineVersion: '2.0.0'
      }
    });

  } catch (error: any) {
    console.error('❌ Next node generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during next node generation pipeline v2',
      error: errorMessage
    });
  }
};

/**
 * Перевод нарративного узла через пайплайн v2
 * POST /api/ai/translation/node-pipeline
 */
export const translateNodePipeline = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      nodeId,
      sourceLanguage,
      targetLanguage,
      precedingContext,
      followingContext,
      translationStyle = 'adaptive',
      preserveMarkup = true,
      qualityLevel = 'fast',
      additionalRequirements
    }: TranslateNodePipelineInput = req.body;
    
    const userId = req.user!.id;
    const teamId = req.teamId;

    console.log(`🔄 Translation request: ${sourceLanguage} → ${targetLanguage} for node ${nodeId}`);

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }

    // Проверяем доступ к проекту
    const hasProjectAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasProjectAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к этому проекту'
      });
    }

    // Получаем информацию о проекте и узле
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { projectInfo: true }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Проект не найден'
      });
    }

    // Получаем текст из NodeLocalization (nodeId относится к таблице локализации, не к GraphSnapshot)
    const localizationRecord = await prisma.nodeLocalization.findFirst({
      where: {
        projectId,
        nodeId,
        // Может быть несколько записей для одного узла (разные fieldPath), берем любую с оригинальным текстом
        originalText: { not: '' }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!localizationRecord || !localizationRecord.originalText?.trim()) {
      console.log(`❌ NodeLocalization record not found for nodeId: ${nodeId} in project: ${projectId}`);
      return res.status(400).json({
        success: false,
        message: 'Запись локализации для узла не найдена или текст пуст'
      });
    }

    const originalText = localizationRecord.originalText;
    console.log(`📝 Found text from NodeLocalization: "${originalText.substring(0, 100)}..."`);
    console.log(`📋 Field path: ${localizationRecord.fieldPath}, Layer: ${localizationRecord.layerId}`);

    // Рассчитываем стоимость пайплайна перевода динамически
    const pipelineCost = PipelinePricingService.calculatePipelineCost('translation-pipeline-v2');
    const creditsNeeded = pipelineCost ? pipelineCost.totalCredits : 3; // fallback на базовую стоимость
    
    console.log(`💰 Translation will cost: ${creditsNeeded} credits`);
    
    // Проверяем достаточно ли кредитов перед выполнением
    const hasCredits = await creditsService.checkSufficientCredits(userId, creditsNeeded);
    if (!hasCredits) {
      return res.status(402).json({
        success: false,
        message: 'Недостаточно кредитов для выполнения перевода'
      });
    }

    // Создаем входные данные для пайплайна
    const pipelineInput: TranslationPipelineInputV2 = {
      projectId,
      userDescription: `Перевод узла с ${sourceLanguage} на ${targetLanguage}`,
      originalText,
      sourceLanguage,
      targetLanguage,
      precedingContext,
      followingContext,
      projectBible: project.projectInfo ? {
        synopsis: project.projectInfo.synopsis || undefined,
        genre: project.projectInfo.genres?.join(', ') || undefined,
        setting: project.projectInfo.setting || undefined,
        targetAudience: project.projectInfo.targetAudience || undefined,
        tone: project.projectInfo.atmosphere || undefined
      } : undefined,
      preserveMarkup,
      translationStyle,
      additionalRequirements,
      qualityLevel: qualityLevel as any
    };

    // Валидируем данные пайплайна
    const validatedInput = TranslationPipelineV2.prepareInput(pipelineInput);

    console.log(`⚡ Starting translation pipeline...`);

    // Создаем и выполняем пайплайн
    const pipeline = new TranslationPipelineV2();
    const pipelineEngine = new StreamingPipelineEngine();
    
    const executionContext = {
      userId,
      projectId,
      requestId: `req-translation-${Date.now()}-${userId}`,
      sessionId: `translation-${Date.now()}`,
      qualityLevel: qualityLevel as any,
      startTime: new Date()
    };

    const startTime = Date.now();
    const results = await pipelineEngine.execute(pipeline, validatedInput, executionContext);
    const executionTime = Date.now() - startTime;

    // Обрабатываем результаты (results это Map<string, OperationOutput>)
    const output = TranslationPipelineV2.processOutput(
      results,
      executionContext.qualityLevel,
      executionTime
    );

    console.log(`✅ Translation completed in ${executionTime}ms`);
    console.log(`📊 Translation result: "${output.translation.translatedText.substring(0, 100)}..."`);

    // Создаем запись AI запроса для биллинга
    const aiRequest = await prisma.aIRequest.create({
      data: {
        userId: userId,
        type: 'GENERATION',
        projectId: projectId,
        context: {
          nodeId,
          sourceLanguage,
          targetLanguage,
          translationStyle,
          qualityLevel,
          executionTime,
          pipelineVersion: '2.0.0'
        },
        provider: 'GEMINI',
        tokensUsed: 0, // Будет заполнено пайплайном
        creditsCharged: output.pipelineMetadata.totalCredits,
        status: 'COMPLETED',
        result: {
          translatedText: output.translation.translatedText,
          confidence: output.translation.confidence,
          cost: output.pipelineMetadata.totalCost
        }
      }
    });

    // Создаем запись предложения (для аналитики и истории)
    const suggestion = await prisma.aISuggestion.create({
      data: {
        requestId: aiRequest.id,
        userId: userId,
        projectId: projectId,
        nodeId: nodeId,
        type: 'PIPELINE_OPERATION',
        title: `Translation: ${sourceLanguage} → ${targetLanguage}`,
        content: {
          originalText,
          translatedText: output.translation.translatedText,
          sourceLanguage,
          targetLanguage,
          translationStyle,
          qualityLevel
        },
        confidence: output.translation.confidence,
        status: 'ACCEPTED',
        userFeedback: null,
        appliedAt: new Date()
      }
    });

    console.log(`💰 Billing: $${output.pipelineMetadata.totalCost.toFixed(4)} / ${output.pipelineMetadata.totalCredits} credits`);

    // Списываем кредиты после успешного выполнения
    try {
      await creditsService.deductCredits(userId, creditsNeeded, `Translation: ${sourceLanguage} → ${targetLanguage}`, undefined, teamId);
      console.log(`💳 Deducted ${creditsNeeded} credits for translation`);
    } catch (creditsError) {
      console.error('Failed to deduct credits:', creditsError);
      // Не прерываем основную операцию из-за ошибки списания
    }

    // Возвращаем успешный ответ
    res.json({
      success: true,
      data: output,
      metadata: {
        suggestionId: suggestion.id,
        requestId: aiRequest.id,
        executionTime,
        pipelineVersion: '2.0.0'
      }
    });

  } catch (error: any) {
    console.error('❌ Translation pipeline error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during translation pipeline v2',
      error: errorMessage
    });
  }
};

/**
 * Оценка стоимости пакетного перевода таймлайна
 * POST /api/ai/translation/batch-estimate
 */
export const estimateBatchTranslation = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      timelineId,
      targetLanguage,
      qualityLevel = 'fast',
      skipExisting = true
    }: EstimateBatchTranslationInput = req.body;
    
    const userId = req.user!.id;

    console.log(`💰 Estimating batch translation cost for timeline ${timelineId}`);

    // Проверяем доступ к проекту
    const hasProjectAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasProjectAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к этому проекту'
      });
    }

    // Получаем все тексты таймлайна для перевода
    const allTexts = await localizationService.getTimelineTexts(projectId, timelineId, targetLanguage);
    
    // Фильтруем тексты в зависимости от настроек
    const textsToTranslate = skipExisting 
      ? allTexts.filter(text => !text.translatedText && text.originalText?.trim())
      : allTexts.filter(text => text.originalText?.trim());

    console.log(`📊 Found ${textsToTranslate.length} texts to translate (total: ${allTexts.length})`);

    // Рассчитываем стоимость одного перевода
    const pipelineCost = PipelinePricingService.calculatePipelineCost('translation-pipeline-v2');
    const creditsPerTranslation = pipelineCost ? pipelineCost.totalCredits : 3;
    
    // Общая стоимость
    const totalCredits = textsToTranslate.length * creditsPerTranslation;
    const totalCostUSD = textsToTranslate.length * (pipelineCost?.totalUSD || 0.01);

    // Примерное время выполнения (15 сек на перевод)
    const estimatedDurationMinutes = Math.ceil((textsToTranslate.length * 15) / 60);

    // Проверяем баланс кредитов
    const teamId = req.teamId;
    const userBalance = await creditsService.getUserCreditsBalance(userId, teamId);

    res.json({
      success: true,
      data: {
        totalNodes: allTexts.length,
        nodesToTranslate: textsToTranslate.length,
        alreadyTranslated: allTexts.length - textsToTranslate.length,
        cost: {
          totalCredits,
          creditsPerTranslation,
          totalCostUSD: Number(totalCostUSD.toFixed(4)),
          costPerTranslationUSD: Number((pipelineCost?.totalUSD || 0.01).toFixed(4))
        },
        estimation: {
          durationMinutes: estimatedDurationMinutes,
          durationText: estimatedDurationMinutes < 60 
            ? `~${estimatedDurationMinutes} минут` 
            : `~${Math.ceil(estimatedDurationMinutes / 60)} часов`
        },
        userBalance: {
          available: userBalance.total,
          sufficient: userBalance.total >= totalCredits
        },
        settings: {
          qualityLevel,
          skipExisting
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Batch translation estimation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during batch translation estimation',
      error: errorMessage
    });
  }
};

/**
 * Пакетный перевод таймлайна через пайплайн v2
 * POST /api/ai/translation/batch-timeline
 */
export const batchTranslateTimeline = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      timelineId,
      sourceLanguage,
      targetLanguage,
      translationStyle = 'adaptive',
      preserveMarkup = true,
      qualityLevel = 'fast',
      skipExisting = true,
      additionalRequirements
    }: BatchTranslateTimelineInput = req.body;
    
    const userId = req.user!.id;
    const teamId = req.teamId;

    // Создаем уникальный ID сессии
    const sessionId = `batch-translation-${timelineId}-${Date.now()}`;
    
    console.log(`🚀 Starting batch translation: ${sourceLanguage} → ${targetLanguage} for timeline ${timelineId}, session: ${sessionId}`);

    // Проверяем доступ к ИИ в команде
    const hasAIAccess = await checkAIAccessPermission(userId, teamId);
    if (!hasAIAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к функциям ИИ в этой команде. Обратитесь к администратору команды.'
      });
    }

    // Проверяем доступ к проекту
    const hasProjectAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasProjectAccess) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет доступа к этому проекту'
      });
    }

    // Получаем все тексты таймлайна для перевода
    const allTexts = await localizationService.getTimelineTexts(projectId, timelineId, targetLanguage);
    
    // Фильтруем тексты для перевода
    const textsToTranslate = skipExisting 
      ? allTexts.filter(text => !text.translatedText && text.originalText?.trim())
      : allTexts.filter(text => text.originalText?.trim());

    if (textsToTranslate.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'Все тексты уже переведены или нет текстов для перевода',
          totalProcessed: 0,
          successful: 0,
          failed: 0
        }
      });
    }

    console.log(`📝 Found ${textsToTranslate.length} texts to translate`);

    // Рассчитываем общую стоимость
    const pipelineCost = PipelinePricingService.calculatePipelineCost('translation-pipeline-v2');
    const creditsPerTranslation = pipelineCost ? pipelineCost.totalCredits : 3;
    const totalCredits = textsToTranslate.length * creditsPerTranslation;

    console.log(`💰 Total cost will be: ${totalCredits} credits`);

    // Проверяем кредиты
    const hasCredits = await creditsService.checkSufficientCredits(userId, totalCredits);
    if (!hasCredits) {
      return res.status(402).json({
        success: false,
        message: `Недостаточно кредитов. Требуется: ${totalCredits}, доступно меньше`
      });
    }

    // Получаем информацию о проекте для контекста
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { projectInfo: true }
    });

    const projectBible = project?.projectInfo ? {
      synopsis: project.projectInfo.synopsis || undefined,
      genre: project.projectInfo.genres?.join(', ') || undefined,
      setting: project.projectInfo.setting || undefined,
      targetAudience: project.projectInfo.targetAudience || undefined,
      tone: project.projectInfo.atmosphere || undefined
    } : undefined;

    // Получаем WebSocket manager для отправки прогресса
    let wsManager: IWebSocketManager | undefined = undefined;
    try {
      console.log('🔌 Getting WebSocket manager for batch translation...');
      
      const wsSystem = await getActiveWebSocketSystem();
      wsManager = wsSystem.getContainer().get(WEBSOCKET_TYPES.WebSocketManager) as IWebSocketManager;
      console.log('✅ WebSocket manager obtained successfully');
      
      // Проверяем что Socket.IO инициализирован
      try {
        if (wsManager) {
          wsManager.getIO();
          console.log('✅ Socket.IO is properly initialized');
        }
      } catch (ioError) {
        console.warn('⚠️ Socket.IO not initialized:', ioError);
        wsManager = undefined;
      }
    } catch (error) {
      console.warn('⚠️ Failed to get WebSocket manager:', error);
    }

    const startTime = Date.now();
    
    // Создаем сессию в менеджере
    batchTranslationManager.createSession(
      sessionId,
      userId,
      projectId,
      timelineId,
      textsToTranslate.length
    );
    
    const results = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Последовательно переводим каждый текст
    for (let i = 0; i < textsToTranslate.length; i++) {
      const text = textsToTranslate[i];
      
      // Проверяем отменена ли сессия
      if (batchTranslationManager.isCancelled(sessionId)) {
        console.log(`🛑 Batch translation cancelled by user for session: ${sessionId}`);
        
        // Отправляем уведомление об отмене
        if (wsManager) {
          wsManager.emitToProject(projectId, {
            type: CollaborationEventType.BATCH_TRANSLATION_PROGRESS,
            payload: {
              current: i,
              total: textsToTranslate.length,
              status: 'cancelled',
              sessionId,
              results: {
                successful: results.successful,
                failed: results.failed,
                totalProcessed: results.totalProcessed
              }
            },
            userId: userId,
            projectId: projectId,
            timestamp: Date.now()
          });
        }
        
        break; // Прерываем цикл
      }
      
      try {
        console.log(`🔄 Translating ${i + 1}/${textsToTranslate.length}: ${text.nodeId}`);

        // Отправляем прогресс через WebSocket
        if (wsManager) {
          try {
            wsManager.emitToProject(projectId, {
              type: CollaborationEventType.BATCH_TRANSLATION_PROGRESS,
              payload: {
                current: i + 1,
                total: textsToTranslate.length,
                currentNodeId: text.nodeId,
                status: 'translating',
                sessionId
              },
              userId: userId,
              projectId: projectId,
              timestamp: Date.now()
            });
            console.log(`📡 Sent progress update: ${i + 1}/${textsToTranslate.length}`);
          } catch (wsError) {
            console.warn('⚠️ Failed to send progress update:', wsError);
          }
        }

        // Создаем входные данные для перевода
        const pipelineInput: TranslationPipelineInputV2 = {
          projectId,
          userDescription: `Batch translation: ${sourceLanguage} → ${targetLanguage}`,
          originalText: text.originalText!,
          sourceLanguage,
          targetLanguage,
          precedingContext: text.precedingText,
          followingContext: text.followingText,
          projectBible,
          preserveMarkup,
          translationStyle,
          additionalRequirements,
          qualityLevel: qualityLevel as any
        };

        // Выполняем перевод
        const pipeline = new TranslationPipelineV2();
        const pipelineEngine = new StreamingPipelineEngine();
        
        const executionContext = {
          userId,
          projectId,
          requestId: `batch-translation-${Date.now()}-${i}`,
          sessionId: `batch-translation-${timelineId}`,
          qualityLevel: qualityLevel as any,
          startTime: new Date()
        };

        const validatedInput = TranslationPipelineV2.prepareInput(pipelineInput);
        const pipelineResults = await pipelineEngine.execute(pipeline, validatedInput, executionContext);
        const output = TranslationPipelineV2.processOutput(pipelineResults, executionContext.qualityLevel, 0);

        if (output.translation?.translatedText) {
          // Списываем кредиты сразу после успешного перевода
          const translationCredits = PipelinePricingService.calculateOperationCost('node-translation-v2', qualityLevel as any);
          
          try {
            await creditsService.deductCredits(userId, translationCredits, `Translation: ${text.nodeId}`, undefined, teamId);
            console.log(`💳 Deducted ${translationCredits} credits for node ${text.nodeId}`);
          } catch (creditsError) {
            console.error(`❌ Failed to deduct credits for node ${text.nodeId}:`, creditsError);
            // Продолжаем работу, но логируем ошибку
          }
          
          // Сохраняем перевод в базу данных
          await localizationService.updateTranslation(text.id!, {
            localizationId: text.id!,
            translatedText: output.translation.translatedText,
            method: 'AI_GENERATED',
            quality: output.translation.confidence
          }, userId);

          results.successful++;
          console.log(`✅ Successfully translated ${i + 1}/${textsToTranslate.length}`);
        } else {
          results.failed++;
          results.errors.push(`Node ${text.nodeId}: No translation result`);
          console.warn(`❌ No translation result for ${text.nodeId}`);
        }

      } catch (error: any) {
        results.failed++;
        const errorMsg = `Node ${text.nodeId}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ Translation failed for ${text.nodeId}:`, error);
        // Продолжаем с следующим узлом
      }

      results.totalProcessed++;
      
      // Обновляем прогресс в менеджере
      batchTranslationManager.updateProgress(sessionId, results.totalProcessed, results.successful, results.failed);
    }

    const executionTime = Date.now() - startTime;
    
    // Кредиты теперь списываются индивидуально за каждый успешный узел
    console.log(`💳 Total credits deducted: ${results.successful} (${results.successful} successful translations)`);
    
    // Завершаем сессию или отмечаем как отмененную
    const finalStatus = batchTranslationManager.isCancelled(sessionId) ? 'cancelled' : 'completed';

    // Отправляем финальный прогресс
    if (wsManager) {
      try {
        wsManager.emitToProject(projectId, {
          type: CollaborationEventType.BATCH_TRANSLATION_PROGRESS,
          payload: {
            current: results.totalProcessed,
            total: textsToTranslate.length,
            status: finalStatus,
            sessionId,
            results
          },
          userId: userId,
          projectId: projectId,
          timestamp: Date.now()
        });
        console.log('📡 Sent completion notification');
      } catch (wsError) {
        console.warn('⚠️ Failed to send completion notification:', wsError);
      }
    }

    console.log(`🎉 Batch translation ${finalStatus}: ${results.successful}/${textsToTranslate.length} successful in ${Math.round(executionTime / 1000)}s`);

    // Очищаем сессию из менеджера после задержки
    setTimeout(() => {
      batchTranslationManager.removeSession(sessionId);
    }, 30000); // Удаляем через 30 секунд

    res.json({
      success: true,
      data: {
        ...results,
        executionTime,
        sessionId,
        status: finalStatus,
        creditsUsed: results.successful // Теперь это количество успешно переведенных узлов
      },
      metadata: {
        pipelineVersion: '2.0.0',
        translationSettings: {
          sourceLanguage,
          targetLanguage,
          translationStyle,
          qualityLevel,
          skipExisting
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Batch translation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during batch translation',
      error: errorMessage
    });
  }
};

/**
 * POST /api/ai/translation/batch-cancel - Отменить пакетный перевод
 */
export const cancelBatchTranslation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required' });
    }

    const {
      sessionId,
      projectId
    }: CancelBatchTranslationInput = req.body;

    console.log(`🛑 Cancel batch translation request: sessionId=${sessionId}, projectId=${projectId}, userId=${userId}`);

    // Проверяем доступ к проекту
    const hasAccess = await checkUserProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied to this project' });
    }

    // Отменяем сессию через менеджер
    const cancelled = batchTranslationManager.cancelSession(sessionId);
    
    if (!cancelled) {
      return res.status(404).json({ 
        success: false, 
        message: 'Translation session not found or cannot be cancelled' 
      });
    }

    // Отправляем уведомление об отмене через WebSocket
    try {
      const wsSystem = await getActiveWebSocketSystem();
      const wsManager = wsSystem.getContainer().get(WEBSOCKET_TYPES.WebSocketManager) as IWebSocketManager;
      
      if (wsManager) {
        wsManager.emitToProject(projectId, {
          type: CollaborationEventType.BATCH_TRANSLATION_PROGRESS,
          payload: {
            status: 'cancelled',
            sessionId,
            message: 'Translation cancelled by user'
          },
          userId: userId,
          projectId: projectId,
          timestamp: Date.now()
        });
        console.log('📡 Sent cancellation notification via WebSocket');
      }
    } catch (wsError) {
      console.warn('⚠️ Failed to send cancellation notification:', wsError);
    }

    console.log(`✅ Successfully cancelled batch translation session: ${sessionId}`);

    res.json({
      success: true,
      data: {
        sessionId,
        status: 'cancelled',
        message: 'Translation cancelled successfully'
      }
    });

  } catch (error: any) {
    console.error('❌ Cancel batch translation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Internal error during batch translation cancellation',
      error: errorMessage
    });
  }
}; 