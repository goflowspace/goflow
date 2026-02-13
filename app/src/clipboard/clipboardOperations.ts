import i18n from 'i18next';
import {nanoid} from 'nanoid';

import {getCommandManager} from '../commands/CommandManager';
import {getNotificationManager} from '../components/Notifications/index';
import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {shouldHaveCondition} from '../utils/conditionValidator';
import {copyNodesWithFullLayerSupport} from '../utils/layerOperationUtils';
import {refreshSpecificLayers} from '../utils/syncGraphToCanvas';

/**
 * Копирует выбранные узлы в буфер обмена
 */
export function copyNodes(): void {
  const {currentGraphId, layers} = useGraphStore.getState();
  const graph = layers[currentGraphId];

  // Получаем выбранные узлы напрямую из canvasStore
  const canvasStore = useCanvasStore.getState();
  const selectedNodes = canvasStore.nodes.filter((node: any) => node.selected);
  if (selectedNodes.length === 0) {
    // Уведомление, если нечего копировать
    getNotificationManager().showError(i18n.t('clipboard.nothing_to_copy'), true, 3000);
    return;
  }

  // используем универсальную функцию для полного копирования
  const {nodesToCopy, internalEdges, layerContents} = copyNodesWithFullLayerSupport(
    selectedNodes,
    graph,
    layers,
    true // добавляем " copy" к именам слоев
  );

  // Сохраняем в буфер обмена
  if (nodesToCopy.length > 0) {
    const graphStore = useGraphStore.getState();
    graphStore.setCopiedNodes(nodesToCopy, internalEdges);

    // Сохраняем метаданные слоев в буфере обмена
    (useGraphStore.getState() as any)._layerContentsForPaste = layerContents;

    // Показываем уведомление об успешном копировании
    if (nodesToCopy.length === 1) {
      getNotificationManager().showSuccess(i18n.t('clipboard.node_copied'), true, 2000);
    } else {
      getNotificationManager().showSuccess(i18n.t('clipboard.nodes_copied', {count: nodesToCopy.length}), true, 2000);
    }
  }
}

/**
 * Вырезает выбранные узлы
 */
export function cutNodes(): void {
  // Получаем ID текущего слоя перед операцией для последующего обновления
  const {currentGraphId} = useGraphStore.getState();

  // Используем CommandManager для регистрации операции в истории
  const commandManager = getCommandManager();
  commandManager.cutNodes();

  // Обновляем только текущий слой после вырезания
  refreshSpecificLayers([currentGraphId], false);
}

/**
 * Вставляет узлы из буфера обмена
 */
export function pasteNodes(): void {
  // Получаем ID текущего слоя перед операцией для последующего обновления
  const {currentGraphId} = useGraphStore.getState();

  // Проверяем, есть ли в буфере обмена слои
  const layerContentsForPaste = (useGraphStore.getState() as any)._layerContentsForPaste;
  const hasLayers = layerContentsForPaste && Object.keys(layerContentsForPaste).length > 0;

  // Используем CommandManager для регистрации операции в истории
  const commandManager = getCommandManager();
  commandManager.pasteNodes();

  // Если в буфере обмена были слои, обновляем текущий слой и все слои из буфера
  if (hasLayers) {
    const layersToUpdate = [currentGraphId, ...Object.keys(layerContentsForPaste)];
    refreshSpecificLayers(layersToUpdate, true); // true - обновлять и дочерние слои

    // Валидируем условия на связях после вставки
    validateEdgeConditions(layersToUpdate);
  } else {
    // Если обычные узлы, обновляем только текущий слой
    refreshSpecificLayers([currentGraphId], false);

    // Валидируем условия на связях в текущем слое
    validateEdgeConditions([currentGraphId]);
  }
}

/**
 * Дублирует выбранные узлы
 */
export function duplicateNodes(): void {
  const canvasStore = useCanvasStore.getState();
  const graphStore = useGraphStore.getState();
  const currentGraphId = graphStore.currentGraphId;

  // Получаем выбранные узлы
  const selectedNodes = canvasStore.nodes.filter((node) => node.selected);
  const selectedNodeIds = selectedNodes.map((node) => node.id);

  // Собираем ID слоев, которые нужно будет обновить
  const layersToUpdate = new Set<string>([currentGraphId]);

  // Проверяем, есть ли среди выбранных узлов слои
  const currentLayer = graphStore.layers[currentGraphId];
  const hasLayerNodes =
    currentLayer &&
    selectedNodeIds.some((id) => {
      const node = currentLayer.nodes[id];
      if (node && node.type === 'layer') {
        // Добавляем ID слоя в список для обновления
        layersToUpdate.add(id);
        return true;
      }
      return false;
    });

  // Если дублируется несколько узлов, сначала копируем их и их связи в буфер
  if (selectedNodeIds.length > 1 && currentLayer) {
    // используем универсальную функцию для копирования
    const {nodesToCopy, internalEdges} = copyNodesWithFullLayerSupport(
      selectedNodes,
      currentLayer,
      graphStore.layers,
      false // не добавляем " copy" к именам при дублировании
    );

    // Временно сохраняем в буфер обмена для использования в команде дублирования
    graphStore.setCopiedNodes(nodesToCopy, internalEdges);
  }

  // Создаем и выполняем команду дублирования
  const commandManager = getCommandManager();
  commandManager.duplicateSelectedNodes();

  // После дублирования, обновляем затронутые слои
  if (hasLayerNodes) {
    // Если среди выбранных узлов были слои, обновляем их и их дочерние слои
    const layersArray = [...layersToUpdate];
    refreshSpecificLayers(layersArray, true);

    // Валидируем условия на связях после дублирования
    validateEdgeConditions(layersArray);
  } else {
    // Если только обычные узлы, обновляем только текущий слой
    refreshSpecificLayers([currentGraphId], false);

    // Валидируем условия на связях в текущем слое
    validateEdgeConditions([currentGraphId]);
  }
}

/**
 * Валидирует условия на связях и показывает предупреждения, если условия отсутствуют там, где должны быть
 * @param layerIds Массив ID слоев для валидации
 */
function validateEdgeConditions(layerIds: string[]): void {
  const graphStore = useGraphStore.getState();

  const edgesNeedingConditions: string[] = [];

  layerIds.forEach((layerId) => {
    const layer = graphStore.layers[layerId];
    if (!layer) return;

    const nodes = layer.nodes;
    const edges = Object.values(layer.edges);

    // Преобразуем связи в формат ReactFlow Edge для валидации
    const reactFlowEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.startNodeId,
      target: edge.endNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: {
        conditions: edge.conditions
      }
    }));

    // Проверяем каждую связь
    reactFlowEdges.forEach((edge) => {
      if (shouldHaveCondition(edge, reactFlowEdges, nodes)) {
        // Проверяем, действительно ли отсутствуют условия
        const hasConditions = edge.data?.conditions && edge.data.conditions.length > 0 && edge.data.conditions.some((group: any) => group.conditions && group.conditions.length > 0);

        if (!hasConditions) {
          edgesNeedingConditions.push(edge.id);
        }
      }
    });
  });
}
