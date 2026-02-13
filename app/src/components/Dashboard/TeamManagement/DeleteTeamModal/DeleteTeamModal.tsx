'use client';

import React, {useState} from 'react';

import {Cross2Icon, TrashIcon} from '@radix-ui/react-icons';
import {Team} from '@types-folder/team';
import {useTranslation} from 'react-i18next';

import s from './DeleteTeamModal.module.css';

interface DeleteTeamModalProps {
  isOpen: boolean;
  team: Team | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

const DeleteTeamModal: React.FC<DeleteTeamModalProps> = ({isOpen, team, onClose, onDelete}) => {
  const {t} = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmationValid = team && confirmText === team.name;

  const handleDelete = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    try {
      await onDelete();
      handleClose();
    } catch (error) {
      console.error('Failed to delete team:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText('');
    onClose();
  };

  if (!isOpen || !team) return null;

  return (
    <div className={s.overlay} onClick={handleClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <div className={s.iconContainer}>
            <TrashIcon className={s.icon} />
          </div>
          <h2 className={s.title}>{t('dashboard.modals.delete_team.title', 'Delete team')}</h2>
          <button onClick={handleClose} className={s.closeButton} disabled={isDeleting}>
            <Cross2Icon />
          </button>
        </div>

        <div className={s.content}>
          <p className={s.description}>{t('dashboard.modals.delete_team.description', 'This action cannot be undone. This will permanently delete the team and all associated projects.')}</p>

          <div className={s.warningBox}>
            <p className={s.warningText}>{t('dashboard.modals.delete_team.warning_text', 'All projects in this team will be permanently deleted. Make sure you have exported any important data.')}</p>
          </div>

          <div className={s.confirmSection}>
            <p className={s.confirmLabel}>
              {t('dashboard.modals.delete_team.confirm_label', 'Please type')} <strong>{team.name}</strong> {t('dashboard.modals.delete_team.confirm_to_confirm', 'to confirm')}:
            </p>
            <input type='text' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={team.name} className={s.confirmInput} disabled={isDeleting} autoFocus />
          </div>
        </div>

        <div className={s.actions}>
          <button onClick={handleClose} className={s.cancelButton} disabled={isDeleting}>
            {t('dashboard.modals.delete_team.cancel', 'Cancel')}
          </button>
          <button onClick={handleDelete} className={s.deleteButton} disabled={!isConfirmationValid || isDeleting}>
            {isDeleting ? t('dashboard.modals.delete_team.deleting', 'Deleting...') : t('dashboard.modals.delete_team.delete', 'Delete team')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTeamModal;
