import type { HotkeyCallback } from "react-hotkeys-hook";
import { useHotkeys } from "react-hotkeys-hook";
import { useShortcutSettings } from "./useShortcuts";

type HotkeyOptions = Exclude<
	NonNullable<Parameters<typeof useHotkeys>[2]>,
	readonly unknown[]
>;

const isHotkeyOptions = (
	options: NonNullable<Parameters<typeof useHotkeys>[2]>,
): options is HotkeyOptions => !Array.isArray(options);

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
	const { isRecording } = useShortcutSettings();
	const hotkey = shortcut.split("+").map(toHotkeyPart).join("+");
	const hotkeyOptions =
		options == null
			? { enabled: isRecording ? false : undefined }
			: isHotkeyOptions(options)
				? {
						...options,
						enabled: isRecording ? false : options.enabled,
					}
				: options;

	return useHotkeys(hotkey, callback, hotkeyOptions, dependencies);
};
