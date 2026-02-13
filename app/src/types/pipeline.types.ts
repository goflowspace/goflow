export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  isOptional: boolean;
  customPrompt?: (results: Map<string, any>, pipelineInput: any) => string;
}

export interface PipelineGroup {
  id: string;
  name: string;
  type: 'sequential' | 'parallel';
  steps: PipelineStep[];
}

export interface PipelineStructure {
  id: string;
  name: string;
  description: string;
  groups: PipelineGroup[];
}

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface StepWithStatus extends PipelineStep {
  status: StepStatus;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  explanation?: string;
  content?: any; // Сгенерированный контент
}

export interface GroupWithStatus extends Omit<PipelineGroup, 'steps'> {
  steps: StepWithStatus[];
  status: StepStatus;
}
