// backend/src/modules/ai/v2/types/PrecedingNodeData.ts

/**
 * Data structure for preceding nodes extracted on the client side
 * This optimizes network traffic by sending only relevant context instead of full graph
 */
export interface PrecedingNodeData {
  order: number;
  id: string;
  type: 'narrative' | 'choice';
  text: string;
  entities?: string[];
}
