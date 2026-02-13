import React from 'react';

import {render, screen} from '@testing-library/react';
import {NodeProps} from '@xyflow/react';
import * as useShouldShowNodeDialog from 'src/hooks/useShouldShowNodeDialog';

import {PipelinePricingProvider} from '../../../../contexts/PipelinePricingContext';
// Импортируем NarrativeNode после всех моков
import NarrativeNodeImport from '../NarrativeNode';
import * as useNarrativeNodeModule from '../useNarrativeNode';

// Мок-данные и функции
const mockNodeId = 'test-node-1';
const mockNodeData = {
  title: 'Test Title',
  text: 'Test Text'
};

// Определение базовых props для компонента NarrativeNode
// Используем приведение типов, чтобы TypeScript воспринимал объект как полноценный NodeProps
const baseNodeProps = {
  id: mockNodeId,
  data: mockNodeData,
  type: 'narrativeNode',
  selected: false,
  dragging: false,
  positionAbsoluteX: 100,
  positionAbsoluteY: 100,
  isConnectable: true,
  zIndex: 0,
  selectable: true,
  deletable: true,
  draggable: true
} as NodeProps;

// Мок для хука useShouldShowNodeDialog
jest.mock('src/hooks/useShouldShowNodeDialog', () => ({
  __esModule: true,
  useShouldShowNodeDialog: jest.fn()
}));

// Мок для useAILoadingContext
jest.mock('../../../../contexts/AILoadingContext', () => ({
  __esModule: true,
  useAILoadingContext: jest.fn(() => ({
    setNodeLoading: jest.fn()
  }))
}));

// Мок для useAIFillNode
jest.mock('../../../../hooks/useAIFillNode', () => ({
  __esModule: true,
  useAIFillNode: jest.fn(() => ({
    fillNode: jest.fn()
  }))
}));

// Мокаем хук useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => {
    return {
      t: (key: string) => {
        switch (key) {
          case 'narrative_node.hint_text_edit':
            return 'Double-click to edit';
          case 'narrative_node.hint_text_new_line':
            return 'Shift+Enter for new line';
          case 'narrative_node.add_name':
            return 'Add title';
          case 'narrative_node.no_name':
            return 'No title';
          case 'narrative_node.add_text_here':
            return 'Add text here';
          case 'narrative_node.drop_entities_here':
            return 'Drop entities here';
          default:
            return key;
        }
      }
    };
  })
}));

// Мокаем хуки для AttachedEntities
jest.mock('@hooks/useEntities', () => ({
  useEntities: jest.fn(() => ({
    entities: []
  }))
}));

jest.mock('@hooks/useCurrentProject', () => ({
  useCurrentProject: jest.fn(() => ({
    projectId: 'test-project-id'
  }))
}));

// Мокаем хук useNarrativeNode
jest.mock('../useNarrativeNode', () => ({
  useNarrativeNode: jest.fn()
}));

// Мокаем компоненты для тестов
jest.mock('../OperationsList', () => ({
  __esModule: true,
  OperationsList: () => <div data-testid='operations-list'>Operations List</div>
}));

jest.mock('../../ArrowHandle/ArrowHandle', () => ({
  __esModule: true,
  default: ({direction}: {direction: string}) => <div data-testid={`arrow-handle-${direction}`}>Arrow Handle {direction}</div>
}));

jest.mock('../../NewObjDialog/NewObjDialog', () => ({
  __esModule: true,
  default: () => <div data-testid='new-obj-dialog'>New Object Dialog</div>
}));

jest.mock('../../shared/EditableContent', () => ({
  __esModule: true,
  EditableText: ({value, placeholder}: {value: string; placeholder: string}) => <div data-testid='editable-text'>{value || placeholder}</div>,
  StaticText: ({value, isTitle, placeholder}: {value: string; isTitle?: boolean; placeholder: string}) => <div data-testid={`static-text-${isTitle ? 'title' : 'content'}`}>{value || placeholder}</div>
}));

jest.mock('../../shared/NodeHint', () => ({
  __esModule: true,
  NodeHint: ({isVisible, text}: {isVisible: boolean; text: string}) => (isVisible ? <div data-testid='node-hint'>{text}</div> : null)
}));

jest.mock('../AttachedEntities', () => ({
  __esModule: true,
  default: () => <div data-testid='attached-entities'>Attached Entities</div>
}));

describe('NarrativeNode Component', () => {
  // Настройка моков перед каждым тестом
  beforeEach(() => {
    jest.clearAllMocks();

    // Устанавливаем мок для useShouldShowNodeDialog
    (useShouldShowNodeDialog.useShouldShowNodeDialog as jest.Mock).mockReturnValue(false);

    // Устанавливаем мок для useNarrativeNode
    (useNarrativeNodeModule.useNarrativeNode as jest.Mock).mockReturnValue({
      title: mockNodeData.title,
      text: mockNodeData.text,
      attachedEntities: [],
      editingFields: {title: false, text: false},
      isSelected: false,
      nodeOperations: [],
      isOperationsExpanded: true,
      titleRef: {current: null},
      textRef: {current: null},
      staticTextRef: {current: null},
      cardRef: {current: null},
      cardWrapperRef: {current: null},
      handleTextChange: jest.fn(),
      handleTitleChange: jest.fn(),
      setAttachedEntities: jest.fn(),
      handleNodeSelect: jest.fn(),
      activateFieldEditing: jest.fn(),
      deactivateAllEditing: jest.fn(),
      handleCustomKeyDown: jest.fn(),
      handleBlur: jest.fn(),
      handleOperationsExpandToggle: jest.fn(),
      saveChanges: jest.fn()
    });
  });

  it('renders narrative node with title and text', () => {
    render(<NarrativeNodeImport {...baseNodeProps} />);

    // Проверяем, что узел правильно отрендерен
    expect(screen.getByTestId('static-text-title')).toBeInTheDocument();
    expect(screen.getByTestId('static-text-content')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-handle-left')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-handle-right')).toBeInTheDocument();
    expect(screen.getByTestId('operations-list')).toBeInTheDocument();
  });

  it('shows edit hints when node is selected', () => {
    // Настраиваем мок useNarrativeNode для случая, когда узел выбран
    (useNarrativeNodeModule.useNarrativeNode as jest.Mock).mockReturnValue({
      title: mockNodeData.title,
      text: mockNodeData.text,
      editingFields: {title: false, text: false},
      isSelected: true,
      nodeOperations: [],
      isOperationsExpanded: true,
      titleRef: {current: null},
      textRef: {current: null},
      staticTextRef: {current: null},
      cardRef: {current: null},
      handleTextChange: jest.fn(),
      handleTitleChange: jest.fn(),
      handleNodeSelect: jest.fn(),
      activateFieldEditing: jest.fn(),
      deactivateAllEditing: jest.fn(),
      handleCustomKeyDown: jest.fn(),
      handleBlur: jest.fn(),
      handleOperationsExpandToggle: jest.fn(),
      saveChanges: jest.fn()
    });

    render(
      <PipelinePricingProvider>
        <NarrativeNodeImport {...baseNodeProps} selected={true} />
      </PipelinePricingProvider>
    );

    // Проверяем, что подсказка по редактированию отображается
    expect(screen.getByTestId('node-hint')).toBeInTheDocument();
  });

  it('renders editable title field when in editing mode', () => {
    // Настраиваем мок useNarrativeNode для редактирования заголовка
    (useNarrativeNodeModule.useNarrativeNode as jest.Mock).mockReturnValue({
      title: mockNodeData.title,
      text: mockNodeData.text,
      attachedEntities: [],
      editingFields: {title: true, text: false},
      isSelected: true,
      nodeOperations: [],
      isOperationsExpanded: true,
      titleRef: {current: null},
      textRef: {current: null},
      staticTextRef: {current: null},
      cardRef: {current: null},
      cardWrapperRef: {current: null},
      handleTextChange: jest.fn(),
      handleTitleChange: jest.fn(),
      setAttachedEntities: jest.fn(),
      handleNodeSelect: jest.fn(),
      activateFieldEditing: jest.fn(),
      deactivateAllEditing: jest.fn(),
      handleCustomKeyDown: jest.fn(),
      handleBlur: jest.fn(),
      handleOperationsExpandToggle: jest.fn(),
      saveChanges: jest.fn()
    });

    render(
      <PipelinePricingProvider>
        <NarrativeNodeImport {...baseNodeProps} selected={true} />
      </PipelinePricingProvider>
    );

    // Проверяем, что поле ввода для заголовка отображается
    expect(screen.getByTestId('editable-text')).toBeInTheDocument();
  });

  it('shows NewObjDialog when shouldShowDialog is true', () => {
    // Устанавливаем мок для useShouldShowNodeDialog, чтобы он возвращал true
    (useShouldShowNodeDialog.useShouldShowNodeDialog as jest.Mock).mockReturnValue(true);

    render(<NarrativeNodeImport {...baseNodeProps} />);

    // Проверяем, что диалог создания нового объекта отображается
    expect(screen.getByTestId('new-obj-dialog')).toBeInTheDocument();
  });
});
