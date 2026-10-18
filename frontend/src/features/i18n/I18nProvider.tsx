import { type JSX, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
	I18nContext,
	type I18nContextValue,
	type Locale,
	messages,
} from "./I18nContext";

const STORAGE_KEY = "mointo.language";

const getInitialLocale = (): Locale =>
	navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";

type Props = {
	children: JSX.Element;
};

export const I18nProvider = ({ children }: Props) => {
	const [locale, setLocale] = useLocalStorage<Locale>(
		STORAGE_KEY,
		getInitialLocale,
	);

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	const t: I18nContextValue["t"] = (key, values = {}) =>
		messages[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
			String(values[name] ?? placeholder),
		);

	return <I18nContext value={{ locale, setLocale, t }}>{children}</I18nContext>;
};
