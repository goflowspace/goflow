import React, {MouseEvent, TouchEvent, useCallback, useRef} from 'react';

import {Edge, Node, useReactFlow} from '@xyflow/react';
import {getCommandManager} from 'src/commands/CommandManager';

import {useCanvasStore} from '@store/useCanvasStore';
import {useEditorSettingsStore} from '@store/useEditorSettingsStore';
import {useGraphStore} from '@store/useGraphStore';

import {getColorScheme} from '../utils/colorSchemes';
import {AUTO_CONNECT, NODE_WIDTHS} from '../utils/constants';

// --- Quadtree Implementation ---
interface Point {
  x: number;
  y: number;
  node: Node;
}

interface Boundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

class QuadTree {
  private boundary: Boundary;
  private capacity: number;
  private points: Point[] = [];
  private divided = false;
  private northeast!: QuadTree;
  private northwest!: QuadTree;
  private southeast!: QuadTree;
  private southwest!: QuadTree;

  constructor(boundary: Boundary, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
  }

  subdivide() {
    const {x, y, width, height} = this.boundary;
    const hw = width / 2;
    const hh = height / 2;

    const ne = {x: x + hw, y: y, width: hw, height: hh};
    this.northeast = new QuadTree(ne, this.capacity);
    const nw = {x: x, y: y, width: hw, height: hh};
    this.northwest = new QuadTree(nw, this.capacity);
    const se = {x: x + hw, y: y + hh, width: hw, height: hh};
    this.southeast = new QuadTree(se, this.capacity);
    const sw = {x: x, y: y + hh, width: hw, height: hh};
    this.southwest = new QuadTree(sw, this.capacity);

    this.divided = true;
  }

  insert(point: Point): boolean {
    if (!this.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }
    if (!this.divided) {
      this.subdivide();
    }
    if (this.northeast.insert(point)) return true;
    if (this.northwest.insert(point)) return true;
    if (this.southeast.insert(point)) return true;
    if (this.southwest.insert(point)) return true;

    return false;
  }

  query(range: Boundary, found: Point[] = []): Point[] {
    if (!this.intersects(range)) {
      return found;
    }

    for (const p of this.points) {
      if (range.x < p.x && p.x < range.x + range.width && range.y < p.y && p.y < range.y + range.height) {
        found.push(p);
      }
    }

    if (this.divided) {
      this.northwest.query(range, found);
      this.northeast.query(range, found);
      this.southwest.query(range, found);
      this.southeast.query(range, found);
    }

    return found;
  }

  contains(point: Point) {
    return point.x >= this.boundary.x && point.x <= this.boundary.x + this.boundary.width && point.y >= this.boundary.y && point.y <= this.boundary.y + this.boundary.height;
  }

  intersects(range: Boundary) {
    return !(
      range.x > this.boundary.x + this.boundary.width ||
      range.x + range.width < this.boundary.x ||
      range.y > this.boundary.y + this.boundary.height ||
      range.y + range.height < this.boundary.y
    );
  }
}
// --- End Quadtree Implementation ---

// Поддерживаемые типы узлов для типизации
type NodeType = 'narrative' | 'choice' | 'layer' | 'note' | string;

interface UseAutoConnectOnDragProps {
  isPanningRef?: React.MutableRefObject<boolean>;
}

export const useAutoConnectOnDrag = ({isPanningRef}: UseAutoConnectOnDragProps = {}) => {
  const {getInternalNode} = useReactFlow();
  const commandManager = getCommandManager();

  // Refs for performance optimization
  const domCacheRef = useRef<Map<string, any>>(new Map());
  const quadTreeRef = useRef<QuadTree | null>(null);
  const isDraggingRef = useRef(false);
  const tempEdgeRef = useRef<Edge | null>(null);
  const updateCounterRef = useRef(0);

  /**
   * Получает ширину узла по его типу
   */
  const getNodeWidth = (nodeType: NodeType): number => {
    return nodeType in NODE_WIDTHS ? NODE_WIDTHS[nodeType as keyof typeof NODE_WIDTHS] : NODE_WIDTHS.narrative;
  };

  // --- DOM Cache Logic ---
  const buildDomCache = useCallback((nodes: Node[]) => {
    domCacheRef.current.clear();
    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) return;

    for (const node of nodes) {
      if (node.type !== 'layer') continue;

      const layerElement = viewport.querySelector(`[data-reactflow-nodeid="${node.id}"]`);
      if (!layerElement) continue;

      const layerRect = layerElement.getBoundingClientRect();
      const cacheEntry: any = {layerRect};

      const startPanel = layerElement.querySelector('.endings_popup__start');
      if (startPanel) {
        cacheEntry.startPanelRect = startPanel.getBoundingClientRect();
      }

      const endPanel = layerElement.querySelector('.endings_popup__end');
      if (endPanel) {
        cacheEntry.endPanelRect = endPanel.getBoundingClientRect();
      }

      const miniPinElement = layerElement.querySelector('.node_item');
      if (miniPinElement) {
        cacheEntry.miniPinHeight = miniPinElement.getBoundingClientRect().height + 6;
      }

      domCacheRef.current.set(node.id, cacheEntry);
    }
  }, []);

  /**
   * Получает реальную позицию ending панели через DOM API
   */
  const getEndingsPanelActualPosition = (layerNodeId: string, miniPinType: 'starting' | 'ending'): {offsetY: number} | null => {
    const cache = domCacheRef.current.get(layerNodeId);
    if (!cache || !cache.layerRect) return null;

    const panelRect = miniPinType === 'starting' ? cache.startPanelRect : cache.endPanelRect;
    if (!panelRect) return null;

    return {
      offsetY: panelRect.top - cache.layerRect.top
    };
  };

  /**
   * Получает реальную высоту элемента мини-пина через DOM API
   */
  const getMiniPinActualHeight = (layerNodeId: string): number => {
    const cache = domCacheRef.current.get(layerNodeId);
    if (cache && cache.miniPinHeight) {
      return cache.miniPinHeight;
    }
    return AUTO_CONNECT.MINI_PIN_ITEM_HEIGHT; // fallback
  };

  // --- Quadtree Logic ---
  const buildQuadTree = useCallback(
    (nodes: Node[]) => {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      const nodesWithPositions = nodes
        .map((node) => ({
          node,
          internalNode: getInternalNode(node.id)
        }))
        .filter((item) => item.internalNode?.internals.positionAbsolute);

      if (nodesWithPositions.length === 0) {
        quadTreeRef.current = null;
        return;
      }

      for (const {node, internalNode} of nodesWithPositions) {
        const pos = internalNode!.internals.positionAbsolute;
        const width = internalNode!.width || getNodeWidth(node.type as NodeType);
        const height = internalNode!.height || 155;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + width);
        maxY = Math.max(maxY, pos.y + height);
      }

      const padding = 500;
      const boundary = {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2
      };
      const qt = new QuadTree(boundary, 4);

      for (const {node, internalNode} of nodesWithPositions) {
        const pos = internalNode!.internals.positionAbsolute;
        qt.insert({x: pos.x, y: pos.y, node});
      }
      quadTreeRef.current = qt;
    },
    [getInternalNode]
  );

  /**
   * Определяет, можно ли соединить draggedNode с targetNode, проверяя "мёртвую зону".
   * Соединение допустимо только при соблюдении направления пинов.
   */
  const isConnectionDirectionInValid = (draggedType: string, draggedTopLeft: {x: number}, targetType: string, targetTopLeft: {x: number}) => {
    const draggedNodeWidth = getNodeWidth(draggedType);
    const targetNodeWidth = getNodeWidth(targetType);

    const draggedInputX = draggedTopLeft.x - draggedNodeWidth / 2 + AUTO_CONNECT.PIN_OFFSET;
    const draggedOutputX = draggedTopLeft.x + draggedNodeWidth / 2 - AUTO_CONNECT.PIN_OFFSET;
    const targetInputX = targetTopLeft.x - targetNodeWidth / 2 + AUTO_CONNECT.PIN_OFFSET;
    const targetOutputX = targetTopLeft.x + targetNodeWidth / 2 - AUTO_CONNECT.PIN_OFFSET;

    // Мёртвая зона — когда пины перекрываются по X
    return draggedInputX < targetOutputX && draggedOutputX > targetInputX;
  };

  /**
   * Получает информацию о мини-пинах слоя (startingNodes и endingNodes)
   */
  const getLayerMiniPins = useCallback((nodeId: string) => {
    const {layers, currentGraphId} = useGraphStore.getState();
    const layer = layers[currentGraphId];

    if (!layer || !layer.nodes[nodeId] || layer.nodes[nodeId].type !== 'layer') {
      return {startingNodes: [], endingNodes: []};
    }

    const layerNode = layer.nodes[nodeId] as any;
    return {
      startingNodes: layerNode.startingNodes || [],
      endingNodes: layerNode.endingNodes || []
    };
  }, []);

  /**
   * Рассчитывает расстояние между двумя точками
   */
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Рассчитывает позицию мини-пина на слое
   */
  const calculateMiniPinPosition = (
    layerTopLeft: {x: number; y: number},
    layerWidth: number,
    layerHeight: number,
    miniPinIndex: number,
    miniPinType: 'starting' | 'ending',
    layerId: string,
    totalMiniPins: number = 1
  ): {x: number; y: number} => {
    const actualMiniPinHeight = getMiniPinActualHeight(layerId);

    if (miniPinType === 'starting') {
      // Стартовые пины размещаются сверху вниз от верха слоя
      // Пытаемся получить реальную позицию starting панели
      const panelPosition = getEndingsPanelActualPosition(layerId, 'starting');
      const startY = panelPosition ? layerTopLeft.y + panelPosition.offsetY : layerTopLeft.y;

      return {
        x: layerTopLeft.x - AUTO_CONNECT.MINI_PIN_OFFSET_LEFT,
        y: startY + miniPinIndex * actualMiniPinHeight
      };
    } else {
      // Конечные пины размещаются в нижней части слоя
      // Пытаемся получить реальную позицию ending панели
      const panelPosition = getEndingsPanelActualPosition(layerId, 'ending');

      let startY: number;
      if (panelPosition) {
        // Используем реальную позицию панели
        startY = layerTopLeft.y + panelPosition.offsetY;
      } else {
        // Fallback: размещаем снизу вверх от нижнего края слоя
        const totalEndingPinsHeight = totalMiniPins * actualMiniPinHeight;
        startY = layerTopLeft.y + layerHeight - totalEndingPinsHeight;
      }

      return {
        x: layerTopLeft.x + layerWidth + AUTO_CONNECT.MINI_PIN_OFFSET_LEFT,
        y: startY + miniPinIndex * actualMiniPinHeight
      };
    }
  };

  /**
   * Обновляет информацию о ближайшем мини-пине, если найден более близкий
   */
  const updateClosestMiniPin = (
    current: {node: Node | null; distance: number; miniPinId: string | null; isTargetHandle: boolean},
    candidate: Node,
    distance: number,
    miniPinId: string,
    isTargetHandle: boolean
  ) => {
    if (distance < current.distance && distance < AUTO_CONNECT.CONNECT_DISTANCE) {
      current.node = candidate;
      current.distance = distance;
      current.miniPinId = miniPinId;
      current.isTargetHandle = isTargetHandle;
    }
  };

  /**
   * Проверяет, подключен ли мини-пин к конкретному узлу
   */
  const isMiniPinConnectedToNode = useCallback((miniPin: any, targetNodeId: string, allEdges: Edge[]): boolean => {
    if (!miniPin.connectionIds || miniPin.connectionIds.length === 0) {
      return false;
    }

    // Проверяем, есть ли среди связей мини-пина связь с указанным узлом
    return miniPin.connectionIds.some((connectionId: string) => {
      const edge = allEdges.find((e) => e.id === connectionId);
      return edge && (edge.source === targetNodeId || edge.target === targetNodeId);
    });
  }, []);

  /**
   * Обрабатывает список мини-пинов и находит ближайший для подключения
   */
  const processMiniPins = (
    miniPins: any[],
    miniPinType: 'starting' | 'ending',
    layerNode: Node,
    layerTopLeft: {x: number; y: number},
    layerWidth: number,
    layerHeight: number,
    targetNode: Node,
    targetTopLeft: {x: number; y: number},
    targetWidth: number,
    closestMiniPin: {node: Node | null; distance: number; miniPinId: string | null; isTargetHandle: boolean},
    isFromDraggedLayer: boolean = false
  ) => {
    for (const miniPin of miniPins) {
      if (miniPin && miniPin.isConnected) continue; // Пропускаем уже подключенные

      const miniPinIndex = miniPins.findIndex((p: any) => p.id === miniPin.id);
      const miniPinPosition = calculateMiniPinPosition(
        layerTopLeft,
        layerWidth,
        layerHeight,
        miniPinIndex,
        miniPinType,
        layerNode.id,
        miniPins.length // Передаем общее количество мини-пинов
      );

      let targetX: number, targetY: number;
      let isTargetHandle: boolean;

      if (isFromDraggedLayer) {
        // Перетаскиваем слой - подключаемся к обычным пинам других узлов
        if (targetNode.type !== 'layer') {
          if (miniPinType === 'starting') {
            // Стартовые мини-пины подключаются к source пинам
            targetX = targetTopLeft.x + targetWidth + AUTO_CONNECT.PIN_OFFSET;
            targetY = targetTopLeft.y + AUTO_CONNECT.PIN_OFFSET_TOP;
            isTargetHandle = true;
          } else {
            // Конечные мини-пины подключаются к target пинам
            targetX = targetTopLeft.x - AUTO_CONNECT.PIN_OFFSET;
            targetY = targetTopLeft.y + AUTO_CONNECT.PIN_OFFSET_TOP;
            isTargetHandle = false;
          }

          const distance = calculateDistance(miniPinPosition.x, miniPinPosition.y, targetX, targetY);
          updateClosestMiniPin(closestMiniPin, targetNode, distance, miniPin.id, isTargetHandle);
        }
      } else {
        // Перетаскиваем обычный узел - подключаемся к мини-пинам слоя
        if (miniPinType === 'starting') {
          // Подключаемся к стартовому мини-пину слоя (target handle)
          targetX = targetTopLeft.x + targetWidth + AUTO_CONNECT.PIN_OFFSET;
          targetY = targetTopLeft.y + AUTO_CONNECT.PIN_OFFSET_TOP;
          isTargetHandle = true;
        } else {
          // Подключаемся к конечному мини-пину слоя (source handle)
          targetX = targetTopLeft.x - AUTO_CONNECT.PIN_OFFSET;
          targetY = targetTopLeft.y + AUTO_CONNECT.PIN_OFFSET_TOP;
          isTargetHandle = false;
        }

        const distance = calculateDistance(miniPinPosition.x, miniPinPosition.y, targetX, targetY);
        updateClosestMiniPin(closestMiniPin, layerNode, distance, miniPin.id, isTargetHandle);
      }
    }
  };

  /**
   * Главная логика определения ближайшего узла, к которому можно подключиться.
   * Возвращает временное Edge-соединение или null, если подключение недопустимо.
   */
  const getClosestEdge = useCallback(
    (draggedNode: Node, allEdges: Edge[]): Edge | null => {
      const internalDragged = getInternalNode(draggedNode.id);
      if (!internalDragged || draggedNode.type === 'note' || !quadTreeRef.current) return null;

      const draggedTopLeft = internalDragged.internals.positionAbsolute;
      const draggedNodeWidth = getNodeWidth(draggedNode.type as NodeType);
      const draggedNodeHeight = internalDragged.measured.height || 155;

      const closestRegularNode = {node: null as Node | null, distance: Number.MAX_VALUE, miniPinId: null as string | null, isTargetHandle: false};
      const closestLayerMiniPin = {node: null as Node | null, distance: Number.MAX_VALUE, miniPinId: null as string | null, isTargetHandle: false};

      const queryRange = {
        x: draggedTopLeft.x - AUTO_CONNECT.CONNECT_DISTANCE - 200,
        y: draggedTopLeft.y - AUTO_CONNECT.CONNECT_DISTANCE - 200,
        width: draggedNodeWidth + (AUTO_CONNECT.CONNECT_DISTANCE + 200) * 2,
        height: draggedNodeHeight + (AUTO_CONNECT.CONNECT_DISTANCE + 200) * 2
      };

      const candidatePoints = quadTreeRef.current.query(queryRange);
      const candidates = candidatePoints.map((p) => p.node);

      for (const candidate of candidates) {
        if (candidate.id === draggedNode.id || candidate.type === 'note' || (draggedNode.type === 'choice' && candidate.type === 'choice')) {
          continue;
        }

        const internalCandidate = getInternalNode(candidate.id);
        if (!internalCandidate) continue;

        const candidateTopLeft = internalCandidate.internals.positionAbsolute;
        const candidateNodeWidth = getNodeWidth(candidate.type as NodeType);

        if (draggedNode.type !== 'layer' && candidate.type !== 'layer') {
          const isDraggingLeftSide = draggedTopLeft.x < candidateTopLeft.x;
          const dx = isDraggingLeftSide
            ? candidateTopLeft.x - AUTO_CONNECT.PIN_OFFSET - AUTO_CONNECT.PIN_WIDTH - (draggedTopLeft.x + draggedNodeWidth + AUTO_CONNECT.PIN_OFFSET + AUTO_CONNECT.PIN_WIDTH)
            : candidateTopLeft.x + candidateNodeWidth + AUTO_CONNECT.PIN_OFFSET + AUTO_CONNECT.PIN_WIDTH - (draggedTopLeft.x - AUTO_CONNECT.PIN_OFFSET - AUTO_CONNECT.PIN_WIDTH);
          const dy = candidateTopLeft.y + AUTO_CONNECT.PIN_OFFSET_TOP - (draggedTopLeft.y + AUTO_CONNECT.PIN_OFFSET_TOP);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < closestRegularNode.distance && dist < AUTO_CONNECT.CONNECT_DISTANCE) {
            closestRegularNode.node = candidate;
            closestRegularNode.distance = dist;
          }
        }

        if (candidate.type === 'layer') {
          const {startingNodes, endingNodes} = getLayerMiniPins(candidate.id);
          const hasAnyConnectedStartingPinToThisNode = startingNodes.some((pin: any) => isMiniPinConnectedToNode(pin, draggedNode.id, allEdges));
          if (!hasAnyConnectedStartingPinToThisNode) {
            processMiniPins(
              startingNodes,
              'starting',
              candidate,
              candidateTopLeft,
              candidateNodeWidth,
              internalCandidate.measured.height || 155,
              draggedNode,
              draggedTopLeft,
              draggedNodeWidth,
              closestLayerMiniPin
            );
          }
          const hasAnyConnectedEndingPinToThisNode = endingNodes.some((pin: any) => isMiniPinConnectedToNode(pin, draggedNode.id, allEdges));
          if (!hasAnyConnectedEndingPinToThisNode) {
            processMiniPins(
              endingNodes,
              'ending',
              candidate,
              candidateTopLeft,
              candidateNodeWidth,
              internalCandidate.measured.height || 155,
              draggedNode,
              draggedTopLeft,
              draggedNodeWidth,
              closestLayerMiniPin
            );
          }
        }

        if (draggedNode.type === 'layer') {
          const {startingNodes, endingNodes} = getLayerMiniPins(draggedNode.id);
          const hasAnyConnectedStartingPinToThisNode = startingNodes.some((pin: any) => isMiniPinConnectedToNode(pin, candidate.id, allEdges));
          if (!hasAnyConnectedStartingPinToThisNode) {
            processMiniPins(startingNodes, 'starting', draggedNode, draggedTopLeft, draggedNodeWidth, draggedNodeHeight, candidate, candidateTopLeft, candidateNodeWidth, closestLayerMiniPin, true);
          }
          const hasAnyConnectedEndingPinToThisNode = endingNodes.some((pin: any) => isMiniPinConnectedToNode(pin, candidate.id, allEdges));
          if (!hasAnyConnectedEndingPinToThisNode) {
            processMiniPins(endingNodes, 'ending', draggedNode, draggedTopLeft, draggedNodeWidth, draggedNodeHeight, candidate, candidateTopLeft, candidateNodeWidth, closestLayerMiniPin, true);
          }
        }
      }

      const closest = closestRegularNode.distance <= closestLayerMiniPin.distance ? closestRegularNode : closestLayerMiniPin;
      if (!closest.node) return null;

      const internalTarget = getInternalNode(closest.node.id);
      if (!internalTarget) return null;

      const targetTopLeft = internalTarget.internals.positionAbsolute;

      // Для обычных пинов проверяем мёртвую зону
      if (!closest.miniPinId && isConnectionDirectionInValid(draggedNode.type as string, draggedTopLeft, closest.node.type as string, targetTopLeft)) {
        return null;
      }

      // Определяем source и target для edge
      let source = '';
      let target = '';
      let sourceHandle: string | null = null;
      let targetHandle: string | null = null;

      // Если это связь с мини-пином
      if (closest.miniPinId) {
        // Если перетаскиваем слой и подключаемся его мини-пином
        if (draggedNode.type === 'layer') {
          if (closest.isTargetHandle) {
            // Мини-пин - это target handle (входящий)
            source = closest.node.id;
            target = draggedNode.id;
            targetHandle = closest.miniPinId;
          } else {
            // Мини-пин - это source handle (исходящий)
            source = draggedNode.id;
            target = closest.node.id;
            sourceHandle = closest.miniPinId;
          }
        }
        // Если перетаскиваем НЕ слой и подключаемся к мини-пину слоя
        else {
          if (closest.isTargetHandle) {
            // Мини-пин - это target handle (входящий)
            source = draggedNode.id;
            target = closest.node.id;
            targetHandle = closest.miniPinId;
          } else {
            // Мини-пин - это source handle (исходящий)
            source = closest.node.id;
            target = draggedNode.id;
            sourceHandle = closest.miniPinId;
          }
        }
      }
      // Обычное соединение для не-слоев
      else {
        source = draggedTopLeft.x < targetTopLeft.x ? draggedNode.id : closest.node.id;
        target = draggedTopLeft.x < targetTopLeft.x ? closest.node.id : draggedNode.id;
      }

      // Проверяем, существует ли уже постоянное соединение между этими узлами
      const existingConnection = allEdges.find((e) => !e.className && e.source === source && e.target === target && e.sourceHandle === sourceHandle && e.targetHandle === targetHandle);

      if (existingConnection) {
        return null;
      }

      // Проверка для обычных связей (без мини-пинов)
      if (!sourceHandle && !targetHandle) {
        // Проверяем, существуют ли уже соединения от source или к target
        const hasOutgoing = allEdges.some((e) => e.source === source && !e.className);
        const hasIncoming = allEdges.some((e) => e.target === target && !e.className);

        if (hasOutgoing || hasIncoming) return null;
      }

      return {
        id: `temp-edge-${source}-${target}${sourceHandle ? `-${sourceHandle}` : ''}${targetHandle ? `-${targetHandle}` : ''}`,
        source,
        target,
        sourceHandle,
        targetHandle,
        className: 'temp',
        type: 'custom'
      };
    },
    [getInternalNode, getLayerMiniPins, isMiniPinConnectedToNode]
  );

  /**
   * Обновляет временную связь в состоянии, если ближайший узел изменился.
   */
  const updateTempEdge = useCallback(
    (node: Node) => {
      // Проверяем настройку linkSnapping - если отключена, не создаем временные связи
      const {linkSnapping, canvasColor, linkThickness, linkStyle} = useEditorSettingsStore.getState();
      if (!linkSnapping) {
        // Если снеппинг отключен, очищаем временные связи
        const {edges} = useCanvasStore.getState();
        const edgesWithoutTemp = edges.filter((e) => !e.id.startsWith('temp-edge-'));
        useCanvasStore.setState({edges: edgesWithoutTemp});
        tempEdgeRef.current = null;
        return;
      }

      // Обновляем счетчик для тротлинга
      updateCounterRef.current = (updateCounterRef.current + 1) % AUTO_CONNECT.THROTTLE_FACTOR;
      // Проверяем временную связь только каждые N перемещений (для плавности)
      const shouldSkipUpdate = updateCounterRef.current !== 0;

      // Получаем текущее состояние
      const {nodes, edges} = useCanvasStore.getState();

      // Ищем ближайший узел для соединения
      const closestEdge = getClosestEdge(node, edges);

      // Если не нашли подходящий узел для соединения, удаляем временную связь
      if (!closestEdge) {
        if (tempEdgeRef.current) {
          tempEdgeRef.current = null;
          const edgesWithoutTemp = edges.filter((e) => !e.id.startsWith('temp-edge-'));
          useCanvasStore.setState({edges: edgesWithoutTemp});
        }
        return;
      }

      // Если это тот же узел, что и в текущей временной связи, и мы должны пропустить обновление, то пропускаем
      if (
        shouldSkipUpdate &&
        tempEdgeRef.current &&
        tempEdgeRef.current.source === closestEdge.source &&
        tempEdgeRef.current.target === closestEdge.target &&
        tempEdgeRef.current.sourceHandle === closestEdge.sourceHandle &&
        tempEdgeRef.current.targetHandle === closestEdge.targetHandle
      ) {
        return;
      }

      // Получаем цветовую схему для текущего цвета холста
      const colorScheme = getColorScheme(canvasColor);

      // Конфигурация для различных типов толщины связи
      const thicknessConfig: Record<string, number> = {
        thin: 1.5,
        regular: 2.5,
        thick: 3.5
      };

      // Конфигурация для различных типов шаблонов штриховки
      const dashPatternConfig: Record<string, Record<string, string>> = {
        thin: {
          dash: '6 5',
          solid: '5 5'
        },
        regular: {
          dash: '8 6',
          solid: '6 6'
        },
        thick: {
          dash: '10 7',
          solid: '7 7'
        }
      };

      // Определяем базовую толщину связи из конфигурации
      const baseThickness = thicknessConfig[linkThickness] || thicknessConfig.thin;

      // Определяем паттерн штриховки из конфигурации
      const dashPattern = dashPatternConfig[linkThickness]?.[linkStyle] || '5 5';

      // Создаем временное ребро
      const tempEdge: Edge = {
        ...closestEdge,
        style: {
          stroke: colorScheme.edgeColors.temp,
          strokeWidth: baseThickness,
          strokeDasharray: dashPattern,
          opacity: 0.7
        }
      };

      // Обновляем временный Edge reference
      tempEdgeRef.current = tempEdge;

      // Обновляем состояние с новым временным ребром
      const edgesWithoutTemp = edges.filter((e) => !e.id.startsWith('temp-edge-'));
      useCanvasStore.setState({edges: [...edgesWithoutTemp, tempEdge]});
    },
    [getClosestEdge]
  );

  /**
   * Подтверждает временную связь и сохраняет её как постоянную.
   */
  const confirmEdge = useCallback(() => {
    // Проверяем настройку linkSnapping - если отключена, не создаем постоянные связи
    const linkSnapping = useEditorSettingsStore.getState().linkSnapping;
    if (!linkSnapping) {
      // Если снеппинг отключен, просто очищаем временные ребра
      const {edges} = useCanvasStore.getState();
      const edgesWithoutTemp = edges.filter((e) => e.className !== 'temp');
      useCanvasStore.setState({edges: edgesWithoutTemp});
      tempEdgeRef.current = null;
      return;
    }

    const tempEdge = tempEdgeRef.current;
    tempEdgeRef.current = null; // Сбрасываем ref

    const {nodes, edges} = useCanvasStore.getState();

    // Если по какой-то причине временного ребра нет, просто очищаем store от других временных
    if (!tempEdge) {
      const edgesWithoutTemp = edges.filter((e) => e.className !== 'temp');
      useCanvasStore.setState({edges: edgesWithoutTemp});
      return;
    }

    // Проверяем, существует ли уже постоянная связь
    const existingConnection = edges.find(
      (e) => !e.className && e.source === tempEdge.source && e.target === tempEdge.target && e.sourceHandle === tempEdge.sourceHandle && e.targetHandle === tempEdge.targetHandle
    );

    // Если соединение уже есть, просто удаляем временное
    if (existingConnection) {
      const edgesWithoutTemp = edges.filter((e) => e.className !== 'temp');
      useCanvasStore.setState({edges: edgesWithoutTemp});
      return;
    }

    const connection = {
      source: tempEdge.source,
      target: tempEdge.target,
      sourceHandle: tempEdge.sourceHandle || null,
      targetHandle: tempEdge.targetHandle || null
    };

    const sourceNode = nodes.find((n) => n.id === tempEdge.source);

    // 1. Вызываем команду для поддержки undo/redo
    if (sourceNode && sourceNode.type === 'choice') {
      commandManager.connectChoiceNode(connection);
    } else {
      commandManager.connectNarrativeNode(connection);
    }

    // 2. Теперь, когда постоянная связь добавлена в store, получаем актуальный список
    //    и удаляем из него временную связь, чтобы избежать дублирования
    const updatedEdges = useCanvasStore.getState().edges;
    const finalEdges = updatedEdges.filter((e) => e.className !== 'temp');
    useCanvasStore.setState({edges: finalEdges});
  }, [commandManager]);

  /**
   * Обрабатывает перемещение узлов
   */
  const onNodeDrag = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      // Отключаем AutoConnect во время панорамирования для улучшения производительности
      if (isPanningRef && isPanningRef.current) {
        return;
      }

      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        const {nodes} = useCanvasStore.getState();
        buildDomCache(nodes);
        buildQuadTree(nodes);
      }
      updateTempEdge(node);
    },
    [isPanningRef, buildDomCache, buildQuadTree, updateTempEdge]
  );

  /**
   * Подтверждает соединение после отпускания узла.
   */
  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      // Отключаем AutoConnect во время панорамирования для улучшения производительности
      if (isPanningRef && isPanningRef.current) {
        return;
      }
      confirmEdge();

      isDraggingRef.current = false;
      domCacheRef.current.clear();
      quadTreeRef.current = null;
    },
    [isPanningRef, confirmEdge]
  );

  return {
    onNodeDrag,
    onNodeDragStop
  };
};
