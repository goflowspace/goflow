import {PlaybackStorageService} from '../../services/playbackStorageService';

describe('PlaybackStorageService - Layer Endpoints Handling', () => {
  describe('при сохранении данных воспроизведения с концовками слоев', () => {
    const mockProjectData: any = {
      projectName: 'Test Project',
      timelines: {
        'base-timeline': {
          variables: [
            {
              id: 'var1',
              name: 'TestVar',
              type: 'string',
              value: 'test'
            }
          ],
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
                  data: {title: 'Narrative 1', text: 'Narrative 1'},
                  operations: [
                    {
                      id: 'op1',
                      variableId: 'var1',
                      operation: 'set',
                      value: 'new value',
                      enabled: true
                    }
                  ]
                }
              },
              edges: {
                'edge-internal': {
                  id: 'edge-internal',
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
                'edge-from-start': {
                  id: 'edge-from-start',
                  type: 'link',
                  startNodeId: 'start-b1',
                  endNodeId: 'narrative-2',
                  conditions: []
                }
              },
              nodeIds: ['narrative-2']
            }
          }
        }
      }
    };

    beforeAll(() => {
      // Мокаем IndexedDB для тестов
      Object.defineProperty(global, 'indexedDB', {
        value: {
          open: jest.fn(() =>
            Promise.resolve({
              transaction: jest.fn(() => ({
                objectStore: jest.fn(() => ({
                  put: jest.fn(() => Promise.resolve()),
                  get: jest.fn(() => Promise.resolve())
                }))
              }))
            })
          )
        },
        writable: true
      });
    });

    it('должен иметь метод savePlaybackData', () => {
      expect(typeof PlaybackStorageService.savePlaybackData).toBe('function');
    });

    it('должен иметь метод loadPlaybackData', () => {
      expect(typeof PlaybackStorageService.loadPlaybackData).toBe('function');
    });
  });

  describe('при загрузке данных воспроизведения', () => {
    it('должен иметь правильную сигнатуру метода loadPlaybackData', () => {
      expect(PlaybackStorageService.loadPlaybackData).toBeDefined();
      expect(typeof PlaybackStorageService.loadPlaybackData).toBe('function');
    });
  });
});
