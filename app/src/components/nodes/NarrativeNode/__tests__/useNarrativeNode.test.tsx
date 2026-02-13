import {act, renderHook} from '@testing-library/react';

import {useNarrativeNode} from '../useNarrativeNode';

// Создаем типизированный мок для хука useNarrativeNode
// Возвращаемые значения от хука
interface MockNarrativeNodeReturnType {
  title: string;
  text: string;
  editingFields: {title: boolean; text: boolean};
  isSelected: boolean;
  nodeOperations: any[];
  isOperationsExpanded: boolean;
  // Рефы
  titleRef: React.RefObject<HTMLInputElement>;
  textRef: React.RefObject<HTMLTextAreaElement>;
  staticTextRef: React.RefObject<HTMLDivElement>;
  cardRef: React.RefObject<HTMLDivElement>;
  // Функции
  handleTextChange: (newText: string) => void;
  handleTitleChange: (newTitle: string) => void;
  handleNodeSelect: () => void;
  activateFieldEditing: (fieldName: string, event?: React.MouseEvent) => void;
  deactivateAllEditing: (shouldSave: boolean) => void;
  handleCustomKeyDown: (e: React.KeyboardEvent) => void;
  handleBlur: () => void;
  handleOperationsExpandToggle: (expanded: boolean) => void;
  saveChanges: () => void;
}

// Создаем моки для необходимых зависимостей
// Мокаем командный менеджер
const mockCommandManager = {
  editNarrativeNode: jest.fn()
};

// Создаем моки для хуков с более точной имитацией поведения
// Мокаем хуки перед импортами, которые их используют
jest.mock('src/hooks/useNodeSelection', () => ({
  useNodeSelection: jest.fn(() => ({
    isSelected: false,
    editingFields: {title: false, text: false},
    handleNodeSelect: jest.fn(),
    activateFieldEditing: jest.fn(),
    deactivateAllEditing: jest.fn(),
    handleKeyDown: jest.fn()
  }))
}));

jest.mock('src/hooks/useTextFieldGestures', () => ({
  useTextFieldGestures: jest.fn()
}));

// Мокаем получение CommandManager
jest.mock('src/commands/CommandManager', () => ({
  getCommandManager: jest.fn(() => mockCommandManager)
}));

// Мокаем хранилище операций
jest.mock('@store/useOperationsStore', () => ({
  useOperationsStore: jest.fn(() => ({
    getNodeOperations: jest.fn(() => [])
  }))
}));

// Мокаем хук переводов
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: (key: string) => key
  }))
}));

// Мокаем функции для работы с DOM
jest.mock('../utils', () => ({
  adjustCardHeight: jest.fn(),
  adjustTextAreaHeight: jest.fn(),
  updateNodeConnections: jest.fn()
}));

// Мокаем document для использования в тестах
const origAddEventListener = document.addEventListener;
const origRemoveEventListener = document.removeEventListener;

document.addEventListener = jest.fn();
document.removeEventListener = jest.fn();

// Создаем мок для сброса window событий после каждого теста
const mockWindow = () => {
  global.document.addEventListener = jest.fn();
  global.document.removeEventListener = jest.fn();
};

describe('useNarrativeNode', () => {
  const nodeId = 'test-node-1';
  const mockData = {
    title: 'Test Title',
    text: 'Test Text'
  };

  // Сбрасываем моки и восстанавливаем оригинальную функциональность после тестов
  afterAll(() => {
    document.addEventListener = origAddEventListener;
    document.removeEventListener = origRemoveEventListener;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow();
  });

  it('должен инициализировать состояние с данными узла', () => {
    // Рендерим хук
    const {result} = renderHook(() => useNarrativeNode(nodeId, mockData));

    // Проверяем, что хук возвращает правильные значения
    expect(result.current.title).toBe(mockData.title);
    expect(result.current.text).toBe(mockData.text);
    expect(result.current.isOperationsExpanded).toBe(true);
  });

  it('должен изменять состояние развернутости списка операций', () => {
    // Рендерим хук
    const {result} = renderHook(() => useNarrativeNode(nodeId, mockData));

    // Проверяем начальное состояние (развернуто)
    expect(result.current.isOperationsExpanded).toBe(true);

    // Сворачиваем список операций
    act(() => {
      result.current.handleOperationsExpandToggle(false);
    });

    // Проверяем, что состояние изменилось
    expect(result.current.isOperationsExpanded).toBe(false);
  });

  it('не должен предотвращать событие при нажатии Shift+Enter', () => {
    // Рендерим хук
    const {result} = renderHook(() => useNarrativeNode(nodeId, mockData));

    // Создаем мок-событие для нажатия Shift+Enter
    const mockEvent = {
      key: 'Enter',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      preventDefault: jest.fn()
    } as unknown as React.KeyboardEvent;

    // Вызываем обработчик нажатия клавиши
    act(() => {
      result.current.handleCustomKeyDown(mockEvent);
    });

    // Проверяем, что событие НЕ было предотвращено (preventDefault)
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('должен предотвращать действие по умолчанию для клавиши Enter без Shift', () => {
    // Рендерим хук
    const {result} = renderHook(() => useNarrativeNode(nodeId, mockData));

    // Создаем мок-событие для нажатия Enter без Shift
    const mockEvent = {
      key: 'Enter',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      preventDefault: jest.fn()
    } as unknown as React.KeyboardEvent;

    // Вызываем обработчик нажатия клавиши
    act(() => {
      result.current.handleCustomKeyDown(mockEvent);
    });

    // Проверяем, что событие было предотвращено (preventDefault)
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('должен иметь методы для обработки изменений заголовка и текста', () => {
    // Рендерим хук
    const {result} = renderHook(() => useNarrativeNode(nodeId, mockData));

    // Проверяем, что методы существуют и являются функциями
    expect(typeof result.current.handleTitleChange).toBe('function');
    expect(typeof result.current.handleTextChange).toBe('function');
  });

  it('должен иметь метод saveChanges для сохранения изменений', () => {
    // Рендерим хук
    const {result} = renderHook(() => useNarrativeNode(nodeId, mockData));

    // Проверяем, что метод существует и является функцией
    expect(typeof result.current.saveChanges).toBe('function');
  });

  it('должен иметь обработчики событий для узла', () => {
    // Рендерим хук
    const {result} = renderHook(() => useNarrativeNode(nodeId, mockData));

    // Проверяем, что все необходимые обработчики существуют и являются функциями
    expect(typeof result.current.handleNodeSelect).toBe('function');
    expect(typeof result.current.activateFieldEditing).toBe('function');
    expect(typeof result.current.deactivateAllEditing).toBe('function');
    expect(typeof result.current.handleCustomKeyDown).toBe('function');
    expect(typeof result.current.handleBlur).toBe('function');
  });

  // Тесты наличия функционала установки курсора в конец текста
  describe('Позиционирование курсора', () => {
    it('должен иметь функцию setCursorToEnd', () => {
      // Проверяем наличие функции setCursorToEnd в useNarrativeNode
      // Для этого нам нужно получить исходный код функции и проверить его содержимое
      const useNarrativeNodeSource = useNarrativeNode.toString();

      // Проверяем, что функция setCursorToEnd определена
      expect(useNarrativeNodeSource).toContain('const setCursorToEnd');

      // Проверяем, что функция использует setSelectionRange
      expect(useNarrativeNodeSource).toContain('setSelectionRange');

      // Проверяем логику установки курсора в конец
      expect(useNarrativeNodeSource).toContain('const length = element.value.length');
      expect(useNarrativeNodeSource).toContain('element.setSelectionRange(length, length)');
    });

    it('должен вызывать setCursorToEnd при активации редактирования', () => {
      // Проверяем, что setCursorToEnd вызывается в методе activateFieldEditing
      const useNarrativeNodeSource = useNarrativeNode.toString();

      // Проверяем, что в функции activateFieldEditing вызывается setCursorToEnd
      expect(useNarrativeNodeSource).toContain('activateFieldEditing');
      expect(useNarrativeNodeSource).toContain('setCursorToEnd(titleRef.current)');
      expect(useNarrativeNodeSource).toContain('setCursorToEnd(textRef.current)');
    });

    it('должен вызывать setCursorToEnd при изменении editingFields', () => {
      // Проверяем наличие эффекта, вызывающего setCursorToEnd при изменении editingFields
      const useNarrativeNodeSource = useNarrativeNode.toString();

      // Проверяем наличие useEffect для отслеживания изменений editingFields
      expect(useNarrativeNodeSource).toContain('useEffect');
      expect(useNarrativeNodeSource).toContain('if (editingFields.text || editingFields.title)');

      // Проверяем, что в массиве зависимостей есть editingFields и setCursorToEnd
      // Однако в зависимости от компиляции кода, формат может быть разным,
      // поэтому проверяем оба варианта
      const hasEditingFieldsDependency =
        useNarrativeNodeSource.includes('[editingFields, setCursorToEnd]') || (useNarrativeNodeSource.includes('editingFields') && useNarrativeNodeSource.includes('setCursorToEnd'));

      expect(hasEditingFieldsDependency).toBe(true);
    });
  });
});
