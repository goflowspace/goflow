'use client';

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {initReactI18next} from 'react-i18next';

import {KEY_LANGUAGE} from '../services/storageService';
import {loadTranslations} from './loadTranslations';

// Загружаем переводы из статических файлов
const resources = loadTranslations();

// Опции для определения языка
const languageDetectorOptions = {
  // Порядок определения языка
  order: ['localStorage', 'navigator'],

  // Ключ в localStorage
  lookupLocalStorage: KEY_LANGUAGE
};

// Определяем начальный язык для SSR консистентности
let initialLanguage = 'en';
if (typeof window !== 'undefined') {
  // Это клиентская сторона
  const savedLang = localStorage.getItem(KEY_LANGUAGE);
  if (savedLang) {
    // Если язык уже сохранен, используем его
    initialLanguage = savedLang;
  } else {
    // Если язык еще не сохранен (первый запуск)
    // Проверяем язык браузера/системы
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';

    // Определяем язык на основе языка браузера
    if (browserLang.startsWith('ru')) {
      initialLanguage = 'ru';
    } else if (browserLang.startsWith('fr')) {
      initialLanguage = 'fr';
    } else if (browserLang.startsWith('es')) {
      initialLanguage = 'es';
    } else if (browserLang.startsWith('pt')) {
      initialLanguage = 'pt';
    } else {
      // Для всех остальных языков - английский
      initialLanguage = 'en';
    }

    // Сохраняем язык в localStorage для последующих запусков
    localStorage.setItem(KEY_LANGUAGE, initialLanguage);
  }
}

i18n
  // Определяем язык пользователя
  .use(LanguageDetector)
  // Передаем i18n в react-i18next
  .use(initReactI18next)
  // Инициализируем i18next
  .init({
    // Устанавливаем начальный язык
    lng: initialLanguage,
    // Язык по умолчанию, если не удалось определить
    fallbackLng: 'en',
    // Отключаем режим отладки
    debug: false,

    // Пространство имен по умолчанию
    defaultNS: 'translation',

    // Настройки интерполяции
    interpolation: {
      escapeValue: false // не экранируем в React
    },

    // Настройки определения языка
    detection: languageDetectorOptions,

    // Добавляем предзагруженные ресурсы
    resources
  });

export default i18n;
