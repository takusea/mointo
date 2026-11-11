import { useState } from "react";
import Button from "~/components/Button";
import Dialog from "~/components/Dialog";
import {
	formatShortcut,
	type ShortcutId,
	shortcutDefinitions,
} from "~/constants/shortcuts";
import type { MessageKey } from "~/features/i18n/I18nContext";
import { useI18n } from "~/features/i18n/useI18n";
import { useShortcutSettings } from "./useShortcuts";

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
	Insert: "insert",
	PageDown: "pagedown",
	PageUp: "pageup",
	Tab: "tab",
};

const shortcutGroups: MessageKey[] = [
	"action.file",
	"action.edit",
	"action.select",
	"action.view",
	"action.play",
	"tool",
];

const getShortcutFromEvent = (event: React.KeyboardEvent): string | null => {
	if (modifiers.has(event.key)) return null;

	let key = keyNames[event.key];
	if (key == null && event.key.length === 1) {
		key = /^[a-z0-9]$/i.test(event.key)
			? event.key.toLowerCase()
			: `code:${event.code}:${event.key.codePointAt(0)?.toString(16)}`;
	}
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
	const { shortcuts, setShortcut, resetShortcuts } = useShortcutSettings();
	const [recording, setRecording] = useState<ShortcutId | null>(null);
	const [conflict, setConflict] = useState(false);
	const entries = Object.entries(shortcutDefinitions) as [
		ShortcutId,
		(typeof shortcutDefinitions)[ShortcutId],
	][];

	return (
		<Dialog
			open={props.open}
			onOpenChange={(nextOpen) => {
				setRecording(null);
				setConflict(false);
				props.onOpenChange(nextOpen);
			}}
			title={t("dialog.shortcut.title")}
			cancelText={t("common.close")}
			tertiaryText={t("dialog.shortcut.reset")}
			onTertiary={() => {
				resetShortcuts();
				setRecording(null);
				setConflict(false);
			}}
		>
			<div className="flex flex-col gap-4">
				{shortcutGroups.map((group) => {
					const groupEntries = entries.filter(([, definition]) =>
						definition.label.startsWith(group),
					);
					if (groupEntries.length === 0) return null;

					return (
						<section key={group} className="flex flex-col gap-2">
							<h3 className="font-bold text-foreground-muted">{t(group)}</h3>
							<div className="grid grid-cols-[1fr_auto] items-center gap-1">
								{groupEntries.map(([id, definition]) => (
									<div className="contents" key={id}>
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
													? t("dialog.shortcut.pressKeys")
													: formatShortcut(shortcuts[id])
											}
										></Button>
									</div>
								))}
							</div>
						</section>
					);
				})}
				{conflict && (
					<p
						role="alert"
						className="sticky bottom-0 bg-background py-4 text-warning backdrop-blur-xl"
					>
						{t("dialog.shortcut.conflict")}
					</p>
				)}
			</div>
		</Dialog>
	);
};

export default ShortcutSettingsDialog;
