import { type JSX, useEffect } from "react";
import { useLocalStorage, useTernaryDarkMode } from "usehooks-ts";
import { storageKeys } from "~/constants/storageKeys";
import { AppearanceContext } from "./AppearanceContext";

export const AppearanceProvider = ({ children }: { children: JSX.Element }) => {
	const { isDarkMode, ternaryDarkMode, setTernaryDarkMode } =
		useTernaryDarkMode({ localStorageKey: storageKeys.appearance.theme });
	const [accentColor, setAccentColor] = useLocalStorage(
		storageKeys.appearance.accentColor,
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
