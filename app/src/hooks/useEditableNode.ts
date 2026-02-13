import React, {useCallback, useEffect, useState} from 'react';

import {DELAYS} from 'src/components/nodes/shared/constants';
import {updateNodeConnections} from 'src/components/nodes/shared/nodeUtils';

import {useNodeSelection} from './useNodeSelection';
import {useTextFieldGestures} from './useTextFieldGestures';

export interface EditableNodeHookOptions {
  id: string;
  initialValues: Record<string, any>;
  fieldsRefs: Record<string, React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>>;
  onSave?: (values: Record<string, any>) => void;
  onEditingStateChange?: (isEditing: boolean) => void;
  isAILoading?: boolean;
}

/**
 * Базовый хук для управления редактируемыми узлами (нарративными, выбора и т.д.)
 * Содержит общую логику выделения, активации редактирования и сохранения изменений
 */
export const useEditableNode = <T extends Record<string, any>>({id, initialValues, fieldsRefs, onSave, onEditingStateChange, isAILoading = false}: EditableNodeHookOptions) => {
  // Состояние значений полей
  const [values, setValues] = useState<T>(initialValues as T);
  const [isEditing, setIsEditing] = useState(false);

  // Функция сохранения изменений
  const saveChanges = useCallback(() => {
    // Проверяем, есть ли изменения
    let hasChanges = false;
    for (const key in values) {
      if (values[key] !== initialValues[key]) {
        hasChanges = true;
        break;
      }
    }

    // Если есть изменения и указан обработчик сохранения, вызываем его
    if (hasChanges && onSave) {
      onSave(values);
    }

    setIsEditing(false);

    // Обновляем соединения узла после изменений
    updateNodeConnections(id, DELAYS.UPDATE_CONNECTIONS);
  }, [id, values, initialValues, onSave]);

  // Применяем хук выделения узла
  const {isSelected, editingFields, handleNodeSelect, activateFieldEditing, deactivateAllEditing, handleKeyDown} = useNodeSelection(id, fieldsRefs, saveChanges, onEditingStateChange, isAILoading);

  // Применяем жесты для текстовых полей
  for (const refKey in fieldsRefs) {
    useTextFieldGestures(fieldsRefs[refKey]);
  }

  // Обработчик изменения значения поля
  const handleValueChange = useCallback((fieldName: string, newValue: any) => {
    setValues((prev) => ({
      ...prev,
      [fieldName]: newValue
    }));
  }, []);

  // Обновляем флаг редактирования
  useEffect(() => {
    const isAnyFieldEditing = Object.values(editingFields).some(Boolean);
    setIsEditing(isAnyFieldEditing);
  }, [editingFields]);

  // Обновляем значения, если они изменились извне
  useEffect(() => {
    if (!isEditing) {
      setValues(initialValues as T);
    }
  }, [initialValues, isEditing]);

  return {
    values,
    isEditing,
    isSelected,
    editingFields,
    handleValueChange,
    handleNodeSelect,
    activateFieldEditing,
    deactivateAllEditing,
    handleKeyDown,
    saveChanges
  };
};
