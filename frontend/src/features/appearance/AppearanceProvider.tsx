import { type JSX, useEffect } from "react";
import { useLocalStorage, useTernaryDarkMode } from "usehooks-ts";
import { AppearanceContext } from "./AppearanceContext";

const THEME_STORAGE_KEY = "flippen.theme";
const ACCENTCOLOR_STORAGE_KEY = "flippen.accentColor";

export const AppearanceProvider = ({ children }: { children: JSX.Element }) => {
	const { isDarkMode, ternaryDarkMode, setTernaryDarkMode } =
		useTernaryDarkMode({ localStorageKey: THEME_STORAGE_KEY });
	const [accentColor, setAccentColor] = useLocalStorage(
		ACCENTCOLOR_STORAGE_KEY,
		180,
	);

	useEffect(() => {
		document.documentElement.style.setProperty("--hue", accentColor.toString());
	}, [accentColor]);

	useEffect(() => {
		document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
	}, [isDarkMode]);

	return (
		<AppearanceContext
			value={{
				ternaryDarkMode,
				setTernaryDarkMode,
				accentColor,
				setAccentColor,
			}}
		>
			{children}
		</AppearanceContext>
	);
};
