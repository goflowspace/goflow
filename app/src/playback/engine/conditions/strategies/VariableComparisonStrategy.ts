/**
 * Стратегия оценки условий сравнения переменных
 */
import {Condition} from '../../../../types/nodes';
import {GameState} from '../../core/GameState';
import {ConditionStrategy} from '../ConditionStrategy';

export class VariableComparisonStrategy implements ConditionStrategy {
  /**
   * Оценивает условие сравнения переменных
   * @returns true, если сравнение переменных выполняется
   */
  evaluate(condition: Condition, gameState: GameState): boolean {
    // Проверяем, что тип условия - variable_comparison
    if (condition.type !== 'variable_comparison') {
      return false;
    }

    // Получаем значения переменных
    const leftVarId = condition.varId;
    const operator = condition.operator || 'eq';

    if (!leftVarId) return false;

    const leftVariable = gameState.variables[leftVarId];
    if (!leftVariable) return false;

    const leftValue = leftVariable.value;
    let rightValue: string | number | boolean | undefined;

    // Определяем правую часть сравнения (переменная или кастомное значение)
    if (condition.valType === 'variable') {
      const rightVarId = condition.comparisonVarId;
      if (!rightVarId) return false;

      const rightVariable = gameState.variables[rightVarId];
      if (!rightVariable) return false;

      rightValue = rightVariable.value;
    } else {
      rightValue = condition.value;

      // Если значение правой части для процентной переменной является обычным числом,
      // преобразуем его в процентное значение для правильного сравнения
      if (typeof rightValue === 'number' && condition.percentType === true) {
        rightValue = rightValue * 0.01; // Преобразуем число в процентное значение (делим на 100)
      }
    }

    // Проверяем, что rightValue определен
    if (rightValue === undefined) return false;

    // Выполняем сравнение в зависимости от оператора
    switch (operator) {
      case 'eq':
        return leftValue == rightValue;
      case 'neq':
        return leftValue != rightValue;
      case 'gt':
        return leftValue > rightValue;
      case 'gte':
        return leftValue >= rightValue;
      case 'lt':
        return leftValue < rightValue;
      case 'lte':
        return leftValue <= rightValue;
      default:
        return false;
    }
  }
}
