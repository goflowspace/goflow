// backend/src/modules/ai/v2/operations/database/EntitySaveOperation.ts
import { AbstractDatabaseOperation, DatabaseOperationInput, DatabaseOperationOutput } from '../../core/AbstractDatabaseOperation';
import { ExecutionContext, OperationType } from '../../shared/types';

/**
 * Входные данные для сохранения сущности
 */
export interface EntitySaveInput extends DatabaseOperationInput {
  projectId: string;
  entityData: {
    name: string;
    entityTypeId: string;
    description?: string;
    fields: Array<{
      name: string;
      parameterId?: string;
      type: string;
      value: any;
      metadata?: any;
    }>;
    metadata?: any;
  };
  updateIfExists?: boolean;
}

/**
 * Выходные данные операции сохранения сущности
 */
export interface EntitySaveOutput extends DatabaseOperationOutput {
  entity: any;
  fields: any[];
  isNewEntity: boolean;
  message: string;
  metadata: {
    executionTime: number;
    type: OperationType.DATABASE;
    databaseOperation: string;
    [key: string]: any;
  };
}

/**
 * Операция для сохранения сущности в базе данных
 * Используется после AI операций для сохранения сгенерированных данных
 */
export class EntitySaveOperation extends AbstractDatabaseOperation<
  EntitySaveInput,
  EntitySaveOutput
> {
  
  get id(): string {
    return 'entity-save';
  }

  get name(): string {
    return 'Entity Save';
  }

  get version(): string {
    return '1.0.0';
  }

  protected getDatabaseOperationType(): string {
    return 'INSERT/UPDATE';
  }

  protected async validateInput(input: EntitySaveInput): Promise<string[]> {
    const errors: string[] = [];

    if (!input.projectId) {
      errors.push('Project ID is required');
    }

    if (!input.entityData) {
      errors.push('Entity data is required');
    } else {
      if (!input.entityData.name) {
        errors.push('Entity name is required');
      }

      if (!input.entityData.entityTypeId) {
        errors.push('Entity type ID is required');
      }

      if (!Array.isArray(input.entityData.fields)) {
        errors.push('Entity fields must be an array');
      }
    }

    // Проверяем уникальность имен полей
    if (input.entityData.fields) {
      const fieldNames = input.entityData.fields.map(f => f.name);
      const uniqueNames = new Set(fieldNames);
      if (fieldNames.length !== uniqueNames.size) {
        errors.push('Field names must be unique within an entity');
      }
    }

    return errors;
  }

  protected async executeDatabaseOperation(
    input: EntitySaveInput,
    context: ExecutionContext
  ): Promise<any> {
    try {
      console.log('🔍 Starting entity save operation without transaction');
      console.log('🔍 this.prisma available:', !!this.prisma);
      console.log('🔍 this.prisma.entity available:', !!this.prisma.entity);
      
      // Проверяем права доступа к проекту
      const project = await this.prisma.project.findUnique({
        where: { 
          id: input.projectId
        }
      });

      if (!project) {
        throw new Error(`Project with id ${input.projectId} not found`);
      }

      if (project.creatorId !== context.userId) {
        throw new Error('Access denied to project');
      }

      let entity;
      let isNewEntity = true;

      // Проверяем, существует ли сущность с таким именем
      const existingEntity = await this.prisma.entity.findFirst({
        where: {
          projectId: input.projectId,
          name: input.entityData.name
        }
      });

      if (existingEntity) {
        if (!input.updateIfExists) {
          throw new Error(`Entity with name "${input.entityData.name}" already exists`);
        }
        
        // Обновляем существующую сущность
        entity = await this.prisma.entity.update({
          where: { id: existingEntity.id },
          data: {
            description: input.entityData.description,
            entityTypeId: input.entityData.entityTypeId,
            updatedAt: new Date()
          }
        });

        // Удаляем старые значения полей
        await this.prisma.entityValue.deleteMany({
          where: { entityId: entity.id }
        });

        isNewEntity = false;
      } else {
        // Создаем новую сущность
        entity = await this.prisma.entity.create({
          data: {
            projectId: input.projectId,
            name: input.entityData.name,
            description: input.entityData.description,
            entityTypeId: input.entityData.entityTypeId
          }
        });
      }

      // Создаем значения полей сущности (используем EntityValue модель согласно схеме)
      const fields = await Promise.all(
        input.entityData.fields.map(async (fieldData) => {
          let parameterId = fieldData.parameterId;
          
          // Если parameterId не передан, ищем или создаем параметр
          if (!parameterId) {
            let parameter = await this.prisma.entityParameter.findFirst({
              where: {
                projectId: input.projectId,
                name: fieldData.name
              }
            });

            if (!parameter) {
              // Создаем новый параметр если его нет
              parameter = await this.prisma.entityParameter.create({
                data: {
                  projectId: input.projectId,
                  name: fieldData.name,
                  valueType: fieldData.type === 'basic' ? 'SHORT_TEXT' : 'TEXT' // Простое маппирование типов
                }
              });
            }
            
            parameterId = parameter.id;
          }

          // Создаем значение поля
          return this.prisma.entityValue.create({
            data: {
              entityId: entity.id,
              parameterId: parameterId,
              value: fieldData.value
            }
          });
        })
      );

      return {
        entity,
        fields,
        isNewEntity,
        message: isNewEntity ? 'Entity created successfully' : 'Entity updated successfully',
        metadata: {
          executionTime: 0, // Будет заполнено базовым классом
          type: OperationType.DATABASE,
          databaseOperation: 'INSERT/UPDATE'
        }
      };

    } catch (error) {
      console.error('❌ Error in entity save operation:', error);
      throw new Error(`Failed to save entity: ${(error as Error).message}`);
    }
  }
}