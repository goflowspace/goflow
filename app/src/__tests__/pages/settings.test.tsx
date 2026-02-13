import React from 'react';

import {useParams, usePathname, useRouter} from 'next/navigation';

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useTranslation} from 'react-i18next';

import SettingsPageContent from '../../app/settings/page';
import {useFlowMenu} from '../../hooks/useFlowMenu';
import {useProjects} from '../../hooks/useProjects';
import {useUserInitialization} from '../../hooks/useUserInitialization';
import {useTeamStore} from '../../store/useTeamStore';
import useUserStore from '../../store/useUserStore';

// Мокаем зависимости
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  usePathname: jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}));

jest.mock('../../store/useTeamStore', () => ({
  useTeamStore: jest.fn()
}));

jest.mock('../../store/useUserStore', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../../hooks/useFlowMenu', () => ({
  useFlowMenu: jest.fn()
}));

jest.mock('../../hooks/useProjects', () => ({
  useProjects: jest.fn()
}));

jest.mock('../../hooks/useUserInitialization', () => ({
  useUserInitialization: jest.fn()
}));

jest.mock('../../components/AuthGuard/AuthGuard', () => {
  return ({children}: {children: React.ReactNode}) => <div data-testid='auth-guard'>{children}</div>;
});

jest.mock('../../components/Dashboard/layouts/DashboardLayout', () => {
  return ({children, onCreateTeam}: {children: React.ReactNode; onCreateTeam: () => void}) => (
    <div data-testid='dashboard-layout'>
      <button data-testid='create-team-button' onClick={onCreateTeam}>
        Create Team
      </button>
      {children}
    </div>
  );
});

jest.mock('../../components/Dashboard/TeamManagement/CreateTeamModal/CreateTeamModal', () => {
  return ({isOpen, onClose, onSuccess}: {isOpen: boolean; onClose: () => void; onSuccess: () => void}) =>
    isOpen ? (
      <div data-testid='create-team-modal'>
        <button data-testid='close-modal' onClick={onClose}>
          Close
        </button>
        <button data-testid='success-modal' onClick={onSuccess}>
          Success
        </button>
      </div>
    ) : null;
});

jest.mock('../../components/Dashboard/TeamManagement/DeleteTeamModal/DeleteTeamModal', () => {
  return ({isOpen, team, onClose, onDelete}: {isOpen: boolean; team: any; onClose: () => void; onDelete: () => Promise<void>}) => {
    const handleDelete = async () => {
      try {
        await onDelete();
      } catch (error) {
        // Ошибка будет обработана в onDelete, ничего дополнительного не делаем
      }
    };

    return isOpen ? (
      <div data-testid='delete-team-modal'>
        <span data-testid='team-to-delete'>{team?.name}</span>
        <button data-testid='close-delete-modal' onClick={onClose}>
          Close
        </button>
        <button data-testid='confirm-delete' onClick={handleDelete}>
          Delete
        </button>
      </div>
    ) : null;
  };
});

jest.mock('../../components/Dashboard/ThemeSelector/ThemeSelector', () => {
  return () => <div data-testid='theme-selector'>Theme Selector</div>;
});

describe('SettingsPage', () => {
  const mockRouter = {
    push: jest.fn()
  };

  const mockT = jest.fn((key: string) => key);

  // Создаем мок-функцию для getCurrentUserPermissions заранее
  const mockGetCurrentUserPermissions = jest.fn().mockReturnValue({
    canEditTeamSettings: true,
    canManageTeam: true
  });

  const mockCurrentTeam = {
    id: 'team1',
    name: 'Test Team',
    description: 'Test Description',
    creatorId: 'test-user-id',
    ownerId: 'test-user-id'
  };

  const mockTeamStore = {
    currentTeam: mockCurrentTeam,
    loadUserTeams: jest.fn(),
    updateTeam: jest.fn(),
    deleteTeam: jest.fn(),
    isInitialized: true,
    getCurrentUserPermissions: mockGetCurrentUserPermissions,
    loadTeamMembers: jest.fn().mockResolvedValue([]),
    teamMembers: []
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({project_id: 'test-project-id'});
    (usePathname as jest.Mock).mockReturnValue('/test-project/settings');
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: {
        language: 'en',
        changeLanguage: jest.fn()
      }
    });
    (useTeamStore as unknown as jest.Mock).mockReturnValue(mockTeamStore);

    (useUserStore as unknown as jest.Mock).mockReturnValue({
      user: {id: 'test-user-id', name: 'Test User'}
    });

    (useFlowMenu as jest.Mock).mockReturnValue({
      changeLanguage: jest.fn()
    });

    (useProjects as jest.Mock).mockReturnValue({
      projects: [],
      isLoading: false
    });

    (useUserInitialization as jest.Mock).mockReturnValue({});

    jest.clearAllMocks();
  });

  it('должен отображать форму настроек с данными текущей команды', () => {
    render(<SettingsPageContent />);

    expect(screen.getByDisplayValue('Test Team')).toBeInTheDocument();
    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
  });

  it('должен обновить название команды при изменении поля', () => {
    render(<SettingsPageContent />);

    const nameInput = screen.getByDisplayValue('Test Team');
    fireEvent.change(nameInput, {target: {value: 'Updated Team Name'}});

    expect(nameInput).toHaveValue('Updated Team Name');
  });

  it.skip('должен сохранить изменения команды', async () => {
    const mockUpdateTeam = jest.fn().mockResolvedValue({});
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      currentTeam: mockCurrentTeam,
      updateTeam: mockUpdateTeam
    });

    render(<SettingsPageContent />);

    const nameInput = screen.getByDisplayValue('Test Team');
    fireEvent.change(nameInput, {target: {value: 'Updated Team Name'}});

    const saveButton = screen.getByText('dashboard.settings.save_changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith('team1', {name: 'Updated Team Name'});
    });
  });

  it.skip('должен обработать ошибку при сохранении', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockUpdateTeam = jest.fn().mockRejectedValue(new Error('Network error'));
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      currentTeam: mockCurrentTeam,
      updateTeam: mockUpdateTeam
    });

    render(<SettingsPageContent />);

    const saveButton = screen.getByText('dashboard.settings.save_changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to update team:', expect.any(Error));
    });

    consoleError.mockRestore();
  });

  it.skip('должен открыть модальное окно создания команды', () => {
    render(<SettingsPageContent />);

    const createTeamButton = screen.getByTestId('create-team-button');
    fireEvent.click(createTeamButton);

    expect(screen.getByTestId('create-team-modal')).toBeInTheDocument();
  });

  it.skip('должен закрыть модальное окно создания команды', () => {
    render(<SettingsPageContent />);

    const createTeamButton = screen.getByTestId('create-team-button');
    fireEvent.click(createTeamButton);

    const closeButton = screen.getByTestId('close-modal');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('create-team-modal')).not.toBeInTheDocument();
  });

  it('должен открыть модальное окно удаления команды', () => {
    render(<SettingsPageContent />);

    const deleteButton = screen.getByText('dashboard.settings.danger.delete_button');
    fireEvent.click(deleteButton);

    expect(screen.getByTestId('delete-team-modal')).toBeInTheDocument();
    expect(screen.getByTestId('team-to-delete')).toHaveTextContent('Test Team');
  });

  it.skip('должен удалить команду и перенаправить на страницу проектов', async () => {
    const mockDeleteTeam = jest.fn().mockResolvedValue({});
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      currentTeam: mockCurrentTeam,
      deleteTeam: mockDeleteTeam
    });

    render(<SettingsPageContent />);

    const deleteButton = screen.getByText('dashboard.settings.danger.delete_button');
    fireEvent.click(deleteButton);

    const confirmDeleteButton = screen.getByTestId('confirm-delete');
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockDeleteTeam).toHaveBeenCalledWith('team1');
      expect(mockRouter.push).toHaveBeenCalledWith('/projects');
    });
  });

  it.skip('должен обработать ошибку при удалении команды', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockDeleteTeam = jest.fn().mockRejectedValue('Delete failed');
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      currentTeam: mockCurrentTeam,
      deleteTeam: mockDeleteTeam
    });

    render(<SettingsPageContent />);

    const deleteButton = screen.getByText('dashboard.settings.danger.delete_button');
    fireEvent.click(deleteButton);

    const confirmDeleteButton = screen.getByTestId('confirm-delete');
    fireEvent.click(confirmDeleteButton);

    // Проверяем, что метод был вызван и ошибка залогирована
    await waitFor(() => {
      expect(mockDeleteTeam).toHaveBeenCalledWith('team1');
      expect(consoleError).toHaveBeenCalledWith('Failed to delete team:', 'Delete failed');
    });

    // Проверяем, что перенаправления не произошло
    expect(mockRouter.push).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it.skip('должен отключить поля если нет текущей команды', () => {
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      currentTeam: null,
      updateTeam: jest.fn(),
      deleteTeam: jest.fn()
    });

    render(<SettingsPageContent />);

    const nameInput = screen.getByPlaceholderText('dashboard.settings.general.team_name_placeholder');
    const saveButton = screen.getByText('dashboard.settings.save_changes');

    expect(nameInput).toBeDisabled();
    expect(saveButton).toBeDisabled();
  });

  it.skip('должен скрыть опасную зону если нет текущей команды', () => {
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      currentTeam: null,
      updateTeam: jest.fn(),
      deleteTeam: jest.fn()
    });

    render(<SettingsPageContent />);

    expect(screen.queryByText('dashboard.settings.danger.title')).not.toBeInTheDocument();
    expect(screen.queryByText('dashboard.settings.danger.delete_button')).not.toBeInTheDocument();
  });

  it.skip('должен обновить название команды при изменении currentTeam', () => {
    const {rerender} = render(<SettingsPageContent />);

    expect(screen.getByDisplayValue('Test Team')).toBeInTheDocument();

    // Изменяем currentTeam в store
    const newTeam = {id: 'team2', name: 'New Team Name'};
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      currentTeam: newTeam,
      updateTeam: jest.fn(),
      deleteTeam: jest.fn()
    });

    rerender(<SettingsPageContent />);

    expect(screen.getByDisplayValue('New Team Name')).toBeInTheDocument();
  });

  it('должен использовать правильные переводы', () => {
    render(<SettingsPageContent />);

    expect(mockT).toHaveBeenCalledWith('dashboard.settings.title');
    expect(mockT).toHaveBeenCalledWith('dashboard.settings.general.title');
    expect(mockT).toHaveBeenCalledWith('dashboard.settings.appearance.title');
    expect(mockT).toHaveBeenCalledWith('dashboard.settings.danger.title');
    expect(mockT).toHaveBeenCalledWith('dashboard.settings.save_changes');
  });
});
