// Общие типы для системы логирования
import {ConditionGroup} from '../../../types/nodes';

// Временная заглушка для типа операции, замените на реальный импорт
export interface Operation {
  id: string;
  type: string;
  parameters?: Record<string, any>;
}

export enum PlaybackLogType {
  VisitNode = 'visitNode', // отображаем лог при входе на нарративный узел
  ChooseChoice = 'chooseChoice', // сделанный выбор
  OperationExecute = 'operationExecute',
  ConditionEvaluate = 'conditionEvaluate'
}

// Результат выполнения одной группы условий
export interface ConditionResult {
  condition: any; // тип конкретного условия
  result: boolean;
  explanation?: string; // объяснение результата
}

// Результат выполнения группы условий
export interface ConditionGroupResult {
  conditions: ConditionResult[];
  result: boolean;
  explanation?: string; // объяснение результата группы
}

// Результат выполнения всех групп условий
export interface ConditionGroupsResult {
  conditionGroups: ConditionGroupResult[];
  result: boolean; // общий результат выполнения всех групп
}

// Результат выполнения операции
export interface OperationResult {
  operation: Operation;
  result: any; // результат выполнения операции
  isSuccess: boolean;
  error?: string;
}

// Интерфейс атомарного лога
export interface PlaybackLogEntry {
  nodeId: string; // ID нарративного узла
  nodeName?: string; // Название нарративного узла (для отображения)
  timestamp: number; // Время создания записи
  type: PlaybackLogType; // Тип записи
  entry: Operation | ConditionGroupsResult | OperationResult | string | null; // Данные записи
}

// Интерфейс панели лога
export interface IPlaybackLogPanel {
  addLog: (entry: PlaybackLogEntry) => void;
  rollbackLog: (nodeId: string) => void;
  clearLog: () => void;
  getLogs: () => PlaybackLogEntry[];
  filter: (types: Set<PlaybackLogType>) => PlaybackLogEntry[];
  sort: (ascending?: boolean) => PlaybackLogEntry[];
}
