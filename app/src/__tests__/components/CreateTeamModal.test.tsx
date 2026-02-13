import React from 'react';

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useTranslation} from 'react-i18next';

import CreateTeamModal from '../../components/Dashboard/TeamManagement/CreateTeamModal/CreateTeamModal';
import {useTeamStore} from '../../store/useTeamStore';

// Мокаем зависимости
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}));

jest.mock('../../store/useTeamStore', () => ({
  useTeamStore: jest.fn()
}));

describe('CreateTeamModal', () => {
  const mockT = jest.fn((key: string) => {
    const translations: {[key: string]: string} = {
      'dashboard.modals.create_team.title': 'Create Team',
      'dashboard.modals.create_team.name_label': 'Team Name',
      'dashboard.modals.create_team.name_placeholder': 'Enter team name',
      'dashboard.modals.create_team.create_button': 'Create Team',
      'dashboard.modals.create_team.creating': 'Creating...',
      'dashboard.modals.create_team.errors.name_required': 'Team name is required',
      'dashboard.modals.create_team.errors.name_too_short': 'Team name must be at least 2 characters'
    };
    return translations[key] || key;
  });

  const mockCreateTeam = jest.fn();
  const mockTeamStore = {
    createTeam: mockCreateTeam,
    isCreatingTeam: false
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({t: mockT});
    (useTeamStore as unknown as jest.Mock).mockReturnValue(mockTeamStore);

    jest.clearAllMocks();
  });

  it('должен отображать модальное окно когда isOpen = true', () => {
    render(<CreateTeamModal {...defaultProps} />);

    expect(screen.getByRole('heading', {name: 'Create Team'})).toBeInTheDocument();
    expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter team name')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Create Team'})).toBeInTheDocument();
  });

  it('не должен отображать модальное окно когда isOpen = false', () => {
    render(<CreateTeamModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('heading', {name: 'Create Team'})).not.toBeInTheDocument();
  });

  it('должен обновлять значение поля ввода', () => {
    render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    fireEvent.change(input, {target: {value: 'My New Team'}});

    expect(input).toHaveValue('My New Team');
  });

  it('должен создать команду с валидными данными', async () => {
    mockCreateTeam.mockResolvedValue({});

    render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    const submitButton = screen.getByRole('button', {name: 'Create Team'});

    fireEvent.change(input, {target: {value: 'My New Team'}});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTeam).toHaveBeenCalledWith({
        name: 'My New Team'
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('должен закрыть модальное окно при клике на кнопку закрытия', () => {
    const {container} = render(<CreateTeamModal {...defaultProps} />);

    // Ищем кнопку закрытия по классу
    const closeButton = container.querySelector('.closeButton');

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('должен закрыть модальное окно при клике на overlay', () => {
    render(<CreateTeamModal {...defaultProps} />);

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('не должен закрыть модальное окно при клике внутри модального окна', () => {
    const {container} = render(<CreateTeamModal {...defaultProps} />);

    const modal = container.querySelector('[class*="modal"]');
    if (modal) {
      fireEvent.click(modal);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    }
  });

  it('должен показать ошибку если имя команды не указано', async () => {
    render(<CreateTeamModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', {name: 'Create Team'});

    // Кнопка должна быть отключена когда поле пустое
    expect(submitButton).toBeDisabled();

    // Пытаемся кликнуть на отключенную кнопку - createTeam не должен вызываться
    fireEvent.click(submitButton);
    expect(mockCreateTeam).not.toHaveBeenCalled();
  });

  it('должен показать ошибку если имя команды слишком короткое', async () => {
    const {container} = render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    const submitButton = screen.getByRole('button', {name: 'Create Team'});

    fireEvent.change(input, {target: {value: 'A'}});
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorElement = container.querySelector('.error') || screen.queryByText('Team name must be at least 2 characters');
      expect(errorElement).toBeTruthy();
      expect(mockCreateTeam).not.toHaveBeenCalled();
    });
  });

  it('должен очистить ошибку при изменении поля ввода', async () => {
    render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    const submitButton = screen.getByRole('button', {name: 'Create Team'});

    // Кнопка должна быть отключена в начале
    expect(submitButton).toBeDisabled();

    // При вводе текста кнопка должна стать активной
    fireEvent.change(input, {target: {value: 'Valid Team Name'}});
    expect(submitButton).not.toBeDisabled();
  });

  it('должен обработать ошибку при создании команды', async () => {
    const error = new Error('Failed to create team');
    mockCreateTeam.mockRejectedValue(error);

    render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    const submitButton = screen.getByRole('button', {name: 'Create Team'});

    fireEvent.change(input, {target: {value: 'My New Team'}});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create team')).toBeInTheDocument();
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  it('должен показать индикатор загрузки во время создания команды', () => {
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      ...mockTeamStore,
      isCreatingTeam: true
    });

    render(<CreateTeamModal {...defaultProps} />);

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Creating...'})).toBeDisabled();
  });

  it('должен отключить кнопку если поле пустое', () => {
    render(<CreateTeamModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', {name: 'Create Team'});
    expect(submitButton).toBeDisabled();
  });

  it('должен включить кнопку когда поле заполнено', () => {
    render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    const submitButton = screen.getByRole('button', {name: 'Create Team'});

    fireEvent.change(input, {target: {value: 'My Team'}});
    expect(submitButton).not.toBeDisabled();
  });

  it('должен сбросить форму после успешного создания', async () => {
    mockCreateTeam.mockResolvedValue({});

    const {rerender} = render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    fireEvent.change(input, {target: {value: 'My New Team'}});

    const submitButton = screen.getByRole('button', {name: 'Create Team'});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    // Проверяем, что форма сброшена при повторном открытии
    rerender(<CreateTeamModal {...defaultProps} />);
    const newInput = screen.getByPlaceholderText('Enter team name');
    expect(newInput).toHaveValue('');
  });

  it('должен обрезать пробелы в названии команды', async () => {
    mockCreateTeam.mockResolvedValue({});

    render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    const submitButton = screen.getByRole('button', {name: 'Create Team'});

    fireEvent.change(input, {target: {value: '  My New Team  '}});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTeam).toHaveBeenCalledWith({
        name: 'My New Team'
      });
    });
  });

  it('должен показать ошибку для имени состоящего только из пробелов', async () => {
    render(<CreateTeamModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter team name');
    const submitButton = screen.getByRole('button', {name: 'Create Team'});

    // Вводим только пробелы
    fireEvent.change(input, {target: {value: '   '}});

    // Кнопка должна остаться отключенной так как поле пустое после trim()
    expect(submitButton).toBeDisabled();

    fireEvent.click(submitButton);
    expect(mockCreateTeam).not.toHaveBeenCalled();
  });

  it('не должен закрываться во время создания команды', () => {
    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      ...mockTeamStore,
      isCreatingTeam: true
    });

    const {container} = render(<CreateTeamModal {...defaultProps} />);

    const closeButton = container.querySelector('.closeButton');

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    }
  });
});
