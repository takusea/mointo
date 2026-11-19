import { useState } from "react";
import { useCore } from "~/core/useCore";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";
import { useI18n } from "~/features/i18n/useI18n";
import { chooseSaveDestination, writeSavedBlob } from "~/features/io/saveBlob";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { exportProject, type ProjectExportFormat } from "./projectExport";
import { getProjectExporter } from "./projectExporters";

export const useProjectExport = () => {
	const { t } = useI18n();
	const core = useCore();
	const { clips, layers } = useCoreSnapshot();
	const project = useProject();
	const playback = usePlayback();
	const [progress, setProgress] = useState<
		{ completed: number; total: number } | undefined
	>();

	const exportAs = async (format: ProjectExportFormat) => {
		const settings = project.settings;
		if (settings == null || progress != null) return;

		const exporter = getProjectExporter(format);
		const title =
			project.title
				?.replace(/[<>:"/\\|?*]/g, "_")
				.replace(/\p{Cc}/gu, "_")
				.trim() || "project";
		const destination = await chooseSaveDestination(
			`${title}.${exporter.extension}`,
			[exporter.mimeType],
			"Export",
		);
		if (destination.type === "cancelled") return;

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
				{
					audioTracks: clips
						.filter((clip) => clip.clip_type === "audio")
						.map((clip) => ({
							id: clip.id,
							start: clip.start,
							duration: clip.duration,
							hidden: clip.hidden,
							layerVisible:
								layers.find((layer) => layer.id === clip.layer_id)?.visible ??
								true,
							audioStartFrame: clip.audio_start_frame,
						})),
					getAudioClipData: (id) => core.getAudioClipData(id),
				},
			);
			await writeSavedBlob(destination, blob);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			window.alert(t("header.exportFailed", { error: message }));
		} finally {
			setProgress(undefined);
		}
	};

	return { progress, exportAs };
};
