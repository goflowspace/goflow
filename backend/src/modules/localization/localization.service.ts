import { PrismaClient, ProjectLocalization, NodeLocalization, LocalizationStatus, TranslationMethod, LocalizationHistory, LocalizationChangeType, NodeType, Prisma } from '@prisma/client';

export interface LocalizationConfig {
  baseLanguage: string;
  targetLanguages: string[];
  autoTranslate?: boolean;
  preserveMarkup?: boolean;
  requireReview?: boolean;
  minContextWords?: number;
  maxBatchSize?: number;
}

export interface LocalizableText {
  id?: string;
  nodeId: string;
  nodeType: 'narrative' | 'choice';
  nodeTitle?: string;
  layerId: string;
  layerName?: string;
  fieldPath: string;
  originalText: string;
  translatedText?: string;
  status?: LocalizationStatus;
  method?: TranslationMethod;
  wordCount?: number;
  characterCount?: number;
  contextHash?: string;
  precedingText?: string;
  followingText?: string;
  entityContext?: any;
}

export interface TimelineLocalizationSummary {
  id: string;
  name: string;
  description?: string;
  languageStats: Array<{
    language: string;
    total: number;
    translated: number;
    reviewed: number;
    approved: number;
    progress: number; // 0-100%
  }>;
  overallStatus: 'not_started' | 'in_progress' | 'review_needed' | 'completed';
  lastUpdated: Date;
}

export interface LocalizationStats {
  totalTexts: number;
  totalWords: number;
  totalCharacters: number;
  languageBreakdown: Record<string, {
    total: number;
    translated: number;
    approved: number;
    progress: number;
  }>;
  statusBreakdown: Record<LocalizationStatus, number>;
  methodBreakdown: Record<TranslationMethod, number>;
}

export interface TextScanResult {
  extractedTexts: LocalizableText[];
  newTexts: number;
  updatedTexts: number;
  removedTexts: number;
  totalTexts: number;
  totalWords: number;
  totalCharacters: number;
}

export interface SyncResult {
  timelineId: string;
  scanResult: TextScanResult;
  localizationsCreated: number;
  localizationsUpdated: number;
  localizationsMarkedOutdated: number;
}

export interface TranslationUpdate {
  localizationId: string;
  translatedText: string;
  method: TranslationMethod;
  quality?: number;
  reviewedBy?: string;
}

export interface TranslationContext {
  projectId: string;
  timelineId: string;
  nodeId: string;
  precedingNodes?: Array<{ id: string; text: string; type: string }>;
  followingNodes?: Array<{ id: string; text: string; type: string }>;
  entities?: Array<{ id: string; name: string; type: string }>;
  layerContext?: string;
}

export interface BatchTranslationContext extends TranslationContext {
  preserveMarkup: boolean;
  targetLanguage: string;
  sourceLanguage: string;
}

export interface LocalizationHistoryEntry {
  localizationId: string;
  changeType: LocalizationChangeType;
  field?: string;
  previousValue?: any;
  newValue?: any;
  comment?: string;
  changedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TranslationResult {
  textId: string;
  originalText: string;
  translatedText: string;
  confidence: number;
  method: TranslationMethod;
  errors?: string[];
}

export class LocalizationService {
  private readonly logger = console;

  constructor(private prisma: PrismaClient) {}

  /**
   * Создает или обновляет настройки локализации проекта
   */
  async createOrUpdateProjectLocalization(
    projectId: string,
    config: LocalizationConfig
  ): Promise<ProjectLocalization> {
    return this.prisma.projectLocalization.upsert({
      where: { projectId },
      create: {
        projectId,
        baseLanguage: config.baseLanguage,
        targetLanguages: config.targetLanguages,
        autoTranslate: config.autoTranslate || false,
        preserveMarkup: config.preserveMarkup !== false,
        requireReview: config.requireReview !== false,
        minContextWords: config.minContextWords || 10,
        maxBatchSize: config.maxBatchSize || 50,
      },
      update: {
        baseLanguage: config.baseLanguage,
        targetLanguages: config.targetLanguages,
        autoTranslate: config.autoTranslate,
        preserveMarkup: config.preserveMarkup,
        requireReview: config.requireReview,
        minContextWords: config.minContextWords,
        maxBatchSize: config.maxBatchSize,
      },
    });
  }

  /**
   * Получает настройки локализации проекта
   */
  async getProjectLocalization(projectId: string): Promise<ProjectLocalization | null> {
    return this.prisma.projectLocalization.findUnique({
      where: { projectId },
    });
  }

  /**
   * Добавляет целевой язык в проект
   */
  async addTargetLanguage(projectId: string, language: string): Promise<ProjectLocalization> {
    const localization = await this.getProjectLocalization(projectId);
    if (!localization) {
      throw new Error('Project localization not found');
    }

    if (localization.targetLanguages.includes(language)) {
      throw new Error('Language already exists');
    }

    return this.prisma.projectLocalization.update({
      where: { projectId },
      data: {
        targetLanguages: [...localization.targetLanguages, language],
      },
    });
  }

  /**
   * Удаляет целевой язык из проекта
   */
  async removeTargetLanguage(projectId: string, language: string): Promise<ProjectLocalization> {
    const localization = await this.getProjectLocalization(projectId);
    if (!localization) {
      throw new Error('Project localization not found');
    }

    // Удаляем все локализации для этого языка
    await this.prisma.nodeLocalization.deleteMany({
      where: {
        projectId,
        targetLanguage: language,
      },
    });

    return this.prisma.projectLocalization.update({
      where: { projectId },
      data: {
        targetLanguages: localization.targetLanguages.filter(lang => lang !== language),
      },
    });
  }

  /**
   * Строит контекст для узла (предыдущий и следующий текст)
   */
  private buildNodeContext(
    nodeId: string,
    layerId: string,
    layers: any
  ): { precedingText?: string; followingText?: string } {
    try {
      const layer = layers[layerId];
      if (!layer?.edges) {
        return {};
      }

      const edges = layer.edges || {};
      const nodes = layer.nodes || {};

      // Найти входящие связи (предыдущие узлы)
      let precedingText: string | undefined;
      for (const edge of Object.values(edges)) {
        const edgeData = edge as any;
        
        if (edgeData.endNodeId === nodeId) {
          const sourceNode = nodes[edgeData.startNodeId];
          if (sourceNode?.data?.text) {
            precedingText = sourceNode.data.text.slice(0, 200); // Ограничиваем длину
            break; // Берем первый найденный
          } else if (sourceNode?.data?.title) {
            precedingText = sourceNode.data.title.slice(0, 200);
            break;
          }
        }
      }

      // Найти исходящие связи (следующие узлы)
      let followingText: string | undefined;
      for (const edge of Object.values(edges)) {
        const edgeData = edge as any;
        if (edgeData.startNodeId === nodeId) {
          const targetNode = nodes[edgeData.endNodeId];
          console.log(`[buildNodeContext] Found following node:`, edgeData.endNodeId, targetNode?.data);
          if (targetNode?.data?.text) {
            followingText = targetNode.data.text.slice(0, 200);
            break;
          } else if (targetNode?.data?.title) {
            followingText = targetNode.data.title.slice(0, 200);
            break;
          }
        }
      }

      return { precedingText, followingText };
    } catch (error) {
      console.warn(`Error building context for node ${nodeId}:`, error);
      return {};
    }
  }

  /**
   * Сканирует проект или таймлайн на предмет текстов для локализации
   */
  async scanProjectTexts(
    projectId: string,
    timelineId?: string
  ): Promise<TextScanResult> {
    // Получаем снимок графа из базы данных
    const snapshots = await this.prisma.graphSnapshot.findMany({
      where: {
        projectId,
        ...(timelineId && { id: timelineId }),
      },
    });

    if (snapshots.length === 0) {
      return {
        extractedTexts: [],
        newTexts: 0,
        updatedTexts: 0,
        removedTexts: 0,
        totalTexts: 0,
        totalWords: 0,
        totalCharacters: 0,
      };
    }

    const extractedTexts: LocalizableText[] = [];
    
    for (const snapshot of snapshots) {
      const layers = snapshot.layers as any;
      
      // Извлекаем тексты из всех слоев
      for (const [layerId, layer] of Object.entries(layers || {})) {
        if (typeof layer !== 'object' || !layer) continue;
        
        const layerData = layer as any;
        const nodes = layerData.nodes || {};
        
        for (const [nodeId, node] of Object.entries(nodes)) {
          if (typeof node !== 'object' || !node) continue;
          
          const nodeData = node as any;
          
          // Извлекаем тексты из narrative узлов
          if (nodeData.type === 'narrative' && nodeData.data) {
            // Название узла
            if (nodeData.data.title && nodeData.data.title.trim()) {
              const context = this.buildNodeContext(nodeId, layerId, layers);
              extractedTexts.push({
                nodeId,
                nodeType: 'narrative',
                nodeTitle: nodeData.data.title,
                layerId,
                fieldPath: 'data.title',
                originalText: nodeData.data.title,
                wordCount: this.countWords(nodeData.data.title),
                characterCount: nodeData.data.title.length,
                precedingText: context.precedingText,
                followingText: context.followingText,
              });
            }

            // Текст узла
            if (nodeData.data.text && nodeData.data.text.trim()) {
              const context = this.buildNodeContext(nodeId, layerId, layers);
              extractedTexts.push({
                nodeId,
                nodeType: 'narrative',
                nodeTitle: nodeData.data.title,
                layerId,
                fieldPath: 'data.text',
                originalText: nodeData.data.text,
                wordCount: this.countWords(nodeData.data.text),
                characterCount: nodeData.data.text.length,
                precedingText: context.precedingText,
                followingText: context.followingText,
              });
            }
          }

          // Извлекаем тексты из choice узлов
          if (nodeData.type === 'choice' && nodeData.data) {
            if (nodeData.data.text && nodeData.data.text.trim()) {
              const context = this.buildNodeContext(nodeId, layerId, layers);
              extractedTexts.push({
                nodeId,
                nodeType: 'choice',
                layerId,
                fieldPath: 'data.text',
                originalText: nodeData.data.text,
                wordCount: this.countWords(nodeData.data.text),
                characterCount: nodeData.data.text.length,
                precedingText: context.precedingText,
                followingText: context.followingText,
              });
            }

            // Извлекаем тексты из choices (если есть)
            if (nodeData.choices && Array.isArray(nodeData.choices)) {
              nodeData.choices.forEach((choice: any, index: number) => {
                if (choice && choice.text && choice.text.trim()) {
                  const context = this.buildNodeContext(nodeId, layerId, layers);
                  extractedTexts.push({
                    nodeId,
                    nodeType: 'choice',
                    layerId,
                    fieldPath: `choices.${choice.id || index}.text`,
                    originalText: choice.text,
                    wordCount: this.countWords(choice.text),
                    characterCount: choice.text.length,
                    precedingText: context.precedingText,
                    followingText: context.followingText,
                  });
                }
              });
            }
          }
        }
      }
    }

    const totalWords = extractedTexts.reduce((sum, text) => sum + (text.wordCount || 0), 0);
    const totalCharacters = extractedTexts.reduce((sum, text) => sum + (text.characterCount || 0), 0);

    return {
      extractedTexts,
      newTexts: extractedTexts.length, // TODO: implement proper diff
      updatedTexts: 0,
      removedTexts: 0,
      totalTexts: extractedTexts.length,
      totalWords,
      totalCharacters,
    };
  }

  /**
   * Синхронизирует локализации с текущим состоянием графа
   */
  async syncTranslations(
    projectId: string,
    timelineId?: string
  ): Promise<SyncResult[]> {
    const localization = await this.getProjectLocalization(projectId);
    if (!localization) {
      throw new Error('Project localization not found');
    }

    const scanResult = await this.scanProjectTexts(projectId, timelineId);
    const results: SyncResult[] = [];

    // Если указан конкретный таймлайн, обрабатываем только его
    const timelineIds = timelineId ? [timelineId] : 
      await this.prisma.graphSnapshot.findMany({
        where: { projectId },
        select: { id: true },
      }).then(snapshots => snapshots.map(s => s.id));

    for (const currentTimelineId of timelineIds) {
      let localizationsCreated = 0;
      let localizationsUpdated = 0;
      let localizationsMarkedOutdated = 0;

      // Создаем локализации для каждого целевого языка
      for (const targetLanguage of localization.targetLanguages) {
        for (const text of scanResult.extractedTexts) {
          try {
            // Проверяем, существует ли уже локализация
            const existingLocalization = await this.prisma.nodeLocalization.findUnique({
              where: {
                projectId_timelineId_layerId_nodeId_fieldPath_targetLanguage: {
                  projectId,
                  timelineId: currentTimelineId,
                  layerId: text.layerId,
                  nodeId: text.nodeId,
                  fieldPath: text.fieldPath,
                  targetLanguage,
                },
              },
            });

            if (existingLocalization) {
              // Проверяем, изменился ли оригинальный текст
              if (existingLocalization.originalText !== text.originalText) {
                await this.prisma.nodeLocalization.update({
                  where: { id: existingLocalization.id },
                  data: {
                    originalText: text.originalText,
                    translationStatus: LocalizationStatus.OUTDATED,
                    wordCount: text.wordCount,
                    characterCount: text.characterCount,
                    precedingText: text.precedingText,
                    followingText: text.followingText,
                    lastSyncAt: new Date(),
                  },
                });
                localizationsMarkedOutdated++;
              } else {
                await this.prisma.nodeLocalization.update({
                  where: { id: existingLocalization.id },
                  data: {
                    precedingText: text.precedingText,
                    followingText: text.followingText,
                    lastSyncAt: new Date(),
                  },
                });
                localizationsUpdated++;
              }
            } else {
              // Создаем новую локализацию
              await this.prisma.nodeLocalization.create({
                data: {
                  projectId,
                  timelineId: currentTimelineId,
                  layerId: text.layerId,
                  nodeId: text.nodeId,
                  nodeType: text.nodeType === 'narrative' ? NodeType.NARRATIVE : NodeType.CHOICE,
                  fieldPath: text.fieldPath,
                  baseLanguage: localization.baseLanguage,
                  targetLanguage,
                  originalText: text.originalText,
                  translationStatus: LocalizationStatus.PENDING,
                  wordCount: text.wordCount,
                  characterCount: text.characterCount,
                  precedingText: text.precedingText,
                  followingText: text.followingText,
                  lastSyncAt: new Date(),
                },
              });
              localizationsCreated++;
            }
          } catch (error) {
            this.logger.error(`Error syncing localization for node ${text.nodeId}:`, error);
          }
        }
      }

      results.push({
        timelineId: currentTimelineId,
        scanResult,
        localizationsCreated,
        localizationsUpdated,
        localizationsMarkedOutdated,
      });
    }

    return results;
  }

  /**
   * Получает сводку локализации по таймлайнам
   */
  async getTimelineLocalizationSummary(
    projectId: string
  ): Promise<TimelineLocalizationSummary[]> {
    const localization = await this.getProjectLocalization(projectId);
    if (!localization) {
      return [];
    }

    const timelines = await this.prisma.graphSnapshot.findMany({
      where: { projectId },
      select: { id: true, name: true, description: true, updatedAt: true },
    });

    const summaries: TimelineLocalizationSummary[] = [];

    for (const timeline of timelines) {
      const languageStats = [];

      for (const language of localization.targetLanguages) {
        const stats = await this.prisma.nodeLocalization.groupBy({
          by: ['translationStatus'],
          where: {
            projectId,
            timelineId: timeline.id,
            targetLanguage: language,
          },
          _count: { id: true },
        });

        const total = stats.reduce((sum, stat) => sum + stat._count.id, 0);
        const translated = stats
          .filter(stat => ['TRANSLATED', 'REVIEWED', 'APPROVED', 'PROTECTED'].includes(stat.translationStatus as string))
          .reduce((sum, stat) => sum + stat._count.id, 0);
        const reviewed = stats
          .filter(stat => ['REVIEWED', 'APPROVED', 'PROTECTED'].includes(stat.translationStatus as string))
          .reduce((sum, stat) => sum + stat._count.id, 0);
        const approved = stats
          .filter(stat => ['APPROVED', 'PROTECTED'].includes(stat.translationStatus as string))
          .reduce((sum, stat) => sum + stat._count.id, 0);

        languageStats.push({
          language,
          total,
          translated,
          reviewed,
          approved,
          progress: total > 0 ? Math.round((translated / total) * 100) : 0,
        });
      }

      // Определяем общий статус
      const overallProgress = languageStats.reduce((sum, stat) => sum + stat.progress, 0) / Math.max(languageStats.length, 1);
      let overallStatus: TimelineLocalizationSummary['overallStatus'] = 'not_started';
      
      if (overallProgress === 0) {
        overallStatus = 'not_started';
      } else if (overallProgress < 100) {
        overallStatus = 'in_progress';
      } else {
        overallStatus = 'completed';
      }

      summaries.push({
        id: timeline.id,
        name: timeline.name,
        description: timeline.description || undefined,
        languageStats,
        overallStatus,
        lastUpdated: timeline.updatedAt,
      });
    }

    return summaries;
  }

  /**
   * Получает тексты таймлайна для локализации
   */
  async getTimelineTexts(
    projectId: string,
    timelineId: string,
    targetLanguage?: string
  ): Promise<LocalizableText[]> {
    const where: Prisma.NodeLocalizationWhereInput = {
      projectId,
      timelineId,
      ...(targetLanguage && { targetLanguage }),
    };

    const localizations = await this.prisma.nodeLocalization.findMany({
      where,
      include: {
        translator: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { layerId: 'asc' },
        { nodeId: 'asc' },
        { fieldPath: 'asc' },
      ],
    });

    return localizations.map(loc => ({
      id: loc.id,
      nodeId: loc.nodeId,
      nodeType: loc.nodeType as 'narrative' | 'choice', // Используем сохраненный тип или определяем из fieldPath
      layerId: loc.layerId,
      fieldPath: loc.fieldPath,
      targetLanguage: loc.targetLanguage,
      originalText: loc.originalText,
      translatedText: loc.translatedText || undefined,
      status: loc.translationStatus,
      method: loc.translationMethod || undefined,
      wordCount: loc.wordCount || undefined,
      characterCount: loc.characterCount || undefined,
      contextHash: loc.contextHash || undefined,
      precedingText: loc.precedingText || undefined,
      followingText: loc.followingText || undefined,
      entityContext: loc.entityContext,
    }));
  }

  /**
   * Обновляет перевод
   */
  async updateTranslation(
    localizationId: string,
    update: TranslationUpdate,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<NodeLocalization> {
    // Получаем текущее состояние для истории
    const currentLocalization = await this.prisma.nodeLocalization.findUnique({
      where: { id: localizationId },
    });

    if (!currentLocalization) {
      throw new Error(`Localization with id ${localizationId} not found`);
    }

    const data: any = {
      translatedText: update.translatedText,
      translationMethod: update.method,
      translationStatus: 'TRANSLATED',
      translatedAt: new Date(),
      translatedWords: this.countWords(update.translatedText),
    };

    if (userId) {
      data.translatedBy = userId;
    }

    if (update.quality !== undefined) {
      data.quality = update.quality;
    }

    if (update.reviewedBy) {
      data.reviewedBy = update.reviewedBy;
      data.reviewedAt = new Date();
      data.translationStatus = 'REVIEWED';
    }

    const result = await this.prisma.nodeLocalization.update({
      where: { id: localizationId },
      data,
    });

    // Записываем в историю
    try {
      const historyEntries: LocalizationHistoryEntry[] = [];

      // Запись изменения перевода
      if (currentLocalization.translatedText !== update.translatedText) {
        historyEntries.push({
          localizationId,
          changeType: currentLocalization.translatedText ? 'TRANSLATION_UPDATED' : 'TRANSLATION_CREATED',
          field: 'translatedText',
          previousValue: currentLocalization.translatedText,
          newValue: update.translatedText,
          changedBy: userId,
          ipAddress,
          userAgent,
        });
      }

      // Запись изменения статуса
      if (currentLocalization.translationStatus !== data.translationStatus) {
        historyEntries.push({
          localizationId,
          changeType: 'STATUS_CHANGED',
          field: 'translationStatus',
          previousValue: currentLocalization.translationStatus,
          newValue: data.translationStatus,
          changedBy: userId,
          ipAddress,
          userAgent,
        });
      }

      // Запись изменения качества
      if (update.quality !== undefined && currentLocalization.quality !== update.quality) {
        historyEntries.push({
          localizationId,
          changeType: 'QUALITY_UPDATED',
          field: 'quality',
          previousValue: currentLocalization.quality,
          newValue: update.quality,
          changedBy: userId,
          ipAddress,
          userAgent,
        });
      }

      if (historyEntries.length > 0) {
        await this.recordBulkLocalizationHistory(historyEntries);
      }
    } catch (error) {
      this.logger.error('Failed to record translation update history:', error);
    }

    return result;
  }

  /**
   * Удаляет перевод (очищает переводной текст)
   */
  async deleteTranslation(
    localizationId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<NodeLocalization> {
    // Получаем текущее состояние для истории
    const currentLocalization = await this.prisma.nodeLocalization.findUnique({
      where: { id: localizationId },
    });

    if (!currentLocalization) {
      throw new Error(`Localization with id ${localizationId} not found`);
    }

    const result = await this.prisma.nodeLocalization.update({
      where: { id: localizationId },
      data: {
        translatedText: null,
        translationStatus: 'PENDING',
        translationMethod: null,
        quality: null,
        translatedAt: null,
        translatedBy: userId,
        translatedWords: null,
        reviewedAt: null,
        reviewedBy: null,
        approvedAt: null,
        approvedBy: null,
        updatedAt: new Date()
      }
    });

    // Записываем в историю
    try {
      await this.recordLocalizationHistory({
        localizationId,
        changeType: 'TRANSLATION_DELETED',
        field: 'translatedText',
        previousValue: currentLocalization.translatedText,
        newValue: null,
        comment: 'Translation deleted by user',
        changedBy: userId,
        ipAddress,
        userAgent,
      });

      // Также записываем изменение статуса
      if (currentLocalization.translationStatus !== 'PENDING') {
        await this.recordLocalizationHistory({
          localizationId,
          changeType: 'STATUS_CHANGED',
          field: 'translationStatus',
          previousValue: currentLocalization.translationStatus,
          newValue: 'PENDING',
          changedBy: userId,
          ipAddress,
          userAgent,
        });
      }
    } catch (error) {
      this.logger.error('Failed to record translation deletion history:', error);
    }

    return result;
  }

  /**
   * Массовое обновление переводов
   */
  async bulkUpdateTranslations(
    updates: TranslationUpdate[],
    userId?: string
  ): Promise<{ updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        await this.updateTranslation(update.localizationId, update, userId);
        updated++;
      } catch (error: any) {
        errors.push(`Failed to update ${update.localizationId}: ${error.message || 'Unknown error'}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Получает статистику локализации проекта
   */
  async getLocalizationStats(projectId: string): Promise<LocalizationStats> {
    const localization = await this.getProjectLocalization(projectId);
    if (!localization) {
      return {
        totalTexts: 0,
        totalWords: 0,
        totalCharacters: 0,
        languageBreakdown: {},
        statusBreakdown: {} as Record<LocalizationStatus, number>,
        methodBreakdown: {} as Record<TranslationMethod, number>,
      };
    }

    const [totalStats, statusStats, methodStats, languageStats] = await Promise.all([
      this.prisma.nodeLocalization.aggregate({
        where: { projectId },
        _count: { id: true },
        _sum: { wordCount: true, characterCount: true },
      }),
      this.prisma.nodeLocalization.groupBy({
        by: ['translationStatus'],
        where: { projectId },
        _count: { id: true },
      }),
      this.prisma.nodeLocalization.groupBy({
        by: ['translationMethod'],
        where: { projectId, translationMethod: { not: null } },
        _count: { id: true },
      }),
      this.prisma.nodeLocalization.groupBy({
        by: ['targetLanguage', 'translationStatus'],
        where: { projectId },
        _count: { id: true },
      }),
    ]);

    const languageBreakdown: Record<string, any> = {};
    for (const language of localization.targetLanguages) {
      const langStats = languageStats.filter(stat => stat.targetLanguage === language);
      const total = langStats.reduce((sum, stat) => sum + stat._count.id, 0);
      const translated = langStats
        .filter(stat => ['TRANSLATED', 'REVIEWED', 'APPROVED', 'PROTECTED'].includes(stat.translationStatus as string))
        .reduce((sum, stat) => sum + stat._count.id, 0);
      const approved = langStats
        .filter(stat => ['APPROVED', 'PROTECTED'].includes(stat.translationStatus as string))
        .reduce((sum, stat) => sum + stat._count.id, 0);

      languageBreakdown[language] = {
        total,
        translated,
        approved,
        progress: total > 0 ? Math.round((translated / total) * 100) : 0,
      };
    }

    const statusBreakdown: Record<LocalizationStatus, number> = {} as any;
    for (const status of Object.values(LocalizationStatus)) {
      statusBreakdown[status] = statusStats.find(stat => stat.translationStatus === status)?._count.id || 0;
    }

    const methodBreakdown: Record<TranslationMethod, number> = {} as any;
    for (const method of Object.values(TranslationMethod)) {
      methodBreakdown[method] = methodStats.find(stat => stat.translationMethod === method)?._count.id || 0;
    }

    return {
      totalTexts: totalStats._count.id || 0,
      totalWords: totalStats._sum.wordCount || 0,
      totalCharacters: totalStats._sum.characterCount || 0,
      languageBreakdown,
      statusBreakdown,
      methodBreakdown,
    };
  }

  /**
   * Подсчет слов в тексте
   */
  private countWords(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    
    // Простой подсчет слов (можно улучшить для разных языков)
    return text.trim().split(/\s+/).length;
  }

  /**
   * Записывает изменение в историю локализации
   */
  private async recordLocalizationHistory(
    entry: LocalizationHistoryEntry
  ): Promise<LocalizationHistory> {
    return this.prisma.localizationHistory.create({
      data: {
        localizationId: entry.localizationId,
        changeType: entry.changeType,
        field: entry.field,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        comment: entry.comment,
        changedBy: entry.changedBy,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  /**
   * Записывает массовые изменения в историю локализации
   */
  private async recordBulkLocalizationHistory(
    entries: LocalizationHistoryEntry[]
  ): Promise<void> {
    if (entries.length === 0) return;

    try {
      await this.prisma.localizationHistory.createMany({
        data: entries.map(entry => ({
          localizationId: entry.localizationId,
          changeType: entry.changeType,
          field: entry.field,
          previousValue: entry.previousValue,
          newValue: entry.newValue,
          comment: entry.comment,
          changedBy: entry.changedBy,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        })),
      });
    } catch (error) {
      this.logger.error('Failed to record bulk localization history:', error);
      // Не бросаем ошибку, чтобы не прерывать основную операцию
    }
  }

  /**
   * Удаляет настройки локализации проекта
   */
  async deleteProjectLocalization(projectId: string): Promise<void> {
    // Удаляем все локализации
    await this.prisma.nodeLocalization.deleteMany({
      where: { projectId },
    });

    // Удаляем настройки
    await this.prisma.projectLocalization.delete({
      where: { projectId },
    });
  }

  /**
   * Запускает AI перевод
   */
  async startAITranslation(_projectId: string, _options: any): Promise<{ message: string }> {
    // TODO: Реализовать AI перевод
    return { message: 'AI translation will be implemented later' };
  }

  /**
   * Экспортирует переводы
   */
  async exportTranslations(
    _projectId: string,
    _format?: string,
    _language?: string
  ): Promise<{ message: string }> {
    // TODO: Реализовать экспорт
    return { message: 'Export functionality will be implemented later' };
  }

  /**
   * Импортирует переводы
   */
  async importTranslations(
    _projectId: string,
    _data: any,
    _userId?: string
  ): Promise<{ message: string }> {
    // TODO: Реализовать импорт
    return { message: 'Import functionality will be implemented later' };
  }

  /**
   * Утверждает перевод (меняет статус на APPROVED)
   */
  async approveTranslation(
    localizationId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<NodeLocalization> {
    const localization = await this.prisma.nodeLocalization.findUnique({
      where: { id: localizationId },
    });

    if (!localization) {
      throw new Error(`Localization with id ${localizationId} not found`);
    }

    // Проверяем, что перевод можно утвердить
    if (!['TRANSLATED', 'REVIEWED'].includes(localization.translationStatus)) {
      throw new Error(`Cannot approve translation with status ${localization.translationStatus}. Only TRANSLATED or REVIEWED translations can be approved.`);
    }

    const result = await this.prisma.nodeLocalization.update({
      where: { id: localizationId },
      data: {
        translationStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: userId,
      },
    });

    // Записываем в историю
    try {
      await this.recordLocalizationHistory({
        localizationId,
        changeType: 'TRANSLATION_APPROVED',
        field: 'translationStatus',
        previousValue: localization.translationStatus,
        newValue: 'APPROVED',
        comment: 'Translation approved',
        changedBy: userId,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      this.logger.error('Failed to record translation approval history:', error);
    }

    return result;
  }

  /**
   * Защищает перевод (меняет статус на PROTECTED)
   */
  async protectTranslation(
    localizationId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<NodeLocalization> {
    const localization = await this.prisma.nodeLocalization.findUnique({
      where: { id: localizationId },
    });

    if (!localization) {
      throw new Error(`Localization with id ${localizationId} not found`);
    }

    // Проверяем, что перевод уже утвержден
    if (localization.translationStatus !== 'APPROVED') {
      throw new Error(`Cannot protect translation with status ${localization.translationStatus}. Only APPROVED translations can be protected.`);
    }

    const result = await this.prisma.nodeLocalization.update({
      where: { id: localizationId },
      data: {
        translationStatus: 'PROTECTED',
        protectedAt: new Date(),
        protectedBy: userId,
      },
    });

    // Записываем в историю
    try {
      await this.recordLocalizationHistory({
        localizationId,
        changeType: 'TRANSLATION_PROTECTED',
        field: 'translationStatus',
        previousValue: localization.translationStatus,
        newValue: 'PROTECTED',
        comment: 'Translation protected from changes',
        changedBy: userId,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      this.logger.error('Failed to record translation protection history:', error);
    }

    return result;
  }

  /**
   * Убирает защиту с перевода (возвращает статус APPROVED)
   */
  async unprotectTranslation(
    localizationId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<NodeLocalization> {
    const localization = await this.prisma.nodeLocalization.findUnique({
      where: { id: localizationId },
    });

    if (!localization) {
      throw new Error(`Localization with id ${localizationId} not found`);
    }

    // Проверяем, что перевод защищен
    if (localization.translationStatus !== 'PROTECTED') {
      throw new Error(`Cannot unprotect translation with status ${localization.translationStatus}. Only PROTECTED translations can be unprotected.`);
    }

    const result = await this.prisma.nodeLocalization.update({
      where: { id: localizationId },
      data: {
        translationStatus: 'APPROVED',
        protectedAt: null,
        protectedBy: null,
      },
    });

    // Записываем в историю
    try {
      await this.recordLocalizationHistory({
        localizationId,
        changeType: 'TRANSLATION_UNPROTECTED',
        field: 'translationStatus',
        previousValue: localization.translationStatus,
        newValue: 'APPROVED',
        comment: 'Translation protection removed',
        changedBy: userId,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      this.logger.error('Failed to record translation unprotection history:', error);
    }

    return result;
  }

  // === BULK OPERATIONS ===

  /**
   * Bulk approve multiple translations
   */
  async bulkApproveTranslations(
    localizationIds: string[],
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: string[]; errors: { id: string; error: string }[] }> {
    const success: string[] = [];
    const errors: { id: string; error: string }[] = [];
    const historyEntries: LocalizationHistoryEntry[] = [];

    // Process each localization
    for (const localizationId of localizationIds) {
      try {
        const localization = await this.prisma.nodeLocalization.findUnique({
          where: { id: localizationId },
        });

        if (!localization) {
          errors.push({ id: localizationId, error: 'Localization not found' });
          continue;
        }

        // Check if status transition is valid
        if (!['TRANSLATED', 'REVIEWED'].includes(localization.translationStatus)) {
          errors.push({ 
            id: localizationId, 
            error: `Cannot approve translation with status ${localization.translationStatus}` 
          });
          continue;
        }

        await this.prisma.nodeLocalization.update({
          where: { id: localizationId },
          data: {
            translationStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: userId,
          },
        });

        // Добавляем запись для истории
        historyEntries.push({
          localizationId,
          changeType: 'TRANSLATION_APPROVED',
          field: 'translationStatus',
          previousValue: localization.translationStatus,
          newValue: 'APPROVED',
          comment: 'Bulk approval operation',
          changedBy: userId,
          ipAddress,
          userAgent,
        });

        success.push(localizationId);
      } catch (error) {
        errors.push({ 
          id: localizationId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Записываем историю массово
    if (historyEntries.length > 0) {
      try {
        await this.recordBulkLocalizationHistory(historyEntries);
      } catch (error) {
        this.logger.error('Failed to record bulk approval history:', error);
      }
    }

    return { success, errors };
  }

  /**
   * Bulk protect multiple translations
   */
  async bulkProtectTranslations(
    localizationIds: string[],
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: string[]; errors: { id: string; error: string }[] }> {
    const success: string[] = [];
    const errors: { id: string; error: string }[] = [];
    const historyEntries: LocalizationHistoryEntry[] = [];

    for (const localizationId of localizationIds) {
      try {
        const localization = await this.prisma.nodeLocalization.findUnique({
          where: { id: localizationId },
        });

        if (!localization) {
          errors.push({ id: localizationId, error: 'Localization not found' });
          continue;
        }

        if (localization.translationStatus !== 'APPROVED') {
          errors.push({ 
            id: localizationId, 
            error: `Cannot protect translation with status ${localization.translationStatus}. Only APPROVED translations can be protected.` 
          });
          continue;
        }

        await this.prisma.nodeLocalization.update({
          where: { id: localizationId },
          data: {
            translationStatus: 'PROTECTED',
            protectedAt: new Date(),
            protectedBy: userId,
          },
        });

        // Добавляем запись для истории
        historyEntries.push({
          localizationId,
          changeType: 'TRANSLATION_PROTECTED',
          field: 'translationStatus',
          previousValue: localization.translationStatus,
          newValue: 'PROTECTED',
          comment: 'Bulk protection operation',
          changedBy: userId,
          ipAddress,
          userAgent,
        });

        success.push(localizationId);
      } catch (error) {
        errors.push({ 
          id: localizationId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Записываем историю массово
    if (historyEntries.length > 0) {
      try {
        await this.recordBulkLocalizationHistory(historyEntries);
      } catch (error) {
        this.logger.error('Failed to record bulk protection history:', error);
      }
    }

    return { success, errors };
  }

  /**
   * Bulk unprotect multiple translations
   */
  async bulkUnprotectTranslations(
    localizationIds: string[],
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: string[]; errors: { id: string; error: string }[] }> {
    const success: string[] = [];
    const errors: { id: string; error: string }[] = [];
    const historyEntries: LocalizationHistoryEntry[] = [];

    for (const localizationId of localizationIds) {
      try {
        const localization = await this.prisma.nodeLocalization.findUnique({
          where: { id: localizationId },
        });

        if (!localization) {
          errors.push({ id: localizationId, error: 'Localization not found' });
          continue;
        }

        if (localization.translationStatus !== 'PROTECTED') {
          errors.push({ 
            id: localizationId, 
            error: `Cannot unprotect translation with status ${localization.translationStatus}. Only PROTECTED translations can be unprotected.` 
          });
          continue;
        }

        await this.prisma.nodeLocalization.update({
          where: { id: localizationId },
          data: {
            translationStatus: 'APPROVED',
            protectedAt: null,
            protectedBy: null,
          },
        });

        // Добавляем запись для истории
        historyEntries.push({
          localizationId,
          changeType: 'TRANSLATION_UNPROTECTED',
          field: 'translationStatus',
          previousValue: localization.translationStatus,
          newValue: 'APPROVED',
          comment: 'Bulk unprotection operation',
          changedBy: userId,
          ipAddress,
          userAgent,
        });

        success.push(localizationId);
      } catch (error) {
        errors.push({ 
          id: localizationId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Записываем историю массово
    if (historyEntries.length > 0) {
      try {
        await this.recordBulkLocalizationHistory(historyEntries);
      } catch (error) {
        this.logger.error('Failed to record bulk unprotection history:', error);
      }
    }

    return { success, errors };
  }

  /**
   * Bulk delete multiple translations
   */
  async bulkDeleteTranslations(
    localizationIds: string[],
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: string[]; errors: { id: string; error: string }[] }> {
    const success: string[] = [];
    const errors: { id: string; error: string }[] = [];
    const historyEntries: LocalizationHistoryEntry[] = [];

    for (const localizationId of localizationIds) {
      try {
        const localization = await this.prisma.nodeLocalization.findUnique({
          where: { id: localizationId },
        });

        if (!localization) {
          errors.push({ id: localizationId, error: 'Localization not found' });
          continue;
        }

        // Check if translation is protected
        if (localization.translationStatus === 'PROTECTED') {
          errors.push({ 
            id: localizationId, 
            error: 'Cannot delete protected translation. Remove protection first.' 
          });
          continue;
        }

        // Check if there's something to delete
        if (!localization.translatedText || localization.translatedText.trim() === '') {
          errors.push({ 
            id: localizationId, 
            error: 'No translation to delete' 
          });
          continue;
        }

        await this.prisma.nodeLocalization.update({
          where: { id: localizationId },
          data: {
            translatedText: null,
            translationStatus: 'PENDING',
            translatedAt: null,
            translatedBy: null,
            reviewedAt: null,
            reviewedBy: null,
            approvedAt: null,
            approvedBy: null,
          },
        });

        // Добавляем записи для истории (удаление перевода и изменение статуса)
        historyEntries.push({
          localizationId,
          changeType: 'TRANSLATION_DELETED',
          field: 'translatedText',
          previousValue: localization.translatedText,
          newValue: null,
          comment: 'Bulk deletion operation',
          changedBy: userId,
          ipAddress,
          userAgent,
        });

        // Также записываем изменение статуса, если он изменился
        if (localization.translationStatus !== 'PENDING') {
          historyEntries.push({
            localizationId,
            changeType: 'STATUS_CHANGED',
            field: 'translationStatus',
            previousValue: localization.translationStatus,
            newValue: 'PENDING',
            comment: 'Status changed due to bulk deletion',
            changedBy: userId,
            ipAddress,
            userAgent,
          });
        }

        success.push(localizationId);
      } catch (error) {
        errors.push({ 
          id: localizationId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Записываем историю массово
    if (historyEntries.length > 0) {
      try {
        await this.recordBulkLocalizationHistory(historyEntries);
      } catch (error) {
        this.logger.error('Failed to record bulk deletion history:', error);
      }
    }

    return { success, errors };
  }

  // === ИСТОРИЯ ИЗМЕНЕНИЙ ===

  /**
   * Получает историю изменений для конкретной локализации
   */
  async getLocalizationHistory(
    localizationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LocalizationHistory[]> {
    return this.prisma.localizationHistory.findMany({
      where: { localizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
      skip: offset,
      take: limit,
    });
  }

  /**
   * Получает историю изменений для проекта
   */
  async getProjectLocalizationHistory(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
      changeType?: LocalizationChangeType;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<{
    history: (LocalizationHistory & {
      user: { id: string; name?: string | null; email: string; picture?: string | null } | null;
      localization: {
        nodeId: string;
        layerId: string;
        fieldPath: string;
        targetLanguage: string;
        originalText: string;
        translatedText?: string | null;
      };
    })[];
    total: number;
  }> {
    const { limit = 50, offset = 0, changeType, userId, dateFrom, dateTo } = options;

    const where: any = {
      localization: {
        projectId,
      },
    };

    if (changeType) {
      where.changeType = changeType;
    }

    if (userId) {
      where.changedBy = userId;
    }

    if (dateFrom || dateTo) {
      where.changedAt = {};
      if (dateFrom) {
        where.changedAt.gte = dateFrom;
      }
      if (dateTo) {
        where.changedAt.lte = dateTo;
      }
    }

    const [history, total] = await Promise.all([
      this.prisma.localizationHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
          localization: {
            select: {
              nodeId: true,
              layerId: true,
              fieldPath: true,
              targetLanguage: true,
              originalText: true,
              translatedText: true,
            },
          },
        },
        orderBy: { changedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.localizationHistory.count({ where }),
    ]);

    return { history, total };
  }

  /**
   * Получает историю изменений для таймлайна
   */
  async getTimelineLocalizationHistory(
    projectId: string,
    timelineId: string,
    options: {
      limit?: number;
      offset?: number;
      changeType?: LocalizationChangeType;
      targetLanguage?: string;
    } = {}
  ): Promise<LocalizationHistory[]> {
    const { limit = 50, offset = 0, changeType, targetLanguage } = options;

    const where: any = {
      localization: {
        projectId,
        timelineId,
      },
    };

    if (changeType) {
      where.changeType = changeType;
    }

    if (targetLanguage) {
      where.localization.targetLanguage = targetLanguage;
    }

    return this.prisma.localizationHistory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
        localization: {
          select: {
            nodeId: true,
            layerId: true,
            fieldPath: true,
            targetLanguage: true,
            originalText: true,
            translatedText: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
      skip: offset,
      take: limit,
    });
  }

  /**
   * Получает статистику активности локализации
   */
  async getLocalizationActivityStats(
    projectId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    totalChanges: number;
    changesByType: Record<LocalizationChangeType, number>;
    changesByUser: Array<{
      userId: string;
      userName?: string | null;
      count: number;
    }>;
    changesByDay: Array<{
      date: string;
      count: number;
    }>;
  }> {
    const periodStart = new Date();
    switch (period) {
      case 'day':
        periodStart.setDate(periodStart.getDate() - 1);
        break;
      case 'week':
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
    }

    const [totalChanges, changesByType, changesByUser] = await Promise.all([
      this.prisma.localizationHistory.count({
        where: {
          localization: { projectId },
          changedAt: { gte: periodStart },
        },
      }),
      this.prisma.localizationHistory.groupBy({
        by: ['changeType'],
        where: {
          localization: { projectId },
          changedAt: { gte: periodStart },
        },
        _count: { id: true },
      }),
      this.prisma.localizationHistory.groupBy({
        by: ['changedBy'],
        where: {
          localization: { projectId },
          changedAt: { gte: periodStart },
          changedBy: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    // Получаем информацию о пользователях
    const userIds = changesByUser
      .map((item) => item.changedBy)
      .filter(Boolean) as string[];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, { id: string; name: string | null }>);

    // Формируем статистику изменений по дням
    const changesByDay: Array<{ date: string; count: number }> = [];
    const currentDate = new Date(periodStart);
    const endDate = new Date();

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await this.prisma.localizationHistory.count({
        where: {
          localization: { projectId },
          changedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      changesByDay.push({
        date: currentDate.toISOString().split('T')[0],
        count,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      totalChanges,
      changesByType: changesByType.reduce((acc, item) => {
        acc[item.changeType as LocalizationChangeType] = item._count.id;
        return acc;
      }, {} as Record<LocalizationChangeType, number>),
      changesByUser: changesByUser.map((item) => ({
        userId: item.changedBy!,
        userName: userMap[item.changedBy!]?.name,
        count: item._count.id,
      })),
      changesByDay,
    };
  }
}
