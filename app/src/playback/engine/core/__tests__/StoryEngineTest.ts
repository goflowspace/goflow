/**
 * Тесты для движка истории
 */
import {ConditionGroup, Node} from '../../../../types/nodes';
import {ConditionEvaluatorImpl} from '../../conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../conditions/ConditionStrategyFactory';
import {StoryData} from '../StoryData';
import {StoryEngineImpl} from '../StoryEngineImpl';

describe('StoryEngine', () => {
  // Создаем экземпляры зависимостей и движка для тестов
  const strategyFactory = new ConditionStrategyFactory();
  const conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
  const engine = new StoryEngineImpl(conditionEvaluator);

  // Создаем тестовые данные истории
  const testStoryData: StoryData = {
    title: 'Test Story',
    data: {
      nodes: [
        {
          id: 'start',
          type: 'narrative',
          coordinates: {x: 0, y: 0},
          data: {title: 'Start', text: 'This is the start node'}
        },
        {
          id: 'choice1',
          type: 'choice',
          coordinates: {x: 100, y: 0},
          data: {text: 'Go to path A', height: 80}
        },
        {
          id: 'choice2',
          type: 'choice',
          coordinates: {x: 100, y: 100},
          data: {text: 'Go to path B', height: 80}
        },
        {
          id: 'pathA',
          type: 'narrative',
          coordinates: {x: 200, y: 0},
          data: {title: 'Path A', text: 'You chose path A'}
        },
        {
          id: 'pathB',
          type: 'narrative',
          coordinates: {x: 200, y: 100},
          data: {title: 'Path B', text: 'You chose path B'}
        },
        {
          id: 'end',
          type: 'narrative',
          coordinates: {x: 300, y: 50},
          data: {title: 'End', text: 'This is the end'}
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
      ],
      variables: [
        {
          id: 'score',
          name: 'Score',
          type: 'integer',
          value: 0
        }
      ]
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

      // Проверяем, что добавлена запись в историю
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
    it('should return to the previous narrative node', () => {
      // Выполняем последовательность переходов
      const startNode = engine.getStartNode(); // start
      engine.visitNode(startNode!.id); // Явно посещаем стартовый узел
      engine.executeChoice('choice1'); // choice1 -> pathA

      // Возвращаемся назад - должны попасть на start
      const previousNode = engine.goBack();
      expect(previousNode).not.toBeNull();
      expect(previousNode?.id).toBe('start');

      // Проверяем, что история обновлена
      let gameState = engine.getState();
      expect(gameState.history).toEqual(['start']);

      // Возвращаемся еще раз - теперь нельзя, так как в истории только один элемент
      const nullNode = engine.goBack();
      expect(nullNode).toBeNull();

      // Проверяем, что история содержит только стартовый узел
      gameState = engine.getState();
      expect(gameState.history.length).toBe(1);
    });

    it('should return null if history is empty', () => {
      // После инициализации история пуста
      const previousNode = engine.goBack();
      expect(previousNode).toBeNull();

      // Проверяем, что история пуста
      const gameState = engine.getState();
      expect(gameState.history.length).toBe(0);
    });
  });

  describe('restart', () => {
    it('should reset game state and return to start node', () => {
      // Выполняем последовательность переходов
      const startNode = engine.getStartNode();
      engine.visitNode(startNode!.id); // Явно посещаем стартовый узел
      engine.executeChoice('choice1'); // choice1 -> pathA

      // Перезапускаем историю
      const restartedStartNode = engine.restart();

      expect(restartedStartNode).not.toBeNull();
      expect(restartedStartNode?.id).toBe('start');

      // Проверяем, что состояние сброшено
      const gameState = engine.getState();
      expect(gameState.history.length).toBe(0); // После restart история пуста
      expect(gameState.visitedNodes.size).toBe(0); // Нет посещенных узлов
      expect(gameState.variables.score.value).toBe(0);
    });
  });
});
