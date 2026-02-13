/**
 * Реализация оценщика условий
 * Использует фабрику стратегий для оценки условий разных типов
 */
import {Condition, ConditionGroup} from '../../../types/nodes';
import {GameState} from '../core/GameState';
import {EngineEventEmitter} from '../events/EngineEvents';
import {ConditionEvaluator} from '../interfaces/ConditionEvaluator';
import {ConditionStrategyFactory} from './ConditionStrategyFactory';

export class ConditionEvaluatorImpl implements ConditionEvaluator {
  constructor(
    private strategyFactory: ConditionStrategyFactory,
    private eventEmitter?: EngineEventEmitter
  ) {}

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
  ): boolean {
    try {
      // Получаем стратегию для типа условия
      const strategy = this.strategyFactory.createStrategy(condition.type);
      // Оцениваем условие с помощью стратегии
      const result = strategy.evaluate(condition, gameState);

      // Генерируем событие оценки условия (только если не в тихом режиме)
      if (this.eventEmitter && context && !context.silent) {
        this.eventEmitter.emit({
          type: 'condition.evaluated',
          timestamp: Date.now(),
          nodeId: context.nodeId,
          edgeId: context.edgeId,
          condition: condition,
          result: result,
          groupOperator: context.groupOperator
        });
      }

      // Записываем информацию о проверенном условии (только если не в тихом режиме)
      if (gameState.triggeredConditions && context && !context.silent) {
        // Ограничиваем историю условий до 50 записей
        if (gameState.triggeredConditions.length > 50) {
          gameState.triggeredConditions = gameState.triggeredConditions.slice(-50);
        }

        // Проверяем, не было ли уже такого же условия в том же контексте
        const isDuplicate = gameState.triggeredConditions.some((tc) => tc.condition.id === condition.id && tc.nodeId === context.nodeId && tc.edgeId === context.edgeId);

        // Добавляем только если это не дубликат
        if (!isDuplicate) {
          gameState.triggeredConditions.push({
            condition,
            groupOperator: context.groupOperator,
            groupId: context.groupId,
            nodeId: context.nodeId,
            edgeId: context.edgeId,
            timestamp: Date.now(),
            result
          });
        }
      }

      return result;
    } catch (error) {
      console.error(`Error evaluating condition: ${error}`);
      return false;
    }
  }

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
  ): boolean {
    // Если условий нет, группа считается выполненной
    if (!group.conditions || group.conditions.length === 0) {
      return true;
    }

    // Собираем результаты оценки каждого условия
    const conditionResults: Array<{condition: Condition; result: boolean}> = [];
    let groupResult = false;

    // Для AND все условия должны быть true
    if (group.operator === 'AND') {
      groupResult = group.conditions.every((condition) => {
        const result = this.evaluateCondition(condition, gameState, {
          ...context,
          groupOperator: 'AND',
          groupId: group.id
        });
        conditionResults.push({condition, result});
        return result;
      });
    }
    // Для OR достаточно одного true
    else if (group.operator === 'OR') {
      groupResult = group.conditions.some((condition) => {
        const result = this.evaluateCondition(condition, gameState, {
          ...context,
          groupOperator: 'OR',
          groupId: group.id
        });
        conditionResults.push({condition, result});
        return result;
      });
    }

    // Генерируем событие оценки группы условий (только если не в тихом режиме)
    if (this.eventEmitter && context && !context.silent) {
      this.eventEmitter.emit({
        type: 'condition.group.evaluated',
        timestamp: Date.now(),
        nodeId: context.nodeId,
        edgeId: context.edgeId,
        conditions: conditionResults,
        groupOperator: group.operator,
        groupResult: groupResult
      });
    }

    return groupResult;
  }

  /**
   * Оценивает массив групп условий
   */
  evaluateConnectionConditions(conditionGroups: ConditionGroup[] | undefined, gameState: GameState, context?: {nodeId?: string; edgeId?: string; silent?: boolean}): boolean {
    // Если условий нет, переход всегда разрешен
    if (!conditionGroups || conditionGroups.length === 0) {
      return true;
    }

    // Проверяем группы условий с оператором OR (Достаточно, чтобы одна группа вернула true)
    for (const group of conditionGroups) {
      // Если это группа OR и хотя бы одно условие в ней выполняется, возвращаем true
      if (group.operator === 'OR' && this.evaluateConditionGroup(group, gameState, context)) {
        return true;
      }
    }

    // Проверяем группы условий с оператором AND (Все условия должны выполняться)
    const andGroups = conditionGroups.filter((group) => group.operator === 'AND');
    if (andGroups.length === 0) {
      // Если нет групп AND, но были группы OR и они не выполнились, возвращаем false
      return false;
    }

    // Все группы AND должны выполняться
    return andGroups.every((group) => this.evaluateConditionGroup(group, gameState, context));
  }

  /**
   * Устанавливает EventEmitter для генерации событий
   */
  setEventEmitter(eventEmitter: EngineEventEmitter): void {
    this.eventEmitter = eventEmitter;
  }
}
