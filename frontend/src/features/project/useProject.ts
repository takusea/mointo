import { useCallback, useEffect, useState } from "react";
import { useDocumentTitle } from "usehooks-ts";
import { useCore } from "~/core/useCore";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";
import { useI18n } from "~/features/i18n/useI18n";
import type { CompositionSettings } from "./type";

export const useProject = () => {
	const core = useCore();
	const { compositionSettings, projectTitle, revision } = useCoreSnapshot();
	const { t } = useI18n();
	const [savedRevision, setSavedRevision] = useState(revision);
	const hasUnsavedChanges = revision !== savedRevision;

	const confirmDiscard = useCallback(() => {
		return !hasUnsavedChanges || window.confirm(t("project.unsavedChanges"));
	}, [hasUnsavedChanges, t]);

	useEffect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasUnsavedChanges) return;
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);

	const create = (title: string, settings: CompositionSettings) => {
		return core.createProject(title, settings);
	};
	const setSettings = (newSettings: CompositionSettings) => {
		return core.setCompositionSettings(newSettings);
	};
	const setTitle = (title: string) => core.setProjectTitle(title);

	useDocumentTitle(projectTitle ? `${projectTitle} - mointo` : "mointo");

	const open = () => {
		if (!confirmDiscard()) return;
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".moiproj";
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (!file) {
				throw new Error("file is null");
			}
			const reader = new FileReader();
			reader.addEventListener("load", (event) => {
				const result = event.target?.result;
				if (!(result instanceof ArrayBuffer)) {
					throw new Error("FileReader result is not an ArrayBuffer");
				}
				void core.importProject(new Uint8Array(result)).then(() => {
					setSavedRevision(core.getSnapshot().revision);
				});
			});
			reader.readAsArrayBuffer(file);
		});
		input.click();
		input.remove();
	};

	const save = async () => {
		const data = await core.exportProject();
		const blob = new Blob([data.buffer as ArrayBuffer], {
			type: "application/zip",
		});
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		const title =
			projectTitle?.trim().replace(/[\\/:*?"<>|]/g, "_") || "project";
		link.download = `${title}.moiproj`;
		link.click();
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
		setSavedRevision(core.getSnapshot().revision);
	};

	return {
		create,
		settings: compositionSettings,
		title: projectTitle,
		setSettings,
		setTitle,
		open,
		save,
		hasUnsavedChanges,
		confirmDiscard,
	};
};
