import { IconRestore } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useRecordHotkeys } from "react-hotkeys-hook";
import Button from "~/components/Button";
import Card from "~/components/Card";
import Dialog from "~/components/Dialog";
import IconButton from "~/components/IconButton";
import Tooltip from "~/components/Tooltip";
import {
	defaultShortcuts,
	formatShortcut,
	isMacOS,
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

const modifierOrder = ["ctrl", "alt", "shift", "meta"];

const shortcutGroups: MessageKey[] = [
	"action.file",
	"action.edit",
	"action.select",
	"action.view",
	"action.play",
	"tool",
];

const getShortcutFromKeys = (keys: Set<string>): string | null => {
	const modifiers = modifierOrder
		.filter((modifier) => keys.has(modifier))
		.map((modifier) =>
			(isMacOS && modifier === "meta") || (!isMacOS && modifier === "ctrl")
				? "mod"
				: modifier,
		);
	const otherKeys = [...keys].filter((key) => !modifierOrder.includes(key));

	if (otherKeys.length === 0) return null;
	return [...modifiers, ...otherKeys].join("+");
};

const ShortcutSettingsDialog = (props: Props) => {
	const { t } = useI18n();
	const { shortcuts, setIsRecording, setShortcut, resetShortcuts } =
		useShortcutSettings();
	const [recording, setRecording] = useState<ShortcutId | null>(null);
	const [recordedKeys, { start, stop, resetKeys, isRecording }] =
		useRecordHotkeys();
	const entries = Object.entries(shortcutDefinitions) as [
		ShortcutId,
		(typeof shortcutDefinitions)[ShortcutId],
	][];

	useEffect(() => {
		if (recording == null || !isRecording) return;

		const nextShortcut = getShortcutFromKeys(recordedKeys);
		if (nextShortcut == null) return;

		setShortcut(recording, nextShortcut);
		stop();
		setIsRecording(false);
		setRecording(null);
	}, [isRecording, recordedKeys, recording, setIsRecording, setShortcut, stop]);

	const getConflictingShortcutId = (id: ShortcutId) =>
		(Object.keys(shortcutDefinitions) as ShortcutId[]).find(
			(otherId) => otherId !== id && shortcuts[otherId] === shortcuts[id],
		);

	const getShortcutTooltip = (id: ShortcutId) => {
		if (recording === id) return t("dialog.shortcut.pressKeys");

		const conflictingId = getConflictingShortcutId(id);
		if (conflictingId != null) {
			return t("dialog.shortcut.conflict", {
				shortcut: t(shortcutDefinitions[conflictingId].label),
			});
		}
		return t("dialog.shortcut.change");
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(nextOpen) => {
				stop();
				resetKeys();
				setIsRecording(false);
				setRecording(null);
				props.onOpenChange(nextOpen);
			}}
			title={t("dialog.shortcut.title")}
			cancelText={t("common.close")}
			tertiaryText={t("dialog.shortcut.reset")}
			onTertiary={() => {
				resetShortcuts();
				stop();
				resetKeys();
				setIsRecording(false);
				setRecording(null);
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
							<Card size="small">
								<div className="flex flex-col gap-1">
									{groupEntries.map(([id, definition]) => (
										<div
											className="grid grid-cols-[1fr_auto_auto] items-center gap-1"
											key={id}
										>
											<span className="px-2">{t(definition.label)}</span>
											<Tooltip label={getShortcutTooltip(id)}>
												<Button
													onClick={() => {
														start();
														setIsRecording(true);
														setRecording(id);
													}}
													label={
														recording === id
															? t("dialog.shortcut.pressKeys")
															: formatShortcut(shortcuts[id])
													}
													variant={
														getConflictingShortcutId(id) == null
															? "default"
															: "warning"
													}
												/>
											</Tooltip>
											<IconButton
												icon={IconRestore}
												label={t("dialog.shortcut.reset")}
												disabled={shortcuts[id] === defaultShortcuts[id]}
												onClick={() => {
													setShortcut(id, defaultShortcuts[id]);
													if (recording === id) {
														stop();
														resetKeys();
														setIsRecording(false);
														setRecording(null);
													}
												}}
											/>
										</div>
									))}
								</div>
							</Card>
						</section>
					);
				})}
			</div>
		</Dialog>
	);
};

export default ShortcutSettingsDialog;
