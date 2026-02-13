import React, {useCallback, useRef} from 'react';

import {useRouter} from 'next/navigation';

import {useReactFlow} from '@xyflow/react';

import {useCanvasStore} from '@store/useCanvasStore';
import {useEditingStore} from '@store/useEditingStore';
import {useGraphStore} from '@store/useGraphStore';
import {useLayerStore} from '@store/useLayerStore';
import {useToolStore} from '@store/useToolsStore';

import {copyNodes, cutNodes, duplicateNodes, pasteNodes} from '../clipboard/clipboardOperations';
import {getCommandManager} from '../commands/CommandManager';
import {isZoomModifierKey} from '../utils/keyboardModifiers';
import {buildEditorPath} from '../utils/navigation';
import {useHasNodes, useViewportControls} from './canvas/useViewportControls';
import {useCurrentProject} from './useCurrentProject';
import {useCurrentRoute} from './useCurrentRoute';
import {KeyboardShortcut, useKeyboardHandler} from './useKeyboardHandler';

// Define a custom event name for node editing activation
export const NODE_EDIT_ACTIVATION_EVENT = 'flow:activate-node-editing';

// Define a custom event name for AI Fill activation
export const AI_FILL_ACTIVATION_EVENT = 'flow:activate-ai-fill';

/**
 * Проверяет, нажата ли комбинация Shift+0
 * Учитывает разные варианты ввода (включая преобразования символа ")" при зажатом Shift)
 */
function isShiftZero(e: KeyboardEvent): boolean {
  return e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === '0' || e.key === 'NumPad0' || e.key === ')' || e.code === 'Digit0' || e.code === 'Numpad0');
}

/**
 * Проверяет, нажата ли комбинация Shift+1
 * Учитывает разные варианты ввода (включая преобразования символа "!" при зажатом Shift)
 */
function isShiftOne(e: KeyboardEvent): boolean {
  return e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === '1' || e.key === 'NumPad1' || e.key === '!' || e.code === 'Digit1' || e.code === 'Numpad1');
}

export const useGlobalHotkeys = () => {
  const router = useRouter();
  const {projectId} = useCurrentProject();
  const {timelineId} = useCurrentRoute();
  const activeTool = useToolStore((s) => s.activeTool);
  const resetToCursor = useToolStore((s) => s.resetToCursor);
  const {fitView} = useReactFlow();

  const copyNode = useGraphStore((s) => s.copyNode);
  const pasteNode = useGraphStore((s) => s.pasteNode);
  const cutNode = useGraphStore((s) => s.cutNode);
  const deselectAllNodes = useCanvasStore((s) => s.deselectAllNodes);

  // Получаем слои и текущий ID слоя
  const currentGraphId = useGraphStore((s) => s.currentGraphId);
  const parentLayerId = useGraphStore((s) => s.layers[currentGraphId]?.parentLayerId);

  // Добавляем функционал переключения сайдбара
  const toggleLayersPanel = useLayerStore((s) => s.toggleLayersPanel);

  // Получаем CommandManager для удаления узлов
  const commandManager = getCommandManager();

  // Получаем узлы из хранилища
  const nodes = useCanvasStore((s) => s.nodes);
  // Получаем ребра из хранилища
  const edges = useCanvasStore((s) => s.edges);

  // Ссылка для доступа к DOM элементу контейнера для зума
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Используем viewport controls для зума
  const {zoomIn, zoomOut, resetZoomTo100} = useViewportControls({
    wrapperRef: containerRef
  });

  // Проверяем наличие узлов на холсте для fit view
  const hasNodes = useHasNodes();

  // Определяем, находимся ли мы на корневом слое
  const isRootLayer = currentGraphId === 'root' || !parentLayerId;

  // Функция для перехода на корневой слой
  const goToRootLayer = useCallback(() => {
    if (!isRootLayer && projectId) {
      router.push(buildEditorPath(projectId, timelineId));
    }
  }, [router, isRootLayer, projectId, timelineId]);

  // Функция для перехода на родительский слой
  const goToParentLayer = useCallback(() => {
    if (parentLayerId && projectId) {
      router.push(buildEditorPath(projectId, timelineId, parentLayerId === 'root' ? undefined : parentLayerId));
    }
  }, [router, parentLayerId, projectId, timelineId]);

  // Обработчик для клавиши Escape
  const handleEscape = useCallback(() => {
    if (activeTool !== 'cursor') {
      resetToCursor();
    }

    // Проверяем, есть ли выделенные узлы
    const hasSelectedNodes = nodes.some((node) => node.selected);

    // Снимаем выделение только если есть выделенные узлы
    if (hasSelectedNodes) {
      deselectAllNodes();
    }
  }, [activeTool, resetToCursor, nodes, deselectAllNodes]);

  // Обработчик для клавиши Delete/Backspace
  const handleDelete = useCallback(() => {
    if (activeTool === 'cursor') {
      // Проверяем, есть ли выбранные узлы или ребра
      const hasSelectedNodes = nodes.some((node) => node.selected);
      const hasSelectedEdges = edges.some((edge) => edge.selected);

      // Удаляем выбранные узлы
      if (hasSelectedNodes) {
        commandManager.deleteSelectedNodes();
      }

      // Удаляем выбранные ребра
      if (hasSelectedEdges) {
        commandManager.deleteSelectedEdges();
      }
    }
  }, [activeTool, commandManager, nodes, edges]);

  // Обработчик для копирования
  const handleCopy = useCallback(() => {
    if (activeTool === 'cursor') {
      copyNode();
    }
  }, [activeTool, copyNode]);

  // Обработчик для вставки
  const handlePaste = useCallback(() => {
    pasteNode();
  }, [pasteNode]);

  // Обработчик для вырезания
  const handleCut = useCallback(() => {
    if (activeTool === 'cursor') {
      cutNode();
    }
  }, [activeTool, cutNode]);

  // Обработчик для дублирования
  const handleDuplicate = useCallback(() => {
    if (activeTool === 'cursor') {
      // Используем функцию дублирования из clipboardOperations
      duplicateNodes();
    }
  }, [activeTool]);

  // Обработчик для подгонки вида
  const handleFitView = useCallback(() => {
    fitView({duration: 800});
  }, [fitView]);

  // Обработчик для сброса масштаба в 100% (Shift+0)
  const handleResetZoom = useCallback(() => {
    resetZoomTo100();
  }, [resetZoomTo100]);

  // Обработчик для вписать все объекты в экран (Shift+1)
  const handleFitToView = useCallback(() => {
    if (hasNodes) {
      fitView({duration: 800});
    }
  }, [fitView, hasNodes]);

  // Обработчик для зума через клавиатуру (Ctrl/Cmd + +/-)
  const handleZoomKeyboard = useCallback(
    (e: KeyboardEvent) => {
      // Игнорируем нажатия клавиш при вводе в поля ввода
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (isZoomModifierKey(e)) {
        e.preventDefault();
        e.stopPropagation();

        // Определяем, увеличение или уменьшение
        const isZoomInKey = e.key === '+' || e.key === '=' || e.key === 'Add' || e.code === 'Equal';
        const isZoomOutKey = e.key === '-' || e.key === 'Subtract' || e.code === 'Minus';

        if (isZoomInKey) {
          zoomIn();
        } else if (isZoomOutKey) {
          zoomOut();
        }
      }
    },
    [zoomIn, zoomOut]
  );

  // Обработчик для активации редактирования узла
  const handleNodeEdit = useCallback(() => {
    if (activeTool === 'cursor') {
      // Замедлим обработку Enter для корректного выделения узла
      // после создания нового узла
      setTimeout(() => {
        // Получаем актуальный список узлов прямо в момент обработки
        const currentNodes = useCanvasStore.getState().nodes;
        const selectedNodes = currentNodes.filter((node) => node.selected);

        if (selectedNodes.length === 1) {
          const selectedNode = selectedNodes[0];

          // Dispatch a custom event that node components can listen for
          document.dispatchEvent(
            new CustomEvent(NODE_EDIT_ACTIVATION_EVENT, {
              detail: {nodeId: selectedNode.id, nodeType: selectedNode.type}
            })
          );
        }
      }, 150); // Увеличиваем задержку для стабильной работы
    }
  }, [activeTool]);

  // Обработчик для AI Fill
  const handleAIFill = useCallback(() => {
    if (activeTool === 'cursor') {
      // Получаем актуальный список узлов и узлы в режиме редактирования
      const currentNodes = useCanvasStore.getState().nodes;
      const nodesInEditMode = useEditingStore.getState().nodesInEditMode;
      const selectedNodes = currentNodes.filter((node) => node.selected);

      let targetNode = null;

      // Сначала проверяем выделенные узлы
      if (selectedNodes.length === 1) {
        const selectedNode = selectedNodes[0];
        const nodeText = (selectedNode.data as any)?.text;

        if (selectedNode.type === 'narrative' && nodeText?.trim?.()) {
          targetNode = selectedNode;
        }
      }

      // Если не найден среди выделенных, проверяем узлы в режиме редактирования
      if (!targetNode && nodesInEditMode.length > 0) {
        for (const editingNodeId of nodesInEditMode) {
          const editingNode = currentNodes.find((node) => node.id === editingNodeId);
          if (editingNode) {
            const nodeText = (editingNode.data as any)?.text;

            if (editingNode.type === 'narrative' && nodeText?.trim?.()) {
              targetNode = editingNode;
              break; // Берем первый подходящий узел в режиме редактирования
            }
          }
        }
      }

      if (targetNode) {
        // Отправляем кастомное событие для запуска AI Fill
        document.dispatchEvent(
          new CustomEvent(AI_FILL_ACTIVATION_EVENT, {
            detail: {nodeId: targetNode.id}
          })
        );
      }
    }
  }, [activeTool]);

  // Обработчик для специальных зум-клавиш (Shift+0, Shift+1) и общих зум-клавиш
  const handleSpecialKeys = useCallback(
    (e: KeyboardEvent) => {
      // Игнорируем нажатия клавиш при вводе в поля ввода
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Shift+0 - сброс масштаба в 100%
      if (isShiftZero(e)) {
        e.preventDefault();
        e.stopPropagation();
        handleResetZoom();
        return;
      }

      // Shift+1 - вписать все объекты в экран
      if (isShiftOne(e)) {
        e.preventDefault();
        e.stopPropagation();
        handleFitToView();
        return;
      }

      // Обычные клавиши зума
      handleZoomKeyboard(e);
    },
    [handleResetZoom, handleFitToView, handleZoomKeyboard]
  );

  // Определяем сочетания клавиш для обработки
  const shortcuts: KeyboardShortcut[] = [
    // Переключение панели слоев (Cmd+/ или Ctrl+/)
    {
      key: '/',
      modifierKey: true,
      callback: toggleLayersPanel
    },
    // Переход на корневой слой (Shift+Cmd+Up или Shift+Ctrl+Up)
    {
      key: 'ArrowUp',
      modifierKey: true,
      shiftKey: true,
      callback: goToRootLayer
    },
    // Переход на родительский слой (Shift+Up)
    {
      key: 'ArrowUp',
      shiftKey: true,
      callback: goToParentLayer
    },
    // Сброс выделения и инструмента (Esc)
    {
      key: 'Escape',
      callback: handleEscape
    },
    // Временное панорамирование (Space)
    {
      key: ' ',
      callback: (e) => {
        if (activeTool !== 'cursor') {
          e.preventDefault();
        }
      }
    },
    // Удаление выбранных узлов (Delete или Backspace)
    {
      key: 'Delete',
      callback: handleDelete
    },
    {
      key: 'Backspace',
      callback: handleDelete
    },
    // Копирование (Cmd+C или Ctrl+C)
    {
      key: 'c',
      modifierKey: true,
      callback: handleCopy
    },
    // Вставка (Cmd+V или Ctrl+V)
    {
      key: 'v',
      modifierKey: true,
      callback: handlePaste
    },
    // Вырезание (Cmd+X или Ctrl+X)
    {
      key: 'x',
      modifierKey: true,
      callback: handleCut
    },
    // Подогнать вид (F)
    {
      key: 'f',
      callback: handleFitView
    },
    // Активация редактирования (Enter)
    {
      key: 'Enter',
      callback: handleNodeEdit
    },
    // Дублирование (Cmd+D или Ctrl+D)
    {
      key: 'd',
      modifierKey: true,
      callback: handleDuplicate
    },
    // AI Fill (Cmd+R или Ctrl+R)
    {
      key: 'r',
      modifierKey: true,
      callback: handleAIFill,
      activeInInputs: true // Разрешаем работу в текстовых полях
    }
  ];

  // Используем новый хук для обработки сочетаний клавиш
  useKeyboardHandler(shortcuts, [
    toggleLayersPanel,
    goToRootLayer,
    goToParentLayer,
    handleEscape,
    activeTool,
    handleDelete,
    handleCopy,
    handlePaste,
    handleCut,
    handleFitView,
    handleNodeEdit,
    handleDuplicate,
    handleAIFill
  ]);

  // Дополнительно устанавливаем обработчики для специальных клавиш зума
  React.useEffect(() => {
    // Находим контейнер ReactFlow при монтировании
    setTimeout(() => {
      const reactFlowContainer = document.querySelector('.react-flow');
      if (reactFlowContainer instanceof HTMLDivElement) {
        containerRef.current = reactFlowContainer;
      }
    }, 500);

    // Добавляем обработчик для специальных зум-клавиш с высоким приоритетом
    document.addEventListener('keydown', handleSpecialKeys, {capture: true});

    return () => {
      document.removeEventListener('keydown', handleSpecialKeys, {capture: true});
    };
  }, [handleSpecialKeys]);
};
