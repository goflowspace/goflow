import React from 'react';

import {render} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import CommentNodeGhost from '../CommentNodeGhost';

// Мокаем useViewport хук
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  useViewport: () => ({
    zoom: 1
  })
}));

describe('CommentNodeGhost', () => {
  const mockPosition = {x: 100, y: 200};

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
  };

  it('рендерится без ошибок', () => {
    const {container} = renderWithProvider(<CommentNodeGhost position={mockPosition} />);
    expect(container).toBeInTheDocument();
  });

  it('применяет правильную позицию', () => {
    const {container} = renderWithProvider(<CommentNodeGhost position={mockPosition} />);
    const ghostElement = container.firstChild as HTMLElement;

    expect(ghostElement).toHaveStyle({
      position: 'absolute',
      left: `${mockPosition.x}px`,
      top: `${mockPosition.y}px`
    });
  });

  it('имеет правильные стили призрака', () => {
    const {container} = renderWithProvider(<CommentNodeGhost position={mockPosition} />);
    const commentNode = container.querySelector('.commentNode');

    expect(commentNode).toHaveStyle({
      opacity: '0.6',
      border: '2px dashed #cbd5e1'
    });
  });

  it('отображает иконку комментария', () => {
    const {container} = renderWithProvider(<CommentNodeGhost position={mockPosition} />);
    const icon = container.querySelector('svg');

    expect(icon).toBeInTheDocument();
  });

  it('не имеет pointer events', () => {
    const {container} = renderWithProvider(<CommentNodeGhost position={mockPosition} />);
    const ghostElement = container.firstChild as HTMLElement;

    expect(ghostElement).toHaveStyle({
      pointerEvents: 'none'
    });
  });
});
