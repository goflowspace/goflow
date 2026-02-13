import {ChoiceNode, ConditionType, Layer, LayerNode, Link, NarrativeNode} from '../../types/nodes';
import {LayerContentsMap, collectChildLayerIds, copyLayerContentRecursively, copyNodesWithFullLayerSupport, createLayerNodeCopies, findInternalEdges} from '../layerOperationUtils';

// Вспомогательные функции для создания тестовых данных
const createMockLayer = (id: string, depth: number = 0, nodeIds: string[] = [], nodes: Record<string, any> = {}, edges: Record<string, Link> = {}): Layer => ({
  id,
  type: 'layer',
  name: 'Test Layer',
  depth,
  nodeIds,
  nodes,
  edges
});

const createMockLayerNode = (id: string, name: string): LayerNode => ({
  id,
  type: 'layer',
  name,
  coordinates: {x: 100, y: 100}
});

const createMockNarrativeNode = (id: string): NarrativeNode => ({
  id,
  type: 'narrative',
  data: {
    title: 'Test Title',
    text: 'Test text'
  },
  coordinates: {x: 0, y: 0}
});

const createMockChoiceNode = (id: string): ChoiceNode => ({
  id,
  type: 'choice',
  data: {
    text: 'Test Choice'
  },
  coordinates: {x: 0, y: 0}
});

const createMockLink = (id: string, startNodeId: string, endNodeId: string): Link => ({
  id,
  type: 'link',
  startNodeId,
  endNodeId,
  conditions: []
});

describe('layerOperationUtils', () => {
  describe('copyLayerContentRecursively', () => {
    it('should copy simple layer without child layers', () => {
      const layers: Record<string, Layer> = {
        layer1: createMockLayer('layer1', 0, ['node1'], {node1: createMockNarrativeNode('node1')}, {edge1: createMockLink('edge1', 'node1', 'node2')})
      };

      const layerContents: LayerContentsMap = {};
      copyLayerContentRecursively('layer1', layers, layerContents);

      expect(layerContents['layer1']).toBeDefined();
      expect(layerContents['layer1'].nodeIds).toEqual(['node1']);
      expect(layerContents['layer1'].childLayers).toEqual([]);
      expect(layerContents['layer1'].depth).toBe(0);
      expect(layerContents['layer1'].nodes).toEqual({node1: createMockNarrativeNode('node1')});
      expect(layerContents['layer1'].edges).toEqual({edge1: createMockLink('edge1', 'node1', 'node2')});
    });

    it('should copy layer with child layers recursively', () => {
      const childLayer = createMockLayerNode('child1', 'Child Layer');
      const layers: Record<string, Layer> = {
        parent: createMockLayer('parent', 0, ['child1'], {child1: childLayer}),
        child1: createMockLayer('child1', 1, ['node1'], {node1: createMockNarrativeNode('node1')})
      };

      const layerContents: LayerContentsMap = {};
      copyLayerContentRecursively('parent', layers, layerContents);

      expect(layerContents['parent']).toBeDefined();
      expect(layerContents['child1']).toBeDefined();
      expect(layerContents['parent'].childLayers).toEqual(['child1']);
      expect(layerContents['child1'].childLayers).toEqual([]);
    });

    it('should add "copy" to layer names when addCopyToName is true', () => {
      const layerNode = createMockLayerNode('layer1', 'Original Layer');
      const layers: Record<string, Layer> = {
        parent: createMockLayer('parent', 0, ['layer1'], {layer1: layerNode})
      };

      const layerContents: LayerContentsMap = {};
      copyLayerContentRecursively('parent', layers, layerContents, true);

      expect(layerContents['parent'].nodes['layer1'].name).toBe('Original Layer copy');
    });

    it('should not add duplicate "copy" to names', () => {
      const layerNode = createMockLayerNode('layer1', 'Layer copy');
      const layers: Record<string, Layer> = {
        parent: createMockLayer('parent', 0, ['layer1'], {layer1: layerNode})
      };

      const layerContents: LayerContentsMap = {};
      copyLayerContentRecursively('parent', layers, layerContents, true);

      expect(layerContents['parent'].nodes['layer1'].name).toBe('Layer copy');
    });

    it('should handle non-existent layer gracefully', () => {
      const layers: Record<string, Layer> = {};
      const layerContents: LayerContentsMap = {};

      copyLayerContentRecursively('nonexistent', layers, layerContents);

      expect(layerContents['nonexistent']).toBeUndefined();
    });

    it('should create deep copies of nodes and edges', () => {
      const originalNode = createMockNarrativeNode('node1');
      const originalEdge = createMockLink('edge1', 'node1', 'node2');

      const layers: Record<string, Layer> = {
        layer1: createMockLayer('layer1', 0, ['node1'], {node1: originalNode}, {edge1: originalEdge})
      };

      const layerContents: LayerContentsMap = {};
      copyLayerContentRecursively('layer1', layers, layerContents);

      // Изменяем оригинальные объекты
      originalNode.data.text = 'Modified';
      originalEdge.startNodeId = 'modified';

      // Копии не должны измениться
      expect(layerContents['layer1'].nodes['node1'].data.text).toBe('Test text');
      expect(layerContents['layer1'].edges['edge1'].startNodeId).toBe('node1');
    });
  });

  describe('createLayerNodeCopies', () => {
    it('should copy layer nodes with modified names', () => {
      const layerNode = createMockLayerNode('layer1', 'Test Layer');
      const narrativeNode = createMockNarrativeNode('node1');

      const graphNodes = {
        layer1: layerNode,
        node1: narrativeNode
      };

      const selectedNodes = [{id: 'layer1'}, {id: 'node1'}];

      const result = createLayerNodeCopies(selectedNodes, graphNodes, true);

      expect(result).toHaveLength(2);

      const copiedLayer = result.find((n) => n.id === 'layer1') as LayerNode;
      expect(copiedLayer.name).toBe('Test Layer copy');

      const copiedNarrative = result.find((n) => n.id === 'node1');
      expect(copiedNarrative?.type).toBe('narrative');
    });

    it('should not add "copy" when addCopyToName is false', () => {
      const layerNode = createMockLayerNode('layer1', 'Test Layer');
      const graphNodes = {layer1: layerNode};
      const selectedNodes = [{id: 'layer1'}];

      const result = createLayerNodeCopies(selectedNodes, graphNodes, false);

      const copiedLayer = result.find((n) => n.id === 'layer1') as LayerNode;
      expect(copiedLayer.name).toBe('Test Layer');
    });

    it('should handle non-existent nodes gracefully', () => {
      const graphNodes = {};
      const selectedNodes = [{id: 'nonexistent'}];

      const result = createLayerNodeCopies(selectedNodes, graphNodes);

      expect(result).toEqual([]);
    });

    it('should create deep copies of nodes', () => {
      const originalLayer = createMockLayerNode('layer1', 'Test Layer');
      const graphNodes = {layer1: originalLayer};
      const selectedNodes = [{id: 'layer1'}];

      const result = createLayerNodeCopies(selectedNodes, graphNodes);

      // Изменяем оригинал
      originalLayer.name = 'Modified';

      // Копия не должна измениться
      const copiedLayer = result[0] as LayerNode;
      expect(copiedLayer.name).toBe('Test Layer copy');
    });
  });

  describe('findInternalEdges', () => {
    it('should find edges between selected nodes', () => {
      const nodeIds = new Set(['node1', 'node2', 'node3']);
      const edges: Record<string, Link> = {
        edge1: createMockLink('edge1', 'node1', 'node2'), // internal
        edge2: createMockLink('edge2', 'node2', 'node4'), // external
        edge3: createMockLink('edge3', 'node3', 'node1') // internal
      };

      const result = findInternalEdges(nodeIds, edges);

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toContain('edge1');
      expect(result.map((e) => e.id)).toContain('edge3');
      expect(result.map((e) => e.id)).not.toContain('edge2');
    });

    it('should include child layer IDs in search', () => {
      const nodeIds = new Set(['node1']);
      const childLayerIds = ['child1', 'child2'];
      const edges: Record<string, Link> = {
        edge1: createMockLink('edge1', 'node1', 'child1'), // should be included
        edge2: createMockLink('edge2', 'child1', 'child2'), // should be included
        edge3: createMockLink('edge3', 'node1', 'external') // should not be included
      };

      const result = findInternalEdges(nodeIds, edges, childLayerIds);

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toContain('edge1');
      expect(result.map((e) => e.id)).toContain('edge2');
    });

    it('should return empty array when no internal edges exist', () => {
      const nodeIds = new Set(['node1', 'node2']);
      const edges: Record<string, Link> = {
        edge1: createMockLink('edge1', 'node1', 'external'),
        edge2: createMockLink('edge2', 'external', 'node2')
      };

      const result = findInternalEdges(nodeIds, edges);

      expect(result).toEqual([]);
    });

    it('should create deep copies of edges', () => {
      const originalEdge = createMockLink('edge1', 'node1', 'node2');
      // Используем правильную структуру ConditionGroup
      originalEdge.conditions = [
        {
          id: 'test',
          operator: 'AND',
          conditions: [
            {
              id: 'condition1',
              type: ConditionType.VARIABLE_COMPARISON,
              varId: 'var1',
              operator: 'eq',
              value: 'original',
              valType: 'custom'
            }
          ]
        }
      ];

      const nodeIds = new Set(['node1', 'node2']);
      const edges = {edge1: originalEdge};

      const result = findInternalEdges(nodeIds, edges);

      // Изменяем оригинал
      originalEdge.conditions[0].conditions[0].value = 'modified';

      // Копия не должна измениться
      expect(result[0].conditions[0].conditions[0].value).toBe('original');
    });
  });

  describe('collectChildLayerIds', () => {
    it('should collect direct child layer IDs', () => {
      const childLayer1 = createMockLayerNode('child1', 'Child 1');
      const childLayer2 = createMockLayerNode('child2', 'Child 2');

      const layers: Record<string, Layer> = {
        parent: createMockLayer('parent', 0, ['child1', 'child2'], {
          child1: childLayer1,
          child2: childLayer2,
          node1: createMockNarrativeNode('node1')
        }),
        child1: createMockLayer('child1', 1),
        child2: createMockLayer('child2', 1)
      };

      const result = collectChildLayerIds('parent', layers);

      expect(result).toContain('child1');
      expect(result).toContain('child2');
      expect(result).toHaveLength(2);
    });

    it('should collect nested child layer IDs recursively', () => {
      const layers: Record<string, Layer> = {
        parent: createMockLayer('parent', 0, ['child1'], {
          child1: createMockLayerNode('child1', 'Child 1')
        }),
        child1: createMockLayer('child1', 1, ['grandchild1'], {
          grandchild1: createMockLayerNode('grandchild1', 'Grandchild 1')
        }),
        grandchild1: createMockLayer('grandchild1', 2)
      };

      const result = collectChildLayerIds('parent', layers);

      expect(result).toContain('child1');
      expect(result).toContain('grandchild1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for layer without children', () => {
      const layers: Record<string, Layer> = {
        parent: createMockLayer('parent', 0, ['node1'], {
          node1: createMockNarrativeNode('node1')
        })
      };

      const result = collectChildLayerIds('parent', layers);

      expect(result).toEqual([]);
    });

    it('should handle non-existent layer gracefully', () => {
      const layers: Record<string, Layer> = {};

      const result = collectChildLayerIds('nonexistent', layers);

      expect(result).toEqual([]);
    });
  });

  describe('copyNodesWithFullLayerSupport', () => {
    it('should copy simple nodes without layers', () => {
      const selectedNodes = [{id: 'node1'}, {id: 'node2'}];

      const graph = {
        nodes: {
          node1: createMockNarrativeNode('node1'),
          node2: createMockChoiceNode('node2')
        },
        edges: {
          edge1: createMockLink('edge1', 'node1', 'node2')
        }
      };

      const layers: Record<string, Layer> = {};

      const result = copyNodesWithFullLayerSupport(selectedNodes, graph, layers, true);

      expect(result.nodesToCopy).toHaveLength(2);
      expect(result.internalEdges).toHaveLength(1);
      expect(result.layerContents).toEqual({});
    });

    it('should copy layer nodes and their content', () => {
      const layerNode = createMockLayerNode('layer1', 'Test Layer');
      const selectedNodes = [{id: 'layer1'}];

      const graph = {
        nodes: {layer1: layerNode},
        edges: {}
      };

      const layers: Record<string, Layer> = {
        layer1: createMockLayer('layer1', 0, ['node1'], {
          node1: createMockNarrativeNode('node1')
        })
      };

      const result = copyNodesWithFullLayerSupport(selectedNodes, graph, layers, true);

      expect(result.nodesToCopy).toHaveLength(1);
      expect(result.nodesToCopy[0].type).toBe('layer');
      expect((result.nodesToCopy[0] as LayerNode).name).toBe('Test Layer');
      expect(result.layerContents['layer1']).toBeDefined();
      expect(result.layerContents['layer1'].nodes['node1']).toBeDefined();
    });

    it('should find internal edges including child layers', () => {
      const layerNode = createMockLayerNode('layer1', 'Test Layer');
      const narrativeNode = createMockNarrativeNode('node1');

      const selectedNodes = [{id: 'layer1'}, {id: 'node1'}];

      const graph = {
        nodes: {
          layer1: layerNode,
          node1: narrativeNode
        },
        edges: {
          edge1: createMockLink('edge1', 'node1', 'layer1'),
          edge2: createMockLink('edge2', 'layer1', 'child1') // НЕ будет включен, так как child1 не выбран
        }
      };

      const layers: Record<string, Layer> = {
        layer1: createMockLayer('layer1', 0, ['child1'], {
          child1: createMockLayerNode('child1', 'Child')
        }),
        child1: createMockLayer('child1', 1)
      };

      const result = copyNodesWithFullLayerSupport(selectedNodes, graph, layers, true);

      // Только одна связь между выбранными узлами (node1 -> layer1)
      expect(result.internalEdges).toHaveLength(1);
      expect(result.internalEdges.map((e) => e.id)).toContain('edge1');
      // edge2 не включается, так как child1 не входит в selectedNodes
    });

    it('should not find internal edges for single node', () => {
      const selectedNodes = [{id: 'node1'}];

      const graph = {
        nodes: {node1: createMockNarrativeNode('node1')},
        edges: {edge1: createMockLink('edge1', 'node1', 'node2')}
      };

      const layers: Record<string, Layer> = {};

      const result = copyNodesWithFullLayerSupport(selectedNodes, graph, layers);

      expect(result.internalEdges).toEqual([]);
    });

    it('should handle mixed layer and regular nodes', () => {
      const layerNode = createMockLayerNode('layer1', 'Test Layer');
      const narrativeNode = createMockNarrativeNode('node1');

      const selectedNodes = [{id: 'layer1'}, {id: 'node1'}];

      const graph = {
        nodes: {
          layer1: layerNode,
          node1: narrativeNode
        },
        edges: {}
      };

      const layers: Record<string, Layer> = {
        layer1: createMockLayer('layer1', 0)
      };

      const result = copyNodesWithFullLayerSupport(selectedNodes, graph, layers, false);

      expect(result.nodesToCopy).toHaveLength(2);

      const copiedLayer = result.nodesToCopy.find((n) => n.type === 'layer') as LayerNode;
      const copiedNarrative = result.nodesToCopy.find((n) => n.type === 'narrative');

      expect(copiedLayer.name).toBe('Test Layer'); // no copy suffix
      expect(copiedNarrative?.type).toBe('narrative');
      expect(result.layerContents['layer1']).toBeDefined();
    });
  });
});
