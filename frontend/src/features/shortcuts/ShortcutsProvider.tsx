import type { JSX } from "react";
import { useLocalStorage } from "usehooks-ts";
import { ShortcutsContext } from "./ShortcutsContext";
import {
	defaultShortcuts,
	type ShortcutId,
	type Shortcuts,
} from "./shortcutDefinitions";

const STORAGE_KEY = "mointo.shortcuts";

type Props = {
	children: JSX.Element;
};

export const ShortcutsProvider = ({ children }: Props) => {
	const [shortcuts, setShortcuts] = useLocalStorage<Shortcuts>(
		STORAGE_KEY,
		defaultShortcuts,
	);

	const setShortcut = (id: ShortcutId, shortcut: string) => {
		setShortcuts((current) => ({ ...current, [id]: shortcut }));
	};

	const resetShortcuts = () => setShortcuts(defaultShortcuts);

	return (
		<ShortcutsContext value={{ shortcuts, setShortcut, resetShortcuts }}>
			{children}
		</ShortcutsContext>
	);
};
