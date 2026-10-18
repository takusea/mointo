import { useCore } from "~/core/useCore";
import { useClip } from "~/features/clip/useClip";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";

export const useImageImport = () => {
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
		input.accept = "image/*";
		input.addEventListener("change", async () => {
			const file = input.files?.[0];
			if (file == null) return;

			try {
				const image = await createImageBitmap(file);
				const { width, height } = image;
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext("2d");
				if (context == null) throw new Error("Canvas is unavailable.");
				context.drawImage(image, 0, 0);
				image.close();

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
				const clips = await core.addClipWithSize(
					frame,
					destinationLayer.id,
					width,
					height,
				);
				const clip = clips.find(
					(candidate) =>
						candidate.layer_id === destinationLayer.id &&
						candidate.start === frame &&
						!existingIds.has(candidate.id),
				);
				if (clip == null) return;

				await core.replaceClipPixels(
					clip.id,
					context.getImageData(0, 0, width, height).data,
				);
				layerContext.selectLayer(destinationLayer.id);
				clipContext.selectClip(clip.id);
			} catch (error) {
				console.error("Failed to import image.", error);
			}
		});
		input.click();
	};
};
