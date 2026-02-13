import React, {useCallback, useState} from 'react';

import {ToolId} from '../types/tools';

interface ToolDragDropState {
  isDraggingTool: boolean;
  draggedTool: ToolId | null;
  ghostPosition: {x: number; y: number} | null;
}

export const useToolDragDrop = () => {
  const [state, setState] = useState<ToolDragDropState>({
    isDraggingTool: false,
    draggedTool: null,
    ghostPosition: null
  });

  const setIsDraggingTool = useCallback((isDragging: boolean) => {
    setState((prev) => ({...prev, isDraggingTool: isDragging}));
  }, []);

  const setDraggedTool = useCallback((toolId: ToolId | null) => {
    setState((prev) => ({...prev, draggedTool: toolId}));
  }, []);

  const setGhostPosition = useCallback((position: {x: number; y: number} | null) => {
    setState((prev) => ({...prev, ghostPosition: position}));
  }, []);

  const resetDragState = useCallback(() => {
    setState({
      isDraggingTool: false,
      draggedTool: null,
      ghostPosition: null
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      // Проверяем, что мы действительно покинули canvas область
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setGhostPosition(null);
      }
    },
    [setGhostPosition]
  );

  return {
    ...state,
    setIsDraggingTool,
    setDraggedTool,
    setGhostPosition,
    resetDragState,
    handleDragOver,
    handleDragEnter,
    handleDragLeave
  };
};
