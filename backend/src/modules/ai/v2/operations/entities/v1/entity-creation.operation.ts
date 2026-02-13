import { BaseOperation } from '../../../../pipeline/base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../../../../pipeline/interfaces/operation.interface';
import { PrismaClient } from '@prisma/client';

/**
 * Входные данные для создания сущности
 */
interface EntityCreationInput {
  projectId: string;
  entityName: string;
  entityDescription?: string;
  selectedEntityType: {
    id: string;
    type: string;
    name: string;
  };
  generatedFields: Record<string, any>; // parameterId -> value
  suggestedRelationships?: Array<{
    relatedEntityId: string;
    relatedEntityName: string;
    relationType: string;
    explanation: string;
  }>;
}

/**
 * Результат создания сущности
 */
interface EntityCreationOutput {
  createdEntity: {
    id: string;
    name: string;
    description?: string;
    entityTypeId: string;
    projectId: string;
    createdAt: Date;
  };
  createdValues: Array<{
    parameterId: string;
    parameterName: string;
    value: any;
  }>;
  appliedRelationships: Array<{
    relatedEntityId: string;
    relatedEntityName: string;
    relationType: string;
    status: 'applied' | 'skipped' | 'failed';
    reason?: string;
  }>;
  summary: {
    totalParameters: number;
    filledParameters: number;
    skippedParameters: number;
    createdRelationships: number;
  };
  content?: string; // Для pipeline engine
  explanation?: string; // Для pipeline engine
}

/**
 * Операция для создания сущности в базе данных
 */
export class EntityCreationOperation extends BaseOperation {
  private prisma: PrismaClient;

  constructor() {
    super(
      'entity_creation',
      'Entity Creation',
      '1.0.0',
      AIOperationCategory.STRUCTURE_PLANNING,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: [],
        maxTokens: 0, // Не требует AI провайдера
        timeout: 30000
      }
    );
    this.prisma = new PrismaClient();
  }

  protected validateInput(input: any, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input) {
      errors.push('Input is required');
    }

    if (!input.projectId || typeof input.projectId !== 'string') {
      errors.push('Project ID is required and must be a string');
    }

    if (!input.entityName || typeof input.entityName !== 'string') {
      errors.push('Entity name is required and must be a string');
    }

    if (!input.selectedEntityType || !input.selectedEntityType.id) {
      errors.push('Selected entity type with ID is required');
    }

    if (!input.generatedFields || typeof input.generatedFields !== 'object') {
      errors.push('Generated fields are required and must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(
    input: EntityCreationInput,
    _context: ExecutionContext
  ): Promise<{ data: EntityCreationOutput; tokensUsed?: number; model?: string }> {
    const { 
      projectId, 
      entityName, 
      entityDescription, 
      selectedEntityType, 
      generatedFields,
      suggestedRelationships 
    } = input;

    try {
      console.log(`💾 Creating entity: "${entityName}" of type: ${selectedEntityType.name}`);

      // Проверяем доступ к проекту и существование типа сущности
      await this.validateProjectAndEntityType(projectId, selectedEntityType.id);

      // Получаем параметры типа сущности для валидации
      const entityTypeWithParams = await this.prisma.entityType.findUnique({
        where: { id: selectedEntityType.id },
        include: {
          parameters: {
            include: {
              parameter: true
            }
          }
        }
      });

      if (!entityTypeWithParams) {
        throw new Error(`Entity type not found: ${selectedEntityType.id}`);
      }

      let createdEntity: any;
      let createdValues: EntityCreationOutput['createdValues'] = [];
      let appliedRelationships: EntityCreationOutput['appliedRelationships'] = [];

      // Выполняем все операции в транзакции
      await this.prisma.$transaction(async (tx) => {
        // 1. Создаем сущность
        console.log(`📝 Creating entity record for: ${entityName}`);
        
        createdEntity = await tx.entity.create({
          data: {
            projectId,
            name: entityName.trim(),
            description: entityDescription?.trim(),
            entityTypeId: selectedEntityType.id,
            image: null // Пока не поддерживаем генерацию изображений
          }
        });

        console.log(`✅ Entity created with ID: ${createdEntity.id}`);

        // 2. Создаем значения параметров
        const parameterMap = new Map(
          entityTypeWithParams.parameters.map(etp => [etp.parameter.id, etp.parameter])
        );

        for (const [parameterId, value] of Object.entries(generatedFields)) {
          const parameter = parameterMap.get(parameterId);
          
          if (!parameter) {
            console.warn(`⚠️ Parameter not found: ${parameterId}`);
            continue;
          }

          // Валидируем значение
          const validatedValue = this.validateParameterValue(value, parameter);
          if (validatedValue === null) {
            console.warn(`⚠️ Invalid value for parameter ${parameter.name}: ${JSON.stringify(value)}`);
            continue;
          }

          // Создаем значение параметра
          await tx.entityValue.create({
            data: {
              entityId: createdEntity.id,
              parameterId: parameter.id,
              value: validatedValue
            }
          });

          createdValues.push({
            parameterId: parameter.id,
            parameterName: parameter.name,
            value: validatedValue
          });

          console.log(`✅ Created value for parameter: ${parameter.name}`);
        }

        // 3. Применяем предложенные связи
        if (suggestedRelationships && suggestedRelationships.length > 0) {
          console.log(`🔗 Processing ${suggestedRelationships.length} suggested relationships`);
          
          for (const relationship of suggestedRelationships) {
            try {
              // Проверяем существование связанной сущности
              const relatedEntity = await tx.entity.findFirst({
                where: {
                  id: relationship.relatedEntityId,
                  projectId // Убеждаемся, что сущность из того же проекта
                }
              });

              if (!relatedEntity) {
                appliedRelationships.push({
                  relatedEntityId: relationship.relatedEntityId,
                  relatedEntityName: relationship.relatedEntityName,
                  relationType: relationship.relationType,
                  status: 'skipped',
                  reason: 'Related entity not found or not in the same project'
                });
                continue;
              }

              // Ищем параметр для этого типа связи
              const relationParameter = entityTypeWithParams.parameters.find(
                etp => etp.parameter.name.toLowerCase().includes(relationship.relationType.toLowerCase()) ||
                       relationship.relationType.toLowerCase().includes(etp.parameter.name.toLowerCase())
              );

              if (!relationParameter || 
                  (relationParameter.parameter.valueType !== 'SINGLE_ENTITY' && 
                   relationParameter.parameter.valueType !== 'MULTI_ENTITY')) {
                appliedRelationships.push({
                  relatedEntityId: relationship.relatedEntityId,
                  relatedEntityName: relationship.relatedEntityName,
                  relationType: relationship.relationType,
                  status: 'skipped',
                  reason: 'No matching relationship parameter found'
                });
                continue;
              }

              // Создаем или обновляем связь
              const existingValue = createdValues.find(cv => cv.parameterId === relationParameter.parameter.id);
              
              if (relationParameter.parameter.valueType === 'SINGLE_ENTITY') {
                // Для одиночной связи - заменяем существующее значение
                const relationValue = { entityId: relationship.relatedEntityId };
                
                if (existingValue) {
                  await tx.entityValue.updateMany({
                    where: {
                      entityId: createdEntity.id,
                      parameterId: relationParameter.parameter.id
                    },
                    data: { value: relationValue }
                  });
                } else {
                  await tx.entityValue.create({
                    data: {
                      entityId: createdEntity.id,
                      parameterId: relationParameter.parameter.id,
                      value: relationValue
                    }
                  });
                }
              } else if (relationParameter.parameter.valueType === 'MULTI_ENTITY') {
                // Для множественной связи - добавляем к существующему массиву
                let entityIds = [];
                if (existingValue && existingValue.value?.entityIds) {
                  entityIds = Array.isArray(existingValue.value.entityIds) ? 
                    existingValue.value.entityIds.filter((id: any) => id != null && id !== undefined) : [];
                }
                
                // Проверяем, что relatedEntityId не undefined и не null
                if (relationship.relatedEntityId && !entityIds.includes(relationship.relatedEntityId)) {
                  entityIds.push(relationship.relatedEntityId);
                }
                
                const relationValue = { entityIds };
                
                if (existingValue) {
                  await tx.entityValue.updateMany({
                    where: {
                      entityId: createdEntity.id,
                      parameterId: relationParameter.parameter.id
                    },
                    data: { value: relationValue }
                  });
                } else {
                  await tx.entityValue.create({
                    data: {
                      entityId: createdEntity.id,
                      parameterId: relationParameter.parameter.id,
                      value: relationValue
                    }
                  });
                }
              }

              appliedRelationships.push({
                relatedEntityId: relationship.relatedEntityId,
                relatedEntityName: relationship.relatedEntityName,
                relationType: relationship.relationType,
                status: 'applied'
              });

              console.log(`🔗 Applied relationship: ${relationship.relationType} -> ${relationship.relatedEntityName}`);

            } catch (relationError) {
              console.error(`❌ Failed to apply relationship:`, relationError);
              appliedRelationships.push({
                relatedEntityId: relationship.relatedEntityId,
                relatedEntityName: relationship.relatedEntityName,
                relationType: relationship.relationType,
                status: 'failed',
                reason: relationError instanceof Error ? relationError.message : 'Unknown error'
              });
            }
          }
        }
      });

      if (!createdEntity) {
        throw new Error('Failed to create entity in transaction');
      }

      const summary = {
        totalParameters: entityTypeWithParams.parameters.length,
        filledParameters: createdValues.length,
        skippedParameters: entityTypeWithParams.parameters.length - createdValues.length,
        createdRelationships: appliedRelationships.filter(r => r.status === 'applied').length
      };

      console.log(`✅ Entity creation completed:`);
      console.log(`   - Entity: ${createdEntity.name} (${createdEntity.id})`);
      console.log(`   - Parameters filled: ${summary.filledParameters}/${summary.totalParameters}`);
      console.log(`   - Relationships: ${summary.createdRelationships}/${suggestedRelationships?.length || 0}`);

      return {
        data: {
          createdEntity: {
            id: createdEntity.id,
            name: createdEntity.name,
            description: createdEntity.description || undefined,
            entityTypeId: createdEntity.entityTypeId,
            projectId: createdEntity.projectId,
            createdAt: createdEntity.createdAt
          },
          createdValues,
          appliedRelationships,
          summary,
          content: `Создана сущность: ${createdEntity.name}`,
          explanation: `Успешно создана сущность "${createdEntity.name}" с ${summary.filledParameters} параметрами из ${summary.totalParameters} возможных и ${summary.createdRelationships} связями`
        },
        tokensUsed: 0,
        model: 'database-transaction'
      };

    } catch (error) {
      console.error('❌ Entity creation failed:', error);
      throw new Error(`Entity creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Валидация проекта и типа сущности
   */
  private async validateProjectAndEntityType(projectId: string, entityTypeId: string): Promise<void> {
    const [project, entityType] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId } }),
      this.prisma.entityType.findFirst({ 
        where: { 
          id: entityTypeId,
          projectId // Убеждаемся, что тип принадлежит проекту
        } 
      })
    ]);

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    if (!entityType) {
      throw new Error(`Entity type not found in project: ${entityTypeId}`);
    }
  }

  /**
   * Валидация значения параметра
   */
  private validateParameterValue(value: any, parameter: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    switch (parameter.valueType) {
      case 'TEXT':
      case 'SHORT_TEXT':
        return typeof value === 'string' ? value : String(value);

      case 'NUMBER':
        const num = Number(value);
        return isNaN(num) ? null : num;

      case 'SINGLE_SELECT':
      case 'MULTI_SELECT':
        // Для select полей принимаем любое значение, так как валидация опций сложна
        return value;

      case 'SINGLE_ENTITY':
        if (typeof value === 'object' && value.entityId) {
          return value;
        }
        return null;

      case 'MULTI_ENTITY':
        if (typeof value === 'object' && Array.isArray(value.entityIds)) {
          // Фильтруем undefined и null значения из массива
          const filteredEntityIds = value.entityIds.filter((id: any) => id != null && id !== undefined);
          return filteredEntityIds.length > 0 ? { entityIds: filteredEntityIds } : null;
        }
        return null;

      default:
        return value;
    }
  }

  protected calculateCustomCost(input: any, _context: ExecutionContext): number {
    const fieldsCount = Object.keys(input.generatedFields || {}).length;
    const relationshipsCount = input.suggestedRelationships?.length || 0;
    
    // Базовая стоимость + стоимость за поля и связи
    return 5 + fieldsCount * 1 + relationshipsCount * 2;
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}