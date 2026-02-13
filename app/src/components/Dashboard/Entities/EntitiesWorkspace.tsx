'use client';

import React, {useCallback, useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useTeamAIAccess} from '@hooks/useTeamAIAccess';
import {GearIcon, ListBulletIcon, MagicWandIcon, MagnifyingGlassIcon, PlusIcon, StackIcon} from '@radix-ui/react-icons';
import {Button} from '@radix-ui/themes';
import {api} from '@services/api';
import {EntitiesQueryParams, Entity, EntityParameter, EntityType, getEntityTypeDisplay} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import {NoAIAccessModal} from '@components/common/NoAIAccessModal';

import {buildEntitiesPath, buildEntityPath, buildEntityTypePath} from '../../../utils/navigation';
import {CreateEntityModal} from '../../Sidebar/CreateEntityModal';
import AIEntityGenerationModal from './AIEntityGenerationModal';
import {EntityForm} from './EntityForm/EntityForm';
import {EntityList} from './EntityList/EntityList';
import {CreateParameterModal} from './ParameterManager/CreateParameterModal/CreateParameterModal';
import {ParameterManager} from './ParameterManager/ParameterManagerSimple';
import {CreateTypeModal} from './TypeManager/CreateTypeModal/CreateTypeModal';
import {TypeManager} from './TypeManager/TypeManager';

import s from './EntitiesWorkspace.module.css';

interface EntitiesWorkspaceProps {
  projectId: string;
  filterTypeId?: string;
  openEntityId?: string;
}

type ViewMode = 'list' | 'grid' | 'table' | 'entity-form' | 'parameter-manager' | 'type-manager';
type ListViewMode = 'grid' | 'table';

export const EntitiesWorkspace: React.FC<EntitiesWorkspaceProps> = ({projectId, filterTypeId, openEntityId}) => {
  const {t} = useTranslation();
  const router = useRouter();

  // Состояние
  const [entities, setEntities] = useState<Entity[]>([]);
  const [parameters, setParameters] = useState<EntityParameter[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [listViewMode, setListViewMode] = useState<ListViewMode>('grid');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityTypeId, setSelectedEntityTypeId] = useState<string>('');
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<EntityType | null>(null);
  const [isAddingParameter, setIsAddingParameter] = useState(false);
  const [showCreateParameterModal, setShowCreateParameterModal] = useState(false);
  const [editingParameter, setEditingParameter] = useState<EntityParameter | null>(null);
  const [showCreateEntityModal, setShowCreateEntityModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);

  // Проверка доступа к ИИ
  const {hasAIAccess, isTeamPlan} = useTeamAIAccess();
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);

  // Загрузка данных при инициализации
  useEffect(() => {
    loadInitialData();
  }, [projectId]);

  // Установка фильтра по типу из URL
  useEffect(() => {
    if (filterTypeId) {
      setSelectedEntityTypeId(filterTypeId);
    } else {
      setSelectedEntityTypeId('');
    }
  }, [filterTypeId]);

  // Загрузка отфильтрованных сущностей при изменении фильтра из URL
  useEffect(() => {
    if (filterTypeId && entityTypes.length > 0) {
      setTimeout(() => {
        const event = new CustomEvent('filterByType', {
          detail: {typeId: filterTypeId}
        });
        window.dispatchEvent(event);
      }, 100);
    }
  }, [filterTypeId, entityTypes.length]);

  // Открытие модального окна сущности из URL
  useEffect(() => {
    if (openEntityId && entities.length > 0) {
      const entity = entities.find((e) => e.id === openEntityId);
      if (entity) {
        setSelectedEntity(entity);
        setEditingEntity(entity);
        setShowCreateEntityModal(true);
      }
    } else {
      setShowCreateEntityModal(false);
      setSelectedEntity(null);
      setEditingEntity(null);
    }
  }, [openEntityId, entities]);

  // Обработчики событий от боковой панели
  useEffect(() => {
    const handleFilterByType = async (event: CustomEvent) => {
      const {typeId} = event.detail;
      if (typeId) {
        setSelectedEntityTypeId(typeId);
        setSearchQuery('');
        // Возвращаемся к списку и фильтруем
        setViewMode('list');
        setSelectedEntity(null);

        // Загружаем сущности для данного типа
        try {
          const params: EntitiesQueryParams = {includeOriginalImages: false, entityTypeId: typeId};
          const result = await api.getEntities(projectId, params);
          setEntities(result.entities);
        } catch (err) {
          console.error('Filter by type failed:', err);
        }
      }
    };

    const handleClearFilter = async () => {
      setSelectedEntityTypeId('');
      setSearchQuery('');
      // Возвращаемся к списку и сбрасываем фильтр
      setViewMode('list');
      setSelectedEntity(null);
      // Сбрасываем режим отображения в грид
      setListViewMode('grid');

      // Загружаем все сущности
      try {
        const params: EntitiesQueryParams = {includeOriginalImages: false};
        const result = await api.getEntities(projectId, params);
        setEntities(result.entities);
      } catch (err) {
        console.error('Clear filter failed:', err);
      }
    };

    const handleOpenEntity = (event: CustomEvent) => {
      const {entity} = event.detail;
      if (entity) {
        // Открываем модальное окно для редактирования сущности
        setEditingEntity(entity);
        setShowCreateEntityModal(true);
      }
    };

    // Добавляем слушатели событий
    window.addEventListener('filterByType', handleFilterByType as any);
    window.addEventListener('clearFilter', handleClearFilter as any);
    window.addEventListener('openEntity', handleOpenEntity as any);

    // Удаляем слушатели при размонтировании
    return () => {
      window.removeEventListener('filterByType', handleFilterByType as any);
      window.removeEventListener('clearFilter', handleClearFilter as any);
      window.removeEventListener('openEntity', handleOpenEntity as any);
    };
  }, [projectId]); // Зависимость от projectId для обновления при смене проекта

  // Обновление списка сущностей без сброса других состояний
  const refreshEntitiesList = async () => {
    try {
      const entitiesData = await api.getEntities(projectId, {includeOriginalImages: false});
      setEntities(entitiesData.entities);
    } catch (err) {
      console.error('Failed to refresh entities list:', err);
    }
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);

    // Сбрасываем состояние при загрузке
    setSelectedEntityTypeId('');
    setSearchQuery('');
    setListViewMode('grid');

    try {
      // Загружаем типы сущностей, сущности и параметры параллельно
      // Не загружаем original изображения для экономии трафика
      const [entityTypesData, entitiesData, parametersData] = await Promise.all([
        api.getEntityTypes(projectId),
        api.getEntities(projectId, {includeOriginalImages: false}),
        api.getEntityParameters(projectId)
      ]);

      setEntityTypes(entityTypesData);
      setEntities(entitiesData.entities);
      setParameters(parametersData);
    } catch (err) {
      console.error('Failed to load entities data:', err);
      setError(t('dashboard.entities.failed_to_load_entities_data', 'Не удалось загрузить данные сущностей'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = useCallback(
    async (query: string, entityTypeId?: string) => {
      setSearchQuery(query);
      setSelectedEntityTypeId(entityTypeId || '');

      // Сбрасываем режим отображения в грид при выборе "Все типы"
      if (!entityTypeId) {
        setListViewMode('grid');
      }

      try {
        const params: EntitiesQueryParams = {includeOriginalImages: false};
        if (query) params.search = query;
        if (entityTypeId) params.entityTypeId = entityTypeId;

        const result = await api.getEntities(projectId, params);
        setEntities(result.entities);
      } catch (err) {
        console.error('Search failed:', err);
      }
    },
    [projectId]
  );

  const handleCreateEntity = () => {
    console.log('handleCreateEntity called'); // Отладка
    setEditingEntity(null);
    setShowCreateEntityModal(true);
  };

  const handleAICreateEntity = () => {
    console.log('handleAICreateEntity called');

    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      setShowNoAccessModal(true);
      return;
    }

    setShowAIGenerateModal(true);
  };

  const handleCloseCreateEntityModal = () => {
    setShowCreateEntityModal(false);
    setEditingEntity(null);

    // Возвращаемся на страницу с фильтром по типу или на общую страницу сущностей
    if (filterTypeId) {
      router.push(buildEntityTypePath(projectId, filterTypeId));
    } else {
      router.push(buildEntitiesPath(projectId));
    }
  };

  const handleCloseAIGenerateModal = () => {
    setShowAIGenerateModal(false);
  };

  const handleAIEntityCreated = (entity: Entity) => {
    // AI generated entities are always new, just refresh the list to get the latest data
    // This avoids duplicate entities during the brief moment between local add and server refresh
    refreshEntitiesList();
  };

  const handleEditEntity = (entity: Entity) => {
    if (entity.entityTypeId) {
      router.push(buildEntityPath(projectId, entity.entityTypeId, entity.id));
    }
  };

  const handleDeleteEntity = async (entityId: string) => {
    try {
      // Находим сущность перед удалением
      const entityToDelete = entities.find((e) => e.id === entityId);

      await api.deleteEntity(projectId, entityId);
      setEntities(entities.filter((e) => e.id !== entityId));

      // Отправляем событие для обновления боковой панели
      if (entityToDelete) {
        const event = new CustomEvent('entityDeleted', {
          detail: {entityId, entityTypeId: entityToDelete.entityTypeId}
        });
        window.dispatchEvent(event);
      }
    } catch (err) {
      console.error('Failed to delete entity:', err);
    }
  };

  const handleEntitySaved = async (savedEntity: Entity, isNew: boolean) => {
    if (isNew) {
      // Создание новой сущности
      setEntities([savedEntity, ...entities]);
    } else {
      // Обновление существующей сущности
      setEntities(entities.map((e) => (e.id === savedEntity.id ? savedEntity : e)));
    }

    // Отправляем событие для обновления боковой панели
    const event = new CustomEvent('entitySaved', {
      detail: {entity: savedEntity, isNew}
    });
    window.dispatchEvent(event);

    setShowCreateEntityModal(false);
    setEditingEntity(null);
  };

  // Обертка для EntityForm (для обратной совместимости)
  const handleEntitySavedFromForm = async (savedEntity: Entity) => {
    // Определяем, это создание или редактирование на основе selectedEntity
    const isNew = !selectedEntity;

    if (isNew) {
      setEntities([savedEntity, ...entities]);
    } else {
      setEntities(entities.map((e) => (e.id === savedEntity.id ? savedEntity : e)));
    }

    // Отправляем событие для обновления боковой панели
    const event = new CustomEvent('entitySaved', {
      detail: {entity: savedEntity, isNew}
    });
    window.dispatchEvent(event);

    setViewMode('list');
    setSelectedEntity(null);
  };

  const handleManageParameters = () => {
    setViewMode('parameter-manager');
    setIsAddingParameter(false);
    loadParameters();
  };

  const handleManageTypes = () => {
    setViewMode('type-manager');
    setShowCreateTypeModal(false);
  };

  const handleStartAddingType = () => {
    setShowCreateTypeModal(true);
  };

  const handleCloseCreateTypeModal = () => {
    setShowCreateTypeModal(false);
    setEditingType(null);
  };

  const handleTypeCreated = async (newType: EntityType) => {
    // Перезагружаем список типов и сущностей с сервера для синхронизации
    await Promise.all([
      loadEntityTypes(),
      loadEntities() // Добавляем перезагрузку сущностей
    ]);
    setShowCreateTypeModal(false);
  };

  const handleStartEditingType = (type: EntityType) => {
    setEditingType(type);
    setShowCreateTypeModal(true);
  };

  const handleTypeUpdated = async (updatedType: EntityType) => {
    // Перезагружаем список типов и сущностей с сервера для синхронизации
    await Promise.all([
      loadEntityTypes(),
      loadEntities() // Добавляем перезагрузку сущностей
    ]);
    setShowCreateTypeModal(false);
    setEditingType(null);
  };

  const handleParametersUpdated = async (updatedParameters: EntityParameter[]) => {
    setParameters(updatedParameters);
    // Перезагружаем сущности, так как могли измениться их параметры
    await loadEntities();
  };

  const handleStartAddingParameter = () => {
    setEditingParameter(null);
    setShowCreateParameterModal(true);
  };

  const handleCancelAddingParameter = () => {
    setIsAddingParameter(false);
  };

  const handleEditParameter = (parameter: EntityParameter) => {
    setEditingParameter(parameter);
    setShowCreateParameterModal(true);
  };

  const handleCloseParameterModal = () => {
    setShowCreateParameterModal(false);
    setEditingParameter(null);
  };

  const handleParameterCreated = async (parameter: EntityParameter) => {
    setParameters((prev) => [...prev, parameter]);
    setShowCreateParameterModal(false);
    setEditingParameter(null);
    // Перезагружаем сущности для отображения актуальных параметров
    await loadEntities();
  };

  const handleParameterUpdated = async (parameter: EntityParameter) => {
    setParameters((prev) => prev.map((p) => (p.id === parameter.id ? parameter : p)));
    setShowCreateParameterModal(false);
    setEditingParameter(null);
    // Перезагружаем сущности для отображения актуальных параметров
    await loadEntities();
  };

  const handleTypesUpdated = async (updatedTypes: EntityType[]) => {
    setEntityTypes(updatedTypes);
    // Перезагружаем сущности, так как могли измениться типы
    await loadEntities();
  };

  const handleBackToList = async () => {
    setViewMode('list');
    setSelectedEntity(null);
    setShowCreateTypeModal(false);
    setIsAddingParameter(false);

    // Если нет выбранного типа, сбрасываем режим отображения в грид
    if (!selectedEntityTypeId) {
      setListViewMode('grid');
    }

    // Перезагружаем типы и сущности при возврате из TypeManager для синхронизации
    if (viewMode === 'type-manager') {
      await Promise.all([
        loadEntityTypes(),
        loadEntities() // Добавляем перезагрузку сущностей
      ]);
    }
  };

  const loadEntityTypes = async () => {
    try {
      const entityTypesData = await api.getEntityTypes(projectId);
      setEntityTypes(entityTypesData);
      return entityTypesData;
    } catch (err) {
      console.error('Failed to load entity types:', err);
      return [];
    }
  };

  const loadEntities = async () => {
    try {
      const entitiesData = await api.getEntities(projectId, {includeOriginalImages: false});
      setEntities(entitiesData.entities);
      return entitiesData.entities;
    } catch (err) {
      console.error('Failed to load entities:', err);
      return [];
    }
  };

  const loadParameters = async () => {
    try {
      const params = await api.getEntityParameters(projectId);
      setParameters(params);
    } catch (error) {
      console.error('Failed to load parameters:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={s.loadingContainer}>
        <div className={s.spinner}></div>
        <p>{t('dashboard.entities.loading', 'Загрузка сущностей...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.errorContainer}>
        <p className={s.errorText}>{error}</p>
        <button onClick={loadInitialData} className={s.retryButton}>
          {t('dashboard.entities.retry', 'Попробовать снова')}
        </button>
      </div>
    );
  }

  return (
    <div className={s.workspace}>
      {/* Заголовок с действиями */}
      <div className={s.header}>
        <div className={s.headerContent}>
          <h1 className={s.title}>
            {viewMode === 'list' && t('dashboard.entities.title', 'Сущности')}
            {viewMode === 'entity-form' && (selectedEntity ? t('dashboard.entities.edit_entity', 'Редактировать сущность') : t('dashboard.entities.create_entity', 'Создать сущность'))}
            {viewMode === 'parameter-manager' && t('dashboard.entities.manage_parameters', 'Управление параметрами')}
            {viewMode === 'type-manager' && t('dashboard.entities.manage_entity_types', 'Управление типами сущностей')}
          </h1>

          <div className={s.actions}>
            {viewMode === 'list' && (
              <>
                <Button variant='soft' color='violet' size='3' onClick={handleAICreateEntity} disabled={isLoading}>
                  <MagicWandIcon className={s.buttonIcon} />
                  {t('dashboard.entities.create_with_ai', 'Создать с ИИ')}
                </Button>
                <Button variant='soft' size='3' onClick={handleCreateEntity}>
                  <PlusIcon className={s.buttonIcon} />
                  {t('dashboard.entities.create', 'Создать')}
                </Button>
                <Button variant='outline' size='3' onClick={handleManageTypes}>
                  <GearIcon className={s.buttonIcon} />
                  {t('dashboard.entities.entity_types', 'Типы сущностей')}
                </Button>
                <Button variant='outline' size='3' onClick={handleManageParameters}>
                  <GearIcon className={s.buttonIcon} />
                  {t('dashboard.entities.parameters_label', 'Параметры')}
                </Button>
              </>
            )}

            {(viewMode === 'entity-form' || viewMode === 'parameter-manager' || viewMode === 'type-manager') && (
              <>
                {viewMode === 'type-manager' && (
                  <Button onClick={handleStartAddingType} size='3' variant='soft'>
                    <PlusIcon className={s.buttonIcon} />
                    {t('dashboard.entities.create_type', 'Создать тип')}
                  </Button>
                )}
                {viewMode === 'parameter-manager' && (
                  <Button onClick={handleStartAddingParameter} size='3' variant='soft'>
                    <PlusIcon className={s.buttonIcon} />
                    {t('dashboard.entities.add_parameter', 'Добавить параметр')}
                  </Button>
                )}
                <Button onClick={handleBackToList} size='3' variant='soft' color='gray'>
                  {t('dashboard.entities.back_to_list', 'Назад к списку')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Поиск - только в режиме списка */}
        {viewMode === 'list' && (
          <div className={s.searchContainer}>
            <div className={s.searchInput}>
              <MagnifyingGlassIcon className={s.searchIcon} />
              <input
                type='text'
                placeholder={t('dashboard.entities.search_placeholder', 'Поиск сущностей...')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value, selectedEntityTypeId)}
                className={s.input}
              />
            </div>

            <select
              value={selectedEntityTypeId}
              onChange={(e) => {
                const typeId = e.target.value;
                if (typeId) {
                  const event = new CustomEvent('filterByType', {
                    detail: {typeId}
                  });
                  window.dispatchEvent(event);
                  router.push(buildEntityTypePath(projectId, typeId));
                } else {
                  const event = new CustomEvent('clearFilter');
                  window.dispatchEvent(event);
                  router.push(buildEntitiesPath(projectId));
                }
              }}
              className={s.typeFilter}
            >
              <option value=''>{t('dashboard.entities.all_types', 'Все типы')}</option>
              {entityTypes.map((entityType) => (
                <option key={entityType.id} value={entityType.id}>
                  {entityType.name}
                </option>
              ))}
            </select>

            {/* Переключатель режимов - показываем только если выбран конкретный тип */}
            {selectedEntityTypeId && (
              <div className={s.viewToggle}>
                <button onClick={() => setListViewMode('grid')} className={`${s.viewButton} ${listViewMode === 'grid' ? s.active : ''}`} title='Грид'>
                  <StackIcon />
                </button>
                <button onClick={() => setListViewMode('table')} className={`${s.viewButton} ${listViewMode === 'table' ? s.active : ''}`} title='Таблица'>
                  <ListBulletIcon />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Контент в зависимости от режима */}
      <div className={s.content}>
        {viewMode === 'list' && <EntityList entities={entities} parameters={parameters} onEditEntity={handleEditEntity} onDeleteEntity={handleDeleteEntity} viewMode={listViewMode} />}

        {viewMode === 'entity-form' && (
          <EntityForm key={editingEntity?.id || 'new'} projectId={projectId} entity={editingEntity} entityTypes={entityTypes} onSave={handleEntitySavedFromForm} onCancel={handleBackToList} />
        )}

        {viewMode === 'parameter-manager' && (
          <ParameterManager projectId={projectId} parameters={parameters} onParametersUpdated={handleParametersUpdated} onClose={handleBackToList} onEditParameter={handleEditParameter} />
        )}

        {viewMode === 'type-manager' && (
          <TypeManager projectId={projectId} onClose={handleBackToList} onTypesUpdated={handleTypesUpdated} onStartEditingType={handleStartEditingType} entityTypes={entityTypes} />
        )}

        {/* Модальное окно создания/редактирования типа */}
        <CreateTypeModal
          isOpen={showCreateTypeModal}
          projectId={projectId}
          onClose={handleCloseCreateTypeModal}
          onTypeCreated={handleTypeCreated}
          onTypeUpdated={handleTypeUpdated}
          editingType={editingType}
          parameters={parameters}
        />

        {/* Модальное окно создания/редактирования параметра */}
        <CreateParameterModal
          isOpen={showCreateParameterModal}
          projectId={projectId}
          onClose={handleCloseParameterModal}
          onParameterCreated={handleParameterCreated}
          onParameterUpdated={handleParameterUpdated}
          editingParameter={editingParameter}
        />
      </div>

      {/* Модальное окно создания сущности - вынесено за пределы content */}
      <CreateEntityModal
        isOpen={showCreateEntityModal}
        onClose={handleCloseCreateEntityModal}
        onEntitySaved={handleEntitySaved}
        projectId={projectId}
        entity={editingEntity}
        defaultEntityTypeId={!editingEntity && selectedEntityTypeId ? selectedEntityTypeId : undefined}
      />

      {/* Модальное окно AI генерации сущности */}
      <AIEntityGenerationModal isOpen={showAIGenerateModal} onClose={handleCloseAIGenerateModal} projectId={projectId} onEntityCreated={handleAIEntityCreated} />

      {/* Модальное окно для отсутствия доступа к ИИ */}
      <NoAIAccessModal isOpen={showNoAccessModal} onClose={() => setShowNoAccessModal(false)} />
    </div>
  );
};
