/**
 * Интерфейс стратегии оценки условий
 * Определяет метод для оценки условия определенного типа
 */
import {Condition} from '../../../types/nodes';
import {GameState} from '../core/GameState';

export interface ConditionStrategy {
  /**
   * Оценивает условие
   * @returns true, если условие выполняется
   */
  evaluate(condition: Condition, gameState: GameState): boolean;
}
