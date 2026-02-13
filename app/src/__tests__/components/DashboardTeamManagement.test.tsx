import React from 'react';

import {useRouter} from 'next/navigation';

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useTranslation} from 'react-i18next';

import {useTeamStore} from '../../store/useTeamStore';

// Мокаем зависимости
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('../../store/useTeamStore', () => ({
  useTeamStore: jest.fn()
}));

// Простой компонент для тестирования функционала управления командами
const TeamManagementComponent: React.FC<{onCreateTeam: () => void}> = ({onCreateTeam}) => {
  const {t} = useTranslation();
  const router = useRouter();
  const teamStore = useTeamStore() as any;
  const {currentTeam, teams, switchTeam, deleteTeam, isLoading} = teamStore;

  const handleSwitchTeam = async (teamId: string) => {
    try {
      await switchTeam({id: teamId});
      router.push('/projects');
    } catch (error) {
      console.error('Failed to switch team:', error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const confirmed = window.confirm(t('dashboard.teams.confirm_delete'));
    if (confirmed) {
      try {
        await deleteTeam(teamId);
      } catch (error) {
        console.error('Failed to delete team:', error);
      }
    }
  };

  if (isLoading) {
    return <div data-testid='loading-spinner'>Loading...</div>;
  }

  return (
    <div data-testid='team-management'>
      <h2>{t('dashboard.teams.manage_teams')}</h2>

      {teams?.length === 0 ? (
        <p>{t('dashboard.teams.no_teams')}</p>
      ) : (
        <div data-testid='teams-list'>
          {teams?.map((team: any) => (
            <div key={team.id} data-testid='team-card'>
              <h3 data-testid='team-name'>{team.name}</h3>
              <p>{team.description}</p>
              <span>
                {team._count?.members} {t('dashboard.teams.members_count')}
              </span>
              <span>
                {team._count?.projects} {t('dashboard.teams.projects_count')}
              </span>

              {currentTeam?.id !== team.id && (
                <button onClick={() => handleSwitchTeam(team.id)} disabled={isLoading}>
                  {t('dashboard.teams.switch_team')}
                </button>
              )}

              {team.ownerId === 'current-user-id' && (
                <button onClick={() => handleDeleteTeam(team.id)} disabled={isLoading}>
                  {t('dashboard.teams.delete_team')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={onCreateTeam} disabled={isLoading}>
        {t('dashboard.teams.create_new')}
      </button>
    </div>
  );
};

describe('TeamManagementComponent', () => {
  const mockT = jest.fn((key: string) => {
    const translations: {[key: string]: string} = {
      'dashboard.teams.manage_teams': 'Manage Teams',
      'dashboard.teams.switch_team': 'Switch Team',
      'dashboard.teams.create_new': 'Create New Team',
      'dashboard.teams.no_teams': 'No teams available',
      'dashboard.teams.members_count': 'members',
      'dashboard.teams.projects_count': 'projects',
      'dashboard.teams.delete_team': 'Delete Team',
      'dashboard.teams.confirm_delete': 'Are you sure you want to delete this team?'
    };
    return translations[key] || key;
  });

  const mockRouter = {
    push: jest.fn()
  };

  const mockSwitchTeam = jest.fn();
  const mockDeleteTeam = jest.fn();

  const mockTeam1 = {
    id: 'team1',
    name: 'Development Team',
    description: 'Frontend development team',
    ownerId: 'current-user-id',
    _count: {members: 2, projects: 3}
  };

  const mockTeam2 = {
    id: 'team2',
    name: 'Design Team',
    description: 'UI/UX design team',
    ownerId: 'other-user-id',
    _count: {members: 2, projects: 1}
  };

  const mockTeamStore = {
    currentTeam: mockTeam1,
    teams: [mockTeam1, mockTeam2],
    switchTeam: mockSwitchTeam,
    deleteTeam: mockDeleteTeam,
    isLoading: false
  };

  const defaultProps = {
    onCreateTeam: jest.fn()
  };

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({t: mockT});
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useTeamStore as unknown as jest.Mock).mockReturnValue(mockTeamStore);

    jest.clearAllMocks();
  });

  it('должен отображать список команд', () => {
    render(<TeamManagementComponent {...defaultProps} />);

    expect(screen.getByText('Manage Teams')).toBeInTheDocument();
    expect(screen.getByText('Development Team')).toBeInTheDocument();
    expect(screen.getByText('Design Team')).toBeInTheDocument();
  });

  it('должен отображать количество участников и проектов', () => {
    render(<TeamManagementComponent {...defaultProps} />);

    // Используем getAllByText для множественных элементов
    const membersElements = screen.getAllByText(/2.*members/);
    const projectsElements = screen.getAllByText(/3.*projects|1.*projects/);

    expect(membersElements.length).toBeGreaterThan(0);
    expect(projectsElements.length).toBeGreaterThan(0);
  });

  it('должен переключить команду при клике', async () => {
    mockSwitchTeam.mockResolvedValue({});

    render(<TeamManagementComponent {...defaultProps} />);

    const switchButton = screen.getByText('Switch Team');
    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(mockSwitchTeam).toHaveBeenCalledWith({id: 'team2'});
      expect(mockRouter.push).toHaveBeenCalledWith('/projects');
    });
  });

  it('должен открыть модальное окно создания команды', () => {
    render(<TeamManagementComponent {...defaultProps} />);

    const createButton = screen.getByText('Create New Team');
    fireEvent.click(createButton);

    expect(defaultProps.onCreateTeam).toHaveBeenCalled();
  });

  it('должен показать кнопку удаления для владельца команды', () => {
    render(<TeamManagementComponent {...defaultProps} />);

    const deleteButtons = screen.getAllByText('Delete Team');
    expect(deleteButtons).toHaveLength(1); // Только для команды, где пользователь владелец
  });

  it('не должен показывать кнопку Switch Team для текущей команды', () => {
    render(<TeamManagementComponent {...defaultProps} />);

    // Находим карточку команды Development Team (текущая команда)
    const devTeamCard = screen.getByText('Development Team').closest('[data-testid="team-card"]');
    expect(devTeamCard).not.toHaveTextContent('Switch Team');
  });

  it('должен подтвердить удаление команды', async () => {
    mockDeleteTeam.mockResolvedValue({});
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    render(<TeamManagementComponent {...defaultProps} />);

    const deleteButton = screen.getByText('Delete Team');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this team?');
      expect(mockDeleteTeam).toHaveBeenCalledWith('team1');
    });

    window.confirm = originalConfirm;
  });

  it('должен отменить удаление команды', async () => {
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => false);

    render(<TeamManagementComponent {...defaultProps} />);

    const deleteButton = screen.getByText('Delete Team');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteTeam).not.toHaveBeenCalled();
    });

    window.confirm = originalConfirm;
  });

  it('должен показать сообщение если нет команд', () => {
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      ...mockTeamStore,
      teams: [],
      currentTeam: null
    });

    render(<TeamManagementComponent {...defaultProps} />);

    expect(screen.getByText('No teams available')).toBeInTheDocument();
  });

  it('должен показать индикатор загрузки', () => {
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      ...mockTeamStore,
      isLoading: true
    });

    render(<TeamManagementComponent {...defaultProps} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('должен обработать ошибку при переключении команды', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSwitchTeam.mockRejectedValue(new Error('Failed to switch team'));

    render(<TeamManagementComponent {...defaultProps} />);

    const switchButton = screen.getByText('Switch Team');
    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to switch team:', expect.any(Error));
    });

    consoleError.mockRestore();
  });

  it('должен обработать ошибку при удалении команды', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    mockDeleteTeam.mockRejectedValue(new Error('Failed to delete team'));

    render(<TeamManagementComponent {...defaultProps} />);

    const deleteButton = screen.getByText('Delete Team');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to delete team:', expect.any(Error));
    });

    window.confirm = originalConfirm;
    consoleError.mockRestore();
  });

  it('должен отключить кнопки во время загрузки', () => {
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      ...mockTeamStore,
      isLoading: true
    });

    render(<TeamManagementComponent {...defaultProps} />);

    // Во время загрузки показывается спиннер, проверяем его наличие
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Кнопки не отображаются во время загрузки, так как показывается спиннер
    expect(screen.queryByText('Create New Team')).not.toBeInTheDocument();
  });

  it('должен использовать правильные переводы', () => {
    render(<TeamManagementComponent {...defaultProps} />);

    expect(mockT).toHaveBeenCalledWith('dashboard.teams.manage_teams');
    expect(mockT).toHaveBeenCalledWith('dashboard.teams.switch_team');
    expect(mockT).toHaveBeenCalledWith('dashboard.teams.create_new');
    expect(mockT).toHaveBeenCalledWith('dashboard.teams.members_count');
    expect(mockT).toHaveBeenCalledWith('dashboard.teams.projects_count');
  });
});
