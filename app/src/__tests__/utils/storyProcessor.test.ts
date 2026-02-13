import {StoryData} from '../../playback/engine/core/StoryData';
import {StoryProcessor} from '../../services/exporters/implementations/StoryProcessor';

describe('StoryProcessor - Layer Endpoints Handling', () => {
  let storyProcessor: StoryProcessor;

  beforeEach(() => {
    storyProcessor = new StoryProcessor();
  });

  describe('flattenLayers с концовками слоев', () => {
    const mockStoryData: StoryData = {
      title: 'Test Story',
      data: {
        timelines: {
          'base-timeline': {
            variables: [],
            lastLayerNumber: 2,
            metadata: {},
            layers: {
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
                  } as any,
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
                  } as any
                },
                edges: {
                  'edge-layer-to-layer': {
                    id: 'edge-layer-to-layer',
                    type: 'link',
                    startNodeId: 'layer-a',
                    endNodeId: 'layer-b',
                    sourceHandle: 'end-a1',
                    targetHandle: 'start-b1',
                    conditions: []
                  }
                },
                nodeIds: ['layer-a', 'layer-b']
              } as any,
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
                  'edge-to-ending': {
                    id: 'edge-to-ending',
                    type: 'link',
                    startNodeId: 'narrative-1',
                    endNodeId: 'end-a1',
                    conditions: []
                  }
                },
                nodeIds: ['narrative-1']
              } as any,
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
                  'edge-from-starting': {
                    id: 'edge-from-starting',
                    type: 'link',
                    startNodeId: 'start-b1',
                    endNodeId: 'narrative-2',
                    conditions: []
                  }
                },
                nodeIds: ['narrative-2']
              } as any
            }
          }
        }
      } as any,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    it('должен собирать обычные узлы из слоев', () => {
      const result = storyProcessor.flattenLayers(mockStoryData);

      // Проверяем, что обычные узлы включены
      const narrative1 = result.nodes.find((n) => n.id === 'narrative-1');
      const narrative2 = result.nodes.find((n) => n.id === 'narrative-2');

      expect(narrative1).toBeDefined();
      expect(narrative2).toBeDefined();
    });

    it('должен собирать связи из всех слоев', () => {
      const result = storyProcessor.flattenLayers(mockStoryData);

      // Проверяем, что связи включены
      expect(result.edges.length).toBeGreaterThan(0);

      // Ищем внутренние связи слоев
      const internalEdge1 = result.edges.find((e) => e.id === 'edge-to-ending');
      const internalEdge2 = result.edges.find((e) => e.id === 'edge-from-starting');

      expect(internalEdge1).toBeDefined();
      expect(internalEdge2).toBeDefined();
    });

    it('должен включать обычные узлы из вложенных слоев', () => {
      const result = storyProcessor.flattenLayers(mockStoryData);

      const narrative1 = result.nodes.find((n) => n.id === 'narrative-1');
      const narrative2 = result.nodes.find((n) => n.id === 'narrative-2');

      expect(narrative1).toBeDefined();
      expect(narrative2).toBeDefined();
    });

    it('должен правильно определять стартовый узел', () => {
      const result = storyProcessor.flattenLayers(mockStoryData);

      // Стартовый узел должен быть найден корректно
      expect(result.startNodeId).toBeDefined();

      const startNode = result.nodes.find((n) => n.id === result.startNodeId);
      expect(startNode).toBeDefined();
    });
  });

  describe('validateStory с концовками слоев', () => {
    it('не должен находить недостижимые узлы при правильном соединении концовок', () => {
      const mockExportableStory: any = {
        title: 'Test Story',
        nodes: [
          {
            id: 'start-a1',
            type: 'narrative',
            coordinates: {x: 0, y: 0},
            data: {title: 'Start A1', text: 'Start A1', layerInfo: {isLayerEndpoint: true}}
          },
          {
            id: 'end-a1',
            type: 'narrative',
            coordinates: {x: 200, y: 0},
            data: {title: 'End A1', text: 'End A1', layerInfo: {isLayerEndpoint: true}}
          },
          {
            id: 'start-b1',
            type: 'narrative',
            coordinates: {x: 300, y: 0},
            data: {title: 'Start B1', text: 'Start B1', layerInfo: {isLayerEndpoint: true}}
          },
          {
            id: 'narrative-1',
            type: 'narrative',
            coordinates: {x: 100, y: 100},
            data: {title: 'Narrative 1', text: 'Narrative 1'}
          },
          {
            id: 'narrative-2',
            type: 'narrative',
            coordinates: {x: 400, y: 100},
            data: {title: 'Narrative 2', text: 'Narrative 2'}
          }
        ],
        edges: [
          {
            id: 'edge-1',
            startNodeId: 'start-a1',
            endNodeId: 'narrative-1'
          },
          {
            id: 'edge-2',
            startNodeId: 'narrative-1',
            endNodeId: 'end-a1'
          },
          {
            id: 'edge-3',
            startNodeId: 'end-a1',
            endNodeId: 'start-b1'
          },
          {
            id: 'edge-4',
            startNodeId: 'start-b1',
            endNodeId: 'narrative-2'
          }
        ],
        variables: [],
        startNodeId: 'start-a1',
        metadata: {}
      };

      const errors = storyProcessor.validateStory(mockExportableStory);

      // Не должно быть ошибок о недостижимых узлах
      const unreachableError = errors.find((error) => error.includes('недостижимые узлы') || error.includes('unreachable'));
      expect(unreachableError).toBeUndefined();
    });

    it('должен находить недостижимые узлы при неправильном соединении', () => {
      const mockExportableStoryWithUnreachable: any = {
        title: 'Test Story',
        nodes: [
          {
            id: 'start-node',
            type: 'narrative',
            coordinates: {x: 0, y: 0},
            data: {title: 'Start', text: 'Start'}
          },
          {
            id: 'connected-node',
            type: 'narrative',
            coordinates: {x: 100, y: 0},
            data: {title: 'Connected', text: 'Connected'}
          },
          {
            id: 'unreachable-endpoint',
            type: 'narrative',
            coordinates: {x: 200, y: 0},
            data: {title: 'Unreachable', text: 'Unreachable', layerInfo: {isLayerEndpoint: true}}
          }
        ],
        edges: [
          {
            id: 'edge-1',
            startNodeId: 'start-node',
            endNodeId: 'connected-node'
          }
          // Нет связи к unreachable-endpoint
        ],
        variables: [],
        startNodeId: 'start-node',
        metadata: {}
      };

      const errors = storyProcessor.validateStory(mockExportableStoryWithUnreachable);

      // Должна быть ошибка о недостижимых узлах
      const unreachableError = errors.find((error) => error.includes('недостижимые узлы'));
      expect(unreachableError).toBeDefined();
    });
  });

  describe('обработка виртуальных узлов для недостающих концовок', () => {
    it('должен создавать виртуальные узлы для недостающих концовок', () => {
      const mockStoryWithMissingNodes: any = {
        title: 'Test Story',
        nodes: [
          {
            id: 'existing-node',
            type: 'narrative',
            coordinates: {x: 0, y: 0},
            data: {title: 'Existing', text: 'Existing'}
          }
        ],
        edges: [
          {
            id: 'edge-to-missing',
            startNodeId: 'existing-node',
            endNodeId: 'missing-endpoint'
          }
        ],
        variables: [],
        startNodeId: 'existing-node',
        metadata: {}
      };

      const errors = storyProcessor.validateStory(mockStoryWithMissingNodes);

      // После обработки недостающий узел должен быть создан
      const missingNode = mockStoryWithMissingNodes.nodes.find((n: any) => n.id === 'missing-endpoint');
      expect(missingNode).toBeDefined();
      expect(missingNode.type).toBe('narrative');
    });
  });
});
