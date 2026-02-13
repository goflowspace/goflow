// События движка воспроизведения
import {Choice, Condition, Node} from '../../../types/nodes';
import {VariableOperation} from '../../../types/variables';

// Базовый интерфейс события
export interface EngineEvent {
  type: string;
  timestamp: number;
  nodeId?: string;
}

// События навигации
export interface NodeVisitedEvent extends EngineEvent {
  type: 'node.visited';
  nodeId: string;
  nodeName: string;
  nodeType: 'narrative' | 'choice';
}

export interface ChoiceSelectedEvent extends EngineEvent {
  type: 'choice.selected';
  nodeId: string;
  choice: Choice;
}

export interface NavigationBackEvent extends EngineEvent {
  type: 'navigation.back';
  fromNodeId: string;
  toNodeId: string;
}

export interface StoryRestartedEvent extends EngineEvent {
  type: 'story.restarted';
  startNodeId: string;
}

// События операций
export interface OperationExecutedEvent extends EngineEvent {
  type: 'operation.executed';
  nodeId: string;
  operation: VariableOperation & {
    previousValue?: string | number | boolean;
    resultValue?: string | number | boolean;
  };
}

export interface OperationsRolledBackEvent extends EngineEvent {
  type: 'operations.rolledback';
  nodeId: string;
  count: number;
}

// События условий
export interface ConditionEvaluatedEvent extends EngineEvent {
  type: 'condition.evaluated';
  nodeId?: string;
  edgeId?: string;
  condition: Condition;
  result: boolean;
  groupOperator?: 'AND' | 'OR';
}

export interface ConditionGroupEvaluatedEvent extends EngineEvent {
  type: 'condition.group.evaluated';
  nodeId?: string;
  edgeId?: string;
  conditions: Array<{
    condition: Condition;
    result: boolean;
  }>;
  groupOperator: 'AND' | 'OR';
  groupResult: boolean;
}

// Объединенный тип всех событий
export type PlaybackEngineEvent =
  | NodeVisitedEvent
  | ChoiceSelectedEvent
  | NavigationBackEvent
  | StoryRestartedEvent
  | OperationExecutedEvent
  | OperationsRolledBackEvent
  | ConditionEvaluatedEvent
  | ConditionGroupEvaluatedEvent;

// Слушатель событий
export type EngineEventListener = (event: PlaybackEngineEvent) => void;

// Интерфейс для подписки на события
export interface EngineEventEmitter {
  on(listener: EngineEventListener): void;
  off(listener: EngineEventListener): void;
  emit(event: PlaybackEngineEvent): void;
}
