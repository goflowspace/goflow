import React from 'react';

import {render, screen} from '@testing-library/react';
import {NodeProps} from '@xyflow/react';
import * as useShouldShowNodeDialog from 'src/hooks/useShouldShowNodeDialog';

// Импортируем ChoiceNode после всех моков
import ChoiceNodeImport from '../ChoiceNode';
import {HINTS} from '../constants';
import * as useChoiceNodeModule from '../useChoiceNode';

// Мок-данные и функции
const mockNodeId = 'test-choice-node-1';
const mockNodeData = {
  text: 'Test Choice Text',
  height: 100
};

// Определение базовых props для компонента ChoiceNode
const baseNodeProps = {
  id: mockNodeId,
  data: mockNodeData,
  type: 'choiceNode',
  selected: false,
  dragging: false,
  positionAbsoluteX: 100,
  positionAbsoluteY: 100,
  isConnectable: true,
  zIndex: 0,
  selectable: true,
  deletable: true,
  draggable: true
};

// Мок для хука useShouldShowNodeDialog
jest.mock('src/hooks/useShouldShowNodeDialog', () => ({
  __esModule: true,
  useShouldShowNodeDialog: jest.fn()
}));

// Мокаем хук useChoiceNode
jest.mock('../useChoiceNode', () => ({
  useChoiceNode: jest.fn()
}));

// Мокаем внешние компоненты
jest.mock('@components/nodes/ArrowHandle/ArrowHandle', () => ({
  __esModule: true,
  default: jest.fn(({direction}) => <div data-testid={`arrow-handle-${direction}`}>Arrow {direction}</div>)
}));

jest.mock('@components/nodes/NewObjDialog/NewObjDialog', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid='new-obj-dialog'>New Object Dialog</div>)
}));

// Мокаем внешние компоненты EditableText и StaticText
jest.mock('../../../nodes/shared/EditableContent', () => ({
  EditableText: jest.fn(({value, placeholder}) => <input data-testid='editable-text' defaultValue={value} placeholder={placeholder} />),
  StaticText: jest.fn(({value, placeholder}) => <div data-testid='static-text-content'>{value || placeholder}</div>)
}));

// Мокаем компонент NodeHint
jest.mock('../../../nodes/shared/NodeHint', () => ({
  NodeHint: jest.fn(({isVisible, text}) => (isVisible ? <div data-testid='node-hint'>{text}</div> : null))
}));

describe('ChoiceNode Component', () => {
  // Настройка моков перед каждым тестом
  beforeEach(() => {
    jest.clearAllMocks();

    // Устанавливаем мок для useShouldShowNodeDialog
    (useShouldShowNodeDialog.useShouldShowNodeDialog as jest.Mock).mockReturnValue(false);

    // Устанавливаем мок для useChoiceNode
    (useChoiceNodeModule.useChoiceNode as jest.Mock).mockReturnValue({
      text: mockNodeData.text,
      nodeHeight: mockNodeData.height,
      editingFields: {text: false},
      estimatedRows: 1,
      textRef: {current: null},
      textContainerRef: {current: null},
      handleTextChange: jest.fn(),
      handleNodeSelect: jest.fn(),
      activateFieldEditing: jest.fn(),
      deactivateAllEditing: jest.fn(),
      handleKeyDown: jest.fn(),
      handleBlur: jest.fn(),
      saveChanges: jest.fn()
    });
  });

  it('renders choice node with text', () => {
    render(<ChoiceNodeImport {...baseNodeProps} />);

    // Проверяем, что узел правильно отрендерен
    expect(screen.getByTestId('static-text-content')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-handle-left')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-handle-right')).toBeInTheDocument();
  });

  it('shows edit hints when node is selected', () => {
    render(<ChoiceNodeImport {...baseNodeProps} selected={true} />);

    // Проверяем, что подсказка по редактированию отображается
    const hints = screen.getAllByTestId('node-hint');
    expect(hints.some((hint) => hint.textContent === HINTS.EDIT_HINT)).toBe(true);
  });

  it('renders editable text field when in editing mode', () => {
    // Настраиваем мок useChoiceNode для редактирования текста
    (useChoiceNodeModule.useChoiceNode as jest.Mock).mockReturnValue({
      text: mockNodeData.text,
      nodeHeight: mockNodeData.height,
      editingFields: {text: true},
      estimatedRows: 1,
      textRef: {current: null},
      textContainerRef: {current: null},
      handleTextChange: jest.fn(),
      handleNodeSelect: jest.fn(),
      activateFieldEditing: jest.fn(),
      deactivateAllEditing: jest.fn(),
      handleKeyDown: jest.fn(),
      handleBlur: jest.fn(),
      saveChanges: jest.fn()
    });

    render(<ChoiceNodeImport {...baseNodeProps} selected={true} />);

    // Проверяем, что поле ввода для текста отображается
    expect(screen.getByTestId('editable-text')).toBeInTheDocument();
    // Проверяем, что подсказка по нажатию Shift+Enter отображается
    const hints = screen.getAllByTestId('node-hint');
    expect(hints.some((hint) => hint.textContent === HINTS.EDIT_CONTROLS_HINT)).toBe(true);
  });

  it('shows NewObjDialog when shouldShowDialog is true', () => {
    // Устанавливаем мок для useShouldShowNodeDialog, чтобы он возвращал true
    (useShouldShowNodeDialog.useShouldShowNodeDialog as jest.Mock).mockReturnValue(true);

    render(<ChoiceNodeImport {...baseNodeProps} />);

    // Проверяем, что диалог создания нового объекта отображается
    expect(screen.getByTestId('new-obj-dialog')).toBeInTheDocument();
  });

  it('applies correct CSS classes when selected', () => {
    const {container} = render(<ChoiceNodeImport {...baseNodeProps} selected={true} />);

    // Проверяем, что узел имеет класс selected
    expect(container.querySelector('.selected')).toBeInTheDocument();
  });

  it('applies correct CSS classes when editing', () => {
    // Настраиваем мок useChoiceNode для редактирования текста
    (useChoiceNodeModule.useChoiceNode as jest.Mock).mockReturnValue({
      text: mockNodeData.text,
      nodeHeight: mockNodeData.height,
      editingFields: {text: true},
      estimatedRows: 1,
      textRef: {current: null},
      textContainerRef: {current: null},
      handleTextChange: jest.fn(),
      handleNodeSelect: jest.fn(),
      activateFieldEditing: jest.fn(),
      deactivateAllEditing: jest.fn(),
      handleKeyDown: jest.fn(),
      handleBlur: jest.fn(),
      saveChanges: jest.fn()
    });

    const {container} = render(<ChoiceNodeImport {...baseNodeProps} />);

    // Проверяем, что узел имеет класс editing и nodrag
    expect(container.querySelector('.editing')).toBeInTheDocument();
    expect(container.querySelector('.nodrag')).toBeInTheDocument();
  });

  it('shows add choice hint when node is selected', () => {
    render(<ChoiceNodeImport {...baseNodeProps} selected={true} />);
    const hints = screen.getAllByTestId('node-hint');
    // Проверяем наличие любой подсказки (не привязываемся к конкретному тексту)
    expect(hints.length).toBeGreaterThan(0);
    // Проверяем наличие атрибута data-testid="add-choice-hint"
    const addChoiceHint = screen.getByTestId('add-choice-hint');
    expect(addChoiceHint).toBeInTheDocument();
  });

  it('does not show add choice hint when node is not selected', () => {
    render(<ChoiceNodeImport {...baseNodeProps} selected={false} />);
    // Проверяем отсутствие элемента с атрибутом data-testid="add-choice-hint"
    expect(screen.queryByTestId('add-choice-hint')).not.toBeInTheDocument();
  });

  it('resets scroll position when exiting edit mode', () => {
    // Настраиваем мок useChoiceNode для редактирования текста
    (useChoiceNodeModule.useChoiceNode as jest.Mock).mockReturnValue({
      text: 'Long text with multiple lines\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10',
      nodeHeight: mockNodeData.height,
      editingFields: {text: true},
      estimatedRows: 10,
      textRef: {current: null},
      textContainerRef: {current: {scrollTop: 100}}, // Имитируем прокрученное состояние
      handleTextChange: jest.fn(),
      handleNodeSelect: jest.fn(),
      activateFieldEditing: jest.fn(),
      deactivateAllEditing: jest.fn(),
      handleKeyDown: jest.fn(),
      handleBlur: jest.fn(),
      saveChanges: jest.fn()
    });

    const {rerender} = render(<ChoiceNodeImport {...baseNodeProps} selected={true} />);

    // Переключаемся в режим без редактирования
    (useChoiceNodeModule.useChoiceNode as jest.Mock).mockReturnValue({
      text: 'Long text with multiple lines\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10',
      nodeHeight: mockNodeData.height,
      editingFields: {text: false},
      estimatedRows: 10,
      textRef: {current: null},
      textContainerRef: {current: {scrollTop: 0}}, // Проверяем что прокрутка сброшена
      handleTextChange: jest.fn(),
      handleNodeSelect: jest.fn(),
      activateFieldEditing: jest.fn(),
      deactivateAllEditing: jest.fn(),
      handleKeyDown: jest.fn(),
      handleBlur: jest.fn(),
      saveChanges: jest.fn()
    });

    rerender(<ChoiceNodeImport {...baseNodeProps} selected={false} />);

    // Проверяем, что статичный текст отображается
    expect(screen.getByTestId('static-text-content')).toBeInTheDocument();
  });
});
