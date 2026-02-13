/**
 * Утилита для получения всех узлов из всех слоев
 */
import type {Layer} from '@types-folder/nodes';

import {getNodeTitle} from './getNodeTitle';

/**
 * Получает все узлы нарративных и выбора из всех слоев
 *
 * @param layers - Все слои графа
 * @param includeTypes - Типы узлов для включения (по умолчанию: narrative и choice)
 * @returns Массив узлов с метаданными (id, type, layerId, layerName и т.д.)
 */
export const getAllNodesFromAllLayers = (
  layers: Record<string, Layer>,
  includeTypes: string[] = ['narrative', 'choice']
): Array<{
  id: string;
  type: string;
  text: string;
  name: string;
  title: string;
  layerId: string;
  layerName: string;
  node: any; // Полный объект узла для дополнительной информации
}> => {
  const allNodes: Array<{
    id: string;
    type: string;
    text: string;
    name: string;
    title: string;
    layerId: string;
    layerName: string;
    node: any;
  }> = [];

  // Проходим по всем слоям
  Object.entries(layers).forEach(([layerId, layer]) => {
    // Проходим по всем узлам слоя
    Object.entries(layer.nodes).forEach(([nodeId, node]) => {
      // Проверяем, относится ли тип узла к тем, которые нам нужны
      if (includeTypes.includes(node.type)) {
        // Получаем заголовок узла
        const nodeTitle = getNodeTitle(node);

        // Определяем текст и имя в зависимости от типа узла
        let nodeText = '';
        let nodeName = '';

        if (node.type === 'narrative') {
          // Для нарративных узлов текст - это содержимое, а имя - это заголовок
          nodeText = node.data?.text?.substring(0, 50) || 'No text';
          nodeName = node.data?.title || nodeTitle;
        } else if (node.type === 'choice') {
          // Для узлов выбора и текст и имя - это текст выбора
          nodeText = node.data?.text || 'No text';
          nodeName = nodeText;
        } else {
          // Для других типов узлов
          nodeText = 'No text';
          nodeName = nodeTitle;
        }

        // Добавляем узел в результаты
        allNodes.push({
          id: node.id,
          type: node.type,
          text: nodeText,
          name: nodeName,
          title: node.type === 'narrative' ? node.data?.title || '' : '',
          layerId,
          layerName: layer.name || 'Unnamed layer',
          node // Включаем полный объект узла для доступа к другой информации
        });
      }
    });
  });

  return allNodes;
};

/**
 * Сортирует узлы, помещая узлы из текущего слоя в начало
 *
 * @param nodes - Массив узлов для сортировки
 * @param currentLayerId - ID текущего слоя
 * @returns Отсортированный массив узлов
 */
export const sortNodesByLayer = (nodes: ReturnType<typeof getAllNodesFromAllLayers>, currentLayerId: string): ReturnType<typeof getAllNodesFromAllLayers> => {
  return [...nodes].sort((a, b) => {
    // Узлы из текущего слоя идут первыми
    if (a.layerId === currentLayerId && b.layerId !== currentLayerId) return -1;
    if (a.layerId !== currentLayerId && b.layerId === currentLayerId) return 1;

    // Сортировка по имени слоя
    return a.layerName.localeCompare(b.layerName);
  });
};

/**
 * Фильтрует узлы по поисковому запросу
 *
 * @param nodes - Массив узлов для фильтрации
 * @param searchQuery - Строка поиска
 * @returns Отфильтрованный массив узлов
 */
export const filterNodesBySearchQuery = (nodes: ReturnType<typeof getAllNodesFromAllLayers>, searchQuery: string): ReturnType<typeof getAllNodesFromAllLayers> => {
  if (!searchQuery || searchQuery.trim() === '') {
    return nodes;
  }

  const query = searchQuery.toLowerCase().trim();
  return nodes.filter(
    (node) => node.text.toLowerCase().includes(query) || node.name.toLowerCase().includes(query) || node.layerName.toLowerCase().includes(query) || node.id.toLowerCase().includes(query)
  );
};
