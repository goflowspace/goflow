import {ConditionType} from '../../../types/nodes';
import {OperationType} from '../../../types/variables';

// Типы записей в логе
export enum LogEntryType {
  NARRATIVE = 'narrative',
  CHOICE = 'choice'
}

// Базовый тип для записи в логе
export interface BaseLogEntry {
  id: string;
  type: LogEntryType;
  timestamp: string;
  index: number;
  hasTransition?: boolean; // Показывать ли стрелку перехода перед записью
}

// Типы операций
export interface Operation {
  id: string;
  variableName: string;
  variableType?: string;
  operator: OperationType;
  value: string | number | boolean | undefined;
  result: string | number | boolean | undefined;
  isVariableValue?: boolean; // true если value - это имя переменной, false если кастомное значение
}

// Базовый интерфейс для условий в логе
export interface BaseCondition {
  id: string;
  type: ConditionType;
  index: number;
}

// Условие сравнения переменных (для обоих типов: с кастомным значением и с другой переменной)
export interface VariableComparisonCondition extends BaseCondition {
  type: ConditionType.VARIABLE_COMPARISON;
  valType: 'custom' | 'variable';
  variableName: string;
  variableType?: string;
  comparator: string;
  // Для valType = 'custom'
  value?: string | number | boolean;
  // Для valType = 'variable'
  comparisonVariableName?: string;
}

export interface ProbabilityCondition extends BaseCondition {
  type: ConditionType.PROBABILITY;
  probability: number; // от 0 до 100 (в процентах)
}

export interface NodeHappenedCondition extends BaseCondition {
  type: ConditionType.NODE_HAPPENED;
  nodeName: string;
}

export interface NodeNotHappenedCondition extends BaseCondition {
  type: ConditionType.NODE_NOT_HAPPENED;
  nodeName: string;
}

export type Condition = VariableComparisonCondition | ProbabilityCondition | NodeHappenedCondition | NodeNotHappenedCondition;

// Запись нарративного узла
export interface NarrativeLogEntry extends BaseLogEntry {
  type: LogEntryType.NARRATIVE;
  nodeName: string;
  operations?: Operation[];
  conditions?: Condition[];
  isExpanded?: boolean;
}

// Запись выбора
export interface ChoiceLogEntry extends BaseLogEntry {
  type: LogEntryType.CHOICE;
  choiceName: string;
}

// Объединенный тип для всех записей
export type LogEntry = NarrativeLogEntry | ChoiceLogEntry;

// Состояние панели лога
export interface LogPanelState {
  entries: LogEntry[];
  isAscending: boolean;
  allExpanded: boolean;
}

// Пропсы компонентов
export interface LogPanelProps {
  entries: LogEntry[];
  onClear?: () => void;
  onToggleSort?: () => void;
  onToggleExpandAll?: () => void;
}

export interface LogEntryProps {
  entry: LogEntry;
  onToggleExpand?: (id: string) => void;
}

export interface OperationProps {
  operation: Operation;
  index: number;
}

export interface ConditionProps {
  condition: Condition;
}
