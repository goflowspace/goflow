/**
 * Стратегия оценки условий посещения узлов
 * Обрабатывает условия node_happened и node_not_happened
 */
import {Condition} from '../../../../types/nodes';
import {GameState} from '../../core/GameState';
import {ConditionStrategy} from '../ConditionStrategy';

export class NodeVisitStrategy implements ConditionStrategy {
  /**
   * Оценивает условие посещения узла
   * @returns true, если условие выполняется
   */
  evaluate(condition: Condition, gameState: GameState): boolean {
    // Проверка типа условия
    if (condition.type !== 'node_happened' && condition.type !== 'node_not_happened') {
      return false;
    }

    // Проверяем, что есть ID узла
    if (!condition.nodeId) {
      return false;
    }

    // Проверяем был ли посещен узел
    const nodeVisited = gameState.visitedNodes.has(condition.nodeId);

    // В зависимости от типа условия возвращаем результат
    if (condition.type === 'node_happened') {
      return nodeVisited;
    } else {
      // node_not_happened
      return !nodeVisited;
    }
  }
}
