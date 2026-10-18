import type { JSX } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
	defaultShortcuts,
	type ShortcutId,
	type Shortcuts,
} from "~/constants/shortcuts";
import { storageKeys } from "~/constants/storageKeys";
import { ShortcutsContext } from "./ShortcutsContext";

type Props = {
	children: JSX.Element;
};

export const ShortcutsProvider = ({ children }: Props) => {
	const [shortcuts, setShortcuts] = useLocalStorage<Shortcuts>(
		storageKeys.shortcuts,
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
