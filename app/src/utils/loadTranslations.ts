// Импортируем JSON-файлы напрямую из директории src
import enTranslation from '../locales/en/translation.json';
import esTranslation from '../locales/es/translation.json';
import frTranslation from '../locales/fr/translation.json';
import ptTranslation from '../locales/pt/translation.json';
import ruTranslation from '../locales/ru/translation.json';

/**
 * Возвращает предзагруженные переводы
 * Используем статические импорты JSON файлов из директории src
 */
export function loadTranslations(): Record<string, {translation: any}> {
  // Возвращаем объект с переводами для всех поддерживаемых языков
  return {
    en: {
      translation: enTranslation
    },
    ru: {
      translation: ruTranslation
    },
    fr: {
      translation: frTranslation
    },
    es: {
      translation: esTranslation
    },
    pt: {
      translation: ptTranslation
    }
  };
}
