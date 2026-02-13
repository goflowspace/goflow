/**
 * Тесты для стратегии проверки посещения узлов
 */
import {Condition} from '../../../../../types/nodes';
import {ConditionType} from '../../../../../types/nodes';
import {GameState} from '../../../core/GameState';
import {NodeVisitStrategy} from '../NodeVisitStrategy';

describe('NodeVisitStrategy', () => {
  let strategy: NodeVisitStrategy;
  let gameState: GameState;

  beforeEach(() => {
    // Создаем пустое состояние игры
    gameState = {
      variables: {},
      visitedNodes: new Set<string>(['node1']),
      history: [],
      displayHistory: [],
      executedOperations: [],
      triggeredConditions: []
    };

    // Создаем экземпляр стратегии
    strategy = new NodeVisitStrategy();
  });

  it('should return false for non-node-visit conditions', () => {
    const condition: Condition = {
      id: '1',
      type: ConditionType.PROBABILITY,
      probability: 0.5
    };

    expect(strategy.evaluate(condition, gameState)).toBe(false);
  });

  it('should return false if nodeId is not provided', () => {
    const happenedCondition: Condition = {
      id: '2',
      type: ConditionType.NODE_HAPPENED
      // nodeId отсутствует
    };

    const notHappenedCondition: Condition = {
      id: '3',
      type: ConditionType.NODE_NOT_HAPPENED
      // nodeId отсутствует
    };

    expect(strategy.evaluate(happenedCondition, gameState)).toBe(false);
    expect(strategy.evaluate(notHappenedCondition, gameState)).toBe(false);
  });

  describe('node_happened condition', () => {
    it('should return true when node was visited', () => {
      const condition: Condition = {
        id: '4',
        type: ConditionType.NODE_HAPPENED,
        nodeId: 'node1'
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);
    });

    it('should return false when node was not visited', () => {
      const condition: Condition = {
        id: '5',
        type: ConditionType.NODE_HAPPENED,
        nodeId: 'node4'
      };

      expect(strategy.evaluate(condition, gameState)).toBe(false);
    });
  });

  describe('node_not_happened condition', () => {
    it('should return true when node was not visited', () => {
      const condition: Condition = {
        id: '6',
        type: ConditionType.NODE_NOT_HAPPENED,
        nodeId: 'node4'
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);
    });

    it('should return false when node was visited', () => {
      const condition: Condition = {
        id: '7',
        type: ConditionType.NODE_NOT_HAPPENED,
        nodeId: 'node1'
      };

      expect(strategy.evaluate(condition, gameState)).toBe(false);
    });
  });

  it('should work with updated game state', () => {
    // Создаем копию состояния игры и добавляем новый посещенный узел
    const updatedGameState: GameState = {
      ...gameState,
      visitedNodes: new Set([...gameState.visitedNodes, 'node4'])
    };

    const happenedCondition: Condition = {
      id: '8',
      type: ConditionType.NODE_HAPPENED,
      nodeId: 'node4'
    };

    const notHappenedCondition: Condition = {
      id: '9',
      type: ConditionType.NODE_NOT_HAPPENED,
      nodeId: 'node4'
    };

    // В обновленном состоянии узел node4 уже посещен
    expect(strategy.evaluate(happenedCondition, updatedGameState)).toBe(true);
    expect(strategy.evaluate(notHappenedCondition, updatedGameState)).toBe(false);

    // В исходном состоянии узел node4 не посещен
    expect(strategy.evaluate(happenedCondition, gameState)).toBe(false);
    expect(strategy.evaluate(notHappenedCondition, gameState)).toBe(true);
  });

  it('should handle edge cases (empty set, non-existent node)', () => {
    // Создаем состояние с пустым набором посещенных узлов
    const emptyGameState: GameState = {
      variables: {},
      visitedNodes: new Set<string>(),
      history: [],
      displayHistory: [],
      executedOperations: [],
      triggeredConditions: []
    };

    const happenedCondition: Condition = {
      id: '10',
      type: ConditionType.NODE_HAPPENED,
      nodeId: 'node1'
    };

    const notHappenedCondition: Condition = {
      id: '11',
      type: ConditionType.NODE_NOT_HAPPENED,
      nodeId: 'node1'
    };

    // В пустом состоянии ни один узел не посещен
    expect(strategy.evaluate(happenedCondition, emptyGameState)).toBe(false);
    expect(strategy.evaluate(notHappenedCondition, emptyGameState)).toBe(true);
  });

  describe('Проверка условий посещения узлов', () => {
    it('должно возвращать true если узел был посещен при node_happened', () => {
      // Создаем состояние игры с посещенным узлом
      gameState = {
        variables: {},
        visitedNodes: new Set<string>(['node1']),
        history: [],
        displayHistory: [],
        executedOperations: [],
        triggeredConditions: []
      };

      const condition: Condition = {
        id: '4',
        type: ConditionType.NODE_HAPPENED,
        nodeId: 'node1'
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);
    });

    it('should return true for node_not_happened with a not visited node', () => {
      const notHappenedCondition: Condition = {
        id: '3',
        type: ConditionType.NODE_NOT_HAPPENED,
        nodeId: 'node3'
      };

      const emptyGameState: GameState = {
        variables: {},
        visitedNodes: new Set<string>(),
        history: [],
        displayHistory: [],
        executedOperations: [],
        triggeredConditions: []
      };

      expect(strategy.evaluate(notHappenedCondition, emptyGameState)).toBe(true);
    });
  });
});
