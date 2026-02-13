export type VariableType = 'string' | 'integer' | 'float' | 'boolean' | 'percent';

export interface Variable {
  id: string;
  name: string;
  internalName?: string;
  type: VariableType;
  value: string | number | boolean;
  description?: string;
}

// Типы операций с переменными
export type OperationType = 'override' | 'subtract' | 'addition' | 'multiply' | 'divide' | 'invert' | 'join';

// Типы целей для операций
export type OperationTargetType = 'variable' | 'custom';

// Структура цели операции
export interface OperationTarget {
  type: OperationTargetType;
  value: string | number | boolean;
  variableId?: string; // Используется, если type === 'variable'
}

// Структура операции с переменной
export interface VariableOperation {
  id: string;
  nodeId: string; // ID узла, к которому относится операция
  variableId: string; // ID переменной
  operationType: OperationType;
  target?: OperationTarget; // Цель операции (не нужна для 'invert')
  enabled: boolean; // Включена/выключена операция
  order: number; // Порядок выполнения операции в списке
}
