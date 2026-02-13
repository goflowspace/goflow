import { AISuggestionType } from '@prisma/client';
import { BranchingContext } from '../ai.service';

export interface AIRequestData {
  context: string;
  userSettings: any;
  suggestionType?: AISuggestionType;
  branchingContext?: BranchingContext;
  maxTokens?: number;
}

export interface AISuggestionContent {
  title?: string;
  description: string;
  explanation?: string;
  type: AISuggestionType;
  confidence: number;
  entities?: string[];
  sequence_order?: number;
}

export interface AIProviderInterface {
  generateSuggestions(data: AIRequestData): Promise<AISuggestionContent[]>;
} 