import {Variable, VariableOperation} from './variables';

// Добавляем экспорт для типа Node, используемого в интерфейсах двигателя
export type Node = NarrativeNode | ChoiceNode | LayerNode | NoteNode | SkeletonNode;

// Добавляем тип Edge для поддержки формата React Go Flow
export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    conditions?: ConditionGroup[];
  };
}

// Variable type is imported from variables.ts

export interface SkeletonNode extends BaseNode {
  type: 'skeleton';
  data?: Record<string, never>; // Пустые данные для скелетон узла
}

// Добавляем тип Choice для представления вариантов выбора
export interface Choice {
  id: string;
  text: string;
  hasNextNode: boolean;
  isVirtual?: boolean; // Маркер "виртуального" выбора для прямых связей между нарративами
  pathLink?: Link; // Информация о связи для логирования условий
  evaluationCache?: Map<
    string,
    {
      link: Link;
      passed: boolean;
      groupResults: Array<{
        group: ConditionGroup;
        passed: boolean;
        conditionResults: Array<{
          condition: Condition;
          result: boolean;
        }>;
      }>;
    }
  >; // Кеш результатов проверки условий
}

export interface BaseNode {
  id: string;
  coordinates: {x: number; y: number};
  //TODO tags: string[];
  type: string;
}

export interface BaseNodeLson {
  id: string;
  coordinateX: number;
  coordinateY: number;
  type: string;
}

export interface NarrativeNodeLson extends BaseNodeLson {
  type: 'narrative';
  data: {
    title: string;
    text: string;
    attachedEntities?: string[];
  };
  operations?: VariableOperationLson[];
}

export interface VariableOperationLson {
  id: string;
  type: string;
  data: {
    variableId: string;
    operation: string;
    value: string;
  };
}

export interface NarrativeNode extends BaseNode {
  type: 'narrative';
  data: {title: string; text: string; attachedEntities?: string[]; isSkeleton?: boolean};
  operations?: VariableOperation[];
  //TODO isEntryPoint: boolean;
}

export interface ChoiceNode extends BaseNode {
  type: 'choice';
  parentId?: string;
  data: {
    text: string;
    height?: number;
  };
  operations?: VariableOperation[];
}

export interface Link extends Omit<BaseNode, 'coordinates'> {
  type: 'link';
  startNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  endNodeId: string;
  conditions: ConditionGroup[];
}

export type EdgeData = Link;

export interface LayerNode extends BaseNode {
  type: 'layer';
  name: string;
  description?: string;
  parentLayerId?: string;
  endingNodes?: ((NarrativeNode | ChoiceNode) & {
    isConnected: boolean;
    connectionIds?: string[]; // Массив ID связей, подключенных к этому узлу
  })[];
  startingNodes?: ((NarrativeNode | ChoiceNode) & {
    isConnected: boolean;
    connectionIds?: string[]; // Массив ID связей, подключенных к этому узлу
  })[];
}

export interface NoteNode extends BaseNode {
  type: 'note';
  data: {
    text: string;
    color?: string;
  };
}

export interface Layer {
  type: 'layer';
  id: string;
  name: string;
  description?: string;
  parentLayerId?: string;
  depth: number;
  nodes: Record<string, ChoiceNode | NarrativeNode | LayerNode | NoteNode | SkeletonNode>;
  edges: Record<string, Link>;
  nodeIds: string[];
  //TODO ghostInputNodeIds: string[];
  //TODO ghostOutputNodeIds: string[];
  //TODO endedNodeIds: string[];
}

export interface Jumper extends BaseNode {
  type: 'jumper';
}

export interface ConditionGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

// Типы условий
export enum ConditionType {
  PROBABILITY = 'probability',
  VARIABLE_COMPARISON = 'variable_comparison',
  NODE_HAPPENED = 'node_happened',
  NODE_NOT_HAPPENED = 'node_not_happened'
}

export interface Condition {
  id: string;
  type: ConditionType;

  // Для probability (вероятность)
  probability?: number; // от 0 до 1, где 1 = 100%

  // Для сравнения переменных (variable_comparison)
  varId?: string; // ID переменной слева
  comparisonVarId?: string; // ID переменной справа
  value?: string | number | boolean; // Пользовательское значение справа
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; // Оператор сравнения
  valType?: 'variable' | 'custom'; // Тип правой части сравнения
  percentType?: boolean; // Флаг, указывающий, что сравнение происходит с процентной переменной

  // Для условий типа посещения узла (node_happened, node_not_happened)
  nodeId?: string; // ID узла, который должен/не должен быть посещен
  nodeType?: 'narrative' | 'choice';
}

export interface Content {
  plainText: string;
  //TODO: Add more fields as needed (markdown, HTML, etc.)
}
