import type {MouseEvent} from 'react';

import {useViewport} from '@xyflow/react';

export const useProjectedMousePosition = () => {
  const {x: offsetX, y: offsetY, zoom} = useViewport();

  const projectMouseEvent = (event: MouseEvent, wrapperElement: HTMLDivElement) => {
    const bounds = wrapperElement.getBoundingClientRect();

    return {
      x: (event.clientX - bounds.left - offsetX) / zoom,
      y: (event.clientY - bounds.top - offsetY) / zoom
    };
  };

  return {projectMouseEvent};
};
