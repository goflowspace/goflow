import React from 'react';

import {render, screen} from '@testing-library/react';

import {NodeHint} from '../NodeHint';

describe('NodeHint component', () => {
  it('renders text when isVisible is true', () => {
    render(<NodeHint isVisible={true} text='Test hint' />);

    const hint = screen.getByText('Test hint');
    expect(hint).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(<NodeHint isVisible={false} text='Test hint' />);

    const hint = screen.queryByText('Test hint');
    expect(hint).not.toBeInTheDocument();
  });

  it('applies default position styles', () => {
    const {container} = render(<NodeHint isVisible={true} text='Test hint' />);
    const hintElement = container.firstChild as HTMLElement;

    // Проверяем inline styles
    expect(hintElement.style.top).toBe('-20px');
    expect(hintElement.style.left).toBe('50%');
    expect(hintElement.style.transform).toBe('translateX(-50%)');
  });

  it('applies custom position styles', () => {
    const customPosition = {
      top: '10px',
      left: '20%',
      transform: 'translateX(-20%)'
    };

    const {container} = render(<NodeHint isVisible={true} text='Test hint' position={customPosition} />);
    const hintElement = container.firstChild as HTMLElement;

    // Проверяем inline styles
    expect(hintElement.style.top).toBe('10px');
    expect(hintElement.style.left).toBe('20%');
    expect(hintElement.style.transform).toBe('translateX(-20%)');
  });
});
