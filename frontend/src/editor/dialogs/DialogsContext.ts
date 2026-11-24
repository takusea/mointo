import { createContext } from "react";

export type AppDialog =
	| "createProject"
	| "editCompositionSettings"
	| "exportProject"
	| "appearanceSettings"
	| "inputSettings"
	| "languageSettings"
	| "shortcutSettings"
	| "modifySelection"
	| "about";

export type DialogsContextValue = {
	isOpen: boolean;
	open: (dialog: AppDialog) => void;
	close: () => void;
};

export const DialogsContext = createContext<DialogsContextValue | null>(null);
