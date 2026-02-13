import {ConditionType, Node} from '../../../../../types/nodes';
import {OperationType, Variable} from '../../../../../types/variables';
import {ConditionGroupResult, OperationResult, PlaybackLogEntry, PlaybackLogType} from '../../../types/logging';
import {convertLogsToV2Format} from '../logAdapter';

describe('logAdapter', () => {
  const mockVariables: Variable[] = [
    {id: 'int1', name: 'int1', type: 'integer', value: 1},
    {id: 'int2', name: 'int2', type: 'integer', value: 10},
    {id: 'name', name: 'name', type: 'string', value: 'vasya'},
    {id: 'name2', name: 'name2', type: 'string', value: 'koluan'}
  ];

  const mockNodes: Node[] = [
    {
      id: 'start-node',
      type: 'narrative',
      coordinates: {x: 0, y: 0},
      data: {title: 'Start', text: 'Starting node'}
    },
    {
      id: 'target-node',
      type: 'narrative',
      coordinates: {x: 100, y: 0},
      data: {title: 'Target', text: 'Target node'}
    },
    {
      id: 'choice-node',
      type: 'choice',
      coordinates: {x: 50, y: 50},
      data: {text: 'Make choice'}
    }
  ];

  describe('условия после выборов', () => {
    it('должен правильно связывать условия с целевым узлом', () => {
      // Создаем последовательность логов: узел -> выбор -> условия -> целевой узел
      const logs: PlaybackLogEntry[] = [
        // 1. Посещение исходного узла
        {
          nodeId: 'start-node',
          nodeName: 'Start',
          timestamp: 1000,
          type: PlaybackLogType.VisitNode,
          entry: null
        },
        // 2. Выбор
        {
          nodeId: 'start-node',
          nodeName: 'Make choice',
          timestamp: 2000,
          type: PlaybackLogType.ChooseChoice,
          entry: 'Make choice'
        },
        // 3. Оценка условий (от узла выбора к целевому узлу)
        {
          nodeId: 'choice-node',
          timestamp: 3000,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: {
                      id: 'cond1',
                      type: ConditionType.VARIABLE_COMPARISON,
                      varId: 'int1',
                      value: 1,
                      operator: 'eq',
                      valType: 'custom'
                    },
                    result: true,
                    explanation: undefined
                  }
                ],
                result: true,
                explanation: 'Группа условий (AND)'
              } as ConditionGroupResult
            ],
            result: true
          }
        },
        // 4. Посещение целевого узла
        {
          nodeId: 'target-node',
          nodeName: 'Target',
          timestamp: 4000,
          type: PlaybackLogType.VisitNode,
          entry: null
        }
      ];

      const result = convertLogsToV2Format(logs, mockVariables, mockNodes);

      // Проверяем что создано 3 записи: start узел, выбор, target узел
      expect(result).toHaveLength(3);

      // Проверяем что start узел не имеет условий
      expect(result[0].type).toBe('narrative');
      const startNarrative = result[0] as any;
      expect(startNarrative.nodeName).toBe('Start');
      expect(startNarrative.conditions).toBeUndefined();

      // Проверяем выбор
      expect(result[1].type).toBe('choice');
      const choice = result[1] as any;
      expect(choice.choiceName).toBe('Make choice');

      // Проверяем что target узел ИМЕЕТ условия
      expect(result[2].type).toBe('narrative');
      const targetNarrative = result[2] as any;
      expect(targetNarrative.nodeName).toBe('Target');
      expect(targetNarrative.conditions).toBeDefined();
      expect(targetNarrative.conditions).toHaveLength(1);

      // Проверяем что условие корректно преобразовано
      const condition = targetNarrative.conditions[0];
      expect(condition.type).toBe(ConditionType.VARIABLE_COMPARISON);
      expect(condition.variableName).toBe('int1');
      expect(condition.value).toBe(1);
      expect(condition.comparator).toBe('=');
    });

    it('должен игнорировать условия с результатом false', () => {
      const logs: PlaybackLogEntry[] = [
        // Посещение узла
        {
          nodeId: 'start-node',
          nodeName: 'Start',
          timestamp: 1000,
          type: PlaybackLogType.VisitNode,
          entry: null
        },
        // Условия с результатом false
        {
          nodeId: 'choice-node',
          timestamp: 2000,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: {
                      id: 'cond1',
                      type: ConditionType.VARIABLE_COMPARISON,
                      varId: 'int1',
                      value: 2,
                      operator: 'eq',
                      valType: 'custom'
                    },
                    result: false,
                    explanation: undefined
                  }
                ],
                result: false,
                explanation: 'Группа условий (AND)'
              } as ConditionGroupResult
            ],
            result: false
          }
        },
        // Целевой узел
        {
          nodeId: 'target-node',
          nodeName: 'Target',
          timestamp: 3000,
          type: PlaybackLogType.VisitNode,
          entry: null
        }
      ];

      const result = convertLogsToV2Format(logs, mockVariables, mockNodes);

      // Целевой узел не должен иметь условий, так как общий результат false
      expect(result).toHaveLength(2);
      const targetNarrative = result[1] as any;
      expect(targetNarrative.nodeName).toBe('Target');
      expect(targetNarrative.conditions).toBeUndefined();
    });

    it('должен обрабатывать множественные условия в группе', () => {
      const logs: PlaybackLogEntry[] = [
        {
          nodeId: 'start-node',
          nodeName: 'Start',
          timestamp: 1000,
          type: PlaybackLogType.VisitNode,
          entry: null
        },
        {
          nodeId: 'choice-node',
          timestamp: 2000,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: {
                      id: 'cond1',
                      type: ConditionType.VARIABLE_COMPARISON,
                      varId: 'int1',
                      value: 1,
                      operator: 'eq',
                      valType: 'custom'
                    },
                    result: true,
                    explanation: undefined
                  },
                  {
                    condition: {
                      id: 'cond2',
                      type: ConditionType.NODE_HAPPENED,
                      nodeId: 'start-node'
                    },
                    result: true,
                    explanation: undefined
                  },
                  {
                    condition: {
                      id: 'cond3',
                      type: ConditionType.PROBABILITY,
                      probability: 0.8
                    },
                    result: true,
                    explanation: undefined
                  }
                ],
                result: true,
                explanation: 'Группа условий (AND)'
              } as ConditionGroupResult
            ],
            result: true
          }
        },
        {
          nodeId: 'target-node',
          nodeName: 'Target',
          timestamp: 3000,
          type: PlaybackLogType.VisitNode,
          entry: null
        }
      ];

      const result = convertLogsToV2Format(logs, mockVariables, mockNodes);

      const targetNarrative = result[1] as any;
      expect(targetNarrative.conditions).toHaveLength(3);

      // Проверяем различные типы условий
      expect(targetNarrative.conditions[0].type).toBe(ConditionType.VARIABLE_COMPARISON);
      expect(targetNarrative.conditions[1].type).toBe(ConditionType.NODE_HAPPENED);
      expect(targetNarrative.conditions[2].type).toBe(ConditionType.PROBABILITY);
    });

    it('должен использовать fallback логику если целевой узел не найден', () => {
      const logs: PlaybackLogEntry[] = [
        {
          nodeId: 'start-node',
          nodeName: 'Start',
          timestamp: 1000,
          type: PlaybackLogType.VisitNode,
          entry: null
        },
        // Условия без последующего узла
        {
          nodeId: 'choice-node',
          timestamp: 2000,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: {
                      id: 'cond1',
                      type: ConditionType.VARIABLE_COMPARISON,
                      varId: 'int1',
                      value: 1,
                      operator: 'eq',
                      valType: 'custom'
                    },
                    result: true,
                    explanation: undefined
                  }
                ],
                result: true,
                explanation: 'Группа условий (AND)'
              } as ConditionGroupResult
            ],
            result: true
          }
        }
        // Нет последующего узла!
      ];

      const result = convertLogsToV2Format(logs, mockVariables, mockNodes);

      // Должен быть только start узел, условия должны быть сохранены для choice-node (fallback)
      expect(result).toHaveLength(1);
      const startNarrative = result[0] as any;
      expect(startNarrative.nodeName).toBe('Start');
      // В этом случае условия не должны отображаться, так как нет целевого узла
      expect(startNarrative.conditions).toBeUndefined();
    });
  });

  describe('интеграционные тесты', () => {
    it('должен корректно обрабатывать полный цикл: выбор -> условия -> узел', () => {
      // Симулируем реальную последовательность событий из движка
      const logs: PlaybackLogEntry[] = [
        // 1. Начальный нарративный узел
        {
          nodeId: 'story-start',
          nodeName: 'История начинается',
          timestamp: 1000,
          type: PlaybackLogType.VisitNode,
          entry: null
        },
        // 2. Пользователь делает выбор
        {
          nodeId: 'story-start',
          nodeName: 'Пойти направо',
          timestamp: 2000,
          type: PlaybackLogType.ChooseChoice,
          entry: 'Пойти направо'
        },
        // 3. Движок проверяет условия на связи от выбора к следующему узлу
        {
          nodeId: 'choice-go-right',
          timestamp: 3000,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: {
                      id: 'has-key',
                      type: ConditionType.VARIABLE_COMPARISON,
                      varId: 'hasKey',
                      value: true,
                      operator: 'eq',
                      valType: 'custom'
                    },
                    result: true,
                    explanation: undefined
                  },
                  {
                    condition: {
                      id: 'visited-shop',
                      type: ConditionType.NODE_HAPPENED,
                      nodeId: 'shop-visited'
                    },
                    result: true,
                    explanation: undefined
                  }
                ],
                result: true,
                explanation: 'Группа условий (AND)'
              } as ConditionGroupResult
            ],
            result: true
          }
        },
        // 4. Операция в следующем узле (до его посещения)
        {
          nodeId: 'secret-room',
          timestamp: 4000,
          type: PlaybackLogType.OperationExecute,
          entry: {
            operation: {
              id: 'op-unlock',
              type: 'override' as OperationType,
              parameters: {
                variableId: 'hasKey',
                value: false,
                targetType: 'custom'
              }
            },
            result: false,
            isSuccess: true
          } as OperationResult
        },
        // 5. Посещение нового узла
        {
          nodeId: 'secret-room',
          nodeName: 'Секретная комната',
          timestamp: 5000,
          type: PlaybackLogType.VisitNode,
          entry: null
        }
      ];

      const result = convertLogsToV2Format(logs, mockVariables, mockNodes);

      // Должно быть 3 записи: начальный узел, выбор, секретная комната
      expect(result).toHaveLength(3);

      // 1. Проверяем начальный узел
      expect(result[0].type).toBe('narrative');
      const startNode = result[0] as any;
      expect(startNode.nodeName).toBe('История начинается');
      expect(startNode.conditions).toBeUndefined();
      expect(startNode.operations).toHaveLength(0);

      // 2. Проверяем выбор
      expect(result[1].type).toBe('choice');
      const choice = result[1] as any;
      expect(choice.choiceName).toBe('Пойти направо');

      // 3. Проверяем секретную комнату - должна иметь И условия И операции
      expect(result[2].type).toBe('narrative');
      const secretRoom = result[2] as any;
      expect(secretRoom.nodeName).toBe('Секретная комната');

      // Проверяем условия (должны быть связаны с этим узлом)
      expect(secretRoom.conditions).toBeDefined();
      expect(secretRoom.conditions).toHaveLength(2);
      expect(secretRoom.conditions[0].type).toBe(ConditionType.VARIABLE_COMPARISON);
      expect(secretRoom.conditions[0].variableName).toBe('hasKey');
      expect(secretRoom.conditions[1].type).toBe(ConditionType.NODE_HAPPENED);

      // Проверяем операции
      expect(secretRoom.operations).toBeDefined();
      expect(secretRoom.operations).toHaveLength(1);
      expect(secretRoom.operations[0].variableName).toBe('hasKey');
      expect(secretRoom.operations[0].operator).toBe('override');
      expect(secretRoom.operations[0].value).toBe(false);
    });

    it('должен корректно обрабатывать множественные выборы с условиями', () => {
      const logs: PlaybackLogEntry[] = [
        // Начальный узел
        {
          nodeId: 'crossroads',
          nodeName: 'Перекресток',
          timestamp: 1000,
          type: PlaybackLogType.VisitNode,
          entry: null
        },
        // Первый выбор
        {
          nodeId: 'crossroads',
          nodeName: 'Выбрать левый путь',
          timestamp: 2000,
          type: PlaybackLogType.ChooseChoice,
          entry: 'Выбрать левый путь'
        },
        // Условия для первого выбора
        {
          nodeId: 'choice-left',
          timestamp: 3000,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: {
                      id: 'brave-enough',
                      type: ConditionType.VARIABLE_COMPARISON,
                      varId: 'courage',
                      value: 5,
                      operator: 'gte',
                      valType: 'custom'
                    },
                    result: true,
                    explanation: undefined
                  }
                ],
                result: true,
                explanation: 'Группа условий (AND)'
              } as ConditionGroupResult
            ],
            result: true
          }
        },
        // Промежуточный узел
        {
          nodeId: 'dark-forest',
          nodeName: 'Темный лес',
          timestamp: 4000,
          type: PlaybackLogType.VisitNode,
          entry: null
        },
        // Второй выбор
        {
          nodeId: 'dark-forest',
          nodeName: 'Использовать факел',
          timestamp: 5000,
          type: PlaybackLogType.ChooseChoice,
          entry: 'Использовать факел'
        },
        // Условия для второго выбора
        {
          nodeId: 'choice-torch',
          timestamp: 6000,
          type: PlaybackLogType.ConditionEvaluate,
          entry: {
            conditionGroups: [
              {
                conditions: [
                  {
                    condition: {
                      id: 'has-torch',
                      type: ConditionType.VARIABLE_COMPARISON,
                      varId: 'inventory',
                      value: 'torch',
                      operator: 'eq',
                      valType: 'custom'
                    },
                    result: true,
                    explanation: undefined
                  }
                ],
                result: true,
                explanation: 'Группа условий (OR)'
              } as ConditionGroupResult
            ],
            result: true
          }
        },
        // Финальный узел
        {
          nodeId: 'lit-clearing',
          nodeName: 'Освещенная поляна',
          timestamp: 7000,
          type: PlaybackLogType.VisitNode,
          entry: null
        }
      ];

      const result = convertLogsToV2Format(logs, mockVariables, mockNodes);

      // Должно быть 5 записей: узел -> выбор -> узел -> выбор -> узел
      expect(result).toHaveLength(5);

      // Проверяем что условия правильно связаны с целевыми узлами
      const darkForest = result[2] as any;
      expect(darkForest.nodeName).toBe('Темный лес');
      expect(darkForest.conditions).toHaveLength(1);
      expect(darkForest.conditions[0].variableName).toBe('courage');

      const litClearing = result[4] as any;
      expect(litClearing.nodeName).toBe('Освещенная поляна');
      expect(litClearing.conditions).toHaveLength(1);
      expect(litClearing.conditions[0].variableName).toBe('inventory');
    });
  });

  // Существующие тесты...
  it('should correctly display operation with variable target', () => {
    // Создаем лог операции с переменной как target
    const operationLog: PlaybackLogEntry = {
      nodeId: 'test-node',
      nodeName: 'Test Node',
      timestamp: Date.now(),
      type: PlaybackLogType.OperationExecute,
      entry: {
        operation: {
          id: 'op1',
          type: 'addition' as OperationType,
          parameters: {
            variableId: 'int1',
            value: 0,
            targetType: 'variable',
            targetVariableId: 'int2'
          }
        },
        result: 11,
        isSuccess: true
      } as OperationResult
    };

    // Создаем лог посещения узла
    const visitLog: PlaybackLogEntry = {
      nodeId: 'test-node',
      nodeName: 'Test Node',
      timestamp: Date.now(),
      type: PlaybackLogType.VisitNode,
      entry: null
    };

    const logs = [visitLog, operationLog];
    const result = convertLogsToV2Format(logs, mockVariables);

    // Проверяем, что операция отображается корректно
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('narrative');

    const narrative = result[0] as any;
    expect(narrative.operations).toHaveLength(1);

    const operation = narrative.operations[0];
    expect(operation.variableName).toBe('int1');
    expect(operation.operator).toBe('addition');
    expect(operation.value).toBe('int2'); // Должно показывать название переменной
    expect(operation.isVariableValue).toBe(true); // Это имя переменной
    expect(operation.result).toBe(11);
  });

  it('should correctly display operation with custom value target', () => {
    // Создаем лог операции с кастомным значением как target
    const operationLog: PlaybackLogEntry = {
      nodeId: 'test-node',
      nodeName: 'Test Node',
      timestamp: Date.now(),
      type: PlaybackLogType.OperationExecute,
      entry: {
        operation: {
          id: 'op2',
          type: 'addition' as OperationType,
          parameters: {
            variableId: 'int1',
            value: 5,
            targetType: 'custom'
          }
        },
        result: 6,
        isSuccess: true
      } as OperationResult
    };

    // Создаем лог посещения узла
    const visitLog: PlaybackLogEntry = {
      nodeId: 'test-node',
      nodeName: 'Test Node',
      timestamp: Date.now(),
      type: PlaybackLogType.VisitNode,
      entry: null
    };

    const logs = [visitLog, operationLog];
    const result = convertLogsToV2Format(logs, mockVariables);

    // Проверяем, что операция отображается корректно
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('narrative');

    const narrative = result[0] as any;
    expect(narrative.operations).toHaveLength(1);

    const operation = narrative.operations[0];
    expect(operation.variableName).toBe('int1');
    expect(operation.operator).toBe('addition');
    expect(operation.value).toBe(5); // Должно показывать кастомное значение
    expect(operation.isVariableValue).toBe(false); // Это кастомное значение
    expect(operation.result).toBe(6);
  });

  it('should correctly display string join operation with custom value', () => {
    // Создаем лог операции объединения строк
    const operationLog: PlaybackLogEntry = {
      nodeId: 'test-node',
      nodeName: 'Test Node',
      timestamp: Date.now(),
      type: PlaybackLogType.OperationExecute,
      entry: {
        operation: {
          id: 'op3',
          type: 'join' as OperationType,
          parameters: {
            variableId: 'name',
            value: ' PETER',
            targetType: 'custom'
          }
        },
        result: 'vasya PETER',
        isSuccess: true
      } as OperationResult
    };

    // Создаем лог посещения узла
    const visitLog: PlaybackLogEntry = {
      nodeId: 'test-node',
      nodeName: 'Test Node',
      timestamp: Date.now(),
      type: PlaybackLogType.VisitNode,
      entry: null
    };

    const logs = [visitLog, operationLog];
    const result = convertLogsToV2Format(logs, mockVariables);

    // Проверяем, что операция отображается корректно
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('narrative');

    const narrative = result[0] as any;
    expect(narrative.operations).toHaveLength(1);

    const operation = narrative.operations[0];
    expect(operation.variableName).toBe('name');
    expect(operation.operator).toBe('join');
    expect(operation.value).toBe(' PETER');
    expect(operation.isVariableValue).toBe(false); // Это кастомное значение
    expect(operation.result).toBe('vasya PETER');
  });

  it('should correctly display variable assignment operation', () => {
    // Создаем лог операции присваивания переменной
    const operationLog: PlaybackLogEntry = {
      nodeId: 'test-node',
      nodeName: 'Test Node',
      timestamp: Date.now(),
      type: PlaybackLogType.OperationExecute,
      entry: {
        operation: {
          id: 'op4',
          type: 'override' as OperationType,
          parameters: {
            variableId: 'name2',
            value: '',
            targetType: 'variable',
            targetVariableId: 'name'
          }
        },
        result: 'vasya PETER',
        isSuccess: true
      } as OperationResult
    };

    // Создаем лог посещения узла
    const visitLog: PlaybackLogEntry = {
      nodeId: 'test-node',
      nodeName: 'Test Node',
      timestamp: Date.now(),
      type: PlaybackLogType.VisitNode,
      entry: null
    };

    const logs = [visitLog, operationLog];
    const result = convertLogsToV2Format(logs, mockVariables);

    // Проверяем, что операция отображается корректно
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('narrative');

    const narrative = result[0] as any;
    expect(narrative.operations).toHaveLength(1);

    const operation = narrative.operations[0];
    expect(operation.variableName).toBe('name2');
    expect(operation.operator).toBe('override');
    expect(operation.value).toBe('name'); // Должно показывать название переменной
    expect(operation.isVariableValue).toBe(true); // Это имя переменной
    expect(operation.result).toBe('vasya PETER');
  });
});
