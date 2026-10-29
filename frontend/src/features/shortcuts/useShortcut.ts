import type { HotkeyCallback } from "react-hotkeys-hook";
import { useHotkeys } from "react-hotkeys-hook";

const toHotkeyPart = (part: string) => {
	if (part === "`") return "backquote";
	const codePart = /^code:([A-Za-z0-9]+):[0-9a-f]+$/i.exec(part);
	if (codePart == null) return part;

	return codePart[1].toLowerCase().replace(/key|digit|numpad/, "");
};

export const useShortcut = (
	shortcut: string,
	callback: HotkeyCallback,
	options?: Parameters<typeof useHotkeys>[2],
	dependencies?: Parameters<typeof useHotkeys>[3],
) => {
	const hotkey = shortcut.split("+").map(toHotkeyPart).join("+");

	return useHotkeys(hotkey, callback, options, dependencies);
};
