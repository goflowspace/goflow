import React, {useState} from 'react';

import {GearIcon, Pencil1Icon, TrashIcon} from '@radix-ui/react-icons';
import {trackEntityParamDeleted} from '@services/analytics';
import {api} from '@services/api';
import {EntityParameter, PARAMETER_VALUE_TYPE_LABELS} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import s from './ParameterManager.module.css';

interface ParameterManagerProps {
  projectId: string;
  parameters: EntityParameter[];
  onParametersUpdated: (parameters: EntityParameter[]) => void;
  onClose: () => void;
  onEditParameter?: (parameter: EntityParameter) => void;
}

export const ParameterManager: React.FC<ParameterManagerProps> = ({projectId, parameters, onParametersUpdated, onClose, onEditParameter}) => {
  const {t} = useTranslation();

  // Сортируем параметры по порядку
  const sortedParameters = [...parameters].sort((a, b) => a.order - b.order);

  // Начать редактирование параметра
  const startEditingParameter = (parameter: EntityParameter) => {
    onEditParameter?.(parameter);
  };

  // Удалить параметр
  const deleteParameter = async (parameterId: string) => {
    if (!window.confirm(t('dashboard.entities.confirm_delete_parameter', 'Вы уверены, что хотите удалить этот параметр?'))) {
      return;
    }

    try {
      const parameterToDelete = parameters.find((p) => p.id === parameterId);
      await api.deleteEntityParameter(projectId, parameterId);

      // Трекинг удаления параметра сущности
      if (parameterToDelete) {
        trackEntityParamDeleted(
          parameterToDelete.name,
          parameterToDelete.valueType as any,
          'unknown', // entityTypeName не доступен в этом контексте
          projectId
        );
      }

      onParametersUpdated(parameters.filter((p) => p.id !== parameterId));
    } catch (error) {
      console.error(t('dashboard.entities.parameter.delete_error', 'Не удалось удалить параметр:'), error);
    }
  };

  const canDeleteParameter = (parameter: EntityParameter): boolean => {
    return true;
  };

  // Рендер одного параметра
  const renderParameterRow = (parameter: EntityParameter) => {
    return (
      <div key={parameter.id} className={s.parameterRow} onClick={() => startEditingParameter(parameter)} style={{cursor: 'pointer'}}>
        <div className={s.parameterInfo}>
          <div className={s.parameterHeader}>
            <h3 className={s.parameterName}>{parameter.name}</h3>
            <div className={s.parameterMeta}>
              <span className={s.parameterType}>{t(`dashboard.entities.value_types.${parameter.valueType}`, PARAMETER_VALUE_TYPE_LABELS[parameter.valueType])}</span>
            </div>
          </div>

          {parameter.options.length > 0 && (
            <div className={s.parameterOptions}>
              <span className={s.optionsLabel}>{t('dashboard.entities.options', 'Опции')}:</span>
              <span className={s.optionsValue}>
                {parameter.options.slice(0, 3).join(', ')}
                {parameter.options.length > 3 && '...'}
              </span>
            </div>
          )}
        </div>

        <div className={s.parameterActions}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEditingParameter(parameter);
            }}
            className={s.editButton}
            title={t('dashboard.entities.edit_parameter', 'Редактировать параметр')}
          >
            <Pencil1Icon />
          </button>
          {canDeleteParameter(parameter) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteParameter(parameter.id);
              }}
              className={s.deleteButton}
              title={t('dashboard.entities.delete_parameter', 'Удалить параметр')}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={s.container}>
      {/* Список параметров */}
      <div className={s.parametersSection}>
        {sortedParameters.length === 0 ? (
          <div className={s.emptyState}>
            <GearIcon className={s.emptyIcon} />
            <h3 className={s.emptyTitle}>{t('dashboard.entities.no_parameters', 'Нет параметров')}</h3>
            <p className={s.emptyDescription}>{t('dashboard.entities.no_parameters_description', 'Добавьте первый параметр или инициализируйте параметры по умолчанию')}</p>
          </div>
        ) : (
          <div className={s.parametersList}>{sortedParameters.map(renderParameterRow)}</div>
        )}
      </div>
    </div>
  );
};
