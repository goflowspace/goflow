import type {Layer, LayerNode} from '@types-folder/nodes';

import {getEndingAndStartingNodes} from './getEndingAndStartingNodes';

export const updateParentEndingAndStartingNodes = (graphId: string, layers: Record<string, Layer>): Record<string, Layer> => {
  const graph = layers[graphId];
  if (!graph || !graph.parentLayerId) return layers;

  const parentId = graph.parentLayerId;
  const parentLayer = layers[parentId];
  const targetLayerNode = parentLayer.nodes[graph.id] as LayerNode;

  const {endingNodes, startingNodes} = getEndingAndStartingNodes(graph);

  const prevEndings = targetLayerNode.endingNodes ?? [];
  const prevStartings = targetLayerNode.startingNodes ?? [];

  const endingMap = Object.fromEntries(prevEndings.map((n) => [n.id, n.isConnected]));
  const startingMap = Object.fromEntries(prevStartings.map((n) => [n.id, n.isConnected]));

  return {
    ...layers,
    [parentId]: {
      ...parentLayer,
      nodes: {
        ...parentLayer.nodes,
        [graph.id]: {
          ...targetLayerNode,
          endingNodes: endingNodes.map((n) => ({
            ...n,
            isConnected: endingMap[n.id] ?? false
          })),
          startingNodes: startingNodes.map((n) => ({
            ...n,
            isConnected: startingMap[n.id] ?? false
          }))
        }
      }
    }
  };
};
