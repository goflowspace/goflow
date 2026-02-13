import { AIOperation } from '../interfaces/operation.interface';

/**
 * Фабрика операций
 * Следует принципу Dependency Inversion - работаем с абстракциями
 * Следует принципу Single Responsibility - только создание операций
 */
export class OperationRegistry {
  private static operations = new Map<string, () => AIOperation>();

  /**
   * Регистрация операции
   * @param id - уникальный идентификатор операции
   * @param factory - фабричная функция для создания операции
   */
  static register(id: string, factory: () => AIOperation): void {
    if (this.operations.has(id)) {
      console.warn(`⚠️ Operation ${id} is already registered. Overwriting...`);
    }
    
    this.operations.set(id, factory);
    console.log(`✅ Registered operation: ${id}`);
  }

  /**
   * Создание операции по ID
   * @param id - идентификатор операции
   */
  static create(id: string): AIOperation {
    const factory = this.operations.get(id);
    
    if (!factory) {
      throw new Error(`Operation not found: ${id}. Available operations: ${Array.from(this.operations.keys()).join(', ')}`);
    }

    return factory();
  }

  /**
   * Проверка, зарегистрирована ли операция
   * @param id - идентификатор операции
   */
  static isRegistered(id: string): boolean {
    return this.operations.has(id);
  }

  /**
   * Получение списка всех зарегистрированных операций
   */
  static getRegisteredOperations(): string[] {
    return Array.from(this.operations.keys());
  }

  /**
   * Очистка всех зарегистрированных операций (для тестов)
   */
  static clear(): void {
    this.operations.clear();
  }

  /**
   * Получение метаинформации об операции без создания экземпляра
   */
  static getOperationInfo(id: string): { id: string; name: string; category: string; complexity: number } | null {
    const factory = this.operations.get(id);
    
    if (!factory) {
      return null;
    }

    try {
      const operation = factory();
      return {
        id: operation.id,
        name: operation.name,
        category: operation.category,
        complexity: operation.complexity
      };
    } catch (error) {
      console.error(`❌ Failed to get info for operation ${id}:`, error);
      return null;
    }
  }

  /**
   * Массовая регистрация операций
   */
  static registerBatch(operations: Array<{ id: string; factory: () => AIOperation }>): void {
    operations.forEach(({ id, factory }) => {
      this.register(id, factory);
    });
  }
} 