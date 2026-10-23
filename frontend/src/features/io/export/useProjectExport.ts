import { useState } from "react";
import { useI18n } from "~/features/i18n/useI18n";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { exportProject, type ProjectExportFormat } from "./projectExport";
import { getProjectExporter } from "./projectExporters";

export const useProjectExport = () => {
	const { t } = useI18n();
	const project = useProject();
	const playback = usePlayback();
	const [progress, setProgress] = useState<
		{ completed: number; total: number } | undefined
	>();

	const exportAs = async (format: ProjectExportFormat) => {
		const settings = project.settings;
		if (settings == null || progress != null) return;

		const exporter = getProjectExporter(format);
		setProgress({
			completed: 0,
			total: settings.endFrame - settings.startFrame + 1,
		});
		try {
			const blob = await exportProject(
				settings,
				playback.renderFrame,
				exporter,
				(completed, total) => setProgress({ completed, total }),
			);
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			const title =
				project.title
					?.replace(/[<>:"/\\|?*]/g, "_")
					.replace(/\p{Cc}/gu, "_")
					.trim() || "project";
			link.href = url;
			link.download = `${title}.${exporter.extension}`;
			link.click();
			link.remove();
			window.setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			window.alert(t("nav.exportFailed", { error: message }));
		} finally {
			setProgress(undefined);
		}
	};

	return { progress, exportAs };
};
