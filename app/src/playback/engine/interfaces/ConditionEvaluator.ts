/**
 * Интерфейс оценщика условий
 * Определяет методы для проверки условий в истории
 */
import {Condition, ConditionGroup} from '../../../types/nodes';
import {GameState} from '../core/GameState';
import {EngineEventEmitter} from '../events/EngineEvents';

export interface ConditionEvaluator {
  /**
   * Оценивает одно условие
   */
  evaluateCondition(
    condition: Condition,
    gameState: GameState,
    context?: {
      nodeId?: string;
      edgeId?: string;
      groupOperator: 'AND' | 'OR';
      groupId?: string;
      silent?: boolean;
    }
  ): boolean;

  /**
   * Оценивает группу условий с учетом оператора (AND/OR)
   */
  evaluateConditionGroup(
    group: ConditionGroup,
    gameState: GameState,
    context?: {
      nodeId?: string;
      edgeId?: string;
      silent?: boolean;
    }
  ): boolean;

  /**
   * Оценивает массив групп условий
   * (используется для проверки условий на переходах)
   */
  evaluateConnectionConditions(conditionGroups: ConditionGroup[] | undefined, gameState: GameState, context?: {nodeId?: string; edgeId?: string; silent?: boolean}): boolean;

  /**
   * Устанавливает EventEmitter для генерации событий
   * (опциональный метод)
   */
  setEventEmitter?(eventEmitter: EngineEventEmitter): void;
}
