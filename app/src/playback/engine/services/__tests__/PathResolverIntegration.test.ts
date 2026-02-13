/**
 * Интеграционный тест для PathResolverService с ConditionEvaluator
 */
import {Condition, ConditionGroup, Link, Node} from '../../../../types/nodes';
import {ConditionType} from '../../../../types/nodes';
import {VariableType} from '../../../../types/variables';
import {ConditionEvaluatorImpl} from '../../conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../conditions/ConditionStrategyFactory';
import {GameState} from '../../core/GameState';
import {PathPriority} from '../../interfaces/PathResolver';
import {PathResolverService} from '../PathResolverService';

describe('PathResolver Integration Tests', () => {
  let pathResolver: PathResolverService;
  let gameState: GameState;
  let currentNode: Node;
  let availableNodes: Record<string, Node>;

  beforeEach(() => {
    // Создаем реальные экземпляры классов вместо моков
    const strategyFactory = new ConditionStrategyFactory();
    const conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
    pathResolver = new PathResolverService(conditionEvaluator);

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

    // Создаем карту доступных узлов
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

  test('integration with node_happened condition and priorities', () => {
    // Создаем условие посещения узла
    const nodeHappenedCondition: Condition = {
      id: 'condition1',
      type: ConditionType.NODE_HAPPENED,
      nodeId: 'node2'
    };

    // Создаем группу условий
    const conditionGroup: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [nodeHappenedCondition]
    };

    // Создаем связи с условиями и разными приоритетами
    const outgoingLinks: Link[] = [
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node2', // нарративный узел
        conditions: [conditionGroup] // с условиями (высший приоритет)
      },
      {
        id: 'link2',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node3', // узел выбора (средний приоритет)
        conditions: []
      },
      {
        id: 'link3',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node4', // нарративный узел
        conditions: [] // без условий (низший приоритет)
      }
    ];

    // Тест 1: узел node2 не посещен, условие не выполнено
    let result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем что условная связь в нарративный узел не валидна
    expect(result.validPaths).toHaveLength(2);
    expect(result.validPaths).not.toContainEqual(outgoingLinks[0]);
    expect(result.validPaths).toContainEqual(outgoingLinks[1]);
    expect(result.validPaths).toContainEqual(outgoingLinks[2]);

    // Проверяем приоритеты путей
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Проверяем, что выбран путь в узел выбора (средний приоритет) -> теперь не должен быть установлен
    expect(result.selectedPath).toBeUndefined();

    // Тест 2: помечаем узел node2 как посещенный, условие выполнено
    gameState.visitedNodes.add('node2');

    result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Теперь все пути валидны
    expect(result.validPaths).toHaveLength(3);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);

    // Проверяем, что выбран путь с наивысшим приоритетом (нарративный с условиями)
    expect(result.selectedPath).toBe(outgoingLinks[0]);
  });

  test('integration with multiple condition groups and priorities', () => {
    // Создаем группы условий
    const conditionGroup1: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [
        {
          id: 'condition1',
          type: ConditionType.NODE_HAPPENED,
          nodeId: 'node2'
        }
      ]
    };

    const conditionGroup2: ConditionGroup = {
      id: 'group2',
      operator: 'AND',
      conditions: [
        {
          id: 'condition2',
          type: ConditionType.NODE_HAPPENED,
          nodeId: 'node3'
        }
      ]
    };

    // Создаем связи с разными типами узлов и условиями
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
        conditions: []
      },
      {
        id: 'link3',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node4', // нарративный узел
        conditions: [conditionGroup2] // с условиями (высший приоритет)
      }
    ];

    // Тест 1: ни один из узлов не посещен, условия не выполнены
    let result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(1);
    expect(result.validPaths[0]).toBe(outgoingLinks[1]);

    // Проверяем, что выбранный путь не установлен (т.к. это выбор)
    expect(result.selectedPath).toBeUndefined();

    // Тест 2: посещаем узел node2, условие выполнено
    gameState.visitedNodes.add('node2');

    result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(2);
    expect(result.validPaths).toContainEqual(outgoingLinks[0]);
    expect(result.validPaths).toContainEqual(outgoingLinks[1]);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(1);

    // Проверяем, что выбран путь с наивысшим приоритетом (нарративный с условиями)
    expect(result.selectedPath).toBe(outgoingLinks[0]);

    // Тест 3: посещаем оба узла, оба условия выполнены
    gameState.visitedNodes.add('node3');

    result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути
    expect(result.validPaths).toHaveLength(3);

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(2);

    // Проверяем, что выбран один из нарративных путей с условиями (случайный выбор)
    expect([outgoingLinks[0], outgoingLinks[2]]).toContainEqual(result.selectedPath);
  });

  test('integration with variable comparison conditions and priorities', () => {
    // Устанавливаем переменную
    gameState.variables = {
      var1: {
        id: 'var1',
        name: 'Test Variable',
        value: 10,
        type: 'integer'
      }
    };

    // Создаем условие сравнения переменной
    const variableCondition: Condition = {
      id: 'condition1',
      type: ConditionType.VARIABLE_COMPARISON,
      varId: 'var1',
      operator: 'gt',
      value: 5,
      valType: 'custom'
    };

    // Создаем группу условий
    const conditionGroup: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [variableCondition]
    };

    // Создаем связи с разными приоритетами
    const outgoingLinks: Link[] = [
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node2', // нарративный узел
        conditions: [conditionGroup] // с условиями (высший приоритет)
      },
      {
        id: 'link2',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node3', // узел выбора (средний приоритет)
        conditions: []
      },
      {
        id: 'link3',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'node4', // нарративный узел
        conditions: [] // без условий (низший приоритет)
      }
    ];

    // Тест 1: условие выполнено (переменная > 5)
    let result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем, что выбран путь с наивысшим приоритетом
    expect(result.validPaths).toHaveLength(3);
    expect(result.selectedPath).toBe(outgoingLinks[0]);

    // Тест 2: меняем значение переменной, условие не выполнено
    gameState.variables['var1'].value = 3;

    result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем, что условная связь не валидна
    expect(result.validPaths).toHaveLength(2);
    expect(result.validPaths).not.toContainEqual(outgoingLinks[0]);

    // Проверяем, что для выборов selectedPath не установлен
    expect(result.selectedPath).toBeUndefined();
  });

  test('priority resolution matches the scheme examples', () => {
    // Создаем тестовый сценарий, соответствующий схеме из раздела 7
    // Имеем смесь нарративных узлов и узлов выбора с разными условиями

    // Создаем условия
    const trueCondition: ConditionGroup = {
      id: 'group1',
      operator: 'AND',
      conditions: [
        {
          id: 'condition1',
          type: ConditionType.PROBABILITY,
          probability: 1 // 100% вероятность (всегда TRUE)
        }
      ]
    };

    const falseCondition: ConditionGroup = {
      id: 'group2',
      operator: 'AND',
      conditions: [
        {
          id: 'condition2',
          type: ConditionType.PROBABILITY,
          probability: 0 // 0% вероятность (всегда FALSE)
        }
      ]
    };

    // Создаем связи, соответствующие схеме
    const outgoingLinks: Link[] = [
      // Связь в Выбор 1 с TRUE условием (верхняя ветка)
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'choice1',
        conditions: [trueCondition]
      },
      // Связь в Выбор 2 с FALSE условием (не должна быть валидной)
      {
        id: 'link2',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'choice2',
        conditions: [falseCondition]
      },
      // Связь в Выбор 3 без условий
      {
        id: 'link3',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'choice3',
        conditions: []
      },
      // Связь в Нарративный узел 1 без условий
      {
        id: 'link4',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'narrative1',
        conditions: []
      },
      // Связь в Нарративный узел 2 с TRUE условием
      {
        id: 'link5',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'narrative2',
        conditions: [trueCondition]
      },
      // Связь в Нарративный узел 3 с FALSE условием (не должна быть валидной)
      {
        id: 'link6',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'narrative3',
        conditions: [falseCondition]
      }
    ];

    // Создаем узлы для схемы
    availableNodes = {
      node1: currentNode,
      choice1: {
        id: 'choice1',
        type: 'choice',
        coordinates: {x: 100, y: 0},
        data: {text: 'Выбор 1'}
      },
      choice2: {
        id: 'choice2',
        type: 'choice',
        coordinates: {x: 100, y: 50},
        data: {text: 'Выбор 2'}
      },
      choice3: {
        id: 'choice3',
        type: 'choice',
        coordinates: {x: 100, y: 100},
        data: {text: 'Выбор 3'}
      },
      narrative1: {
        id: 'narrative1',
        type: 'narrative',
        coordinates: {x: 100, y: 150},
        data: {title: 'Нарративный узел 1', text: 'Текст 1'}
      },
      narrative2: {
        id: 'narrative2',
        type: 'narrative',
        coordinates: {x: 100, y: 200},
        data: {title: 'Нарративный узел 2', text: 'Текст 2'}
      },
      narrative3: {
        id: 'narrative3',
        type: 'narrative',
        coordinates: {x: 100, y: 250},
        data: {title: 'Нарративный узел 3', text: 'Текст 3'}
      }
    };

    // Выполняем проверку
    const result = pathResolver.resolvePaths(currentNode, outgoingLinks, gameState, availableNodes);

    // Проверяем валидные пути (должны быть все кроме тех, у которых условие FALSE)
    expect(result.validPaths).toHaveLength(4);
    expect(result.validPaths).toContainEqual(outgoingLinks[0]); // Выбор 1 (TRUE)
    expect(result.validPaths).not.toContainEqual(outgoingLinks[1]); // Выбор 2 (FALSE)
    expect(result.validPaths).toContainEqual(outgoingLinks[2]); // Выбор 3 (без условий)
    expect(result.validPaths).toContainEqual(outgoingLinks[3]); // Нарративный 1 (без условий)
    expect(result.validPaths).toContainEqual(outgoingLinks[4]); // Нарративный 2 (TRUE)
    expect(result.validPaths).not.toContainEqual(outgoingLinks[5]); // Нарративный 3 (FALSE)

    // Проверяем приоритеты
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE][0]).toBe(outgoingLinks[4]); // Нарративный 2 (TRUE)

    expect(result.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(2);
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toContainEqual(outgoingLinks[0]); // Выбор 1 (TRUE)
    expect(result.prioritizedPaths[PathPriority.CHOICE]).toContainEqual(outgoingLinks[2]); // Выбор 3 (без условий)

    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(1);
    expect(result.prioritizedPaths[PathPriority.DIRECT_NARRATIVE][0]).toBe(outgoingLinks[3]); // Нарративный 1 (без условий)

    // Проверяем, что выбран путь с наивысшим приоритетом (нарративный с условиями)
    expect(result.selectedPath).toBe(outgoingLinks[4]); // Нарративный 2 (TRUE)

    // Теперь создаем сценарий, где нет нарративных узлов с условиями, только выборы
    const choiceOutgoingLinks: Link[] = [
      // Связь в Выбор 1 с TRUE условием
      {
        id: 'link1',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'choice1',
        conditions: [trueCondition]
      },
      // Связь в Выбор 3 без условий
      {
        id: 'link3',
        type: 'link',
        startNodeId: 'node1',
        endNodeId: 'choice3',
        conditions: []
      }
    ];

    // Проверяем сценарий только с выборами
    const choiceResult = pathResolver.resolvePaths(currentNode, choiceOutgoingLinks, gameState, availableNodes);

    // Оба выбора валидны
    expect(choiceResult.validPaths).toHaveLength(2);

    // selectedPath должен быть undefined, так как пользователь сам должен выбрать
    expect(choiceResult.selectedPath).toBeUndefined();

    // Проверяем приоритеты
    expect(choiceResult.prioritizedPaths[PathPriority.CHOICE]).toHaveLength(2);
    expect(choiceResult.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE]).toHaveLength(0);
    expect(choiceResult.prioritizedPaths[PathPriority.DIRECT_NARRATIVE]).toHaveLength(0);
  });
});
