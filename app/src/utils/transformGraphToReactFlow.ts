import type {Layer} from '@types-folder/nodes';
import type {Edge, Node} from '@xyflow/react';

import {CHOICE_NODE_HEIGHT_CONSTANTS} from './constants';

export const convertToReactFlowNodes = (layer: Layer): Node[] => {
  return layer.nodeIds.map((id) => {
    const n = layer.nodes[id];
    const base: Node = {
      id: n.id,
      type: n.type,
      position: n.coordinates,
      data: n.type !== 'layer' ? (n.data ?? {}) : {}
    };

    if (n.type === 'choice') {
      return {
        ...base,
        height: CHOICE_NODE_HEIGHT_CONSTANTS.BASE_HEIGHT
      };
    }

    return base;
  });
};

export const convertToReactFlowEdges = (layer: Layer, tempEdges: Edge[] = []): Edge[] => {
  return [
    ...Object.values(layer.edges).map((e) => ({
      id: e.id,
      source: e.startNodeId,
      target: e.endNodeId,
      ...(e.sourceHandle ? {sourceHandle: e.sourceHandle} : {}),
      ...(e.targetHandle ? {targetHandle: e.targetHandle} : {}),
      type: 'default',
      data: {conditions: e.conditions}
    })),
    ...tempEdges
  ];
};
