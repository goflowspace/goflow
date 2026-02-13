// AI Pipeline Storage System
// Экспорт всех компонентов системы хранения результатов AI пайплайнов

export * from './types';
export * from './PipelineStorageService';
export * from './PipelineStorageAdapter';
export * from './PipelineExecutionCollector';
export * from './StorageContext';

// Singleton instance для использования в приложении
import { PrismaClient } from '@prisma/client';
import { PipelineStorageService } from './PipelineStorageService';

let pipelineStorageServiceInstance: PipelineStorageService | null = null;

/**
 * Получает singleton экземпляр PipelineStorageService
 */
export function getPipelineStorageService(prisma?: PrismaClient): PipelineStorageService {
  if (!pipelineStorageServiceInstance) {
    if (!prisma) {
      throw new Error('PrismaClient instance is required for first initialization');
    }
    pipelineStorageServiceInstance = new PipelineStorageService(prisma);
  }
  return pipelineStorageServiceInstance;
}
