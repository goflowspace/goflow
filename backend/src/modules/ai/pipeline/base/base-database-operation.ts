import { BaseOperation } from './base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  OperationRequirements 
} from '../interfaces/operation.interface';
import { PrismaClient } from '@prisma/client';

/**
 * Абстрактный базовый класс для операций с базой данных
 * Следует принципам SOLID:
 * - SRP: Отвечает только за работу с базой данных
 * - OCP: Легко расширяется новыми операциями БД
 * - DIP: Использует абстракцию Prisma Client
 */
export abstract class BaseDatabaseOperation extends BaseOperation {

  protected prisma: PrismaClient;

  constructor(
    id: string,
    name: string,
    version: string,
    category: AIOperationCategory,
    complexity: ComplexityLevel,
    requirements: OperationRequirements
  ) {
    super(id, name, version, category, complexity, requirements);
    this.prisma = new PrismaClient();
  }

  /**
   * Переопределенный метод выполнения для операций с БД
   */
  protected async executeOperation(
    input: any, 
    context: ExecutionContext
  ): Promise<{ data: any; tokensUsed?: number; model?: string }> {
    
    try {
      // Выполняем операцию с базой данных
      const result = await this.executeDatabaseOperation(input, context);
      
      return {
        data: result,
        tokensUsed: 0, // Операции БД не используют токены
        model: 'database-operation'
      };

    } catch (error) {
      console.error(`❌ Database operation ${this.id} failed:`, error);
      throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Проверяет, требует ли операция AI провайдера (всегда false для БД операций)
   */
  requiresAI(): boolean {
    return false;
  }

  /**
   * Базовая оценка стоимости (обычно низкая для БД операций)
   */
  estimateCost(input: any, context: ExecutionContext): number {
    const baseCost = super.estimateCost(input, context);
    // БД операции обычно дешевле AI операций
    return Math.max(1, Math.ceil(baseCost * 0.5));
  }

  /**
   * Абстрактный метод для выполнения операции с базой данных
   */
  protected abstract executeDatabaseOperation(input: any, context: ExecutionContext): Promise<any>;

  /**
   * Помощник для безопасного закрытия соединения с БД
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      console.warn('Warning: Failed to disconnect from database:', error);
    }
  }

  /**
   * Помощник для выполнения транзакции
   */
  protected async executeInTransaction<T>(
    operations: (prisma: any) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      return await operations(tx);
    });
  }

  /**
   * Помощник для проверки существования записи
   */
  protected async checkRecordExists(
    model: string, 
    where: any
  ): Promise<boolean> {
    try {
      const count = await (this.prisma as any)[model].count({ where });
      return count > 0;
    } catch (error) {
      console.error(`Error checking if ${model} exists:`, error);
      return false;
    }
  }

  /**
   * Помощник для логирования операции БД
   */
  protected logDatabaseOperation(
    operation: string, 
    details: any, 
    context: ExecutionContext
  ): void {
    console.log(`🗃️ Database Operation: ${operation}`, {
      operationId: this.id,
      userId: context.userId,
      projectId: context.projectId,
      details,
      timestamp: new Date().toISOString()
    });
  }
}