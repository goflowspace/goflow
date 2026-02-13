import React from 'react';

import s from './SimpleModal.module.css';

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const SimpleModal: React.FC<SimpleModalProps> = ({isOpen, onClose, title, children, actions}) => {
  if (!isOpen) return null;

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h2 className={s.title}>{title}</h2>
          <button onClick={onClose} className={s.closeButton}>
            ×
          </button>
        </div>

        <div className={s.content}>{children}</div>

        {actions && <div className={s.actions}>{actions}</div>}
      </div>
    </div>
  );
};

export default SimpleModal;
