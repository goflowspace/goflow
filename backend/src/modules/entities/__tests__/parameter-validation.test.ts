import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Мокаем модуль prisma
const mockPrisma = {
  project: {
    findUnique: jest.fn()
  },
  entityType: {
    findFirst: jest.fn(),
    findUnique: jest.fn()
  },
  entityParameter: {
    findMany: jest.fn()
  },
  entity: {
    create: jest.fn(),
    findUnique: jest.fn()
  },
  entityValue: {
    create: jest.fn()
  }
} as any;

jest.mock('@config/prisma', () => ({
  prisma: mockPrisma
}));

import { createEntityService } from '../entities.service';

describe('Parameter Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should filter out invalid parameters when creating entity', async () => {
    const projectId = 'project-1';
    const entityTypeId = 'type-1';
    const validParamId = 'param-1';
    const invalidParamId = 'param-invalid';

    // Мокаем данные
    mockPrisma.project.findUnique.mockResolvedValue({ id: projectId });
    
    mockPrisma.entityType.findFirst.mockResolvedValue({ 
      id: entityTypeId, 
      projectId 
    });

    mockPrisma.entityType.findUnique.mockResolvedValue({
      id: entityTypeId,
      projectId,
      name: 'Test Entity Type',
      parameters: [
        {
          parameter: {
            id: validParamId,
            name: 'Valid Parameter',
            valueType: 'TEXT'
          }
        }
      ]
    });

    mockPrisma.entity.create.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId
    });

    mockPrisma.entity.findUnique.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId,
      entityType: { name: 'Test Entity Type' },
      values: [
        {
          parameterId: validParamId,
          parameter: { name: 'Valid Parameter' },
          value: 'test value'
        }
      ]
    });

    mockPrisma.entityParameter.findMany.mockResolvedValue([
      {
        id: validParamId,
        name: 'Valid Parameter',
        valueType: 'TEXT',
        projectId
      }
    ]);

    mockPrisma.entityValue.create.mockResolvedValue({
      id: 'value-1',
      entityId: 'entity-1',
      parameterId: validParamId,
      value: 'test value'
    });

    const entityData = {
      name: 'Test Entity',
      entityTypeId,
      values: {
        [validParamId]: 'test value',
        [invalidParamId]: 'invalid value' // Этот параметр должен быть отфильтрован
      }
    };

    // Перехватываем console.warn чтобы проверить предупреждения
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await createEntityService(projectId, entityData);

    // Проверяем что сущность создалась
    expect(result).toBeDefined();
    expect(result.id).toBe('entity-1');

    // Проверяем что entityValue.create вызывался только для валидного параметра
    expect(mockPrisma.entityValue.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.entityValue.create).toHaveBeenCalledWith({
      data: {
        entityId: 'entity-1',
        parameterId: validParamId,
        value: 'test value'
      }
    });

    // Проверяем что было выведено предупреждение о неверном параметре
    expect(consoleSpy).toHaveBeenCalledWith('⚠️ Entity creation warnings:', expect.any(Array));
    
    consoleSpy.mockRestore();
  });

  it('should handle case when all parameters are invalid', async () => {
    const projectId = 'project-1';
    const entityTypeId = 'type-1';
    const invalidParamId = 'param-invalid';

    // Мокаем данные
    mockPrisma.project.findUnique.mockResolvedValue({ id: projectId });
    
    mockPrisma.entityType.findFirst.mockResolvedValue({ 
      id: entityTypeId, 
      projectId 
    });

    mockPrisma.entityType.findUnique.mockResolvedValue({
      id: entityTypeId,
      projectId,
      name: 'Test Entity Type',
      parameters: [] // Нет параметров в типе
    });

    mockPrisma.entity.create.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId
    });

    mockPrisma.entityParameter.findMany.mockResolvedValue([]);

    mockPrisma.entity.findUnique.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId,
      entityType: { name: 'Test Entity Type' },
      values: []
    });

    const entityData = {
      name: 'Test Entity',
      entityTypeId,
      values: {
        [invalidParamId]: 'invalid value' // Этот параметр должен быть отфильтрован
      }
    };

    // Перехватываем console.warn чтобы проверить предупреждения
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await createEntityService(projectId, entityData);

    // Проверяем что сущность создалась, но без значений параметров
    expect(result).toBeDefined();
    expect(result.id).toBe('entity-1');

    // Проверяем что entityValue.create не вызывался (все параметры были отфильтрованы)
    expect(mockPrisma.entityValue.create).not.toHaveBeenCalled();

    // Проверяем что было выведено предупреждение
    expect(consoleSpy).toHaveBeenCalledWith('⚠️ Entity creation warnings:', expect.any(Array));
    
    consoleSpy.mockRestore();
  });

  it('should validate entity relationships for SINGLE_ENTITY and MULTI_ENTITY parameters', async () => {
    const projectId = 'project-1';
    const entityTypeId = 'type-1';
    const singleEntityParamId = 'param-single';
    const multiEntityParamId = 'param-multi';
    const relatedEntityId = 'related-entity-1';

    // Мокаем данные
    mockPrisma.project.findUnique.mockResolvedValue({ id: projectId });
    
    mockPrisma.entityType.findFirst.mockResolvedValue({ 
      id: entityTypeId, 
      projectId 
    });

    mockPrisma.entityType.findUnique.mockResolvedValue({
      id: entityTypeId,
      projectId,
      name: 'Test Entity Type',
      parameters: [
        {
          parameter: {
            id: singleEntityParamId,
            name: 'Single Entity Parameter',
            valueType: 'SINGLE_ENTITY'
          }
        },
        {
          parameter: {
            id: multiEntityParamId,
            name: 'Multi Entity Parameter',
            valueType: 'MULTI_ENTITY'
          }
        }
      ]
    });

    mockPrisma.entity.create.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId
    });

    // Мокаем проверку существования связанных сущностей
    mockPrisma.entityParameter.findMany.mockResolvedValue([
      {
        id: singleEntityParamId,
        name: 'Single Entity Parameter',
        valueType: 'SINGLE_ENTITY',
        projectId
      },
      {
        id: multiEntityParamId,
        name: 'Multi Entity Parameter',
        valueType: 'MULTI_ENTITY',
        projectId
      }
    ]);

    // Мокаем поиск связанных сущностей
    mockPrisma.entity.findMany = jest.fn().mockResolvedValue([
      {
        id: relatedEntityId,
        projectId
      }
    ]);

    mockPrisma.entity.findUnique.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId,
      entityType: { name: 'Test Entity Type' },
      values: []
    });

    mockPrisma.entityValue.create.mockResolvedValue({
      id: 'value-1'
    });

    const entityData = {
      name: 'Test Entity',
      entityTypeId,
      values: {
        [singleEntityParamId]: { entityId: relatedEntityId },
        [multiEntityParamId]: { entityIds: [relatedEntityId] }
      }
    };

    const result = await createEntityService(projectId, entityData);

    // Проверяем что сущность создалась
    expect(result).toBeDefined();
    expect(result.id).toBe('entity-1');

    // Проверяем что проверка связанных сущностей была вызвана
    expect(mockPrisma.entity.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [relatedEntityId] },
        projectId
      },
      select: { id: true }
    });

    // Проверяем что значения параметров были созданы
    expect(mockPrisma.entityValue.create).toHaveBeenCalledTimes(2);
  });

  it('should filter out non-existent entity relationships', async () => {
    const projectId = 'project-1';
    const entityTypeId = 'type-1';
    const singleEntityParamId = 'param-single';
    const multiEntityParamId = 'param-multi';
    const existingEntityId = 'existing-entity';
    const missingEntityId = 'missing-entity';

    // Мокаем данные
    mockPrisma.project.findUnique.mockResolvedValue({ id: projectId });
    
    mockPrisma.entityType.findFirst.mockResolvedValue({ 
      id: entityTypeId, 
      projectId 
    });

    mockPrisma.entityType.findUnique.mockResolvedValue({
      id: entityTypeId,
      projectId,
      name: 'Test Entity Type',
      parameters: [
        {
          parameter: {
            id: singleEntityParamId,
            name: 'Single Entity Parameter',
            valueType: 'SINGLE_ENTITY'
          }
        },
        {
          parameter: {
            id: multiEntityParamId,
            name: 'Multi Entity Parameter',
            valueType: 'MULTI_ENTITY'
          }
        }
      ]
    });

    mockPrisma.entity.create.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId
    });

    // Мокаем параметры
    mockPrisma.entityParameter.findMany.mockResolvedValue([
      {
        id: singleEntityParamId,
        name: 'Single Entity Parameter',
        valueType: 'SINGLE_ENTITY',
        projectId
      },
      {
        id: multiEntityParamId,
        name: 'Multi Entity Parameter',
        valueType: 'MULTI_ENTITY',
        projectId
      }
    ]);

    // Мокаем поиск связанных сущностей - только одна из двух существует
    mockPrisma.entity.findMany = jest.fn().mockResolvedValue([
      {
        id: existingEntityId,
        projectId
      }
      // missingEntityId отсутствует в результатах
    ]);

    mockPrisma.entity.findUnique.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId,
      entityType: { name: 'Test Entity Type' },
      values: []
    });

    mockPrisma.entityValue.create.mockResolvedValue({
      id: 'value-1'
    });

    const entityData = {
      name: 'Test Entity',
      entityTypeId,
      values: {
        [singleEntityParamId]: { entityId: missingEntityId }, // Несуществующая сущность
        [multiEntityParamId]: { entityIds: [existingEntityId, missingEntityId] } // Одна существует, одна нет
      }
    };

    // Перехватываем console.warn
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await createEntityService(projectId, entityData);

    // Проверяем что сущность создалась
    expect(result).toBeDefined();
    expect(result.id).toBe('entity-1');

    // Проверяем что были предупреждения о неверных связях
    expect(consoleSpy).toHaveBeenCalledWith('⚠️ Entity creation warnings:', expect.any(Array));

    // Должен быть создан только один EntityValue для multiEntityParamId (с отфильтрованным массивом)
    // и ни одного для singleEntityParamId (так как связанная сущность не существует)
    expect(mockPrisma.entityValue.create).toHaveBeenCalledTimes(1);
    
    // Проверяем что был вызов для multiEntityParamId с отфильтрованным массивом
    const createCalls = mockPrisma.entityValue.create.mock.calls;
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][0].data.parameterId).toBe(multiEntityParamId);
    expect(createCalls[0][0].data.value.entityIds).toEqual([existingEntityId]);
    
    consoleSpy.mockRestore();
  });

  it('should handle complex case with invalid parameters and invalid relationships', async () => {
    const projectId = 'project-1';
    const entityTypeId = 'type-1';
    const validParamId = 'param-valid';
    const invalidParamId = 'param-invalid';
    const singleEntityParamId = 'param-single';
    const existingEntityId = 'existing-entity';
    const missingEntityId = 'missing-entity';

    // Мокаем данные
    mockPrisma.project.findUnique.mockResolvedValue({ id: projectId });
    
    mockPrisma.entityType.findFirst.mockResolvedValue({ 
      id: entityTypeId, 
      projectId 
    });

    mockPrisma.entityType.findUnique.mockResolvedValue({
      id: entityTypeId,
      projectId,
      name: 'Test Entity Type',
      parameters: [
        {
          parameter: {
            id: validParamId,
            name: 'Valid Parameter',
            valueType: 'TEXT'
          }
        },
        {
          parameter: {
            id: singleEntityParamId,
            name: 'Single Entity Parameter',
            valueType: 'SINGLE_ENTITY'
          }
        }
      ]
    });

    mockPrisma.entity.create.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId
    });

    mockPrisma.entityParameter.findMany.mockResolvedValue([
      {
        id: validParamId,
        name: 'Valid Parameter',
        valueType: 'TEXT',
        projectId
      },
      {
        id: singleEntityParamId,
        name: 'Single Entity Parameter',
        valueType: 'SINGLE_ENTITY',
        projectId
      }
    ]);

    // Только одна сущность существует
    mockPrisma.entity.findMany = jest.fn().mockResolvedValue([
      {
        id: existingEntityId,
        projectId
      }
    ]);

    mockPrisma.entity.findUnique.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId,
      entityType: { name: 'Test Entity Type' },
      values: []
    });

    mockPrisma.entityValue.create.mockResolvedValue({
      id: 'value-1'
    });

    const entityData = {
      name: 'Test Entity',
      entityTypeId,
      values: {
        [validParamId]: 'valid text value',
        [invalidParamId]: 'invalid parameter', // Этот параметр не существует в типе
        [singleEntityParamId]: { entityId: missingEntityId } // Эта сущность не существует
      }
    };

    // Перехватываем console.warn
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await createEntityService(projectId, entityData);

    // Проверяем что сущность создалась
    expect(result).toBeDefined();
    expect(result.id).toBe('entity-1');

    // Должно быть создано только одно значение для валидного текстового параметра
    expect(mockPrisma.entityValue.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.entityValue.create).toHaveBeenCalledWith({
      data: {
        entityId: 'entity-1',
        parameterId: validParamId,
        value: 'valid text value'
      }
    });

    // Проверяем что было предупреждение и о неверном параметре, и о неверной связи
    expect(consoleSpy).toHaveBeenCalledWith('⚠️ Entity creation warnings:', expect.any(Array));
    
    consoleSpy.mockRestore();
  });

  it('should remove MULTI_ENTITY parameter when all entity IDs are invalid', async () => {
    const projectId = 'project-1';
    const entityTypeId = 'type-1';
    const validParamId = 'param-valid';
    const multiEntityParamId = 'param-multi';
    const missingEntityId1 = 'missing-entity-1';
    const missingEntityId2 = 'missing-entity-2';

    // Мокаем данные
    mockPrisma.project.findUnique.mockResolvedValue({ id: projectId });
    
    mockPrisma.entityType.findFirst.mockResolvedValue({ 
      id: entityTypeId, 
      projectId 
    });

    mockPrisma.entityType.findUnique.mockResolvedValue({
      id: entityTypeId,
      projectId,
      name: 'Test Entity Type',
      parameters: [
        {
          parameter: {
            id: validParamId,
            name: 'Valid Parameter',
            valueType: 'TEXT'
          }
        },
        {
          parameter: {
            id: multiEntityParamId,
            name: 'Multi Entity Parameter',
            valueType: 'MULTI_ENTITY'
          }
        }
      ]
    });

    mockPrisma.entity.create.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId
    });

    mockPrisma.entityParameter.findMany.mockResolvedValue([
      {
        id: validParamId,
        name: 'Valid Parameter',
        valueType: 'TEXT',
        projectId
      },
      {
        id: multiEntityParamId,
        name: 'Multi Entity Parameter',
        valueType: 'MULTI_ENTITY',
        projectId
      }
    ]);

    // Ни одной сущности не существует
    mockPrisma.entity.findMany = jest.fn().mockResolvedValue([]);

    mockPrisma.entity.findUnique.mockResolvedValue({
      id: 'entity-1',
      name: 'Test Entity',
      entityTypeId,
      projectId,
      entityType: { name: 'Test Entity Type' },
      values: []
    });

    mockPrisma.entityValue.create.mockResolvedValue({
      id: 'value-1'
    });

    const entityData = {
      name: 'Test Entity',
      entityTypeId,
      values: {
        [validParamId]: 'valid text value',
        [multiEntityParamId]: { entityIds: [missingEntityId1, missingEntityId2] } // Все сущности не существуют
      }
    };

    // Перехватываем console.warn
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await createEntityService(projectId, entityData);

    // Проверяем что сущность создалась
    expect(result).toBeDefined();
    expect(result.id).toBe('entity-1');

    // Должно быть создано только одно значение для валидного текстового параметра
    // multiEntityParamId должен быть полностью удален, так как все связи невалидны
    expect(mockPrisma.entityValue.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.entityValue.create).toHaveBeenCalledWith({
      data: {
        entityId: 'entity-1',
        parameterId: validParamId,
        value: 'valid text value'
      }
    });

    // Проверяем что было предупреждение об удалении всего параметра
    expect(consoleSpy).toHaveBeenCalledWith('⚠️ Entity creation warnings:', expect.any(Array));
    
    consoleSpy.mockRestore();
  });
});
