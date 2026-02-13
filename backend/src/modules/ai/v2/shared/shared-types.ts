// backend/src/modules/ai/v2/shared/shared-types.ts

export interface EntityTypeInfo {
    id: string;
    name: string;
    type: string;
    description?: string;
    parameters: EntityParameterInfo[];
  }
  
  export interface EntityParameterInfo {
    id: string;
    name: string;
    valueType: string;
    required: boolean;
    order: number;
    description: string;
  }


export interface GeneratedField {
  /** Название поля */
  name: string;
  /** ID параметра из БД */
  parameterId?: string;
  /** Тип поля */
  type: string;
  /** Сгенерированное значение */
  value: string;
  /** Дополнительные метаданные */
  metadata?: any;
}