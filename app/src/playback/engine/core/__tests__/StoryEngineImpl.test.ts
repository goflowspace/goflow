/**
 * Тесты для движка истории
 */
import {ChoiceNode, ConditionGroup, Link, NarrativeNode, Node} from '@types-folder/nodes';
import {Variable, VariableType} from '@types-folder/variables';

import {ConditionEvaluatorImpl} from '../../conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../conditions/ConditionStrategyFactory';
import {StoryData} from '../StoryData';
import {StoryEngineImpl} from '../StoryEngineImpl';

describe('StoryEngine', () => {
  // Создаем экземпляры зависимостей и движка для тестов
  const strategyFactory = new ConditionStrategyFactory();
  const conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
  const engine = new StoryEngineImpl(conditionEvaluator);

  // Создаем тестовые данные узлов и рёбер
  const testNodes = [
    {
      id: 'start',
      type: 'narrative' as const,
      coordinates: {x: 0, y: 0},
      data: {title: 'Start', text: 'This is the start node'}
    },
    {
      id: 'choice1',
      type: 'choice' as const,
      coordinates: {x: 100, y: 0},
      data: {text: 'Go to path A', height: 80}
    },
    {
      id: 'choice2',
      type: 'choice' as const,
      coordinates: {x: 100, y: 100},
      data: {text: 'Go to path B', height: 80}
    },
    {
      id: 'pathA',
      type: 'narrative' as const,
      coordinates: {x: 200, y: 0},
      data: {title: 'Path A', text: 'You chose path A'}
    },
    {
      id: 'pathB',
      type: 'narrative' as const,
      coordinates: {x: 200, y: 100},
      data: {title: 'Path B', text: 'You chose path B'}
    },
    {
      id: 'end',
      type: 'narrative' as const,
      coordinates: {x: 300, y: 50},
      data: {title: 'End', text: 'This is the end'}
    }
  ] as (NarrativeNode | ChoiceNode)[];

  const testEdges = [
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
    },
    {
      id: 'e5',
      source: 'pathA',
      target: 'end'
    },
    {
      id: 'e6',
      source: 'pathB',
      target: 'end',
      data: {
        conditions: [
          {
            id: 'c1',
            operator: 'AND',
            conditions: [
              {
                id: 'c2',
                type: 'node_happened',
                nodeId: 'choice2'
              }
            ]
          }
        ] as ConditionGroup[]
      }
    }
  ];

  const testVariables = [
    {
      id: 'score',
      name: 'Score',
      type: 'integer' as VariableType,
      value: 0
    }
  ] as Variable[];

  // Создаем тестовые данные истории с новым форматом таймлайнов
  const testStoryData: StoryData = {
    title: 'Test Story',
    data: {
      // Для обратной совместимости с тестами сохраняем старый формат
      nodes: testNodes as Node[],
      edges: testEdges,
      variables: testVariables
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
  };

  beforeEach(() => {
    // Инициализируем движок перед каждым тестом
    engine.initialize(testStoryData);
  });

  describe('getStartNode', () => {
    it('should return the correct start node', () => {
      const startNode = engine.getStartNode();

      expect(startNode).not.toBeNull();
      expect(startNode?.id).toBe('start');
      expect(startNode?.type).toBe('narrative');

      // После getStartNode история должна быть пустой
      const gameState = engine.getState();
      expect(gameState.history.length).toBe(0);
    });
  });

  describe('getAvailableChoices', () => {
    it('should return all available choices for the given node', () => {
      const choices = engine.getAvailableChoices('start');

      expect(choices.length).toBe(2);
      expect(choices[0].id).toBe('choice1');
      expect(choices[1].id).toBe('choice2');

      expect(choices[0].text).toBe('Go to path A');
      expect(choices[1].text).toBe('Go to path B');

      expect(choices[0].hasNextNode).toBe(true);
      expect(choices[1].hasNextNode).toBe(true);
    });

    it('should return empty array for node without choices', () => {
      const choices = engine.getAvailableChoices('end');
      expect(choices.length).toBe(0);
    });
  });

  describe('executeChoice', () => {
    it('should execute choice and return the next node', () => {
      const nextNode = engine.executeChoice('choice1');

      expect(nextNode).not.toBeNull();
      expect(nextNode?.id).toBe('pathA');

      // Проверяем, что узел добавлен в посещенные
      const gameState = engine.getState();
      expect(gameState.visitedNodes.has('choice1')).toBe(true);
      expect(gameState.visitedNodes.has('pathA')).toBe(true);

      // Проверяем, что добавлена запись в историю (только нарративный узел pathA)
      expect(gameState.history).toContain('pathA');
    });
  });

  describe('getNextNode', () => {
    it('should get next node after narrative with conditions met', () => {
      // Переходим к pathB
      engine.executeChoice('choice2');

      // Получаем следующий узел после pathB
      const nextNode = engine.getNextNode('pathB');

      expect(nextNode).not.toBeNull();
      expect(nextNode?.id).toBe('end');

      // Проверяем только историю, так как getNextNode не добавляет узлы в посещенные
      const gameState = engine.getState();
      expect(gameState.history).toContain('pathB');
    });

    it('should return null for node without outgoing edges', () => {
      const nextNode = engine.getNextNode('end');
      expect(nextNode).toBeNull();
    });
  });

  describe('goBack', () => {
    it('should return to the previous narrative node, skipping choice nodes', () => {
      // Начинаем и явно посещаем стартовый узел
      const startNode = engine.getStartNode();
      engine.visitNode(startNode!.id);

      // Выполняем выбор и переходим к pathA
      engine.executeChoice('choice1');

      // Проверяем историю
      let gameState = engine.getState();
      expect(gameState.history).toEqual(['start', 'pathA']);

      // Возвращаемся назад
      const previousNode = engine.goBack();

      expect(previousNode).not.toBeNull();
      expect(previousNode?.id).toBe('start');

      // Проверяем, что история содержит только start
      gameState = engine.getState();
      expect(gameState.history).toEqual(['start']);

      // Еще одна попытка вернуться должна вернуть null
      const secondBack = engine.goBack();
      expect(secondBack).toBeNull();
    });

    it('should return null if history is empty', () => {
      // Сразу после инициализации история пуста
      const previousNode = engine.goBack();

      expect(previousNode).toBeNull();

      // Проверяем, что история пуста
      const gameState = engine.getState();
      expect(gameState.history.length).toBe(0);
    });
  });

  describe('restart', () => {
    it('should reset game state and return to start node', () => {
      // Явно посещаем стартовый узел
      const startNode = engine.getStartNode();
      engine.visitNode(startNode!.id);

      // Выполняем последовательность переходов
      engine.executeChoice('choice1'); // choice1 -> pathA
      engine.getNextNode('pathA'); // pathA -> end

      // Перезапускаем историю
      const restartedNode = engine.restart();

      expect(restartedNode).not.toBeNull();
      expect(restartedNode?.id).toBe('start');

      // Проверяем, что состояние сброшено
      const gameState = engine.getState();
      expect(gameState.history.length).toBe(0); // После restart история пуста
      expect(gameState.visitedNodes.size).toBe(0); // Нет посещенных узлов
      expect(gameState.variables.score.value).toBe(0);
    });
  });

  describe('Operations', () => {
    it('should not execute operations for choice nodes', () => {
      // Создаем переменную, которую будем изменять
      const testVariableId = 'score';

      // Создаем узел выбора с операцией
      const choiceNodeWithOperation: ChoiceNode = {
        id: 'choice_with_op',
        type: 'choice',
        coordinates: {x: 100, y: 200},
        data: {text: 'Choice with operation', height: 80},
        operations: [
          {
            id: 'op1',
            nodeId: 'choice_with_op',
            variableId: testVariableId,
            operationType: 'addition',
            target: {type: 'custom', value: 5},
            enabled: true,
            order: 0
          }
        ]
      };

      // Добавляем узел в данные истории
      const updatedNodes = [...testNodes, choiceNodeWithOperation];
      const updatedEdges = [
        ...testEdges,
        {
          id: 'e7',
          source: 'start',
          target: 'choice_with_op'
        },
        {
          id: 'e8',
          source: 'choice_with_op',
          target: 'end'
        }
      ];

      // Создаем новые данные истории с обновленными узлами и ребрами
      const updatedStoryData: StoryData = {
        ...testStoryData,
        data: {
          ...testStoryData.data,
          nodes: updatedNodes as Node[],
          edges: updatedEdges
        }
      };

      // Инициализируем движок обновленными данными
      engine.initialize(updatedStoryData);

      // Записываем начальное значение переменной
      const initialValue = engine.getState().variables[testVariableId].value;

      // Выполняем выбор, который теоретически должен выполнить операцию
      engine.executeChoice('choice_with_op');

      // Проверяем, что значение переменной не изменилось
      const afterValue = engine.getState().variables[testVariableId].value;
      expect(afterValue).toEqual(initialValue);

      // Проверяем, что узел был посещен, но операции не были выполнены
      expect(engine.getState().visitedNodes.has('choice_with_op')).toBe(true);

      // Проверяем, что массив выполненных операций пуст или не содержит нашу операцию
      const operations = engine.getState().executedOperations;
      const hasOperation = operations.some((op) => op.nodeId === 'choice_with_op' && op.variableId === testVariableId);
      expect(hasOperation).toBe(false);
    });
  });
});
