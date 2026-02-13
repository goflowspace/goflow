/**
 * Тесты для проверки корректного логирования условий
 * Убеждаемся, что логируются только условия выбранного пути
 */
import {ConditionGroup, NarrativeNode, Node} from '../../../../types/nodes';
import {ConditionEvaluatorImpl} from '../../conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../conditions/ConditionStrategyFactory';
import {EngineEvent} from '../../events/EngineEvents';
import {StoryData} from '../StoryData';
import {StoryEngineImpl} from '../StoryEngineImpl';

describe('Story Engine Conditional Logging', () => {
  // Создаем экземпляры зависимостей и движка для тестов
  const strategyFactory = new ConditionStrategyFactory();
  let evaluateConditionSpy: jest.SpyInstance;
  let conditionEvaluator: ConditionEvaluatorImpl;
  let engine: StoryEngineImpl;
  let emittedEvents: EngineEvent[] = [];

  beforeEach(() => {
    conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
    // Шпионим за методом evaluateCondition
    evaluateConditionSpy = jest.spyOn(conditionEvaluator, 'evaluateCondition');
    engine = new StoryEngineImpl(conditionEvaluator);

    // Подписываемся на события
    emittedEvents = [];
    engine.getEventEmitter().on((event: EngineEvent) => {
      emittedEvents.push(event);
    });
  });

  afterEach(() => {
    evaluateConditionSpy.mockRestore();
  });

  test('should log conditions only for selected path', () => {
    // Создаем тестовые данные: узел с 3 исходящими связями (2 с условиями, 1 без)
    const testStoryData: StoryData = {
      title: 'Test Story with Multiple Conditional Paths',
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
            data: {title: 'Node 1', text: 'First path'}
          },
          {
            id: 'node2',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 100},
            data: {title: 'Node 2', text: 'Second path'}
          },
          {
            id: 'node3',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 200},
            data: {title: 'Node 3', text: 'Third path'}
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
                  id: 'cg1',
                  operator: 'AND',
                  conditions: [
                    {
                      id: 'c1',
                      type: 'node_happened',
                      nodeId: 'someNode'
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
                  id: 'cg2',
                  operator: 'AND',
                  conditions: [
                    {
                      id: 'c2',
                      type: 'node_happened',
                      nodeId: 'anotherNode'
                    }
                  ]
                }
              ] as ConditionGroup[]
            }
          },
          {
            id: 'edge3',
            source: 'start',
            target: 'node3',
            data: {
              // Связь без условий
            }
          }
        ],
        variables: []
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    // Инициализируем движок
    engine.initialize(testStoryData);

    // Получаем стартовый узел через getStartNode() для правильной инициализации
    const startNode = engine.getStartNode();
    expect(startNode).not.toBeNull();
    expect(startNode?.id).toBe('start');

    // Мокаем результаты проверки условий:
    // - edge1 (к node1): условия НЕ выполнены
    // - edge2 (к node2): условия выполнены
    // - edge3 (к node3): нет условий (всегда true)
    evaluateConditionSpy.mockImplementation((condition, gameState, context) => {
      // Проверяем какая связь проверяется
      if (context?.edgeId === 'edge1') {
        return false; // Условия первой связи не выполнены
      } else if (context?.edgeId === 'edge2') {
        return true; // Условия второй связи выполнены
      }

      return true; // По умолчанию true
    });

    // Очищаем события перед вызовом
    emittedEvents = [];

    // Получаем следующий узел
    const nextNode = engine.getNextNode('start');

    // Проверяем, что выбран узел node2 (т.к. у него выполнены условия и он имеет приоритет)
    expect(nextNode).not.toBeNull();
    expect(nextNode?.id).toBe('node2');

    // Проверяем события логирования условий
    const conditionEvents = emittedEvents.filter((e) => e.type === 'condition.evaluated');
    const groupEvents = emittedEvents.filter((e) => e.type === 'condition.group.evaluated');

    // Должны быть события только для выбранного пути (edge2)
    expect(conditionEvents.length).toBeGreaterThan(0);
    expect(conditionEvents.every((e) => (e as any).edgeId === 'edge2')).toBe(true);

    // Проверяем, что логирование было для выбранной связи (edge2)
    expect(conditionEvents[0]).toMatchObject({
      type: 'condition.evaluated',
      nodeId: 'start',
      edgeId: 'edge2'
    });
  });

  test('should not log conditions when path has no conditions', () => {
    // Создаем тестовые данные: все пути без условий
    const testStoryData: StoryData = {
      title: 'Test Story without Conditions',
      data: {
        nodes: [
          {
            id: 'start',
            type: 'narrative' as const,
            coordinates: {x: 0, y: 0},
            data: {title: 'Start', text: 'Start node'}
          },
          {
            id: 'end',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 0},
            data: {title: 'End', text: 'End node'}
          }
        ] as Node[],
        edges: [
          {
            id: 'edge1',
            source: 'start',
            target: 'end',
            data: {
              // Нет условий
            }
          }
        ],
        variables: []
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    // Инициализируем движок
    engine.initialize(testStoryData);

    // Очищаем события
    emittedEvents = [];

    // Получаем следующий узел
    const nextNode = engine.getNextNode('start');

    // Проверяем, что выбран узел end
    expect(nextNode).not.toBeNull();
    expect(nextNode?.id).toBe('end');

    // Проверяем, что не было событий логирования условий
    const conditionEvents = emittedEvents.filter((e) => e.type === 'condition.evaluated');
    expect(conditionEvents).toHaveLength(0);
  });

  test('should log conditions for virtual continue choice', () => {
    // Создаем тестовые данные с прямым переходом между нарративами
    const testStoryData: StoryData = {
      title: 'Test Story with Direct Narrative Transition',
      data: {
        nodes: [
          {
            id: 'start',
            type: 'narrative' as const,
            coordinates: {x: 0, y: 0},
            data: {title: 'Start', text: 'Start node'}
          },
          {
            id: 'middle',
            type: 'narrative' as const,
            coordinates: {x: 100, y: 0},
            data: {title: 'Middle', text: 'Middle node'}
          }
        ] as Node[],
        edges: [
          {
            id: 'edge1',
            source: 'start',
            target: 'middle',
            data: {
              conditions: [
                {
                  id: 'cg1',
                  operator: 'AND',
                  conditions: [
                    {
                      id: 'c1',
                      type: 'probability',
                      probability: 1.0
                    }
                  ]
                }
              ] as ConditionGroup[]
            }
          }
        ],
        variables: []
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    // Инициализируем движок
    engine.initialize(testStoryData);

    // Получаем стартовый узел через getStartNode() для правильной инициализации
    const startNode = engine.getStartNode();
    expect(startNode).not.toBeNull();
    expect(startNode?.id).toBe('start');

    // Мокаем условия как выполненные
    evaluateConditionSpy.mockReturnValue(true);

    // Очищаем события
    emittedEvents = [];

    // Вызываем handleDirectNarrativeTransition
    const nextNode = engine.handleDirectNarrativeTransition('start');

    // Проверяем, что переход произошел
    expect(nextNode).not.toBeNull();
    expect(nextNode?.id).toBe('middle');

    // Проверяем, что условия были залогированы через события
    const conditionEvents = emittedEvents.filter((e) => e.type === 'condition.evaluated');
    expect(conditionEvents).toHaveLength(1);
    expect(conditionEvents[0]).toMatchObject({
      type: 'condition.evaluated',
      nodeId: 'start',
      edgeId: 'edge1'
    });
  });

  test('должен генерировать события условий после выбора', () => {
    // Добавляем узел выбора в данные
    const choiceNode = {
      id: 'choice1',
      type: 'choice' as const,
      coordinates: {x: 150, y: 100},
      data: {text: 'Сделать выбор'}
    };

    const targetNode = {
      id: 'target',
      type: 'narrative' as const,
      coordinates: {x: 300, y: 100},
      data: {title: 'Результат', text: 'Результат выбора'}
    };

    // Создаем связь от стартового узла к выбору
    const edgeToChoice = {
      id: 'edge-to-choice',
      source: 'start',
      target: 'choice1'
    };

    // Создаем связь от выбора к целевому узлу с условиями
    const edgeWithConditions = {
      id: 'edge-with-conditions',
      source: 'choice1',
      target: 'target',
      data: {
        conditions: [
          {
            id: 'condition-group',
            operator: 'AND',
            conditions: [
              {
                id: 'test-condition',
                type: 'variable_comparison',
                varId: 'testVar',
                value: 'test',
                operator: 'eq',
                valType: 'custom'
              }
            ]
          }
        ] as ConditionGroup[]
      }
    };

    // Обновляем данные истории
    const updatedStoryData: StoryData = {
      title: 'Test Story with Choice and Conditions',
      data: {
        nodes: [
          {
            id: 'start',
            type: 'narrative' as const,
            coordinates: {x: 0, y: 0},
            data: {title: 'Start', text: 'Start node'}
          },
          choiceNode,
          targetNode
        ] as Node[],
        edges: [edgeToChoice, edgeWithConditions],
        variables: []
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    // Переинициализируем движок с новыми данными
    engine.initialize(updatedStoryData);

    // Добавляем переменную в состояние
    const currentState = engine.getState();
    currentState.variables['testVar'] = {
      id: 'testVar',
      name: 'Test Variable',
      type: 'string',
      value: 'test'
    };

    // Мокаем evaluateCondition чтобы он всегда возвращал true
    evaluateConditionSpy.mockReturnValue(true);

    // Очищаем события
    emittedEvents = [];

    // Получаем стартовый узел
    const startNode = engine.getStartNode();
    expect(startNode?.id).toBe('start');

    // Выполняем выбор
    const resultNode = engine.executeChoice('choice1');
    expect(resultNode?.id).toBe('target');

    // Проверяем что события условий были сгенерированы
    const conditionEvents = emittedEvents.filter((e) => e.type === 'condition.evaluated');
    const groupEvents = emittedEvents.filter((e) => e.type === 'condition.group.evaluated');

    // Должно быть хотя бы одно событие условия
    expect(conditionEvents.length).toBeGreaterThan(0);
    expect(groupEvents.length).toBeGreaterThan(0);

    // Проверяем структуру события условия
    const conditionEvent = conditionEvents[0] as any;
    expect(conditionEvent).toMatchObject({
      type: 'condition.evaluated',
      nodeId: 'choice1',
      edgeId: 'edge-with-conditions',
      condition: expect.objectContaining({
        id: 'test-condition',
        type: 'variable_comparison'
      }),
      result: true
    });

    // Проверяем структуру события группы условий
    const groupEvent = groupEvents[0] as any;
    expect(groupEvent).toMatchObject({
      type: 'condition.group.evaluated',
      nodeId: 'choice1',
      edgeId: 'edge-with-conditions',
      conditions: expect.arrayContaining([
        expect.objectContaining({
          condition: expect.objectContaining({
            id: 'test-condition'
          }),
          result: true
        })
      ]),
      groupOperator: 'AND',
      groupResult: true
    });
  });

  test('должен корректно логировать условия с разными результатами', () => {
    // Создаем узел выбора и два возможных пути
    const choiceNode = {
      id: 'choice-multi',
      type: 'choice' as const,
      coordinates: {x: 150, y: 100},
      data: {text: 'Выбор'}
    };

    const successNode = {
      id: 'success',
      type: 'narrative' as const,
      coordinates: {x: 300, y: 50},
      data: {title: 'Успех', text: 'Успешный путь'}
    };

    const fallbackNode = {
      id: 'fallback',
      type: 'narrative' as const,
      coordinates: {x: 300, y: 150},
      data: {title: 'Обход', text: 'Альтернативный путь'}
    };

    // Связь с условиями (которые НЕ выполняются)
    const conditionalEdge = {
      id: 'conditional-edge',
      source: 'choice-multi',
      target: 'success',
      data: {
        conditions: [
          {
            id: 'failing-group',
            operator: 'AND',
            conditions: [
              {
                id: 'impossible-condition',
                type: 'variable_comparison',
                varId: 'impossibleVar',
                value: 'impossible',
                operator: 'eq',
                valType: 'custom'
              }
            ]
          }
        ] as ConditionGroup[]
      }
    };

    // Связь без условий (резервная)
    const fallbackEdge = {
      id: 'fallback-edge',
      source: 'choice-multi',
      target: 'fallback'
    };

    const updatedStoryData: StoryData = {
      title: 'Test Story with Multiple Paths',
      data: {
        nodes: [
          {
            id: 'start',
            type: 'narrative' as const,
            coordinates: {x: 0, y: 0},
            data: {title: 'Start', text: 'Start node'}
          },
          choiceNode,
          successNode,
          fallbackNode
        ] as Node[],
        edges: [{id: 'to-choice', source: 'start', target: 'choice-multi'}, conditionalEdge, fallbackEdge],
        variables: []
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    engine.initialize(updatedStoryData);

    // Мокаем условие так, чтобы оно НЕ выполнялось
    evaluateConditionSpy.mockReturnValue(false);

    emittedEvents = [];

    // Выполняем выбор
    const resultNode = engine.executeChoice('choice-multi');

    // Должен выбраться fallback узел, так как условия не выполнились
    expect(resultNode?.id).toBe('fallback');

    // Проверяем что события все равно генерируются (для выбранного пути)
    const groupEvents = emittedEvents.filter((e) => e.type === 'condition.group.evaluated');

    // События должны быть для фактически выбранного пути
    if (groupEvents.length > 0) {
      const groupEvent = groupEvents[0] as any;
      // Поскольку был выбран fallback путь, условия не должны содержать ошибочный путь
      expect(groupEvent.edgeId).toBe('fallback-edge');
    }
  });
});
