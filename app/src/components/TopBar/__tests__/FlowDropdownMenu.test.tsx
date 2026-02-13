import React from 'react';

import * as Toast from '@radix-ui/react-toast';
import * as Tooltip from '@radix-ui/react-tooltip';
import {Theme} from '@radix-ui/themes';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {getVersionString} from 'src/utils/version';

import FlowDropdownMenu from '../FlowDropdownMenu';

// Mock all external dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key
  })
}));

jest.mock('src/utils/version', () => ({
  getVersionString: () => 'v1.0.0'
}));

// Mock Radix UI DropdownMenu components
jest.mock('@radix-ui/themes', () => {
  const actual = jest.requireActual('@radix-ui/themes');
  return {
    ...actual,
    DropdownMenu: {
      Root: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-root'>{children}</div>,
      Trigger: ({children, onClick}: {children: React.ReactNode; onClick?: () => void}) => (
        <div data-testid='dropdown-trigger' onClick={onClick}>
          {children}
        </div>
      ),
      Content: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-content'>{children}</div>,
      Group: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-group'>{children}</div>,
      Label: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-label'>{children}</div>,
      Separator: () => <div data-testid='dropdown-separator' />,
      Item: ({children, onClick, color}: {children: React.ReactNode; onClick?: () => void; color?: string}) => (
        <div data-testid='dropdown-item' onClick={onClick} data-color={color}>
          {children}
        </div>
      ),
      Sub: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-sub'>{children}</div>,
      SubTrigger: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-subtrigger'>{children}</div>,
      SubContent: ({children}: {children: React.ReactNode}) => <div data-testid='dropdown-subcontent'>{children}</div>
    }
  };
});

// Mock SettingsMenu component
jest.mock('../SettingsMenu', () => {
  return ({onChangeLanguage}: {onChangeLanguage: (lang: string) => void}) => (
    <div data-testid='settings-menu'>
      <button onClick={() => onChangeLanguage('en')}>English</button>
      <button onClick={() => onChangeLanguage('ru')}>Russian</button>
    </div>
  );
});

describe('FlowDropdownMenu component', () => {
  const mockProps = {
    onExportClick: jest.fn(),
    onImportToProjectClick: jest.fn(),
    onOpenWelcomeStory: jest.fn(),
    onChangeLanguage: jest.fn()
  };

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <Theme>
        <Tooltip.Provider>
          <Toast.Provider>{ui}</Toast.Provider>
        </Tooltip.Provider>
      </Theme>
    );
  };

  beforeEach(() => {
    // Clear all mocks before each test
    Object.values(mockProps).forEach((mock) => mock.mockClear());
  });

  it('renders the dropdown trigger button with correct text', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    const dropdownRoot = screen.getByTestId('dropdown-root');
    const dropdownTrigger = screen.getByTestId('dropdown-trigger');
    expect(dropdownRoot).toBeInTheDocument();
    expect(dropdownTrigger).toBeInTheDocument();
    expect(screen.getByText('Go Flow')).toBeInTheDocument();
  });

  it('applies custom styling props correctly', () => {
    const customStyle = {backgroundColor: 'red'};
    renderWithProviders(<FlowDropdownMenu {...mockProps} buttonSize='3' textSize='6' style={customStyle} />);

    // Find the main trigger button, not the settings menu buttons
    const triggerButton = screen.getByTestId('dropdown-trigger').querySelector('button');
    expect(triggerButton).toHaveStyle({backgroundColor: 'red'});
  });

  it('renders dropdown structure correctly', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    // Check basic dropdown structure
    expect(screen.getByTestId('dropdown-root')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
    expect(screen.getByText('Go Flow')).toBeInTheDocument();
  });

  it('displays all main menu items', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    // Check all main menu items are rendered
    expect(screen.getByText('Go Flow v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('All projects')).toBeInTheDocument();
    expect(screen.getByText('Import & Export')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('calls onExportClick when Export menu item is clicked', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    // Find and click Export
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    expect(mockProps.onExportClick).toHaveBeenCalledTimes(1);
  });

  it('calls onImportToProjectClick when Import menu item is clicked', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    // Find and click Import
    const importButton = screen.getByText('Import');
    fireEvent.click(importButton);

    expect(mockProps.onImportToProjectClick).toHaveBeenCalledTimes(1);
  });

  it('does not render Import button when onImportToProjectClick is not provided', () => {
    const propsWithoutImport = {
      ...mockProps,
      onImportToProjectClick: undefined
    };
    renderWithProviders(<FlowDropdownMenu {...propsWithoutImport} />);

    // Import button should not be rendered
    expect(screen.queryByText('Import')).not.toBeInTheDocument();
    // But Export should still be there
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('calls onOpenWelcomeStory when Welcome Story menu item is clicked', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    // Find and click Welcome Story
    const welcomeStoryButton = screen.getByText('Open Welcome Story');
    fireEvent.click(welcomeStoryButton);

    expect(mockProps.onOpenWelcomeStory).toHaveBeenCalledTimes(1);
  });

  it('renders Settings submenu and calls onChangeLanguage', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    // Check if SettingsMenu is rendered
    expect(screen.getByTestId('settings-menu')).toBeInTheDocument();

    // Test language change callback
    const englishButton = screen.getByText('English');
    fireEvent.click(englishButton);

    expect(mockProps.onChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('renders All projects menu item', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    const allProjectsButton = screen.getByText('All projects');
    fireEvent.click(allProjectsButton);

    // Test that the button is clickable and present
    expect(allProjectsButton).toBeInTheDocument();
  });

  it('uses default props when optional props are not provided', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    const dropdownRoot = screen.getByTestId('dropdown-root');
    expect(dropdownRoot).toBeInTheDocument();

    // Test that component renders without errors with default props
    expect(screen.getByText('Go Flow v1.0.0')).toBeInTheDocument();
  });

  it('displays correct version string from utility function', () => {
    renderWithProviders(<FlowDropdownMenu {...mockProps} />);

    expect(screen.getByText('Go Flow v1.0.0')).toBeInTheDocument();
    expect(getVersionString).toBeDefined();
  });
});
