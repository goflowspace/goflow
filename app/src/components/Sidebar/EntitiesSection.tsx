import React, {useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useEntities} from '@hooks/useEntities';
import {CaretDownIcon, CaretRightIcon} from '@radix-ui/react-icons';
import {Text} from '@radix-ui/themes';
import {Entity, EntityType} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import {imageGCSService} from '../../services/imageGCS.service';
import {isGCSMediaValue} from '../../utils/imageAdapterUtils';
import {getReliableTeamId} from '../../utils/teamUtils';
import {ImagePlaceholder} from '../common/ImagePlaceholder';

import s from './EntitiesSection.module.scss';

// Компонент для отдельной сущности
interface EntityItemProps {
  entity: Entity;
  onClick: (entity: Entity) => void;
}

const EntityItem: React.FC<EntityItemProps> = ({entity, onClick}) => {
  const {projectId} = useCurrentProject();
  const teamId = getReliableTeamId();

  // Функция для получения thumbnail URL через proxy
  const getThumbnailUrlForEntity = (entity: Entity): string | null => {
    if (!entity.image || !isGCSMediaValue(entity.image) || !teamId || !projectId) {
      return null;
    }

    return imageGCSService.getThumbnailProxyUrl(teamId, projectId, entity.id, 'entity-avatar', entity.image);
  };

  const handleDragStart = (e: React.DragEvent) => {
    const dragData = {
      type: 'entity',
      entity: entity
    };

    // Передаем данные сущности через dataTransfer
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className={s.entity_item} onClick={() => onClick(entity)} draggable={true} onDragStart={handleDragStart}>
      <div className={s.entity_avatar}>
        {getThumbnailUrlForEntity(entity) ? <img src={getThumbnailUrlForEntity(entity)!} alt={entity.name} className={s.entity_image} /> : <ImagePlaceholder size='small' />}
      </div>
      <Text size='2' className={s.entity_name}>
        {entity.name}
      </Text>
    </div>
  );
};

// Компонент для типа сущности
interface EntityTypeItemProps {
  entityType: EntityType;
  entities: Entity[];
  onEntityClick: (entity: Entity) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const EntityTypeItem: React.FC<EntityTypeItemProps> = ({entityType, entities, onEntityClick, isExpanded, onToggleExpanded}) => {
  const {t} = useTranslation();

  return (
    <div className={s.entity_type_item}>
      <div className={s.entity_type_header} onClick={onToggleExpanded}>
        {isExpanded ? <CaretDownIcon /> : <CaretRightIcon />}
        <Text size='2' weight='medium' className={s.entity_type_name}>
          {entityType.name}
        </Text>
        <Text size='1' color='gray' className={s.entity_count}>
          ({entities.length})
        </Text>
      </div>

      {isExpanded && (
        <div className={s.entity_type_content}>
          {entities.length === 0 ? (
            <div className={s.no_entities}>
              <Text size='1' color='gray'>
                {t('dashboard.entities.no_entities_of_type', 'Нет сущностей этого типа')}
              </Text>
            </div>
          ) : (
            <div className={s.entities_list}>
              {entities.map((entity) => (
                <EntityItem key={entity.id} entity={entity} onClick={onEntityClick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Основной компонент раздела сущностей
interface EntitiesSectionProps {
  onEntityClick?: (entity: Entity) => void;
}

const EntitiesSection: React.FC<EntitiesSectionProps> = ({onEntityClick}) => {
  const {t} = useTranslation();
  const {projectId} = useCurrentProject();

  const {entitiesByType, entityTypes, isLoading, error} = useEntities({
    projectId,
    includeOriginalImages: false // Используем только thumbnails для экономии трафика
  });

  // Состояние развернутости типов (ключ - ID типа, значение - развернут ли)
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  // Сортируем типы сущностей по порядку
  const sortedEntityTypes = [...entityTypes].sort((a, b) => a.order - b.order);

  // Функция для переключения развернутости типа
  const toggleTypeExpanded = (typeId: string) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  const handleEntityClick = (entity: Entity) => {
    if (onEntityClick) {
      onEntityClick(entity);
    } else {
      // Диспатчим кастомное событие для совместимости с существующим кодом
      const event = new CustomEvent('openEntity', {
        detail: {entity}
      });
      window.dispatchEvent(event);
    }
  };

  if (isLoading) {
    return (
      <div className={s.loading_state}>
        <Text size='1' color='gray'>
          {t('entities.loading', 'Загрузка сущностей...')}
        </Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.error_state}>
        <Text size='1' color='red'>
          {error}
        </Text>
      </div>
    );
  }

  if (sortedEntityTypes.length === 0) {
    return (
      <div className={s.empty_state}>
        <Text size='1' color='gray' align='center'>
          {t('dashboard.entities.no_entity_types_editor', 'Типы сущностей не созданы. Создайте первый тип в разделе сущностей.')}
        </Text>
      </div>
    );
  }

  return (
    <div className={s.entities_section}>
      {sortedEntityTypes.map((entityType) => {
        const entitiesForType = entitiesByType[entityType.id]?.entities || [];

        return (
          <EntityTypeItem
            key={entityType.id}
            entityType={entityType}
            entities={entitiesForType}
            onEntityClick={handleEntityClick}
            isExpanded={expandedTypes[entityType.id] || false}
            onToggleExpanded={() => toggleTypeExpanded(entityType.id)}
          />
        );
      })}
    </div>
  );
};

export default EntitiesSection;
