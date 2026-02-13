// backend/src/modules/ai/v2/operations/narrative/v2/GraphContextAnalysisOperationV2.ts
import { AbstractOperation } from '../../../core/AbstractOperation';
import { OperationInput, OperationOutput, ExecutionContext, OperationType } from '../../../shared/types';

/**
 * Input data for graph context analysis v2
 */
export interface GraphContextAnalysisInputV2 extends OperationInput {
  projectId: string;
  currentNodeId: string;
  userDescription: string;
  graphData: {
    nodes: Array<{
      id: string;
      type: 'narrative' | 'choice' | 'layer';
      data: { 
        title?: string; 
        text?: string; 
        choices?: Array<{ text: string }> 
      };
      position?: { x: number; y: number };
    }>;
    edges: Array<{ 
      id: string;
      source: string; 
      target: string; 
      sourceHandle?: string;
      targetHandle?: string;
    }>;
  };
  additionalContext?: {
    projectInfo?: any;
  };
}

/**
 * Output data for graph context analysis v2
 */
export interface GraphContextAnalysisOutputV2 extends OperationOutput {
  precedingNodes: Array<{
    id: string;
    type: 'narrative' | 'choice';
    title: string;
    text: string;
    distance: number;
  }>;
  contextChain: string;
  averageTextLength: number;
  hasDirectPredecessor: boolean;
}

/**
 * Graph context analysis operation v2
 * Analyzes the node graph to find preceding nodes that create context for the current node
 */
export class GraphContextAnalysisOperationV2 extends AbstractOperation<
  GraphContextAnalysisInputV2,
  GraphContextAnalysisOutputV2
> {
  readonly id = 'graph-context-analysis-v2';
  readonly name = 'Graph Context Analysis V2';
  readonly version = '2.0.0';
  readonly type = OperationType.DATABASE;

  /**
   * Additional input validation
   */
  protected validateAdditional(input: GraphContextAnalysisInputV2): string[] {
    const errors: string[] = [];
    
    if (!input.graphData) {
      errors.push('graphData is required');
    } else {
      if (!Array.isArray(input.graphData.nodes)) {
        errors.push('graphData.nodes must be an array');
      }
      if (!Array.isArray(input.graphData.edges)) {
        errors.push('graphData.edges must be an array');
      }
    }
    
    if (!input.currentNodeId || typeof input.currentNodeId !== 'string') {
      errors.push('currentNodeId must be a non-empty string');
    }

    return errors;
  }

  /**
   * Execute the graph context analysis operation
   */
  protected async executeOperation(input: GraphContextAnalysisInputV2, _context: ExecutionContext): Promise<GraphContextAnalysisOutputV2> {
    const { currentNodeId, graphData } = input;
    
    // Find preceding nodes by traversing edges backwards
    const precedingNodes = this.findPrecedingNodes(currentNodeId, graphData);
    
    // Build contextual chain from preceding nodes
    const contextChain = this.buildContextChain(precedingNodes);
    
    // Calculate average text length from narrative nodes
    const averageTextLength = this.calculateAverageTextLength(precedingNodes);
    
    // Check if there's a direct predecessor
    const hasDirectPredecessor = precedingNodes.some(node => node.distance === 1);
    
    return {
      precedingNodes,
      contextChain,
      averageTextLength,
      hasDirectPredecessor,
      metadata: {
        executionTime: Date.now(),
        type: this.type
      }
    };
  }

  /**
   * Find all preceding nodes that can provide context
   */
  private findPrecedingNodes(currentNodeId: string, graphData: GraphContextAnalysisInputV2['graphData']): Array<{
    id: string;
    type: 'narrative' | 'choice';
    title: string;
    text: string;
    distance: number;
  }> {
    const nodes = new Map(graphData.nodes.map(node => [node.id, node]));
    const precedingNodes: Array<{
      id: string;
      type: 'narrative' | 'choice';
      title: string;
      text: string;
      distance: number;
    }> = [];
    const visited = new Set<string>();
    
    // BFS traversal to find preceding nodes
    const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: currentNodeId, distance: 0 }];
    
    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      // Find incoming edges to this node
      const incomingEdges = graphData.edges.filter(edge => edge.target === nodeId);
      
      for (const edge of incomingEdges) {
        const sourceNode = nodes.get(edge.source);
        if (!sourceNode || visited.has(edge.source)) continue;
        
        const nodeDistance = distance + 1;
        
        if (sourceNode.type === 'narrative') {
          // Add narrative node to context
          precedingNodes.push({
            id: sourceNode.id,
            type: 'narrative',
            title: sourceNode.data.title || 'Untitled',
            text: sourceNode.data.text || '',
            distance: nodeDistance
          });
        } else if (sourceNode.type === 'choice') {
          // For choice nodes, add the choice text and continue traversing
          const choiceText = sourceNode.data.choices?.map(c => c.text).join(', ') || '';
          const nodeTitle = sourceNode.data.title || 'Choice';
          precedingNodes.push({
            id: sourceNode.id,
            type: 'choice',
            title: nodeTitle,
            text: choiceText,
            distance: nodeDistance
          });
        }
        
        // Continue traversing (max depth of 3 to avoid infinite loops)
        if (nodeDistance < 3) {
          queue.push({ nodeId: edge.source, distance: nodeDistance });
        }
      }
    }
    
    // Sort by distance (closest first)
    return precedingNodes.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Build a coherent contextual chain from preceding nodes
   */
  private buildContextChain(precedingNodes: Array<{ id: string; type: string; title: string; text: string; distance: number }>): string {
    if (precedingNodes.length === 0) {
      return 'No preceding context available - this appears to be the start of the story.';
    }
    
    // Include both narrative and choice nodes, sorted by distance (most distant first for chronological order)
    const allRelevantNodes = precedingNodes
      .filter(node => {
        const hasNarrativeContent = node.type === 'narrative' && node.text.trim();
        // For choice nodes: include if has text OR has title (choice presence is contextually important)
        const hasChoiceContent = node.type === 'choice' && (node.text.trim() || node.title.trim());
        const hasContent = hasNarrativeContent || hasChoiceContent;
        
        return hasContent;
      })
      .sort((a, b) => b.distance - a.distance); // Reverse sort: most distant (earliest) first
    
    if (allRelevantNodes.length === 0) {
      return 'This is the beginning of the story. No preceding context available.';
    }
    
    // Create a flowing narrative summary including both narrative and choice context
    const contextParts = allRelevantNodes.map((node, index) => {
      const text = node.text.trim();
      // Limit each part to avoid overly long context
      const truncatedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
      
      // Different formatting for narrative vs choice nodes
      if (node.type === 'narrative') {
        // Add context markers to show story progression
        if (allRelevantNodes.length > 1) {
          if (index === 0) {
            return `[Story beginning - Complete scene]: ${truncatedText}`;
          } else if (index === allRelevantNodes.length - 1) {
            return `[Previous scene - Complete scene]: ${truncatedText}`;
          } else {
            return `[Earlier scene - Complete scene]: ${truncatedText}`;
          }
        }
        return `[Previous scene - Complete scene]: ${truncatedText}`;
      } else if (node.type === 'choice') {
        // Format choice nodes to show decision context
        const choiceContext = truncatedText ? 
          `${truncatedText}` : 
          `Choice point: "${node.title}"`;
        return `[Choice made by player]: ${choiceContext}`;
      }
      
      return truncatedText;
    });
    
    const header = `Story context (chronological order from earliest to most recent):

`;
    
    const result = header + contextParts.join('\n\n');
    console.log(`📝 Built context chain with ${contextParts.length} parts:`);
    contextParts.forEach((part, index) => {
      console.log(`   ${index + 1}. ${part.substring(0, 80)}...`);
    });
    console.log(`🔍 Final context result preview:`, result.substring(0, 300) + '...');
    
    return result;
  }

  /**
   * Calculate average text length from narrative nodes
   */
  private calculateAverageTextLength(precedingNodes: Array<{ type: string; text: string }>): number {
    const narrativeTexts = precedingNodes
      .filter(node => node.type === 'narrative' && node.text.trim())
      .map(node => node.text.trim());
    
    if (narrativeTexts.length === 0) {
      return 50; // Default maximum for new nodes
    }
    
    const totalWords = narrativeTexts.reduce((sum, text) => {
      return sum + text.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
    
    const averageWords = Math.round(totalWords / narrativeTexts.length);
    
    // Limit to maximum of 50 words
    return Math.min(averageWords, 50);
  }

  /**
   * Override cost estimation for database operations
   */
  async estimateCost(_input: GraphContextAnalysisInputV2, _context: ExecutionContext): Promise<{realCostUSD: number, credits: number}> {
    // Database operations have minimal cost
    return { realCostUSD: 0, credits: 1 };
  }
}
