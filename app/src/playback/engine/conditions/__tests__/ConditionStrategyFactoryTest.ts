/**
 * Тесты для фабрики стратегий условий
 */
import {ConditionStrategyFactory} from '../ConditionStrategyFactory';
import {NodeVisitStrategy} from '../strategies/NodeVisitStrategy';
import {ProbabilityStrategy} from '../strategies/ProbabilityStrategy';
import {VariableComparisonStrategy} from '../strategies/VariableComparisonStrategy';

describe('ConditionStrategyFactory', () => {
  let factory: ConditionStrategyFactory;

  beforeEach(() => {
    factory = new ConditionStrategyFactory();
  });

  it('should create ProbabilityStrategy for probability condition type', () => {
    const strategy = factory.createStrategy('probability');
    expect(strategy).toBeInstanceOf(ProbabilityStrategy);
  });

  it('should create VariableComparisonStrategy for variable_comparison condition type', () => {
    const strategy = factory.createStrategy('variable_comparison');
    expect(strategy).toBeInstanceOf(VariableComparisonStrategy);
  });

  it('should create NodeVisitStrategy for node_happened condition type', () => {
    const strategy = factory.createStrategy('node_happened');
    expect(strategy).toBeInstanceOf(NodeVisitStrategy);
  });

  it('should create NodeVisitStrategy for node_not_happened condition type', () => {
    const strategy = factory.createStrategy('node_not_happened');
    expect(strategy).toBeInstanceOf(NodeVisitStrategy);
  });

  it('should throw an error for unknown condition type', () => {
    expect(() => {
      factory.createStrategy('unknown_condition_type');
    }).toThrow('Unknown condition type: unknown_condition_type');
  });

  it('should cache and reuse instances of strategies', () => {
    // Получаем стратегию первый раз
    const strategy1 = factory.createStrategy('probability');
    // Получаем стратегию второй раз
    const strategy2 = factory.createStrategy('probability');

    // Проверяем, что это один и тот же экземпляр
    expect(strategy1).toBe(strategy2);
  });

  it('should create different instances for different condition types', () => {
    const probabilityStrategy = factory.createStrategy('probability');
    const variableComparisonStrategy = factory.createStrategy('variable_comparison');
    const nodeHappenedStrategy = factory.createStrategy('node_happened');

    expect(probabilityStrategy).toBeInstanceOf(ProbabilityStrategy);
    expect(variableComparisonStrategy).toBeInstanceOf(VariableComparisonStrategy);
    expect(nodeHappenedStrategy).toBeInstanceOf(NodeVisitStrategy);

    // Проверяем, что это разные экземпляры
    expect(probabilityStrategy).not.toBe(variableComparisonStrategy);
    expect(probabilityStrategy).not.toBe(nodeHappenedStrategy);
    expect(variableComparisonStrategy).not.toBe(nodeHappenedStrategy);
  });

  it('should reuse the same NodeVisitStrategy instance for both node_happened and node_not_happened', () => {
    const nodeHappenedStrategy = factory.createStrategy('node_happened');
    const nodeNotHappenedStrategy = factory.createStrategy('node_not_happened');

    // Проверяем, что оба типа используют один и тот же экземпляр
    expect(nodeHappenedStrategy).toEqual(nodeNotHappenedStrategy);
  });
});
