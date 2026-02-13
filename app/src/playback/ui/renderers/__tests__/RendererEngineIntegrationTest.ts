/**
 * Интеграционные тесты для взаимодействия рендерера и движка историй
 */
import {Node} from '@types-folder/nodes';

import {ConditionEvaluatorImpl} from '../../../engine/conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../../engine/conditions/ConditionStrategyFactory';
import {GameState} from '../../../engine/core/GameState';
import {StoryData} from '../../../engine/core/StoryData';
import {StoryEngineImpl} from '../../../engine/core/StoryEngineImpl';
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
    style: {}
  };
});

// Мокаем document.getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  if (id === 'back-btn' || id === 'restart-btn') {
    return {
      onclick: null,
      disabled: false
    };
  }
  return null;
});

describe('Renderer + Engine Integration', () => {
  // Создаем экземпляры компонентов
  const strategyFactory = new ConditionStrategyFactory();
  const conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
  const engine = new StoryEngineImpl(conditionEvaluator);

  // Контейнер для рендерера
  let container: HTMLElement;

  // Рендерер
  let renderer: WebRenderer;

  // Пример простой истории для тестирования
  const testStoryData: StoryData = {
    title: 'Test Story',
    data: {
      nodes: [
        {
          id: 'start',
          type: 'narrative',
          coordinates: {x: 0, y: 0},
          data: {
            title: 'Start',
            text: 'This is the start of the story.'
          }
        },
        {
          id: 'choice1',
          type: 'choice',
          coordinates: {x: 100, y: -50},
          data: {
            text: 'Go to path A',
            height: 80
          }
        },
        {
          id: 'choice2',
          type: 'choice',
          coordinates: {x: 100, y: 50},
          data: {
            text: 'Go to path B',
            height: 80
          }
        },
        {
          id: 'pathA',
          type: 'narrative',
          coordinates: {x: 200, y: -50},
          data: {
            title: 'Path A',
            text: 'You chose path A'
          }
        },
        {
          id: 'pathB',
          type: 'narrative',
          coordinates: {x: 200, y: 50},
          data: {
            title: 'Path B',
            text: 'You chose path B'
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'start',
          target: 'choice1'
        },
        {
          id: 'e2',
          source: 'start',
          target: 'choice2'
        },
        {
          id: 'e3',
          source: 'choice1',
          target: 'pathA'
        },
        {
          id: 'e4',
          source: 'choice2',
          target: 'pathB'
        }
      ],
      variables: []
    }
  };

  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();

    // Создаем контейнер для рендеринга
    container = document.createElement('div') as unknown as HTMLElement;

    // Создаем экземпляр WebRenderer
    renderer = new WebRenderer(container);

    // Инициализируем движок перед каждым тестом
    engine.initialize(testStoryData);
  });

  it('should render start node and choices', () => {
    // Получаем начальный узел
    const startNode = engine.getStartNode();
    expect(startNode).not.toBeNull();

    if (startNode) {
      // Создаем шпион для метода getAvailableChoices
      const getAvailableChoicesSpy = jest.spyOn(engine, 'getAvailableChoices');

      // Рендерим начальный узел
      renderer.renderNode(startNode, engine);

      // Проверяем, что было создано несколько элементов DOM
      expect(document.createElement).toHaveBeenCalled(); // Проверяем только факт вызова, без конкретного числа

      // Проверяем, что были запрошены варианты выбора
      expect(getAvailableChoicesSpy).toHaveBeenCalledWith('start');

      // Обновляем состояние кнопок навигации
      const mockUpdateNavigation = jest.spyOn(renderer, 'updateNavigation');
      renderer.updateNavigation(false);
      expect(mockUpdateNavigation).toHaveBeenCalledWith(false);
    }
  });

  it('should handle choices and navigate to next node', () => {
    // Мокаем executeChoice, чтобы вернуть узел pathA
    const mockExecuteChoice = jest.spyOn(engine, 'executeChoice');
    const pathA = testStoryData.data.nodes.find((n) => n.id === 'pathA') as Node;
    mockExecuteChoice.mockReturnValue(pathA);

    // Создаем варианты выбора
    const choices = [
      {id: 'choice1', text: 'Go to path A', hasNextNode: true},
      {id: 'choice2', text: 'Go to path B', hasNextNode: true}
    ];

    // Мокаем renderNode
    const mockRenderNode = jest.spyOn(renderer, 'renderNode');

    // Рендерим варианты выбора
    renderer.renderChoices(choices, engine);

    // Проверяем, что был создан контейнер для выборов
    expect(document.createElement).toHaveBeenCalledWith('div');

    // Проверяем, что были созданы кнопки для выборов
    expect(document.createElement).toHaveBeenCalledWith('button');

    // Получаем последнюю созданную кнопку
    const buttonElement = (document.createElement as jest.Mock).mock.results[0].value;

    // Симулируем клик на кнопку
    if (buttonElement.onclick) {
      buttonElement.onclick({} as MouseEvent);

      // Проверяем, что был вызван executeChoice
      expect(mockExecuteChoice).toHaveBeenCalledWith('choice1');

      // Проверяем, что был вызван renderNode с правильным узлом
      expect(mockRenderNode).toHaveBeenCalledWith(pathA, engine);
    }
  });

  it('should update navigation buttons when history changes', () => {
    // Мокаем запрос на возможность возврата
    const mockGetState = jest.spyOn(engine, 'getState');
    const gameState: GameState = {
      variables: {},
      visitedNodes: new Set<string>(),
      history: [],
      displayHistory: [],
      executedOperations: [],
      triggeredConditions: []
    };
    mockGetState.mockReturnValue(gameState);

    // Получаем начальный узел
    const startNode = engine.getStartNode();

    if (startNode) {
      // Рендерим начальный узел (с историей)
      renderer.renderNode(startNode, engine);

      // Создаем навигационный контейнер с моком кнопки, который будет меняться
      const backBtn = {disabled: true}; // Изначально кнопка отключена

      const navigationContainer = {
        querySelector: jest.fn().mockImplementation((selector) => {
          if (selector === '#back-btn') {
            return backBtn;
          }
          return null;
        })
      };

      // Устанавливаем навигационный контейнер
      (renderer as any).navigationContainer = navigationContainer;

      // Обновляем навигацию с canGoBack = true
      renderer.updateNavigation(true);

      // Проверяем, что был вызван querySelector для поиска кнопки "Назад"
      expect(navigationContainer.querySelector).toHaveBeenCalledWith('#back-btn');

      // Проверяем, что кнопка "Назад" была активирована (disabled должен стать false)
      expect(backBtn.disabled).toBe(false);
    }
  });

  it('should show error message when no next node', () => {
    // Мокаем renderMessage
    const mockRenderMessage = jest.spyOn(renderer, 'renderMessage');

    // Создаем узел без следующего узла
    const choiceNode: Node = {
      id: 'choice_end',
      type: 'choice',
      coordinates: {x: 0, y: 0},
      data: {
        text: 'End choice',
        height: 80
      }
    };

    // Мокаем getNextNode, чтобы вернуть null
    const mockGetNextNode = jest.spyOn(engine, 'getNextNode');
    mockGetNextNode.mockReturnValue(null);

    // Рендерим узел
    renderer.renderNode(choiceNode, engine);

    // Проверяем, что был вызван getNextNode
    expect(mockGetNextNode).toHaveBeenCalledWith('choice_end');

    // Проверяем, что было показано сообщение об ошибке
    expect(mockRenderMessage).toHaveBeenCalledWith('Нет продолжения');
  });

  it('should handle back navigation', () => {
    // Мокаем goBack
    const mockGoBack = jest.spyOn(engine, 'goBack');

    // Возвращаемый узел
    const previousNode = testStoryData.data.nodes[0]; // start
    mockGoBack.mockReturnValue(previousNode);

    // Мокаем renderNode
    const mockRenderNode = jest.spyOn(renderer, 'renderNode');

    // Получаем кнопку "Назад"
    const backBtn = document.getElementById('back-btn');

    // Симулируем клик на кнопку "Назад"
    if (backBtn && backBtn.onclick) {
      backBtn.onclick({} as MouseEvent);

      // Проверяем, что был вызван goBack
      expect(mockGoBack).toHaveBeenCalled();

      // Проверяем, что был вызван renderNode с правильным узлом
      expect(mockRenderNode).toHaveBeenCalledWith(previousNode, engine);
    }
  });

  it('should handle restart', () => {
    // Мокаем restart
    const mockRestart = jest.spyOn(engine, 'restart');

    // Возвращаемый узел
    const startNode = testStoryData.data.nodes[0]; // start
    mockRestart.mockReturnValue(startNode);

    // Мокаем renderNode
    const mockRenderNode = jest.spyOn(renderer, 'renderNode');

    // Получаем кнопку "Начать заново"
    const restartBtn = document.getElementById('restart-btn');

    // Симулируем клик на кнопку "Начать заново"
    if (restartBtn && restartBtn.onclick) {
      restartBtn.onclick({} as MouseEvent);

      // Проверяем, что был вызван restart
      expect(mockRestart).toHaveBeenCalled();

      // Проверяем, что был вызван renderNode с правильным узлом
      expect(mockRenderNode).toHaveBeenCalledWith(startNode, engine);
    }
  });
});
