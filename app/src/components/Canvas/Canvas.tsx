'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {useParams, useRouter} from 'next/navigation';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {Theme} from '@radix-ui/themes';
import {api} from '@services/api';
import {Background, BackgroundVariant, MiniMap, Node, PanOnScrollMode, ReactFlow, SelectionMode, useReactFlow} from '@xyflow/react';
import cls from 'classnames';
import {nanoid} from 'nanoid';
import {getCommandManager} from 'src/commands/CommandManager';
import {useWebSocket} from 'src/contexts/WebSocketContext';
// Импорт хуков из нового структурированного каталога
import {useCanvasEvents, useCommandHandlers, useNodeDragHandlers, useViewportControls, useViewportSync} from 'src/hooks/canvas';
import {useAISuggestions} from 'src/hooks/useAI';
// Импорт других хуков
import {useAutoConnectOnDrag} from 'src/hooks/useAutoConnectOnDrag';
import {useBrowserHotkeysBlocker} from 'src/hooks/useBrowserHotkeysBlocker';
import {useCommentCreation} from 'src/hooks/useCommentCreation';
import {AI_FILL_ACTIVATION_EVENT, useGlobalHotkeys} from 'src/hooks/useGlobalHotkeys';
import {useNotebookHotkeys} from 'src/hooks/useNotebookHotkeys';
import {usePresence} from 'src/hooks/usePresence';
import {useProjectedMousePosition} from 'src/hooks/useProjectedMousePosition';
import {useSearchHotkeys} from 'src/hooks/useSearchHotkeys';
import {useTimelinesInitialization} from 'src/hooks/useTimelinesInitialization';
import {useToolDragDrop} from 'src/hooks/useToolDragDrop';
import {useToolInteractionOnCanvas} from 'src/hooks/useToolInteractionOnCanvas';
import {useUndoRedoKeyboardShortcuts} from 'src/hooks/useUndoRedoKeyboardShortcuts';
import {trackCanvasAIFillNode, trackEditorSettingsOnProjectOpen} from 'src/services/analytics';
import {useCursorTracking} from 'src/utils/cursorTracking';
import {openHTMLPreview} from 'src/utils/htmlPreview';
import {clearNodeCache} from 'src/utils/nodeUtils';

// Импорт сторов
import {useCanvasStore} from '@store/useCanvasStore';
import {useEditorSettingsStore} from '@store/useEditorSettingsStore';
import {useGraphStore} from '@store/useGraphStore';
import {useProjectStore} from '@store/useProjectStore';
import {useTeamStore} from '@store/useTeamStore';
import {useToolStore} from '@store/useToolsStore';
import {useVariablesStore} from '@store/useVariablesStore';

import {CommentsManager} from '@components/Comments';
// Импорт компонентов
import {ConditionModal} from '@components/Conditions/ConditionModal';
import ConditionsPreviewOverlay from '@components/Conditions/ConditionsPreviewOverlay';
import ZoomControlsWithPercentage from '@components/CustomControls/CustomControls';
import LayerHighlight from '@components/LayerPanel/LayerHighlight';
import {getNotificationManager} from '@components/Notifications';
import ChoiceNodeGhost from '@components/nodes/ChoiceNode/ChoiceNodeGhost';
import CommentNodeGhost from '@components/nodes/CommentNode/CommentNodeGhost';
import LayerNodeGhost from '@components/nodes/LayerNode/LayerNodeGhost';
import NarrativeNodeGhost from '@components/nodes/NarrativeNode/NarrativeNodeGhost';
import NoteNodeGhost from '@components/nodes/NoteNode/NoteNodeGhost';
import NodeContextMenu from '@components/nodes/shared/NodeContextMenu';

import {AILoadingProvider} from '../../contexts/AILoadingContext';
// Добавляем импорт хука useCanvasSettings
import {useCanvasSettings} from '../../hooks/CanvasSettingsContext';
import {useCreditsRefresh} from '../../hooks/useCreditsRefresh';
// Импорт утилит
import {useGraphCanvasSync} from '../../hooks/useGraphCanvasSync';
// Импорт сервисов
import {useProject, useProjectBeforeUnload} from '../../hooks/useProject';
import {AIFillService} from '../../services/aiFillService';
// Импорт типов и констант
import {Condition, ConditionGroup, Link} from '../../types/nodes';
import {getColorScheme} from '../../utils/colorSchemes';
import {getConditionGroups} from '../../utils/conditionUtils';
import {isCloud} from '../../utils/edition';
import {buildEditorPath} from '../../utils/navigation';
import {edgeTypes, nodeTypes} from '../../utils/nodeConfig';
import {getReliableTeamId, useReliableTeamId} from '../../utils/teamUtils';
import {ErrorState, InitializingState, LoadingState} from './LoadingStates';
import PresenceCursors from './PresenceCursors';

import s from './Canvas.module.scss';
import '@xyflow/react/dist/style.css';

// Расширяем интерфейс Window для типизации глобальных функций
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

// Функция выбора цвета для узлов в MiniMap - выносим за пределы компонента для предотвращения пересоздания
const getNodeColor = (node: Node) => {
  switch (node.type) {
    case 'narrative':
      return '#CCDAFF';
    case 'choice':
      return '#C6F7DB';
    case 'layer':
      return '#E2D5FB';
    case 'note':
      return '#EFE8A8';
    default:
      return '#ffffff';
  }
};

/**
 * Компонент Canvas - основной компонент для отображения и взаимодействия с графом
 *
 * Рефакторинг:
 * 1. Использует useRef вместо useState для состояний, которые не влияют на отображение
 * 2. Мемоизирует объекты и функции для улучшения производительности
 * 3. Разделяет логику на отдельные хуки с четкой ответственностью
 */
const Canvas = () => {
  const params = useParams();
  const router = useRouter();
  const {projectId} = useCurrentProject();
  const teamId = useReliableTeamId();
  const {layerId: graphId, timelineId} = useCurrentRoute();
  const {refreshCreditsAfterOperation} = useCreditsRefresh();

  const {nodes: rawNodes, edges} = useCanvasStore();
  const hasLoadedFromStorage = useGraphStore((s) => s.hasLoadedFromStorage);

  // Состояние для отслеживания AI загрузки узлов
  const [nodeAILoading, setNodeAILoading] = useState<Set<string>>(new Set());

  // Состояние для отслеживания прогресса AI генерации
  const [nodeAIProgress, setNodeAIProgress] = useState<
    Map<
      string,
      {
        stepName?: string;
        stepNumber?: number;
        totalSteps?: number;
        progress?: number;
        requestId?: string;
      }
    >
  >(new Map());

  // Team store для получения teamId
  const {currentTeam} = useTeamStore();

  // WebSocket для отслеживания AI прогресса
  const {subscribeToAIEvents, joinProject, leaveProject, isConnected} = useWebSocket();

  // Подключение к WebSocket событиям AI пайплайна
  useEffect(() => {
    if (!projectId || !isConnected || !currentTeam?.id) return;

    joinProject(projectId, currentTeam.id);

    const handleAIProgress = (payload: any) => {
      // Извлекаем nodeId из metadata и ищем соответствующий узел
      const nodeId = payload.metadata?.nodeId;
      if (!nodeId) return;

      // Ищем узел по ID
      const targetNode = rawNodes.find((node) => node.id === nodeId);
      if (!targetNode) return;

      // Определяем номер шага на основе currentStep
      const stepMapping = {
        analyze_graph_context: {number: 1, total: 5},
        analyze_narrative_style: {number: 2, total: 5},
        enrich_project_context: {number: 3, total: 5},
        generate_narrative_text: {number: 4, total: 5},
        validate_content_safety: {number: 5, total: 5}
      };

      const stepInfo = stepMapping[payload.currentStep as keyof typeof stepMapping];

      setNodeAIProgress((prev) => {
        const newMap = new Map(prev);
        newMap.set(targetNode.id, {
          stepName: payload.stepName,
          stepNumber: stepInfo?.number,
          totalSteps: stepInfo?.total,
          progress: payload.progress,
          requestId: payload.requestId
        });
        return newMap;
      });
    };

    const handleAICompleted = (payload: any) => {
      const nodeId = payload.metadata?.nodeId;
      if (!nodeId) return;

      const targetNode = rawNodes.find((node) => node.id === nodeId);
      if (!targetNode) return;

      // Очищаем прогресс и состояние загрузки
      setNodeAIProgress((prev) => {
        const newMap = new Map(prev);
        newMap.delete(targetNode.id);
        return newMap;
      });

      setNodeAILoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(targetNode.id);
        return newSet;
      });
    };

    const handleAIError = (payload: any) => {
      const nodeId = payload.metadata?.nodeId;
      if (!nodeId) return;

      const targetNode = rawNodes.find((node) => node.id === nodeId);
      if (!targetNode) return;

      // Очищаем прогресс и состояние загрузки
      setNodeAIProgress((prev) => {
        const newMap = new Map(prev);
        newMap.delete(targetNode.id);
        return newMap;
      });

      setNodeAILoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(targetNode.id);
        return newSet;
      });
    };

    const unsubscribe = subscribeToAIEvents({
      onAIProgress: handleAIProgress,
      onAICompleted: handleAICompleted,
      onAIError: handleAIError
    });

    return () => {
      unsubscribe();
      leaveProject(projectId);
    };
  }, [projectId, currentTeam?.id, isConnected, subscribeToAIEvents, joinProject, leaveProject, rawNodes]);

  // Используем только Canvas Store и необходимые хуки

  const {activeTool} = useToolStore();

  // Хук для drag and drop инструментов
  const toolDragDrop = useToolDragDrop();

  // Хук для управления созданием комментариев
  const commentCreation = useCommentCreation();

  // Состояния, влияющие на рендеринг UI - используем useState

  const [cursorPos, setCursorPos] = useState<{x: number; y: number} | null>(null);

  // Состояния для функциональности условий - влияют на UI
  const [previewOverlay, setPreviewOverlay] = useState<{
    isVisible: boolean;
    position: {x: number; y: number};
    edgeId: string;
    onOpenConditionModal: (conditionType?: 'AND' | 'OR', existingCondition?: Condition) => void;
  } | null>(null);

  const [conditionModal, setConditionModal] = useState<{
    isOpen: boolean;
    edgeId: string;
    position: {x: number; y: number};
    conditionType?: 'AND' | 'OR';
    existingCondition?: Condition;
  } | null>(null);

  // Состояние для контекстного меню узлов
  const [nodeContextMenu, setNodeContextMenu] = useState<{
    isOpen: boolean;
    position: {x: number; y: number};
    node: Node | null;
  } | null>(null);

  // Состояния, не влияющие на рендеринг - используем useRef

  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef<boolean>(false);
  const isRightMouseDownRef = useRef<boolean>(false);
  const lastViewportRef = useRef<{x: number; y: number; zoom: number} | null>(null);

  // Инициализируем хук для авто-подключения после объявления isPanningRef
  const {onNodeDrag: autoConnectNodeDrag, onNodeDragStop: autoConnectNodeDragStop} = useAutoConnectOnDrag({
    isPanningRef
  });

  // Используем хуки клавиатурного управления
  useGlobalHotkeys();
  useUndoRedoKeyboardShortcuts();
  useSearchHotkeys();
  useNotebookHotkeys();
  useBrowserHotkeysBlocker();

  // Инициализируем таймлайны
  useTimelinesInitialization();

  // Использовать хуки в порядке их важности и зависимостей
  const {saveCurrentViewport, handleViewportChange, updateCurrentGraphId} = useViewportSync({
    graphId
  });

  // Хук для управления вьюпортом (улучшенная и упрощенная версия)
  const {
    handleMouseDown,
    handleMouseUp,
    handleMouseMove: handlePanningMove,
    handleGesture,
    isDragging
  } = useViewportControls({
    wrapperRef,
    onViewportChange: handleViewportChange,
    lastViewportRef,
    isPanningRef
  });

  // Получаем React Flow instance для управления камерой
  const reactFlowInstance = useReactFlow();
  // Хук для проецирования координат мыши
  const {projectMouseEvent} = useProjectedMousePosition();

  // Хук для взаимодействия с инструментами на канвасе
  const {handlePaneClick} = useToolInteractionOnCanvas({
    wrapperRef,
    setCursorPos
  });

  // Обработчик drop события для инструментов
  const handleToolDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const toolId = e.dataTransfer.getData('application/flow-tool') as any;
      if (!toolId || !wrapperRef.current) {
        toolDragDrop.resetDragState();
        return;
      }

      // Получаем позицию drop относительно канваса
      const rect = wrapperRef.current.getBoundingClientRect();
      const dropPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // Проецируем позицию в координаты canvas
      // Создаем правильное событие мыши для projectMouseEvent
      const mouseEvent = {
        clientX: e.clientX,
        clientY: e.clientY
      } as React.MouseEvent;
      const canvasPosition = projectMouseEvent(mouseEvent, wrapperRef.current);

      // Создаем узел в соответствии с типом инструмента
      const commandManager = getCommandManager();
      const graphStore = useGraphStore.getState();
      const isRootLayer = graphStore.currentGraphId === 'root';
      const interaction = 'mouse'; // Используем mouse вместо drag_drop для совместимости

      switch (toolId) {
        case 'node-tool':
          commandManager.createNarrativeNode(canvasPosition, {title: '', text: ''}, {isRootLayer, interaction});
          break;
        case 'choice':
          commandManager.createChoiceNode(canvasPosition, '', {isRootLayer, interaction});
          break;
        case 'layer':
          commandManager.createLayer(canvasPosition, '', {isRootLayer, interaction});
          break;
        case 'note':
          commandManager.createNote(canvasPosition, '', undefined, {isRootLayer, interaction});
          break;
        default:
          break;
      }

      // Сбрасываем состояние drag and drop
      toolDragDrop.resetDragState();
      setCursorPos(null);
    },
    [toolDragDrop, wrapperRef, setCursorPos, projectMouseEvent]
  );

  // Обработчик движения мыши во время drag операции
  const handleDragMove = useCallback(
    (e: React.DragEvent) => {
      if (!toolDragDrop.isDraggingTool || !wrapperRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // Проецируем позицию в координаты flow
      const mouseEvent = {
        clientX: e.clientX,
        clientY: e.clientY
      } as React.MouseEvent;
      const canvasPosition = projectMouseEvent(mouseEvent, wrapperRef.current);

      toolDragDrop.setGhostPosition(canvasPosition);
    },
    [toolDragDrop, wrapperRef, projectMouseEvent]
  );

  // Хук для обработки перетаскивания узлов
  const {handleNodeDragStart, handleNodeDrag, handleNodeDragStop} = useNodeDragHandlers({
    autoConnectNodeDrag,
    autoConnectNodeDragStop,
    saveCurrentViewport
  });

  // Хук для базовых событий канваса
  const {
    handleContextMenu,
    handleDragStart,
    handleMouseMove: trackMouseOnCanvas,
    trackMousePosition,
    handleMouseLeave
  } = useCanvasEvents({
    wrapperRef,
    setCursorPos,
    setIsPanning: (isPanning) => {
      isPanningRef.current = isPanning;
    },
    isPanning: isPanningRef
  });

  // Хук для обработки команд узлов и рёбер
  const {onNodesChange, onEdgesChange, onConnect, onConnectStart, onConnectEnd, onNodeMouseEnter, onNodeMouseLeave, hoveredNodeWhileConnecting} = useCommandHandlers();

  // Вычисляем анимируемые связи и фокус один раз для всего графа (оптимизация производительности)
  const {animatedEdgeIds, focusedNodeIds, focusedEdgeIds} = useMemo(() => {
    const {animateLinksToSelected, focusMode} = useEditorSettingsStore.getState();

    // Находим выделенные узлы
    const selectedNodeIds = rawNodes.filter((node) => node.selected).map((node) => node.id);

    // Инициализируем результаты
    const animatedEdges = new Set<string>();
    let focusedNodes = new Set<string>();
    const focusedEdges = new Set<string>();

    if (selectedNodeIds.length === 0) {
      return {
        animatedEdgeIds: animatedEdges,
        focusedNodeIds: focusedNodes,
        focusedEdgeIds: focusedEdges
      };
    }

    // Функция обхода downstream
    const getDownstreamNodes = (nodeId: string, visited = new Set<string>()): Set<string> => {
      if (visited.has(nodeId)) return visited;
      visited.add(nodeId);

      const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
      outgoingEdges.forEach((edge) => {
        getDownstreamNodes(edge.target, visited);
      });

      return visited;
    };

    // Функция обхода upstream
    const getUpstreamNodes = (nodeId: string, visited = new Set<string>()): Set<string> => {
      if (visited.has(nodeId)) return visited;
      visited.add(nodeId);

      const incomingEdges = edges.filter((edge) => edge.target === nodeId);
      incomingEdges.forEach((edge) => {
        getUpstreamNodes(edge.source, visited);
      });

      return visited;
    };

    // Собираем все узлы в путях от/к выделенным узлам
    const allPathNodes = new Set<string>();
    selectedNodeIds.forEach((selectedId) => {
      const downstreamNodes = getDownstreamNodes(selectedId);
      const upstreamNodes = getUpstreamNodes(selectedId);

      downstreamNodes.forEach((nodeId) => allPathNodes.add(nodeId));
      upstreamNodes.forEach((nodeId) => allPathNodes.add(nodeId));
    });

    // Находим связи, которые нужно анимировать (если включена анимация)
    if (animateLinksToSelected) {
      edges.forEach((edge) => {
        if (allPathNodes.has(edge.source) && allPathNodes.has(edge.target)) {
          animatedEdges.add(edge.id);
        }
      });
    }

    // Находим узлы и связи для фокусировки (если включен режим фокусировки)
    if (focusMode) {
      // Все узлы в путях остаются полностью непрозрачными
      focusedNodes = new Set(allPathNodes);

      // Все связи между узлами в путях остаются полностью непрозрачными
      edges.forEach((edge) => {
        if (allPathNodes.has(edge.source) && allPathNodes.has(edge.target)) {
          focusedEdges.add(edge.id);
        }
      });
    }

    return {
      animatedEdgeIds: animatedEdges,
      focusedNodeIds: focusedNodes,
      focusedEdgeIds: focusedEdges
    };
  }, [rawNodes, edges, useEditorSettingsStore]);

  // Расширяем узлы информацией о состоянии AI загрузки, прогрессе и фокусе
  const nodes = useMemo(() => {
    const {focusMode} = useEditorSettingsStore.getState();

    return rawNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isAILoading: nodeAILoading.has(node.id),
        aiProgress: nodeAIProgress.get(node.id),
        isHoveredWhileConnecting: hoveredNodeWhileConnecting === node.id,
        shouldBeFaded: focusMode && focusedNodeIds.size > 0 && !focusedNodeIds.has(node.id)
      }
    }));
  }, [rawNodes, nodeAILoading, nodeAIProgress, hoveredNodeWhileConnecting, focusedNodeIds, useEditorSettingsStore]);

  // Расширяем связи информацией об анимации и фокусе
  const optimizedEdges = useMemo(() => {
    const {focusMode} = useEditorSettingsStore.getState();

    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        shouldAnimate: animatedEdgeIds.has(edge.id),
        shouldBeFaded: focusMode && focusedEdgeIds.size > 0 && !focusedEdgeIds.has(edge.id)
      }
    }));
  }, [edges, animatedEdgeIds, focusedEdgeIds, useEditorSettingsStore]);

  // Функция для позиционирования камеры на узле комментария
  const focusOnCommentThread = useCallback(
    (threadId: string) => {
      const commentNodeId = `comment-${threadId}`;
      const commentNode = nodes.find((node) => node.id === commentNodeId);

      if (commentNode && commentNode.position) {
        // Перемещаем камеру к узлу с анимацией
        reactFlowInstance.setViewport(
          {
            x: -commentNode.position.x * 1 + window.innerWidth / 2 - 50, // Центрируем с небольшим смещением
            y: -commentNode.position.y * 1 + window.innerHeight / 2 - 50,
            zoom: 1
          },
          {duration: 800}
        );
      }
    },
    [nodes, reactFlowInstance]
  );

  // Инициализируем трекер позиции курсора для команд вставки
  useCursorTracking();

  // Инициализируем presence систему для курсоров других пользователей
  const {otherCursors, isPresenceEnabled} = usePresence();

  // Получаем пользовательские настройки редактора
  const {grid, gridGap, canvasColor, snapToGrid, theme} = useEditorSettingsStore();

  // Получаем цветовую схему на основе выбранного цвета холста
  const colorScheme = useMemo(() => getColorScheme(canvasColor), [canvasColor]);

  // Получаем настройки устройства ввода
  const {canvasSettings} = useCanvasSettings();

  // AI функциональность
  const {generateSuggestions} = useAISuggestions();

  // Реакция на смену темы — меняем data-theme на body
  useEffect(() => {
    if (theme === 'auto') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Комбинированный обработчик движения мыши
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Вызываем оба обработчика для отслеживания курсора и панорамирования
      trackMouseOnCanvas(e);
      handlePanningMove(e);
    },
    [trackMouseOnCanvas, handlePanningMove]
  );

  // Создаем конфигурацию React Go Flow с учетом текущего состояния
  // Мемоизируем, чтобы избежать ненужных перерендеров
  const modifiedFlowConfig = useMemo(
    () => ({
      selectionMode: SelectionMode.Partial, // Всегда используем частичное выделение
      selectionOnDrag: true,

      // Применяем настройки из контекста устройства ввода
      panOnDrag: canvasSettings.panOnDrag,
      panOnScroll: canvasSettings.panOnScroll,
      panOnScrollMode: PanOnScrollMode.Free,
      zoomOnPinch: canvasSettings.zoomOnPinch,
      zoomOnScroll: canvasSettings.zoomOnScroll,

      // Базовые настройки
      zoomActivationKeyCode: undefined,
      elevateEdgesOnSelect: false,
      preventScrolling: false,
      snapToGrid: snapToGrid,
      snapGrid: [20, 20] as [number, number] // Типизируем для соответствия требованиям ReactFlow
    }),
    [snapToGrid, canvasSettings]
  );

  // Добавляем обработчик событий scroll для элементов с классом nowheel
  useEffect(() => {
    // Функция для определения, является ли элемент или его родитель nowheel
    const isOrHasNowheelParent = (element: Element | null): boolean => {
      let current = element;
      while (current) {
        if (current.classList && current.classList.contains('nowheel')) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };

    // Обработчик события wheel
    const handleWheel = (e: WheelEvent) => {
      // Если событие происходит внутри элемента с классом nowheel или его потомка
      if (isOrHasNowheelParent(e.target as Element)) {
        // Запрещаем ReactFlow обрабатывать это событие для масштабирования
        e.stopPropagation();

        // Если это Ctrl+wheel (попытка зума), полностью блокируем
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        }
      }
    };

    // Добавляем глобальный перехватчик с высоким приоритетом
    document.addEventListener('wheel', handleWheel, {capture: true, passive: false});

    return () => {
      document.removeEventListener('wheel', handleWheel, {capture: true});
    };
  }, []);

  // Добавляем обработчик для перехвата жестов pinch-to-zoom внутри nowheel
  useEffect(() => {
    const handleGesture = (e: Event) => {
      const target = e.target as Element;

      // Проверяем, происходит ли жест внутри элемента с классом nowheel
      let current = target;
      while (current instanceof Element) {
        if (current.classList && current.classList.contains('nowheel')) {
          // Блокируем обработку жеста React Go Flow
          e.stopPropagation();

          // Для событий начала жеста, также предотвращаем стандартное поведение
          if (e.type === 'gesturestart') {
            e.preventDefault();
          }

          break;
        }
        current = current.parentElement as Element;
      }
    };

    // Добавляем обработчики для всех типов жестов
    document.addEventListener('gesturestart', handleGesture, {capture: true, passive: false});
    document.addEventListener('gesturechange', handleGesture, {capture: true, passive: false});
    document.addEventListener('gestureend', handleGesture, {capture: true, passive: false});

    return () => {
      document.removeEventListener('gesturestart', handleGesture, {capture: true});
      document.removeEventListener('gesturechange', handleGesture, {capture: true});
      document.removeEventListener('gestureend', handleGesture, {capture: true});
    };
  }, []);

  // Используем хук для управления проектом
  const project = useProject(projectId);

  // Инициализация beforeunload обработчика
  useProjectBeforeUnload();

  // Синхронизация GraphStore с CanvasStore
  useGraphCanvasSync(graphId, project.isReady && hasLoadedFromStorage);

  // Обновляем текущий graphId при его изменении
  useEffect(() => {
    updateCurrentGraphId(graphId);
  }, [graphId, updateCurrentGraphId]);

  // Переводим в режим текущего графа
  useEffect(() => {
    if (project.isReady && hasLoadedFromStorage) {
      // Используем навигацию через ProjectManager с валидацией
      project.navigateToLayer(graphId).then((success) => {
        if (!success && projectId) {
          console.warn(`Слой с ID ${graphId} не существует, перенаправляем на root.`);
          getNotificationManager().showError(`Layer, which you are trying to open, does not exist. You will be redirected to the main layer.`);
          router.push(buildEditorPath(projectId, timelineId));
        }
      });
    }
  }, [graphId, project.isReady, hasLoadedFromStorage, router, projectId, timelineId]);

  // Отправляем настройки редактора в аналитику при открытии проекта
  useEffect(() => {
    if (project.isReady && hasLoadedFromStorage) {
      // Получаем текущие настройки редактора
      const editorSettings = useEditorSettingsStore.getState();

      // Отправляем настройки как user properties
      trackEditorSettingsOnProjectOpen(editorSettings);
    }
  }, [project.isReady, hasLoadedFromStorage]);

  // Ref для хранения последней известной позиции мыши
  const lastMousePositionRef = useRef<{x: number; y: number} | null>(null);

  // Функция для получения текущей позиции курсора относительно канваса
  const getCurrentCursorPosition = useCallback(() => {
    if (!wrapperRef.current) return null;

    const rect = wrapperRef.current.getBoundingClientRect();

    // Если есть сохраненная позиция мыши, используем её
    if (lastMousePositionRef.current) {
      return {
        x: lastMousePositionRef.current.x - rect.left,
        y: lastMousePositionRef.current.y - rect.top
      };
    }

    // Fallback к центру канваса
    return {
      x: rect.width / 2,
      y: rect.height / 2
    };
  }, []);

  // Глобальный трекер позиции мыши
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      lastMousePositionRef.current = {
        x: e.clientX,
        y: e.clientY
      };
    };

    document.addEventListener('mousemove', updateMousePosition, {passive: true});
    return () => {
      document.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  // Обновляем глобальный обработчик движения мыши для отслеживания позиции курсора
  useEffect(() => {
    if (activeTool !== 'cursor') {
      // Сразу устанавливаем позицию курсора при активации инструмента
      const initialPos = getCurrentCursorPosition();
      if (initialPos) {
        setCursorPos(initialPos);
      }

      window.addEventListener('mousemove', trackMousePosition);
      return () => {
        window.removeEventListener('mousemove', trackMousePosition);
      };
    } else {
      // Для cursor сбрасываем отображение призрака
      setCursorPos(null);
    }
  }, [activeTool, trackMousePosition, getCurrentCursorPosition]);

  // Настраиваем обработчики жестов - упрощенная версия с единым обработчиком
  useEffect(() => {
    if (!wrapperRef.current) return;

    const canvasElement = wrapperRef.current;

    // Используем единый обработчик с capture phase для перехвата жестов до их доставки дочерним элементам
    const options = {capture: true, passive: false};

    // Добавляем слушатели для жестов масштабирования и колеса мыши
    canvasElement.addEventListener('gesturestart', handleGesture, options);
    canvasElement.addEventListener('gesturechange', handleGesture, options);
    canvasElement.addEventListener('gestureend', handleGesture, options);
    canvasElement.addEventListener('wheel', handleGesture, options);

    return () => {
      // Удаляем слушатели при размонтировании
      canvasElement.removeEventListener('gesturestart', handleGesture, options);
      canvasElement.removeEventListener('gesturechange', handleGesture, options);
      canvasElement.removeEventListener('gestureend', handleGesture, options);
      canvasElement.removeEventListener('wheel', handleGesture, options);
    };
  }, [wrapperRef, handleGesture]);

  // Функции для управления оверлеем условий - мемоизируем их, чтобы избежать ненужных ререндеров
  const showPreviewOverlay = useCallback((params: {position: {x: number; y: number}; edgeId: string; onOpenConditionModal: (conditionType?: 'AND' | 'OR', existingCondition?: Condition) => void}) => {
    setPreviewOverlay({
      isVisible: true,
      ...params
    });
  }, []);

  const hidePreviewOverlay = useCallback(() => {
    setPreviewOverlay((prev) => (prev ? {...prev, isVisible: false} : null));
  }, []);

  // Функции для управления модальным окном условий
  const openConditionModal = useCallback((params: {edgeId: string; position: {x: number; y: number}; conditionType?: 'AND' | 'OR'; existingCondition?: Condition}) => {
    // Открываем модальное окно
    setConditionModal({
      isOpen: true,
      ...params
    });
  }, []);

  const closeConditionModal = useCallback(() => {
    setConditionModal(null);
  }, []);

  // Функции для управления контекстным меню узлов
  const openNodeContextMenu = useCallback((params: {position: {x: number; y: number}; node: Node}) => {
    setNodeContextMenu({
      isOpen: true,
      ...params
    });
  }, []);

  const closeNodeContextMenu = useCallback(() => {
    setNodeContextMenu(null);
  }, []);

  // Обработчик удаления узла из контекстного меню
  const handleDeleteNodeFromMenu = useCallback((nodeId: string) => {
    const commandManager = getCommandManager();
    commandManager.deleteGenericNode(nodeId);
  }, []);

  // Обработчик AI действий из контекстного меню
  const handleAIActionFromMenu = useCallback(
    async (nodeId: string) => {
      try {
        if (!projectId) {
          console.error('No projectId available');
          return;
        }

        // Устанавливаем состояние загрузки для узла
        setNodeAILoading((prev) => new Set(prev).add(nodeId));

        // Генерируем AI предложения для улучшения узла
        const suggestions = await generateSuggestions({
          projectId,
          nodeId,
          surroundingNodes: [],
          suggestionType: 'REPHRASE_NARRATIVE' // Используем REPHRASE_NARRATIVE для улучшения содержимого
        });

        // Берем первое предложение и применяем к узлу
        if (suggestions && suggestions.length > 0) {
          const firstSuggestion = suggestions[0];
          const commandManager = getCommandManager();

          // Получаем информацию о узле
          const graphStore = useGraphStore.getState();
          const currentLayer = graphStore.layers[graphStore.currentGraphId];
          const node = currentLayer?.nodes[nodeId];

          if (!node) return;

          // Применяем предложение в зависимости от типа узла
          if (node.type === 'narrative') {
            commandManager.editNarrativeNode(nodeId, {
              title: firstSuggestion.title || node.data?.title || '',
              text: firstSuggestion.description || node.data?.text || '',
              attachedEntities: firstSuggestion.entities || node.data?.attachedEntities || []
            });
          } else if (node.type === 'choice') {
            // Для узлов выбора используем description как основной текст
            commandManager.editChoiceNodeText(nodeId, firstSuggestion.description || firstSuggestion.title || '');
          }
        }
      } catch (error) {
        console.error('Error generating AI suggestions:', error);
      } finally {
        // Убираем состояние загрузки для узла
        setNodeAILoading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
      }
    },
    [projectId, generateSuggestions]
  );

  // Функция для управления состоянием AI загрузки
  const handleLoadingChange = useCallback((nodeId: string, loading: boolean) => {
    setNodeAILoading((prev) => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(nodeId);
      } else {
        newSet.delete(nodeId);
      }
      return newSet;
    });
  }, []);

  // Обработчик Fill действия из контекстного меню (новый AI пайплайн)
  const handleFillActionFromMenu = useCallback(
    async (nodeId: string) => {
      if (!projectId) {
        console.error('No projectId available');
        return;
      }

      try {
        // Используем наш новый сервис
        trackCanvasAIFillNode('ContextButton', 'Narrative', projectId, timelineId);
        await AIFillService.fillNarrativeNode(nodeId, projectId, handleLoadingChange, refreshCreditsAfterOperation);

        // Показываем уведомление об успехе
        const notificationManager = getNotificationManager();
        notificationManager.showSuccess('Текст успешно создан с помощью AI', true, 3000);
      } catch (error) {
        console.error('Error filling narrative node with AI:', error);

        // Показываем уведомление об ошибке
        const notificationManager = getNotificationManager();
        notificationManager.showError('Ошибка при генерации текста. Попробуйте еще раз.', true, 5000);
      }
    },
    [projectId, handleLoadingChange, refreshCreditsAfterOperation]
  );

  // Обработчик воспроизведения с узла из контекстного меню
  const handlePlayFromNodeMenu = useCallback(
    (nodeId: string) => {
      const projectName = useProjectStore.getState().projectName;
      const reliableTeamId = getReliableTeamId();
      if (!reliableTeamId) {
        console.error('Team not available for preview');
        return;
      }
      openHTMLPreview(projectName, reliableTeamId, nodeId, projectId);
    },
    [projectId, teamId]
  );

  // Обработка кастомного события AI Fill из хоткеев
  useEffect(() => {
    const handleAIFillEvent = (event: CustomEvent) => {
      const {nodeId} = event.detail;
      if (nodeId && projectId) {
        handleFillActionFromMenu(nodeId);
      }
    };

    document.addEventListener(AI_FILL_ACTIVATION_EVENT, handleAIFillEvent as EventListener);

    return () => {
      document.removeEventListener(AI_FILL_ACTIVATION_EVENT, handleAIFillEvent as EventListener);
    };
  }, [handleFillActionFromMenu, projectId]);

  // Делаем функции доступными глобально для вызова из других компонентов
  useEffect(() => {
    window.goflow = window.goflow || {};
    window.goflow.showConditionsPreview = showPreviewOverlay;
    window.goflow.hideConditionsPreview = hidePreviewOverlay;
    window.goflow.openConditionModal = openConditionModal;
    window.goflow.closeConditionModal = closeConditionModal;

    return () => {
      if (window.goflow) {
        delete window.goflow.showConditionsPreview;
        delete window.goflow.hideConditionsPreview;
        delete window.goflow.openConditionModal;
        delete window.goflow.closeConditionModal;
      }
    };
  }, [showPreviewOverlay, hidePreviewOverlay, openConditionModal, closeConditionModal]);

  // Мемоизируем стили для wrapper div
  const wrapperStyle = useMemo(
    () => ({
      height: '100%',
      width: '100%',
      position: 'relative' as const,
      cursor: isDragging ? 'grabbing' : 'default'
    }),
    [isDragging]
  );

  // Мемоизируем стили для MiniMap
  const miniMapStyle = useMemo(
    () => ({
      right: 12,
      bottom: 70,
      border: '1px solid #ccc',
      borderRadius: 5
    }),
    []
  );

  // Мемоизируем стили для overlay предпросмотра условий
  const overlayStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      zIndex: 1000,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none' as const
    }),
    []
  );

  // Мемоизируем стили для модального окна условий
  const modalContainerStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      pointerEvents: 'all' as const
    }),
    []
  );

  // Мемоизируем стили для backdrop модального окна
  const modalBackdropStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.3)'
    }),
    []
  );

  // Мемоизируем функцию для получения условий ребра
  const getEdgeConditions = useCallback((edgeId: string): ConditionGroup[] => {
    const graphStore = useGraphStore.getState();
    const currentLayer = graphStore.layers[graphStore.currentGraphId];

    if (currentLayer && currentLayer.edges && currentLayer.edges[edgeId]) {
      const edge = currentLayer.edges[edgeId] as Link;
      return getConditionGroups(edge.conditions);
    }
    return [];
  }, []);

  // Мемоизируем обработчик добавления условия
  const handleAddCondition = useCallback(
    (condition: any) => {
      if (!conditionModal || !conditionModal.edgeId) return;

      // Получаем CommandManager для выполнения операций
      const commandManager = getCommandManager();

      // Получаем данные ребра из GraphStore
      const graphStore = useGraphStore.getState();
      const currentLayer = graphStore.layers[graphStore.currentGraphId];

      if (!currentLayer || !currentLayer.edges || !currentLayer.edges[conditionModal.edgeId]) return;

      const edge = currentLayer.edges[conditionModal.edgeId] as Link;

      // Получаем группы условий
      const conditionGroups = getConditionGroups(edge.conditions);

      // Определяем, редактируем ли мы существующее условие или создаем новое
      const isEditingCondition = Boolean(conditionModal.existingCondition);

      // Копируем группы для безопасного обновления
      let updatedGroups = [...conditionGroups];

      // При редактировании существующего условия, заменяем его в соответствующей группе
      if (isEditingCondition && conditionModal.existingCondition) {
        let found = false;

        // Проходим по всем группам, ищем условие для замены
        updatedGroups = updatedGroups.map((group) => {
          // Проверяем, содержит ли группа редактируемое условие
          const hasCondition = group.conditions.some((c: any) => c.id === conditionModal.existingCondition?.id);

          if (hasCondition) {
            found = true;
            // Замена условия в группе
            return {
              ...group,
              conditions: group.conditions.map((c: any) => (c.id === conditionModal.existingCondition?.id ? condition : c))
            };
          }

          return group;
        });

        if (found) {
          // Обновляем условия ребра без автораспределения
          commandManager.updateEdgeConditions(conditionModal.edgeId, updatedGroups);
        }
      } else {
        // Это новое условие, добавляем его в соответствующую группу
        const groupType = conditionModal.conditionType || 'AND';
        let groupToUpdate = updatedGroups.find((g) => g.operator === groupType);

        if (!groupToUpdate) {
          // Если группа не существует, создаем ее
          groupToUpdate = {
            id: nanoid(),
            operator: groupType,
            conditions: []
          };
          updatedGroups.push(groupToUpdate);
        }

        // Находим индекс группы
        const groupIndex = updatedGroups.findIndex((g) => g.operator === groupType);

        // Обновляем группу, добавляя новое условие
        updatedGroups[groupIndex] = {
          ...updatedGroups[groupIndex],
          conditions: [...updatedGroups[groupIndex].conditions, condition]
        };

        // Обновляем только текущее ребро, без автораспределения
        commandManager.updateEdgeConditions(conditionModal.edgeId, updatedGroups);
      }

      // Закрываем модальное окно
      closeConditionModal();
    },
    [conditionModal, closeConditionModal]
  );

  // Мемоизируем обработчик удаления условия
  const handleDeleteCondition = useCallback(
    (condition: any) => {
      if (!conditionModal || !conditionModal.edgeId || !condition) return;

      // Получаем CommandManager для выполнения операций
      const commandManager = getCommandManager();

      // Получаем данные ребра из GraphStore
      const graphStore = useGraphStore.getState();
      const currentLayer = graphStore.layers[graphStore.currentGraphId];

      if (!currentLayer || !currentLayer.edges || !currentLayer.edges[conditionModal.edgeId]) return;

      const edge = currentLayer.edges[conditionModal.edgeId] as Link;

      // Получаем группы условий
      const conditionGroups = getConditionGroups(edge.conditions);

      // Ищем условие во всех группах и удаляем его
      let found = false;
      const updatedGroups = [];

      for (const group of conditionGroups) {
        // Копируем группу для изменений
        const updatedGroup = {...group};

        // Проверяем, есть ли условие в этой группе
        if (updatedGroup.conditions.some((c: Condition) => c.id === condition.id)) {
          // Нашли условие - удаляем его
          found = true;
          updatedGroup.conditions = updatedGroup.conditions.filter((c: Condition) => c.id !== condition.id);
        }

        updatedGroups.push(updatedGroup);
      }

      if (found) {
        // Обновляем условия ребра
        commandManager.updateEdgeConditions(conditionModal.edgeId, updatedGroups);
      }

      // Закрываем модальное окно
      closeConditionModal();
    },
    [conditionModal, closeConditionModal]
  );

  // Мемоизируем обработчик изменения открытого состояния модалки
  const handleModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeConditionModal();
    },
    [closeConditionModal]
  );

  // Получаем переменные непосредственно из хранилища при открытии модального окна
  const conditionModalVariables = useMemo(() => {
    // Если модальное окно открыто, получаем актуальные переменные
    if (conditionModal && conditionModal.isOpen) {
      return useVariablesStore.getState().variables;
    }
    return [];
  }, [conditionModal?.isOpen]);

  // Очищаем кэш узлов при обновлении массива узлов
  useEffect(() => {
    // При изменении узлов очищаем кэш для избежания устаревших данных
    clearNodeCache();
  }, [nodes]);

  // Показываем состояние загрузки (после всех хуков!)
  if (project.isLoading) {
    return <LoadingState />;
  }

  if (project.isError) {
    return <ErrorState error={project.error} onRetry={project.reinitializeProject} />;
  }

  if (!project.isReady) {
    return <InitializingState />;
  }

  return (
    <Theme className={cls(s.canvas, s[`color-${canvasColor}`])}>
      <div
        ref={wrapperRef}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDragStart={handleDragStart}
        onDragOver={(e) => {
          toolDragDrop.handleDragOver(e);
          handleDragMove(e);
        }}
        onDragEnter={toolDragDrop.handleDragEnter}
        onDragLeave={toolDragDrop.handleDragLeave}
        onDrop={handleToolDrop}
        style={wrapperStyle}
      >
        <AILoadingProvider setNodeLoading={handleLoadingChange}>
          <ReactFlow
            nodes={nodes}
            edges={optimizedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeDrag={handleNodeDrag}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              openNodeContextMenu({
                position: {x: event.clientX, y: event.clientY},
                node
              });
            }}
            onPaneClick={(event) => {
              // Закрываем контекстное меню при клике на панель
              if (nodeContextMenu) {
                closeNodeContextMenu();
              }
              handlePaneClick(event);
            }}
            onViewportChange={handleViewportChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            elementsSelectable={activeTool === 'cursor'}
            minZoom={0.01}
            maxZoom={2.5}
            {...modifiedFlowConfig}
          >
            {grid !== 'clean' && (
              <Background
                id='canvas-background'
                gap={gridGap}
                size={grid === 'dots' ? 2 : 1}
                color={grid === 'dots' ? colorScheme.grid.dots : colorScheme.grid.lines}
                variant={grid === 'dots' ? BackgroundVariant.Dots : BackgroundVariant.Lines}
              />
            )}
            <ZoomControlsWithPercentage />
            <MiniMap nodeStrokeWidth={3} zoomable pannable nodeColor={getNodeColor} maskColor='rgba(0, 0, 0, 0.1)' style={miniMapStyle} />

            {/* Оверлей предпросмотра условий */}
            {previewOverlay && (
              <div style={overlayStyle}>
                <ConditionsPreviewOverlay
                  isVisible={previewOverlay.isVisible}
                  position={previewOverlay.position}
                  edgeId={previewOverlay.edgeId}
                  onOpenConditionModal={previewOverlay.onOpenConditionModal}
                  onClose={hidePreviewOverlay}
                />
              </div>
            )}
          </ReactFlow>
        </AILoadingProvider>
        {/* Node ghosts для разных инструментов */}
        {cursorPos && activeTool === 'node-tool' && <NarrativeNodeGhost position={cursorPos} />}
        {cursorPos && activeTool === 'choice' && <ChoiceNodeGhost position={cursorPos} />}
        {cursorPos && activeTool === 'layer' && <LayerNodeGhost position={cursorPos} />}
        {cursorPos && activeTool === 'note' && <NoteNodeGhost position={cursorPos} />}
        {cursorPos && activeTool === 'comment' && !commentCreation.isCreatingComment && <CommentNodeGhost position={cursorPos} />}

        {/* Node ghosts для drag and drop инструментов */}
        {toolDragDrop.ghostPosition && toolDragDrop.draggedTool === 'node-tool' && <NarrativeNodeGhost position={toolDragDrop.ghostPosition} />}
        {toolDragDrop.ghostPosition && toolDragDrop.draggedTool === 'choice' && <ChoiceNodeGhost position={toolDragDrop.ghostPosition} />}
        {toolDragDrop.ghostPosition && toolDragDrop.draggedTool === 'layer' && <LayerNodeGhost position={toolDragDrop.ghostPosition} />}
        {toolDragDrop.ghostPosition && toolDragDrop.draggedTool === 'note' && <NoteNodeGhost position={toolDragDrop.ghostPosition} />}
        {toolDragDrop.ghostPosition && toolDragDrop.draggedTool === 'comment' && !commentCreation.isCreatingComment && <CommentNodeGhost position={toolDragDrop.ghostPosition} />}

        {/* Модальное окно добавления условий */}
        {conditionModal && conditionModal.isOpen && (
          <div style={modalContainerStyle}>
            <div style={modalBackdropStyle} onClick={closeConditionModal} />

            <ConditionModal
              open={true}
              onOpenChange={handleModalOpenChange}
              edgeConditions={conditionModal ? getEdgeConditions(conditionModal.edgeId) : []}
              edgeId={conditionModal?.edgeId}
              onAddCondition={handleAddCondition}
              variables={conditionModalVariables}
              existingCondition={conditionModal.existingCondition}
              onDeleteCondition={handleDeleteCondition}
            />
          </div>
        )}

        {/* Компонент подсветки слоя при входе */}
        <LayerHighlight />

        {/* Курсоры других пользователей (Cloud only) */}
        {isCloud() && isPresenceEnabled && <PresenceCursors cursors={otherCursors} />}

        {/* Контекстное меню узла */}
        {nodeContextMenu && (
          <NodeContextMenu
            isOpen={nodeContextMenu.isOpen}
            position={nodeContextMenu.position}
            node={nodeContextMenu.node}
            onClose={closeNodeContextMenu}
            onDelete={handleDeleteNodeFromMenu}
            onAIAction={handleAIActionFromMenu}
            onFillAction={handleFillActionFromMenu}
            onPlayFromNode={handlePlayFromNodeMenu}
          />
        )}

        {/* Система комментариев (Cloud only) */}
        {isCloud() && (
          <CommentsManager
            canvasTransform={lastViewportRef.current || {x: 0, y: 0, zoom: 1}}
            wrapperRef={wrapperRef}
            onFocusThread={focusOnCommentThread}
            onHideGhost={() => setCursorPos(null)}
            commentCreation={commentCreation}
          />
        )}
      </div>
    </Theme>
  );
};

// Оборачиваем компонент в React.memo для предотвращения ненужных рендеров
export default React.memo(Canvas);
