import {MouseEvent, RefObject} from 'react';

import {getCommandManager} from 'src/commands/CommandManager';

import {useCanvasStore} from '@store/useCanvasStore';
import {useEditingStore} from '@store/useEditingStore';
import {useGraphStore} from '@store/useGraphStore';
import {useToolStore} from '@store/useToolsStore';

import {useProjectedMousePosition} from './useProjectedMousePosition';

export function useToolInteractionOnCanvas({wrapperRef, setCursorPos}: {wrapperRef: RefObject<HTMLDivElement | null>; setCursorPos: (pos: {x: number; y: number} | null) => void}) {
  const {activeTool} = useToolStore();
  const {projectMouseEvent} = useProjectedMousePosition();
  const {deselectAllNodes} = useCanvasStore();
  const {deactivateAllEditingModes} = useEditingStore();
  const graphStore = useGraphStore.getState();
  const commandManager = getCommandManager();

  const handlePaneClick = (e: MouseEvent) => {
    if (!wrapperRef.current) return;

    // When using cursor tool and clicking directly on the canvas,
    // ensure all nodes are deselected and editing modes are deactivated
    if (activeTool === 'cursor') {
      // Explicitly deselect all nodes when clicking on the canvas
      deselectAllNodes();
      deactivateAllEditingModes();
      return;
    }

    const position = projectMouseEvent(e, wrapperRef.current);
    const isRootLayer = graphStore.currentGraphId === 'root';
    const interaction = 'mouse';

    if (activeTool === 'node-tool') {
      commandManager.createNarrativeNode(position, {title: '', text: ''}, {isRootLayer, interaction});
      setCursorPos(null);
    }

    if (activeTool === 'choice') {
      commandManager.createChoiceNode(position, '', {isRootLayer, interaction});
      setCursorPos(null);
    }

    if (activeTool === 'layer') {
      commandManager.createLayer(position, '', {isRootLayer, interaction});
      setCursorPos(null);
    }

    if (activeTool === 'note') {
      commandManager.createNote(position, '', undefined, {isRootLayer, interaction});
      // Не сбрасываем инструмент, чтобы пользователь мог создавать несколько заметок подряд

      setCursorPos(null);
    }
  };

  return {
    handlePaneClick
  };
}
