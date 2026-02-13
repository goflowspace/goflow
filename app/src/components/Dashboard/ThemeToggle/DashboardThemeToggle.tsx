'use client';

import React, {useState} from 'react';

import {ChevronDownIcon, DesktopIcon, MoonIcon, SunIcon} from '@radix-ui/react-icons';
import {useTranslation} from 'react-i18next';

import {EditorTheme, useEditorSettingsStore} from '@store/useEditorSettingsStore';

import s from './DashboardThemeToggle.module.css';

interface DashboardThemeToggleProps {
  dropdownAlign?: 'top' | 'bottom';
}

const DashboardThemeToggle: React.FC<DashboardThemeToggleProps> = ({dropdownAlign = 'bottom'}) => {
  const {t} = useTranslation();
  const {theme, setTheme} = useEditorSettingsStore();
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions = [
    {
      value: 'light' as EditorTheme,
      label: t('dashboard.theme.light'),
      icon: <SunIcon className={s.optionIcon} />
    },
    {
      value: 'dark' as EditorTheme,
      label: t('dashboard.theme.dark'),
      icon: <MoonIcon className={s.optionIcon} />
    },
    {
      value: 'auto' as EditorTheme,
      label: t('dashboard.theme.auto'),
      icon: <DesktopIcon className={s.optionIcon} />
    }
  ];

  const currentTheme = themeOptions.find((option) => option.value === theme);

  const handleThemeChange = (newTheme: EditorTheme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  // Закрытие меню при клике вне его
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        const target = event.target as Element;
        if (!target.closest(`.${s.themeToggle}`)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={s.themeToggle}>
      <button className={s.themeButton} onClick={() => setIsOpen(!isOpen)} aria-label='Toggle theme'>
        {currentTheme?.icon}
        <span className={s.themeLabel}>{currentTheme?.label}</span>
        <ChevronDownIcon className={`${s.chevron} ${isOpen ? s.chevronOpen : ''}`} />
      </button>

      {isOpen && (
        <div
          className={s.themeDropdown}
          style={{
            bottom: dropdownAlign === 'top' ? '100%' : 'auto',
            top: dropdownAlign === 'bottom' ? '100%' : 'auto'
          }}
        >
          {themeOptions.map((option) => (
            <button key={option.value} className={`${s.themeOption} ${theme === option.value ? s.themeOptionActive : ''}`} onClick={() => handleThemeChange(option.value)}>
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardThemeToggle;
