import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {api} from '@services/api';
import {Entity, MultiEntityValue, SingleEntityValue} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import {useCurrentProject} from '../../../../hooks/useCurrentProject';
import {imageGCSService} from '../../../../services/imageGCS.service';
import {isGCSMediaValue} from '../../../../utils/imageAdapterUtils';
import {useReliableTeamId} from '../../../../utils/teamUtils';
import {ImagePlaceholder} from '../../../common/ImagePlaceholder';

import s from './EntitySelector.module.scss';

interface EntitySelectorProps {
  projectId: string;
  value: SingleEntityValue | MultiEntityValue | null;
  isMultiple: boolean;
  onChange: (value: SingleEntityValue | MultiEntityValue | null) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeEntityId?: string; // ID сущности, которую нужно исключить из выборки (например, текущую редактируемую)
}

export const EntitySelector: React.FC<EntitySelectorProps> = ({projectId, value, isMultiple, onChange, placeholder, disabled = false, excludeEntityId}) => {
  const {t} = useTranslation();
  const {projectId: currentProjectId} = useCurrentProject();
  const teamId = useReliableTeamId();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Функция для получения thumbnail URL через proxy
  const getThumbnailUrlForEntity = (entity: Entity): string | null => {
    if (!entity.image || !isGCSMediaValue(entity.image) || !teamId || !currentProjectId) {
      return null;
    }

    return imageGCSService.getThumbnailProxyUrl(teamId, currentProjectId, entity.id, 'entity-avatar', entity.image);
  };

  // Debounce для поискового запроса
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Задержка 300мс

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Загружаем список сущностей
  useEffect(() => {
    // Загружаем только если dropdown открыт или есть поисковый запрос
    if (!isDropdownOpen && !debouncedSearchTerm) {
      return;
    }

    const loadEntities = async () => {
      setIsLoading(true);

      try {
        const response = await api.getEntities(projectId, {
          search: debouncedSearchTerm || undefined,
          limit: 50
        });

        // Исключаем текущую редактируемую сущность из результатов
        let filteredEntities = response.entities;
        if (excludeEntityId) {
          filteredEntities = response.entities.filter((entity) => entity.id !== excludeEntityId);
        }

        setEntities(filteredEntities);
      } catch (error) {
        console.error('Failed to load entities:', error);
        setEntities([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntities();
  }, [projectId, debouncedSearchTerm, excludeEntityId, isDropdownOpen]);

  // Получаем выбранные сущности
  const selectedEntities = useMemo(() => {
    if (!value) return [];

    if (isMultiple) {
      const multiValue = value as MultiEntityValue;
      return multiValue.entities || [];
    } else {
      const singleValue = value as SingleEntityValue;
      return singleValue.entity ? [singleValue.entity] : [];
    }
  }, [value, isMultiple]);

  // Получаем доступные для выбора сущности (исключаем уже выбранные)
  const availableEntities = useMemo(() => {
    const selectedIds = new Set(selectedEntities.map((e: Entity) => e.id));
    return entities.filter((entity: Entity) => !selectedIds.has(entity.id));
  }, [entities, selectedEntities]);

  // Обработчик выбора сущности
  const handleEntitySelect = (entity: Entity) => {
    if (isMultiple) {
      const currentValue = value as MultiEntityValue;
      const currentEntities = currentValue?.entities || [];
      const currentEntityIds = currentValue?.entityIds || [];

      const newEntities = [...currentEntities, entity];
      const newEntityIds = [...currentEntityIds, entity.id];

      onChange({
        entityIds: newEntityIds,
        entities: newEntities
      });
    } else {
      onChange({
        entityId: entity.id,
        entity
      });
      setIsDropdownOpen(false);
    }

    setSearchTerm('');
  };

  // Обработчик удаления сущности
  const handleEntityRemove = (entityId: string) => {
    if (isMultiple) {
      const currentValue = value as MultiEntityValue;
      const currentEntities = currentValue?.entities || [];
      const currentEntityIds = currentValue?.entityIds || [];

      const newEntities = currentEntities.filter((e: Entity) => e.id !== entityId);
      const newEntityIds = currentEntityIds.filter((id: string) => id !== entityId);

      if (newEntities.length === 0) {
        onChange(null);
      } else {
        onChange({
          entityIds: newEntityIds,
          entities: newEntities
        });
      }
    } else {
      onChange(null);
    }
  };

  // Обработчик очистки
  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div className={s.container}>
      <div className={`${s.fieldContainer} ${disabled ? s.disabled : ''}`}>
        {/* Выбранные сущности */}
        {selectedEntities.length > 0 && (
          <div className={s.selectedEntities}>
            {selectedEntities.map((entity) => (
              <div key={entity.id} className={s.selectedEntity}>
                {getThumbnailUrlForEntity(entity) ? <img src={getThumbnailUrlForEntity(entity)!} alt={entity.name} className={s.entityImage} /> : <ImagePlaceholder size='small' />}
                <span className={s.entityName}>{entity.name}</span>
                <span className={s.entityType}>({entity.entityType?.name})</span>
                {!disabled && (
                  <button type='button' onClick={() => handleEntityRemove(entity.id)} className={s.removeButton} title={t('dashboard.entities.selector.remove', 'Удалить')}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Поле для поиска и выбора */}
        {!disabled && (isMultiple || selectedEntities.length === 0) ? (
          <div className={s.searchContainer}>
            <input
              type='text'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              placeholder={placeholder || t('dashboard.entities.selector.placeholder', 'Поиск сущностей...')}
              className={s.searchInputInField}
              disabled={disabled}
            />

            {/* Выпадающий список */}
            {isDropdownOpen && (
              <div className={s.dropdown}>
                {isLoading ? (
                  <div className={s.loadingItem}>{t('dashboard.entities.selector.loading', 'Загрузка...')}</div>
                ) : availableEntities.length > 0 ? (
                  availableEntities.map((entity: Entity) => (
                    <div key={entity.id} className={s.dropdownItem} onMouseDown={() => handleEntitySelect(entity)}>
                      <div className={s.dropdownItemContent}>
                        {getThumbnailUrlForEntity(entity) ? <img src={getThumbnailUrlForEntity(entity)!} alt={entity.name} className={s.entityImage} /> : <ImagePlaceholder size='small' />}
                        <div className={s.entityInfo}>
                          <div className={s.dropdownEntityName}>{entity.name}</div>
                          <div className={s.dropdownEntityType}>{entity.entityType?.name}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={s.noResultsItem}>{t('dashboard.entities.selector.no_results', 'Сущности не найдены')}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          // Показываем placeholder когда нет возможности редактирования
          selectedEntities.length === 0 && (
            <div className={`${s.emptyState} ${disabled ? s.disabled : ''}`} onClick={() => !disabled && setIsDropdownOpen(true)}>
              {placeholder || t('dashboard.entities.selector.placeholder', 'Поиск сущностей...')}
            </div>
          )
        )}
      </div>

      {/* Кнопка очистки */}
      {!disabled && selectedEntities.length > 0 && (
        <button type='button' onClick={handleClear} className={s.clearButton}>
          {t('dashboard.entities.selector.clear', 'Очистить')}
        </button>
      )}
    </div>
  );
};
