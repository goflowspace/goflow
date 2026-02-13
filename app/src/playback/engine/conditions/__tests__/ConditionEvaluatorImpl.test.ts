/**
 * Тесты для оценщика условий
 */
import {Condition, ConditionGroup} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

import {ConditionType} from '../../../../types/nodes';
import {GameState} from '../../core/GameState';
import {ConditionEvaluatorImpl} from '../ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../ConditionStrategyFactory';

describe('ConditionEvaluator', () => {
  // Создаем экземпляр оценщика условий для тестов
  const strategyFactory = new ConditionStrategyFactory();
  const evaluator = new ConditionEvaluatorImpl(strategyFactory);

  // Подготавливаем тестовые переменные
  const testVariables: Variable[] = [
    {id: 'score', name: 'Score', type: 'integer', value: 100},
    {id: 'health', name: 'Health', type: 'integer', value: 50},
    {id: 'isHero', name: 'Is Hero', type: 'boolean', value: true},
    {id: 'percentage', name: 'Percentage', type: 'percent', value: 0.75} // 75%
  ];

  // Создаем тестовое состояние игры
  const gameState: GameState = {
    variables: {},
    visitedNodes: new Set<string>(['node1', 'node2']), // Добавляем node1 и node2 как посещенные узлы
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

  describe('evaluateCondition', () => {
    it('should evaluate probability condition correctly', () => {
      // Мокаем Math.random для предсказуемого результата
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      // Условие с 75% вероятностью (должно вернуть true, т.к. 0.5 < 0.75)
      const condition: Condition = {
        id: '1',
        type: ConditionType.PROBABILITY,
        probability: 0.75
      };

      expect(evaluator.evaluateCondition(condition, gameState)).toBe(true);

      // Условие с 25% вероятностью (должно вернуть false, т.к. 0.5 > 0.25)
      const condition2: Condition = {
        id: '2',
        type: ConditionType.PROBABILITY,
        probability: 0.25
      };

      expect(evaluator.evaluateCondition(condition2, gameState)).toBe(false);

      // Восстанавливаем оригинальную функцию
      Math.random = originalRandom;
    });

    it('should evaluate variable comparison conditions correctly', () => {
      // Проверяем равенство
      const equalsCondition: Condition = {
        id: '3',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        valType: 'custom',
        value: 100,
        operator: 'eq'
      };

      expect(evaluator.evaluateCondition(equalsCondition, gameState)).toBe(true);

      // Проверяем неравенство
      const notEqualsCondition: Condition = {
        id: '4',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        valType: 'custom',
        value: 50,
        operator: 'neq'
      };

      expect(evaluator.evaluateCondition(notEqualsCondition, gameState)).toBe(true);

      // Проверяем больше чем
      const greaterThanCondition: Condition = {
        id: '5',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'score',
        valType: 'custom',
        value: 50,
        operator: 'gt'
      };

      expect(evaluator.evaluateCondition(greaterThanCondition, gameState)).toBe(true);

      // Проверяем меньше чем
      const lessThanCondition: Condition = {
        id: '6',
        type: ConditionType.VARIABLE_COMPARISON,
        varId: 'health',
        valType: 'custom',
        value: 100,
        operator: 'lt'
      };

      expect(evaluator.evaluateCondition(lessThanCondition, gameState)).toBe(true);
    });

    it('should evaluate node visit conditions correctly', () => {
      // Проверяем посещение узла
      const nodeHappenedCondition: Condition = {
        id: '9',
        type: ConditionType.NODE_HAPPENED,
        nodeId: 'node1'
      };

      expect(evaluator.evaluateCondition(nodeHappenedCondition, gameState)).toBe(true);

      // Проверяем непосещение узла
      const nodeNotHappenedCondition: Condition = {
        id: '10',
        type: ConditionType.NODE_NOT_HAPPENED,
        nodeId: 'node3'
      };

      expect(evaluator.evaluateCondition(nodeNotHappenedCondition, gameState)).toBe(true);

      // Проверяем непосещение узла, который был посещен
      const nodeNotHappenedFalseCondition: Condition = {
        id: '11',
        type: ConditionType.NODE_NOT_HAPPENED,
        nodeId: 'node2'
      };

      expect(evaluator.evaluateCondition(nodeNotHappenedFalseCondition, gameState)).toBe(false);
    });
  });

  describe('evaluateConditionGroup', () => {
    it('should evaluate AND group correctly', () => {
      const andGroup: ConditionGroup = {
        id: '12',
        operator: 'AND',
        conditions: [
          {
            id: '13',
            type: ConditionType.VARIABLE_COMPARISON,
            varId: 'score',
            valType: 'custom',
            value: 100,
            operator: 'eq'
          },
          {
            id: '14',
            type: ConditionType.NODE_HAPPENED,
            nodeId: 'node1'
          }
        ]
      };

      expect(evaluator.evaluateConditionGroup(andGroup, gameState)).toBe(true);

      // Группа AND с одним ложным условием
      const andGroupWithFalseCondition: ConditionGroup = {
        id: '15',
        operator: 'AND',
        conditions: [
          {
            id: '16',
            type: ConditionType.VARIABLE_COMPARISON,
            varId: 'score',
            valType: 'custom',
            value: 200,
            operator: 'eq'
          },
          {
            id: '17',
            type: ConditionType.NODE_HAPPENED,
            nodeId: 'node1'
          }
        ]
      };

      expect(evaluator.evaluateConditionGroup(andGroupWithFalseCondition, gameState)).toBe(false);
    });

    it('should evaluate OR group correctly', () => {
      const orGroup: ConditionGroup = {
        id: '18',
        operator: 'OR',
        conditions: [
          {
            id: '19',
            type: ConditionType.VARIABLE_COMPARISON,
            varId: 'score',
            valType: 'custom',
            value: 200,
            operator: 'eq'
          },
          {
            id: '20',
            type: ConditionType.NODE_HAPPENED,
            nodeId: 'node1'
          }
        ]
      };

      expect(evaluator.evaluateConditionGroup(orGroup, gameState)).toBe(true);

      // Группа OR с обоими ложными условиями
      const orGroupWithFalseConditions: ConditionGroup = {
        id: '21',
        operator: 'OR',
        conditions: [
          {
            id: '22',
            type: ConditionType.VARIABLE_COMPARISON,
            varId: 'score',
            valType: 'custom',
            value: 200,
            operator: 'eq'
          },
          {
            id: '23',
            type: ConditionType.NODE_HAPPENED,
            nodeId: 'node3'
          }
        ]
      };

      expect(evaluator.evaluateConditionGroup(orGroupWithFalseConditions, gameState)).toBe(false);
    });
  });

  describe('evaluateConnectionConditions', () => {
    it('should evaluate connection conditions correctly', () => {
      const connectionConditions: ConditionGroup[] = [
        {
          id: '24',
          operator: 'AND',
          conditions: [
            {
              id: '25',
              type: ConditionType.VARIABLE_COMPARISON,
              varId: 'score',
              valType: 'custom',
              value: 100,
              operator: 'eq'
            },
            {
              id: '26',
              type: ConditionType.NODE_HAPPENED,
              nodeId: 'node1'
            }
          ]
        },
        {
          id: '27',
          operator: 'OR',
          conditions: [
            {
              id: '28',
              type: ConditionType.VARIABLE_COMPARISON,
              varId: 'health',
              valType: 'custom',
              value: 100,
              operator: 'eq'
            },
            {
              id: '29',
              type: ConditionType.NODE_HAPPENED,
              nodeId: 'node3'
            }
          ]
        }
      ];

      // Для условий связи: первая группа (AND) выполняется, вторая (OR) не выполняется
      // Результат должен быть true, так как все группы AND должны выполняться
      expect(evaluator.evaluateConnectionConditions(connectionConditions, gameState)).toBe(true);

      // Условия связи только с OR группами, ни одна из которых не выполняется
      const orOnlyConnectionConditions: ConditionGroup[] = [
        {
          id: '30',
          operator: 'OR',
          conditions: [
            {
              id: '31',
              type: ConditionType.VARIABLE_COMPARISON,
              varId: 'score',
              valType: 'custom',
              value: 200,
              operator: 'eq'
            },
            {
              id: '32',
              type: ConditionType.NODE_HAPPENED,
              nodeId: 'node3'
            }
          ]
        }
      ];

      expect(evaluator.evaluateConnectionConditions(orOnlyConnectionConditions, gameState)).toBe(false);

      // Пустой массив условий должен вернуть true
      expect(evaluator.evaluateConnectionConditions([], gameState)).toBe(true);

      // Условия = undefined должно вернуть true
      expect(evaluator.evaluateConnectionConditions(undefined, gameState)).toBe(true);
    });

    it('должен возвращать true для одной группы AND с выполненными условиями', () => {
      const connectionConditions: ConditionGroup[] = [
        {
          id: 'group1',
          operator: 'AND',
          conditions: [
            {
              id: 'cond1',
              type: ConditionType.NODE_HAPPENED,
              nodeId: 'node1'
            },
            {
              id: 'cond2',
              type: ConditionType.VARIABLE_COMPARISON,
              varId: 'var1',
              value: 'test',
              operator: 'eq',
              valType: 'custom'
            },
            {
              id: 'cond3',
              type: ConditionType.PROBABILITY,
              probability: 1 // 100% вероятность
            }
          ]
        }
      ];

      const testGameState: GameState = {
        visitedNodes: new Set<string>(['node1']),
        variables: {
          var1: {id: 'var1', name: 'Variable 1', type: 'string', value: 'test'}
        },
        history: [],
        displayHistory: [],
        executedOperations: [],
        triggeredConditions: []
      };

      // Мокаем Math.random для probability
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5); // Меньше 1, значит условие выполнится

      const result = evaluator.evaluateConnectionConditions(connectionConditions, testGameState);

      expect(result).toBe(true);

      // Восстанавливаем оригинальную функцию
      Math.random = originalRandom;
    });

    it('должен возвращать false для одной группы AND с невыполненным условием', () => {
      const connectionConditions: ConditionGroup[] = [
        {
          id: 'group1',
          operator: 'AND',
          conditions: [
            {
              id: 'cond1',
              type: ConditionType.NODE_HAPPENED,
              nodeId: 'node1'
            },
            {
              id: 'cond2',
              type: ConditionType.VARIABLE_COMPARISON,
              varId: 'var1',
              value: 'test',
              operator: 'eq',
              valType: 'custom'
            },
            {
              id: 'cond3',
              type: ConditionType.PROBABILITY,
              probability: 0 // 0% вероятность - всегда false
            }
          ]
        }
      ];

      const testGameState: GameState = {
        visitedNodes: new Set<string>(['node1']),
        variables: {
          var1: {id: 'var1', name: 'Variable 1', type: 'string', value: 'test'}
        },
        history: [],
        displayHistory: [],
        executedOperations: [],
        triggeredConditions: []
      };

      const result = evaluator.evaluateConnectionConditions(connectionConditions, testGameState);

      expect(result).toBe(false);
    });
  });
});
