import React from 'react';

import {render, screen} from '@testing-library/react';
import * as xyFlow from '@xyflow/react';

import ChoiceNodeGhost from '../ChoiceNodeGhost';

// Мокаем @xyflow/react
jest.mock('@xyflow/react', () => ({
  useViewport: jest.fn(),
  Handle: ({children, ...props}: any) => (
    <div data-testid='handle' {...props}>
      {children}
    </div>
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom'
  }
}));

describe('ChoiceNodeGhost Component', () => {
  // Настройка моков перед каждым тестом
  beforeEach(() => {
    jest.clearAllMocks();

    // Настройка мока useViewport
    (xyFlow.useViewport as jest.Mock).mockReturnValue({
      zoom: 1,
      x: 0,
      y: 0
    });
  });

  it('renders ghost node at specified position', () => {
    const position = {x: 100, y: 200};
    const {container} = render(<ChoiceNodeGhost position={position} />);

    const ghostElement = container.firstChild as HTMLElement;
    expect(ghostElement).toBeInTheDocument();
    expect(ghostElement.style.left).toBe('100px');
    expect(ghostElement.style.top).toBe('200px');
  });

  it('applies ghost classes', () => {
    const position = {x: 0, y: 0};
    const {container} = render(<ChoiceNodeGhost position={position} />);

    const ghostElement = container.firstChild as HTMLElement;
    expect(ghostElement.className).toContain('ghost');

    // Проверяем, что и карточка тоже имеет специальный класс
    const cardElement = container.querySelector('.card_ghost');
    expect(cardElement).toBeInTheDocument();
  });

  it('renders with default text', () => {
    const position = {x: 0, y: 0};
    render(<ChoiceNodeGhost position={position} />);

    expect(screen.getByText('Add choice here')).toBeInTheDocument();
  });

  it('applies zoom level from useViewport', () => {
    // Устанавливаем мок для useViewport с определенным масштабом
    (xyFlow.useViewport as jest.Mock).mockReturnValue({
      zoom: 1.5,
      x: 0,
      y: 0
    });

    const position = {x: 0, y: 0};
    const {container} = render(<ChoiceNodeGhost position={position} />);

    const ghostElement = container.firstChild as HTMLElement;
    expect(ghostElement.style.transform).toBe('scale(1.5)');
  });

  it('sets pointerEvents to none for ghost element', () => {
    const position = {x: 0, y: 0};
    const {container} = render(<ChoiceNodeGhost position={position} />);

    const ghostElement = container.firstChild as HTMLElement;
    expect(ghostElement.style.pointerEvents).toBe('none');
  });

  it('sets high zIndex for ghost element', () => {
    const position = {x: 0, y: 0};
    const {container} = render(<ChoiceNodeGhost position={position} />);

    const ghostElement = container.firstChild as HTMLElement;
    expect(ghostElement.style.zIndex).toBe('9999');
  });
});
