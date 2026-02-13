import React from 'react';

import {act, fireEvent, render, screen} from '@testing-library/react';

import {EditableText, StaticText} from '../EditableContent';

describe('EditableText component', () => {
  const defaultProps = {
    value: 'Test value',
    onChange: jest.fn(),
    onKeyDown: jest.fn(),
    onBlur: jest.fn(),
    placeholder: 'Test placeholder',
    selected: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders textarea correctly', () => {
    const {container} = render(<EditableText {...defaultProps} />);

    // Проверяем, что текстовое поле отрендерено с правильным значением
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('Test value');
    expect(textarea).toHaveAttribute('placeholder', 'Test placeholder');
  });

  it('renders input field when variant is input', () => {
    const {container} = render(<EditableText {...defaultProps} variant='input' />);

    // Проверяем, что поле ввода отрендерено с правильным значением
    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Test value');
    expect(input).toHaveAttribute('placeholder', 'Test placeholder');
  });

  it('calls onChange when text changes', () => {
    const {container} = render(<EditableText {...defaultProps} />);

    const textarea = container.querySelector('textarea');
    if (textarea) {
      fireEvent.change(textarea, {target: {value: 'New value'}});
    }

    expect(defaultProps.onChange).toHaveBeenCalledWith('New value');
  });

  it('calls onKeyDown when key is pressed', () => {
    const {container} = render(<EditableText {...defaultProps} />);

    const textarea = container.querySelector('textarea');
    if (textarea) {
      fireEvent.keyDown(textarea, {key: 'Enter', code: 'Enter'});
    }

    expect(defaultProps.onKeyDown).toHaveBeenCalled();
  });

  it('calls onBlur when focus is lost', () => {
    const {container} = render(<EditableText {...defaultProps} />);

    const textarea = container.querySelector('textarea');
    if (textarea) {
      fireEvent.blur(textarea);
    }

    expect(defaultProps.onBlur).toHaveBeenCalled();
  });
});

describe('StaticText component', () => {
  const defaultProps = {
    value: 'Test value',
    placeholder: 'Test placeholder',
    onDoubleClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders static text correctly', () => {
    render(<StaticText {...defaultProps} />);

    const staticText = screen.getByText('Test value');
    expect(staticText).toBeInTheDocument();
  });

  it('renders placeholder when value is empty', () => {
    render(<StaticText {...defaultProps} value='' />);

    const placeholder = screen.getByText('Test placeholder');
    expect(placeholder).toBeInTheDocument();
  });

  it('calls onDoubleClick when double clicked', () => {
    render(<StaticText {...defaultProps} />);

    const staticText = screen.getByText('Test value');
    fireEvent.doubleClick(staticText);

    expect(defaultProps.onDoubleClick).toHaveBeenCalled();
  });

  it('applies singleLine styles when singleLine is true', () => {
    render(<StaticText {...defaultProps} singleLine={true} />);

    const staticText = screen.getByText('Test value');
    expect(staticText).toHaveClass('name_input_static');
  });

  it('applies multiline styles when singleLine is false', () => {
    render(<StaticText {...defaultProps} singleLine={false} />);

    const staticText = screen.getByText('Test value');
    expect(staticText).toHaveClass('desc_input_static');
  });
});
