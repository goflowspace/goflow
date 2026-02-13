// backend/src/modules/ai/v2/operations/entities/ProjectContextAnalysisOperationV2.ts
import { 
  DatabaseOperationInput, 
  DatabaseOperationOutput, 
  AbstractDatabaseOperation 
} from '../../../core/AbstractDatabaseOperation';
import { ExecutionContext } from '../../../shared/types';
import { PrismaClient } from '@prisma/client';
import { aiLogger } from '../../../logging';

/**
 * Входные данные для анализа контекста проекта v2
 */
export interface ProjectContextAnalysisInputV2 extends DatabaseOperationInput {
  userDescription: string;
  includeProjectInfo?: boolean;
  includeExistingEntities?: boolean;
}

/**
 * Выходные данные анализа контекста проекта v2
 */
export interface ProjectContextAnalysisOutputV2 extends DatabaseOperationOutput {
  projectId: string;
  availableEntityTypes: Array<{
    id: string;
    type: string;
    name: string;
    description?: string;
    parameters: Array<{
      id: string;
      name: string;
      valueType: string;
      required: boolean;
      order: number;
      optionsTranslations?: any;
    }>;
  }>;
  projectInfo?: {
    about?: string;
    synopsis?: string;
    logline?: string;
    genres?: string[];
    formats?: string[];
    targetAudience?: string;
    mainThemes?: string;
    atmosphere?: string;
    uniqueFeatures?: string;
    keyMessage?: string;
    referenceWorks?: string;
    visualStyle?: string;
    creativeConstraints?: string;
  };
  existingEntities?: Array<{
    id: string;
    name: string;
    description?: string;
    entityTypeId: string;
    entityType: {
      type: string;
      name: string;
    };
  }>;
  entityRelationships?: Array<{
    fromEntityId: string;
    toEntityId: string;
    relationType: string;
  }>;
}

/**
 * Операция анализа контекста проекта v2
 * Использует новую архитектуру v2 без AI провайдеров
 */
export class ProjectContextAnalysisOperationV2 extends AbstractDatabaseOperation<
  ProjectContextAnalysisInputV2,
  ProjectContextAnalysisOutputV2
> {
  readonly id = 'project-context-analysis-v2';
  readonly name = 'Project Context Analysis V2';
  readonly version = '2.0.0';

  constructor() {
    super(new PrismaClient());
  }

  /**
   * Тип операции с БД
   */
  protected getDatabaseOperationType(): string {
    return 'project-context-analysis';
  }



  /**
   * Дополнительная валидация входных данных
   */
  protected validateAdditional(input: ProjectContextAnalysisInputV2): string[] {
    const errors: string[] = [];

    if (!input.projectId || typeof input.projectId !== 'string') {
      errors.push('projectId обязателен и должен быть строкой');
    }

    if (!input.userDescription || typeof input.userDescription !== 'string') {
      errors.push('userDescription обязателен и должен быть строкой');
    }

    return errors;
  }

  /**
   * Основная логика выполнения операции с БД
   */
  protected async executeDatabaseOperation(input: ProjectContextAnalysisInputV2, context: ExecutionContext): Promise<any> {
    const { projectId, includeProjectInfo = true, includeExistingEntities = true } = input;

    try {
      aiLogger.getBaseLogger().info(`🔍 Analyzing project context for project: ${projectId}`, {
        userId: context.userId,
        projectId: context.projectId,
        operationId: this.id
      });

      // 1. Получаем доступные типы сущностей с их параметрами
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

      console.log(`📋 Found ${entityTypes.length} entity types`);

      // Преобразуем в удобный формат
      const availableEntityTypes = entityTypes.map(entityType => ({
        id: entityType.id,
        type: entityType.type,
        name: entityType.name,
        description: entityType.description || undefined,
        parameters: entityType.parameters.map(etp => ({
          id: etp.parameter.id,
          name: etp.parameter.name,
          valueType: etp.parameter.valueType,
          required: etp.required,
          order: etp.order,
          options: etp.parameter.options
        }))
      }));

      const result: ProjectContextAnalysisOutputV2 = {
        projectId,
        availableEntityTypes,
        result: { availableEntityTypes },
        metadata: {
          executionTime: 0, // Будет заполнено в AbstractDatabaseOperation
          type: this.type,
          databaseOperation: this.getDatabaseOperationType(),
          operationId: this.id,
          operationName: this.name,
          operationVersion: this.version
        }
      };

      // 2. Получаем информацию о проекте (опционально)
      if (includeProjectInfo) {
        console.log(`📖 Loading project info for project: ${projectId}`);
        
        const projectInfo = await this.prisma.projectInfo.findUnique({
          where: { projectId }
        });

        if (projectInfo) {
          result.projectInfo = {
            synopsis: projectInfo.synopsis || undefined,
            logline: projectInfo.logline || undefined,
            genres: projectInfo.genres || undefined,
            formats: projectInfo.formats || undefined,
            targetAudience: projectInfo.targetAudience || undefined,
            mainThemes: projectInfo.mainThemes || undefined,
            atmosphere: projectInfo.atmosphere || undefined,
            uniqueFeatures: projectInfo.uniqueFeatures || undefined,
            keyMessage: projectInfo.message || undefined,
            referenceWorks: projectInfo.references || undefined,
            visualStyle: projectInfo.visualStyle || undefined,
            creativeConstraints: projectInfo.constraints || undefined
          };
        }
      }

      // 3. Получаем существующие сущности (опционально)
      if (includeExistingEntities) {
        console.log(`🔗 Loading existing entities for project: ${projectId}`);
        
        const existingEntities = await this.prisma.entity.findMany({
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

        result.existingEntities = existingEntities.map(entity => ({
          id: entity.id,
          name: entity.name,
          description: entity.description || undefined,
          entityTypeId: entity.entityTypeId,
          entityType: entity.entityType
        }));

        console.log(`🔗 Found ${existingEntities.length} existing entities`);
      }

      // 4. Анализируем связи между сущностями (базовый анализ)
      if (includeExistingEntities && result.existingEntities && result.existingEntities.length > 0) {
        console.log(`🕸️ Analyzing entity relationships`);
        
        // Получаем связи из параметров типа SINGLE_ENTITY и MULTI_ENTITY
        const entityValues = await this.prisma.entityValue.findMany({
          where: {
            entity: { projectId },
            parameter: {
              valueType: { in: ['SINGLE_ENTITY', 'MULTI_ENTITY'] }
            }
          },
          include: {
            parameter: true,
            entity: true
          }
        });

        const relationships: Array<{
          fromEntityId: string;
          toEntityId: string;
          relationType: string;
        }> = [];

        for (const value of entityValues) {
          const paramName = value.parameter.name;
          
          if (value.parameter.valueType === 'SINGLE_ENTITY' && value.value && typeof value.value === 'object' && 'entityId' in value.value) {
            const entityValue = value.value as { entityId: string };
            relationships.push({
              fromEntityId: value.entity.id,
              toEntityId: entityValue.entityId,
              relationType: paramName
            });
          } else if (value.parameter.valueType === 'MULTI_ENTITY' && value.value && typeof value.value === 'object' && 'entityIds' in value.value) {
            const entityValue = value.value as { entityIds: string[] };
            const entityIds = Array.isArray(entityValue.entityIds) ? entityValue.entityIds : [];
            for (const entityId of entityIds) {
              relationships.push({
                fromEntityId: value.entity.id,
                toEntityId: entityId,
                relationType: paramName
              });
            }
          }
        }

        result.entityRelationships = relationships;
        console.log(`🔗 Found ${relationships.length} entity relationships`);
      }

      console.log(`✅ Project context analysis completed for project: ${projectId}`);
      
      aiLogger.getBaseLogger().info(`✅ Project context analysis completed: ${projectId}`, {
        userId: context.userId,
        projectId: context.projectId,
        operationId: this.id
      });

      return result;

    } catch (error) {
      aiLogger.getBaseLogger().error('❌ Project context analysis failed', {
        userId: context.userId,
        projectId: context.projectId,
        operationId: this.id
      });
      
      console.error('❌ Project context analysis failed:', error);
      throw new Error(`Project context analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


}
