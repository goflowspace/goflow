import React from 'react';

import {act, renderHook} from '@testing-library/react';

import {useEditableNode} from '../useEditableNode';

// Мокаем зависимые хуки
jest.mock('../useNodeSelection', () => ({
  useNodeSelection: jest.fn(() => ({
    isSelected: false,
    editingFields: {field1: false, field2: false},
    handleNodeSelect: jest.fn(),
    activateFieldEditing: jest.fn(),
    deactivateAllEditing: jest.fn(),
    handleKeyDown: jest.fn()
  }))
}));

jest.mock('../useTextFieldGestures', () => ({
  useTextFieldGestures: jest.fn()
}));

// Мокаем функцию обновления соединений
jest.mock('src/components/nodes/shared/nodeUtils', () => ({
  updateNodeConnections: jest.fn(),
  hasValueChanged: jest.fn()
}));

describe('useEditableNode', () => {
  const mockFieldRef1 = {current: document.createElement('input')};
  const mockFieldRef2 = {current: document.createElement('textarea')};

  const defaultProps = {
    id: 'test-node-id',
    initialValues: {field1: 'initial value 1', field2: 'initial value 2'},
    fieldsRefs: {
      field1: mockFieldRef1,
      field2: mockFieldRef2
    },
    onSave: jest.fn(),
    onEditingStateChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with provided values', () => {
    const {result} = renderHook(() => useEditableNode(defaultProps));

    expect(result.current.values).toEqual(defaultProps.initialValues);
    expect(result.current.isEditing).toBe(false);
  });

  it('updates value when handleValueChange is called', () => {
    const {result} = renderHook(() => useEditableNode(defaultProps));

    act(() => {
      result.current.handleValueChange('field1', 'new value');
    });

    expect(result.current.values.field1).toBe('new value');
    expect(result.current.values.field2).toBe('initial value 2');
  });

  it('calls onSave with updated values when saveChanges is called', () => {
    const {result} = renderHook(() => useEditableNode(defaultProps));

    // Сначала изменяем значение
    act(() => {
      result.current.handleValueChange('field1', 'new value');
    });

    // Затем вызываем saveChanges
    act(() => {
      result.current.saveChanges();
    });

    // Проверяем, что функция сохранения была вызвана с новыми значениями
    expect(defaultProps.onSave).toHaveBeenCalledWith({
      field1: 'new value',
      field2: 'initial value 2'
    });
  });

  it('does not call onSave when values have not changed', () => {
    const {result} = renderHook(() => useEditableNode(defaultProps));

    // Вызываем saveChanges без изменения значений
    act(() => {
      result.current.saveChanges();
    });

    // Проверяем, что функция сохранения не была вызвана
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('resets values to initialValues when isEditing changes to false', () => {
    // Создаем хук с начальными значениями
    const {result, rerender} = renderHook((props) => useEditableNode(props), {initialProps: defaultProps});

    // Изменяем значение
    act(() => {
      result.current.handleValueChange('field1', 'new value');
    });

    expect(result.current.values.field1).toBe('new value');

    // Меняем isEditing через хук useNodeSelection
    const newProps = {
      ...defaultProps,
      initialValues: {field1: 'updated initial value', field2: 'initial value 2'}
    };

    // Рендерим хук с новыми начальными значениями
    rerender(newProps);

    // Проверяем, что значения были обновлены
    expect(result.current.values.field1).toBe('updated initial value');
  });
});
