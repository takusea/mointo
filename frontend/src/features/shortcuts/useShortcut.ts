import type { HotkeyCallback } from "react-hotkeys-hook";
import { useHotkeys } from "react-hotkeys-hook";
import { useDialogs } from "~/editor/dialogs/useDialogs";

type HotkeyOptions = Exclude<
	NonNullable<Parameters<typeof useHotkeys>[2]>,
	readonly unknown[]
>;

const shortcutEnabledFormTags = [
	"slider",
	"spinbutton",
	"menuitem",
	"menuitemcheckbox",
	"menuitemradio",
	"option",
	"radio",
] as const;

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
	const { isOpen: isDialogOpen } = useDialogs();
	const hotkey = shortcut.split("+").map(toHotkeyPart).join("+");
	const hotkeyOptions =
		options == null
			? {
					enabled: isDialogOpen ? false : undefined,
					enableOnFormTags: shortcutEnabledFormTags,
				}
			: isHotkeyOptions(options)
				? {
						...options,
						enabled: isDialogOpen ? false : options.enabled,
						enableOnFormTags:
							options.enableOnFormTags ?? shortcutEnabledFormTags,
					}
				: options;

	return useHotkeys(hotkey, callback, hotkeyOptions, dependencies);
};
