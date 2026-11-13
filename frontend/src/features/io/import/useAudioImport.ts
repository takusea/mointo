import { useClip } from "~/features/clip/useClip";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { createFileImportHandler } from "./createFileImportHandler";

const readAudioDuration = (file: File): Promise<number> =>
	new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const audio = new Audio();
		audio.preload = "metadata";
		audio.onloadedmetadata = () => {
			const duration = audio.duration;
			URL.revokeObjectURL(url);
			if (!Number.isFinite(duration) || duration <= 0) {
				reject(new Error("Audio duration is unavailable."));
				return;
			}
			resolve(duration);
		};
		audio.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Could not read audio metadata."));
		};
		audio.src = url;
	});

export const useAudioImport = () => {
	const clipContext = useClip();
	const layerContext = useLayer();
	const playback = usePlayback();
	const project = useProject();

	const importFile = async (file: File) => {
		const settings = project.settings;
		const layerId = layerContext.selectedLayerId;
		if (
			settings == null ||
			layerId == null ||
			layerContext.isLayerLocked(layerId)
		)
			return;

		try {
			const durationSeconds = await readAudioDuration(file);
			const duration = Math.max(
				1,
				Math.ceil(durationSeconds * settings.frameRate),
			);
			const frame = playback.currentFrame;
			await clipContext.addAudioClip(
				frame,
				layerId,
				duration,
				new Uint8Array(await file.arrayBuffer()),
				file.type || "application/octet-stream",
				file.name,
			);
		} catch (error) {
			console.error("Failed to import audio.", error);
		}
	};

	return createFileImportHandler("audio/*", importFile);
};
