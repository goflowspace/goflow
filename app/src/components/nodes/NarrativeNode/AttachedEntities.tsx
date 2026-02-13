import React, {useMemo, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useEntities} from '@hooks/useEntities';
import {ChevronDownIcon, ChevronUpIcon, Cross2Icon} from '@radix-ui/react-icons';
import {Entity} from '@types-folder/entities';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import {imageGCSService} from '../../../services/imageGCS.service';
import {isGCSMediaValue} from '../../../utils/imageAdapterUtils';
import {useReliableTeamId} from '../../../utils/teamUtils';
import {ImagePlaceholder} from '../../common/ImagePlaceholder';
import {AISkeleton} from '../shared/AISkeleton';

import s from './AttachedEntities.module.scss';

interface AttachedEntitiesProps {
  entityIds: string[];
  onRemoveEntity: (entityId: string) => void;
  maxVisibleRows?: number; // Максимальное количество видимых строк без раскрытия
  entitiesPerRow?: number; // Количество сущностей в строке
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  isAILoading?: boolean; // Флаг для показа скелетона во время AI операций
}

const AttachedEntities: React.FC<AttachedEntitiesProps> = ({
  entityIds,
  onRemoveEntity,
  maxVisibleRows = 1,
  entitiesPerRow = 4,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDragOver = false,
  isAILoading = false
}) => {
  const {t} = useTranslation();
  const {projectId} = useCurrentProject();
  const teamId = useReliableTeamId();
  const [isExpanded, setIsExpanded] = useState(false);

  // Функция для получения thumbnail URL через proxy
  const getThumbnailUrlForEntity = (entity: Entity): string | null => {
    if (!entity.image || !isGCSMediaValue(entity.image) || !teamId || !projectId) {
      return null;
    }

    return imageGCSService.getThumbnailProxyUrl(teamId, projectId, entity.id, 'entity-avatar', entity.image);
  };

  const {entities} = useEntities({
    projectId,
    includeOriginalImages: false
  });

  // Получаем полные данные сущностей по ID
  const attachedEntities = useMemo(() => {
    if (!entityIds || !Array.isArray(entityIds) || !entities || !Array.isArray(entities)) {
      return [];
    }
    return entityIds.map((id) => entities.find((entity) => entity.id === id)).filter((entity): entity is Entity => entity !== undefined);
  }, [entityIds, entities]);

  // Логика для показа/скрытия строк
  const maxVisibleEntities = maxVisibleRows * entitiesPerRow;
  const needsExpansion = attachedEntities.length > maxVisibleEntities;
  const visibleEntities = needsExpansion && !isExpanded ? attachedEntities.slice(0, maxVisibleEntities) : attachedEntities;

  const hiddenCount = attachedEntities.length - maxVisibleEntities;

  // Показываем скелетон во время AI операций
  if (isAILoading) {
    return (
      <div className={cls(s.attached_entities, {[s.drag_over]: isDragOver})}>
        <AISkeleton variant='entities' active={true} />
      </div>
    );
  }

  // Показываем drop зону даже когда нет сущностей
  if (attachedEntities.length === 0) {
    return (
      <div className={cls(s.attached_entities, {[s.drag_over]: isDragOver})} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
        <div className={s.empty_drop_zone} title={t('narrative_node.drop_entities_here', 'Перетащите сущности сюда')}>
          <span className={s.drop_zone_text}>{t('narrative_node.drop_entities_here', 'Перетащите сущности сюда')}</span>
        </div>
      </div>
    );
  }

  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleRemoveEntity = (e: React.MouseEvent, entityId: string) => {
    e.stopPropagation();
    onRemoveEntity(entityId);
  };

  return (
    <div className={cls(s.attached_entities, {[s.drag_over]: isDragOver})} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div className={s.entities_grid}>
        {visibleEntities.map((entity) => (
          <div key={entity.id} className={s.entity_item} title={entity.name}>
            <div className={s.entity_avatar}>
              {getThumbnailUrlForEntity(entity) ? <img src={getThumbnailUrlForEntity(entity)!} alt={entity.name} className={s.entity_image} /> : <ImagePlaceholder size='small' />}
            </div>

            <button className={s.remove_button} onClick={(e) => handleRemoveEntity(e, entity.id)} title={t('narrative_node.remove_entity', 'Отвязать сущность')}>
              <Cross2Icon className={s.remove_icon} />
            </button>
          </div>
        ))}
      </div>

      {needsExpansion && (
        <button
          className={s.expand_button}
          onClick={handleToggleExpanded}
          title={isExpanded ? t('narrative_node.collapse_entities', 'Свернуть сущности') : t('narrative_node.expand_entities', `Показать еще ${hiddenCount}`)}
        >
          {isExpanded ? (
            <ChevronUpIcon className={s.expand_icon} />
          ) : (
            <>
              <ChevronDownIcon className={s.expand_icon} />
              <span className={s.hidden_count}>+{hiddenCount}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default AttachedEntities;
