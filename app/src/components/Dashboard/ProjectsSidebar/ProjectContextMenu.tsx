'use client';

import React, {useEffect, useRef} from 'react';

import {useTranslation} from 'react-i18next';

import s from './ProjectContextMenu.module.css';

interface ProjectContextMenuProps {
  isOpen: boolean;
  position: {x: number; y: number};
  projectId: string;
  projectName: string;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const ProjectContextMenu: React.FC<ProjectContextMenuProps> = ({isOpen, position, projectId, projectName, onClose, onRename, onDuplicate, onDelete}) => {
  const {t} = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Корректировка позиции меню чтобы оно не выходило за границы экрана
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let {x, y} = position;

      // Проверяем правую границу
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }

      // Проверяем нижнюю границу
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }

      // Проверяем левую границу
      if (x < 10) {
        x = 10;
      }

      // Проверяем верхнюю границу
      if (y < 10) {
        y = 10;
      }

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  const menuItems = [
    {
      label: t('dashboard.projects.menu.rename', 'Rename'),
      icon: '✎',
      onClick: () => {
        onRename();
        onClose();
      }
    },
    {
      label: t('dashboard.projects.menu.duplicate', 'Duplicate'),
      icon: '⧉',
      onClick: () => {
        onDuplicate();
        onClose();
      }
    },
    {
      type: 'divider'
    },
    {
      label: t('dashboard.projects.menu.delete', 'Delete'),
      icon: '🗑',
      danger: true,
      onClick: () => {
        onDelete();
        onClose();
      }
    }
  ];

  return (
    <div
      ref={menuRef}
      className={s.contextMenu}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000
      }}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return <div key={`divider-${index}`} className={s.divider} />;
        }

        const safeItem = item as {
          label: string;
          icon: string;
          danger?: boolean;
          onClick: () => void;
        };

        return (
          <div key={`item-${index}`} className={`${s.menuItem} ${safeItem.danger ? s.menuItemDanger : ''}`} onClick={safeItem.onClick}>
            <span className={s.menuIcon}>{safeItem.icon}</span>
            {safeItem.label}
          </div>
        );
      })}
    </div>
  );
};

export default ProjectContextMenu;
