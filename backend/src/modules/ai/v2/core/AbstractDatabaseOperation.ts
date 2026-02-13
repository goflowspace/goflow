// backend/src/modules/ai/v2/core/AbstractDatabaseOperation.ts
import { AbstractOperation } from './AbstractOperation';
import {
  OperationInput,
  OperationOutput,
  ExecutionContext,
  OperationType,
} from '../shared/types';
import { PrismaClient } from '@prisma/client';
import { aiLogger } from '../logging';

/**
 * Входные данные для операций с базой данных
 */
export interface DatabaseOperationInput extends OperationInput {
  /** ID проекта для операций с БД */
  projectId: string;
  /** Дополнительные параметры фильтрации */
  filters?: Record<string, any>;
  /** Данные для создания/обновления */
  data?: Record<string, any>;
  /** Опции для транзакций */
  transactionOptions?: {
    timeout?: number;
    isolationLevel?: string;
  };
}

/**
 * Выходные данные для операций с базой данных
 */
export interface DatabaseOperationOutput extends OperationOutput {
  /** Результат операции с БД */
  result?: any;
  /** Количество затронутых записей */
  affectedRows?: number;
  /** Информация о транзакции */
  transactionInfo?: {
    id: string;
    duration: number;
  };
  metadata: {
    executionTime: number;
    type: OperationType.DATABASE;
    databaseOperation: string;
    [key: string]: any;
  };
}

/**
 * Абстрактный базовый класс для операций с базой данных
 * Следует принципам SOLID и предоставляет общую функциональность для БД операций
 */
export abstract class AbstractDatabaseOperation<
  TInput extends DatabaseOperationInput,
  TOutput extends DatabaseOperationOutput
> extends AbstractOperation<TInput, TOutput> {
  
  protected prisma: PrismaClient;
  readonly type = OperationType.DATABASE;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  /**
   * Абстрактный метод для определения типа операции с БД
   */
  protected abstract getDatabaseOperationType(): string;

  /**
   * Абстрактный метод для выполнения операции с БД
   */
  protected abstract executeDatabaseOperation(input: TInput, context: ExecutionContext): Promise<any>;

  /**
   * Реализация основной логики выполнения операции
   */
  protected async executeOperation(input: TInput, context: ExecutionContext): Promise<TOutput> {
    const operationType = this.getDatabaseOperationType();
    const startTime = Date.now();

    try {
      // Логируем начало операции с БД
      aiLogger.getBaseLogger().info(`🗃️ Database operation started: ${operationType}`, {
        userId: context.userId,
        projectId: context.projectId,
        operationId: this.id
      });

      // Выполняем операцию с базой данных
      const result = await this.executeDatabaseOperation(input, context);
      const executionTime = Date.now() - startTime;

      // Логируем успешное выполнение
      aiLogger.getBaseLogger().info(`✅ Database operation completed: ${operationType}`, {
        userId: context.userId,
        projectId: context.projectId,
        operationId: this.id
      });

      return {
        result,
        affectedRows: this.extractAffectedRows(result),
        metadata: {
          executionTime,
          type: OperationType.DATABASE,
          databaseOperation: operationType,
          operationId: this.id,
          operationName: this.name,
          operationVersion: this.version
        }
      } as unknown as TOutput;

    } catch (error) {
      // Логируем ошибку
      aiLogger.getBaseLogger().error(`❌ Database operation failed: ${operationType}`, {
        userId: context.userId,
        projectId: context.projectId,
        operationId: this.id
      });

      throw new Error(`Database operation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Извлекает количество затронутых записей из результата
   */
  protected extractAffectedRows(result: any): number | undefined {
    if (typeof result === 'object' && result !== null) {
      if ('count' in result) return result.count;
      if (Array.isArray(result)) return result.length;
    }
    return undefined;
  }

  /**
   * Оценка стоимости для операций с БД (обычно минимальная)
   */
  async estimateCost(_input: TInput, _context: ExecutionContext): Promise<{realCostUSD: number, credits: number}> {
    // Database операции обычно дешевы
    return { realCostUSD: 0.001, credits: 1 };
  }

  /**
   * Выполнение операции в транзакции
   */
  protected async executeInTransaction<T>(
    operations: (prisma: PrismaClient) => Promise<T>,
    options?: TInput['transactionOptions']
  ): Promise<T> {
    
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        return await operations(tx as PrismaClient);
      }, {
        timeout: options?.timeout || 30000
      });

      aiLogger.getBaseLogger().debug('📊 Database transaction completed', {
        operationId: this.id
      });

      return result as T;
    } catch (error) {
      aiLogger.getBaseLogger().error('❌ Database transaction failed', {
        operationId: this.id
      });

      throw error;
    }
  }

  /**
   * Проверка существования записи
   */
  protected async checkRecordExists(
    model: string,
    where: any
  ): Promise<boolean> {
    try {
      const count = await (this.prisma as any)[model].count({ where });
      return count > 0;
    } catch (error) {
      aiLogger.getBaseLogger().error(`Error checking if ${model} exists`, {
        operationId: this.id
      });
      return false;
    }
  }

  /**
   * Безопасное закрытие соединения с БД
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      aiLogger.getBaseLogger().warn('Warning: Failed to disconnect from database', {
        operationId: this.id
      });
    }
  }
}
