/**
 * Тесты для WebRenderer
 */
import {Choice, ChoiceNode, NarrativeNode, Node} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

import {GameState} from '../../../engine/core/GameState';
import {StoryData} from '../../../engine/core/StoryData';
import {EngineEventEmitter} from '../../../engine/events/EngineEvents';
import {SimpleEventEmitter} from '../../../engine/events/EventEmitter';
import {StoryEngine} from '../../../engine/interfaces/StoryEngine';
import {WebRenderer} from '../WebRenderer';

// Создаем моки для DOM-элементов
const mockElement = {
  innerHTML: '',
  style: {},
  className: '',
  appendChild: jest.fn(),
  parentNode: {
    insertBefore: jest.fn()
  },
  querySelector: jest.fn()
};

// Создаем мок для document.createElement
document.createElement = jest.fn().mockImplementation(() => {
  return {
    ...mockElement,
    appendChild: jest.fn().mockImplementation((child) => {
      return child;
    }),
    style: {},
    onclick: null
  };
});

// Мок для StoryEngine
class MockStoryEngine implements StoryEngine {
  private gameState: GameState = {
    variables: {},
    visitedNodes: new Set<string>(),
    history: [],
    displayHistory: [],
    executedOperations: [],
    triggeredConditions: []
  };

  private eventEmitter: EngineEventEmitter = new SimpleEventEmitter();

  // Настраиваемые моки для тестирования
  getNextNodeMock = jest.fn();
  executeChoiceMock = jest.fn();
  getAvailableChoicesMock = jest.fn().mockReturnValue([]);
  goBackMock = jest.fn();
  restartMock = jest.fn();
  visitNodeMock = jest.fn();
  handleDirectNarrativeTransitionMock = jest.fn();
  moveForwardMock = jest.fn();
  getVariableMock = jest.fn().mockReturnValue(null);
  setVariableMock = jest.fn();
  initialize() {}

  getStoryData(): StoryData | null {
    return null;
  }

  getStartNode(): Node | null {
    return null;
  }

  getNextNode(currentNodeId: string): Node | null {
    return this.getNextNodeMock(currentNodeId);
  }

  executeChoice(choiceId: string): Node | null {
    return this.executeChoiceMock(choiceId);
  }

  getAvailableChoices(nodeId: string): Choice[] {
    return this.getAvailableChoicesMock(nodeId);
  }

  getState(): GameState {
    return this.gameState;
  }

  setState(newState: Partial<GameState>) {
    this.gameState = {
      ...this.gameState,
      ...newState
    };
  }

  goBack(): Node | null {
    return this.goBackMock();
  }

  restart(): Node | null {
    return this.restartMock();
  }

  getDisplayHistory(mode: 'novel' | 'waterfall', currentNode: Node): Node[] {
    return this.gameState.displayHistory;
  }

  addChoiceToDisplayHistory(choice: Choice): void {
    // Ничего не делаем в моке
  }

  updateDisplayHistoryOnBack(mode: 'novel' | 'waterfall'): Node[] {
    return this.gameState.displayHistory;
  }

  isNarrativeNode(node: Node): node is NarrativeNode {
    return node.type === 'narrative';
  }

  isChoiceNode(node: Node): node is ChoiceNode {
    return node.type === 'choice';
  }

  getCurrentNode(): Node | null {
    return null;
  }

  // Новые методы для соответствия интерфейсу StoryEngine
  visitNode(nodeId: string): Node | null {
    return this.visitNodeMock(nodeId);
  }

  handleDirectNarrativeTransition(nodeId: string): Node | null {
    return this.handleDirectNarrativeTransitionMock(nodeId);
  }

  moveForward(currentNodeId: string, forceMove: boolean = false): Node | null {
    return this.moveForwardMock(currentNodeId, forceMove);
  }

  getVariable(id: string): Variable | null {
    return this.getVariableMock(id);
  }

  /**
   * Устанавливает значение переменной
   * @param variableId ID переменной
   * @param value Новое значение переменной
   */
  setVariable(variableId: string, value: string | number | boolean): void {
    this.setVariableMock(variableId, value);

    // Обновляем значение в состоянии, если переменная существует
    if (this.gameState.variables[variableId]) {
      this.gameState.variables[variableId].value = value;
    }
  }

  /**
   * Устанавливает значение переменной вручную, без добавления в историю операций
   * @param variableId ID переменной
   * @param value Новое значение переменной
   */
  setVariableManually(variableId: string, value: string | number | boolean): void {
    this.setVariableMock(variableId, value);

    // Обновляем значение в состоянии, если переменная существует
    if (this.gameState.variables[variableId]) {
      this.gameState.variables[variableId].value = value;
    }
  }

  /**
   * Возвращает EventEmitter для подписки на события движка
   */
  getEventEmitter(): EngineEventEmitter {
    return this.eventEmitter;
  }
}

describe('WebRenderer', () => {
  let container: HTMLElement;
  let renderer: WebRenderer;
  let mockEngine: MockStoryEngine;

  beforeEach(() => {
    // Сбрасываем счетчики вызовов моков
    jest.clearAllMocks();

    // Создаем контейнер для рендеринга
    container = document.createElement('div') as unknown as HTMLElement;

    // Создаем мок для StoryEngine
    mockEngine = new MockStoryEngine();

    // Создаем экземпляр WebRenderer
    renderer = new WebRenderer(container);
  });

  describe('renderNode', () => {
    it('should render narrative node correctly', () => {
      // Создаем тестовый нарративный узел
      const narrativeNode: Node = {
        id: 'node1',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {
          title: 'Test Title',
          text: 'Test Text'
        }
      };

      // Рендерим узел
      renderer.renderNode(narrativeNode, mockEngine);

      // Проверяем, что контейнер был очищен
      expect(container.innerHTML).toBe('');

      // Проверяем, что был вызван createElement для создания карточки
      expect(document.createElement).toHaveBeenCalledWith('div');

      // Проверяем, что был вызван getAvailableChoices
      expect(mockEngine.getAvailableChoicesMock).toHaveBeenCalledWith('node1');
    });

    it('should render choice node and navigate to the next node', () => {
      // Создаем тестовый узел выбора
      const choiceNode: Node = {
        id: 'choice1',
        type: 'choice',
        coordinates: {x: 0, y: 0},
        data: {
          text: 'Test Choice',
          height: 80
        }
      };

      // Настраиваем мок для getNextNode, чтобы возвращать следующий узел
      const nextNode: Node = {
        id: 'node2',
        type: 'narrative',
        coordinates: {x: 100, y: 0},
        data: {
          title: 'Next Node',
          text: 'Next Node Text'
        }
      };

      mockEngine.getNextNodeMock.mockReturnValue(nextNode);

      // Рендерим узел выбора
      renderer.renderNode(choiceNode, mockEngine);

      // Проверяем, что был вызван getNextNode для получения следующего узла
      expect(mockEngine.getNextNodeMock).toHaveBeenCalledWith('choice1');
    });

    it('should show "no continuation" message when choice has no next node', () => {
      // Создаем тестовый узел выбора
      const choiceNode: Node = {
        id: 'choice1',
        type: 'choice',
        coordinates: {x: 0, y: 0},
        data: {
          text: 'Test Choice',
          height: 80
        }
      };

      // Настраиваем мок для getNextNode, чтобы возвращать null (нет следующего узла)
      mockEngine.getNextNodeMock.mockReturnValue(null);

      // Создаем шпион для renderMessage
      const renderMessageSpy = jest.spyOn(renderer, 'renderMessage');

      // Рендерим узел выбора
      renderer.renderNode(choiceNode, mockEngine);

      // Проверяем, что был вызван getNextNode для получения следующего узла
      expect(mockEngine.getNextNodeMock).toHaveBeenCalledWith('choice1');

      // Проверяем, что был вызван renderMessage с сообщением "Нет продолжения"
      expect(renderMessageSpy).toHaveBeenCalledWith('Нет продолжения');
    });
  });

  describe('renderChoices', () => {
    it('should render choices correctly', () => {
      // Создаем тестовые варианты выбора
      const choices: Choice[] = [
        {id: 'choice1', text: 'First Choice', hasNextNode: true},
        {id: 'choice2', text: 'Second Choice', hasNextNode: false}
      ];

      // Настраиваем мок для executeChoice
      const nextNode: Node = {
        id: 'node2',
        type: 'narrative',
        coordinates: {x: 100, y: 0},
        data: {
          title: 'Next Node',
          text: 'Next Node Text'
        }
      };

      mockEngine.executeChoiceMock.mockReturnValue(nextNode);

      // Создаем шпион для renderNode
      const renderNodeSpy = jest.spyOn(renderer, 'renderNode');

      // Создаем шпион для renderMessage
      const renderMessageSpy = jest.spyOn(renderer, 'renderMessage');

      // Рендерим варианты выбора
      renderer.renderChoices(choices, mockEngine);

      // Проверяем, что был вызван createElement для создания контейнера вариантов
      expect(document.createElement).toHaveBeenCalledWith('div');

      // Проверяем, что был вызван createElement для создания кнопок
      expect(document.createElement).toHaveBeenCalledWith('button');

      // Получаем последний созданный элемент (кнопка)
      const button = (document.createElement as jest.Mock).mock.results.find((result) => result.value && result.value.textContent === 'First Choice')?.value;

      // Симулируем клик на кнопку choice1
      if (button && button.onclick) {
        button.onclick({} as MouseEvent);

        // Проверяем, что был вызван executeChoice с правильным ID
        expect(mockEngine.executeChoiceMock).toHaveBeenCalledWith('choice1');

        // Проверяем, что был вызван renderNode с правильным узлом
        expect(renderNodeSpy).toHaveBeenCalledWith(nextNode, mockEngine);
      }
    });
  });

  describe('renderMessage', () => {
    it('should render message correctly', () => {
      // Рендерим сообщение
      renderer.renderMessage('Test Message');

      // Проверяем, что контейнер был очищен
      expect(container.innerHTML).toBe('');

      // Проверяем, что был вызван createElement для создания карточки
      expect(document.createElement).toHaveBeenCalledWith('div');
    });
  });

  describe('updateNavigation', () => {
    it('should update back button state correctly', () => {
      // Создаем моки для кнопок навигации
      const backBtn = {disabled: true} as HTMLButtonElement;
      const restartBtn = {} as HTMLButtonElement;

      // Мокаем querySelector для возврата кнопок
      const mockNavigationContainer = {
        querySelector: jest.fn().mockImplementation((selector) => {
          if (selector === '#back-btn') return backBtn;
          if (selector === '#restart-btn') return restartBtn;
          return null;
        })
      };

      // Используем типы для обхода приватных полей
      (renderer as any).navigationContainer = mockNavigationContainer;

      // Обновляем состояние навигации
      renderer.updateNavigation(true);

      // Проверяем, что был вызван querySelector для поиска кнопки "Назад"
      expect(mockNavigationContainer.querySelector).toHaveBeenCalledWith('#back-btn');

      // Проверяем, что кнопка "Назад" была активирована
      expect(backBtn.disabled).toBe(false);

      // Обновляем состояние навигации снова
      renderer.updateNavigation(false);

      // Проверяем, что кнопка "Назад" была деактивирована
      expect(backBtn.disabled).toBe(true);
    });
  });
});
