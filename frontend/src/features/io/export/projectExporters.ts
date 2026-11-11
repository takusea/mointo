import { zipSync, zlibSync } from "fflate";
import gifenc from "gifenc";
import type { ProjectExporter } from "./projectExport";

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit += 1) {
		value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
	}
	return value >>> 0;
});

const crc32 = (data: Uint8Array) => {
	let value = 0xffffffff;
	for (const byte of data) {
		value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
	}
	return (value ^ 0xffffffff) >>> 0;
};

const toArrayBuffer = (data: Uint8Array) => {
	const buffer = new ArrayBuffer(data.byteLength);
	new Uint8Array(buffer).set(data);
	return buffer;
};

const appendPngChunk = (
	chunks: Uint8Array[],
	type: string,
	data: Uint8Array,
) => {
	const chunk = new Uint8Array(data.length + 12);
	const view = new DataView(chunk.buffer);
	view.setUint32(0, data.length);
	for (let index = 0; index < 4; index += 1) {
		chunk[index + 4] = type.charCodeAt(index);
	}
	chunk.set(data, 8);
	view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
	chunks.push(chunk);
};

const appendSequenceNumber = (data: Uint8Array, sequence: number) => {
	const chunkData = new Uint8Array(data.length + 4);
	new DataView(chunkData.buffer).setUint32(0, sequence);
	chunkData.set(data, 4);
	return chunkData;
};

const compressFrame = (
	pixels: Uint8ClampedArray,
	width: number,
	height: number,
) => {
	const stride = width * 4;
	const scanlines = new Uint8Array(height * (stride + 1));
	for (let row = 0; row < height; row += 1) {
		const offset = row * (stride + 1);
		scanlines[offset] = 0;
		scanlines.set(
			pixels.subarray(row * stride, (row + 1) * stride),
			offset + 1,
		);
	}
	return zlibSync(scanlines);
};

const createRgbaHeader = (width: number, height: number) => {
	const header = new Uint8Array(13);
	const view = new DataView(header.buffer);
	view.setUint32(0, width);
	view.setUint32(4, height);
	header[8] = 8;
	header[9] = 6;
	return header;
};

const appendFrameControl = (
	chunks: Uint8Array[],
	sequence: number,
	settings: Parameters<ProjectExporter["encode"]>[0],
) => {
	const data = new Uint8Array(26);
	const view = new DataView(data.buffer);
	view.setUint32(0, sequence);
	view.setUint32(4, settings.width);
	view.setUint32(8, settings.height);
	view.setUint32(12, 0);
	view.setUint32(16, 0);
	view.setUint16(
		20,
		Math.max(1, Math.min(65535, Math.round(1000 / settings.frameRate))),
	);
	view.setUint16(22, 1000);
	data[24] = 0;
	data[25] = 0;
	appendPngChunk(chunks, "fcTL", data);
};

const appendFrameImageData = (
	chunks: Uint8Array[],
	data: Uint8Array,
	isFirstFrame: boolean,
	sequence: number,
) => {
	const maxChunkDataSize = 64 * 1024;
	for (let offset = 0; offset < data.length; offset += maxChunkDataSize) {
		const part = data.subarray(offset, offset + maxChunkDataSize);
		if (isFirstFrame) {
			appendPngChunk(chunks, "IDAT", part);
		} else {
			appendPngChunk(chunks, "fdAT", appendSequenceNumber(part, sequence++));
		}
	}
	return sequence;
};

const encodeApng: ProjectExporter["encode"] = async (settings, frames) => {
	const chunks: Uint8Array[] = [
		new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
	];
	appendPngChunk(
		chunks,
		"IHDR",
		createRgbaHeader(settings.width, settings.height),
	);

	const frameCount = settings.endFrame - settings.startFrame + 1;
	const animationControl = new Uint8Array(8);
	const animationControlView = new DataView(animationControl.buffer);
	animationControlView.setUint32(0, frameCount);
	animationControlView.setUint32(4, 0);
	appendPngChunk(chunks, "acTL", animationControl);

	let sequence = 0;
	let isFirstFrame = true;
	for await (const { pixels } of frames) {
		appendFrameControl(chunks, sequence++, settings);
		sequence = appendFrameImageData(
			chunks,
			compressFrame(pixels, settings.width, settings.height),
			isFirstFrame,
			sequence,
		);
		isFirstFrame = false;
	}

	appendPngChunk(chunks, "IEND", new Uint8Array());
	return new Blob(chunks.map(toArrayBuffer), { type: "image/apng" });
};

const encodeGif: ProjectExporter["encode"] = async (settings, frames) => {
	const { applyPalette, GIFEncoder, quantize } = gifenc;
	const encoder = GIFEncoder();
	for await (const { pixels } of frames) {
		let hasTransparency = false;
		for (let index = 3; index < pixels.length; index += 4) {
			if (pixels[index] < 128) {
				hasTransparency = true;
				break;
			}
		}
		const palette = quantize(pixels, 256, {
			format: "rgba4444",
			oneBitAlpha: true,
		});
		let transparentIndex = palette.findIndex((color) => color[3] === 0);
		if (hasTransparency && transparentIndex === -1) {
			transparentIndex =
				palette.length < 256 ? palette.length : palette.length - 1;
			palette[transparentIndex] = [0, 0, 0, 0];
		}
		encoder.writeFrame(
			applyPalette(pixels, palette, "rgba4444"),
			settings.width,
			settings.height,
			{
				palette,
				delay: Math.max(10, 1000 / settings.frameRate),
				repeat: 0,
				transparent: hasTransparency,
				transparentIndex,
			},
		);
	}
	encoder.finish();
	return new Blob([Uint8Array.from(encoder.bytes())], { type: "image/gif" });
};

const encodePngSequence: ProjectExporter["encode"] = async (
	settings,
	frames,
) => {
	const files: Record<string, Uint8Array> = {};
	const digits = String(settings.endFrame).length;
	for await (const { index, pixels } of frames) {
		const chunks: Uint8Array[] = [
			new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
		];
		appendPngChunk(
			chunks,
			"IHDR",
			createRgbaHeader(settings.width, settings.height),
		);
		appendPngChunk(
			chunks,
			"IDAT",
			compressFrame(pixels, settings.width, settings.height),
		);
		appendPngChunk(chunks, "IEND", new Uint8Array());
		files[`frame-${String(index).padStart(digits, "0")}.png`] = new Uint8Array(
			await new Blob(chunks.map(toArrayBuffer)).arrayBuffer(),
		);
	}
	return new Blob([zipSync(files)], { type: "application/zip" });
};

export const projectExporters = [
	{
		format: "gif",
		extension: "gif",
		labelKey: "dialog.projectExport.gif",
		encode: encodeGif,
	},
	{
		format: "apng",
		extension: "apng",
		labelKey: "dialog.projectExport.apng",
		encode: encodeApng,
	},
	{
		format: "png-sequence",
		extension: "zip",
		labelKey: "dialog.projectExport.pngSequence",
		encode: encodePngSequence,
	},
] satisfies ProjectExporter[];

export const isProjectExportFormat = (
	value: string,
): value is ProjectExporter["format"] =>
	projectExporters.some((item) => item.format === value);

export const getProjectExporter = (format: ProjectExporter["format"]) => {
	const exporter = projectExporters.find((item) => item.format === format);
	if (exporter == null) {
		throw new Error(`Unsupported project export format: ${format}`);
	}
	return exporter;
};
