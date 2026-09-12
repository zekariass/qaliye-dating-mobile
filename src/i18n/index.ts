import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import am from './locales/am.json';
import en from './locales/en.json';
import om from './locales/om.json';
import ti from './locales/ti.json';

// Default to English. The saved language from the language store
// (src/stores/language-store.ts) is applied on app startup from the
// root layout, overriding this default once AsyncStorage hydrates.
const DEFAULT_LANGUAGE = 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
    ti: { translation: ti },
    om: { translation: om },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
