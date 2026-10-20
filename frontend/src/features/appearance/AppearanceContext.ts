import { createContext, type Dispatch, type SetStateAction } from "react";
import type { TernaryDarkMode } from "usehooks-ts";

type AppearanceContextValue = {
	ternaryDarkMode: TernaryDarkMode;
	setTernaryDarkMode: Dispatch<SetStateAction<TernaryDarkMode>>;
	accentColor: number;
	setAccentColor: Dispatch<SetStateAction<number>>;
	isMono: boolean;
	setIsMono: Dispatch<SetStateAction<boolean>>;
};

export const AppearanceContext = createContext<AppearanceContextValue | null>(
	null,
);
