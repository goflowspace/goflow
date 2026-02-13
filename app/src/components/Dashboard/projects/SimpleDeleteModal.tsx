import React, {useState} from 'react';

import {useTranslation} from 'react-i18next';

import SimpleModal from './SimpleModal';

import s from './SimpleModal.module.css';

interface SimpleDeleteModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

const SimpleDeleteModal: React.FC<SimpleDeleteModalProps> = ({isOpen, projectName, onClose, onDelete}) => {
  const {t} = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    onClose();
  };

  const actions = (
    <>
      <button type='button' className={s.cancelButton} onClick={handleClose} disabled={isDeleting}>
        {t('dashboard.modals.delete.cancel')}
      </button>
      <button type='button' className={s.dangerButton} onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? t('dashboard.projects.deleting', 'Deleting...') : t('dashboard.modals.delete.delete')}
      </button>
    </>
  );

  return (
    <SimpleModal isOpen={isOpen} onClose={handleClose} title={t('dashboard.modals.delete.title', {projectName})} actions={actions}>
      <p className={s.text}>{t('dashboard.modals.delete.description')}</p>
    </SimpleModal>
  );
};

export default SimpleDeleteModal;
