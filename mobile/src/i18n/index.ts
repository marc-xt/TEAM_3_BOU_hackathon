// i18n setup. Device locale via expo-localization, fallback English. Language
// choice persists to AsyncStorage so it survives restarts.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./en.json";
import lg from "./lg.json";
import rn from "./rn.json";

const LANG_KEY = "cs.lang";
export const SUPPORTED = [
  { code: "en", label: "English" },
  { code: "lg", label: "Luganda" },
  { code: "rn", label: "Runyankole" },
] as const;

function deviceLang(): string {
  const code = getLocales()[0]?.languageCode ?? "en";
  return SUPPORTED.some((s) => s.code === code) ? code : "en";
}

export async function initI18n(): Promise<void> {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, lg: { translation: lg }, rn: { translation: rn } },
    lng: saved || deviceLang(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export async function setLanguage(code: string): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, code);
  await i18n.changeLanguage(code);
}

export default i18n;
