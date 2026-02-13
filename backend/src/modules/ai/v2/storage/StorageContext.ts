// Storage Context for AI Operations
// Контекст хранения для передачи storage adapter в операции

import { PipelineStorageAdapter } from './PipelineStorageAdapter';

/**
 * Глобальный контекст для передачи storage adapter в операции
 * Используется для интеграции детального логирования операций
 */
export class StorageContext {
  private static instance: StorageContext | null = null;
  private storageAdapter: PipelineStorageAdapter | null = null;
  private currentStepId: string | null = null;

  static getInstance(): StorageContext {
    if (!StorageContext.instance) {
      StorageContext.instance = new StorageContext();
    }
    return StorageContext.instance;
  }

  /**
   * Устанавливает storage adapter для текущего выполнения пайплайна
   */
  setStorageAdapter(adapter: PipelineStorageAdapter | null): void {
    this.storageAdapter = adapter;
  }

  /**
   * Устанавливает ID текущего выполняемого шага
   */
  setCurrentStepId(stepId: string | null): void {
    this.currentStepId = stepId;
  }

  /**
   * Получает storage adapter
   */
  getStorageAdapter(): PipelineStorageAdapter | null {
    return this.storageAdapter;
  }

  /**
   * Получает ID текущего шага
   */
  getCurrentStepId(): string | null {
    return this.currentStepId;
  }

  /**
   * Проверяет, доступен ли storage adapter
   */
  isStorageAvailable(): boolean {
    return this.storageAdapter !== null && this.currentStepId !== null;
  }

  /**
   * Сбрасывает контекст
   */
  reset(): void {
    this.storageAdapter = null;
    this.currentStepId = null;
  }
}
