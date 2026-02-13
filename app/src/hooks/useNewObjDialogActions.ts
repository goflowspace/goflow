import {useCallback} from 'react';

import {useReactFlow} from '@xyflow/react';
import {nanoid} from 'nanoid';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';

import {getCommandManager} from '../commands/CommandManager';
import {CHOICE_NODE_HEIGHT_CONSTANTS, NODE_WIDTHS} from '../utils/constants';
import {NODE_EDIT_ACTIVATION_EVENT} from './useGlobalHotkeys';

const MIN_SPACING = 50; // Minimum spacing in pixels
const CHOICE_NODE_VERTICAL_SPACING = 20;

export const useNewObjDialogActions = (sourceId: string, sourceHandleId?: string, targetHandleId?: string) => {
  const reactFlowInstance = useReactFlow();
  const {getNode, updateNode, setCenter, getViewport, getNodes, getEdges} = reactFlowInstance;
  const {addEdge} = useGraphStore();
  const commandManager = getCommandManager();

  const getSourcetAndPosition = (targetNodeType: 'narrative' | 'choice' | 'layer') => {
    const sourceNode = getNode(sourceId);
    if (!sourceNode) return null;

    const sourceWidth = NODE_WIDTHS[sourceNode.type as keyof typeof NODE_WIDTHS] || NODE_WIDTHS.narrative;

    // Calculate spacing based on source node width
    const spacing = 100;

    const position = {
      x: sourceNode.position.x + sourceWidth + spacing,
      y: sourceNode.position.y
    };

    return {sourceNode, position};
  };

  const createNarrativeNode = useCallback(() => {
    const context = getSourcetAndPosition('narrative');
    if (!context) return;

    const {sourceNode, position} = context;
    const {zoom} = getViewport();

    // Получаем информацию для трекинга
    const isRootLayer = useGraphStore.getState().currentGraphId === 'root';
    const interaction = 'hotkey'; // Так как вызывается через Ctrl+1

    // Получаем сущности от исходного узла, если он нарративный
    let attachedEntities: string[] | undefined = undefined;
    if (sourceNode.type === 'narrative') {
      const graphStore = useGraphStore.getState();
      const currentLayer = graphStore.layers[graphStore.currentGraphId];
      const sourceNodeData = currentLayer.nodes[sourceNode.id];

      if (sourceNodeData && sourceNodeData.type === 'narrative' && sourceNodeData.data.attachedEntities) {
        attachedEntities = [...sourceNodeData.data.attachedEntities]; // Копируем массив
      }
    }

    // Используем CommandManager, который теперь возвращает ID созданного узла
    const newNodeId = commandManager.createNarrativeNode(
      position,
      {
        title: '',
        text: '',
        attachedEntities: attachedEntities
      },
      {isRootLayer, interaction}
    );

    // Сразу создаем соединение, так как у нас есть ID
    if (newNodeId) {
      // Используем CommandManager для создания связи
      commandManager.connectNarrativeNode({
        source: sourceId,
        target: newNodeId,
        sourceHandle: sourceHandleId || null,
        targetHandle: targetHandleId || null
      });

      // Небольшая задержка, чтобы React Go Flow успел обработать новый узел
      setTimeout(() => {
        const newNode = getNode(newNodeId);
        if (newNode) {
          // Центрируем вид на новом узле
          setCenter(newNode.position.x, newNode.position.y, {duration: 300, zoom});

          // Выделяем новый узел
          updateNode(newNode.id, (node) => ({...node, selected: true}));

          // Активируем режим редактирования нового узла
          activateEditingMode(newNode.id, 'narrative');
        }
      }, 50);
    }
  }, [sourceId, setCenter, updateNode, getViewport, addEdge, sourceHandleId, targetHandleId, commandManager, getNode]);

  const createChoiceNodeBelow = useCallback(() => {
    const {zoom} = getViewport();
    const currentNodes = getNodes();
    const selectedNodes = currentNodes.filter((node) => node.selected);

    if (selectedNodes.length === 1) {
      const selectedNode = selectedNodes[0];
      const edges = getEdges();
      const currentGraphId = useGraphStore.getState().currentGraphId;

      const position = selectedNode.position;
      const height = selectedNode.height || CHOICE_NODE_HEIGHT_CONSTANTS.BASE_HEIGHT;
      const newPosition = {x: position.x, y: position.y + height + CHOICE_NODE_VERTICAL_SPACING};

      const newChoiceNodeId = commandManager.createChoiceNode(newPosition, '', {isRootLayer: currentGraphId === 'root', interaction: 'hotkey'});

      if (newChoiceNodeId) {
        const incomingEdges = edges.filter((edge) => edge.target === selectedNode.id);

        if (incomingEdges.length === 1) {
          const edge = incomingEdges[0];
          const sourceNodeId = edge.source;
          const sourceNode = useGraphStore.getState().layers[currentGraphId].nodes[sourceNodeId];

          if (sourceNode && sourceNode.type === 'narrative') {
            commandManager.connectNarrativeNode({
              source: sourceNodeId,
              target: newChoiceNodeId,
              sourceHandle: null,
              targetHandle: null
            });
          }
        }

        setTimeout(() => {
          const newNode = getNode(newChoiceNodeId);
          if (newNode) {
            setCenter(newNode.position.x, newNode.position.y, {duration: 300, zoom});
            useCanvasStore.getState().selectNode(newNode.id);
            activateEditingMode(newNode.id, 'choice');
          }
        }, 50);
      }
    }
  }, [getNodes, getEdges, commandManager, getViewport, setCenter, getNode]);

  const createChoiceNode = useCallback(() => {
    const context = getSourcetAndPosition('choice');
    if (!context) return;

    const {position} = context;
    const {zoom} = getViewport();

    const isRootLayer = useGraphStore.getState().currentGraphId === 'root';
    const interaction = 'hotkey';

    const newChoiceNodeId = commandManager.createChoiceNode(position, '', {isRootLayer, interaction});

    if (newChoiceNodeId) {
      setCenter(position.x, position.y, {duration: 300, zoom});
      updateNode(newChoiceNodeId, (node) => ({...node, selected: true}));

      // Используем CommandManager для создания связи
      commandManager.connectNarrativeNode({
        source: sourceId,
        target: newChoiceNodeId,
        sourceHandle: sourceHandleId || null,
        targetHandle: targetHandleId || null
      });

      activateEditingMode(newChoiceNodeId, 'choice');
    }
  }, [sourceId, setCenter, getViewport, updateNode, sourceHandleId, targetHandleId, commandManager]);

  const createLayerNode = useCallback(() => {
    const context = getSourcetAndPosition('layer');
    if (!context) return;

    const {position} = context;
    const {zoom} = getViewport();

    // Сохраняем текущее количество узлов для последующего сравнения
    const initialNodes = getNodes();

    // Получаем информацию для трекинга
    const isRootLayer = useGraphStore.getState().currentGraphId === 'root';
    const interaction = 'hotkey'; // Так как вызывается через Ctrl+3

    // Используем CommandManager вместо прямого вызова addLayer
    commandManager.createLayer(position, '', {isRootLayer, interaction});

    // Находим новый узел с задержкой
    setTimeout(() => {
      // Находим новые узлы, которых не было до создания
      const currentNodes = getNodes();

      // Находим новый слой по позиции (с небольшим допуском) и типу
      const newNode = currentNodes.find(
        (node) => node.type === 'layer' && Math.abs(node.position.x - position.x) < 10 && Math.abs(node.position.y - position.y) < 10 && !initialNodes.some((oldNode) => oldNode.id === node.id)
      );

      if (newNode) {
        // Центрируем вид на новом слое
        setCenter(newNode.position.x, newNode.position.y, {duration: 300, zoom});

        // Выделяем новый слой
        updateNode(newNode.id, (node) => ({...node, selected: true}));

        // Активируем режим редактирования нового узла
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent(NODE_EDIT_ACTIVATION_EVENT, {detail: {nodeId: newNode.id, nodeType: 'layer'}}));
        }, 250);
      }
    }, 150);
  }, [getNodes, sourceId, setCenter, getViewport, updateNode, commandManager]);

  const activateEditingMode = (nodeId: string, nodeType: string) => {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent(NODE_EDIT_ACTIVATION_EVENT, {detail: {nodeId, nodeType}}));
    }, 250);
  };

  return {
    createNarrativeNode,
    createChoiceNode,
    createChoiceNodeBelow,
    createLayerNode,
    activateEditingMode
  };
};
