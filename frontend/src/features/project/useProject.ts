import { use, useCallback, useEffect } from "react";
import { useDocumentTitle } from "usehooks-ts";
import { useCore } from "~/core/useCore";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";
import { useI18n } from "~/features/i18n/useI18n";
import { throwIfIoCancelled } from "~/features/io/cancellation";
import { chooseSaveDestination, writeSavedBlob } from "~/features/io/saveBlob";
import { useIoProgress } from "~/features/io/useIoProgress";
import { ProjectContext } from "./ProjectProvider";
import type { CompositionSettings } from "./type";

export const useProject = () => {
	const projectContext = use(ProjectContext);
	if (projectContext == null)
		throw new Error("ProjectProvider is not provided");

	const core = useCore();
	const { compositionSettings, projectTitle, revision } = useCoreSnapshot();
	const { t } = useI18n();
	const ioProgress = useIoProgress();
	const hasUnsavedChanges = revision !== projectContext.savedRevision;

	const confirmDiscard = useCallback(() => {
		return (
			!hasUnsavedChanges || window.confirm(t("dialog.project.unsavedChanges"))
		);
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

	const importFile = async (file: File) => {
		if (!confirmDiscard()) return;
		const signal = ioProgress.start("io.importProject");
		if (signal == null) return;
		try {
			const data = await file.arrayBuffer();
			throwIfIoCancelled(signal);
			ioProgress.setProgress({ completed: 1, total: 2 });
			ioProgress.setCancelable(false);
			await core.importProject(new Uint8Array(data), signal);
			ioProgress.setProgress({ completed: 2, total: 2 });
			const projectName = file.name.replace(/\.[^.]+$/, "");
			await core.setProjectTitle(projectName || file.name);
			projectContext.setSavedRevision(core.getSnapshot().revision);
		} catch (error) {
			if (signal.aborted) return;
			throw error;
		} finally {
			ioProgress.finish();
		}
	};

	const open = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".moiproj";
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (file) void importFile(file);
		});
		input.click();
		input.remove();
	};

	const save = async () => {
		const title =
			projectTitle?.trim().replace(/[\\/:*?"<>|]/g, "_") || "project";
		const destination = await chooseSaveDestination(
			`${title}.moiproj`,
			["application/vnt.moiproj"],
			"Mointo Project",
		);
		if (destination.type === "cancelled") return;

		const signal = ioProgress.start("io.saveProject");
		if (signal == null) return;
		try {
			const data = await core.exportProject(signal);
			throwIfIoCancelled(signal);
			ioProgress.setCancelable(false);
			const blob = new Blob([data.buffer as ArrayBuffer], {
				type: "application/vnt.moiproj",
			});
			await writeSavedBlob(destination, blob);
			throwIfIoCancelled(signal);
			projectContext.setSavedRevision(core.getSnapshot().revision);
		} catch (error) {
			if (signal.aborted) return;
			throw error;
		} finally {
			ioProgress.finish();
		}
	};

	const close = async () => {
		if (compositionSettings == null || !confirmDiscard()) return;
		await core.closeProject();
		projectContext.setSavedRevision(core.getSnapshot().revision);
	};

	return {
		create,
		settings: compositionSettings,
		title: projectTitle,
		setSettings,
		setTitle,
		open,
		importFile,
		save,
		close,
		hasUnsavedChanges,
		confirmDiscard,
	};
};
