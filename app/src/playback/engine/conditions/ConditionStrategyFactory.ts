/**
 * Фабрика стратегий для условий
 * Создает нужную стратегию в зависимости от типа условия
 */
import {ConditionStrategy} from './ConditionStrategy';
import {NodeVisitStrategy} from './strategies/NodeVisitStrategy';
import {ProbabilityStrategy} from './strategies/ProbabilityStrategy';
import {VariableComparisonStrategy} from './strategies/VariableComparisonStrategy';

export class ConditionStrategyFactory {
  // Кэш стратегий для повторного использования
  private strategies: Record<string, ConditionStrategy> = {};

  /**
   * Создает или возвращает стратегию для указанного типа условия
   */
  createStrategy(conditionType: string): ConditionStrategy {
    // Если стратегия уже создана, возвращаем ее из кэша
    if (this.strategies[conditionType]) {
      return this.strategies[conditionType];
    }

    // Создаем новую стратегию в зависимости от типа
    let strategy: ConditionStrategy;

    switch (conditionType) {
      case 'probability':
        strategy = new ProbabilityStrategy();
        break;
      case 'variable_comparison':
        strategy = new VariableComparisonStrategy();
        break;
      case 'node_happened':
      case 'node_not_happened':
        strategy = new NodeVisitStrategy();
        break;
      default:
        throw new Error(`Unknown condition type: ${conditionType}`);
    }

    // Сохраняем стратегию в кэш
    this.strategies[conditionType] = strategy;

    return strategy;
  }
}
