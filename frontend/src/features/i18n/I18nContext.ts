import { createContext, type Dispatch, type SetStateAction } from "react";
import enMessages from "~/constants/locales/en.json";
import jaMessages from "~/constants/locales/ja.json";

export const messages = { en: enMessages, ja: jaMessages };

export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof enMessages;

export type I18nContextValue = {
	locale: Locale;
	setLocale: Dispatch<SetStateAction<Locale>>;
	t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);
