import React, {useRef, useState} from 'react';

import {CheckIcon, Cross2Icon, GearIcon, Pencil1Icon, PlusIcon, TrashIcon} from '@radix-ui/react-icons';
import {api} from '@services/api';
import {CreateEntityParameterDto, EntityParameter, PARAMETER_VALUE_TYPES, PARAMETER_VALUE_TYPE_LABELS, UpdateEntityParameterDto} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import s from './ParameterManager.module.css';

interface ParameterManagerProps {
  projectId: string;
  parameters: EntityParameter[];
  onParametersUpdated: (parameters: EntityParameter[]) => void;
  onClose: () => void;
  onEditParameter?: (parameter: EntityParameter) => void;
}

interface EditingParameter {
  id: string;
  name: string;
  valueType: string;
  options: string[];
}

export const ParameterManager: React.FC<ParameterManagerProps> = ({projectId, parameters, onParametersUpdated, onClose, onEditParameter}) => {
  const {t} = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [editingParameter, setEditingParameter] = useState<EditingParameter | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [draggedParameter, setDraggedParameter] = useState<EntityParameter | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Сортируем параметры по порядку
  const sortedParameters = [...parameters].sort((a, b) => a.order - b.order);

  // Начать редактирование параметра
  const startEditingParameter = (parameter: EntityParameter) => {
    onEditParameter?.(parameter);
  };

  // Сохранить параметр
  const saveParameter = async () => {
    if (!editingParameter || !editingParameter.name.trim()) return;

    setIsLoading(true);

    try {
      const parameterData: CreateEntityParameterDto | UpdateEntityParameterDto = {
        name: editingParameter.name.trim(),
        valueType: editingParameter.valueType as any,
        options: editingParameter.options.filter((opt) => opt.trim()).map((opt) => opt.trim()),
        order: isAddingNew ? parameters.length : parameters.find((p) => p.id === editingParameter.id)?.order || 0
      };

      let savedParameter: EntityParameter;

      if (isAddingNew) {
        // Создаем новый параметр
        savedParameter = await api.createEntityParameter(projectId, parameterData as CreateEntityParameterDto);
        onParametersUpdated([...parameters, savedParameter]);
      } else {
        // Обновляем существующий параметр
        savedParameter = await api.updateEntityParameter(projectId, editingParameter.id, parameterData as UpdateEntityParameterDto);
        const updatedParameters = parameters.map((p) => (p.id === editingParameter.id ? savedParameter : p));
        onParametersUpdated(updatedParameters);
      }

      cancelEditing();
    } catch (error) {
      console.error('Failed to save parameter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Удалить параметр
  const deleteParameter = async (parameterId: string) => {
    if (!window.confirm(t('entities.confirm_delete_parameter', 'Вы уверены, что хотите удалить этот параметр?'))) {
      return;
    }

    try {
      await api.deleteEntityParameter(projectId, parameterId);
      onParametersUpdated(parameters.filter((p) => p.id !== parameterId));
    } catch (error) {
      console.error('Failed to delete parameter:', error);
    }
  };

  // Отменить редактирование
  const cancelEditing = () => {
    setEditingParameter(null);
    setIsAddingNew(false);
  };

  // В новой системе все параметры можно перетаскивать и удалять
  const canDragParameter = (parameter: EntityParameter): boolean => {
    return true;
  };

  const canDeleteParameter = (parameter: EntityParameter): boolean => {
    return true;
  };

  // Обновление полей редактирования
  const updateEditingField = (field: keyof EditingParameter, value: any) => {
    if (editingParameter) {
      setEditingParameter({
        ...editingParameter,
        [field]: value
      });
    }
  };

  // Добавить опцию
  const addOption = () => {
    if (editingParameter) {
      updateEditingField('options', [...editingParameter.options, '']);
    }
  };

  // Удалить опцию
  const removeOption = (index: number) => {
    if (editingParameter) {
      const newOptions = editingParameter.options.filter((_, i) => i !== index);
      updateEditingField('options', newOptions);
    }
  };

  // Обновить опцию
  const updateOption = (index: number, value: string) => {
    if (editingParameter) {
      const newOptions = [...editingParameter.options];
      newOptions[index] = value;
      updateEditingField('options', newOptions);
    }
  };

  // Нужно ли показывать опции для текущего типа
  const shouldShowOptions = editingParameter?.valueType === 'SINGLE_SELECT' || editingParameter?.valueType === 'MULTI_SELECT';

  // Рендер строки параметра
  const renderParameterRow = (parameter: EntityParameter) => {
    const isEditing = editingParameter?.id === parameter.id;

    if (isEditing) {
      return (
        <div key={parameter.id} className={s.parameterRowEditing}>
          <div className={s.editingForm}>
            <div className={s.formRow}>
              <div className={s.inputGroup}>
                <label className={s.inputLabel}>{t('entities.parameter_name', 'Имя параметра')}</label>
                <input
                  type='text'
                  value={editingParameter.name}
                  onChange={(e) => updateEditingField('name', e.target.value)}
                  className={s.input}
                  placeholder={t('entities.parameter_name_placeholder', 'Введите имя параметра...')}
                />
              </div>

              <div className={s.inputGroup}>
                <label className={s.inputLabel}>{t('entities.parameter_type', 'Тип параметра')}</label>
                <select value={editingParameter.valueType} onChange={(e) => updateEditingField('valueType', e.target.value)} className={s.select}>
                  {PARAMETER_VALUE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`dashboard.entities.value_types.${type}`, PARAMETER_VALUE_TYPE_LABELS[type])}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {shouldShowOptions && (
              <div className={s.optionsSection}>
                <label className={s.inputLabel}>{t('entities.parameter_options', 'Опции')}</label>
                <div className={s.optionsList}>
                  {editingParameter.options.map((option, index) => (
                    <div key={index} className={s.optionItem}>
                      <input
                        type='text'
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className={s.input}
                        placeholder={t('entities.option_placeholder', 'Опция {{index}}', {index: index + 1})}
                      />
                      <button type='button' onClick={() => removeOption(index)} className={s.removeOptionButton}>
                        <Cross2Icon />
                      </button>
                    </div>
                  ))}
                  <button type='button' onClick={addOption} className={s.addOptionButton}>
                    <PlusIcon />
                    {t('entities.add_option', 'Добавить опцию')}
                  </button>
                </div>
              </div>
            )}

            <div className={s.editingActions}>
              <button type='button' onClick={cancelEditing} className={s.cancelButton} disabled={isLoading}>
                <Cross2Icon />
                {t('entities.cancel', 'Отмена')}
              </button>
              <button type='button' onClick={saveParameter} className={s.saveButton} disabled={isLoading || !editingParameter.name.trim()}>
                <CheckIcon />
                {isAddingNew ? t('entities.add_parameter', 'Добавить') : t('entities.save_changes', 'Сохранить')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={parameter.id}
        className={`${s.parameterRow} ${!canDragParameter(parameter) ? s.noDrag : ''}`}
        draggable={canDragParameter(parameter)}
        onDragStart={(e) => handleDragStart(e, parameter)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, parameter)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, parameter)}
        data-drop-target={dropTarget === parameter.id}
      >
        <div className={s.dragHandle}>{canDragParameter(parameter) ? <GearIcon className={s.dragIcon} /> : <div className={s.dragIconPlaceholder} />}</div>

        <div className={s.parameterInfo}>
          <div className={s.parameterHeader}>
            <h3 className={s.parameterName}>{parameter.name}</h3>
            <div className={s.parameterMeta}>
              <span className={s.parameterType}>{t(`dashboard.entities.value_types.${parameter.valueType}`, PARAMETER_VALUE_TYPE_LABELS[parameter.valueType])}</span>
              <span className={s.parameterOrder}>
                {t('dashboard.entities.order', 'Порядок')}: {parameter.order}
              </span>
            </div>
          </div>

          {parameter.options.length > 0 && (
            <div className={s.parameterOptions}>
              <span className={s.optionsLabel}>{t('entities.options', 'Опции')}:</span>
              <span className={s.optionsValue}>
                {parameter.options.slice(0, 3).join(', ')}
                {parameter.options.length > 3 && '...'}
              </span>
            </div>
          )}
        </div>

        <div className={s.parameterActions}>
          <button onClick={() => startEditingParameter(parameter)} className={s.editButton} title={t('entities.edit_parameter', 'Редактировать параметр')}>
            <Pencil1Icon />
          </button>
          {canDeleteParameter(parameter) && (
            <button onClick={() => deleteParameter(parameter.id)} className={s.deleteButton} title={t('entities.delete_parameter', 'Удалить параметр')}>
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Drag and Drop обработчики (упрощенные)
  const handleDragStart = (e: React.DragEvent, parameter: EntityParameter) => {
    if (!canDragParameter(parameter)) {
      e.preventDefault();
      return;
    }
    setDraggedParameter(parameter);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, parameter: EntityParameter) => {
    e.preventDefault();
    if (draggedParameter && draggedParameter.id !== parameter.id && canDragParameter(parameter) && canDragParameter(draggedParameter)) {
      setDropTarget(parameter.id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetParameter: EntityParameter) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedParameter || draggedParameter.id === targetParameter.id) {
      setDraggedParameter(null);
      return;
    }

    // Реализация перестановки параметров
    // Упрощенная версия - можно расширить при необходимости
    setDraggedParameter(null);
  };

  return (
    <div className={s.container}>
      {/* Форма добавления нового параметра */}
      {isAddingNew && (
        <div className={s.parameterRowEditing}>
          <div className={s.editingForm}>
            <div className={s.formRow}>
              <div className={s.inputGroup}>
                <label className={s.inputLabel}>{t('entities.parameter_name', 'Имя параметра')}</label>
                <input
                  type='text'
                  value={editingParameter?.name || ''}
                  onChange={(e) => updateEditingField('name', e.target.value)}
                  className={s.input}
                  placeholder={t('entities.parameter_name_placeholder', 'Введите имя параметра...')}
                />
              </div>

              <div className={s.inputGroup}>
                <label className={s.inputLabel}>{t('entities.parameter_type', 'Тип параметра')}</label>
                <select value={editingParameter?.valueType || 'SHORT_TEXT'} onChange={(e) => updateEditingField('valueType', e.target.value)} className={s.select}>
                  {PARAMETER_VALUE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`dashboard.entities.value_types.${type}`, PARAMETER_VALUE_TYPE_LABELS[type])}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {shouldShowOptions && (
              <div className={s.optionsSection}>
                <label className={s.inputLabel}>{t('entities.parameter_options', 'Опции')}</label>
                <div className={s.optionsList}>
                  {(editingParameter?.options || []).map((option, index) => (
                    <div key={index} className={s.optionItem}>
                      <input
                        type='text'
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className={s.input}
                        placeholder={t('entities.option_placeholder', 'Опция {{index}}', {index: index + 1})}
                      />
                      <button type='button' onClick={() => removeOption(index)} className={s.removeOptionButton}>
                        <Cross2Icon />
                      </button>
                    </div>
                  ))}
                  <button type='button' onClick={addOption} className={s.addOptionButton}>
                    <PlusIcon />
                    {t('entities.add_option', 'Добавить опцию')}
                  </button>
                </div>
              </div>
            )}

            <div className={s.editingActions}>
              <button type='button' onClick={cancelEditing} className={s.cancelButton} disabled={isLoading}>
                <Cross2Icon />
                {t('entities.cancel', 'Отмена')}
              </button>
              <button type='button' onClick={saveParameter} className={s.saveButton} disabled={isLoading || !editingParameter?.name?.trim()}>
                <CheckIcon />
                {t('entities.add_parameter', 'Добавить')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список параметров */}
      <div className={s.parametersSection}>
        {sortedParameters.length === 0 ? (
          <div className={s.emptyState}>
            <GearIcon className={s.emptyIcon} />
            <h3 className={s.emptyTitle}>{t('entities.no_parameters', 'Нет параметров')}</h3>
            <p className={s.emptyDescription}>{t('entities.no_parameters_description', 'Добавьте первый параметр или инициализируйте параметры по умолчанию')}</p>
          </div>
        ) : (
          <div className={s.parametersList}>{sortedParameters.map(renderParameterRow)}</div>
        )}
      </div>
    </div>
  );
};
