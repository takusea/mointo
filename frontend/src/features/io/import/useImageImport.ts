import { useClip } from "~/features/clip/useClip";
import { throwIfIoCancelled } from "~/features/io/cancellation";
import { useIoProgress } from "~/features/io/useIoProgress";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { createFileImportHandler } from "./createFileImportHandler";

export const useImageImport = () => {
	const clipContext = useClip();
	const layerContext = useLayer();
	const playback = usePlayback();
	const project = useProject();
	const ioProgress = useIoProgress();

	const importFile = async (file: File) => {
		const settings = project.settings;
		const layerId = layerContext.selectedLayerId;
		if (
			settings == null ||
			layerId == null ||
			layerContext.isLayerLocked(layerId)
		)
			return;

		const signal = ioProgress.start("io.importImage");
		if (signal == null) return;
		try {
			const image = await createImageBitmap(file);
			try {
				throwIfIoCancelled(signal);
				const { width, height } = image;
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext("2d");
				if (context == null) throw new Error("Canvas is unavailable.");
				context.drawImage(image, 0, 0);

				throwIfIoCancelled(signal);
				ioProgress.setCancelable(false);
				const frame = playback.currentFrame;
				await clipContext.addImageClip(
					frame,
					layerId,
					width,
					height,
					context.getImageData(0, 0, width, height).data,
				);
			} finally {
				image.close();
			}
		} catch (error) {
			if (!signal.aborted) console.error("Failed to import image.", error);
		} finally {
			ioProgress.finish();
		}
	};

	return createFileImportHandler("image/*", importFile);
};
