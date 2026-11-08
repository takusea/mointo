import { useCore } from "~/core/useCore";
import { useClip } from "~/features/clip/useClip";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";

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
	const core = useCore();
	const clipContext = useClip();
	const layerContext = useLayer();
	const playback = usePlayback();
	const project = useProject();

	return () => {
		const settings = project.settings;
		const layerId = layerContext.selectedLayerId;
		if (
			settings == null ||
			layerId == null ||
			layerContext.isLayerLocked(layerId)
		)
			return;

		const input = document.createElement("input");
		input.type = "file";
		input.accept = "audio/*";
		input.addEventListener("change", async () => {
			const file = input.files?.[0];
			if (file == null) return;

			try {
				const durationSeconds = await readAudioDuration(file);
				const duration = Math.max(
					1,
					Math.ceil(durationSeconds * settings.frameRate),
				);
				const frame = playback.currentFrame;
				const selectedLayerIndex = layerContext.layers.findIndex(
					(layer) => layer.id === layerId,
				);
				if (selectedLayerIndex < 0) return;
				const destinationLayer = layerContext.layers
					.slice(selectedLayerIndex)
					.find(
						(layer) =>
							!layer.locked &&
							!clipContext.clips.some(
								(clip) =>
									clip.layer_id === layer.id &&
									clip.start <= frame &&
									frame < clip.start + clip.duration,
							),
					);
				if (destinationLayer == null) return;

				const existingIds = new Set(clipContext.clips.map((clip) => clip.id));
				const clips = await core.addAudioClip(
					frame,
					destinationLayer.id,
					duration,
					new Uint8Array(await file.arrayBuffer()),
					file.type || "application/octet-stream",
					file.name,
				);
				const clip = clips.find(
					(candidate) =>
						candidate.layer_id === destinationLayer.id &&
						candidate.start === frame &&
						candidate.clip_type === "audio" &&
						!existingIds.has(candidate.id),
				);
				if (clip == null) return;
				layerContext.selectLayer(destinationLayer.id);
				clipContext.selectClip(clip.id);
			} catch (error) {
				console.error("Failed to import audio.", error);
			}
		});
		input.click();
	};
};
