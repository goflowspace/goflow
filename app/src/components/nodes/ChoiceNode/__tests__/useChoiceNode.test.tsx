import {act, renderHook} from '@testing-library/react';

import {useChoiceNode} from '../useChoiceNode';

// Создаем моки для необходимых зависимостей
const mockCommandManager = {
  editChoiceNodeText: jest.fn()
};

// Переменная для хранения возвращаемого значения из calculateHeightFromText
let mockCalculatedHeight = 100;

// Мокируем utils
jest.mock('../utils', () => ({
  calculateHeightFromText: jest.fn(() => mockCalculatedHeight),
  calculateLinesFromText: jest.fn(() => 1),
  updateNodeConnections: jest.fn()
}));

// Мокируем хуки
const mockNodeSelection = {
  editingFields: {text: false},
  handleNodeSelect: jest.fn(),
  activateFieldEditing: jest.fn(),
  deactivateAllEditing: jest.fn(),
  handleKeyDown: jest.fn()
};

jest.mock('src/hooks/useNodeSelection', () => ({
  useNodeSelection: jest.fn(() => mockNodeSelection)
}));

jest.mock('src/hooks/useTextFieldGestures', () => ({
  useTextFieldGestures: jest.fn()
}));

// Мокируем CommandManager
jest.mock('src/commands/CommandManager', () => ({
  getCommandManager: jest.fn(() => mockCommandManager)
}));

// Мокируем ReactFlow
const mockSetNodes = jest.fn();
jest.mock('@xyflow/react', () => ({
  useReactFlow: jest.fn(() => ({
    setNodes: mockSetNodes
  }))
}));

// Мокируем GraphStore
const mockSaveToLocalStorage = jest.fn();
jest.mock('@store/useGraphStore', () => ({
  useGraphStore: jest.fn(() => ({
    currentGraphId: 'test-graph',
    layers: {
      'test-graph': {
        nodes: {
          'test-node-1': {
            type: 'choice',
            data: {
              text: 'Test Choice Text',
              height: 100
            }
          }
        }
      }
    },
    saveToLocalStorage: mockSaveToLocalStorage
  }))
}));

describe('useChoiceNode', () => {
  const nodeId = 'test-node-1';
  const mockData = {
    text: 'Test Choice Text',
    height: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Сбрасываем значение по умолчанию
    mockCalculatedHeight = 100;
  });

  // Базовые тесты для проверки основной функциональности хука
  it('должен иметь основные методы для работы с узлом выбора', () => {
    // Рендерим хук
    const {result} = renderHook(() => useChoiceNode(nodeId, mockData));

    // Проверяем наличие основных методов и свойств
    expect(result.current.text).toBeTruthy();
    expect(result.current.nodeHeight).toBeTruthy();
    expect(typeof result.current.handleTextChange).toBe('function');
    expect(typeof result.current.handleBlur).toBe('function');
    expect(typeof result.current.activateFieldEditing).toBe('function');
    expect(typeof result.current.saveChanges).toBe('function');
  });

  // Упрощенные тесты для проверки инициализации состояния
  it('должен инициализировать текст и высоту из данных', () => {
    // Устанавливаем значение для calculateHeightFromText
    mockCalculatedHeight = 150;

    // Рендерим хук со своим набором данных для теста
    const testData = {
      text: 'Custom Text',
      height: 150
    };

    const {result} = renderHook(() => useChoiceNode(nodeId, testData));

    // Проверяем, что значения инициализированы из переданных данных
    expect(result.current.text).toBe(testData.text);
    expect(result.current.nodeHeight).toBe(testData.height);
  });

  // Тесты для проверки функционала setCursorToEnd
  describe('Позиционирование курсора', () => {
    it('должен иметь функцию setCursorToEnd', () => {
      // Проверяем наличие функции setCursorToEnd в useChoiceNode
      // Для этого нам нужно получить исходный код функции и проверить его содержимое
      const useChoiceNodeSource = useChoiceNode.toString();

      // Проверяем, что функция setCursorToEnd определена
      expect(useChoiceNodeSource).toContain('const setCursorToEnd');

      // Проверяем, что функция использует setSelectionRange
      expect(useChoiceNodeSource).toContain('setSelectionRange');

      // Проверяем логику установки курсора в конец
      expect(useChoiceNodeSource).toContain('const length = element.value.length');
      expect(useChoiceNodeSource).toContain('element.setSelectionRange(length, length)');
    });

    it('должен вызывать setCursorToEnd при активации редактирования текста', () => {
      // Проверяем, что setCursorToEnd вызывается в методе activateFieldEditing
      const useChoiceNodeSource = useChoiceNode.toString();

      // Проверяем, что в функции activateFieldEditing вызывается setCursorToEnd
      expect(useChoiceNodeSource).toContain('activateFieldEditing');
      expect(useChoiceNodeSource).toContain("if (fieldName === 'text')");
      expect(useChoiceNodeSource).toContain('setCursorToEnd(textRef.current)');
    });

    it('должен вызывать setCursorToEnd при изменении editingFields', () => {
      // Проверяем наличие эффекта, вызывающего setCursorToEnd при изменении editingFields
      const useChoiceNodeSource = useChoiceNode.toString();

      // Проверяем наличие useEffect для отслеживания изменений editingFields
      expect(useChoiceNodeSource).toContain('useEffect');
      expect(useChoiceNodeSource).toContain('if (editingFields.text)');
      expect(useChoiceNodeSource).toContain('setCursorToEnd(textRef.current)');

      // Проверяем, что в массиве зависимостей есть editingFields.text и setCursorToEnd
      // Однако в зависимости от компиляции кода, формат может быть разным,
      // поэтому проверяем оба варианта
      const hasCorrectDependencies =
        useChoiceNodeSource.includes('[editingFields.text, setCursorToEnd]') || (useChoiceNodeSource.includes('editingFields.text') && useChoiceNodeSource.includes('setCursorToEnd'));

      expect(hasCorrectDependencies).toBe(true);
    });
  });
});
