import {ChoiceNode, Edge, NarrativeNode, Node} from '../../../../types/nodes';
import {OperationTargetType, OperationType, Variable, VariableOperation} from '../../../../types/variables';
import {GameState} from '../../core/GameState';
import {StoryData} from '../../core/StoryData';
import {OperationsService} from '../OperationsService';

describe('OperationsService', () => {
  let service: OperationsService;
  let gameState: GameState;
  let storyData: StoryData;
  let mockNode: NarrativeNode;
  let mockChoiceNode: ChoiceNode;

  beforeEach(() => {
    service = new OperationsService();

    // Подготавливаем тестовые данные
    const variables: Variable[] = [
      {id: 'num1', name: 'Number 1', type: 'integer', value: 10},
      {id: 'num2', name: 'Number 2', type: 'integer', value: 5},
      {id: 'float1', name: 'Float 1', type: 'float', value: 10.5},
      {id: 'float2', name: 'Float 2', type: 'float', value: 5.5},
      {id: 'text1', name: 'Text 1', type: 'string', value: 'Hello'},
      {id: 'text2', name: 'Text 2', type: 'string', value: ' World'},
      {id: 'bool1', name: 'Bool 1', type: 'boolean', value: true},
      {id: 'percent1', name: 'Percent 1', type: 'percent', value: 0.5}
    ];

    // Инициализируем gameState с полными объектами Variable
    gameState = {
      variables: {},
      visitedNodes: new Set<string>(),
      history: [],
      displayHistory: [],
      executedOperations: [],
      triggeredConditions: []
    };

    // Заполняем gameState.variables полными объектами Variable
    variables.forEach((variable) => {
      gameState.variables[variable.id] = {...variable};
    });

    storyData = {
      title: 'Test Story',
      data: {
        variables,
        nodes: [] as Node[],
        edges: [] as Edge[]
      }
    };

    mockNode = {
      id: 'test-node',
      type: 'narrative',
      coordinates: {x: 0, y: 0},
      data: {
        title: 'Test Node',
        text: 'Test Node'
      },
      operations: []
    };

    mockChoiceNode = {
      id: 'choice-node',
      type: 'choice',
      coordinates: {x: 100, y: 0},
      data: {
        text: 'Choice Node',
        height: 40
      },
      operations: []
    };
  });

  it('should skip nodes without operations', () => {
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables).toEqual(gameState.variables);
  });

  it('should skip disabled operations', () => {
    const operation: VariableOperation = {
      id: 'op1',
      nodeId: 'test-node',
      variableId: 'num1',
      operationType: 'addition',
      target: {type: 'custom', value: 5},
      enabled: false,
      order: 0
    };

    mockNode.operations = [operation];
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables['num1'].value).toBe(10);
  });

  it('should handle integer operations correctly', () => {
    const operations: VariableOperation[] = [
      {
        id: 'op1',
        nodeId: 'test-node',
        variableId: 'num1',
        operationType: 'addition',
        target: {type: 'custom', value: 5},
        enabled: true,
        order: 0
      },
      {
        id: 'op2',
        nodeId: 'test-node',
        variableId: 'num2',
        operationType: 'multiply',
        target: {type: 'custom', value: 2},
        enabled: true,
        order: 1
      }
    ];

    mockNode.operations = operations;
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables['num1'].value).toBe(15); // 10 + 5 = 15
    expect(gameState.variables['num2'].value).toBe(10); // 5 * 2 = 10
  });

  it('should handle float operations correctly', () => {
    const operations: VariableOperation[] = [
      {
        id: 'op1',
        nodeId: 'test-node',
        variableId: 'float1',
        operationType: 'addition',
        target: {type: 'custom', value: 1.5},
        enabled: true,
        order: 0
      },
      {
        id: 'op2',
        nodeId: 'test-node',
        variableId: 'float2',
        operationType: 'multiply',
        target: {type: 'custom', value: 2},
        enabled: true,
        order: 1
      }
    ];

    mockNode.operations = operations;
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables['float1'].value).toBe(12); // 10.5 + 1.5 = 12
    expect(gameState.variables['float2'].value).toBe(11); // 5.5 * 2 = 11
  });

  it('should handle string operations correctly', () => {
    const operation: VariableOperation = {
      id: 'op1',
      nodeId: 'test-node',
      variableId: 'text1',
      operationType: 'join',
      target: {type: 'custom', value: ' World'},
      enabled: true,
      order: 0
    };

    mockNode.operations = [operation];
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables['text1'].value).toBe('Hello World');
  });

  it('should handle boolean operations correctly', () => {
    const operation: VariableOperation = {
      id: 'op1',
      nodeId: 'test-node',
      variableId: 'bool1',
      operationType: 'invert',
      enabled: true,
      order: 0
    };

    mockNode.operations = [operation];
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables['bool1'].value).toBe(false);
  });

  it('should handle percent operations correctly', () => {
    const operation: VariableOperation = {
      id: 'op1',
      nodeId: 'test-node',
      variableId: 'percent1',
      operationType: 'multiply',
      target: {type: 'custom', value: 2},
      enabled: true,
      order: 0
    };

    mockNode.operations = [operation];
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables['percent1'].value).toBe(1); // 0.5 * 2 = 1
  });

  it('should handle division by zero', () => {
    const operation: VariableOperation = {
      id: 'op1',
      nodeId: 'test-node',
      variableId: 'num1',
      operationType: 'divide',
      target: {type: 'custom', value: 0},
      enabled: true,
      order: 0
    };

    mockNode.operations = [operation];
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables['num1'].value).toBe(10); // Значение не должно измениться
  });

  it('should not execute operations for choice nodes', () => {
    // Создаем операцию для узла выбора
    const operation: VariableOperation = {
      id: 'op-choice',
      nodeId: 'choice-node',
      variableId: 'num1',
      operationType: 'addition',
      target: {type: 'custom', value: 5},
      enabled: true,
      order: 0
    };

    // Добавляем операцию к узлу выбора
    mockChoiceNode.operations = [operation];

    // Запоминаем начальные значения
    const initialValue = gameState.variables['num1'].value;
    const initialOperationsCount = gameState.executedOperations.length;

    // Выполняем операцию
    service.executeOperations(mockChoiceNode, gameState, storyData);

    // Проверяем, что значение не изменилось
    expect(gameState.variables['num1'].value).toBe(initialValue);

    // Проверяем, что в список выполненных операций ничего не добавлено
    expect(gameState.executedOperations.length).toBe(initialOperationsCount);
  });

  it('should handle variable operations correctly', () => {
    const operations: VariableOperation[] = [
      {
        id: 'op1',
        nodeId: 'test-node',
        variableId: 'num1',
        operationType: 'addition',
        target: {type: 'variable', value: 0, variableId: 'num2'},
        enabled: true,
        order: 0
      },
      {
        id: 'op2',
        nodeId: 'test-node',
        variableId: 'text2',
        operationType: 'override',
        target: {type: 'variable', value: '', variableId: 'text1'},
        enabled: true,
        order: 1
      }
    ];

    mockNode.operations = operations;
    service.executeOperations(mockNode, gameState, storyData);
    expect(gameState.variables['num1'].value).toBe(15); // 10 + 5 = 15
    expect(gameState.variables['text2'].value).toBe('Hello'); // text2 = text1
  });

  it('should handle user reported scenario correctly', () => {
    // Настраиваем переменные как в примере пользователя
    const testVariables: Variable[] = [
      {id: 'int1', name: 'int1', type: 'integer', value: 1},
      {id: 'int2', name: 'int2', type: 'integer', value: 10},
      {id: 'name', name: 'name', type: 'string', value: 'vasya'},
      {id: 'name2', name: 'name2', type: 'string', value: 'koluan'}
    ];

    // Обновляем gameState
    testVariables.forEach((variable) => {
      gameState.variables[variable.id] = {...variable};
    });

    // Создаем операции как в примере пользователя
    const operations: VariableOperation[] = [
      {
        id: 'op1',
        nodeId: 'test-node',
        variableId: 'int1',
        operationType: 'addition',
        target: {type: 'variable', value: 0, variableId: 'int2'}, // int1 + int2
        enabled: true,
        order: 0
      },
      {
        id: 'op2',
        nodeId: 'test-node',
        variableId: 'int2',
        operationType: 'override',
        target: {type: 'custom', value: 20}, // int2 = 20
        enabled: true,
        order: 1
      },
      {
        id: 'op3',
        nodeId: 'test-node',
        variableId: 'name',
        operationType: 'join',
        target: {type: 'custom', value: ' PETER'}, // name + " PETER"
        enabled: true,
        order: 2
      },
      {
        id: 'op4',
        nodeId: 'test-node',
        variableId: 'name2',
        operationType: 'override',
        target: {type: 'variable', value: '', variableId: 'name'}, // name2 = name
        enabled: true,
        order: 3
      }
    ];

    mockNode.operations = operations;
    service.executeOperations(mockNode, gameState, storyData);

    // Проверяем результаты
    expect(gameState.variables['int1'].value).toBe(11); // 1 + 10 = 11
    expect(gameState.variables['int2'].value).toBe(20); // int2 = 20
    expect(gameState.variables['name'].value).toBe('vasya PETER'); // name + " PETER"
    expect(gameState.variables['name2'].value).toBe('vasya PETER'); // name2 = name (уже обновленное)
  });

  it('should handle override operation and rollback correctly', () => {
    const operation: VariableOperation = {
      id: 'op1',
      nodeId: 'test-node',
      variableId: 'num1',
      operationType: 'override',
      target: {type: 'custom', value: 42},
      enabled: true,
      order: 0
    };

    // Запоминаем начальное значение
    const initialValue = gameState.variables['num1'].value; // 10

    mockNode.operations = [operation];

    // Выполняем операцию override
    service.executeOperations(mockNode, gameState, storyData);

    // Проверяем, что значение изменилось
    expect(gameState.variables['num1'].value).toBe(42);

    // Проверяем, что операция была записана с предыдущим значением
    expect(gameState.executedOperations).toHaveLength(1);
    expect(gameState.executedOperations[0].previousValue).toBe(initialValue);
    expect(gameState.executedOperations[0].operationType).toBe('override');

    // Откатываем операцию
    service.rollbackNodeOperations('test-node', gameState);

    // Проверяем, что значение восстановилось
    expect(gameState.variables['num1'].value).toBe(initialValue);

    // Проверяем, что операция была удалена из истории
    expect(gameState.executedOperations).toHaveLength(0);
  });
});
