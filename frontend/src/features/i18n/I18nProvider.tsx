import { type JSX, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { storageKeys } from "~/constants/storageKeys";
import {
	I18nContext,
	type I18nContextValue,
	type Locale,
	messages,
} from "./I18nContext";

const getInitialLocale = (): Locale =>
	navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";

type Props = {
	children: JSX.Element;
};

export const I18nProvider = ({ children }: Props) => {
	const [locale, setLocale] = useLocalStorage<Locale>(
		storageKeys.language,
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
