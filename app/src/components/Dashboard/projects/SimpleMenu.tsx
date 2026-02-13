import React, {useEffect, useRef, useState} from 'react';

import {useTranslation} from 'react-i18next';

import s from './SimpleMenu.module.css';

interface SimpleMenuProps {
  projectId: string;
  projectName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const SimpleMenu: React.FC<SimpleMenuProps> = ({projectId, projectName, onRename, onDuplicate, onDelete}) => {
  const {t} = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (isOpen && dropdownRef.current && menuRef.current) {
      const dropdown = dropdownRef.current;
      const menuButton = menuRef.current;
      const buttonRect = menuButton.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate initial position below and to the right of button
      let left = buttonRect.right - 200; // Menu width
      let top = buttonRect.bottom + 4; // Small gap below button

      // Check if menu goes beyond right edge of viewport
      if (left + 200 > viewportWidth - 10) {
        left = buttonRect.right - 200;
      }

      // Check if menu goes beyond left edge of viewport
      if (left < 10) {
        left = buttonRect.left;
      }

      // Check if menu goes beyond bottom edge of viewport
      if (top + 200 > viewportHeight - 10) {
        // Approximate menu height
        top = buttonRect.top - 200 - 4; // Position above button
      }

      // Check if menu goes beyond top edge when positioned above
      if (top < 10) {
        top = buttonRect.bottom + 4; // Fall back to below button
      }

      // Apply calculated position
      dropdown.style.left = `${left}px`;
      dropdown.style.top = `${top}px`;
      dropdown.style.right = 'auto';
      dropdown.style.bottom = 'auto';
    }
  }, [isOpen]);

  // Menu items
  const menuItems = [
    {
      label: t('dashboard.projects.menu.rename', 'Rename'),
      icon: '✎',
      onClick: onRename
    },
    {
      label: t('dashboard.projects.menu.duplicate', 'Duplicate'),
      icon: '⧉',
      onClick: onDuplicate
    },
    {
      type: 'divider'
    },
    {
      label: t('dashboard.projects.menu.delete', 'Delete'),
      icon: '🗑',
      danger: true,
      onClick: onDelete
    }
  ];

  const handleClick = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return (
    <div ref={menuRef} style={{position: 'relative'}}>
      <button onClick={handleMenuToggle} className={s.menuButton} type='button'>
        ⋮
      </button>

      {isOpen && (
        <div ref={dropdownRef} className={s.menuDropdown}>
          {menuItems.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={`divider-${index}`} className={s.menuDivider} />;
            }

            const safeItem = item as {label: string; icon: string; danger?: boolean; onClick: () => void};

            return (
              <div key={`item-${index}`} className={`${s.menuItem} ${safeItem.danger ? s.menuItemDanger : ''}`} onClick={() => handleClick(safeItem.onClick)}>
                <span className={s.menuIcon}>{safeItem.icon}</span>
                {safeItem.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimpleMenu;
