import { ObjectId } from 'mongodb';

/**
 * Генерирует новый ObjectId для MongoDB
 */
export const generateObjectId = (): string => {
  return new ObjectId().toString();
};

/**
 * Проверяет, является ли строка валидным ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  return ObjectId.isValid(id);
};

/**
 * Преобразует строку в ObjectId (если валидная)
 */
export const toObjectId = (id: string): ObjectId => {
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new ObjectId(id);
}; 