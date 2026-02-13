/**
 * Стратегия оценки вероятностных условий
 */
import {Condition} from '../../../../types/nodes';
import {GameState} from '../../core/GameState';
import {ConditionStrategy} from '../ConditionStrategy';

export class ProbabilityStrategy implements ConditionStrategy {
  /**
   * Оценивает вероятностное условие
   * @returns true с вероятностью, указанной в условии
   */
  evaluate(condition: Condition, gameState: GameState): boolean {
    // Проверяем, что тип условия - probability
    if (condition.type !== 'probability') {
      return false;
    }

    // Получаем вероятность из условия (по умолчанию 0, если не указано)
    const probability = condition.probability || 0;

    // Генерируем случайное число от 0 до 1 и сравниваем с вероятностью
    return Math.random() < probability;
  }
}
