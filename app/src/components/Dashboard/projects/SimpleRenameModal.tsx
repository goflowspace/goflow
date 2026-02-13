import React, {useEffect, useState} from 'react';

import {useTranslation} from 'react-i18next';

import SimpleModal from './SimpleModal';

import s from './SimpleModal.module.css';

interface SimpleRenameModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

const SimpleRenameModal: React.FC<SimpleRenameModalProps> = ({isOpen, projectName, onClose, onRename}) => {
  const {t} = useTranslation();
  const [newName, setNewName] = useState(projectName);

  // Reset the name when the modal opens with a new project
  useEffect(() => {
    if (isOpen) {
      setNewName(projectName);
    }
  }, [isOpen, projectName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== projectName) {
      onRename(newName.trim());
    }
    onClose();
  };

  const actions = (
    <>
      <button type='button' className={s.cancelButton} onClick={onClose}>
        {t('dashboard.modals.rename.cancel')}
      </button>
      <button type='button' className={s.primaryButton} onClick={handleSubmit}>
        {t('dashboard.modals.rename.save')}
      </button>
    </>
  );

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title={t('dashboard.modals.rename.title')} actions={actions}>
      <div>
        <input type='text' value={newName} onChange={(e) => setNewName(e.target.value)} className={s.input} placeholder={t('dashboard.modals.rename.placeholder')} autoFocus />
      </div>
    </SimpleModal>
  );
};

export default SimpleRenameModal;
