import type {Layer} from '@types-folder/nodes';
import {DEFAULT_LAYER_METADATA, ROOT_LAYER_ID} from '@types-folder/projectState';

import {createDefaultLayerMetadata, createEmptyProjectState, createEmptyRootLayer, createProjectSaveData, isValidProjectData} from '../projectStateHelpers';

describe('projectStateHelpers', () => {
  describe('createEmptyRootLayer', () => {
    test('создает корневой слой с правильной структурой', () => {
      const result = createEmptyRootLayer();

      expect(result).toEqual({
        type: 'layer',
        id: 'root',
        name: 'root',
        depth: 0,
        nodeIds: [],
        nodes: {},
        edges: {}
      });
    });

    test('возвращает новый объект при каждом вызове', () => {
      const layer1 = createEmptyRootLayer();
      const layer2 = createEmptyRootLayer();

      expect(layer1).not.toBe(layer2);
      expect(layer1).toEqual(layer2);
    });

    test('имеет правильный тип Layer', () => {
      const result = createEmptyRootLayer();

      expect(result.type).toBe('layer');
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.depth).toBe('number');
      expect(Array.isArray(result.nodeIds)).toBe(true);
      expect(typeof result.nodes).toBe('object');
      expect(typeof result.edges).toBe('object');
    });
  });

  describe('createDefaultLayerMetadata', () => {
    test('возвращает метаданные по умолчанию', () => {
      const result = createDefaultLayerMetadata();

      expect(result).toEqual(DEFAULT_LAYER_METADATA);
    });

    test('содержит правильную структуру panelState', () => {
      const result = createDefaultLayerMetadata();

      expect(result.panelState).toEqual({
        startPanelOpen: true,
        endPanelOpen: true
      });
    });

    test('содержит правильную структуру viewport', () => {
      const result = createDefaultLayerMetadata();

      expect(result.viewport).toEqual({
        x: 0,
        y: 0,
        zoom: 1
      });
    });

    test('возвращает тот же объект (константу)', () => {
      const result1 = createDefaultLayerMetadata();
      const result2 = createDefaultLayerMetadata();

      expect(result1).toBe(result2);
    });
  });

  describe('createEmptyProjectState', () => {
    test('создает полное состояние пустого проекта', () => {
      const result = createEmptyProjectState();

      expect(result).toHaveProperty('layers');
      expect(result).toHaveProperty('layerMetadata');
      expect(result).toHaveProperty('hasLoadedFromStorage');
    });

    test('содержит корневой слой в layers', () => {
      const result = createEmptyProjectState();

      expect(result.layers).toHaveProperty(ROOT_LAYER_ID);
      expect(result.layers[ROOT_LAYER_ID]).toEqual(createEmptyRootLayer());
    });

    test('содержит метаданные для корневого слоя', () => {
      const result = createEmptyProjectState();

      expect(result.layerMetadata).toHaveProperty(ROOT_LAYER_ID);
      expect(result.layerMetadata[ROOT_LAYER_ID]).toEqual(DEFAULT_LAYER_METADATA);
    });

    test('устанавливает hasLoadedFromStorage в true', () => {
      const result = createEmptyProjectState();

      expect(result.hasLoadedFromStorage).toBe(true);
    });

    test('возвращает новый объект при каждом вызове', () => {
      const state1 = createEmptyProjectState();
      const state2 = createEmptyProjectState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('createProjectSaveData', () => {
    const mockLayers: Record<string, Layer> = {
      root: createEmptyRootLayer(),
      layer1: {
        type: 'layer',
        id: 'layer1',
        name: 'Test Layer',
        depth: 1,
        nodeIds: ['node1'],
        nodes: {
          node1: {
            id: 'node1',
            type: 'narrative',
            coordinates: {x: 100, y: 100},
            data: {title: 'Test', text: 'Test text'}
          }
        },
        edges: {}
      }
    };

    const mockLayerMetadata = {
      root: DEFAULT_LAYER_METADATA,
      layer1: DEFAULT_LAYER_METADATA
    };

    const mockVariables = [{id: 'var1', name: 'TestVar', type: 'string', value: 'test'}];

    test('создает данные для сохранения с обязательными параметрами', () => {
      const result = createProjectSaveData(mockLayers, mockLayerMetadata, 5, mockVariables, 'Test Project', 'timeline-1');

      expect(result).toHaveProperty('timelines');
      expect(result).toHaveProperty('projectName', 'Test Project');
      expect(result).toHaveProperty('_lastModified');
      expect(result).not.toHaveProperty('projectId');
    });

    test('включает projectId если он передан', () => {
      const result = createProjectSaveData(mockLayers, mockLayerMetadata, 5, mockVariables, 'Test Project', 'timeline-1', 'project-123');

      expect(result).toHaveProperty('projectId', 'project-123');
    });

    test('создает правильную структуру timelines', () => {
      const timelineId = 'test-timeline';
      const result = createProjectSaveData(mockLayers, mockLayerMetadata, 5, mockVariables, 'Test Project', timelineId);

      expect(result.timelines).toHaveProperty(timelineId);

      const timeline = result.timelines[timelineId];
      expect(timeline).toEqual({
        layers: mockLayers,
        metadata: mockLayerMetadata,
        variables: mockVariables,
        lastLayerNumber: 5
      });
    });

    test('устанавливает _lastModified как timestamp', () => {
      const beforeTime = Date.now();
      const result = createProjectSaveData(mockLayers, mockLayerMetadata, 5, mockVariables, 'Test Project', 'timeline-1');
      const afterTime = Date.now();

      expect(result._lastModified).toBeGreaterThanOrEqual(beforeTime);
      expect(result._lastModified).toBeLessThanOrEqual(afterTime);
    });

    test('корректно обрабатывает пустые данные', () => {
      const timelineId = 'empty-timeline';
      const result = createProjectSaveData({}, {}, 0, [], '', timelineId);

      expect(result.timelines[timelineId]).toEqual({
        layers: {},
        metadata: {},
        variables: [],
        lastLayerNumber: 0
      });
      expect(result.projectName).toBe('');
    });
  });

  describe('isValidProjectData', () => {
    test('возвращает true для валидных данных проекта', () => {
      const validData = {
        timelines: {
          'any-timeline': {
            layers: {root: createEmptyRootLayer()},
            metadata: {},
            variables: [],
            lastLayerNumber: 0
          }
        }
      };

      expect(isValidProjectData(validData)).toBe(true);
    });

    test('возвращает false для null или undefined', () => {
      expect(isValidProjectData(null)).toBe(false);
      expect(isValidProjectData(undefined)).toBe(false);
    });

    test('возвращает false если нет timelines', () => {
      const invalidData = {
        projectName: 'Test'
      };

      expect(isValidProjectData(invalidData)).toBe(false);
    });

    test('возвращает false если список таймлайнов пуст', () => {
      const invalidData = {
        timelines: {}
      };

      expect(isValidProjectData(invalidData)).toBe(false);
    });

    test('возвращает false если layers не является объектом', () => {
      const invalidData = {
        timelines: {
          'some-timeline': {
            layers: 'not an object'
          }
        }
      };

      expect(isValidProjectData(invalidData)).toBe(false);
    });

    test('возвращает true даже если layers пустой объект', () => {
      const validData = {
        timelines: {
          'some-timeline': {
            layers: {}
          }
        }
      };

      expect(isValidProjectData(validData)).toBe(true);
    });

    test('возвращает false для примитивных типов', () => {
      expect(isValidProjectData('string')).toBe(false);
      expect(isValidProjectData(123)).toBe(false);
      expect(isValidProjectData(true)).toBe(false);
    });

    test('возвращает false для массива', () => {
      expect(isValidProjectData([])).toBe(false);
    });
  });
});
