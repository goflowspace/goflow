import {useCallback, useEffect} from 'react';

import {Entity, EntityType} from '@types-folder/entities';
import {useGraphStore} from 'src/store/useGraphStore';

export interface UseEntitiesOptions {
  projectId?: string;
  autoLoad?: boolean;
  includeOriginalImages?: boolean;
}

export interface EntitiesByType {
  [entityTypeId: string]: {
    type: EntityType;
    entities: Entity[];
  };
}

export interface UseEntitiesReturn {
  entities: Entity[];
  entityTypes: EntityType[];
  entitiesByType: EntitiesByType;
  isLoading: boolean;
  error: string | null;
  loadEntities: (force?: boolean) => Promise<void>;
  loadEntityTypes: (force?: boolean) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Хук для работы с сущностями в сайдбаре
 * Загружает типы сущностей и сами сущности, группирует их по типам
 */
export const useEntities = (options: UseEntitiesOptions = {}): UseEntitiesReturn => {
  const {projectId, autoLoad = true, includeOriginalImages = false} = options;

  const {entities, entityTypes, entitiesLoading: isLoading, entitiesError: error, loadEntities: loadEntitiesFromStore, loadEntityTypes: loadEntityTypesFromStore} = useGraphStore();

  // Группировка сущностей по типам
  const entitiesByType: EntitiesByType = entities.reduce((acc, entity) => {
    if (entity.entityTypeId && entity.entityType) {
      if (!acc[entity.entityTypeId]) {
        acc[entity.entityTypeId] = {
          type: entity.entityType,
          entities: []
        };
      }
      acc[entity.entityTypeId].entities.push(entity);
    }
    return acc;
  }, {} as EntitiesByType);

  // Загрузка типов сущностей из стора
  const loadEntityTypes = useCallback(
    async (force = false) => {
      if (!projectId) return;
      if (force) {
        // Принудительно сбрасываем флаг, чтобы перезагрузить
        useGraphStore.setState({entitiesLoaded: false});
      }
      await loadEntityTypesFromStore(projectId);
    },
    [projectId, loadEntityTypesFromStore]
  );

  // Загрузка сущностей из стора
  const loadEntities = useCallback(
    async (force = false) => {
      if (!projectId) return;
      if (force) {
        useGraphStore.setState({entitiesLoaded: false});
      }
      await loadEntitiesFromStore(projectId, includeOriginalImages);
    },
    [projectId, includeOriginalImages, loadEntitiesFromStore]
  );

  // Полная перезагрузка данных
  const reload = useCallback(async () => {
    if (!projectId) return;
    // Сбрасываем флаг и перезагружаем
    useGraphStore.setState({entitiesLoaded: false});
    await Promise.all([loadEntityTypes(true), loadEntities(true)]);
  }, [projectId, loadEntityTypes, loadEntities]);

  // Автоматическая загрузка при инициализации
  useEffect(() => {
    if (autoLoad && projectId) {
      // Вызываем загрузку без принуждения, чтобы использовать кеширование
      loadEntityTypes();
      loadEntities();
    }
  }, [autoLoad, projectId, loadEntityTypes, loadEntities]);

  return {
    entities,
    entityTypes,
    entitiesByType,
    isLoading,
    error,
    loadEntities,
    loadEntityTypes,
    reload
  };
};
