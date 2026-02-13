import {timelineToStoryData} from '../../playback/engine/utils/timelineToStoryData';

describe('timelineToStoryData - Layer Endpoints Handling', () => {
  describe('когда слои имеют концовки (startingNodes и endingNodes)', () => {
    const mockStorageData: any = {
      projectName: 'Test Project',
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
                'edge-1': {
                  id: 'edge-1',
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
              edges: {},
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
              edges: {},
              nodeIds: ['narrative-2']
            }
          }
        }
      }
    };

    it('должна добавлять концовки слоев как реальные узлы в плоскую структуру', () => {
      const result = timelineToStoryData(mockStorageData);

      // Проверяем, что концовки добавлены как узлы
      const endpointNodeIds = ['start-a1', 'end-a1', 'start-b1', 'end-b1'];
      endpointNodeIds.forEach((nodeId) => {
        const node = result.data.nodes.find((n: any) => n.id === nodeId);
        expect(node).toBeDefined();
        expect((node as any).data.layerInfo.isLayerEndpoint).toBe(true);
      });
    });

    it('должна правильно привязывать концовки к родительскому слою', () => {
      const result = timelineToStoryData(mockStorageData);

      // Проверяем startingNodes
      const startA1 = result.data.nodes.find((n: any) => n.id === 'start-a1') as any;
      expect(startA1.data.layerInfo.layerId).toBe('layer-a'); // сам слой Layer A
      expect(startA1.data.layerInfo.layerName).toBe('Layer A'); // имя слоя
      expect(startA1.data.layerInfo.endpointType).toBe('starting');

      // Проверяем endingNodes
      const endA1 = result.data.nodes.find((n: any) => n.id === 'end-a1') as any;
      expect(endA1.data.layerInfo.layerId).toBe('layer-a'); // сам слой Layer A
      expect(endA1.data.layerInfo.layerName).toBe('Layer A'); // имя слоя
      expect(endA1.data.layerInfo.endpointType).toBe('ending');
    });

    it('должна создавать прямые связи между концовками слоев', () => {
      const result = timelineToStoryData(mockStorageData);

      // Ищем связь между концовками
      const edge = result.data.edges.find((e: any) => e.source === 'end-a1' && e.target === 'start-b1');

      expect(edge).toBeDefined();
      expect((edge as any).id).toBe('edge-1');
    });

    it('должна включать обычные узлы из вложенных слоев', () => {
      const result = timelineToStoryData(mockStorageData);

      // Проверяем, что обычные узлы тоже включены
      const narrative1 = result.data.nodes.find((n: any) => n.id === 'narrative-1') as any;
      const narrative2 = result.data.nodes.find((n: any) => n.id === 'narrative-2') as any;

      expect(narrative1).toBeDefined();
      expect(narrative2).toBeDefined();

      // Проверяем привязку к слою
      expect(narrative1.data.layerInfo.layerId).toBe('layer-a');
      expect(narrative2.data.layerInfo.layerId).toBe('layer-b');
    });

    it('не должна создавать недостижимые узлы при межслойных соединениях', () => {
      const result = timelineToStoryData(mockStorageData);

      // Получаем все ID узлов
      const allNodeIds = new Set(result.data.nodes.map((n: any) => n.id));

      // Проверяем, что все связи ведут к существующим узлам
      result.data.edges.forEach((edge: any) => {
        expect(allNodeIds.has(edge.source)).toBe(true);
        expect(allNodeIds.has(edge.target)).toBe(true);
      });
    });
  });

  describe('когда связь ведет от концовки слоя к обычному узлу', () => {
    const mockStorageDataMixed: any = {
      projectName: 'Test Project Mixed',
      timelines: {
        'base-timeline': {
          variables: [],
          lastLayerNumber: 1,
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
                  endingNodes: [
                    {
                      id: 'end-a1',
                      type: 'narrative',
                      coordinates: {x: 200, y: 0},
                      data: {title: 'End A1', text: 'End A1'}
                    }
                  ]
                },
                'narrative-external': {
                  id: 'narrative-external',
                  type: 'narrative',
                  coordinates: {x: 400, y: 100},
                  data: {title: 'External Narrative', text: 'External Narrative'}
                }
              },
              edges: {
                'edge-mixed': {
                  id: 'edge-mixed',
                  type: 'link',
                  startNodeId: 'layer-a',
                  endNodeId: 'narrative-external',
                  sourceHandle: 'end-a1',
                  conditions: []
                }
              },
              nodeIds: ['layer-a', 'narrative-external']
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
              edges: {},
              nodeIds: ['narrative-1']
            }
          }
        }
      }
    };

    it('должна создавать связь от концовки слоя к обычному узлу', () => {
      const result = timelineToStoryData(mockStorageDataMixed);

      // Ищем связь от концовки к обычному узлу
      const edge = result.data.edges.find((e: any) => e.source === 'end-a1' && e.target === 'narrative-external');

      expect(edge).toBeDefined();
      expect((edge as any).id).toBe('edge-mixed');
    });

    it('должна включать как концовку слоя, так и обычный узел', () => {
      const result = timelineToStoryData(mockStorageDataMixed);

      const endA1 = result.data.nodes.find((n: any) => n.id === 'end-a1') as any;
      const externalNarrative = result.data.nodes.find((n: any) => n.id === 'narrative-external') as any;

      expect(endA1).toBeDefined();
      expect(externalNarrative).toBeDefined();

      // Концовка должна быть помечена как endpoint
      expect(endA1.data.layerInfo.isLayerEndpoint).toBe(true);
      expect(endA1.data.layerInfo.endpointType).toBe('ending');

      // Обычный узел не должен быть endpoint
      expect(externalNarrative.data.layerInfo.isLayerEndpoint).toBeUndefined();
    });
  });
});
