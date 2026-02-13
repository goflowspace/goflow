import React, {useEffect, useRef, useState} from 'react';

import {CheckIcon, Cross2Icon, PlusIcon} from '@radix-ui/react-icons';
import {trackEntityParamCreated, trackEntityParamEdit} from '@services/analytics';
import {api} from '@services/api';
import {CreateEntityParameterDto, EntityParameter, PARAMETER_VALUE_TYPES, PARAMETER_VALUE_TYPE_LABELS, ParameterValueType, UpdateEntityParameterDto} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import s from './CreateParameterModal.module.css';

interface CreateParameterModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onParameterCreated: (parameter: EntityParameter) => void;
  onParameterUpdated?: (parameter: EntityParameter) => void;
  editingParameter?: EntityParameter | null;
}

interface NewParameterData {
  name: string;
  valueType: ParameterValueType;
  options: string[];
}

export const CreateParameterModal: React.FC<CreateParameterModalProps> = ({isOpen, projectId, onClose, onParameterCreated, onParameterUpdated, editingParameter}) => {
  const {t} = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parameterData, setParameterData] = useState<NewParameterData>({
    name: '',
    valueType: 'SHORT_TEXT',
    options: []
  });
  const [shouldFocusLastOption, setShouldFocusLastOption] = useState(false);
  const lastOptionRef = useRef<HTMLInputElement>(null);

  // Сбрасываем форму при открытии/закрытии модала
  useEffect(() => {
    if (isOpen) {
      if (editingParameter) {
        setParameterData({
          name: editingParameter.name,
          valueType: editingParameter.valueType,
          options: [...editingParameter.options]
        });
      } else {
        setParameterData({
          name: '',
          valueType: 'SHORT_TEXT',
          options: []
        });
      }
    }
  }, [isOpen, editingParameter]);

  // Фокусировка на последней опции при её добавлении
  useEffect(() => {
    if (shouldFocusLastOption && lastOptionRef.current) {
      lastOptionRef.current.focus();
      setShouldFocusLastOption(false);
    }
  }, [shouldFocusLastOption, parameterData.options.length]);

  // Обработчик изменения полей формы
  const handleInputChange = (field: keyof NewParameterData, value: string) => {
    setParameterData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Добавление опции
  const addOption = () => {
    setParameterData((prev) => ({
      ...prev,
      options: [...prev.options, '']
    }));
    setShouldFocusLastOption(true);
  };

  // Удаление опции
  const removeOption = (index: number) => {
    setParameterData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  // Обновление опции
  const updateOption = (index: number, value: string) => {
    setParameterData((prev) => ({
      ...prev,
      options: prev.options.map((option, i) => (i === index ? value : option))
    }));
  };

  // Проверяем, нужно ли показывать опции
  const shouldShowOptions = parameterData.valueType === 'SINGLE_SELECT' || parameterData.valueType === 'MULTI_SELECT';

  // Проверяем, можно ли сохранить форму
  const canSave = () => {
    if (!parameterData.name.trim()) return false;
    if (shouldShowOptions && parameterData.options.filter((opt) => opt.trim()).length === 0) return false;
    return true;
  };

  // Обработчик сохранения
  const handleSave = async () => {
    if (!canSave() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const filteredOptions = parameterData.options.filter((opt) => opt.trim());

      if (editingParameter) {
        // Редактирование существующего параметра
        const updateDto: UpdateEntityParameterDto = {
          name: parameterData.name.trim(),
          valueType: parameterData.valueType,
          options: filteredOptions
        };

        const updatedParameter = await api.updateEntityParameter(projectId, editingParameter.id, updateDto);

        // Трекинг редактирования параметра сущности
        trackEntityParamEdit(
          editingParameter.name,
          updatedParameter.name,
          updatedParameter.valueType as any,
          'unknown', // entityTypeName не доступен в этом контексте
          projectId
        );

        onParameterUpdated?.(updatedParameter);
      } else {
        // Создание нового параметра
        const createDto: CreateEntityParameterDto = {
          name: parameterData.name.trim(),
          valueType: parameterData.valueType,
          options: filteredOptions
        };

        const newParameter = await api.createEntityParameter(projectId, createDto);

        // Трекинг создания параметра сущности
        trackEntityParamCreated(
          newParameter.name,
          newParameter.valueType as any,
          'unknown', // entityTypeName не доступен в этом контексте
          projectId
        );

        onParameterCreated(newParameter);
      }

      onClose();
    } catch (error) {
      console.error(t('dashboard.entities.parameter.error_saving', 'Ошибка при сохранении параметра:'), error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик нажатия Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown} tabIndex={-1}>
        {/* Заголовок */}
        <div className={s.header}>
          <h2 className={s.title}>{editingParameter ? t('dashboard.entities.parameter.edit', 'Редактировать параметр') : t('dashboard.entities.parameter.create', 'Создать параметр')}</h2>
          <button className={s.closeButton} onClick={onClose} disabled={isSubmitting}>
            <Cross2Icon />
          </button>
        </div>

        {/* Содержимое */}
        <div className={s.content}>
          {/* Основные поля */}
          <div className={s.section}>
            <div className={s.field}>
              <label className={s.label} htmlFor='parameter-name'>
                {t('dashboard.entities.parameter.name', 'Название параметра')}
              </label>
              <input
                id='parameter-name'
                type='text'
                value={parameterData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={s.input}
                placeholder={t('dashboard.entities.parameter.name_placeholder', 'Введите название параметра')}
                disabled={isSubmitting}
              />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor='parameter-type'>
                {t('dashboard.entities.parameter.type', 'Тип параметра')}
              </label>
              <select id='parameter-type' value={parameterData.valueType} onChange={(e) => handleInputChange('valueType', e.target.value)} className={s.select} disabled={isSubmitting}>
                {PARAMETER_VALUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`dashboard.entities.value_types.${type}`, PARAMETER_VALUE_TYPE_LABELS[type])}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Опции для выбора */}
          {shouldShowOptions && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>{t('dashboard.entities.parameter.options', 'Опции')}</h3>

              {/* Список опций */}
              {parameterData.options.length > 0 && (
                <div className={s.optionsList}>
                  {parameterData.options.map((option, index) => (
                    <div key={index} className={s.optionItem}>
                      <input
                        ref={index === parameterData.options.length - 1 ? lastOptionRef : null}
                        type='text'
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className={s.input}
                        placeholder={t('dashboard.entities.parameter.option_placeholder', 'Опция {{number}}', {number: index + 1})}
                        disabled={isSubmitting}
                      />
                      <button type='button' onClick={() => removeOption(index)} className={s.removeOptionButton} disabled={isSubmitting}>
                        <Cross2Icon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Кнопка добавления опции */}
              <button type='button' onClick={addOption} className={s.addOptionButton} disabled={isSubmitting} style={{marginTop: '12px'}}>
                <PlusIcon />
                {t('dashboard.entities.parameter.add_option', 'Добавить опцию')}
              </button>
            </div>
          )}
        </div>

        {/* Футер с кнопками */}
        <div className={s.footer}>
          <button type='button' onClick={onClose} className={s.cancelButton} disabled={isSubmitting}>
            <Cross2Icon />
            {t('dashboard.entities.parameter.cancel', 'Отмена')}
          </button>
          <button type='button' onClick={handleSave} className={s.saveButton} disabled={!canSave() || isSubmitting}>
            <CheckIcon />
            {editingParameter ? t('dashboard.entities.parameter.save', 'Сохранить') : t('dashboard.entities.parameter.create_button', 'Создать')}
          </button>
        </div>
      </div>
    </div>
  );
};
