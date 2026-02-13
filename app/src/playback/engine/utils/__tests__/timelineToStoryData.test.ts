/**
 * Тесты для трансформера timelineToStoryData
 * Проверяют корректное преобразование данных из формата с таймлайнами
 * в формат для воспроизведения StoryData
 */
import {StorageData} from '@services/storageService';
import {ConditionType, Layer, Link} from '@types-folder/nodes';
import {Variable, VariableType} from '@types-folder/variables';

import {timelineToStoryData} from '../timelineToStoryData';

describe('timelineToStoryData', () => {
  // Тестовые данные
  const testLayers: Record<string, Layer> = {
    root: {
      id: 'root',
      type: 'layer',
      name: 'root',
      depth: 0,
      nodeIds: ['start', 'choice1', 'choice2', 'nested-layer'],
      nodes: {
        start: {
          id: 'start',
          type: 'narrative',
          coordinates: {x: 0, y: 0},
          data: {title: 'Start', text: 'This is the start node'}
        },
        choice1: {
          id: 'choice1',
          type: 'choice',
          coordinates: {x: 100, y: 0},
          data: {text: 'Go to path A', height: 80}
        },
        choice2: {
          id: 'choice2',
          type: 'choice',
          coordinates: {x: 100, y: 100},
          data: {text: 'Go to path B', height: 80}
        },
        'nested-layer': {
          id: 'nested-layer',
          type: 'layer',
          name: 'Nested Layer',
          coordinates: {x: 200, y: 50}
        }
      },
      edges: {
        e1: {
          id: 'e1',
          type: 'link',
          startNodeId: 'start',
          endNodeId: 'choice1',
          conditions: []
        },
        e2: {
          id: 'e2',
          type: 'link',
          startNodeId: 'start',
          endNodeId: 'choice2',
          conditions: []
        },
        e3: {
          id: 'e3',
          type: 'link',
          startNodeId: 'choice1',
          endNodeId: 'nested-layer',
          conditions: []
        }
      }
    },
    'nested-layer': {
      id: 'nested-layer',
      type: 'layer',
      name: 'Nested Layer',
      depth: 1,
      parentLayerId: 'root',
      nodeIds: ['pathA', 'pathB', 'end'],
      nodes: {
        pathA: {
          id: 'pathA',
          type: 'narrative',
          coordinates: {x: 0, y: 0},
          data: {title: 'Path A', text: 'You chose path A'}
        },
        pathB: {
          id: 'pathB',
          type: 'narrative',
          coordinates: {x: 0, y: 100},
          data: {title: 'Path B', text: 'You chose path B'}
        },
        end: {
          id: 'end',
          type: 'narrative',
          coordinates: {x: 100, y: 50},
          data: {title: 'End', text: 'This is the end'}
        }
      },
      edges: {
        e4: {
          id: 'e4',
          type: 'link',
          startNodeId: 'pathA',
          endNodeId: 'end',
          conditions: []
        },
        e5: {
          id: 'e5',
          type: 'link',
          startNodeId: 'pathB',
          endNodeId: 'end',
          conditions: [
            {
              id: 'c1',
              operator: 'AND',
              conditions: [
                {
                  id: 'c2',
                  type: ConditionType.NODE_HAPPENED,
                  nodeId: 'choice2'
                }
              ]
            }
          ]
        }
      }
    }
  };

  const testVariables: Variable[] = [
    {
      id: 'score',
      name: 'Score',
      type: 'integer' as VariableType,
      value: 0
    }
  ];

  it('should convert timeline data to StoryData format', () => {
    // Подготавливаем тестовые данные с таймлайнами
    const testTimelineId = 'test-timeline';
    const timelineData: StorageData = {
      timelines: {
        [testTimelineId]: {
          layers: testLayers,
          metadata: {},
          lastLayerNumber: 1,
          variables: testVariables
        }
      },
      projectName: 'Test Story'
    };

    // Вызываем трансформер
    const result = timelineToStoryData(timelineData);

    // Проверяем базовую структуру результата
    expect(result).toHaveProperty('title', 'Test Story');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('data.nodes');
    expect(result).toHaveProperty('data.edges');
    expect(result).toHaveProperty('data.variables');
    expect(result).toHaveProperty('metadata');

    // Проверяем, что узлы и ребра были корректно преобразованы
    expect(result.data.nodes.length).toBe(6); // 3 обычных узла в root + 3 узла в nested-layer (узел слоя исключен)
    expect(result.data.edges.length).toBe(4); // 2 ребра в root (e1, e2; e3 к слою исключена) + 2 ребра в nested-layer (e4, e5)

    // Проверяем, что ребра были корректно преобразованы
    const edgeE5 = result.data.edges.find((edge) => edge.id === 'e5');
    expect(edgeE5).toBeDefined();
    expect(edgeE5?.data).toBeDefined();
    expect(edgeE5?.data?.conditions).toBeDefined();
    if (edgeE5?.data?.conditions) {
      expect(edgeE5.data.conditions[0].conditions[0].nodeId).toBe('choice2');
    }

    // Проверяем, что переменные были корректно переданы
    expect(result.data.variables).toEqual(testVariables);

    // Проверяем, что метаданные содержат информацию о таймлайне
    expect(result.metadata?.timelineId).toBe(testTimelineId);
    expect(result.metadata?.lastLayerNumber).toBe(1);

    // Проверяем, что связи к узлам слоев исключены из результата
    const edgeToLayer = result.data.edges.find((edge) => edge.target === 'nested-layer');
    expect(edgeToLayer).toBeUndefined(); // Связь к узлу слоя должна быть исключена

    // Проверяем, что узлы слоев исключены из результата
    const layerNode = result.data.nodes.find((node) => node.type === 'layer');
    expect(layerNode).toBeUndefined(); // Узлы слоев не должны быть в плоском графе
  });

  it('should handle empty timelines', () => {
    // Подготавливаем пустые данные таймлайнов
    const emptyData: StorageData = {
      timelines: {},
      projectName: 'Empty Story'
    };

    // Вызываем трансформер
    const result = timelineToStoryData(emptyData);

    // Проверяем, что возвращается пустая структура
    expect(result.title).toBe('Empty Story');
    expect(result.data.nodes).toEqual([]);
    expect(result.data.edges).toEqual([]);
    expect(result.data.variables).toEqual([]);
  });

  it('should use the first available timeline when multiple timelines exist', () => {
    // Подготавливаем данные с другим ID таймлайна
    const otherTimelineData: StorageData = {
      timelines: {
        'custom-timeline': {
          layers: testLayers,
          metadata: {},
          lastLayerNumber: 1,
          variables: testVariables
        }
      },
      projectName: 'Custom Timeline Story'
    };

    // Вызываем трансформер
    const result = timelineToStoryData(otherTimelineData);

    // Проверяем, что был использован доступный таймлайн
    expect(result.title).toBe('Custom Timeline Story');
    expect(result.data.nodes.length).toBe(6); // 3 обычных узла в root + 3 узла в nested-layer (узел слоя исключен)
    expect(result.metadata?.timelineId).toBe('custom-timeline');
  });
});
