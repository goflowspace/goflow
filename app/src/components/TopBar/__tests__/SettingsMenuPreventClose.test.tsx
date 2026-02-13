import React from 'react';

import {fireEvent, render, screen} from '@testing-library/react';
import {I18nextProvider} from 'react-i18next';
import i18n from 'src/locales/test-i18n';

import {useEditorSettingsStore} from '@store/useEditorSettingsStore';

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

const mockUseEditorSettingsStore = jest.mocked(useEditorSettingsStore);

// Мок для настроек
jest.mock('../settings-options', () => ({
  THEME_OPTIONS: [
    {value: 'light', label: 'Light'},
    {value: 'dark', label: 'Dark'}
  ],
  GRID_OPTIONS: [
    {value: 'dots', label: 'Dots'},
    {value: 'lines', label: 'Lines'}
  ],
  GRID_GAP_OPTIONS: [
    {value: '10', label: '10px'},
    {value: '20', label: '20px'}
  ],
  CANVAS_COLOR_OPTIONS: [
    {value: 'default', label: 'Default'},
    {value: 'white', label: 'White'}
  ],
  LINK_THICKNESS_OPTIONS: [
    {value: 'thin', label: 'Thin'},
    {value: 'medium', label: 'Medium'}
  ],
  LINK_STYLE_OPTIONS: [
    {value: 'bezier', label: 'Bezier'},
    {value: 'straight', label: 'Straight'}
  ],
  CONTROLS_OPTIONS: [
    {value: 'default', label: 'Default'},
    {value: 'advanced', label: 'Advanced'}
  ],
  TOOLS_HOTKEYS_OPTIONS: [
    {value: 'numbers', label: 'Numbers'},
    {value: 'letters', label: 'Letters'}
  ],
  LANGUAGE_OPTIONS: [
    {value: 'en', label: 'English'},
    {value: 'ru', label: 'Русский'}
  ]
}));

// Простой мок для Radix UI компонентов
jest.mock('@radix-ui/themes', () => ({
  DropdownMenu: {
    Sub: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-sub'>{children}</div>,
    SubTrigger: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-sub-trigger'>{children}</div>,
    SubContent: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-sub-content'>{children}</div>,
    Item: ({children, onClick, onSelect, asChild}: {children: React.ReactNode; onClick?: () => void; onSelect?: (e: Event) => void; asChild?: boolean}) => {
      const handleClick = () => {
        const mockEvent = new Event('select');
        const preventDefaultCalled = {value: false};

        // Создаем мок события с preventDefault
        const eventWithPreventDefault = {
          ...mockEvent,
          preventDefault: () => {
            preventDefaultCalled.value = true;
          }
        };

        onSelect?.(eventWithPreventDefault as any);
        onClick?.();
      };

      if (asChild) {
        return (
          <div data-testid='dropdown-item-asChild' onClick={handleClick}>
            {children}
          </div>
        );
      }

      return (
        <div data-testid='dropdown-item' onClick={handleClick}>
          {children}
        </div>
      );
    },
    Separator: () => <hr data-testid='dropdown-separator' />,
    RadioGroup: ({children, value, onValueChange}: {children: React.ReactNode; value?: string; onValueChange?: (value: string) => void}) => (
      <div data-testid='radio-group' data-value={value}>
        {children}
      </div>
    ),
    RadioItem: ({children, value, onSelect}: {children: React.ReactNode; value: string; onSelect?: (e: any) => void}) => {
      const handleClick = () => {
        const preventDefault = jest.fn();
        const mockEvent = {preventDefault};
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

describe('SettingsMenu - Prevent Close Functionality', () => {
  const mockOnChangeLanguage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all settings sections', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsMenu onChangeLanguage={mockOnChangeLanguage} />
      </I18nextProvider>
    );

    // Проверяем основные секции
    expect(screen.getByText('top_bar.language_menu')).toBeInTheDocument();
    expect(screen.getByText('top_bar.editor_section')).toBeInTheDocument();
    expect(screen.getByText('editor_settings.controls_section')).toBeInTheDocument();
    expect(screen.getByText('editor_settings.tools_hotkeys_section')).toBeInTheDocument();
  });

  it('renders workspace settings that should prevent close', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsMenu onChangeLanguage={mockOnChangeLanguage} />
      </I18nextProvider>
    );

    // Проверяем что настройки рабочего пространства присутствуют
    expect(screen.getByText('editor_settings.theme_section')).toBeInTheDocument();
    expect(screen.getByText('editor_settings.grid_section')).toBeInTheDocument();
    expect(screen.getByText('editor_settings.grid_gap_section')).toBeInTheDocument();
    expect(screen.getByText('editor_settings.canvas_color_section')).toBeInTheDocument();
    expect(screen.getAllByText('editor_settings.canvas_snap_to_grid_button')).toHaveLength(2); // Встречается в SubTrigger и label
    expect(screen.getAllByText('editor_settings.canvas_link_snapping_button')).toHaveLength(2); // Встречается в SubTrigger и label
    expect(screen.getByText('editor_settings.obj_section_link_thickness')).toBeInTheDocument();
    expect(screen.getByText('editor_settings.obj_section_link_style')).toBeInTheDocument();
  });

  it('renders reset to defaults button', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsMenu onChangeLanguage={mockOnChangeLanguage} />
      </I18nextProvider>
    );

    expect(screen.getByText('editor_settings.reset_to_defaults')).toBeInTheDocument();
  });

  it('has correct structure with radiogroups', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsMenu onChangeLanguage={mockOnChangeLanguage} />
      </I18nextProvider>
    );

    // Проверяем что RadioGroup компоненты присутствуют
    const radioGroups = screen.getAllByTestId('radio-group');
    expect(radioGroups.length).toBeGreaterThan(0);
  });

  it('checkbox inputs should be present for snap settings', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsMenu onChangeLanguage={mockOnChangeLanguage} />
      </I18nextProvider>
    );

    // Проверяем что checkbox'ы присутствуют (как asChild элементы)
    const asChildItems = screen.getAllByTestId('dropdown-item-asChild');
    expect(asChildItems.length).toBeGreaterThan(0);
  });

  it('reset button should be clickable', () => {
    const mockResetToDefaults = jest.fn();

    // Мокаем resetToDefaults для этого теста
    mockUseEditorSettingsStore.mockReturnValue({
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
      resetToDefaults: mockResetToDefaults
    });

    render(
      <I18nextProvider i18n={i18n}>
        <SettingsMenu onChangeLanguage={mockOnChangeLanguage} />
      </I18nextProvider>
    );

    const resetButton = screen.getByText('editor_settings.reset_to_defaults');
    fireEvent.click(resetButton);

    expect(mockResetToDefaults).toHaveBeenCalled();
  });
});
