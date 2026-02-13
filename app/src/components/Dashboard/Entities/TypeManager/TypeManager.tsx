import React, {useEffect, useState} from 'react';

import {CheckIcon, Cross2Icon, GearIcon, TrashIcon} from '@radix-ui/react-icons';
import {trackEntityTypeCreated, trackEntityTypeDeleted} from '@services/analytics';
import {api} from '@services/api';
import {CreateEntityTypeDto, EntityType, UpdateEntityTypeDto, getEntityTypeDisplay} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import s from './TypeManager.module.css';

interface TypeManagerProps {
  projectId: string;
  onClose: () => void;
  onTypesUpdated?: (types: EntityType[]) => void;
  onStartEditingType?: (type: EntityType) => void;
  entityTypes?: EntityType[];
}

interface NewTypeData {
  name: string;
  type: string;
  description: string;
}

export const TypeManager: React.FC<TypeManagerProps> = ({projectId, onClose, onTypesUpdated, onStartEditingType, entityTypes: externalEntityTypes}) => {
  const {t} = useTranslation();

  // Состояние
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Редактирование типов - теперь происходит в модальном окне
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeData, setNewTypeData] = useState<NewTypeData>({
    name: '',
    type: '',
    description: ''
  });

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [projectId]);

  // Обновление локального состояния при изменении внешних данных
  useEffect(() => {
    if (externalEntityTypes) {
      setEntityTypes(externalEntityTypes);
    }
  }, [externalEntityTypes]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const typesData = await api.getEntityTypes(projectId);

      console.log(t('dashboard.entities.type.loaded', 'Типы сущностей загружены:'), typesData);

      setEntityTypes(typesData || []);
    } catch (error) {
      console.error(t('dashboard.entities.type.load_failed', 'Не удалось загрузить данные:'), error);
      setEntityTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============= УПРАВЛЕНИЕ ТИПАМИ =============

  const startAddingType = () => {
    setNewTypeData({name: '', type: '', description: ''});
    setIsAddingNewType(true);
  };

  const cancelAddingType = () => {
    setIsAddingNewType(false);
    setNewTypeData({name: '', type: '', description: ''});
  };

  const createType = async () => {
    if (!newTypeData.name.trim() || !newTypeData.type.trim()) return;

    try {
      const typeData: CreateEntityTypeDto = {
        name: newTypeData.name.trim(),
        type: newTypeData.type.trim().toLowerCase().replace(/\s+/g, '_'),
        description: newTypeData.description.trim() || undefined,
        order: entityTypes.length
      };

      const newType = await api.createEntityType(projectId, typeData);

      // Трекинг создания типа сущности
      trackEntityTypeCreated(
        newType.name,
        [], // Параметры пока пустые, так как они добавляются отдельно
        projectId
      );

      const updatedTypes = [...entityTypes, newType];
      setEntityTypes(updatedTypes);
      onTypesUpdated?.(updatedTypes);
      cancelAddingType();
    } catch (error) {
      console.error(t('dashboard.entities.type.create_failed', 'Не удалось создать тип:'), error);
      window.alert(t('dashboard.entities.type.create_failed_message', 'Не удалось создать тип. Возможно, тип с таким идентификатором уже существует.'));
    }
  };

  const startEditingType = (entityType: EntityType) => {
    onStartEditingType?.(entityType);
  };

  const deleteType = async (typeId: string) => {
    const entityType = entityTypes.find((t) => t.id === typeId);
    if (!entityType) return;

    const entitiesCount = entityType._count?.entities || 0;
    const confirmMessage =
      entitiesCount > 0
        ? t('dashboard.entities.type.confirm_delete_with_entities', 'Этот тип используется в {{count}} сущностях. Вы уверены, что хотите удалить его? Все сущности этого типа также будут удалены.', {
            count: entitiesCount
          })
        : t('dashboard.entities.type.confirm_delete', 'Вы уверены, что хотите удалить этот тип?');

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.deleteEntityType(projectId, typeId);

      // Трекинг удаления типа сущности
      trackEntityTypeDeleted(entityType.name, projectId);

      const updatedTypes = entityTypes.filter((t) => t.id !== typeId);
      setEntityTypes(updatedTypes);
      onTypesUpdated?.(updatedTypes);
    } catch (error) {
      console.error(t('dashboard.entities.type.delete_failed', 'Не удалось удалить тип:'), error);
      window.alert(t('dashboard.entities.type.delete_failed_message', 'Не удалось удалить тип. Возможно, он используется в сущностях.'));
    }
  };

  // ============= РЕНДЕР =============

  const renderTypeForm = () => (
    <div className={s.form}>
      <h4 className={s.formTitle}>{t('dashboard.entities.type.create_new', 'Создать новый тип')}</h4>

      <div className={s.formRow}>
        <div className={s.formGroup}>
          <label className={`${s.label} ${s.required}`}>{t('dashboard.entities.type.name', 'Название типа')}</label>
          <input
            type='text'
            value={newTypeData.name}
            onChange={(e) => setNewTypeData((prev) => ({...prev, name: e.target.value}))}
            className={s.input}
            placeholder={t('dashboard.entities.type.name_placeholder', 'Например: Персонаж')}
          />
        </div>

        <div className={s.formGroup}>
          <label className={`${s.label} ${s.required}`}>{t('dashboard.entities.type.identifier', 'Идентификатор')}</label>
          <input
            type='text'
            value={newTypeData.type}
            onChange={(e) =>
              setNewTypeData((prev) => ({
                ...prev,
                type: e.target.value.toLowerCase().replace(/\s+/g, '_')
              }))
            }
            className={s.input}
            placeholder={t('dashboard.entities.type.identifier_placeholder', 'character')}
          />
        </div>
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>{t('dashboard.entities.type.description', 'Описание')}</label>
        <textarea
          value={newTypeData.description}
          onChange={(e) => setNewTypeData((prev) => ({...prev, description: e.target.value}))}
          className={s.textarea}
          placeholder={t('dashboard.entities.type.description_placeholder', 'Описание типа сущности')}
        />
      </div>

      <div className={s.formActions}>
        <button onClick={createType} className={s.saveButton} disabled={!newTypeData.name.trim() || !newTypeData.type.trim()}>
          <CheckIcon />
          {t('dashboard.entities.type.create', 'Создать')}
        </button>
        <button onClick={cancelAddingType} className={s.cancelButton}>
          <Cross2Icon />
          {t('dashboard.cancel', 'Отмена')}
        </button>
      </div>
    </div>
  );

  const renderTypeCard = (entityType: EntityType) => (
    <div key={entityType.id} className={s.typeItem} onClick={() => startEditingType(entityType)}>
      <div className={s.typeInfo}>
        <h4 className={s.typeName}>{entityType.name}</h4>
        {entityType.description && <p className={s.typeDescription}>{entityType.description}</p>}

        <div className={s.typeMeta}>
          <span className={s.typeId}>{entityType.type}</span>
          {entityType.isDefault && <span className={s.defaultBadge}>{t('dashboard.entities.type.default', 'По умолчанию')}</span>}
          <span className={s.entityCount}>{t('dashboard.entities.type.entities_count', 'Сущностей: {{count}}', {count: entityType._count?.entities || 0})}</span>
        </div>

        {entityType.parameters && entityType.parameters.length > 0 && (
          <div className={s.parametersList}>
            <strong>{t('dashboard.entities.parameters_label', 'Параметры')}:</strong>
            {entityType.parameters.map(
              (typeParam) =>
                typeParam.parameter && (
                  <div key={typeParam.parameter.id} className={s.parameterItem}>
                    <div className={s.parameterInfo}>
                      <span className={s.parameterName}>{typeParam.parameter.name}</span>
                      <span className={s.parameterType}>{typeParam.parameter.valueType}</span>
                      {typeParam.required && <span className={s.requiredBadge}>{t('dashboard.entities.required', 'Обязательный')}</span>}
                    </div>
                  </div>
                )
            )}
          </div>
        )}
      </div>

      {!entityType.isDefault && (
        <div className={s.typeActions}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteType(entityType.id);
            }}
            className={`${s.actionButton} ${s.deleteButton}`}
            title={t('dashboard.entities.type.delete', 'Удалить тип')}
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className={s.container}>
        <div className={s.loading}>{t('dashboard.entities.loading', 'Загрузка...')}</div>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <div className={s.content}>
        <div className={s.section}>
          {isAddingNewType && renderTypeForm()}

          <div className={s.typesList}>
            {entityTypes.length === 0 ? (
              <div className={s.emptyState}>
                <div className={s.emptyText}>{t('dashboard.entities.type.no_types', 'Нет типов сущностей')}</div>
                <div className={s.emptyDescription}>{t('dashboard.entities.type.create_first', 'Создайте первый тип сущности для начала работы')}</div>
              </div>
            ) : (
              entityTypes.map(renderTypeCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
