// backend/src/modules/ai/v2/operations/database/ProjectDataFetchOperation.ts
import { AbstractDatabaseOperation, DatabaseOperationInput, DatabaseOperationOutput } from '../../core/AbstractDatabaseOperation';
import { ExecutionContext } from '../../shared/types';
import { ValidationSchema } from '../../validation/ValidationTypes';

/**
 * Входные данные для получения данных проекта
 */
export interface ProjectDataFetchInput extends DatabaseOperationInput {
  projectId: string;
  includeEntities?: boolean;
  includeNodes?: boolean;
  includeBible?: boolean;
}

/**
 * Выходные данные операции получения данных проекта
 */
export interface ProjectDataFetchOutput extends DatabaseOperationOutput {
  result: {
    project: any;
    entities?: any[];
    entityTypes?: any[];
    nodes?: any[];
    bible?: any;
  };
}

/**
 * Операция для получения данных проекта из базы данных
 * Используется как dependency для AI операций, которым нужны данные проекта
 */
export class ProjectDataFetchOperation extends AbstractDatabaseOperation<
  ProjectDataFetchInput,
  ProjectDataFetchOutput
> {
  readonly id = 'project-data-fetch';
  readonly name = 'Project Data Fetch';
  readonly version = '1.0.0';

  protected getDatabaseOperationType(): string {
    return 'SELECT';
  }

  protected getValidationSchema(): ValidationSchema {
    return {
      projectId: {
        type: 'string',
        required: true,
        minLength: 1
      },
      includeEntities: {
        type: 'boolean',
        required: false
      },
      includeNodes: {
        type: 'boolean', 
        required: false
      },
      includeBible: {
        type: 'boolean',
        required: false
      }
    };
  }

  protected validateAdditional(_input: ProjectDataFetchInput): string[] {
    const errors: string[] = [];

    return errors;
  }

  protected async executeDatabaseOperation(
    input: ProjectDataFetchInput,
    context: ExecutionContext
  ): Promise<any> {
    try {      
      // Получаем основную информацию о проекте
      let project;
      try {
        project = await this.prisma.project.findUnique({
          where: { 
            id: input.projectId
          }
        });
      } catch (findError) {
        console.error('🔍 Error in findUnique:', findError);
        throw findError;
      }

      // Проверяем права доступа
      if (project && project.creatorId !== context.userId) {
        console.error('🔍 Access denied to project');
        throw new Error('Access denied to project');
      }

      if (!project) {
        console.error(`Project with id ${input.projectId} not found or access denied`);
        throw new Error(`Project with id ${input.projectId} not found or access denied`);
      }

      const result: any = { project };

      // Опционально загружаем сущности
      if (input.includeEntities) {
        try {
          result.entities = await this.prisma.entity.findMany({
            where: { projectId: input.projectId }
          });
        } catch (entitiesError) {
          console.error('🔍 Error loading entities:', entitiesError);
          throw entitiesError;
        }

        // Также загружаем типы сущностей с их параметрами
        try {
          result.entityTypes = await this.prisma.entityType.findMany({
            where: { projectId: input.projectId },
            include: {
              parameters: {
                include: {
                  parameter: true
                },
                orderBy: {
                  order: 'asc'
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          });
        } catch (entityTypesError) {
          console.error('🔍 Error loading entity types:', entityTypesError);
          throw entityTypesError;
        }
      }

      // Опционально загружаем библию проекта (она хранится в ProjectInfo)
      if (input.includeBible) {
        result.bible = await this.prisma.projectInfo.findUnique({
          where: { projectId: input.projectId }
        });
      }

      return result;

    } catch (error) {
      console.error('🔍 Error in executeDatabaseOperation:', error);
      throw new Error(`Failed to fetch project data: ${(error as Error).message}`);
    }
  }
}
