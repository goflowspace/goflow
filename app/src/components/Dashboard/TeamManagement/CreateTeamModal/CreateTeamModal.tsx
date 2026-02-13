'use client';

import React, {useState} from 'react';

import {Cross2Icon, InfoCircledIcon, PlusIcon} from '@radix-ui/react-icons';
import {useTranslation} from 'react-i18next';

import {useTeamStore} from '@store/useTeamStore';

import s from './CreateTeamModal.module.scss';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({isOpen, onClose, onSuccess}) => {
  const {t} = useTranslation();
  const {createTeam, isCreatingTeam} = useTeamStore();
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Сбрасываем предыдущие состояния при новой попытке
    setError(null);

    if (!teamName.trim()) {
      setError(t('dashboard.modals.create_team.errors.name_required'));
      return;
    }

    if (teamName.trim().length < 2) {
      setError(t('dashboard.modals.create_team.errors.name_too_short'));
      return;
    }

    try {
      await createTeam({
        name: teamName.trim()
      });

      // Успешно создали команду
      onSuccess?.();
      onClose();

      // Сбрасываем форму
      setTeamName('');
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create team');
    }
  };

  const handleClose = () => {
    if (!isCreatingTeam) {
      setTeamName('');
      setError(null);
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={s.overlay} onClick={handleOverlayClick} data-testid='modal-overlay'>
      <div className={s.modal}>
        <div className={s.header}>
          <h2 className={s.title}>{t('dashboard.modals.create_team.title')}</h2>
          <button className={s.closeButton} onClick={handleClose} disabled={isCreatingTeam}>
            <Cross2Icon className={s.closeIcon} />
          </button>
        </div>

        <div className={s.content}>
          <form onSubmit={handleSubmit} className={s.form}>
            <div className={s.field}>
              <label htmlFor='team-name' className={s.label}>
                {t('dashboard.modals.create_team.name_label')}
              </label>
              <input
                id='team-name'
                type='text'
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t('dashboard.modals.create_team.name_placeholder')}
                className={s.input}
                disabled={isCreatingTeam}
                autoFocus
              />
              {error && <div className={s.error}>{error}</div>}
            </div>

            <div className={s.infoMessage}>
              <InfoCircledIcon className={s.infoIcon} />
              <span>{t('dashboard.modals.create_team.collaboration_info')}</span>
            </div>

            <div className={s.actions}>
              <button type='submit' className={s.createButton} disabled={isCreatingTeam || !teamName.trim()}>
                <PlusIcon className={s.buttonIcon} />
                {isCreatingTeam ? t('dashboard.modals.create_team.creating') : t('dashboard.modals.create_team.create_button')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;
