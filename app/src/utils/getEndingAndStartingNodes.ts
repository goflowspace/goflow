import type {ChoiceNode, Layer, NarrativeNode} from '@types-folder/nodes';

export function getEndingAndStartingNodes(layer: Layer): {
  endingNodes: (NarrativeNode | ChoiceNode)[];
  startingNodes: (NarrativeNode | ChoiceNode)[];
} {
  const outgoing = new Set<string>();
  const incoming = new Set<string>();

  for (const edge of Object.values(layer.edges)) {
    outgoing.add(edge.startNodeId);
    incoming.add(edge.endNodeId);
  }

  const allNodes = Object.values(layer.nodes).filter((n): n is NarrativeNode | ChoiceNode => n.type === 'narrative' || n.type === 'choice');

  const endingNodes = allNodes.filter((n) => !outgoing.has(n.id));
  const startingNodes = allNodes.filter((n) => !incoming.has(n.id));

  return {endingNodes, startingNodes};
}
