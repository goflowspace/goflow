// app/src/utils/PrecedingNodesExtractor.ts

export interface PrecedingNodeData {
  order: number;
  id: string;
  type: 'narrative' | 'choice';
  text: string;
  entities?: string[];
}

export interface GraphNodeData {
  id: string;
  type: 'narrative' | 'choice' | 'layer';
  data: {
    title?: string;
    text?: string;
    choices?: Array<{text: string}>;
  };
  position?: {x: number; y: number};
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

/**
 * Utility class for extracting preceding nodes in the required JSON format
 * Optimizes performance by only analyzing relevant preceding nodes instead of entire graph
 * Runs on the client side to minimize network traffic
 */
export class PrecedingNodesExtractor {
  /**
   * Extract preceding nodes for a given node in the specified JSON format
   * @param currentNodeId - ID of the current node
   * @param graphData - Graph data containing nodes and edges
   * @param maxSteps - Maximum number of steps to go back (default: 3)
   * @param maxNodes - Maximum number of nodes to include (default: 10)
   * @param includeCurrentNode - Whether to include the current node in results (default: true)
   * @returns Array of preceding nodes in the required format
   */
  static extractPrecedingNodes(currentNodeId: string, graphData: GraphData, maxSteps: number = 3, maxNodes: number = 10, includeCurrentNode: boolean = true): PrecedingNodeData[] {
    console.log(`🔍 Extracting preceding nodes for: ${currentNodeId}`);
    console.log(`📊 Graph has ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
    console.log(`🎯 Max steps: ${maxSteps}, Max nodes: ${maxNodes}`);

    // Optional debug logs (can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📋 All nodes in graph:`,
        graphData.nodes.map((n) => `${n.id}(${n.type})`)
      );
      console.log(
        `🔗 All edges:`,
        graphData.edges.map((e) => `${e.source}->${e.target}`)
      );
    }

    const nodes = new Map(graphData.nodes.map((node) => [node.id, node]));
    const precedingNodes: Array<{
      id: string;
      type: 'narrative' | 'choice';
      title: string;
      text: string;
      distance: number;
    }> = [];
    const visited = new Set<string>();

    // BFS traversal to find preceding nodes
    const queue: Array<{nodeId: string; distance: number}> = [{nodeId: currentNodeId, distance: 0}];

    while (queue.length > 0 && precedingNodes.length < maxNodes) {
      const {nodeId, distance} = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      // Include the current node (distance 0) for context if requested
      if (distance === 0 && includeCurrentNode) {
        const currentNode = nodes.get(nodeId);
        if (currentNode && (currentNode.type === 'narrative' || currentNode.type === 'choice')) {
          console.log(`✅ Including current node ${nodeId} at distance ${distance}`);

          if (currentNode.type === 'narrative') {
            precedingNodes.push({
              id: currentNode.id,
              type: 'narrative',
              title: currentNode.data.title || 'Current Node',
              text: currentNode.data.text || '',
              distance: distance
            });
            console.log(`📖 Current narrative node: "${currentNode.data.title}" - ${(currentNode.data.text || '').substring(0, 50)}...`);
          } else if (currentNode.type === 'choice') {
            let choiceText = currentNode.data.text || '';

            if (!choiceText && currentNode.data.choices?.length) {
              choiceText = currentNode.data.choices.map((c) => c.text).join(', ');
            }

            const nodeTitle = currentNode.data.title || 'Current Choice';

            precedingNodes.push({
              id: currentNode.id,
              type: 'choice',
              title: nodeTitle,
              text: choiceText,
              distance: distance
            });
            console.log(`🎯 Current choice node: "${nodeTitle}" - text: "${choiceText}"`);
          }
        }
      }

      // Find incoming edges to this node
      const incomingEdges = graphData.edges.filter((edge) => edge.target === nodeId);
      console.log(`📥 Found ${incomingEdges.length} incoming edges for ${nodeId} at distance ${distance}`);

      for (const edge of incomingEdges) {
        const sourceNode = nodes.get(edge.source);
        if (!sourceNode || visited.has(edge.source)) {
          continue;
        }

        const nodeDistance = distance + 1;

        // Only process relevant node types within distance limit
        if (nodeDistance <= maxSteps && (sourceNode.type === 'narrative' || sourceNode.type === 'choice')) {
          console.log(`✅ Adding ${sourceNode.type} node ${edge.source} at distance ${nodeDistance}`);

          if (sourceNode.type === 'narrative') {
            // Add narrative node to context
            precedingNodes.push({
              id: sourceNode.id,
              type: 'narrative',
              title: sourceNode.data.title || 'Untitled',
              text: sourceNode.data.text || '',
              distance: nodeDistance
            });
            console.log(`📖 Narrative node: "${sourceNode.data.title}" - ${(sourceNode.data.text || '').substring(0, 50)}...`);
          } else if (sourceNode.type === 'choice') {
            // For choice nodes, try to get the actual choice text or fallback to available choices
            let choiceText = sourceNode.data.text || ''; // Check if there's direct text (selected choice)

            // If no direct text, combine all available choices
            if (!choiceText && sourceNode.data.choices?.length) {
              choiceText = sourceNode.data.choices.map((c) => c.text).join(', ');
            }

            const nodeTitle = sourceNode.data.title || 'Choice';

            // Debug choice node processing in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`🎯 Choice node debug:`, {
                id: sourceNode.id,
                title: nodeTitle,
                directText: sourceNode.data.text,
                choices: sourceNode.data.choices,
                finalText: choiceText
              });
            }

            precedingNodes.push({
              id: sourceNode.id,
              type: 'choice',
              title: nodeTitle,
              text: choiceText,
              distance: nodeDistance
            });
            console.log(`🎯 Choice node: "${nodeTitle}" - text: "${choiceText}"`);
          }
        }

        // Continue traversing within distance limits
        if (nodeDistance < maxSteps) {
          queue.push({nodeId: edge.source, distance: nodeDistance});
        }
      }
    }

    console.log(`📋 Found ${precedingNodes.length} preceding nodes total`);

    // Sort by distance (closest first) and convert to required format
    const sortedNodes = precedingNodes.sort((a, b) => a.distance - b.distance);

    // Reverse to get chronological order (earliest first) and assign order numbers
    const result: PrecedingNodeData[] = sortedNodes
      .reverse() // Earliest first for chronological order
      .map((node, index) => ({
        order: index,
        id: node.id,
        type: node.type,
        text: node.text.trim(),
        entities: this.extractEntitiesFromNode(node) // TODO: Implement entity extraction if needed
      }))
      .filter((node) => {
        // Include choice nodes even if they have empty text, but require text for narrative nodes
        return node.type === 'choice' || node.text.length > 0;
      });

    console.log(`📝 Converted to ${result.length} nodes in required format:`);
    result.forEach((node, index) => {
      console.log(`   ${index + 1}. Order ${node.order}: ${node.type} "${node.text.substring(0, 50)}..."`);
    });

    return result;
  }

  /**
   * Extract entities from a node (placeholder for future implementation)
   * @param node - Node to extract entities from
   * @returns Array of entity IDs (empty for now)
   */
  private static extractEntitiesFromNode(node: any): string[] {
    // TODO: Implement entity extraction logic if needed
    // This could involve parsing the text for entity references or
    // using attached entities data if available
    return [];
  }

  /**
   * Get statistics about the preceding nodes
   * @param precedingNodes - Array of preceding nodes
   * @returns Statistics object
   */
  static getStatistics(precedingNodes: PrecedingNodeData[]): {
    totalNodes: number;
    narrativeNodes: number;
    choiceNodes: number;
    averageTextLength: number;
    totalTextLength: number;
  } {
    const narrativeNodes = precedingNodes.filter((node) => node.type === 'narrative');
    const choiceNodes = precedingNodes.filter((node) => node.type === 'choice');

    const totalTextLength = precedingNodes.reduce((sum, node) => sum + node.text.length, 0);
    const averageTextLength = precedingNodes.length > 0 ? Math.round(totalTextLength / precedingNodes.length) : 0;

    return {
      totalNodes: precedingNodes.length,
      narrativeNodes: narrativeNodes.length,
      choiceNodes: choiceNodes.length,
      averageTextLength,
      totalTextLength
    };
  }

  /**
   * Calculate average word count from narrative nodes for text generation length estimation
   * @param precedingNodes - Array of preceding nodes
   * @returns Average word count
   */
  static calculateAverageWordCount(precedingNodes: PrecedingNodeData[]): number {
    const narrativeTexts = precedingNodes.filter((node) => node.type === 'narrative' && node.text.trim()).map((node) => node.text.trim());

    if (narrativeTexts.length === 0) {
      return 50; // Default target for new nodes
    }

    const totalWords = narrativeTexts.reduce((sum, text) => {
      return sum + text.split(/\s+/).filter((word) => word.length > 0).length;
    }, 0);

    const averageWords = Math.round(totalWords / narrativeTexts.length);

    // Limit to maximum of 50 words
    return Math.min(averageWords, 50);
  }
}
