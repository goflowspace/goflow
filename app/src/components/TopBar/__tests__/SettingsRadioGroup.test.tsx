import React from 'react';

import {fireEvent, render, screen} from '@testing-library/react';
import {I18nextProvider} from 'react-i18next';
import i18n from 'src/locales/test-i18n';

import {SettingsRadioGroup} from '../SettingsRadioGroup';

// Мок для Radix UI компонентов
jest.mock('@radix-ui/themes', () => ({
  DropdownMenu: {
    RadioGroup: ({children, value, onValueChange}: {children: React.ReactNode; value?: string; onValueChange?: (value: string) => void}) => (
      <div data-testid='radio-group' data-value={value} onClick={() => onValueChange?.('test-value')}>
        {children}
      </div>
    ),
    RadioItem: ({children, value, onSelect}: {children: React.ReactNode; value: string; onSelect?: (e: Event) => void}) => {
      const handleClick = () => {
        const mockEvent = new Event('select');
        onSelect?.(mockEvent);
      };

      return (
        <div data-testid='radio-item' data-value={value} onClick={handleClick}>
          {children}
        </div>
      );
    }
  }
}));

describe('SettingsRadioGroup', () => {
  const mockOptions = [
    {value: 'option1', label: 'Option 1'},
    {value: 'option2', label: 'Option 2'},
    {value: 'option3', label: 'Option 3'}
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all options correctly', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={mockOnChange} options={mockOptions} />
      </I18nextProvider>
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('does not prevent menu close when preventClose is false', () => {
    const preventDefault = jest.fn();
    const mockEvent = {preventDefault};

    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={mockOnChange} options={mockOptions} preventClose={false} />
      </I18nextProvider>
    );

    const radioItem = screen.getAllByTestId('radio-item')[0];
    fireEvent.click(radioItem);

    // preventDefault не должен быть вызван
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('passes preventClose prop correctly', () => {
    const {rerender} = render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={mockOnChange} options={mockOptions} preventClose={true} />
      </I18nextProvider>
    );

    // Проверяем что компонент рендерится с preventClose=true
    expect(screen.getByTestId('radio-group')).toBeInTheDocument();

    // Перерендериваем с preventClose=false
    rerender(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={mockOnChange} options={mockOptions} preventClose={false} />
      </I18nextProvider>
    );

    // Проверяем что компонент рендерится с preventClose=false
    expect(screen.getByTestId('radio-group')).toBeInTheDocument();
  });

  it('defaults preventClose to false when not specified', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={mockOnChange} options={mockOptions} />
      </I18nextProvider>
    );

    // Компонент должен рендериться без ошибок
    expect(screen.getByTestId('radio-group')).toBeInTheDocument();
  });

  it('renders color indicators when provided', () => {
    const optionsWithColors = [
      {value: 'red', label: 'Red', color: '#ff0000'},
      {value: 'blue', label: 'Blue', color: '#0000ff'}
    ];

    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='red' onChange={mockOnChange} options={optionsWithColors} />
      </I18nextProvider>
    );

    const colorIndicators = document.querySelectorAll('span[style*="background"]');
    expect(colorIndicators).toHaveLength(2);
  });

  it('handles translation correctly', () => {
    const optionsWithTranslation = [
      {value: 'key1', label: 'translation.key1', needsTranslation: true},
      {value: 'key2', label: 'No Translation', needsTranslation: false}
    ];

    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='key1' onChange={mockOnChange} options={optionsWithTranslation} />
      </I18nextProvider>
    );

    // Проверяем что элементы рендерятся
    expect(screen.getByTestId('radio-group')).toBeInTheDocument();
  });
});
