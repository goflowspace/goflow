/**
 * Тесты для стратегии вероятностных условий
 */
import {Condition} from '../../../../../types/nodes';
import {ConditionType} from '../../../../../types/nodes';
import {GameState} from '../../../core/GameState';
import {ProbabilityStrategy} from '../ProbabilityStrategy';

describe('ProbabilityStrategy', () => {
  const strategy = new ProbabilityStrategy();

  // Создаем пустое состояние игры (вероятностные условия не зависят от игрового состояния)
  const gameState: GameState = {
    variables: {},
    visitedNodes: new Set<string>(),
    history: [],
    displayHistory: [],
    executedOperations: [],
    triggeredConditions: []
  };

  // Мокаем Math.random для тестов
  const originalRandom = Math.random;

  beforeEach(() => {
    // Сбрасываем мок перед каждым тестом
    Math.random = jest.fn().mockReturnValue(0.5);
  });

  afterAll(() => {
    // Восстанавливаем оригинальную функцию после всех тестов
    Math.random = originalRandom;
  });

  it('should return false for non-probability conditions', () => {
    const condition: Condition = {
      id: '1',
      type: ConditionType.NODE_HAPPENED,
      nodeId: 'node1'
    };

    expect(strategy.evaluate(condition, gameState)).toBe(false);
  });

  it('should return true when probability is higher than random value', () => {
    const condition: Condition = {
      id: '1',
      type: ConditionType.PROBABILITY,
      probability: 0.75 // 75% > 50% (мокнутое значение)
    };

    expect(strategy.evaluate(condition, gameState)).toBe(true);
  });

  it('should return false when probability is lower than random value', () => {
    const condition: Condition = {
      id: '2',
      type: ConditionType.PROBABILITY,
      probability: 0.25 // 25% < 50% (мокнутое значение)
    };

    expect(strategy.evaluate(condition, gameState)).toBe(false);
  });

  it('should return false when probability is equal to random value', () => {
    const condition: Condition = {
      id: '3',
      type: ConditionType.PROBABILITY,
      probability: 0.5 // 50% = 50% (мокнутое значение)
    };

    expect(strategy.evaluate(condition, gameState)).toBe(false);
  });

  it('should default to 0 when probability is not provided', () => {
    const condition: Condition = {
      id: '4',
      type: ConditionType.PROBABILITY
      // probability не указан
    };

    expect(strategy.evaluate(condition, gameState)).toBe(false);
  });

  it('should work with different random values', () => {
    // Устанавливаем Math.random на возврат 0.3
    Math.random = jest.fn().mockReturnValue(0.3);

    const lowProbability: Condition = {
      id: '5',
      type: ConditionType.PROBABILITY,
      probability: 0.2
    };

    const highProbability: Condition = {
      id: '6',
      type: ConditionType.PROBABILITY,
      probability: 0.4
    };

    // 0.2 < 0.3, поэтому ожидаем false
    expect(strategy.evaluate(lowProbability, gameState)).toBe(false);

    // 0.4 > 0.3, поэтому ожидаем true
    expect(strategy.evaluate(highProbability, gameState)).toBe(true);
  });
});
