import React from 'react';

import {Pencil1Icon, TrashIcon} from '@radix-ui/react-icons';
import {Entity, EntityParameter, getEntityTypeDisplay} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import {useCurrentProject} from '../../../../hooks/useCurrentProject';
import {imageGCSService} from '../../../../services/imageGCS.service';
import {generateEntityTypeColors} from '../../../../utils/colorUtils';
import {isGCSMediaValue} from '../../../../utils/imageAdapterUtils';
import {useReliableTeamId} from '../../../../utils/teamUtils';
import {ImagePlaceholder} from '../../../common/ImagePlaceholder';

import s from './EntityList.module.css';

// Функция для отображения значения параметра
const renderParameterValue = (
  value: any,
  parameterType?: string,
  t?: (key: string, fallback: string) => string,
  entityId?: string,
  parameterId?: string,
  mediaParameterUrlsMap?: Map<string, string>
) => {
  // Обработка массивов (multi select)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return t ? t('dashboard.entities.not_selected', 'Не выбрано') : 'Не выбрано';
    }
    if (value.length <= 3) {
      return value.join(', ');
    }
    return `${value.slice(0, 3).join(', ')} (+${value.length - 3})`;
  }

  // Если это MEDIA параметр - отображаем GCS изображение
  if (parameterType === 'MEDIA') {
    if (isGCSMediaValue(value) && entityId && parameterId && mediaParameterUrlsMap) {
      const mapKey = `${entityId}-${parameterId}`;
      const thumbnailUrl = mediaParameterUrlsMap.get(mapKey);
      if (thumbnailUrl) {
        return (
          <img
            src={thumbnailUrl}
            alt={t ? t('dashboard.entities.media', 'Медиа') : 'Медиа'}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '3px',
              objectFit: 'cover'
            }}
          />
        );
      }
    }

    // Fallback для изображений без URL
    return <ImagePlaceholder size='small' style={{fontSize: '12px'}} />;
  }

  // Обработка значений типа SINGLE_ENTITY
  if (parameterType === 'SINGLE_ENTITY' && value && typeof value === 'object') {
    if (value.entity) {
      return (
        <span style={{color: '#0066cc', fontWeight: 'bold'}}>
          {value.entity.name} ({value.entity.entityType?.name})
        </span>
      );
    }
    if (value.entityId) {
      return (
        <span style={{color: '#666'}}>
          {t ? t('dashboard.entities.entity_reference', 'Ссылка на сущность') : 'Ссылка на сущность'} ({value.entityId.slice(-6)})
        </span>
      );
    }
  }

  // Обработка значений типа MULTI_ENTITY
  if (parameterType === 'MULTI_ENTITY' && value && typeof value === 'object') {
    if (value.entities && Array.isArray(value.entities)) {
      if (value.entities.length === 0) {
        return t ? t('dashboard.entities.no_entities', 'Нет сущностей') : 'Нет сущностей';
      }
      if (value.entities.length <= 2) {
        return (
          <>
            {value.entities.map((entity: any, index: number) => (
              <span key={entity.id || `entity-${index}`}>
                <span style={{color: '#0066cc', fontWeight: 'bold'}}>{entity.name}</span>
                {index < value.entities.length - 1 && ', '}
              </span>
            ))}
          </>
        );
      }
      return (
        <span>
          {value.entities.slice(0, 2).map((entity: any, index: number) => (
            <span key={entity.id || `entity-slice-${index}`}>
              <span style={{color: '#0066cc', fontWeight: 'bold'}}>{entity.name}</span>
              {index < 1 && ', '}
            </span>
          ))}
          <span style={{color: '#666'}}>
            {', '}(+{value.entities.length - 2} {t ? t('dashboard.entities.more', 'ещё') : 'ещё'})
          </span>
        </span>
      );
    }
    if (value.entityIds && Array.isArray(value.entityIds)) {
      const count = value.entityIds.length;
      return (
        <span style={{color: '#666'}}>
          {count} {t ? t('dashboard.entities.entity_references', 'ссылок на сущности') : 'ссылок на сущности'}
        </span>
      );
    }
  }

  // Обработка других объектов
  if (value && typeof value === 'object') {
    // Если это объект с полезными данными, попробуем извлечь строковое представление
    if (value.name || value.title || value.label) {
      return value.name || value.title || value.label;
    }
    return t ? t('dashboard.entities.object', 'Объект') : 'Объект';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? (t ? t('dashboard.entities.yes', 'Да') : 'Да') : t ? t('dashboard.entities.no', 'Нет') : 'Нет';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (value === null || value === undefined) {
    return t ? t('dashboard.entities.not_set', 'Не задано') : 'Не задано';
  }

  return String(value);
};

interface EntityListProps {
  entities: Entity[];
  parameters: EntityParameter[];
  onEditEntity: (entity: Entity) => void;
  onDeleteEntity: (entityId: string) => void;
  viewMode: 'list' | 'grid' | 'table';
}

export const EntityList: React.FC<EntityListProps> = ({entities, parameters, onEditEntity, onDeleteEntity, viewMode}) => {
  const {t} = useTranslation();

  // Для thumbnail используем proxy URL (работает без CORS проблем)
  // Для других размеров можно использовать batch loading
  const {projectId} = useCurrentProject();
  const teamId = useReliableTeamId();

  // Создаем Map thumbnail URLs через proxy для аватаров
  const thumbnailUrlsMap = new Map<string, string>();
  entities.forEach((entity) => {
    if (isGCSMediaValue(entity.image) && projectId && teamId) {
      // Используем proxy URL для thumbnail с cache busting
      const proxyUrl = imageGCSService.getThumbnailProxyUrl(
        teamId,
        projectId,
        entity.id,
        'entity-avatar', // Стандартный parameterId для avatars
        entity.image
      );
      thumbnailUrlsMap.set(entity.id, proxyUrl);
    }
  });

  // Создаем Map thumbnail URLs для MEDIA параметров
  const mediaParameterUrlsMap = new Map<string, string>();
  entities.forEach((entity) => {
    entity.values?.forEach((value) => {
      if (value.parameter?.valueType === 'MEDIA' && isGCSMediaValue(value.value) && projectId && teamId) {
        const proxyUrl = imageGCSService.getThumbnailProxyUrl(teamId, projectId, entity.id, value.parameterId, value.value);
        const mapKey = `${entity.id}-${value.parameterId}`;
        mediaParameterUrlsMap.set(mapKey, proxyUrl);
      }
    });
  });

  const handleDelete = (entity: Entity) => {
    if (window.confirm(t('dashboard.entities.confirm_delete', 'Вы уверены, что хотите удалить эту сущность?'))) {
      onDeleteEntity(entity.id);
    }
  };

  if (entities.length === 0) {
    return (
      <div className={s.emptyState}>
        <p className={s.emptyText}>{t('dashboard.entities.no_entities', 'Нет сущностей')}</p>
        <p className={s.emptyDescription}>{t('dashboard.entities.no_entities_description', 'Создайте первую сущность для вашего проекта')}</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className={s.gridContainer}>
        <div className={s.entitiesGrid}>
          {entities.map((entity, index) => (
            <div key={entity.id || `entity-grid-${index}`} className={s.entityCard} onClick={() => onEditEntity(entity)}>
              {/* Заголовок карточки с основной информацией */}
              <div className={s.cardHeader}>
                {/* Аватар/изображение сущности */}
                <div className={s.entityAvatar}>
                  {isGCSMediaValue(entity.image) && thumbnailUrlsMap.get(entity.id) ? <img src={thumbnailUrlsMap.get(entity.id)!} alt={entity.name} /> : <ImagePlaceholder size='medium' />}
                </div>

                {/* Основная информация */}
                <div className={s.entityInfo}>
                  <h3 className={s.entityName}>{entity.name}</h3>

                  <div className={s.entityTypeContainer}>
                    <span className={s.entityType} style={generateEntityTypeColors(entity.entityType?.type || 'default')}>
                      {entity.entityType?.name || t('dashboard.entities.unknown_type', 'Неизвестный тип')}
                    </span>
                  </div>

                  {entity.description && <p className={s.entityDescription}>{entity.description}</p>}
                </div>

                {/* Действия */}
                <div className={s.cardActions}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditEntity(entity);
                    }}
                    className={`${s.editButton} ${s.actionButton}`}
                    title={t('dashboard.entities.edit', 'Редактировать')}
                  >
                    <Pencil1Icon />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entity);
                    }}
                    className={`${s.deleteButton} ${s.actionButton}`}
                    title={t('dashboard.entities.delete', 'Удалить')}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              {/* Параметры сущности */}
              {entity.values && entity.values.length > 0 && (
                <div className={s.entityParameters}>
                  <div className={s.parametersHeader}>
                    <h4 className={s.parametersTitle}>{t('dashboard.entities.key_parameters', 'Ключевые параметры')}</h4>
                    <span className={s.parametersCount}>{entity.values.length}</span>
                  </div>

                  <div className={s.parametersGrid}>
                    {entity.values.slice(0, 6).map((value, index) => (
                      <div key={value.id || `${entity.id}-param-${index}`} className={s.parameterRow}>
                        <span className={s.parameterName}>{value.parameter?.name}</span>
                        <div className={s.parameterValue}>
                          {value.parameter?.valueType === 'MEDIA' && isGCSMediaValue(value.value) ? (
                            mediaParameterUrlsMap.get(`${entity.id}-${value.parameterId}`) ? (
                              <img src={mediaParameterUrlsMap.get(`${entity.id}-${value.parameterId}`)!} alt={t('dashboard.entities.media', 'Медиа')} className={s.parameterValueImage} />
                            ) : (
                              <ImagePlaceholder size='small' />
                            )
                          ) : (
                            <span className={s.parameterValueText}>{renderParameterValue(value.value, value.parameter?.valueType, t, entity.id, value.parameterId, mediaParameterUrlsMap)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {entity.values.length > 6 && (
                    <div
                      className={s.moreParameters}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEntity(entity);
                      }}
                    >
                      {t('dashboard.entities.more_parameters', 'Еще {{count}} параметров', {count: entity.values.length - 6})}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'table') {
    // Получаем все уникальные параметры для колонок таблицы
    const allParameters = parameters.filter((param) => entities.some((entity) => entity.values?.some((value) => value.parameterId === param.id)));

    return (
      <div className={s.tableContainer}>
        <table className={s.entitiesTable}>
          <thead>
            <tr>
              <th className={s.nameColumn}>{t('dashboard.entities.name', 'Имя')}</th>
              <th className={s.typeColumn}>{t('dashboard.entities.type_column', 'Тип')}</th>
              {allParameters.map((param) => (
                <th key={param.id} className={s.paramColumn}>
                  {param.name}
                </th>
              ))}
              <th className={s.actionsColumn}>{t('dashboard.entities.actions', 'Действия')}</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((entity, index) => (
              <tr key={entity.id || `entity-table-${index}`} className={s.tableRow} onClick={() => onEditEntity(entity)}>
                {/* Имя с аватаркой */}
                <td className={s.nameCell}>
                  <div className={s.nameWithAvatar}>
                    <div className={s.tableAvatar}>
                      {isGCSMediaValue(entity.image) && thumbnailUrlsMap.get(entity.id) ? <img src={thumbnailUrlsMap.get(entity.id)!} alt={entity.name} /> : <ImagePlaceholder size='small' />}
                    </div>
                    <div className={s.nameInfo}>
                      <span className={s.tableName}>{entity.name}</span>
                      {entity.description && <span className={s.tableDescription}>{entity.description}</span>}
                    </div>
                  </div>
                </td>

                {/* Тип */}
                <td className={s.typeCell}>
                  <span className={s.tableEntityType} style={generateEntityTypeColors(entity.entityType?.type || 'default')}>
                    {entity.entityType?.name || t('dashboard.entities.unknown_type', 'Неизвестный тип')}
                  </span>
                </td>

                {/* Параметры */}
                {allParameters.map((param) => {
                  const entityValue = entity.values?.find((value) => value.parameterId === param.id);
                  return (
                    <td key={param.id} className={s.paramCell}>
                      {entityValue ? (
                        <div className={s.tableParamValue}>
                          {param.valueType === 'MEDIA' && isGCSMediaValue(entityValue.value) ? (
                            mediaParameterUrlsMap.get(`${entity.id}-${param.id}`) ? (
                              <img src={mediaParameterUrlsMap.get(`${entity.id}-${param.id}`)!} alt={t('dashboard.entities.media', 'Медиа')} className={s.tableParamImage} />
                            ) : (
                              <ImagePlaceholder size='small' />
                            )
                          ) : (
                            <span className={s.tableParamText}>{renderParameterValue(entityValue.value, param.valueType, t, entity.id, param.id, mediaParameterUrlsMap)}</span>
                          )}
                        </div>
                      ) : (
                        <span className={s.emptyValue}>—</span>
                      )}
                    </td>
                  );
                })}

                {/* Действия */}
                <td className={s.actionsCell}>
                  <div className={s.tableActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEntity(entity);
                      }}
                      className={`${s.editButton} ${s.tableActionButton}`}
                      title={t('dashboard.entities.edit', 'Редактировать')}
                    >
                      <Pencil1Icon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entity);
                      }}
                      className={`${s.deleteButton} ${s.tableActionButton}`}
                      title={t('dashboard.entities.delete', 'Удалить')}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // List view
  return (
    <div className={s.listContainer}>
      <div className={s.entitiesList}>
        {entities.map((entity, index) => (
          <div key={entity.id || `entity-list-${index}`} className={s.entityRow} onClick={() => onEditEntity(entity)}>
            <div className={s.entityMainInfo}>
              <div className={s.entityAvatar}>
                {isGCSMediaValue(entity.image) && thumbnailUrlsMap.get(entity.id) ? <img src={thumbnailUrlsMap.get(entity.id)!} alt={entity.name} /> : <ImagePlaceholder size='medium' />}
              </div>

              <div className={s.entityDetails}>
                <h3 className={s.entityName}>{entity.name}</h3>
                <div className={s.entityMeta}>
                  <span className={s.entityType}>{getEntityTypeDisplay(entity)}</span>
                  {entity.description && <span className={s.entityDescription}>{entity.description}</span>}
                </div>
              </div>
            </div>

            <div className={s.entityParameters}>
              {entity.values?.slice(0, 2).map((value, index) => (
                <div key={value.id || `${entity.id}-list-param-${index}`} className={s.parameterValue}>
                  <span className={s.parameterName}>{value.parameter?.name}:</span>
                  <span className={s.parameterValueText}>{renderParameterValue(value.value, value.parameter?.valueType, t, entity.id, value.parameterId, mediaParameterUrlsMap)}</span>
                </div>
              ))}
            </div>

            <div className={s.rowActions}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditEntity(entity);
                }}
                className={s.editButton}
                title={t('dashboard.entities.edit', 'Редактировать')}
              >
                <Pencil1Icon />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(entity);
                }}
                className={s.deleteButton}
                title={t('dashboard.entities.delete', 'Удалить')}
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
