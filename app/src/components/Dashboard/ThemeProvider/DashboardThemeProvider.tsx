'use client';

import React, {ReactNode, useEffect, useState} from 'react';

import {EditorTheme, useEditorSettingsStore} from '@store/useEditorSettingsStore';

interface DashboardThemeProviderProps {
  children: ReactNode;
}

const DashboardThemeProvider: React.FC<DashboardThemeProviderProps> = ({children}) => {
  const {theme} = useEditorSettingsStore();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const determineTheme = () => {
      if (theme === 'auto') {
        // Проверяем системную тему
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        return mediaQuery.matches ? 'dark' : 'light';
      }
      return theme;
    };

    const newTheme = determineTheme();
    setResolvedTheme(newTheme);

    // Устанавливаем data-theme атрибут на body для CSS переменных
    document.documentElement.setAttribute('data-theme', newTheme);

    // Слушаем изменения системной темы для режима 'auto'
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const autoTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(autoTheme);
        document.documentElement.setAttribute('data-theme', autoTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return <>{children}</>;
};

export default DashboardThemeProvider;
