// === Интерфейсы ===
export * from './interfaces/operation.interface';
export * from './interfaces/ai-operation.interface';
export * from './interfaces/pipeline.interface';

// === Базовые классы ===
export * from './base/base-operation';
export * from './base/base-ai-operation';
export * from './base/base-database-operation';
export * from './base/base-pipeline';

// === Engine ===
export * from './engine/simple-pipeline-engine';
export * from './engine/parallel-pipeline-engine';
// === Фабрики ===
export * from './factory/operation-registry';

// === Операции ===
export * from './operations/content-analysis.operation';
export * from './operations/improved-content-analysis.operation';
export * from './operations/project-bible-generation.operation';
export * from './operations/improved-project-bible-generation.operation';
export * from './operations/entity-type-detection.operation';
export * from '../v2/operations/entities/v1/improved-entity-type-detection.operation';
export * from '../v2/operations/entities/v1/improved-entity-field-generation.operation';
export * from './operations/consistency-check.operation';
export * from './operations/improved-consistency-check.operation';
export * from './operations/common/image-generation.operation';

// === Пайплайны ===
export * from './pipelines/project-bible-pipeline';
export * from './pipelines/improved-project-bible-pipeline';
/**
 * Главный экспорт для модуля пайплайнов AI
 * Предоставляет адаптированные пайплайны для работы с новой архитектурой
 */

// Экспортируем адаптированный пайплайн генерации сущностей
export {
  AdaptedEntityGenerationPipeline,
  AdaptedEntityGenerationPipelineInstance,
  createAdaptedEntityGenerationPipeline,
  executeAdaptedEntityGenerationWithProgress,
  quickCreateEntity,
  type AdaptedEntityGenerationInput
} from '../v2/pipelines/adapted-entity-generation-pipeline';

// Экспортируем адаптеры для переиспользования
export {
  LegacyOperationAdapter,
  LegacyOperationFactory
} from './adapters/operation-adapter';

// Экспортируем старые пайплайны для обратной совместимости
export {
  ImprovedEntityGenerationPipeline,
  type ImprovedEntityGenerationInput,
  type ImprovedEntityGenerationOutput
} from './pipelines/improved-entity-generation-pipeline';

// Алиасы для удобства миграции
import { 
  AdaptedEntityGenerationPipelineInstance,
  executeAdaptedEntityGenerationWithProgress,
  type AdaptedEntityGenerationInput
} from '../v2/pipelines/adapted-entity-generation-pipeline';
import { ExecutionContext } from '../v2/shared/types';
import { IWebSocketManager } from '../../websocket/interfaces/websocket.interfaces';

/**
 * Универсальная функция для генерации сущности
 * Использует адаптированный пайплайн с новым движком
 */
export async function generateEntity(
  projectId: string,
  userDescription: string,
  context: ExecutionContext,
  options?: {
    preferredEntityType?: string;
    customInstructions?: string;
    wsManager?: IWebSocketManager;
    createInDatabase?: boolean;
  }
): Promise<any> {
  const input: AdaptedEntityGenerationInput = {
    projectId,
    userDescription,
    preferredEntityType: options?.preferredEntityType,
    customInstructions: options?.customInstructions,
    includeProjectInfo: true,
    includeExistingEntities: true,
    executionOptions: {
      createInDatabase: options?.createInDatabase ?? true
    }
  };
  
  return executeAdaptedEntityGenerationWithProgress(
    input,
    context,
    options?.wsManager
  );
}

/**
 * Экспорт по умолчанию - основной пайплайн
 */
export default AdaptedEntityGenerationPipelineInstance;