import {Node} from '@xyflow/react';

/**
 * Создает Map из массива узлов для быстрого доступа по ID
 * Сложность: O(n) для создания, O(1) для последующего доступа
 */
export function createNodesMap(nodes: Node[]): Map<string, Node> {
  return nodes.reduce((map, node) => {
    map.set(node.id, node);
    return map;
  }, new Map<string, Node>());
}

/**
 * Простой LRU кэш для хранения часто запрашиваемых узлов
 */
class LRUNodeCache {
  private capacity: number;
  private cache: Map<string, Node>;
  private recentKeys: string[];

  constructor(capacity: number = 100) {
    this.capacity = capacity;
    this.cache = new Map();
    this.recentKeys = [];
  }

  get(id: string): Node | undefined {
    if (!this.cache.has(id)) return undefined;

    // Обновляем "недавность" использования ключа
    this.recentKeys = this.recentKeys.filter((key) => key !== id);
    this.recentKeys.push(id);

    return this.cache.get(id);
  }

  set(id: string, node: Node): void {
    // Если кэш переполнен, удаляем наименее использованный элемент
    if (this.cache.size >= this.capacity && !this.cache.has(id)) {
      const leastRecentKey = this.recentKeys.shift();
      if (leastRecentKey) this.cache.delete(leastRecentKey);
    }

    // Добавляем/обновляем значение в кэше
    this.cache.set(id, node);

    // Обновляем список недавно использованных ключей
    this.recentKeys = this.recentKeys.filter((key) => key !== id);
    this.recentKeys.push(id);
  }

  clear(): void {
    this.cache.clear();
    this.recentKeys = [];
  }
}

// Создаем экземпляр кэша для использования в приложении
const nodeCache = new LRUNodeCache(100);

/**
 * Получает узел по ID с использованием кэша и ускоренного поиска
 * @param id ID узла
 * @param nodes Массив узлов для поиска
 * @param nodesMap Опциональная Map узлов для быстрого доступа
 * @returns Найденный узел или undefined
 */
export function getNodeById(id: string, nodes: Node[], nodesMap?: Map<string, Node>): Node | undefined {
  // Сначала проверяем кэш
  const cachedNode = nodeCache.get(id);
  if (cachedNode) return cachedNode;

  // Если передана Map, используем ее
  if (nodesMap && nodesMap.has(id)) {
    const node = nodesMap.get(id);
    if (node) nodeCache.set(id, node);
    return node;
  }

  // Иначе ищем в массиве
  const node = nodes.find((n) => n.id === id);
  if (node) nodeCache.set(id, node);
  return node;
}

/**
 * Очищает кэш узлов
 */
export function clearNodeCache(): void {
  nodeCache.clear();
}
