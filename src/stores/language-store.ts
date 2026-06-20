import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SupportedLanguage = 'en' | 'am' | 'ti' | 'om';

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'qaliye-language',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; native: string; code: string }> = {
  en: { label: 'English', native: 'English', code: 'EN' },
  am: { label: 'Amharic', native: 'አማርኛ', code: 'አማ' },
  ti: { label: 'Tigrinya', native: 'ትግርኛ', code: 'ትግ' },
  om: { label: 'Oromo', native: 'Afaan Oromoo', code: 'Oro' },
};

export const LANGUAGE_LIST: SupportedLanguage[] = ['en', 'am', 'ti', 'om'];
