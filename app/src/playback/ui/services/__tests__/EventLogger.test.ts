import {ConditionType} from '../../../../types/nodes';
import {OperationType} from '../../../../types/variables';
import {
  ChoiceSelectedEvent,
  ConditionEvaluatedEvent,
  ConditionGroupEvaluatedEvent,
  EngineEventEmitter,
  NavigationBackEvent,
  NodeVisitedEvent,
  OperationExecutedEvent,
  PlaybackEngineEvent,
  StoryRestartedEvent
} from '../../../engine/events/EngineEvents';
import {IPlaybackLogPanel, PlaybackLogEntry, PlaybackLogType} from '../../types/logging';
import {EventLogger} from '../EventLogger';

describe('EventLogger', () => {
  let eventLogger: EventLogger;
  let mockEventEmitter: any;
  let mockLogPanel: jest.Mocked<IPlaybackLogPanel>;
  let capturedListener: ((event: PlaybackEngineEvent) => void) | null = null;

  beforeEach(() => {
    eventLogger = new EventLogger();

    // Мок для EventEmitter
    mockEventEmitter = {
      on: jest.fn((listener) => {
        capturedListener = listener;
      }),
      off: jest.fn(),
      emit: jest.fn()
    };

    // Мок для LogPanel
    mockLogPanel = {
      addLog: jest.fn(),
      rollbackLog: jest.fn(),
      clearLog: jest.fn(),
      getLogs: jest.fn(() => []),
      filter: jest.fn((types: Set<PlaybackLogType>) => []),
      sort: jest.fn((ascending?: boolean) => [])
    };

    jest.clearAllMocks();
  });

  describe('Подключение и отключение', () => {
    it('должен подключаться к EventEmitter и LogPanel', () => {
      eventLogger.connect(mockEventEmitter, mockLogPanel);

      expect(mockEventEmitter.on).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.on).toHaveBeenCalledWith(expect.any(Function));
    });

    it('должен отключаться от EventEmitter', () => {
      eventLogger.connect(mockEventEmitter, mockLogPanel);
      const listener = mockEventEmitter.on.mock.calls[0][0];

      eventLogger.disconnect();

      expect(mockEventEmitter.off).toHaveBeenCalledWith(listener);
    });

    it('должен безопасно отключаться без предварительного подключения', () => {
      expect(() => {
        eventLogger.disconnect();
      }).not.toThrow();
    });

    it('должен переподключаться к новым источникам', () => {
      // Первое подключение
      eventLogger.connect(mockEventEmitter, mockLogPanel);
      const firstListener = mockEventEmitter.on.mock.calls[0][0];

      // Второе подключение
      const newEmitter: jest.Mocked<EngineEventEmitter> = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      };
      const newLogPanel: jest.Mocked<IPlaybackLogPanel> = {
        addLog: jest.fn(),
        rollbackLog: jest.fn(),
        clearLog: jest.fn(),
        getLogs: jest.fn(() => []),
        filter: jest.fn((types: Set<PlaybackLogType>) => []),
        sort: jest.fn((ascending?: boolean) => [])
      };

      eventLogger.connect(newEmitter, newLogPanel);

      // Проверяем отключение от старого emitter
      expect(mockEventEmitter.off).toHaveBeenCalledWith(firstListener);
      // Проверяем подключение к новому
      expect(newEmitter.on).toHaveBeenCalledTimes(1);
    });
  });

  describe('Обработка событий движка', () => {
    beforeEach(() => {
      eventLogger.connect(mockEventEmitter, mockLogPanel);
    });

    describe('node.visited', () => {
      it('должен добавлять лог для narrative узлов', () => {
        const event: NodeVisitedEvent = {
          type: 'node.visited',
          timestamp: Date.now(),
          nodeId: 'node1',
          nodeName: 'Test Node',
          nodeType: 'narrative'
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        expect(mockLogPanel.addLog).toHaveBeenCalledWith({
          nodeId: 'node1',
          nodeName: 'Test Node',
          timestamp: event.timestamp,
          type: PlaybackLogType.VisitNode,
          entry: null
        });
      });

      it('должен игнорировать choice узлы', () => {
        const event: NodeVisitedEvent = {
          type: 'node.visited',
          timestamp: Date.now(),
          nodeId: 'node1',
          nodeName: 'Choice Node',
          nodeType: 'choice'
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).not.toHaveBeenCalled();
      });
    });

    describe('choice.selected', () => {
      it('должен добавлять лог для выбранного варианта', () => {
        const event: ChoiceSelectedEvent = {
          type: 'choice.selected',
          timestamp: Date.now(),
          nodeId: 'node1',
          choice: {
            id: 'choice1',
            text: 'Choice Text',
            hasNextNode: true
          }
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        expect(mockLogPanel.addLog).toHaveBeenCalledWith({
          nodeId: 'node1',
          nodeName: 'Choice Text',
          timestamp: event.timestamp,
          type: PlaybackLogType.ChooseChoice,
          entry: 'Choice Text'
        });
      });
    });

    describe('operation.executed', () => {
      it('должен добавлять лог для выполненной операции', () => {
        const event: OperationExecutedEvent = {
          type: 'operation.executed',
          timestamp: Date.now(),
          nodeId: 'node1',
          operation: {
            id: 'op1',
            nodeId: 'node1',
            operationType: 'override',
            variableId: 'var1',
            enabled: true,
            order: 0,
            target: {
              type: 'custom',
              value: 'newValue'
            },
            previousValue: 'oldValue',
            resultValue: 'newValue'
          }
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        expect(mockLogPanel.addLog).toHaveBeenCalledWith({
          nodeId: 'node1',
          timestamp: event.timestamp,
          type: PlaybackLogType.OperationExecute,
          entry: {
            operation: {
              id: 'op1',
              type: 'override',
              parameters: {
                variableId: 'var1',
                value: 'newValue',
                targetType: 'custom',
                targetVariableId: undefined
              }
            },
            result: 'newValue',
            isSuccess: true,
            error: undefined
          }
        });
      });

      it('должен обрабатывать операции без operationType', () => {
        const event: OperationExecutedEvent = {
          type: 'operation.executed',
          timestamp: Date.now(),
          nodeId: 'node1',
          operation: {
            id: 'op1',
            nodeId: 'node1',
            variableId: 'var1',
            enabled: true,
            order: 0,
            operationType: undefined as any,
            resultValue: 'result'
          } as any
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        const logEntry = mockLogPanel.addLog.mock.calls[0][0] as PlaybackLogEntry;
        expect(logEntry.entry).toMatchObject({
          operation: {
            type: 'unknown'
          }
        });
      });

      it('должен обрабатывать операции без target и resultValue', () => {
        const event: OperationExecutedEvent = {
          type: 'operation.executed',
          timestamp: Date.now(),
          nodeId: 'node1',
          operation: {
            id: 'op1',
            nodeId: 'node1',
            variableId: 'var1',
            operationType: 'override',
            enabled: true,
            order: 0
          }
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        const logEntry = mockLogPanel.addLog.mock.calls[0][0] as PlaybackLogEntry;
        expect(logEntry.entry).toMatchObject({
          operation: {
            parameters: {
              value: undefined,
              targetType: undefined,
              targetVariableId: undefined
            }
          },
          result: null
        });
      });
    });

    describe('condition.evaluated', () => {
      it('должен игнорировать отдельные условия', () => {
        const event: ConditionEvaluatedEvent = {
          type: 'condition.evaluated',
          timestamp: Date.now(),
          nodeId: 'node1',
          condition: {
            id: 'cond1',
            type: ConditionType.VARIABLE_COMPARISON,
            varId: 'var1',
            value: 'test',
            operator: 'eq',
            valType: 'custom'
          },
          result: true
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).not.toHaveBeenCalled();
      });
    });

    describe('condition.group.evaluated', () => {
      it('должен добавлять лог для группы условий с nodeId', () => {
        const event: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: Date.now(),
          nodeId: 'node1',
          conditions: [
            {
              condition: {
                id: 'cond1',
                type: ConditionType.VARIABLE_COMPARISON,
                varId: 'var1',
                value: 'test',
                operator: 'eq',
                valType: 'custom'
              },
              result: true
            },
            {
              condition: {
                id: 'cond2',
                type: ConditionType.PROBABILITY,
                probability: 0.5
              },
              result: false
            }
          ],
          groupOperator: 'AND',
          groupResult: true
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        expect(mockLogPanel.addLog).toHaveBeenCalledWith({
          nodeId: 'node1',
          timestamp: event.timestamp,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: event.conditions[0].condition,
                    result: true,
                    explanation: undefined
                  },
                  {
                    condition: event.conditions[1].condition,
                    result: false,
                    explanation: undefined
                  }
                ],
                result: true,
                explanation: 'Группа условий (AND)'
              }
            ],
            result: true
          }
        });
      });

      it('должен игнорировать группы условий с falsy groupResult', () => {
        const event: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: Date.now(),
          nodeId: 'node1',
          conditions: [
            {
              condition: {
                id: 'cond1',
                type: ConditionType.VARIABLE_COMPARISON,
                varId: 'var1',
                value: 'test',
                operator: 'eq',
                valType: 'custom'
              },
              result: false
            }
          ],
          groupOperator: 'AND',
          groupResult: false
        };

        capturedListener!(event);

        // Теперь должно логироваться даже с false результатом
        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        expect(mockLogPanel.addLog).toHaveBeenCalledWith(
          expect.objectContaining({
            type: PlaybackLogType.ConditionEvaluate,
            entry: expect.objectContaining({
              result: false
            })
          })
        );
      });

      it('должен игнорировать группы условий без nodeId', () => {
        const event: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: Date.now(),
          conditions: [
            {
              condition: {
                id: 'cond1',
                type: ConditionType.VARIABLE_COMPARISON,
                varId: 'var1',
                value: 'test',
                operator: 'eq',
                valType: 'custom'
              },
              result: true
            }
          ],
          groupOperator: 'OR',
          groupResult: true
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).not.toHaveBeenCalled();
      });

      it('должен логировать группы условий даже с undefined groupResult', () => {
        const event: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: Date.now(),
          nodeId: 'node1',
          conditions: [],
          groupOperator: 'AND',
          groupResult: undefined as any
        };

        capturedListener!(event);

        // Теперь должно логироваться даже с undefined результатом
        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        expect(mockLogPanel.addLog).toHaveBeenCalledWith(
          expect.objectContaining({
            type: PlaybackLogType.ConditionEvaluate,
            entry: expect.objectContaining({
              result: undefined
            })
          })
        );
      });

      it('должен корректно логировать условия после выборов', () => {
        // Симулируем последовательность: выбор -> условия -> следующий узел

        // 1. Событие выбора
        const choiceEvent: ChoiceSelectedEvent = {
          type: 'choice.selected',
          timestamp: 1000,
          nodeId: 'narrative-node',
          choice: {
            id: 'choice1',
            text: 'Option A',
            hasNextNode: true
          }
        };

        capturedListener!(choiceEvent);

        // 2. Событие оценки условий (после выбора)
        const conditionEvent: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: 2000,
          nodeId: 'choice1', // ID узла выбора
          edgeId: 'edge-to-target',
          conditions: [
            {
              condition: {
                id: 'cond1',
                type: ConditionType.VARIABLE_COMPARISON,
                varId: 'score',
                value: 100,
                operator: 'gte',
                valType: 'custom'
              },
              result: true
            },
            {
              condition: {
                id: 'cond2',
                type: ConditionType.NODE_HAPPENED,
                nodeId: 'important-node'
              },
              result: true
            }
          ],
          groupOperator: 'AND',
          groupResult: true
        };

        capturedListener!(conditionEvent);

        // Проверяем что оба события добавлены в лог
        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(2);

        // Проверяем лог выбора
        expect(mockLogPanel.addLog).toHaveBeenNthCalledWith(1, {
          nodeId: 'narrative-node',
          nodeName: 'Option A',
          timestamp: 1000,
          type: PlaybackLogType.ChooseChoice,
          entry: 'Option A'
        });

        // Проверяем лог условий
        expect(mockLogPanel.addLog).toHaveBeenNthCalledWith(2, {
          nodeId: 'choice1',
          timestamp: 2000,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: conditionEvent.conditions[0].condition,
                    result: true,
                    explanation: undefined
                  },
                  {
                    condition: conditionEvent.conditions[1].condition,
                    result: true,
                    explanation: undefined
                  }
                ],
                result: true,
                explanation: 'Группа условий (AND)'
              }
            ],
            result: true
          }
        });
      });

      it('должен логировать условия с edgeId для отслеживания связей', () => {
        const event: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: Date.now(),
          nodeId: 'choice-node',
          edgeId: 'edge-123-to-target',
          conditions: [
            {
              condition: {
                id: 'cond1',
                type: ConditionType.PROBABILITY,
                probability: 0.75
              },
              result: true
            }
          ],
          groupOperator: 'OR',
          groupResult: true
        };

        capturedListener!(event);

        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        const logEntry = mockLogPanel.addLog.mock.calls[0][0] as PlaybackLogEntry;

        // Проверяем что nodeId правильно установлен (это важно для связывания с узлами)
        expect(logEntry.nodeId).toBe('choice-node');
        expect(logEntry.type).toBe(PlaybackLogType.ConditionEvaluate);
        expect(logEntry.entry).toEqual({
          conditionGroups: [
            {
              conditions: [
                {
                  condition: event.conditions[0].condition,
                  result: true,
                  explanation: undefined
                }
              ],
              result: true,
              explanation: 'Группа условий (OR)'
            }
          ],
          result: true
        });
      });

      it('должен логировать условия независимо от результата группы', () => {
        // Тест для проверки, что логируются условия с любым результатом
        const failedConditionsEvent: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: Date.now(),
          nodeId: 'choice-node',
          edgeId: 'failed-path',
          conditions: [
            {
              condition: {
                id: 'cond1',
                type: ConditionType.VARIABLE_COMPARISON,
                varId: 'health',
                value: 0,
                operator: 'gt',
                valType: 'custom'
              },
              result: false
            }
          ],
          groupOperator: 'AND',
          groupResult: false
        };

        capturedListener!(failedConditionsEvent);

        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(1);
        const logEntry = mockLogPanel.addLog.mock.calls[0][0] as PlaybackLogEntry;

        expect(logEntry.nodeId).toBe('choice-node');
        expect(logEntry.type).toBe(PlaybackLogType.ConditionEvaluate);
        expect(logEntry.entry).toEqual({
          conditionGroups: [
            {
              conditions: [
                {
                  condition: failedConditionsEvent.conditions[0].condition,
                  result: false,
                  explanation: undefined
                }
              ],
              result: false,
              explanation: 'Группа условий (AND)'
            }
          ],
          result: false
        });
      });

      it('BUG: должен логировать ВСЕ группы условий, а не только успешные', () => {
        // Симулируем ситуацию: проверка условий для двух путей
        // 1. Путь к "pro" - условия не сработали (вероятность подвела)
        const failedGroupEvent: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: Date.now(),
          nodeId: 'node1',
          edgeId: 'link-to-pro',
          conditions: [
            {
              condition: {
                id: 'cond1',
                type: ConditionType.NODE_HAPPENED,
                nodeId: 'someNode'
              },
              result: true
            },
            {
              condition: {
                id: 'cond2',
                type: ConditionType.VARIABLE_COMPARISON,
                varId: 'appleEaten',
                value: false,
                operator: 'eq',
                valType: 'custom'
              },
              result: true
            },
            {
              condition: {
                id: 'cond3',
                type: ConditionType.PROBABILITY,
                probability: 0.5
              },
              result: false // Вероятность не сработала!
            }
          ],
          groupOperator: 'AND',
          groupResult: false // Общий результат false из-за одного условия
        };

        // 2. Проверка условий для альтернативного пути (успешная)
        const successfulGroupEvent: ConditionGroupEvaluatedEvent = {
          type: 'condition.group.evaluated',
          timestamp: Date.now() + 1,
          nodeId: 'node1',
          edgeId: 'link-to-alternative',
          conditions: [
            {
              condition: {
                id: 'cond4',
                type: ConditionType.PROBABILITY,
                probability: 1
              },
              result: true
            }
          ],
          groupOperator: 'AND',
          groupResult: true
        };

        // Отправляем оба события
        capturedListener!(failedGroupEvent);
        capturedListener!(successfulGroupEvent);

        // Теперь должны быть залогированы ОБА события
        expect(mockLogPanel.addLog).toHaveBeenCalledTimes(2);

        // Первое событие - неуспешная проверка
        expect(mockLogPanel.addLog).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            type: PlaybackLogType.ConditionEvaluate,
            entry: expect.objectContaining({
              result: false
            })
          })
        );

        // Второе событие - успешная проверка
        expect(mockLogPanel.addLog).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            type: PlaybackLogType.ConditionEvaluate,
            entry: expect.objectContaining({
              result: true
            })
          })
        );
      });
    });

    describe('navigation.back', () => {
      it('должен откатывать логи до целевого узла', () => {
        const event: NavigationBackEvent = {
          type: 'navigation.back',
          timestamp: Date.now(),
          fromNodeId: 'node3',
          toNodeId: 'node1'
        };

        capturedListener!(event);

        expect(mockLogPanel.rollbackLog).toHaveBeenCalledTimes(1);
        expect(mockLogPanel.rollbackLog).toHaveBeenCalledWith('node1');
      });
    });

    describe('story.restarted', () => {
      it('должен очищать лог', () => {
        const event: StoryRestartedEvent = {
          type: 'story.restarted',
          timestamp: Date.now(),
          startNodeId: 'startNode'
        };

        capturedListener!(event);

        expect(mockLogPanel.clearLog).toHaveBeenCalledTimes(1);
      });
    });

    describe('Неизвестные события', () => {
      it('должен игнорировать неизвестные типы событий', () => {
        const unknownEvent = {
          type: 'unknown.event',
          timestamp: Date.now()
        } as any;

        capturedListener!(unknownEvent);

        expect(mockLogPanel.addLog).not.toHaveBeenCalled();
        expect(mockLogPanel.rollbackLog).not.toHaveBeenCalled();
        expect(mockLogPanel.clearLog).not.toHaveBeenCalled();
      });
    });
  });

  describe('Безопасность', () => {
    it('не должен обрабатывать события после отключения', () => {
      eventLogger.connect(mockEventEmitter, mockLogPanel);
      const listener = capturedListener!;

      eventLogger.disconnect();

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      listener(event);

      expect(mockLogPanel.addLog).not.toHaveBeenCalled();
    });

    it('не должен падать при обработке событий без logPanel', () => {
      eventLogger.connect(mockEventEmitter, mockLogPanel);
      const listener = capturedListener!;

      // Имитируем ситуацию, когда logPanel стал null
      (eventLogger as any).logPanel = null;

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      expect(() => {
        listener(event);
      }).not.toThrow();
    });
  });

  describe('Регрессионные тесты', () => {
    beforeEach(() => {
      eventLogger.connect(mockEventEmitter, mockLogPanel);
    });

    it('должен корректно обрабатывать последовательность различных событий', () => {
      // Node visited
      capturedListener!({
        type: 'node.visited',
        timestamp: 1000,
        nodeId: 'node1',
        nodeName: 'Start Node',
        nodeType: 'narrative'
      });

      // Operation executed
      capturedListener!({
        type: 'operation.executed',
        timestamp: 1001,
        nodeId: 'node1',
        operation: {
          id: 'op1',
          nodeId: 'node1',
          operationType: 'override',
          variableId: 'score',
          enabled: true,
          order: 0,
          resultValue: 10
        }
      });

      // Choice selected
      capturedListener!({
        type: 'choice.selected',
        timestamp: 1002,
        nodeId: 'choice1',
        choice: {
          id: 'c1',
          text: 'Go left',
          hasNextNode: true
        }
      });

      // Navigation back
      capturedListener!({
        type: 'navigation.back',
        timestamp: 1003,
        fromNodeId: 'node2',
        toNodeId: 'node1'
      });

      expect(mockLogPanel.addLog).toHaveBeenCalledTimes(3);
      expect(mockLogPanel.rollbackLog).toHaveBeenCalledTimes(1);
    });

    it('должен корректно обрабатывать операции с различными типами значений', () => {
      // Строковое значение
      capturedListener!({
        type: 'operation.executed',
        timestamp: Date.now(),
        nodeId: 'node1',
        operation: {
          id: 'op1',
          nodeId: 'node1',
          variableId: 'name',
          operationType: 'override',
          enabled: true,
          order: 0,
          target: {type: 'custom', value: 'John Doe'},
          resultValue: 'John Doe'
        }
      });

      // Числовое значение
      capturedListener!({
        type: 'operation.executed',
        timestamp: Date.now(),
        nodeId: 'node1',
        operation: {
          id: 'op2',
          nodeId: 'node1',
          variableId: 'score',
          operationType: 'addition',
          enabled: true,
          order: 1,
          target: {type: 'custom', value: 42},
          resultValue: 42
        }
      });

      // Булево значение
      capturedListener!({
        type: 'operation.executed',
        timestamp: Date.now(),
        nodeId: 'node1',
        operation: {
          id: 'op3',
          nodeId: 'node1',
          variableId: 'isActive',
          operationType: 'override',
          enabled: true,
          order: 2,
          target: {type: 'custom', value: true},
          resultValue: true
        }
      });

      expect(mockLogPanel.addLog).toHaveBeenCalledTimes(3);

      // Проверяем типы значений
      const calls = mockLogPanel.addLog.mock.calls;
      expect((calls[0][0] as PlaybackLogEntry).entry).toMatchObject({
        result: 'John Doe'
      });
      expect((calls[1][0] as PlaybackLogEntry).entry).toMatchObject({
        result: 42
      });
      expect((calls[2][0] as PlaybackLogEntry).entry).toMatchObject({
        result: true
      });
    });
  });

  describe('Тесты для операций с переменными', () => {
    beforeEach(() => {
      eventLogger.connect(mockEventEmitter, mockLogPanel);
    });

    it('должен корректно обрабатывать операцию с переменной как target', () => {
      const event: OperationExecutedEvent = {
        type: 'operation.executed',
        timestamp: Date.now(),
        nodeId: 'test-node',
        operation: {
          id: 'op1',
          nodeId: 'test-node',
          variableId: 'int1',
          operationType: 'addition' as OperationType,
          target: {
            type: 'variable',
            value: 0,
            variableId: 'int2'
          },
          enabled: true,
          order: 0,
          resultValue: 11,
          previousValue: 1
        }
      };

      capturedListener!(event);

      expect(mockLogPanel.addLog).toHaveBeenCalledWith({
        nodeId: 'test-node',
        timestamp: event.timestamp,
        type: PlaybackLogType.OperationExecute,
        entry: {
          operation: {
            id: 'op1',
            type: 'addition',
            parameters: {
              variableId: 'int1',
              value: 0,
              targetType: 'variable',
              targetVariableId: 'int2'
            }
          },
          result: 11,
          isSuccess: true,
          error: undefined
        }
      });
    });

    it('должен корректно обрабатывать операцию с кастомным значением как target', () => {
      const event: OperationExecutedEvent = {
        type: 'operation.executed',
        timestamp: Date.now(),
        nodeId: 'test-node',
        operation: {
          id: 'op2',
          nodeId: 'test-node',
          variableId: 'name',
          operationType: 'join' as OperationType,
          target: {
            type: 'custom',
            value: ' PETER'
          },
          enabled: true,
          order: 0,
          resultValue: 'vasya PETER',
          previousValue: 'vasya'
        }
      };

      capturedListener!(event);

      expect(mockLogPanel.addLog).toHaveBeenCalledWith({
        nodeId: 'test-node',
        timestamp: event.timestamp,
        type: PlaybackLogType.OperationExecute,
        entry: {
          operation: {
            id: 'op2',
            type: 'join',
            parameters: {
              variableId: 'name',
              value: ' PETER',
              targetType: 'custom',
              targetVariableId: undefined
            }
          },
          result: 'vasya PETER',
          isSuccess: true,
          error: undefined
        }
      });
    });

    it('должен корректно обрабатывать операцию присваивания с переменной как target', () => {
      const event: OperationExecutedEvent = {
        type: 'operation.executed',
        timestamp: Date.now(),
        nodeId: 'test-node',
        operation: {
          id: 'op3',
          nodeId: 'test-node',
          variableId: 'name2',
          operationType: 'override' as OperationType,
          target: {
            type: 'variable',
            value: '',
            variableId: 'name'
          },
          enabled: true,
          order: 0,
          resultValue: 'vasya PETER',
          previousValue: 'koluan'
        }
      };

      capturedListener!(event);

      expect(mockLogPanel.addLog).toHaveBeenCalledWith({
        nodeId: 'test-node',
        timestamp: event.timestamp,
        type: PlaybackLogType.OperationExecute,
        entry: {
          operation: {
            id: 'op3',
            type: 'override',
            parameters: {
              variableId: 'name2',
              value: '',
              targetType: 'variable',
              targetVariableId: 'name'
            }
          },
          result: 'vasya PETER',
          isSuccess: true,
          error: undefined
        }
      });
    });
  });
});
