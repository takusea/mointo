import { useState } from "react";
import { useCore } from "~/core/useCore";
import type { ClipMetadata } from "~/lib/clip";
import type { LayerId } from "~/lib/layer";
import type { SelectionArea } from "./ClipContext";

type CompositionSettings = {
	width: number;
	height: number;
} | null;

type ClipboardImage = {
	x: number;
	y: number;
	width: number;
	height: number;
	pixels: Uint8ClampedArray;
};

type Options = {
	currentClip: ClipMetadata | undefined;
	selection: SelectionArea | undefined;
	selectedLayerId: LayerId | null;
	currentFrame: number;
	compositionSettings: CompositionSettings | undefined;
	isLayerLocked: (layerId: LayerId) => boolean;
	addImageClip: (
		start: number,
		layerId: LayerId,
		width: number,
		height: number,
		pixels: Uint8ClampedArray,
	) => Promise<void>;
};

export const useClipboard = ({
	currentClip,
	selection,
	selectedLayerId,
	currentFrame,
	compositionSettings,
	isLayerLocked,
	addImageClip,
}: Options) => {
	const core = useCore();
	const [clipboard, setClipboard] = useState<ClipboardImage>();

	const getClipboardImage = async () => {
		const clip = currentClip;
		const settings = compositionSettings;
		if (clip == null || settings == null) return undefined;

		const pixels = await core.getClipPixels(clip.id);
		if (pixels == null) {
			throw new Error(`Clip pixel data is unavailable for clip ${clip.id}.`);
		}
		if (pixels.length !== settings.width * settings.height * 4) {
			throw new Error("Clip pixel dimensions do not match project settings.");
		}

		const bounds = selection ?? {
			x: 0,
			y: 0,
			width: settings.width,
			height: settings.height,
		};
		const x = Math.max(0, Math.min(settings.width, bounds.x));
		const y = Math.max(0, Math.min(settings.height, bounds.y));
		const right = Math.max(
			x,
			Math.min(settings.width, bounds.x + bounds.width),
		);
		const bottom = Math.max(
			y,
			Math.min(settings.height, bounds.y + bounds.height),
		);
		const width = right - x;
		const height = bottom - y;
		if (width === 0 || height === 0) return undefined;

		const copiedPixels = new Uint8ClampedArray(width * height * 4);
		for (let row = 0; row < height; row++) {
			const sourceStart = ((y + row) * settings.width + x) * 4;
			const destinationStart = row * width * 4;
			copiedPixels.set(
				pixels.subarray(sourceStart, sourceStart + width * 4),
				destinationStart,
			);
			if (selection?.mask != null) {
				for (let column = 0; column < width; column++) {
					if (selection.mask[(y + row) * settings.width + x + column]) continue;
					copiedPixels.fill(
						0,
						(row * width + column) * 4,
						(row * width + column + 1) * 4,
					);
				}
			}
		}

		return { clip, x, y, width, height, pixels: copiedPixels };
	};

	const copy = async () => {
		const image = await getClipboardImage();
		if (image == null) return;
		const { clip: _clip, ...copiedImage } = image;
		setClipboard(copiedImage);
	};

	const cut = async () => {
		const image = await getClipboardImage();
		if (
			image == null ||
			isLayerLocked(image.clip.layer_id) ||
			image.clip.locked
		) {
			return;
		}

		const { clip, ...copiedImage } = image;
		setClipboard(copiedImage);

		const pixels = await core.getClipPixels(clip.id);
		if (pixels == null) {
			throw new Error(`Clip pixel data is unavailable for clip ${clip.id}.`);
		}
		const settings = compositionSettings;
		if (settings == null) return;
		for (let row = 0; row < image.height; row++) {
			const start = ((image.y + row) * settings.width + image.x) * 4;
			for (let column = 0; column < image.width; column++) {
				if (
					selection?.mask != null &&
					!selection.mask[(image.y + row) * settings.width + image.x + column]
				)
					continue;
				pixels.fill(0, start + column * 4, start + column * 4 + 4);
			}
		}
		await core.replaceClipPixels(clip.id, pixels);
	};

	const paste = async () => {
		const settings = compositionSettings;
		if (clipboard == null || settings == null || selectedLayerId == null)
			return;
		const pixels = new Uint8ClampedArray(settings.width * settings.height * 4);
		for (let row = 0; row < clipboard.height; row++) {
			const targetY = clipboard.y + row;
			if (targetY < 0 || targetY >= settings.height) continue;
			for (let column = 0; column < clipboard.width; column++) {
				const targetX = clipboard.x + column;
				if (targetX < 0 || targetX >= settings.width) continue;
				const sourceIndex = (row * clipboard.width + column) * 4;
				if (clipboard.pixels[sourceIndex + 3] === 0) continue;
				const targetIndex = (targetY * settings.width + targetX) * 4;
				pixels.set(
					clipboard.pixels.subarray(sourceIndex, sourceIndex + 4),
					targetIndex,
				);
			}
		}

		await core.beginActionGroup();
		try {
			await addImageClip(
				currentFrame,
				selectedLayerId,
				settings.width,
				settings.height,
				pixels,
			);
		} finally {
			await core.endActionGroup();
		}
	};

	return { copy, cut, paste };
};
