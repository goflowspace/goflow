/**
 * Тест для проверки работы OR условий при выборе пути
 */
import {ConditionGroup, Node} from '../../../../types/nodes';
import {ConditionEvaluatorImpl} from '../../conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../conditions/ConditionStrategyFactory';
import {StoryData} from '../StoryData';
import {StoryEngineImpl} from '../StoryEngineImpl';

describe('Story Engine OR Condition Handling', () => {
  const strategyFactory = new ConditionStrategyFactory();
  const conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
  const engine = new StoryEngineImpl(conditionEvaluator);

  test('should sometimes select path with OR conditions when competing with always-true path', () => {
    const testStoryData: StoryData = {
      title: 'Test Story with OR Conditions',
      data: {
        nodes: [
          {
            id: 'start',
            type: 'narrative' as const,
            coordinates: {x: 0, y: 0},
            data: {title: 'Start', text: 'Start node'}
          },
          {
            id: 'node1',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 0},
            data: {title: 'Node 1', text: 'Path with OR conditions'}
          },
          {
            id: 'node2',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 100},
            data: {title: 'Node 2', text: 'Path with always-true condition'}
          }
        ] as Node[],
        edges: [
          {
            id: 'edge1',
            source: 'start',
            target: 'node1',
            data: {
              conditions: [
                {
                  id: 'or_group',
                  operator: 'OR',
                  conditions: [
                    {
                      id: 'cond1',
                      type: 'variable_comparison',
                      varId: 'steps',
                      value: 0,
                      operator: 'eq',
                      valType: 'custom'
                    },
                    {
                      id: 'cond2',
                      type: 'variable_comparison',
                      varId: 'hasApple',
                      value: true,
                      operator: 'eq',
                      valType: 'custom'
                    }
                  ]
                }
              ] as ConditionGroup[]
            }
          },
          {
            id: 'edge2',
            source: 'start',
            target: 'node2',
            data: {
              conditions: [
                {
                  id: 'and_group',
                  operator: 'AND',
                  conditions: [
                    {
                      id: 'cond3',
                      type: 'probability',
                      probability: 1.0 // Всегда выполняется
                    }
                  ]
                }
              ] as ConditionGroup[]
            }
          }
        ],
        variables: [
          {
            id: 'steps',
            name: 'Пройденные шаги',
            type: 'integer',
            value: 5 // Не равно 0
          },
          {
            id: 'hasApple',
            name: 'Есть яблоко',
            type: 'boolean',
            value: true // Это условие выполнится
          }
        ]
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    engine.initialize(testStoryData);

    // Проверяем многократно, чтобы убедиться в случайности выбора
    const results = {node1: 0, node2: 0};

    for (let i = 0; i < 100; i++) {
      // Сбрасываем состояние
      engine.restart();

      const nextNode = engine.getNextNode('start');
      if (nextNode?.id === 'node1') results.node1++;
      else if (nextNode?.id === 'node2') results.node2++;
    }

    console.log('Результаты выбора путей:', results);

    // Оба пути должны быть выбраны хотя бы несколько раз
    expect(results.node1).toBeGreaterThan(0);
    expect(results.node2).toBeGreaterThan(0);
  });

  test('OR condition should work correctly - at least one condition must be true', () => {
    const testStoryData: StoryData = {
      title: 'Test OR Logic',
      data: {
        nodes: [
          {
            id: 'start',
            type: 'narrative' as const,
            coordinates: {x: 0, y: 0},
            data: {title: 'Start', text: 'Start'}
          },
          {
            id: 'target',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 0},
            data: {title: 'Target', text: 'Target'}
          }
        ] as Node[],
        edges: [
          {
            id: 'edge1',
            source: 'start',
            target: 'target',
            data: {
              conditions: [
                {
                  id: 'or_group',
                  operator: 'OR',
                  conditions: [
                    {
                      id: 'cond1',
                      type: 'variable_comparison',
                      varId: 'var1',
                      value: 'impossible',
                      operator: 'eq',
                      valType: 'custom'
                    },
                    {
                      id: 'cond2',
                      type: 'variable_comparison',
                      varId: 'var2',
                      value: 'correct',
                      operator: 'eq',
                      valType: 'custom'
                    }
                  ]
                }
              ] as ConditionGroup[]
            }
          }
        ],
        variables: [
          {
            id: 'var1',
            name: 'Variable 1',
            type: 'string',
            value: 'wrong'
          },
          {
            id: 'var2',
            name: 'Variable 2',
            type: 'string',
            value: 'correct'
          }
        ]
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    engine.initialize(testStoryData);

    const nextNode = engine.getNextNode('start');

    // Должен выбрать target, так как второе условие OR выполняется
    expect(nextNode).not.toBeNull();
    expect(nextNode?.id).toBe('target');
  });

  test('should not select path when all OR conditions are false', () => {
    const testStoryData: StoryData = {
      title: 'Test OR All False',
      data: {
        nodes: [
          {
            id: 'start',
            type: 'narrative' as const,
            coordinates: {x: 0, y: 0},
            data: {title: 'Start', text: 'Start'}
          },
          {
            id: 'unreachable',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 0},
            data: {title: 'Unreachable', text: 'Should not reach'}
          },
          {
            id: 'fallback',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 100},
            data: {title: 'Fallback', text: 'Fallback path'}
          }
        ] as Node[],
        edges: [
          {
            id: 'edge1',
            source: 'start',
            target: 'unreachable',
            data: {
              conditions: [
                {
                  id: 'or_group',
                  operator: 'OR',
                  conditions: [
                    {
                      id: 'cond1',
                      type: 'variable_comparison',
                      varId: 'var1',
                      value: 'impossible1',
                      operator: 'eq',
                      valType: 'custom'
                    },
                    {
                      id: 'cond2',
                      type: 'variable_comparison',
                      varId: 'var2',
                      value: 'impossible2',
                      operator: 'eq',
                      valType: 'custom'
                    }
                  ]
                }
              ] as ConditionGroup[]
            }
          },
          {
            id: 'edge2',
            source: 'start',
            target: 'fallback',
            data: {} // Без условий
          }
        ],
        variables: [
          {
            id: 'var1',
            name: 'Variable 1',
            type: 'string',
            value: 'actual1'
          },
          {
            id: 'var2',
            name: 'Variable 2',
            type: 'string',
            value: 'actual2'
          }
        ]
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    engine.initialize(testStoryData);

    const nextNode = engine.getNextNode('start');

    // Должен выбрать fallback, так как условия OR не выполняются
    expect(nextNode).not.toBeNull();
    expect(nextNode?.id).toBe('fallback');
  });
});
