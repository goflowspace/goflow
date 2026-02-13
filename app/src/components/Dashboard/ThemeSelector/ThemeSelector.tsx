'use client';

import React from 'react';

import {DesktopIcon, MoonIcon, SunIcon} from '@radix-ui/react-icons';
import {useTranslation} from 'react-i18next';

import {EditorTheme, useEditorSettingsStore} from '@store/useEditorSettingsStore';

import s from './ThemeSelector.module.css';

const ThemeSelector: React.FC = () => {
  const {t} = useTranslation();
  const {theme, setTheme} = useEditorSettingsStore();

  const themeOptions = [
    {
      value: 'light' as EditorTheme,
      label: t('dashboard.theme.light'),
      description: t('dashboard.theme.light_description'),
      icon: <SunIcon className={s.optionIcon} />
    },
    {
      value: 'dark' as EditorTheme,
      label: t('dashboard.theme.dark'),
      description: t('dashboard.theme.dark_description'),
      icon: <MoonIcon className={s.optionIcon} />
    },
    {
      value: 'auto' as EditorTheme,
      label: t('dashboard.theme.system'),
      description: t('dashboard.theme.system_description'),
      icon: <DesktopIcon className={s.optionIcon} />
    }
  ];

  const handleThemeChange = (newTheme: EditorTheme) => {
    setTheme(newTheme);
  };

  return (
    <div className={s.themeSelector}>
      {themeOptions.map((option) => (
        <label key={option.value} className={s.optionLabel}>
          <input type='radio' name='theme' value={option.value} checked={theme === option.value} onChange={() => handleThemeChange(option.value)} className={s.radioInput} />
          <div className={s.optionContent}>
            <div className={s.optionHeader}>
              {option.icon}
              <span className={s.optionTitle}>{option.label}</span>
            </div>
            <p className={s.optionDescription}>{option.description}</p>
          </div>
          <div className={s.radioCustom}>
            <div className={s.radioInner}></div>
          </div>
        </label>
      ))}
    </div>
  );
};

export default ThemeSelector;
