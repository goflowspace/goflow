import React from 'react';

import {render, screen} from '@testing-library/react';
import {I18nextProvider} from 'react-i18next';
import i18n from 'src/locales/test-i18n';

import {SettingsRadioGroup} from '../SettingsRadioGroup';

// Простой мок для Radix UI
jest.mock('@radix-ui/themes', () => ({
  DropdownMenu: {
    RadioGroup: ({children, value}: {children: React.ReactNode; value?: string}) => (
      <div data-testid='mock-radio-group' data-value={value}>
        {children}
      </div>
    ),
    RadioItem: ({children, value, onSelect}: {children: React.ReactNode; value: string; onSelect?: (e: any) => void}) => (
      <div data-testid='mock-radio-item' data-value={value} data-prevent-close={onSelect ? 'true' : 'false'}>
        {children}
      </div>
    )
  }
}));

describe('SettingsRadioGroup - Basic Functionality', () => {
  const testOptions = [
    {value: 'option1', label: 'Option One'},
    {value: 'option2', label: 'Option Two', color: '#ff0000'},
    {value: 'option3', label: 'translation.key', needsTranslation: true}
  ];

  it('renders with default props', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={() => {}} options={testOptions} />
      </I18nextProvider>
    );

    expect(screen.getByTestId('mock-radio-group')).toBeInTheDocument();
    expect(screen.getByText('Option One')).toBeInTheDocument();
    expect(screen.getByText('Option Two')).toBeInTheDocument();
  });

  it('applies preventClose prop correctly', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={() => {}} options={testOptions} preventClose={true} />
      </I18nextProvider>
    );

    const radioItems = screen.getAllByTestId('mock-radio-item');

    // Все элементы должны иметь onSelect обработчик когда preventClose=true
    radioItems.forEach((item) => {
      expect(item).toHaveAttribute('data-prevent-close', 'true');
    });
  });

  it('does not apply preventClose when false', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={() => {}} options={testOptions} preventClose={false} />
      </I18nextProvider>
    );

    const radioItems = screen.getAllByTestId('mock-radio-item');

    // Элементы не должны иметь onSelect обработчик когда preventClose=false
    radioItems.forEach((item) => {
      expect(item).toHaveAttribute('data-prevent-close', 'false');
    });
  });

  it('renders color indicators', () => {
    const {container} = render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option1' onChange={() => {}} options={testOptions} />
      </I18nextProvider>
    );

    // Проверяем наличие span с цветовым индикатором
    const colorSpan = container.querySelector('span[style*="background: rgb(255, 0, 0)"]');
    expect(colorSpan).toBeInTheDocument();
  });

  it('handles translation correctly', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup
          value='option1'
          onChange={() => {}}
          options={[
            {value: 'test1', label: 'No Translation', needsTranslation: false},
            {value: 'test2', label: 'translation.key', needsTranslation: true}
          ]}
        />
      </I18nextProvider>
    );

    expect(screen.getByText('No Translation')).toBeInTheDocument();
    expect(screen.getByText('translation.key')).toBeInTheDocument(); // В тестах ключ возвращается как есть
  });

  it('passes correct value to RadioGroup', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsRadioGroup value='option2' onChange={() => {}} options={testOptions} />
      </I18nextProvider>
    );

    const radioGroup = screen.getByTestId('mock-radio-group');
    expect(radioGroup).toHaveAttribute('data-value', 'option2');
  });
});
