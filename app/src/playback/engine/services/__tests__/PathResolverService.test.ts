import {ChoiceNode, ConditionGroup, ConditionType, Link, NarrativeNode, Node} from '../../../../types/nodes';
import {GameState} from '../../core/GameState';
import {ConditionEvaluator} from '../../interfaces/ConditionEvaluator';
import {PathPriority} from '../../interfaces/PathResolver';
import {PathResolverService} from '../PathResolverService';

// Мок для ConditionEvaluator
const mockConditionEvaluator: jest.Mocked<ConditionEvaluator> = {
  evaluateCondition: jest.fn(),
  evaluateConditionGroup: jest.fn(),
  evaluateConnectionConditions: jest.fn()
};

describe('PathResolverService', () => {
  let pathResolver: PathResolverService;
  let gameState: GameState;
  let currentNode: Node;
  let availableNodes: Record<string, Node>;

  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();

    // Создаем экземпляр сервиса
    pathResolver = new PathResolverService(mockConditionEvaluator);

    // Инициализируем базовое игровое состояние
    gameState = {
      variables: {},
      visitedNodes: new Set(['node1']),
      history: [],
      displayHistory: [],
      executedOperations: [],
      triggeredConditions: []
    };

    // Создаем тестовый узел
    currentNode = {
      id: 'node1',
      type: 'narrative',
      coordinates: {x: 0, y: 0},
      data: {title: 'Test Node', text: 'Test text'}
    };

    // Создаем карту доступных узлов для проверки приоритетов
    availableNodes = {
      node1: currentNode,
      node2: {
        id: 'node2',
        type: 'narrative',
        coordinates: {x: 100, y: 0},
        data: {title: 'Narrative Node 2', text: 'Text 2'}
      },
      node3: {
        id: 'node3',
        type: 'choice',
        coordinates: {x: 0, y: 100},
        data: {text: 'Choice option'}
      },
      node4: {
        id: 'node4',
        type: 'narrative',
        coordinates: {x: 100, y: 100},
        data: {title: 'Narrative Node 4', text: 'Text 4'}
      }
    };
  });

  test('should return empty result when no outgoing links', () => {
    const result = pathResolver.resolvePaths(currentNode, [], gameState, availableNodes);

    expect(result.availablePaths).toEqual([]);
    expect(result.validPaths).toEqual([]);
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toEqual([]);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toEqual([]);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toEqual([]);
    expect(result.selectedPath).toBeUndefined();
    expect(mockConditionEvaluator.evaluateConnectionConditions).not.toHaveBeenCalled();
  });

  test('should filter valid paths based on conditions', () => {
    // Подготовка тестовых связей
    const outgoingLinks: Link[] = [
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node2',
        conditions: [] as ConditionGroup[]
      },
      {
        id: 'link2',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node3',
        conditions: [] as ConditionGroup[]
      },
      {
        id: 'link3',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node4',
        conditions: [] as ConditionGroup[]
      }
    ];

    // Настраиваем мок для evaluateCondition
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true); // Все условия выполнены

    // Вызываем тестируемый метод
    const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем результаты
    expect(result.availablePaths).toHaveLength(3);
    expect(result.validPaths).toHaveLength(3); // Теперь все пути валидны
    expect(result.validPaths).toContainEqual(outgoingLinks[0]);
    expect(result.validPaths).toContainEqual(outgoingLinks[1]);
    expect(result.validPaths).toContainEqual(outgoingLinks[2]);

    // Проверяем, что пути правильно приоритизированы
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(2);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toContainEqual(outgoingLinks[0]);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toContainEqual(outgoingLinks[2]);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toContainEqual(outgoingLinks[1]);
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);

    // Проверяем, что выбранный путь не установлен, так как есть путь в узел выбора
    expect(result.selectedPath).toBeUndefined();
  });

  test('should prioritize paths correctly', () => {
    // Создаем тестовые группы условий
    const conditionGroup: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [
        {
          id: 'condition1',
          type: ConditionType.PROBABILITY
        }
      ]
    };

    // Подготовка тестовых связей с разными приоритетами
    const outgoingLinks: Link[] = [
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node2', // в нарративный узел
        conditions: [conditionGroup] // с условиями (высший приоритет)
      },
      {
        id: 'link2',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node3', // в узел выбора (средний приоритет)
        conditions: []
      },
      {
        id: 'link3',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node4', // в нарративный узел
        conditions: [] // без условий (низший приоритет)
      }
    ];

    // Настраиваем мок - все пути валидны
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true);

    // Вызываем тестируемый метод
    const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем результаты приоритизации
    expect(result.availablePaths).toHaveLength(3);
    expect(result.validPaths).toHaveLength(3);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE][0]).toBe(outgoingLinks[0]);

    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.CHOICE][0]).toBe(outgoingLinks[1]);

    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE][0]).toBe(outgoingLinks[2]);

    // Проверяем, что выбран путь с наивысшим приоритетом
    expect(result.selectedPath).toBe(outgoingLinks[0]);
  });

  test('should not select path when highest priority is choice', () => {
    // Подготовка тестовых связей с разными приоритетами
    const outgoingLinks: Link[] = [
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node3', // в узел выбора (средний приоритет)
        conditions: []
      },
      {
        id: 'link2',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node4', // в нарративный узел
        conditions: [] // без условий (низший приоритет)
      }
    ];

    // Настраиваем мок - все пути валидны
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true);

    // Вызываем тестируемый метод
    const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем, что для выборов selectedPath не установлен
    expect(result.selectedPath).toBeUndefined();

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Теперь добавим путь с высшим приоритетом
    const conditionGroup: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [{id: 'condition1', type: ConditionType.PROBABILITY}]
    };

    const newLink: Link = {
      id: 'link3',
      type: 'link',
      startNodeId: 'node1',
      endNodeId: 'node2', // в нарративный узел
      conditions: [conditionGroup] // с условиями (высший приоритет)
    };

    const newOutgoingLinks = [newLink, ...outgoingLinks];

    // Вызываем тестируемый метод снова
    const newResult = pathResolver.resolvePaths(currentNode, newOutgoingLinks, gameState, availableNodes);

    // Проверяем, что теперь выбран путь с наивысшим приоритетом (нарративный с условиями)
    expect(newResult.selectedPath).toBe(newLink);
  });

  test('should select path with narrative priority when choice is not available', () => {
    // Подготовка тестовых связей только с нарративными узлами
    const outgoingLinks: Link[] = [
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node2', // в нарративный узел
        conditions: [] // без условий
      },
      {
        id: 'link2',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node4', // тоже в нарративный узел
        conditions: [] // тоже без условий
      }
    ];

    // Настраиваем мок - все пути валидны
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true);

    // Контролируем Math.random для предсказуемого результата
    const originalMathRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0); // Выбор первого пути

    // Вызываем тестируемый метод
    const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем, что выбран нарративный путь
    expect(result.selectedPath).toBe(outgoingLinks[0]);

    // Восстанавливаем оригинальный Math.random
    Math.random = originalMathRandom;
  });

  test('should randomly select one of multiple paths with same highest priority', () => {
    // Создаем тестовые условия
    const conditionGroup: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [{id: 'condition1', type: ConditionType.PROBABILITY}]
    };

    // Создаем несколько связей с одинаковым наивысшим приоритетом
    const narrativeWithConditions1: Link = {
      id: 'link1',
      type: 'link',
      startNodeId: 'node1',
      endNodeId: 'node2', // в нарративный узел
      conditions: [conditionGroup] // с условиями (высший приоритет)
    };

    const narrativeWithConditions2: Link = {
      id: 'link2',
      type: 'link',
      startNodeId: 'node1',
      endNodeId: 'node4', // тоже в нарративный узел
      conditions: [conditionGroup] // тоже с условиями (высший приоритет)
    };

    const outgoingLinks = [narrativeWithConditions1, narrativeWithConditions2];

    // Настраиваем мок - все пути валидны
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true);

    // Контролируем Math.random() для предсказуемого результата
    const originalMathRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0); // Выбор первой связи

    // Вызываем тестируемый метод
    let result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем, что выбран первый путь
    expect(result.selectedPath).toBe(narrativeWithConditions1);

    // Меняем значение Math.random
    Math.random = jest.fn().mockReturnValue(0.9); // Выбор второй связи

    // Вызываем тестируемый метод снова
    result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем, что выбран второй путь
    expect(result.selectedPath).toBe(narrativeWithConditions2);

    // Восстанавливаем оригинальный Math.random
    Math.random = originalMathRandom;
  });

  describe('Приоритеты путей', () => {
    it('должен выбирать путь с условиями над путем без условий, когда все условия AND выполнены', () => {
      const currentNode: NarrativeNode = {
        id: 'start',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {title: 'Start', text: 'Start node'}
      };

      const narrativeWithConditions: NarrativeNode = {
        id: 'pro',
        type: 'narrative',
        coordinates: {x: 100, y: 0},
        data: {title: 'Pro', text: 'Pro node'}
      };

      const narrativeWithoutConditions: NarrativeNode = {
        id: 'simple',
        type: 'narrative',
        coordinates: {x: 100, y: 100},
        data: {title: 'Simple', text: 'Simple node'}
      };

      const availableNodes = {
        [currentNode.id]: currentNode,
        [narrativeWithConditions.id]: narrativeWithConditions,
        [narrativeWithoutConditions.id]: narrativeWithoutConditions
      };

      // Связь с условиями (все условия AND выполнены)
      const linkWithConditions: Link = {
        id: 'link1',
        type: 'link',
        startNodeId: currentNode.id,
        endNodeId: narrativeWithConditions.id,
        conditions: [
          {
            id: 'group1',
            operator: 'AND',
            conditions: [
              {id: 'cond1', type: ConditionType.NODE_HAPPENED, nodeId: 'someNode'},
              {id: 'cond2', type: ConditionType.VARIABLE_COMPARISON, varId: 'var1', value: 'false', operator: 'eq', valType: 'custom'},
              {id: 'cond3', type: ConditionType.PROBABILITY, probability: 0.5}
            ]
          }
        ]
      };

      // Связь без условий
      const linkWithoutConditions: Link = {
        id: 'link2',
        type: 'link',
        startNodeId: currentNode.id,
        endNodeId: narrativeWithoutConditions.id,
        conditions: []
      };

      const outgoingLinks = [linkWithConditions, linkWithoutConditions];

      // Настраиваем мок для evaluateCondition
      // Все условия выполнены для обеих связей
      mockConditionEvaluator.evaluateCondition.mockReturnValue(true); // Все условия выполнены

      const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

      // Проверяем, что обе связи валидны
      expect(result.validPaths).toHaveLength(2);
      expect(result.validPaths).toContain(linkWithConditions);
      expect(result.validPaths).toContain(linkWithoutConditions);

      // Проверяем приоритеты
      expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toContain(linkWithConditions);
      expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toContain(linkWithoutConditions);
      expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(1);
      expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

      // Проверяем, что выбран путь с условиями (более высокий приоритет)
      expect(result.selectedPath).toBe(linkWithConditions);
    });

    it('должен стабильно выбирать путь с условиями, даже с вероятностными условиями', () => {
      const currentNode: NarrativeNode = {
        id: 'start',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {title: 'Start', text: 'Start node'}
      };

      const narrativeWithConditions: NarrativeNode = {
        id: 'pro',
        type: 'narrative',
        coordinates: {x: 100, y: 0},
        data: {title: 'Pro', text: 'pro'}
      };

      const narrativeWithoutConditions: NarrativeNode = {
        id: 'simple',
        type: 'narrative',
        coordinates: {x: 100, y: 100},
        data: {title: 'Simple', text: 'simple'}
      };

      const availableNodes = {
        [currentNode.id]: currentNode,
        [narrativeWithConditions.id]: narrativeWithConditions,
        [narrativeWithoutConditions.id]: narrativeWithoutConditions
      };

      // Связь с условиями (как на скриншоте)
      const linkWithConditions: Link = {
        id: 'link1',
        type: 'link',
        startNodeId: currentNode.id,
        endNodeId: narrativeWithConditions.id,
        conditions: [
          {
            id: 'group1',
            operator: 'AND',
            conditions: [
              {
                id: 'cond1',
                type: ConditionType.NODE_HAPPENED,
                nodeId: 'someNode',
                nodeType: 'narrative'
              },
              {
                id: 'cond2',
                type: ConditionType.VARIABLE_COMPARISON,
                varId: 'appleEaten',
                value: false,
                operator: 'eq',
                valType: 'custom'
              },
              {
                id: 'cond3',
                type: ConditionType.PROBABILITY,
                probability: 0.5 // 50% вероятность
              }
            ]
          }
        ]
      };

      // Связь без условий
      const linkWithoutConditions: Link = {
        id: 'link2',
        type: 'link',
        startNodeId: currentNode.id,
        endNodeId: narrativeWithoutConditions.id,
        conditions: []
      };

      const outgoingLinks = [linkWithConditions, linkWithoutConditions];

      // Симулируем несколько прогонов
      const results: string[] = [];

      for (let i = 0; i < 10; i++) {
        // Настраиваем мок для evaluateCondition
        mockConditionEvaluator.evaluateCondition.mockReset();
        mockConditionEvaluator.evaluateCondition.mockReturnValue(true); // Все условия выполнены

        const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

        if (result.selectedPath) {
          results.push(result.selectedPath.endNodeId);
        }
      }

      // Все результаты должны быть 'pro', так как путь с условиями имеет приоритет
      expect(results.every((id) => id === 'pro')).toBe(true);
      expect(results).toHaveLength(10);
    });

    it('должен выбирать путь без условий, когда вероятностное условие не срабатывает', () => {
      const currentNode: NarrativeNode = {
        id: 'start',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {title: 'Start', text: 'Start node'}
      };

      const narrativeWithConditions: NarrativeNode = {
        id: 'pro',
        type: 'narrative',
        coordinates: {x: 100, y: 0},
        data: {title: 'Pro', text: 'pro'}
      };

      const narrativeWithoutConditions: NarrativeNode = {
        id: 'simple',
        type: 'narrative',
        coordinates: {x: 100, y: 100},
        data: {title: 'Simple', text: 'simple'}
      };

      const availableNodes = {
        [currentNode.id]: currentNode,
        [narrativeWithConditions.id]: narrativeWithConditions,
        [narrativeWithoutConditions.id]: narrativeWithoutConditions
      };

      // Связь с условиями (включая вероятность 50%)
      const linkWithConditions: Link = {
        id: 'link1',
        type: 'link',
        startNodeId: currentNode.id,
        endNodeId: narrativeWithConditions.id,
        conditions: [
          {
            id: 'group1',
            operator: 'AND',
            conditions: [
              {
                id: 'cond1',
                type: ConditionType.NODE_HAPPENED,
                nodeId: 'someNode',
                nodeType: 'narrative'
              },
              {
                id: 'cond2',
                type: ConditionType.VARIABLE_COMPARISON,
                varId: 'appleEaten',
                value: false,
                operator: 'eq',
                valType: 'custom'
              },
              {
                id: 'cond3',
                type: ConditionType.PROBABILITY,
                probability: 0.5 // 50% вероятность
              }
            ]
          }
        ]
      };

      // Связь без условий
      const linkWithoutConditions: Link = {
        id: 'link2',
        type: 'link',
        startNodeId: currentNode.id,
        endNodeId: narrativeWithoutConditions.id,
        conditions: []
      };

      const outgoingLinks = [linkWithConditions, linkWithoutConditions];

      // Настраиваем мок - вероятностное условие НЕ срабатывает
      mockConditionEvaluator.evaluateCondition.mockImplementation((condition) => {
        // Если это вероятностное условие - возвращаем false
        if (condition && condition.type === ConditionType.PROBABILITY) {
          return false;
        }
        // Для остальных условий возвращаем true
        return true;
      });

      const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

      // Проверяем, что связь с условиями НЕ попала в validPaths
      expect(result.validPaths).toHaveLength(1);
      expect(result.validPaths).toContain(linkWithoutConditions);
      expect(result.validPaths).not.toContain(linkWithConditions);

      // Проверяем, что выбран путь без условий
      expect(result.selectedPath).toBe(linkWithoutConditions);

      // Проверяем приоритеты - путь с условиями должен быть пустым
      expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);
      expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);
    });

    it('демонстрация нестабильности с реальной вероятностью 50%', () => {
      // Этот тест покажет, что с вероятностью 50% путь выбирается случайно
      const currentNode: NarrativeNode = {
        id: 'start',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {title: 'Start', text: 'Start node'}
      };

      const narrativeWithConditions: NarrativeNode = {
        id: 'pro',
        type: 'narrative',
        coordinates: {x: 100, y: 0},
        data: {title: 'Pro', text: 'pro'}
      };

      const narrativeWithoutConditions: NarrativeNode = {
        id: 'simple',
        type: 'narrative',
        coordinates: {x: 100, y: 100},
        data: {title: 'Simple', text: 'simple'}
      };

      const availableNodes = {
        [currentNode.id]: currentNode,
        [narrativeWithConditions.id]: narrativeWithConditions,
        [narrativeWithoutConditions.id]: narrativeWithoutConditions
      };

      const linkWithConditions: Link = {
        id: 'link1',
        type: 'link',
        startNodeId: currentNode.id,
        endNodeId: narrativeWithConditions.id,
        conditions: [
          {
            id: 'group1',
            operator: 'AND',
            conditions: [{id: 'cond1', type: ConditionType.PROBABILITY, probability: 0.5}]
          }
        ]
      };

      const linkWithoutConditions: Link = {
        id: 'link2',
        type: 'link',
        startNodeId: currentNode.id,
        endNodeId: narrativeWithoutConditions.id,
        conditions: []
      };

      const outgoingLinks = [linkWithConditions, linkWithoutConditions];

      // Симулируем 100 прогонов с реальной 50% вероятностью
      const results = {pro: 0, simple: 0};

      for (let i = 0; i < 100; i++) {
        mockConditionEvaluator.evaluateCondition.mockReset();
        mockConditionEvaluator.evaluateCondition.mockImplementation((condition) => {
          // Если это вероятностное условие - симулируем 50% вероятность
          if (condition && condition.type === ConditionType.PROBABILITY) {
            return Math.random() < 0.5;
          }
          // Для остальных условий возвращаем true
          return true;
        });

        const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

        if (result.selectedPath?.endNodeId === 'pro') {
          results.pro++;
        } else if (result.selectedPath?.endNodeId === 'simple') {
          results.simple++;
        }
      }

      // Проверяем, что результаты примерно 50/50
      console.log('Результаты распределения:', results);
      expect(results.pro).toBeGreaterThan(20);
      expect(results.simple).toBeGreaterThan(20);
      expect(results.pro + results.simple).toBe(100);
    });
  });
});
