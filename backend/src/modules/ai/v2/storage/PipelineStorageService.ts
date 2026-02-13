// Pipeline Storage Service
// Сервис для работы с хранением результатов выполнения AI пайплайнов

import { PrismaClient } from '@prisma/client';
import {
  CreatePipelineExecutionData,
  CreateStepExecutionData,
  UpdateStepStartData,
  UpdateStepValidationData,
  UpdateStepProviderCallData,
  UpdateStepCompletionData,
  UpdatePipelineCompletionData,
  PipelineExecutionWithSteps,
  DetailedPipelineExecution,
  PipelineExecutionFilter,
  StepExecutionFilter,
  PipelineAnalytics,
  StepAnalytics,
  PipelineExecutionExport
} from './types';
import { AIPipelineStatus, AIPipelineStepStatus } from '@prisma/client';

export class PipelineStorageService {
  constructor(private prisma: PrismaClient) {}

  // === Создание записей ===

  /**
   * Создает новую запись о выполнении пайплайна
   */
  async createPipelineExecution(data: CreatePipelineExecutionData): Promise<string> {
    const execution = await this.prisma.aIPipelineExecution.create({
      data: {
        ...data,
        status: AIPipelineStatus.RUNNING
      }
    });
    return execution.id;
  }

  /**
   * Создает новую запись о выполнении шага пайплайна
   */
  async createStepExecution(data: CreateStepExecutionData): Promise<string> {
    const stepExecution = await this.prisma.aIPipelineStepExecution.create({
      data: {
        ...data,
        input: data.input || {}, // Обеспечиваем что input всегда присутствует
        provider: '', // Заполним позже при начале выполнения
        model: '', // Заполним позже при начале выполнения
        qualityLevel: data.qualityLevel || 'STANDARD',
        status: AIPipelineStepStatus.PENDING
      }
    });
    return stepExecution.id;
  }

  // === Обновление шагов ===

  /**
   * Обновляет шаг при начале выполнения
   */
  async updateStepStart(stepId: string, data: UpdateStepStartData): Promise<void> {
    await this.prisma.aIPipelineStepExecution.update({
      where: { id: stepId },
      data: {
        ...data,
        qualityLevel: data.qualityLevel || 'STANDARD',
        status: AIPipelineStepStatus.RUNNING
      }
    });
  }

  /**
   * Обновляет результаты валидации шага
   */
  async updateStepValidation(stepId: string, data: UpdateStepValidationData): Promise<void> {
    await this.prisma.aIPipelineStepExecution.update({
      where: { id: stepId },
      data
    });
  }

  /**
   * Обновляет результаты вызова AI провайдера
   */
  async updateStepProviderCall(stepId: string, data: UpdateStepProviderCallData): Promise<void> {
    await this.prisma.aIPipelineStepExecution.update({
      where: { id: stepId },
      data
    });
  }

  /**
   * Завершает выполнение шага
   */
  async updateStepCompletion(stepId: string, data: UpdateStepCompletionData): Promise<void> {
    await this.prisma.aIPipelineStepExecution.update({
      where: { id: stepId },
      data
    });
  }

  // === Обновление пайплайна ===

  /**
   * Завершает выполнение пайплайна
   */
  async updatePipelineCompletion(executionId: string, data: UpdatePipelineCompletionData): Promise<void> {
    await this.prisma.aIPipelineExecution.update({
      where: { id: executionId },
      data
    });
  }

  /**
   * Отменяет выполнение пайплайна
   */
  async cancelPipelineExecution(executionId: string, reason?: string): Promise<void> {
    await this.prisma.aIPipelineExecution.update({
      where: { id: executionId },
      data: {
        status: AIPipelineStatus.CANCELLED,
        completedAt: new Date(),
        error: reason ? { 
          name: 'PipelineCancelled', 
          message: reason 
        } : undefined
      }
    });

    // Отменяем все незавершенные шаги
    await this.prisma.aIPipelineStepExecution.updateMany({
      where: {
        executionId,
        status: {
          in: [AIPipelineStepStatus.PENDING, AIPipelineStepStatus.RUNNING]
        }
      },
      data: {
        status: AIPipelineStepStatus.FAILED,
        completedAt: new Date(),
        error: {
          name: 'PipelineCancelled',
          message: 'Pipeline was cancelled'
        }
      }
    });
  }

  // === Получение данных ===

  /**
   * Получает выполнение пайплайна с шагами
   */
  async getPipelineExecution(executionId: string): Promise<PipelineExecutionWithSteps | null> {
    return await this.prisma.aIPipelineExecution.findUnique({
      where: { id: executionId },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' }
        }
      }
    });
  }

  /**
   * Получает детальную информацию о выполнении пайплайна
   */
  async getDetailedPipelineExecution(executionId: string): Promise<DetailedPipelineExecution | null> {
    return await this.prisma.aIPipelineExecution.findUnique({
      where: { id: executionId },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' }
        },
        user: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Получает список выполнений пайплайнов с фильтрацией
   */
  async getPipelineExecutions(
    filter: PipelineExecutionFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<PipelineExecutionWithSteps[]> {
    const where: any = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.pipelineId) where.pipelineId = filter.pipelineId;
    if (filter.status) where.status = filter.status;
    if (filter.requestId) where.requestId = filter.requestId;
    if (filter.dateRange) {
      where.createdAt = {
        gte: filter.dateRange.from,
        lte: filter.dateRange.to
      };
    }

    return await this.prisma.aIPipelineExecution.findMany({
      where,
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Получает выполнения шагов с фильтрацией
   */
  async getStepExecutions(filter: StepExecutionFilter): Promise<any[]> {
    const where: any = {};

    if (filter.executionId) where.executionId = filter.executionId;
    if (filter.operationId) where.operationId = filter.operationId;
    if (filter.status) where.status = filter.status;
    if (filter.provider) where.provider = filter.provider;
    if (filter.model) where.model = filter.model;
    if (filter.hasErrors !== undefined) {
      where.error = filter.hasErrors ? { not: null } : null;
    }

    return await this.prisma.aIPipelineStepExecution.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  // === Аналитика ===

  /**
   * Получает аналитику по пайплайнам
   */
  async getPipelineAnalytics(filter: PipelineExecutionFilter): Promise<PipelineAnalytics> {
    const where: any = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.pipelineId) where.pipelineId = filter.pipelineId;
    if (filter.dateRange) {
      where.createdAt = {
        gte: filter.dateRange.from,
        lte: filter.dateRange.to
      };
    }

    // Базовая статистика по пайплайнам
    const [totalExecutions, successfulExecutions, avgDuration, totalCost] = await Promise.all([
      this.prisma.aIPipelineExecution.count({ where }),
      this.prisma.aIPipelineExecution.count({ 
        where: { ...where, status: AIPipelineStatus.COMPLETED } 
      }),
      this.prisma.aIPipelineExecution.aggregate({
        where: { ...where, totalDuration: { not: null } },
        _avg: { totalDuration: true }
      }),
      this.prisma.aIPipelineExecution.aggregate({
        where,
        _sum: { totalRealCostUSD: true, totalInputTokens: true, totalOutputTokens: true }
      })
    ]);

    // Статистика по операциям
    const operationStats = await this.prisma.aIPipelineStepExecution.groupBy({
      by: ['operationId', 'operationName'],
      where: {},
      _count: { id: true },
      _avg: { duration: true }
    });

    const mostUsedOperations = await Promise.all(
      operationStats.map(async (stat) => {
        const successCount = await this.prisma.aIPipelineStepExecution.count({
          where: {
            operationId: stat.operationId,
            status: AIPipelineStepStatus.COMPLETED
          }
        });
        
        return {
          operationId: stat.operationId,
          operationName: stat.operationName,
          count: stat._count.id,
          averageDuration: stat._avg.duration || 0,
          successRate: successCount / stat._count.id
        };
      })
    );

    // Статистика по провайдерам
    const providerStats = await this.prisma.aIPipelineStepExecution.groupBy({
      by: ['provider'],
      where: {},
      _count: { id: true },
      _sum: { realCostUSD: true, inputTokens: true, outputTokens: true }
    });

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
      averageDuration: avgDuration._avg.totalDuration || 0,
      totalCost: totalCost._sum.totalRealCostUSD || 0,
      totalTokens: (totalCost._sum.totalInputTokens || 0) + (totalCost._sum.totalOutputTokens || 0),
      mostUsedOperations: mostUsedOperations.sort((a, b) => b.count - a.count),
      providerStats: providerStats.map(stat => ({
        provider: stat.provider,
        count: stat._count.id,
        totalCost: stat._sum.realCostUSD || 0,
        averageTokens: ((stat._sum.inputTokens || 0) + (stat._sum.outputTokens || 0)) / stat._count.id
      }))
    };
  }

  /**
   * Получает аналитику по конкретной операции
   */
  async getStepAnalytics(operationId: string, filter?: StepExecutionFilter): Promise<StepAnalytics> {
    const where = { operationId, ...filter };

    const [totalExecutions, successfulExecutions, avgDuration, avgTokens, avgCost] = await Promise.all([
      this.prisma.aIPipelineStepExecution.count({ where }),
      this.prisma.aIPipelineStepExecution.count({ 
        where: { ...where, status: AIPipelineStepStatus.COMPLETED } 
      }),
      this.prisma.aIPipelineStepExecution.aggregate({
        where: { ...where, duration: { not: null } },
        _avg: { duration: true }
      }),
      this.prisma.aIPipelineStepExecution.aggregate({
        where,
        _avg: { inputTokens: true, outputTokens: true }
      }),
      this.prisma.aIPipelineStepExecution.aggregate({
        where,
        _avg: { realCostUSD: true }
      })
    ]);

    // Получаем операцию для имени
    const operation = await this.prisma.aIPipelineStepExecution.findFirst({
      where: { operationId },
      select: { operationName: true }
    });

    // Собираем частые ошибки
    const errorSteps = await this.prisma.aIPipelineStepExecution.findMany({
      where: { ...where, error: { not: null } },
      select: { error: true }
    });

    const errorCounts: Record<string, number> = {};
    errorSteps.forEach(step => {
      if (step.error && typeof step.error === 'object' && 'message' in step.error) {
        const message = (step.error as any).message;
        errorCounts[message] = (errorCounts[message] || 0) + 1;
      }
    });

    const commonErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      operationId,
      operationName: operation?.operationName || operationId,
      totalExecutions,
      successfulExecutions,
      averageDuration: avgDuration._avg.duration || 0,
      averageInputTokens: avgTokens._avg.inputTokens || 0,
      averageOutputTokens: avgTokens._avg.outputTokens || 0,
      averageCost: avgCost._avg.realCostUSD || 0,
      commonErrors
    };
  }

  // === Экспорт данных ===

  /**
   * Экспортирует данные о выполнении пайплайна
   */
  async exportPipelineExecution(executionId: string): Promise<PipelineExecutionExport | null> {
    const execution = await this.getPipelineExecution(executionId);
    if (!execution) return null;

    return {
      id: execution.id,
      pipelineId: execution.pipelineId,
      pipelineName: execution.pipelineName,
      status: execution.status,
      startedAt: execution.startedAt.toISOString(),
      completedAt: execution.completedAt?.toISOString(),
      totalDuration: execution.totalDuration || undefined,
      totalCost: execution.totalRealCostUSD,
      steps: execution.steps.map(step => ({
        stepId: step.stepId,
        operationName: step.operationName,
        status: step.status,
        duration: step.duration || undefined,
        cost: step.realCostUSD || 0,
        provider: step.provider,
        model: step.model
      }))
    };
  }

  // === Очистка данных ===

  /**
   * Обновляет подозрительный контент для шага
   */
  async updateStepSuspiciousContent(stepId: string, suspiciousContent: any): Promise<void> {
    await this.prisma.aIPipelineStepExecution.update({
      where: { id: stepId },
      data: { suspiciousContent }
    });
  }

  /**
   * Удаляет старые записи выполнения пайплайнов
   */
  async cleanupOldExecutions(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.aIPipelineExecution.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }
}
