import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import am from './locales/am.json';
import en from './locales/en.json';
import om from './locales/om.json';
import ti from './locales/ti.json';

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';

const supportedLanguages = ['en', 'am', 'ti', 'om'];
const resolvedLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
    ti: { translation: ti },
    om: { translation: om },
  },
  lng: resolvedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
