/**
 * Тесты для стратегии сравнения переменных
 */
import {Condition} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

import {ConditionType} from '../../../../../types/nodes';
import {GameState} from '../../../core/GameState';
import {VariableComparisonStrategy} from '../VariableComparisonStrategy';

describe('VariableComparisonStrategy', () => {
  const strategy = new VariableComparisonStrategy();

  // Подготавливаем тестовые переменные
  const testVariables: Variable[] = [
    {id: 'score', name: 'Score', type: 'integer', value: 100},
    {id: 'health', name: 'Health', type: 'integer', value: 50},
    {id: 'isHero', name: 'Is Hero', type: 'boolean', value: true},
    {id: 'name', name: 'Name', type: 'string', value: 'Hero'},
    {id: 'percentage', name: 'Percentage', type: 'percent', value: 0.75}, // 75%
    {id: 'zero', name: 'Zero', type: 'integer', value: 0}
  ];

  // Создаем тестовое состояние игры с набором переменных
  const gameState: GameState = {
    variables: {
      score: {id: 'score', name: 'Score', type: 'integer', value: 100},
      health: {id: 'health', name: 'Health', type: 'integer', value: 50},
      name: {id: 'name', name: 'Player Name', type: 'string', value: 'Player1'},
      isActive: {id: 'isActive', name: 'Is Active', type: 'boolean', value: true},
      progress: {id: 'progress', name: 'Progress', type: 'percent', value: 0.75}
    },
    visitedNodes: new Set<string>(),
    history: [],
    displayHistory: [],
    executedOperations: [],
    triggeredConditions: []
  };

  // Заполняем переменные в gameState
  beforeEach(() => {
    // Очищаем variables перед каждым тестом
    gameState.variables = {};

    // Заполняем переменными
    testVariables.forEach((variable) => {
      gameState.variables[variable.id] = {...variable};
    });
  });

  it('should return false for non-variable-comparison conditions', () => {
    const condition: Condition = {
      id: '1',
      type: ConditionType.PROBABILITY,
      probability: 0.5
    };

    expect(strategy.evaluate(condition, gameState)).toBe(false);
  });

  it('should return false if varId is not provided', () => {
    const condition: Condition = {
      id: '2',
      type: ConditionType.VARIABLE_COMPARISON,
      operator: 'eq',
      valType: 'custom',
      value: 100
    };

    expect(strategy.evaluate(condition, gameState)).toBe(false);
  });

  describe('Custom value comparisons', () => {
    it('should correctly compare with equals operator', () => {
      const condition: Condition = {
        id: '3',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        operator: 'eq',
        valType: 'custom',
        value: 100
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: 101
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should correctly compare with not equals operator', () => {
      const condition: Condition = {
        id: '4',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        operator: 'neq',
        valType: 'custom',
        value: 50
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: 100
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should correctly compare with greater than operator', () => {
      const condition: Condition = {
        id: '5',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        operator: 'gt',
        valType: 'custom',
        value: 50
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: 100
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should correctly compare with greater than or equal operator', () => {
      const condition: Condition = {
        id: '6',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        operator: 'gte',
        valType: 'custom',
        value: 100
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: 101
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should correctly compare with less than operator', () => {
      const condition: Condition = {
        id: '7',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'health',
        operator: 'lt',
        valType: 'custom',
        value: 100
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: 50
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should correctly compare with less than or equal operator', () => {
      const condition: Condition = {
        id: '8',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'health',
        operator: 'lte',
        valType: 'custom',
        value: 50
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: 49
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should default to eq operator if not specified', () => {
      const condition: Condition = {
        id: '9',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        valType: 'custom',
        value: 100
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: 99
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should handle boolean values', () => {
      const condition: Condition = {
        id: '10',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'isHero',
        operator: 'eq',
        valType: 'custom',
        value: true
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: false
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should handle string values', () => {
      const condition: Condition = {
        id: '11',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'name',
        operator: 'eq',
        valType: 'custom',
        value: 'Hero'
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Изменяем условие для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        value: 'Player'
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should handle percentage values', () => {
      const condition: Condition = {
        id: '12',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'percentage',
        operator: 'eq',
        valType: 'custom',
        value: 75,
        percentType: true
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Условие с явным процентным значением
      const explicitCondition: Condition = {
        id: '13',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'percentage',
        operator: 'eq',
        valType: 'custom',
        value: 0.75 // Явно указано как 0.75
      };

      expect(strategy.evaluate(explicitCondition, gameState)).toBe(true);
    });
  });

  describe('Variable-to-variable comparisons', () => {
    it('should correctly compare two variables with equals operator', () => {
      const condition: Condition = {
        id: '14',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        comparisonVarId: 'score', // Сравниваем переменную саму с собой
        operator: 'eq',
        valType: 'variable'
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);
    });

    it('should correctly compare two variables with greater than operator', () => {
      const condition: Condition = {
        id: '15',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        comparisonVarId: 'health',
        operator: 'gt',
        valType: 'variable'
      };

      expect(strategy.evaluate(condition, gameState)).toBe(true);

      // Меняем переменные местами для проверки отрицательного случая
      const falseCondition: Condition = {
        ...condition,
        varId: 'health',
        comparisonVarId: 'score'
      };

      expect(strategy.evaluate(falseCondition, gameState)).toBe(false);
    });

    it('should return false if comparisonVarId is not provided', () => {
      const condition: Condition = {
        id: '16',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        operator: 'eq',
        valType: 'variable'
        // comparisonVarId отсутствует
      };

      expect(strategy.evaluate(condition, gameState)).toBe(false);
    });
  });

  it('should handle edge cases (zero, undefined)', () => {
    // Проверка на равенство с нулем
    const zeroCondition: Condition = {
      id: '17',
      type: ConditionType.VARIABLE_COMPARISON,
      varId: 'zero',
      operator: 'eq',
      valType: 'custom',
      value: 0
    };

    expect(strategy.evaluate(zeroCondition, gameState)).toBe(true);

    // Проверка с несуществующей переменной
    const undefinedVarCondition: Condition = {
      id: '18',
      type: ConditionType.VARIABLE_COMPARISON,
      varId: 'nonexistent',
      operator: 'eq',
      valType: 'custom',
      value: 0
    };

    expect(strategy.evaluate(undefinedVarCondition, gameState)).toBe(false);
  });
});
