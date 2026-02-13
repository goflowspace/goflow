/**
 * Утилита для получения заголовка узла в зависимости от его типа
 */
import {useGraphStore} from '../store/useGraphStore';

/**
 * Получает заголовок узла в зависимости от его типа
 *
 * Правила определения заголовка:
 * - Для нарративных узлов: сначала проверяется title или name, затем text
 * - Для узлов выбора: сразу используется text
 * - Для узлов слоя: используется name
 * - Для узлов заметок: используется text
 *
 * @param node - Узел любого типа
 * @returns Заголовок узла
 */
export const getNodeTitle = (node: any): string => {
  if (!node) return 'Node not selected';

  // Определяем тип узла
  const nodeType = node.type || 'unknown';

  switch (nodeType) {
    case 'narrative':
      // Для нарративных узлов приоритет: title, затем text
      if (node.data) {
        if (node.data.title) return node.data.title;
        if (node.data.text) return node.data.text.substring(0, 50) + (node.data.text.length > 50 ? '...' : '');
      }
      return 'No title';

    case 'choice':
      // Для узлов выбора используем text
      if (node.data && node.data.text) {
        return node.data.text;
      }
      return 'No text';

    case 'layer':
      // Для слоев используем name
      if (node.name) {
        return node.name;
      }
      return 'No title';

    case 'note':
      // Для заметок используем text
      if (node.data && node.data.text) {
        return node.data.text;
      }
      return 'No text';

    default:
      // Если тип неизвестен, пробуем найти любое подходящее поле
      if (node.data && node.data.title) return node.data.title;
      if (node.name) return node.name;
      if (node.data && node.data.text) return node.data.text;
      if (node.title) return node.title;
      if (node.text) return node.text;

      return 'No title';
  }
};

/**
 * Получает название слоя по его ID
 *
 * @param layerId - ID слоя
 * @returns Название слоя или null, если слой не найден
 */
export const getLayerName = (layerId: string): string | null => {
  const graphStore = useGraphStore.getState();

  // Если это корневой слой
  if (layerId === 'root') {
    return 'Main layer';
  }

  // Получаем слой по ID
  const layer = graphStore.layers[layerId];
  if (layer && layer.name) {
    return layer.name;
  }

  // Ищем слой в списке узлов всех слоев
  for (const currentLayerId in graphStore.layers) {
    const currentLayer = graphStore.layers[currentLayerId];
    const layerNode = currentLayer.nodes[layerId];

    if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
      return layerNode.name;
    }
  }

  return null;
};
