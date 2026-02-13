import {Condition, ConditionType} from './nodes';
import {Variable} from './variables';

export interface ConditionTypePickerProps {
  selectedType?: ConditionType;
  onTypeSelect: (type: ConditionType) => void;
  disabledTypes?: ConditionType[];
}

export interface ProbabilitySetupProps {
  probability?: number;
  onUpdate: (probability: number) => void;
}

export interface VariableComparisonSetupProps {
  variables: Variable[];
  varId?: string;
  comparisonVarId?: string;
  value?: string | number | boolean;
  operator?: string;
  valType?: 'variable' | 'custom';
  onUpdate: (updates: Partial<Condition>) => void;
}

export interface NodeHappenedSetupProps {
  nodeId?: string;
  onUpdate: (nodeId: string, nodeType?: 'narrative' | 'choice') => void;
  edgeId?: string;
}

export interface ConditionPreviewProps {
  condition: Condition;
  variables: Variable[];
}
