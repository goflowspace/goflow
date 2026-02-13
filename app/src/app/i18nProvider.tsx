'use client';

import {ReactNode, useEffect, useState} from 'react';

// Import initialized i18n instance
import {I18nextProvider, useTranslation} from 'react-i18next';

import {KEY_LANGUAGE} from '../services/storageService';
import i18n from '../utils/i18n';

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider = ({children}: I18nProviderProps) => {
  const {i18n: i18nInstance} = useTranslation();
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);

  // Эффект для обработки переключения языка
  useEffect(() => {
    // Получаем сохраненный язык из localStorage
    const savedLang = localStorage.getItem(KEY_LANGUAGE);
    if (savedLang && i18nInstance.language !== savedLang) {
      // Если есть сохраненный язык и он отличается от текущего,
      // применяем его (может произойти при смене языка через интерфейс)
      i18nInstance.changeLanguage(savedLang);
    }

    setIsI18nInitialized(true);
  }, [i18nInstance]);

  // Показываем содержимое только после инициализации i18n
  if (!isI18nInitialized) {
    return null; // или можно показать загрузочный спиннер
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
