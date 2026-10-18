import { useState } from "react";
import Button from "~/components/Button";
import Dialog from "~/components/Dialog";
import { useI18n } from "~/features/i18n/useI18n";
import {
	formatShortcut,
	type ShortcutId,
	shortcutDefinitions,
} from "./shortcutDefinitions";
import { useShortcuts } from "./useShortcuts";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const modifiers = new Set(["Control", "Alt", "Shift", "Meta"]);
const keyNames: Record<string, string> = {
	" ": "space",
	ArrowDown: "ArrowDown",
	ArrowLeft: "ArrowLeft",
	ArrowRight: "ArrowRight",
	ArrowUp: "ArrowUp",
	Backspace: "backspace",
	Delete: "delete",
	End: "end",
	Enter: "enter",
	Escape: "escape",
	Home: "home",
	PageDown: "pagedown",
	PageUp: "pageup",
	Tab: "tab",
};

const getShortcutFromEvent = (event: React.KeyboardEvent): string | null => {
	if (modifiers.has(event.key)) return null;

	let key = keyNames[event.key];
	if (event.key === "=" || event.key === "+") key = "equal";
	else if (event.key === "-") key = "minus";
	else if (key == null && event.key.length === 1) key = event.key.toLowerCase();
	if (key == null) return null;

	return [
		event.ctrlKey && "ctrl",
		event.altKey && "alt",
		event.shiftKey && "shift",
		event.metaKey && "meta",
		key,
	]
		.filter(Boolean)
		.join("+");
};

const ShortcutSettingsDialog = (props: Props) => {
	const { t } = useI18n();
	const { shortcuts, setShortcut, resetShortcuts } = useShortcuts();
	const [recording, setRecording] = useState<ShortcutId | null>(null);
	const [conflict, setConflict] = useState(false);

	return (
		<Dialog
			open={props.open}
			onOpenChange={(nextOpen) => {
				setRecording(null);
				setConflict(false);
				props.onOpenChange(nextOpen);
			}}
			title={t("shortcutSettings.title")}
			cancelText={t("common.close")}
		>
			<div className="grid grid-cols-[1fr_auto] items-center gap-2 px-2">
				{(
					Object.entries(shortcutDefinitions) as [
						ShortcutId,
						(typeof shortcutDefinitions)[ShortcutId],
					][]
				).map(([id, definition]) => (
					<>
						<span>{t(definition.label)}</span>
						<Button
							onClick={() => {
								setRecording(id);
								setConflict(false);
							}}
							onKeyDown={(event) => {
								if (recording !== id) return;
								event.preventDefault();
								event.stopPropagation();
								const nextShortcut = getShortcutFromEvent(event);
								if (nextShortcut == null) return;
								if (
									Object.entries(shortcuts).some(
										([otherId, value]) =>
											otherId !== id && value === nextShortcut,
									)
								) {
									setConflict(true);
									return;
								}
								setShortcut(id, nextShortcut);
								setRecording(null);
								setConflict(false);
							}}
							label={
								recording === id
									? t("shortcutSettings.pressKeys")
									: formatShortcut(shortcuts[id])
							}
						></Button>
					</>
				))}
			</div>
			<div className="sticky bottom-0 mt-2 grid grid-cols-[1fr_auto] bg-white/90 p-2 backdrop-blur-xl dark:bg-zinc-950/90">
				{conflict && (
					<p role="alert" className="mt-2 text-red-600">
						{t("shortcutSettings.conflict")}
					</p>
				)}
				<div className="col-start-2">
					<Button
						label={t("shortcutSettings.reset")}
						onClick={() => {
							resetShortcuts();
							setRecording(null);
							setConflict(false);
						}}
					/>
				</div>
			</div>
		</Dialog>
	);
};

export default ShortcutSettingsDialog;
