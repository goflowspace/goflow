import { BaseOperation } from '../../../../pipeline/base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../../../../pipeline/interfaces/operation.interface';
import { PrismaClient } from '@prisma/client';

/**
 * Входные данные для анализа контекста проекта
 */
interface ProjectContextAnalysisInput {
  projectId: string;
  includeProjectInfo?: boolean;  // Включать информацию о проекте (жанры, синопсис и т.д.)
  includeExistingEntities?: boolean;  // Включать существующие сущности для связей
}

/**
 * Результат анализа контекста проекта
 */
interface ProjectContextAnalysisOutput {
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
  content?: string; // Для pipeline engine
  explanation?: string; // Для pipeline engine
}

/**
 * Операция для анализа контекста проекта
 * Собирает всю необходимую информацию для генерации сущностей
 */
export class ProjectContextAnalysisOperation extends BaseOperation {
  private prisma: PrismaClient;

  constructor() {
    super(
      'project_context_analysis',
      'Project Context Analysis',
      '1.0.0',
      AIOperationCategory.CONTENT_ANALYSIS,
      ComplexityLevel.SIMPLE,
      {
        requiredCapabilities: [],
        maxTokens: 0, // Не требует AI провайдера
        timeout: 10000
      }
    );
    this.prisma = new PrismaClient();
  }

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input) {
      errors.push('Input is required');
    }

    if (!input.projectId) {
      errors.push('Project ID is required');
    }

    if (typeof input.projectId !== 'string') {
      errors.push('Project ID must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(
    input: ProjectContextAnalysisInput,
    _context: ExecutionContext
  ): Promise<{ data: ProjectContextAnalysisOutput; tokensUsed?: number; model?: string }> {
    const { projectId, includeProjectInfo = true, includeExistingEntities = true } = input;

    try {
      console.log(`🔍 Analyzing project context for project: ${projectId}`);

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
          optionsTranslations: (etp.parameter as any).optionsTranslations
        }))
      }));

      const result: ProjectContextAnalysisOutput = {
        projectId,
        availableEntityTypes
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

      return {
        data: {
          ...result,
          content: `Проанализирован контекст проекта: найдено ${result.availableEntityTypes.length} типов сущностей${result.existingEntities ? `, ${result.existingEntities.length} существующих сущностей` : ''}`,
          explanation: `Загружена информация о проекте: ${result.availableEntityTypes.length} доступных типов сущностей${result.projectInfo ? ', информация о проекте' : ''}${result.existingEntities ? `, ${result.existingEntities.length} существующих сущностей` : ''}${result.entityRelationships ? `, ${result.entityRelationships.length} связей между сущностями` : ''}`
        },
        tokensUsed: 0, // Не используем AI провайдера
        model: 'database-analysis'
      };

    } catch (error) {
      console.error('❌ Project context analysis failed:', error);
      throw new Error(`Project context analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected calculateCustomCost(_input: any, _context: ExecutionContext): number {
    // Эта операция не использует AI провайдера, поэтому стоимость 0
    return 0;
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}