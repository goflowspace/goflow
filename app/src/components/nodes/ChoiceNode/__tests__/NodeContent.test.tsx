import React from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

import {EditableContent, StaticContent} from '../NodeContent';

// Мок для @radix-ui/themes
jest.mock('@radix-ui/themes', () => ({
  TextArea: jest.fn(({value, onChange, onBlur, placeholder, onKeyDown, rows, className, children, ...props}) => (
    <textarea data-testid='mock-text-area' value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} onKeyDown={onKeyDown} rows={rows} className={className} {...props}>
      {children}
    </textarea>
  ))
}));

describe('NodeContent Components', () => {
  describe('EditableContent Component', () => {
    const mockProps = {
      value: 'Test value',
      onChange: jest.fn(),
      onKeyDown: jest.fn(),
      onBlur: jest.fn(),
      placeholder: 'Test placeholder',
      rows: 3,
      selected: true
    };

    it('renders TextArea with correct props', () => {
      render(<EditableContent {...mockProps} />);

      const textArea = screen.getByTestId('mock-text-area');
      expect(textArea).toBeInTheDocument();
      expect(textArea).toHaveValue('Test value');
      expect(textArea).toHaveAttribute('placeholder', 'Test placeholder');
      expect(textArea).toHaveAttribute('rows', '3');
    });

    it('applies nodrag and nowheel classes', () => {
      render(<EditableContent {...mockProps} />);

      const textArea = screen.getByTestId('mock-text-area');
      expect(textArea.className).toContain('nodrag');
      expect(textArea.className).toContain('nowheel');
      expect(textArea.className).toContain('nopan');
    });

    it('applies selected class when selected', () => {
      render(<EditableContent {...mockProps} selected={true} />);

      const textArea = screen.getByTestId('mock-text-area');
      expect(textArea.className).toContain('selected');
    });

    it('calls onChange when content changes', () => {
      render(<EditableContent {...mockProps} />);

      const textArea = screen.getByTestId('mock-text-area');
      fireEvent.change(textArea, {target: {value: 'New value'}});

      expect(mockProps.onChange).toHaveBeenCalled();
    });

    it('calls onBlur when focus is lost', () => {
      render(<EditableContent {...mockProps} />);

      const textArea = screen.getByTestId('mock-text-area');
      fireEvent.blur(textArea);

      expect(mockProps.onBlur).toHaveBeenCalled();
    });

    it('calls onKeyDown when a key is pressed', () => {
      render(<EditableContent {...mockProps} />);

      const textArea = screen.getByTestId('mock-text-area');
      fireEvent.keyDown(textArea, {key: 'Enter', code: 'Enter'});

      expect(mockProps.onKeyDown).toHaveBeenCalled();
    });
  });

  describe('StaticContent Component', () => {
    const mockProps = {
      value: 'Test static value',
      placeholder: 'Test static placeholder',
      onClick: jest.fn()
    };

    it('renders content with value', () => {
      render(<StaticContent {...mockProps} />);

      const content = screen.getByText('Test static value');
      expect(content).toBeInTheDocument();
    });

    it('renders placeholder when value is empty', () => {
      render(<StaticContent {...mockProps} value='' />);

      const content = screen.getByText('Test static placeholder');
      expect(content).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      render(<StaticContent {...mockProps} />);

      const content = screen.getByText('Test static value');
      fireEvent.click(content);

      expect(mockProps.onClick).toHaveBeenCalled();
    });

    it('has pointer cursor style', () => {
      const {container} = render(<StaticContent {...mockProps} />);
      const content = container.firstChild as HTMLElement;

      expect(content.style.cursor).toBe('pointer');
    });
  });
});
