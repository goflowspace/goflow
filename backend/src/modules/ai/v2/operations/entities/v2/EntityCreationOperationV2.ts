// backend/src/modules/ai/v2/operations/entities/EntityCreationOperationV2.ts
import { 
  DatabaseOperationInput, 
  DatabaseOperationOutput, 
  AbstractDatabaseOperation 
} from '../../../core/AbstractDatabaseOperation';
import { ExecutionContext } from '../../../shared/types';
import { PrismaClient } from '@prisma/client';
import { aiLogger } from '../../../logging';

/**
 * Входные данные для создания сущности v2
 */
export interface EntityCreationInputV2 extends DatabaseOperationInput {
  entityName: string;
  entityDescription?: string;
  selectedEntityType: {
    id: string;
    type: string;
    name: string;
  };
  generatedFields: Record<string, any>;
  suggestedRelationships?: Array<{
    targetEntityId: string;
    targetEntityName: string;
    relationType: string;
    reason: string;
  }>;
}

/**
 * Выходные данные создания сущности v2
 */
export interface EntityCreationOutputV2 extends DatabaseOperationOutput {
  createdEntity: {
    id: string;
    name: string;
    description?: string;
    entityTypeId: string;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  createdValues: Array<{
    id: string;
    parameterId: string;
    parameterName: string;
    value: any;
  }>;
  establishedRelationships?: Array<{
    fromEntityId: string;
    toEntityId: string;
    relationType: string;
  }>;
  warnings?: string[];
}

/**
 * Операция создания сущности v2
 * Использует новую архитектуру с AbstractDatabaseOperation
 */
export class EntityCreationOperationV2 extends AbstractDatabaseOperation<
  EntityCreationInputV2,
  EntityCreationOutputV2
> {
  readonly id = 'entity-creation-v2';
  readonly name = 'Entity Creation V2';
  readonly version = '2.0.0';

  constructor() {
    super(new PrismaClient());
  }

  /**
   * Тип операции с БД
   */
  protected getDatabaseOperationType(): string {
    return 'entity-creation';
  }

  /**
   * Дополнительная валидация входных данных
   */
  protected validateAdditional(input: EntityCreationInputV2): string[] {
    const errors: string[] = [];

    if (!input.projectId || typeof input.projectId !== 'string') {
      errors.push('projectId обязателен и должен быть строкой');
    }

    if (!input.entityName || typeof input.entityName !== 'string') {
      errors.push('entityName обязателен и должен быть строкой');
    }

    if (input.entityName && input.entityName.trim().length < 2) {
      errors.push('entityName должен быть не менее 2 символов');
    }

    if (!input.selectedEntityType || !input.selectedEntityType.id) {
      errors.push('selectedEntityType с id обязателен');
    }

    if (!input.generatedFields || typeof input.generatedFields !== 'object') {
      errors.push('generatedFields обязателен и должен быть объектом');
    }

    return errors;
  }



  /**
   * Проверка уникальности имени сущности в проекте
   */
  private async checkEntityNameUniqueness(
    projectId: string,
    entityName: string,
    entityTypeId: string
  ): Promise<boolean> {
    const existingEntity = await this.prisma.entity.findFirst({
      where: {
        projectId,
        entityTypeId,
        name: {
          equals: entityName,
          mode: 'insensitive'
        }
      }
    });

    return !existingEntity;
  }



  /**
   * Переопределение метода executeDatabaseOperation для добавления дополнительных проверок
   */
  protected async executeDatabaseOperation(input: EntityCreationInputV2, context: ExecutionContext): Promise<any> {
    // Проверяем уникальность имени
    const isUnique = await this.checkEntityNameUniqueness(
      input.projectId,
      input.entityName,
      input.selectedEntityType.id
    );

    if (!isUnique) {
      throw new Error(`Сущность с именем "${input.entityName}" уже существует в этом проекте`);
    }

    // Выполняем основную логику создания
    const warnings: string[] = [];

    try {
      // Проверяем существование типа сущности
      const entityType = await this.prisma.entityType.findUnique({
        where: { id: input.selectedEntityType.id },
        include: {
          parameters: {
            include: {
              parameter: true
            },
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!entityType) {
        throw new Error(`Тип сущности с ID ${input.selectedEntityType.id} не найден`);
      }

      if (entityType.projectId !== input.projectId) {
        throw new Error(`Тип сущности не принадлежит проекту ${input.projectId}`);
      }

      // Выполняем операцию в транзакции
      const result = await this.executeInTransaction(async (tx) => {
        // 1. Создаем сущность
        const createdEntity = await tx.entity.create({
          data: {
            name: input.entityName.trim(),
            description: input.entityDescription?.trim() || null,
            entityTypeId: input.selectedEntityType.id,
            projectId: input.projectId
          }
        });

        aiLogger.getBaseLogger().info(`✅ Entity created: ${createdEntity.name}`, {
          userId: context.userId,
          projectId: context.projectId,
          operationId: this.id
        });

        // 2. Фильтруем параметры, оставляя только те, которые существуют в типе сущности
        const validParametersMap = new Map(
          entityType.parameters.map(etp => [etp.parameter.id, etp])
        );

        // Фильтруем только валидные параметры
        const validFields: Record<string, any> = {};
        for (const [paramId, value] of Object.entries(input.generatedFields)) {
          const entityTypeParam = validParametersMap.get(paramId);
          
          if (!entityTypeParam) {
            warnings.push(`Параметр с ID ${paramId} не существует в типе сущности "${entityType.name}" - игнорирован`);
            continue;
          }
          
          validFields[paramId] = value;
        }

        // 3. Создаем значения параметров
        const createdValues: Array<{
          id: string;
          parameterId: string;
          parameterName: string;
          value: any;
        }> = [];

        for (const [paramId, value] of Object.entries(validFields)) {
          const entityTypeParam = validParametersMap.get(paramId)!; // Уже проверили выше
          
          if (value === null || value === undefined) {
            if (entityTypeParam.required) {
              warnings.push(`Обязательный параметр ${entityTypeParam.parameter.name} пустой`);
            }
            continue;
          }

          try {
            const createdValue = await tx.entityValue.create({
              data: {
                entityId: createdEntity.id,
                parameterId: paramId,
                value: value
              }
            });

            createdValues.push({
              id: createdValue.id,
              parameterId: paramId,
              parameterName: entityTypeParam.parameter.name,
              value: value
            });

          } catch (error) {
            warnings.push(`Ошибка создания значения для параметра ${entityTypeParam.parameter.name}: ${(error as Error).message}`);
          }
        }

        console.log(`📝 Created ${createdValues.length} entity values`);

        // 4. Устанавливаем связи (если есть)
        const establishedRelationships: Array<{
          fromEntityId: string;
          toEntityId: string;
          relationType: string;
        }> = [];

        if (input.suggestedRelationships && input.suggestedRelationships.length > 0) {
          for (const relationship of input.suggestedRelationships) {
            try {
              // Проверяем существование целевой сущности
              const targetEntity = await tx.entity.findUnique({
                where: { id: relationship.targetEntityId }
              });

              if (!targetEntity) {
                warnings.push(`Целевая сущность для связи не найдена: ${relationship.targetEntityName}`);
                continue;
              }

              if (targetEntity.projectId !== input.projectId) {
                warnings.push(`Целевая сущность не принадлежит проекту: ${relationship.targetEntityName}`);
                continue;
              }

              establishedRelationships.push({
                fromEntityId: createdEntity.id,
                toEntityId: relationship.targetEntityId,
                relationType: relationship.relationType
              });

              console.log(`🔗 Established relationship: ${createdEntity.name} -> ${relationship.targetEntityName} (${relationship.relationType})`);

            } catch (error) {
              warnings.push(`Ошибка создания связи с ${relationship.targetEntityName}: ${(error as Error).message}`);
            }
          }
        }

        return {
          createdEntity,
          createdValues,
          establishedRelationships,
          warnings
        };
      });

      console.log(`✅ Entity creation completed: ${result.createdEntity.name}`);

      aiLogger.getBaseLogger().info(`✅ Entity creation completed`, {
        userId: context.userId,
        projectId: context.projectId,
        operationId: this.id
      });

      return {
        createdEntity: result.createdEntity,
        createdValues: result.createdValues,
        establishedRelationships: result.establishedRelationships,
        warnings: result.warnings,
        result: result.createdEntity,
        affectedRows: 1 + result.createdValues.length
      };

    } catch (error) {
      aiLogger.getBaseLogger().error('❌ Entity creation failed', {
        userId: context.userId,
        projectId: context.projectId,
        operationId: this.id
      });

      console.error('❌ Entity creation failed:', error);
      throw new Error(`Entity creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}