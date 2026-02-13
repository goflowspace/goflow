import { 
  applyOperationsToSnapshot, 
  validateOperation, 
  createEmptySnapshot 
} from '../../../../src/modules/sync/sync.utils';
import { Operation, GraphSnapshot } from '../../../../src/modules/sync/sync.types';

describe('sync.utils', () => {
  describe('applyOperationsToSnapshot', () => {
    let baseSnapshot: GraphSnapshot;

    beforeEach(() => {
      baseSnapshot = {
        timelines: {
          'timeline1': {
            layers: {
              root: {
                id: 'root',
                name: 'Main layer',
                nodes: {
                  'node1': {
                    id: 'node1',
                    type: 'narrative',
                    coordinates: { x: 100, y: 100 },
                    data: { text: 'Hello' }
                  }
                },
                edges: {},
                nodeIds: ['node1']
              }
            },
            metadata: {},
            variables: []
          }
        }
      };
    });

    it('должен применять операцию CREATE_NODE', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_NODE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          nodeId: 'node2',
          type: 'choice',
          position: { x: 200, y: 200 },
          data: { text: 'Choice' }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodes.node2).toEqual({
        id: 'node2',
        type: 'choice',
        coordinates: { x: 200, y: 200 },
        data: { text: 'Choice' }
      });
      expect(result._lastModified).toBeDefined();
    });

    it('должен применять операцию CREATE_NODE и обновлять nodeIds', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_NODE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          nodeId: 'node2',
          type: 'choice',
          position: { x: 200, y: 200 },
          data: { text: 'Choice' }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodeIds).toEqual(['node1', 'node2']);
      expect(result.timelines.timeline1.layers.root.nodes.node2).toBeDefined();
    });

    it('должен предотвращать дублирование nodeIds при повторном добавлении', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'CREATE_NODE',
          timelineId: 'timeline1',
          layerId: 'root',
          payload: {
            nodeId: 'node1', // Уже существующий узел
            type: 'narrative',
            position: { x: 100, y: 100 },
            data: { text: 'Hello' }
          },
          timestamp: Date.now(),
          deviceId: 'device1'
        }
      ];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodeIds).toEqual(['node1']); // Не должно быть дубликата
    });

    it('должен применять операцию node.added (альтернативный формат)', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'node.added',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          nodeId: 'node2',
          type: 'note',
          coordinates: { x: 300, y: 300 },
          data: { content: 'Note' }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodes.node2).toBeDefined();
      expect(result.timelines.timeline1.layers.root.nodes.node2.coordinates).toEqual({ x: 300, y: 300 });
    });

    it('должен применять операцию DELETE_NODE и удалять связанные рёбра', () => {
      // Добавляем ребро
      baseSnapshot.timelines.timeline1.layers.root.edges = {
        'edge1': {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          sourceHandle: 'out',
          targetHandle: 'in'
        }
      };

      const operations: Operation[] = [{
        id: 'op1',
        type: 'DELETE_NODE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          nodeId: 'node1'
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodes.node1).toBeUndefined();
      expect(result.timelines.timeline1.layers.root.edges.edge1).toBeUndefined();
    });

    it('должен применять операцию DELETE_NODE и обновлять nodeIds', () => {
      // Добавляем еще один узел для теста
      baseSnapshot.timelines.timeline1.layers.root.nodes.node2 = {
        id: 'node2',
        type: 'choice',
        coordinates: { x: 200, y: 200 },
        data: { text: 'Choice' }
      };
      baseSnapshot.timelines.timeline1.layers.root.nodeIds = ['node1', 'node2'];

      const operations: Operation[] = [{
        id: 'op1',
        type: 'DELETE_NODE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          nodeId: 'node1'
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodeIds).toEqual(['node2']);
      expect(result.timelines.timeline1.layers.root.nodes.node1).toBeUndefined();
    });

    it('должен применять операцию UPDATE_NODE', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'UPDATE_NODE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          nodeId: 'node1',
          newData: { text: 'Updated text' }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodes.node1.data).toEqual({ text: 'Updated text' });
    });

    it('должен применять операцию MOVE_NODE', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'MOVE_NODE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          nodeId: 'node1',
          newPosition: { x: 500, y: 500 }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodes.node1.coordinates).toEqual({ x: 500, y: 500 });
    });

    it('должен применять операцию CREATE_EDGE', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_EDGE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          edgeId: 'edge1',
          connection: {
            source: 'node1',
            target: 'node2',
            sourceHandle: 'out',
            targetHandle: 'in'
          }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.edges.edge1).toEqual({
        id: 'edge1',
        startNodeId: 'node1',
        endNodeId: 'node2',
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'link',
        conditions: []
      });
    });

    it('должен применять операцию DELETE_EDGE', () => {
      baseSnapshot.timelines.timeline1.layers.root.edges = {
        'edge1': {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          sourceHandle: 'out',
          targetHandle: 'in'
        }
      };

      const operations: Operation[] = [{
        id: 'op1',
        type: 'DELETE_EDGE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          edgeId: 'edge1'
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.edges.edge1).toBeUndefined();
    });

    it('должен применять операцию CREATE_LAYER', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_LAYER',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          layerId: 'layer2',
          name: 'New Layer',
          position: { x: 400, y: 400 }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.layer2).toEqual({
        id: 'layer2',
        name: 'New Layer',
        nodes: {},
        edges: {},
        nodeIds: [],
        type: 'layer',
        parentLayerId: 'root',
        depth: 1
      });
      expect(result.timelines.timeline1.layers.root.nodes.layer2).toEqual({
        id: 'layer2',
        type: 'layer',
        coordinates: { x: 400, y: 400 },
        name: 'New Layer',
        depth: 1,
        parentLayerId: 'root'
      });
    });

    it('должен применять операцию CREATE_LAYER и обновлять nodeIds родительского слоя', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_LAYER',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          layerId: 'layer2',
          name: 'New Layer',
          position: { x: 400, y: 400 }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodeIds).toEqual(['node1', 'layer2']);
      expect(result.timelines.timeline1.layers.layer2.nodeIds).toEqual([]);
    });

    it('должен применять операцию DELETE_LAYER и обновлять nodeIds родительского слоя', () => {
      // Добавляем слой для теста
      baseSnapshot.timelines.timeline1.layers.layer2 = {
        id: 'layer2',
        name: 'Test Layer',
        nodes: {},
        edges: {},
        nodeIds: []
      };
      baseSnapshot.timelines.timeline1.layers.root.nodes.layer2 = {
        id: 'layer2',
        type: 'layer',
        coordinates: { x: 400, y: 400 },
        name: 'Test Layer'
      };
      baseSnapshot.timelines.timeline1.layers.root.nodeIds = ['node1', 'layer2'];

      const operations: Operation[] = [{
        id: 'op1',
        type: 'DELETE_LAYER',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          layerId: 'layer2'
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodeIds).toEqual(['node1']);
      expect(result.timelines.timeline1.layers.layer2).toBeUndefined();
      expect(result.timelines.timeline1.layers.root.nodes.layer2).toBeUndefined();
    });

    it('должен применять операцию UPDATE_VARIABLE', () => {
      baseSnapshot.timelines.timeline1.variables = [{
        id: 'var1',
        name: 'counter',
        value: 0,
        type: 'number'
      }];

      const operations: Operation[] = [{
        id: 'op1',
        type: 'UPDATE_VARIABLE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          variableId: 'var1',
          updates: { value: 10 }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.variables[0].value).toBe(10);
    });

    it('должен применять операцию CREATE_VARIABLE', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_VARIABLE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          variable: {
            id: 'var1',
            name: 'username',
            value: 'John',
            type: 'string'
          }
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.variables).toHaveLength(1);
      expect(result.timelines.timeline1.variables[0]).toEqual({
        id: 'var1',
        name: 'username',
        value: 'John',
        type: 'string'
      });
    });

    it('должен применять операцию DELETE_VARIABLE', () => {
      baseSnapshot.timelines.timeline1.variables = [
        { id: 'var1', name: 'var1', value: 1, type: 'number' },
        { id: 'var2', name: 'var2', value: 2, type: 'number' }
      ];

      const operations: Operation[] = [{
        id: 'op1',
        type: 'DELETE_VARIABLE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          variableId: 'var1'
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.variables).toHaveLength(1);
      expect(result.timelines.timeline1.variables[0].id).toBe('var2');
    });

    it('должен создавать новый таймлайн если его не существует', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_NODE',
        timelineId: 'timeline2',
        layerId: 'root',
        payload: {
          nodeId: 'node1',
          type: 'narrative',
          position: { x: 100, y: 100 },
          data: {}
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline2).toBeDefined();
      expect(result.timelines.timeline2.layers.root).toBeDefined();
      expect(result.timelines.timeline2.layers.root.nodes.node1).toBeDefined();
    });

    it('должен инициализировать nodeIds при создании нового таймлайна', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_NODE',
        timelineId: 'timeline2',
        layerId: 'root',
        payload: {
          nodeId: 'node1',
          type: 'narrative',
          position: { x: 100, y: 100 },
          data: {}
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline2.layers.root.nodeIds).toEqual(['node1']);
    });

    it('должен применять несколько операций последовательно', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'CREATE_NODE',
          timelineId: 'timeline1',
          layerId: 'root',
          payload: {
            nodeId: 'node2',
            type: 'choice',
            position: { x: 200, y: 200 },
            data: {}
          },
          timestamp: Date.now(),
          deviceId: 'device1'
        },
        {
          id: 'op2',
          type: 'CREATE_EDGE',
          timelineId: 'timeline1',
          layerId: 'root',
          payload: {
            edgeId: 'edge1',
            connection: {
              source: 'node1',
              target: 'node2',
              sourceHandle: 'out',
              targetHandle: 'in'
            }
          },
          timestamp: Date.now() + 1,
          deviceId: 'device1'
        },
        {
          id: 'op3',
          type: 'UPDATE_NODE',
          timelineId: 'timeline1',
          layerId: 'root',
          payload: {
            nodeId: 'node2',
            newData: { text: 'Updated choice' }
          },
          timestamp: Date.now() + 2,
          deviceId: 'device1'
        }
      ];

      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(result.timelines.timeline1.layers.root.nodes.node2).toBeDefined();
      expect(result.timelines.timeline1.layers.root.edges.edge1).toBeDefined();
      expect(result.timelines.timeline1.layers.root.nodes.node2.data).toEqual({ text: 'Updated choice' });
    });

    it('должен игнорировать неизвестные типы операций', () => {
      const operations: Operation[] = [{
        id: 'op1',
        type: 'UNKNOWN_OPERATION',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {},
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = applyOperationsToSnapshot(baseSnapshot, operations);

      expect(consoleSpy).toHaveBeenCalledWith('Unknown operation type: UNKNOWN_OPERATION');
      expect(result).toBeDefined();
      consoleSpy.mockRestore();
    });

    it('должен инициализировать nodeIds для существующего слоя без этого поля', () => {
      // Создаем снимок без nodeIds (имитируем старый формат)
      const snapshotWithoutNodeIds: GraphSnapshot = {
        timelines: {
          'timeline1': {
            layers: {
              root: {
                id: 'root',
                name: 'Main layer',
                nodes: {
                  'node1': {
                    id: 'node1',
                    type: 'narrative',
                    coordinates: { x: 100, y: 100 },
                    data: { text: 'Hello' }
                  }
                },
                edges: {}
                // nodeIds отсутствует намеренно
              }
            },
            metadata: {},
            variables: []
          }
        }
      };

      const operations: Operation[] = [{
        id: 'op1',
        type: 'CREATE_NODE',
        timelineId: 'timeline1',
        layerId: 'root',
        payload: {
          nodeId: 'node2',
          type: 'choice',
          position: { x: 200, y: 200 },
          data: {}
        },
        timestamp: Date.now(),
        deviceId: 'device1'
      }];

      const result = applyOperationsToSnapshot(snapshotWithoutNodeIds, operations);

      expect(result.timelines.timeline1.layers.root.nodeIds).toEqual(['node2']);
    });
  });

  describe('validateOperation', () => {
    const validOperation: Operation = {
      id: 'op1',
      type: 'CREATE_NODE',
      timelineId: 'timeline1',
      layerId: 'layer1',
      payload: { nodeId: 'node1' },
      timestamp: Date.now(),
      deviceId: 'device1'
    };

    it('должен возвращать true для валидной операции', () => {
      expect(validateOperation(validOperation)).toBe(true);
    });

    it('должен возвращать false если нет id', () => {
      const operation = { ...validOperation, id: '' };
      expect(validateOperation(operation)).toBe(false);
    });

    it('должен возвращать false если нет type', () => {
      const operation = { ...validOperation, type: '' };
      expect(validateOperation(operation)).toBe(false);
    });

    it('должен возвращать false если нет timelineId', () => {
      const operation = { ...validOperation, timelineId: '' };
      expect(validateOperation(operation)).toBe(false);
    });

    it('должен возвращать false если нет layerId', () => {
      const operation = { ...validOperation, layerId: '' };
      expect(validateOperation(operation)).toBe(false);
    });

    it('должен возвращать false если нет timestamp', () => {
      const operation = { ...validOperation, timestamp: 0 };
      expect(validateOperation(operation)).toBe(false);
    });

    it('должен возвращать false если нет deviceId', () => {
      const operation = { ...validOperation, deviceId: '' };
      expect(validateOperation(operation)).toBe(false);
    });

    it('должен возвращать false если нет payload', () => {
      const operation = { ...validOperation, payload: null as any };
      expect(validateOperation(operation)).toBe(false);
    });

    it('должен возвращать false если payload не объект', () => {
      const operation = { ...validOperation, payload: 'string' as any };
      expect(validateOperation(operation)).toBe(false);
    });
  });

  describe('createEmptySnapshot', () => {
    it('должен создавать пустой снимок с правильной структурой', () => {
      const projectId = 'project123';
      const snapshot = createEmptySnapshot(projectId);

      expect(snapshot.projectId).toBe(projectId);
      expect(snapshot.projectName).toBe('Untitled');
      expect(snapshot._lastModified).toBeDefined();
      expect(snapshot.timelines).toBeDefined();
      expect(snapshot.timelines['base-timeline']).toBeDefined();
      expect(snapshot.timelines['base-timeline'].layers.root).toEqual({
        id: 'root',
        name: 'Main layer',
        nodes: {},
        edges: {},
        nodeIds: []
      });
      expect(snapshot.timelines['base-timeline'].variables).toEqual([]);
      expect(snapshot.timelines['base-timeline'].metadata).toEqual({});
    });

    it('должен устанавливать текущее время в _lastModified', () => {
      const before = Date.now();
      const snapshot = createEmptySnapshot('project1');
      const after = Date.now();

      expect(snapshot._lastModified).toBeGreaterThanOrEqual(before);
      expect(snapshot._lastModified).toBeLessThanOrEqual(after);
    });

    it('должен создавать корневой слой с пустым массивом nodeIds', () => {
      const snapshot = createEmptySnapshot('project1');
      
      expect(snapshot.timelines['base-timeline'].layers.root.nodeIds).toEqual([]);
      expect(Array.isArray(snapshot.timelines['base-timeline'].layers.root.nodeIds)).toBe(true);
    });
  });
}); 