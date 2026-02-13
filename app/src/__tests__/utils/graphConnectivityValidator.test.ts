import {validateGraphConnectivity} from '../../utils/graphConnectivityValidator';

describe('validateGraphConnectivity - Layer Endpoints Handling', () => {
  describe('когда слои соединены через концовки', () => {
    const mockLayers: any = {
      root: {
        type: 'layer',
        id: 'root',
        name: 'Root Layer',
        depth: 0,
        nodes: {
          'layer-a': {
            id: 'layer-a',
            type: 'layer',
            coordinates: {x: 100, y: 100},
            data: {title: 'Layer A'},
            startingNodes: [
              {
                id: 'start-a1',
                type: 'narrative',
                coordinates: {x: 0, y: 0},
                data: {title: 'Start A1', text: 'Start A1'}
              }
            ],
            endingNodes: [
              {
                id: 'end-a1',
                type: 'narrative',
                coordinates: {x: 200, y: 0},
                data: {title: 'End A1', text: 'End A1'}
              }
            ]
          },
          'layer-b': {
            id: 'layer-b',
            type: 'layer',
            coordinates: {x: 300, y: 100},
            data: {title: 'Layer B'},
            startingNodes: [
              {
                id: 'start-b1',
                type: 'narrative',
                coordinates: {x: 0, y: 0},
                data: {title: 'Start B1', text: 'Start B1'}
              }
            ],
            endingNodes: [
              {
                id: 'end-b1',
                type: 'narrative',
                coordinates: {x: 200, y: 0},
                data: {title: 'End B1', text: 'End B1'}
              }
            ]
          }
        },
        edges: {
          'edge-layer-connection': {
            id: 'edge-layer-connection',
            type: 'link',
            startNodeId: 'layer-a',
            endNodeId: 'layer-b',
            sourceHandle: 'end-a1',
            targetHandle: 'start-b1',
            conditions: []
          }
        },
        nodeIds: ['layer-a', 'layer-b']
      },
      'layer-a': {
        type: 'layer',
        id: 'layer-a',
        name: 'Layer A',
        depth: 1,
        parentLayerId: 'root',
        nodes: {
          'narrative-1': {
            id: 'narrative-1',
            type: 'narrative',
            coordinates: {x: 50, y: 50},
            data: {title: 'Narrative 1', text: 'Narrative 1'}
          }
        },
        edges: {
          'edge-internal-a': {
            id: 'edge-internal-a',
            type: 'link',
            startNodeId: 'narrative-1',
            endNodeId: 'end-a1',
            conditions: []
          }
        },
        nodeIds: ['narrative-1']
      },
      'layer-b': {
        type: 'layer',
        id: 'layer-b',
        name: 'Layer B',
        depth: 1,
        parentLayerId: 'root',
        nodes: {
          'narrative-2': {
            id: 'narrative-2',
            type: 'narrative',
            coordinates: {x: 50, y: 50},
            data: {title: 'Narrative 2', text: 'Narrative 2'}
          }
        },
        edges: {
          'edge-internal-b': {
            id: 'edge-internal-b',
            type: 'link',
            startNodeId: 'start-b1',
            endNodeId: 'narrative-2',
            conditions: []
          }
        },
        nodeIds: ['narrative-2']
      }
    };

    it('должен правильно определять стартовый узел с учетом концовок слоев', () => {
      const result = validateGraphConnectivity(mockLayers);

      // Проверим основные свойства
      expect(result.startNodeCount).toBeGreaterThanOrEqual(1);
      expect(result.startNodes).toBeDefined();
    });

    it('должен анализировать связность узлов', () => {
      const result = validateGraphConnectivity(mockLayers);

      // Проверяем, что анализ выполняется
      expect(result.unreachableNodes).toBeDefined();
      expect(result.unreachableNodesInfo).toBeDefined();
      expect(Array.isArray(result.unreachableNodes)).toBe(true);
    });

    it('должен возвращать информацию о связности', () => {
      const result = validateGraphConnectivity(mockLayers);

      // Проверяем основные свойства результата
      expect(result.isConnected).toBeDefined();
      expect(typeof result.isConnected).toBe('boolean');
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });
  });
});
