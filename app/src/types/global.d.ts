import {Condition} from './nodes';

// Расширяем глобальный интерфейс Window
declare global {
  interface Window {
    goflow?: {
      showConditionsPreview?: (params: {position: {x: number; y: number}; edgeId: string; onOpenConditionModal: (conditionType?: 'AND' | 'OR', existingCondition?: Condition) => void}) => void;
      hideConditionsPreview?: () => void;
      openConditionModal?: (params: {edgeId: string; position: {x: number; y: number}; conditionType?: 'AND' | 'OR'; existingCondition?: Condition}) => void;
      closeConditionModal?: () => void;
    };
  }
}

export {};
