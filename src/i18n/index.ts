/* eslint-disable import/no-named-as-default-member */
import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './resources';

export type AppLanguage = keyof typeof resources;

const supportedLanguages = Object.keys(resources) as AppLanguage[];
const deviceLanguage = getLocales()[0]?.languageCode;
const initialLanguage: AppLanguage = supportedLanguages.includes(deviceLanguage as AppLanguage)
  ? (deviceLanguage as AppLanguage)
  : 'sr';

void i18next.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  fallbackLng: 'sr',
  interpolation: {
    escapeValue: false,
  },
  lng: initialLanguage,
  resources,
  supportedLngs: supportedLanguages,
});

export function setAppLanguage(language: AppLanguage) {
  if (i18next.language === language || i18next.resolvedLanguage === language) {
    return Promise.resolve();
  }

  return i18next.changeLanguage(language).then(() => undefined);
}

export { i18next as i18n };
