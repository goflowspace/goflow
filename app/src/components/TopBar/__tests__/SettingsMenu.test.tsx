import React from 'react';

import {render, screen} from '@testing-library/react';
import {I18nextProvider} from 'react-i18next';
import i18n from 'src/locales/test-i18n';

import SettingsMenu from '../SettingsMenu';

// Мок для хранилища настроек редактора
jest.mock('@store/useEditorSettingsStore', () => ({
  useEditorSettingsStore: jest.fn(() => ({
    theme: 'dark',
    setTheme: jest.fn(),
    grid: 'dots',
    setGrid: jest.fn(),
    gridGap: 20,
    setGridGap: jest.fn(),
    canvasColor: 'default',
    setCanvasColor: jest.fn(),
    snapToGrid: false,
    setSnapToGrid: jest.fn(),
    linkSnapping: true,
    setLinkSnapping: jest.fn(),
    linkThickness: 'medium',
    setLinkThickness: jest.fn(),
    linkStyle: 'bezier',
    setLinkStyle: jest.fn(),
    controls: 'default',
    setControls: jest.fn(),
    toolsHotkeys: 'numbers',
    setToolsHotkeys: jest.fn(),
    resetToDefaults: jest.fn()
  }))
}));

// Мок для настроек
jest.mock('../settings-options', () => ({
  THEME_OPTIONS: [{value: 'light', label: 'Light'}],
  GRID_OPTIONS: [{value: 'dots', label: 'Dots'}],
  GRID_GAP_OPTIONS: [{value: '20', label: '20px'}],
  CANVAS_COLOR_OPTIONS: [{value: 'default', label: 'Default'}],
  LINK_THICKNESS_OPTIONS: [{value: 'medium', label: 'Medium'}],
  LINK_STYLE_OPTIONS: [{value: 'bezier', label: 'Bezier'}],
  CONTROLS_OPTIONS: [{value: 'default', label: 'Default'}],
  TOOLS_HOTKEYS_OPTIONS: [{value: 'numbers', label: 'Numbers'}],
  LANGUAGE_OPTIONS: [{value: 'en', label: 'English'}]
}));

// Мок для Radix UI компонентов
jest.mock('@radix-ui/themes', () => ({
  Theme: ({children}: {children: React.ReactNode}) => <div data-testid='mock-theme'>{children}</div>,
  DropdownMenu: {
    Root: ({children, open}: {children: React.ReactNode; open?: boolean}) => (open ? <div data-testid='dropdown-root'>{children}</div> : null),
    Content: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-content'>{children}</div>,
    Sub: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-sub'>{children}</div>,
    SubTrigger: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-sub-trigger'>{children}</div>,
    SubContent: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-sub-content'>{children}</div>,
    Item: ({children, onClick, asChild}: {children: React.ReactNode; onClick?: () => void; asChild?: boolean}) => (
      <div data-testid='dropdown-item' onClick={onClick}>
        {asChild ? children : <span>{children}</span>}
      </div>
    ),
    Separator: () => <hr data-testid='dropdown-separator' />,
    RadioGroup: ({children, value, onValueChange}: {children: React.ReactNode; value?: string; onValueChange?: (value: string) => void}) => (
      <div data-testid='radio-group' data-value={value}>
        {children}
      </div>
    ),
    RadioItem: ({children, value}: {children: React.ReactNode; value: string}) => (
      <div data-testid='radio-item' data-value={value}>
        {children}
      </div>
    )
  }
}));

describe('SettingsMenu', () => {
  it('renders without crashing and shows main sections', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsMenu onChangeLanguage={() => {}} />
      </I18nextProvider>
    );
    // Проверяем наличие основных секций по ключам локализации
    expect(screen.getByText('top_bar.language_menu')).toBeInTheDocument();
    expect(screen.getByText('top_bar.editor_section')).toBeInTheDocument();
    expect(screen.getByText('editor_settings.controls_section')).toBeInTheDocument();
    expect(screen.getByText('editor_settings.tools_hotkeys_section')).toBeInTheDocument();
  });
});
