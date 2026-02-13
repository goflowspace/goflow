import React, {useEffect, useState} from 'react';

import {CheckIcon, Cross2Icon, PlusIcon} from '@radix-ui/react-icons';
import {trackEntityTypeCreated, trackEntityTypeEdited} from '@services/analytics';
import {api} from '@services/api';
import {CreateEntityTypeDto, EntityParameter, EntityType, EntityTypeParameter, EntityTypeParameterDto, UpdateEntityTypeDto} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import s from './CreateTypeModal.module.css';

interface CreateTypeModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onTypeCreated: (type: EntityType) => void;
  onTypeUpdated?: (type: EntityType) => void;
  editingType?: EntityType | null;
  parameters?: EntityParameter[];
}

interface NewTypeData {
  name: string;
  type: string;
  description: string;
}

export const CreateTypeModal: React.FC<CreateTypeModalProps> = ({isOpen, projectId, onClose, onTypeCreated, onTypeUpdated, editingType, parameters = []}) => {
  const {t} = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typeData, setTypeData] = useState<NewTypeData>({
    name: '',
    type: '',
    description: ''
  });

  // Состояние для управления параметрами типа
  const [typeParameters, setTypeParameters] = useState<EntityTypeParameter[]>([]);
  const [selectedParameterId, setSelectedParameterId] = useState<string>('');
  const [isAddingParameter, setIsAddingParameter] = useState(false);

  const isEditing = !!editingType;

  // Инициализируем данные при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      if (editingType) {
        // Редактирование - заполняем данными существующего типа
        setTypeData({
          name: editingType.name,
          type: editingType.type,
          description: editingType.description || ''
        });
        // Инициализируем параметры типа
        setTypeParameters(editingType.parameters || []);
      } else {
        // Создание - сбрасываем данные
        setTypeData({name: '', type: '', description: ''});
        setTypeParameters([]);
      }
      setSelectedParameterId('');
      setIsAddingParameter(false);
    }
  }, [isOpen, editingType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeData.name.trim() || !typeData.type.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && editingType) {
        // Редактирование существующего типа
        const updateData: UpdateEntityTypeDto = {
          name: typeData.name.trim(),
          type: typeData.type.trim().toLowerCase().replace(/\s+/g, '_'),
          description: typeData.description.trim() || undefined
        };

        const updatedType = await api.updateEntityType(projectId, editingType.id, updateData);

        // Обновляем параметры типа
        const currentParameterIds = editingType.parameters?.map((p) => p.parameterId) || [];
        const newParameterIds = typeParameters.map((tp) => tp.parameterId);

        // Удаляем параметры, которые больше не нужны
        for (const currentParamId of currentParameterIds) {
          if (!newParameterIds.includes(currentParamId)) {
            await api.removeParameterFromType(projectId, editingType.id, currentParamId);
          }
        }

        // Добавляем новые параметры (все параметры не обязательные)
        for (const typeParam of typeParameters) {
          if (!currentParameterIds.includes(typeParam.parameterId)) {
            const paramData: EntityTypeParameterDto = {
              parameterId: typeParam.parameterId,
              required: false,
              order: typeParam.order
            };
            await api.addParameterToType(projectId, editingType.id, paramData);
          }
        }

        // Трекинг редактирования типа сущности
        const typeParams = typeParameters.map((tp) => {
          const param = parameters.find((p) => p.id === tp.parameterId);
          return `${param?.name || 'unknown'}-${param?.valueType || 'unknown'}`;
        });
        trackEntityTypeEdited(updatedType.name, typeParams, projectId);

        onTypeUpdated?.(updatedType);
      } else {
        // Создание нового типа
        const createData: CreateEntityTypeDto = {
          name: typeData.name.trim(),
          type: typeData.type.trim().toLowerCase().replace(/\s+/g, '_'),
          description: typeData.description.trim() || undefined,
          order: 0 // Будет установлен на сервере
        };

        const newType = await api.createEntityType(projectId, createData);

        // Добавляем параметры к новому типу (все параметры не обязательные)
        for (const typeParam of typeParameters) {
          const paramData: EntityTypeParameterDto = {
            parameterId: typeParam.parameterId,
            required: false,
            order: typeParam.order
          };
          await api.addParameterToType(projectId, newType.id, paramData);
        }

        // Трекинг создания типа сущности
        const typeParams = typeParameters.map((tp) => {
          const param = parameters.find((p) => p.id === tp.parameterId);
          return `${param?.name || 'unknown'}-${param?.valueType || 'unknown'}`;
        });
        trackEntityTypeCreated(newType.name, typeParams, projectId);

        onTypeCreated(newType);
      }
      onClose();
    } catch (error) {
      console.error(t('dashboard.entities.type.error_save', 'Не удалось сохранить тип:'), error);
      window.alert(
        t('dashboard.entities.type.error_create_update', 'Не удалось {{action}} тип. Возможно, тип с таким идентификатором уже существует.', {
          action: isEditing ? t('dashboard.entities.update', 'обновить') : t('dashboard.entities.create', 'создать')
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  // Функции для управления параметрами типа
  const handleAddParameter = (parameterId?: string) => {
    const paramId = parameterId || selectedParameterId;
    if (!paramId) return;

    const parameter = parameters.find((p) => p.id === paramId);
    if (!parameter) return;

    // Проверяем, не добавлен ли уже этот параметр
    const isAlreadyAdded = typeParameters.some((tp) => tp.parameterId === paramId);
    if (isAlreadyAdded) {
      window.alert(t('dashboard.entities.type.parameter_already_added', 'Этот параметр уже добавлен к типу'));
      return;
    }

    // Добавляем параметр (все параметры не обязательные)
    const newTypeParameter: EntityTypeParameter = {
      id: `temp-${Date.now()}`, // Временный ID для UI
      entityTypeId: editingType?.id || '',
      parameterId: paramId,
      required: false,
      order: typeParameters.length,
      parameter: parameter,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTypeParameters((prev) => [...prev, newTypeParameter]);
    setSelectedParameterId('');
    setIsAddingParameter(false);
  };

  // Обработчик выбора параметра - сразу добавляем его
  const handleParameterSelect = (parameterId: string) => {
    if (parameterId) {
      handleAddParameter(parameterId);
    }
  };

  const handleRemoveParameter = (parameterId: string) => {
    setTypeParameters((prev) => prev.filter((tp) => tp.parameterId !== parameterId));
  };

  const getAvailableParameters = () => {
    const usedParameterIds = typeParameters.map((tp) => tp.parameterId);
    return parameters.filter((p) => !usedParameterIds.includes(p.id));
  };

  if (!isOpen) return null;

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h2 className={s.title}>{isEditing ? t('dashboard.entities.type.edit_title', 'Редактировать тип') : t('dashboard.entities.type.create_title', 'Создать новый тип')}</h2>
          <button onClick={handleClose} className={s.closeButton} disabled={isSubmitting}>
            ×
          </button>
        </div>

        <div className={s.content}>
          <form onSubmit={handleSubmit}>
            <div className={s.formRow}>
              <div className={s.formGroup}>
                <label className={`${s.label} ${s.required}`}>{t('dashboard.entities.type.name', 'Название типа')}</label>
                <input
                  type='text'
                  value={typeData.name}
                  onChange={(e) => setTypeData((prev) => ({...prev, name: e.target.value}))}
                  className={s.input}
                  placeholder={t('dashboard.entities.type.name_placeholder', 'Например: Персонаж')}
                  disabled={isSubmitting}
                />
              </div>

              <div className={s.formGroup}>
                <label className={`${s.label} ${s.required}`}>{t('dashboard.entities.type.identifier', 'Идентификатор')}</label>
                <input
                  type='text'
                  value={typeData.type}
                  onChange={(e) =>
                    setTypeData((prev) => ({
                      ...prev,
                      type: e.target.value.toLowerCase().replace(/\s+/g, '_')
                    }))
                  }
                  className={s.input}
                  placeholder={t('dashboard.entities.type.identifier_placeholder', 'character')}
                  disabled={isSubmitting || (isEditing && editingType?.isDefault)}
                />
              </div>
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>{t('dashboard.entities.type.description', 'Описание')}</label>
              <textarea
                value={typeData.description}
                onChange={(e) => setTypeData((prev) => ({...prev, description: e.target.value}))}
                className={s.textarea}
                placeholder={t('dashboard.entities.type.description_placeholder', 'Описание типа сущности')}
                disabled={isSubmitting}
              />
            </div>

            {/* Раздел параметров */}
            <div className={s.parametersSection}>
              <h3 className={s.sectionTitle}>{t('dashboard.entities.type.parameters', 'Параметры типа')}</h3>

              {/* Список параметров */}
              {typeParameters.length > 0 && (
                <div className={s.parametersList}>
                  {typeParameters.map((typeParam) => (
                    <div key={typeParam.parameterId} className={s.parameterItem}>
                      <div className={s.parameterInfo}>
                        <span className={s.parameterName}>{typeParam.parameter?.name || t('dashboard.entities.type.unknown_parameter', 'Неизвестный параметр')}</span>
                        <span className={s.parameterType}>{typeParam.parameter?.valueType}</span>
                      </div>

                      <div className={s.parameterActions}>
                        <button
                          type='button'
                          onClick={() => handleRemoveParameter(typeParam.parameterId)}
                          className={s.removeParameterButton}
                          disabled={isSubmitting}
                          title={t('dashboard.entities.type.remove_parameter', 'Удалить параметр')}
                        >
                          <Cross2Icon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Добавление параметра */}
              {!isAddingParameter ? (
                <button type='button' onClick={() => setIsAddingParameter(true)} className={s.addParameterButton} disabled={isSubmitting || getAvailableParameters().length === 0}>
                  <PlusIcon />
                  {t('dashboard.entities.type.add_parameter', 'Добавить параметр')}
                </button>
              ) : (
                <div className={s.addParameterForm}>
                  <select value={selectedParameterId} onChange={(e) => handleParameterSelect(e.target.value)} className={s.parameterSelect} disabled={isSubmitting}>
                    <option value=''>{t('dashboard.entities.type.select_parameter', 'Выберите параметр')}</option>
                    {getAvailableParameters().map((param) => (
                      <option key={param.id} value={param.id}>
                        {param.name} ({param.valueType})
                      </option>
                    ))}
                  </select>

                  <button
                    type='button'
                    onClick={() => {
                      setIsAddingParameter(false);
                      setSelectedParameterId('');
                    }}
                    className={s.cancelAddButton}
                    disabled={isSubmitting}
                    title={t('dashboard.entities.type.cancel_adding', 'Отменить добавление')}
                  >
                    <Cross2Icon />
                  </button>
                </div>
              )}

              {getAvailableParameters().length === 0 && !isAddingParameter && (
                <p className={s.noParametersText}>{t('dashboard.entities.type.all_parameters_added', 'Все доступные параметры уже добавлены к этому типу')}</p>
              )}
            </div>
          </form>
        </div>

        <div className={s.actions}>
          <button type='button' onClick={handleClose} className={s.cancelButton} disabled={isSubmitting}>
            <Cross2Icon />
            {t('dashboard.entities.cancel', 'Отмена')}
          </button>
          <button type='button' onClick={handleSubmit} className={s.saveButton} disabled={!typeData.name.trim() || !typeData.type.trim() || isSubmitting}>
            <CheckIcon />
            {isSubmitting
              ? isEditing
                ? t('dashboard.entities.type.saving', 'Сохранение...')
                : t('dashboard.entities.type.creating', 'Создание...')
              : isEditing
                ? t('dashboard.entities.type.save', 'Сохранить')
                : t('dashboard.entities.type.create', 'Создать')}
          </button>
        </div>
      </div>
    </div>
  );
};
