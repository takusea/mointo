import type { MessageKey } from "~/features/i18n/I18nContext";
import type { CompositionSettings } from "~/features/project/type";

export type ProjectExportFormat = "gif" | "apng" | "png-sequence";

export type ProjectFrame = {
	index: number;
	pixels: Uint8ClampedArray;
};

export type ProjectExporter = {
	format: ProjectExportFormat;
	extension: string;
	labelKey: MessageKey;
	encode: (
		settings: CompositionSettings,
		frames: AsyncIterable<ProjectFrame>,
	) => Promise<Blob>;
};

export type RenderProjectFrame = (
	index: number,
) => Promise<Uint8ClampedArray | undefined>;

export async function* renderProjectFrames(
	settings: CompositionSettings,
	renderFrame: RenderProjectFrame,
	onProgress: (completed: number, total: number) => void,
): AsyncGenerator<ProjectFrame> {
	const { width, height, startFrame, endFrame, frameRate } = settings;
	if (
		!Number.isInteger(width) ||
		!Number.isInteger(height) ||
		width <= 0 ||
		height <= 0 ||
		!Number.isFinite(frameRate) ||
		frameRate <= 0 ||
		endFrame < startFrame
	) {
		throw new Error("Project settings are not valid for export.");
	}

	const total = endFrame - startFrame + 1;
	for (let index = startFrame; index <= endFrame; index += 1) {
		const pixels = await renderFrame(index);
		if (pixels == null) {
			throw new Error(`Could not render frame ${index}.`);
		}
		if (pixels.length !== width * height * 4) {
			throw new Error(`Rendered frame ${index} has an unexpected size.`);
		}
		onProgress(index - startFrame + 1, total);
		yield { index, pixels };
	}
}

export const exportProject = (
	settings: CompositionSettings,
	renderFrame: RenderProjectFrame,
	exporter: ProjectExporter,
	onProgress: (completed: number, total: number) => void,
) =>
	exporter.encode(
		settings,
		renderProjectFrames(settings, renderFrame, onProgress),
	);
