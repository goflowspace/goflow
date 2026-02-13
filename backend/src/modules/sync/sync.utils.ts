/**
 * Утилиты для синхронизации операций
 * Чистые функции без побочных эффектов для легкого тестирования
 */

import { Operation, GraphSnapshot } from "./sync.types";

/**
 * Применяет массив операций к текущему снимку состояния
 * @param currentSnapshot - Текущее состояние графа
 * @param operations - Массив операций для применения
 * @returns Новое состояние графа после применения операций
 */
export function applyOperationsToSnapshot(
  currentSnapshot: GraphSnapshot,
  operations: Operation[],
): GraphSnapshot {
  // Создаем глубокую копию снимка
  const newSnapshot: GraphSnapshot = JSON.parse(
    JSON.stringify(currentSnapshot),
  );

  // Применяем каждую операцию
  for (const operation of operations) {
    applyOperation(newSnapshot, operation);
  }

  // Обновляем временную метку
  newSnapshot._lastModified = Date.now();

  return newSnapshot;
}

/**
 * Применяет одну операцию к снимку
 */
function applyOperation(snapshot: GraphSnapshot, operation: Operation): void {
  const { type, timelineId, layerId, payload } = operation;

  // Убеждаемся, что таймлайн существует
  if (!snapshot.timelines[timelineId]) {
    snapshot.timelines[timelineId] = {
      layers: {
        root: {
          id: "root",
          name: "Main layer",
          nodes: {},
          edges: {},
          nodeIds: [],
        },
      },
      metadata: {},
      variables: [],
    };
  }

  const timeline = snapshot.timelines[timelineId];

  // Убеждаемся, что слой root существует
  if (!timeline.layers.root) {
    timeline.layers.root = {
      id: "root",
      name: "Main layer",
      nodes: {},
      edges: {},
      nodeIds: [],
    };
  }

  const layer = timeline.layers[layerId] || timeline.layers.root;

  // Дополнительная проверка безопасности
  if (!layer) {
    console.error("Layer is undefined", {
      timelineId,
      layerId,
      availableLayers: Object.keys(timeline.layers),
      operation: { type, timelineId, layerId },
    });
    throw new Error(`Layer not found: ${layerId} in timeline ${timelineId}`);
  }

  // Убеждаемся, что у слоя есть nodes, edges и nodeIds
  if (!layer.nodes) {
    layer.nodes = {};
  }
  if (!layer.edges) {
    layer.edges = {};
  }
  if (!layer.nodeIds) {
    layer.nodeIds = [];
  }

  switch (type) {
    case "CREATE_NODE":
    case "node.added":
    case "node.added.redo":
    case "node.deleted.undo": {
      // Поддерживаем разные форматы payload
      const nodeData = payload.node || payload;
      const nodeId = nodeData.id || payload.nodeId;
      const nodeType = nodeData.type || payload.type;
      const nodeCoordinates =
        nodeData.coordinates || payload.position || payload.coordinates;
      const nodeDataContent = nodeData.data || payload.data;

      if (!nodeId) {
        console.error("Node ID is missing in operation", {
          operation,
          payload,
        });
        break;
      }

      layer.nodes[nodeId] = {
        id: nodeId,
        type: nodeType,
        coordinates: nodeCoordinates,
        data: nodeDataContent,
      };

      // Добавляем ID узла в массив nodeIds, если его там еще нет
      if (!layer.nodeIds.includes(nodeId)) {
        layer.nodeIds.push(nodeId);
      }

      // Если операция - это восстановление удаленного узла, восстанавливаем и его связи
      if (type === "node.deleted.undo" && payload.connectedLinks) {
        for (const edge of payload.connectedLinks) {
          const edgeId =
            edge.id || `${edge.startNodeId || edge.source}-${edge.endNodeId || edge.target}`;
          layer.edges[edgeId] = {
            id: edgeId,
            type: "link",
            startNodeId: edge.startNodeId,
            endNodeId: edge.endNodeId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            conditions: edge.conditions || [],
          };
        }
      }
      break;
    }

    case "DELETE_NODE":
    case "node.deleted":
    case "node.deleted.redo":
    case "node.added.undo": {
      const deleteNodeId = payload.node?.id || payload.nodeId;
      delete layer.nodes[deleteNodeId];

      // Удаляем ID узла из массива nodeIds
      layer.nodeIds = layer.nodeIds.filter((id: string) => id !== deleteNodeId);

      // Удаляем связанные рёбра
      for (const edgeId in layer.edges) {
        const edge = layer.edges[edgeId];
        if (edge.source === deleteNodeId || edge.target === deleteNodeId) {
          delete layer.edges[edgeId];
        }
      }
      break;
    }

    case "UPDATE_NODE":
    case "node.updated":
    case "node.updated.redo":
    case "node.updated.undo": {
      const updateNodeId = payload.node?.id || payload.nodeId;
      if (layer.nodes[updateNodeId]) {
        // Поддерживаем разные форматы payload
        if (payload.newData) {
          // Новый формат с oldData/newData - обновляем только измененные поля
          layer.nodes[updateNodeId].data = {
            ...layer.nodes[updateNodeId].data,
            ...payload.newData,
          };
        } else {
          // Старый формат - полная замена данных
          layer.nodes[updateNodeId].data = payload.data || payload.node?.data;
        }
      }
      break;
    }

    case "MOVE_NODE":
    case "node.moved":
    case "node.moved.redo":
    case "node.moved.undo":
    case "layer.moved.undo":
    case "layer.moved.redo": {
      const moveNodeId = payload.node?.id || payload.nodeId || payload.layerId;
      if (layer.nodes[moveNodeId]) {
        layer.nodes[moveNodeId].coordinates =
          payload.newPosition || payload.position || payload.node?.coordinates;
      }
      break;
    }

    case "CREATE_EDGE":
    case "edge.added":
    case "edge.added.redo":
    case "edge.deleted.undo": {
      // Поддерживаем разные форматы payload
      const edgeData = payload.edge || payload;
      const edgeId =
        edgeData.id ||
        payload.edgeId ||
        `${edgeData.startNodeId || edgeData.source}-${edgeData.endNodeId || edgeData.target}`;

      layer.edges[edgeId] = {
        id: edgeId,
        type: "link",
        startNodeId:
          edgeData.startNodeId || payload.connection?.source || payload.source,
        endNodeId:
          edgeData.endNodeId || payload.connection?.target || payload.target,
        sourceHandle:
          edgeData.sourceHandle ||
          payload.connection?.sourceHandle ||
          payload.sourceHandle,
        targetHandle:
          edgeData.targetHandle ||
          payload.connection?.targetHandle ||
          payload.targetHandle,
        conditions: edgeData.conditions || [],
      };
      break;
    }

    case "DELETE_EDGE":
    case "edge.deleted":
    case "edge.deleted.redo":
    case "edge.added.undo": {
      delete layer.edges[payload.edgeId];
      break;
    }

    case "UPDATE_EDGE":
    case "edge.updated":
    case "edge.updated.redo":
    case "edge.updated.undo":
    case "edge.conditions_updated": // Обработка старого типа операции
    case "edge.conditions_updated.undo":
    case "edge.conditions_updated.redo": {
      const updateEdgeId = payload.edgeId;
      if (layer.edges[updateEdgeId]) {
        // Обновляем только условия, если они переданы
        if (payload.conditions !== undefined) {
          layer.edges[updateEdgeId].conditions = payload.conditions;
        }
        // Можем добавить обновление других полей при необходимости
      }
      break;
    }

    case "CREATE_LAYER":
    case "layer.added":
    case "layer.added.redo":
    case "layer.deleted.undo": {
      // Поддерживаем разные форматы payload
      const layerData = payload.layerNode || payload;
      const newLayerId = layerData.id || payload.layerId;
      const layerName = layerData.name || payload.name || "New Layer";
      const layerPosition = layerData.coordinates || payload.position;
      const parentLayerId =
        layerData.parentLayerId || payload.parentLayerId || layerId;
      const layerDepth = layerData.depth || 1;

      // Создаем новый слой в timeline.layers
      timeline.layers[newLayerId] = {
        id: newLayerId,
        name: layerName,
        type: "layer",
        depth: layerDepth,
        parentLayerId: parentLayerId,
        nodes: {},
        edges: {},
        nodeIds: [],
      };

      // Добавляем узел слоя в родительский слой
      layer.nodes[newLayerId] = {
        id: newLayerId,
        type: "layer",
        coordinates: layerPosition,
        name: layerName,
        parentLayerId: parentLayerId,
        depth: layerDepth,
        // Копируем остальные поля из layerNode если они есть
        ...(layerData.startingNodes
          ? { startingNodes: layerData.startingNodes }
          : {}),
        ...(layerData.endingNodes
          ? { endingNodes: layerData.endingNodes }
          : {}),
      };

      // Добавляем ID слоя в массив nodeIds родительского слоя, если его там еще нет
      if (!layer.nodeIds.includes(newLayerId)) {
        layer.nodeIds.push(newLayerId);
      }
      break;
    }

    case "DELETE_LAYER":
    case "layer.deleted":
    case "layer.deleted.redo":
    case "layer.added.undo": {
      delete timeline.layers[payload.layerId];
      delete layer.nodes[payload.layerId];

      // Удаляем ID слоя из массива nodeIds родительского слоя
      layer.nodeIds = layer.nodeIds.filter(
        (id: string) => id !== payload.layerId,
      );
      break;
    }

    case "UPDATE_LAYER":
    case "layer.updated":
    case "layer.updated.redo": {
      if (timeline.layers[payload.layerId]) {
        timeline.layers[payload.layerId].name = payload.name || payload.newName;
      }
      if (layer.nodes[payload.layerId]) {
        layer.nodes[payload.layerId].name = payload.name || payload.newName;
      }
      break;
    }

    case "layer.updated.undo": {
      if (timeline.layers[payload.layerId]) {
        timeline.layers[payload.layerId].name = payload.newName;
      }
      if (layer.nodes[payload.layerId]) {
        layer.nodes[payload.layerId].name = payload.newName;
      }
      break;
    }

    case "UPDATE_VARIABLE":
    case "variable.updated":
    case "variable.updated.redo":
      const varIndex = timeline.variables.findIndex(
        (v) => v.id === payload.variableId,
      );
      if (varIndex !== -1) {
        timeline.variables[varIndex] = {
          ...timeline.variables[varIndex],
          ...payload.updates,
        };
      }
      break;

    case "variable.updated.undo": {
      const varIndexUndo = timeline.variables.findIndex(
        (v) => v.id === payload.variableId,
      );
      if (varIndexUndo !== -1) {
        timeline.variables[varIndexUndo] = {
          ...timeline.variables[varIndexUndo],
          ...payload.updates, // `updates` содержит исходные значения
        };
      }
      break;
    }

    case "CREATE_VARIABLE":
    case "variable.created":
    case "variable.deleted.undo":
      timeline.variables.push(payload.variable);
      break;

    case "DELETE_VARIABLE":
    case "variable.deleted":
    case "variable.created.undo":
      timeline.variables = timeline.variables.filter(
        (v) => v.id !== payload.variableId,
      );
      break;

    case "nodes.duplicated":
    case "nodes.duplicated.redo":
    case "nodes.cut.undo": {
      // Композитная операция для дублирования множества узлов
      const {
        nodes: duplicatedNodes,
        edges: duplicatedEdges,
        layers: duplicatedLayers,
      } = payload;

      // Добавляем все слои
      if (duplicatedLayers && Array.isArray(duplicatedLayers)) {
        for (const layerData of duplicatedLayers) {
          const newLayerId = layerData.id;
          const layerName = layerData.name || "New Layer";
          const layerPosition = layerData.coordinates;
          const parentLayerId = layerData.parentLayerId || layerId;
          const layerDepth = layerData.depth || 1;

          // Создаем новый слой в timeline.layers
          timeline.layers[newLayerId] = {
            id: newLayerId,
            name: layerName,
            type: "layer",
            depth: layerDepth,
            parentLayerId: parentLayerId,
            nodes: {},
            edges: {},
            nodeIds: [],
          };

          // Добавляем узел слоя в родительский слой
          const parentLayer =
            timeline.layers[parentLayerId] || timeline.layers.root;
          parentLayer.nodes[newLayerId] = {
            id: newLayerId,
            type: "layer",
            coordinates: layerPosition,
            name: layerName,
            parentLayerId: parentLayerId,
            depth: layerDepth,
            ...(layerData.startingNodes
              ? { startingNodes: layerData.startingNodes }
              : {}),
            ...(layerData.endingNodes
              ? { endingNodes: layerData.endingNodes }
              : {}),
          };

          // Добавляем ID слоя в массив nodeIds родительского слоя
          if (!parentLayer.nodeIds.includes(newLayerId)) {
            parentLayer.nodeIds.push(newLayerId);
          }
        }
      }

      // Добавляем все узлы
      if (duplicatedNodes && Array.isArray(duplicatedNodes)) {
        for (const nodeData of duplicatedNodes) {
          const nodeId = nodeData.id;
          const nodeType = nodeData.type;
          const nodeCoordinates = nodeData.coordinates;
          const nodeDataContent = nodeData.data || {};

          layer.nodes[nodeId] = {
            id: nodeId,
            type: nodeType,
            coordinates: nodeCoordinates,
            data: nodeDataContent,
          };

          // Добавляем ID узла в массив nodeIds, если его там еще нет
          if (!layer.nodeIds.includes(nodeId)) {
            layer.nodeIds.push(nodeId);
          }
        }
      }

      // Добавляем все связи
      if (duplicatedEdges && Array.isArray(duplicatedEdges)) {
        for (const edgeData of duplicatedEdges) {
          const edgeId = edgeData.id;

          layer.edges[edgeId] = {
            id: edgeId,
            type: "link",
            startNodeId: edgeData.startNodeId,
            endNodeId: edgeData.endNodeId,
            sourceHandle: edgeData.sourceHandle,
            targetHandle: edgeData.targetHandle,
            conditions: edgeData.conditions || [],
          };
        }
      }
      break;
    }

    case "nodes.cut":
    case "nodes.cut.redo":
    case "nodes.duplicated.undo":
    case "nodes.pasted.copy.undo":
    case "nodes.pasted.cut.undo": {
      // Композитная операция для вырезания/удаления множества узлов
      const {
        nodes: cutNodes,
        edges: cutEdges,
        layers: cutLayers,
        nodeIds: cutNodeIds,
      } = payload;

      // Удаляем все связи
      if (cutEdges && Array.isArray(cutEdges)) {
        for (const edgeData of cutEdges) {
          const edgeId = edgeData.id;
          delete layer.edges[edgeId];
        }
      }

      // Удаляем все слои
      if (cutLayers && Array.isArray(cutLayers)) {
        for (const layerData of cutLayers) {
          const layerId = layerData.id;
          delete timeline.layers[layerId];
          delete layer.nodes[layerId];

          // Удаляем ID слоя из массива nodeIds родительского слоя
          layer.nodeIds = layer.nodeIds.filter((id: string) => id !== layerId);
        }
      }

      // Удаляем все узлы
      if (cutNodes && Array.isArray(cutNodes)) {
        for (const nodeData of cutNodes) {
          const nodeId = nodeData.id;
          delete layer.nodes[nodeId];

          // Удаляем ID узла из массива nodeIds
          layer.nodeIds = layer.nodeIds.filter((id: string) => id !== nodeId);

          // Удаляем связанные рёбра
          for (const edgeId in layer.edges) {
            const edge = layer.edges[edgeId];
            if (
              edge.startNodeId === nodeId ||
              edge.endNodeId === nodeId ||
              edge.source === nodeId ||
              edge.target === nodeId
            ) {
              delete layer.edges[edgeId];
            }
          }
        }
      }

      // Также удаляем по списку ID для надежности
      if (cutNodeIds && Array.isArray(cutNodeIds)) {
        for (const nodeId of cutNodeIds) {
          delete layer.nodes[nodeId];
          layer.nodeIds = layer.nodeIds.filter((id: string) => id !== nodeId);

          // Удаляем связанные рёбра
          for (const edgeId in layer.edges) {
            const edge = layer.edges[edgeId];
            if (
              edge.startNodeId === nodeId ||
              edge.endNodeId === nodeId ||
              edge.source === nodeId ||
              edge.target === nodeId
            ) {
              delete layer.edges[edgeId];
            }
          }
        }
      }
      break;
    }

    case "nodes.pasted.copy":
    case "nodes.pasted.cut":
    case "nodes.pasted.copy.redo":
    case "nodes.pasted.cut.redo": {
      // Композитная операция для вставки узлов (после copy или cut)
      const {
        nodes: pastedNodes,
        edges: pastedEdges,
        layers: pastedLayers,
        isCutNodes: _isPastedFromCut,
      } = payload;

      // Добавляем все слои
      if (pastedLayers && Array.isArray(pastedLayers)) {
        for (const layerData of pastedLayers) {
          const newLayerId = layerData.id;
          const layerName = layerData.name || "New Layer";
          const layerPosition = layerData.coordinates;
          const parentLayerId = layerData.parentLayerId || layerId;
          const layerDepth = layerData.depth || 1;

          // Создаем новый слой в timeline.layers
          timeline.layers[newLayerId] = {
            id: newLayerId,
            name: layerName,
            type: "layer",
            depth: layerDepth,
            parentLayerId: parentLayerId,
            nodes: {},
            edges: {},
            nodeIds: [],
          };

          // Добавляем узел слоя в родительский слой
          const parentLayer =
            timeline.layers[parentLayerId] || timeline.layers.root;
          parentLayer.nodes[newLayerId] = {
            id: newLayerId,
            type: "layer",
            coordinates: layerPosition,
            name: layerName,
            parentLayerId: parentLayerId,
            depth: layerDepth,
            ...(layerData.startingNodes
              ? { startingNodes: layerData.startingNodes }
              : {}),
            ...(layerData.endingNodes
              ? { endingNodes: layerData.endingNodes }
              : {}),
          };

          // Добавляем ID слоя в массив nodeIds родительского слоя
          if (!parentLayer.nodeIds.includes(newLayerId)) {
            parentLayer.nodeIds.push(newLayerId);
          }
        }
      }

      // Добавляем все узлы
      if (pastedNodes && Array.isArray(pastedNodes)) {
        for (const nodeData of pastedNodes) {
          const nodeId = nodeData.id;
          const nodeType = nodeData.type;
          const nodeCoordinates = nodeData.coordinates;
          const nodeDataContent = nodeData.data || {};

          layer.nodes[nodeId] = {
            id: nodeId,
            type: nodeType,
            coordinates: nodeCoordinates,
            data: nodeDataContent,
          };

          // Добавляем ID узла в массив nodeIds, если его там еще нет
          if (!layer.nodeIds.includes(nodeId)) {
            layer.nodeIds.push(nodeId);
          }
        }
      }

      // Добавляем все связи
      if (pastedEdges && Array.isArray(pastedEdges)) {
        for (const edgeData of pastedEdges) {
          const edgeId = edgeData.id;

          layer.edges[edgeId] = {
            id: edgeId,
            type: "link",
            startNodeId: edgeData.startNodeId,
            endNodeId: edgeData.endNodeId,
            sourceHandle: edgeData.sourceHandle,
            targetHandle: edgeData.targetHandle,
            conditions: edgeData.conditions || [],
          };
        }
      }
      break;
    }

    case "nodes.moved":
    case "nodes.moved.redo": {
      // Композитная операция для перемещения множества узлов
      const { changes: movedNodesChanges } = payload;
      if (movedNodesChanges && Array.isArray(movedNodesChanges)) {
        for (const change of movedNodesChanges) {
          if (layer.nodes[change.nodeId]) {
            layer.nodes[change.nodeId].coordinates = change.newPosition;
          }
        }
      }
      break;
    }

    case "operation.created":
    case "operation.created.redo":
    case "operation.deleted.undo": {
      const {nodeId: opNodeId, operation: op} = payload;
      if (layer.nodes[opNodeId]) {
        if (!layer.nodes[opNodeId].operations) {
          layer.nodes[opNodeId].operations = [];
        }
        layer.nodes[opNodeId].operations.push(op);
        // Сортировка по order на случай восстановления
        layer.nodes[opNodeId].operations.sort((a: any, b: any) => a.order - b.order);
      }
      break;
    }

    case "operation.created.undo":
    case "operation.deleted":
    case "operation.deleted.redo": {
      const {nodeId: opNodeId, operationId: opId} = payload;
      if (
        layer.nodes[opNodeId] &&
        layer.nodes[opNodeId].operations
      ) {
        layer.nodes[opNodeId].operations =
          layer.nodes[opNodeId].operations.filter(
            (op: any) => op.id !== opId,
          );
      }
      break;
    }

    case "operation.updated":
    case "operation.updated.redo": {
      const {nodeId: opNodeId, operationId: opId, updates} = payload;
      if (
        layer.nodes[opNodeId] &&
        layer.nodes[opNodeId].operations
      ) {
        const opIndex = layer.nodes[opNodeId].operations.findIndex((op: any) => op.id === opId);
        if (opIndex !== -1) {
          layer.nodes[opNodeId].operations[opIndex] = {
            ...layer.nodes[opNodeId].operations[opIndex],
            ...updates,
          };
        }
      }
      break;
    }

    case "operation.updated.undo": {
      const {nodeId: opNodeId, operationId: opId, updates} = payload;
      if (
        layer.nodes[opNodeId] &&
        layer.nodes[opNodeId].operations
      ) {
        const opIndex = layer.nodes[opNodeId].operations.findIndex((op: any) => op.id === opId);
        if (opIndex !== -1) {
          layer.nodes[opNodeId].operations[opIndex] = {
            ...layer.nodes[opNodeId].operations[opIndex],
            ...updates, // updates содержат оригинальные значения
          };
        }
      }
      break;
    }

    case "operations.toggled":
    case "operations.toggled.redo": {
      const {nodeId: opNodeId, enabled} = payload;
      if (layer.nodes[opNodeId] && layer.nodes[opNodeId].operations) {
        layer.nodes[opNodeId].operations = layer.nodes[opNodeId].operations.map((op: any) => ({...op, enabled}));
      }
      break;
    }

    case "operations.toggled.undo": {
      const {nodeId: opNodeId, originalStates} = payload;
      if (layer.nodes[opNodeId] && layer.nodes[opNodeId].operations) {
        layer.nodes[opNodeId].operations = layer.nodes[opNodeId].operations.map((op: any) => {
          const original = originalStates.find((s: any) => s.id === op.id);
          return {...op, enabled: original ? original.enabled : op.enabled};
        });
      }
      break;
    }

    case "layer.endings.updated": {
      const { layerId: targetLayerId, parentLayerId, startingNodes, endingNodes } = payload;
      
      // Находим родительский слой, где нужно обновить концовки
      const parentLayer = timeline.layers[parentLayerId];
      if (!parentLayer) {
        console.warn(`Parent layer not found: ${parentLayerId} for operation layer.endings.updated`);
        break;
      }

      // Находим узел слоя в родительском слое
      const layerNode = parentLayer.nodes[targetLayerId];
      if (!layerNode || layerNode.type !== 'layer') {
        console.warn(`Layer node not found: ${targetLayerId} in parent layer ${parentLayerId}`);
        break;
      }

      // Обновляем концовки слоя, используя новые данные из операции
      layerNode.startingNodes = startingNodes.map((node: any) => ({
        ...node,
        // Используем isConnected из новых данных операции
        isConnected: node.isConnected || false
      }));

      layerNode.endingNodes = endingNodes.map((node: any) => ({
        ...node,
        // Используем isConnected из новых данных операции
        isConnected: node.isConnected || false
      }));

      console.debug(`Updated layer endings for layer ${targetLayerId} in parent ${parentLayerId}`, {
        startingNodesCount: startingNodes.length,
        endingNodesCount: endingNodes.length,
        startingConnections: startingNodes.filter((n: any) => n.isConnected).length,
        endingConnections: endingNodes.filter((n: any) => n.isConnected).length
      });
      break;
    }

    // Операции для таймлайнов
    case "timeline.created": {
      const { timeline } = payload;
      
      // Добавляем новый таймлайн в timelinesMetadata если он еще не существует
      if (!snapshot.timelinesMetadata) {
        snapshot.timelinesMetadata = [];
      }
      
      const existingTimelineIndex = snapshot.timelinesMetadata.findIndex(t => t.id === timeline.id);
      if (existingTimelineIndex === -1) {
        snapshot.timelinesMetadata.push(timeline);
      }
      
      // Инициализируем таймлайн в данных если его нет
      if (!snapshot.timelines[timeline.id]) {
        snapshot.timelines[timeline.id] = {
          layers: {
            root: {
              id: "root",
              name: "Main layer",
              nodes: {},
              edges: {},
              nodeIds: [],
            },
          },
          metadata: {},
          variables: [],
        };
      }
      break;
    }

    case "timeline.renamed": {
      const { timelineId, newName } = payload;
      
      // Обновляем имя в timelinesMetadata
      if (snapshot.timelinesMetadata) {
        const timelineIndex = snapshot.timelinesMetadata.findIndex(t => t.id === timelineId);
        if (timelineIndex !== -1) {
          snapshot.timelinesMetadata[timelineIndex].name = newName;
        }
      }
      break;
    }

    case "timeline.deleted": {
      const { timeline } = payload;
      
      // Удаляем из timelinesMetadata
      if (snapshot.timelinesMetadata) {
        snapshot.timelinesMetadata = snapshot.timelinesMetadata.filter(t => t.id !== timeline.id);
      }
      
      // Удаляем данные таймлайна
      delete snapshot.timelines[timeline.id];
      break;
    }

    case "timeline.duplicated": {
      const { newTimeline } = payload;
      
      // Добавляем новый таймлайн в timelinesMetadata
      if (!snapshot.timelinesMetadata) {
        snapshot.timelinesMetadata = [];
      }
      
      const existingTimelineIndex = snapshot.timelinesMetadata.findIndex(t => t.id === newTimeline.id);
      if (existingTimelineIndex === -1) {
        snapshot.timelinesMetadata.push(newTimeline);
      }
      
      // Инициализируем таймлайн в данных если его нет
      if (!snapshot.timelines[newTimeline.id]) {
        snapshot.timelines[newTimeline.id] = {
          layers: {
            root: {
              id: "root",
              name: "Main layer",
              nodes: {},
              edges: {},
              nodeIds: [],
            },
          },
          metadata: {},
          variables: [],
        };
      }
      break;
    }

    default:
      console.warn(`Unknown operation type: ${type}`);
  }
}

/**
 * Валидирует операцию
 */
export function validateOperation(operation: Operation): boolean {
  if (
    !operation.id ||
    !operation.type ||
    !operation.timelineId ||
    !operation.layerId
  ) {
    return false;
  }

  if (!operation.timestamp || !operation.deviceId) {
    return false;
  }

  if (!operation.payload || typeof operation.payload !== "object") {
    return false;
  }

  return true;
}

/**
 * Создает пустой снимок графа
 */
export function createEmptySnapshot(projectId: string): GraphSnapshot {
  return {
    timelines: {
      "base-timeline": {
        layers: {
          root: {
            id: "root",
            name: "Main layer",
            nodes: {},
            edges: {},
            nodeIds: [],
          },
        },
        metadata: {},
        variables: [],
      },
    },
    timelinesMetadata: [
      {
        id: "base-timeline",
        name: "Main Timeline",
        createdAt: Date.now(),
        isActive: true,
      },
    ],
    projectId,
    projectName: "Untitled",
    _lastModified: Date.now(),
  };
}
