/**
 * Тест для PathResolverService с вероятностными условиями
 * Проверяет корректную работу с ProbabilityStrategy
 */
import {Condition, ConditionGroup, Link, Node} from '../../../../types/nodes';
import {ConditionType} from '../../../../types/nodes';
import {GameState} from '../../core/GameState';
import {ConditionEvaluator} from '../../interfaces/ConditionEvaluator';
import {PathPriority} from '../../interfaces/PathResolver';
import {PathResolverService} from '../PathResolverService';

// Мок для Math.random, чтобы контролировать результаты вероятностных условий
const originalMathRandom = Math.random;

describe('PathResolver Probability Tests', () => {
  let pathResolver: PathResolverService;
  let gameState: GameState;
  let currentNode: Node;
  let mockConditionEvaluator: jest.Mocked<ConditionEvaluator>;
  let availableNodes: Record<string, Node>;

  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();

    // Создаем мок для ConditionEvaluator
    mockConditionEvaluator = {
      evaluateCondition: jest.fn(),
      evaluateConditionGroup: jest.fn(),
      evaluateConnectionConditions: jest.fn()
    };

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

    // Создаем карту доступных узлов для определения приоритетов
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

  afterEach(() => {
    // Восстанавливаем оригинальный Math.random после тестов
    Math.random = originalMathRandom;
  });

  test('should handle probability conditions with priorities', () => {
    // Создаем условия с разной вероятностью
    const condition1: Condition = {
      id: 'condition1',
      type: ConditionType.PROBABILITY,
      probability: 0.7 // 70% вероятность
    };

    const condition2: Condition = {
      id: 'condition2',
      type: ConditionType.PROBABILITY,
      probability: 0.3 // 30% вероятность
    };

    // Создаем группы условий
    const conditionGroup1: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [condition1]
    };

    const conditionGroup2: ConditionGroup = {
      id: 'group2',
      operator: 'AND',
      conditions: [condition2]
    };

    // Создаем связи с условиями и разными приоритетами
    const outgoingLinks: Link[] = [
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node2', // нарративный узел
        conditions: [conditionGroup1] // с условиями (высший приоритет)
      },
      {
        id: 'link2',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node3', // узел выбора (средний приоритет)
        conditions: [conditionGroup2]
      },
      {
        id: 'link3',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node4', // нарративный узел
        conditions: [] // без условий (низший приоритет)
      }
    ];

    // Тест 1: Оба условия выполняются
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true); // Все условия выполнены

    let result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(3);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Проверяем выбранный путь (должен быть нарративный с условиями - высший приоритет)
    expect(result.selectedPath).toBe(outgoingLinks[0]);

    // Тест 2: Только условие для нарративного узла не выполняется
    mockConditionEvaluator.evaluateCondition.mockReset();
    mockConditionEvaluator.evaluateCondition.mockImplementation((condition) => {
      // Условие с 70% вероятностью не выполняется
      if (condition.id === 'condition1') {
        return false;
      }
      return true;
    });

    result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(2);
    expect(result.validPaths).not.toContainEqual(outgoingLinks[0]);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Проверяем, что выбранный путь не установлен (т.к. высший приоритет у выбора)
    expect(result.selectedPath).toBeUndefined();

    // Тест 3: Только прямая связь в нарративный узел валидна
    mockConditionEvaluator.evaluateCondition.mockReset();
    mockConditionEvaluator.evaluateCondition.mockImplementation((condition) => {
      // Все условия с вероятностью не выполняются
      if (condition.type === ConditionType.PROBABILITY) {
        return false;
      }
      return true;
    });

    result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(1);
    expect(result.validPaths[0]).toBe(outgoingLinks[2]);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(0);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Проверяем выбранный путь (должен быть прямой нарративный путь - низший приоритет)
    expect(result.selectedPath).toBe(outgoingLinks[2]);
  });

  test('should not select path when only choice nodes are available', () => {
    // Создаем две связи, обе ведущие в узлы выбора
    const condition: Condition = {
      id: 'condition1',
      type: ConditionType.PROBABILITY,
      probability: 1 // 100% вероятность
    };

    const conditionGroup: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [condition]
    };

    const choiceWithConditions: Link = {
      id: 'link1',
      type: 'link',
      startNodeId: 'node1',
      endNodeId: 'node3', // узел выбора
      conditions: [conditionGroup] // с условиями
    };

    const choiceWithoutConditions: Link = {
      id: 'link2',
      type: 'link',
      startNodeId: 'node1',
      endNodeId: 'node3', // тоже узел выбора
      conditions: [] // без условий
    };

    const outgoingLinks = [choiceWithConditions, choiceWithoutConditions];

    // Настраиваем мок - все связи валидны
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true);

    // Вызываем тестируемый метод
    const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(2);

    // Проверяем приоритеты - все пути в выборы
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(2);
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(0);

    // Проверяем, что selectedPath не установлен, так как пользователь должен сам выбирать
    expect(result.selectedPath).toBeUndefined();
  });

  test('should select random path among multiple paths with same highest priority', () => {
    // Создаем две связи с одинаковым наивысшим приоритетом
    const condition: Condition = {
      id: 'condition1',
      type: ConditionType.PROBABILITY,
      probability: 1 // 100% вероятность
    };

    const conditionGroup: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [condition]
    };

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

    // Настраиваем мок - все связи валидны
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true);

    // Тест 1: Контролируем Math.random для выбора первого пути
    Math.random = jest.fn().mockReturnValue(0);

    let result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(2);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(2);

    // Проверяем выбранный путь (должен быть первый нарративный с условиями)
    expect(result.selectedPath).toBe(narrativeWithConditions1);

    // Тест 2: Контролируем Math.random для выбора второго пути
    Math.random = jest.fn().mockReturnValue(0.9);

    result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем выбранный путь (должен быть второй нарративный с условиями)
    expect(result.selectedPath).toBe(narrativeWithConditions2);
  });

  test('should handle mixed priorities in a complex scenario', () => {
    // Создаем тестовый сценарий с путями разных приоритетов

    // Нарративный узел с условиями (высший приоритет)
    const narrativeWithConditionsLink: Link = {
      id: 'link1',
      type: 'link',
      startNodeId: 'node1',
      endNodeId: 'node2',
      conditions: [
        {
          id: 'group1',
          operator: 'AND',
          conditions: [{id: 'cond1', type: ConditionType.PROBABILITY, probability: 1}]
        }
      ]
    };

    // Узел выбора (средний приоритет)
    const choiceLink: Link = {
      id: 'link2',
      type: 'link',
      startNodeId: 'node1',
      endNodeId: 'node3',
      conditions: []
    };

    // Нарративный узел без условий (низший приоритет)
    const directNarrativeLink: Link = {
      id: 'link3',
      type: 'link',
      startNodeId: 'node1',
      endNodeId: 'node4',
      conditions: []
    };

    const outgoingLinks = [directNarrativeLink, choiceLink, narrativeWithConditionsLink];

    // Настраиваем мок - все пути валидны
    mockConditionEvaluator.evaluateCondition.mockReturnValue(true);

    const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(3);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Проверяем выбранный путь (должен быть с наивысшим приоритетом)
    expect(result.selectedPath).toBe(narrativeWithConditionsLink);

    // Теперь делаем путь с наивысшим приоритетом невалидным
    mockConditionEvaluator.evaluateCondition.mockReset();
    mockConditionEvaluator.evaluateCondition.mockImplementation((condition) => {
      // Условие вероятности не выполняется
      if (condition.type === ConditionType.PROBABILITY) {
        return false;
      }
      return true;
    });

    const newResult = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(newResult.validPaths).toHaveLength(2);

    // Проверяем приоритеты
    expect(newResult.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);
    expect(newResult.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(newResult.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Проверяем выбранный путь (должен быть undefined, так как выбор имеет наивысший приоритет)
    expect(newResult.selectedPath).toBeUndefined();

    // Теперь делаем путь выбора невалидным
    // Но путь без условий (directNarrativeLink) остается валидным
    mockConditionEvaluator.evaluateCondition.mockReset();
    mockConditionEvaluator.evaluateCondition.mockImplementation((condition) => {
      // Все условия не выполняются
      return false;
    });

    const narrativeOnlyResult = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути - остаются только пути без условий
    expect(narrativeOnlyResult.validPaths).toHaveLength(2); // choiceLink и directNarrativeLink без условий

    // Проверяем приоритеты
    expect(narrativeOnlyResult.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);
    expect(narrativeOnlyResult.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(narrativeOnlyResult.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Проверяем выбранный путь (должен быть undefined, так как выбор имеет приоритет)
    expect(narrativeOnlyResult.selectedPath).toBeUndefined();
  });
});
