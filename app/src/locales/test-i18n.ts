import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {},
  interpolation: {escapeValue: false},
  react: {useSuspense: false},
  defaultNS: 'translation',
  keySeparator: false,
  nsSeparator: false,
  returnObjects: false,
  parseMissingKeyHandler: (key) => key
});

export default i18n;
