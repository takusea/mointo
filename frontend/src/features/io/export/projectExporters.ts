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

const encodeMp4: ProjectExporter["encode"] = async (
	settings,
	frames,
	exportContext,
) => {
	if (
		typeof MediaRecorder === "undefined" ||
		typeof HTMLCanvasElement.prototype.captureStream !== "function"
	) {
		throw new Error("MP4 export is not supported by this browser.");
	}

	const mimeType = [
		"video/mp4;codecs=avc1,mp4a.40.2",
		"video/mp4;codecs=avc1",
		"video/mp4",
	].find((type) => MediaRecorder.isTypeSupported(type));
	if (mimeType == null) {
		throw new Error("This browser does not support MP4 recording.");
	}

	const canvas = document.createElement("canvas");
	canvas.width = settings.width;
	canvas.height = settings.height;
	const canvasContext = canvas.getContext("2d");
	if (canvasContext == null) {
		throw new Error("Could not create an MP4 output canvas.");
	}

	const canvasStream = canvas.captureStream(settings.frameRate);
	let audioContext: AudioContext | undefined;
	let audioDestination: MediaStreamAudioDestinationNode | undefined;
	const mixedTracks = [...canvasStream.getVideoTracks()];
	const pendingAudioSources: Array<{
		source: AudioBufferSourceNode;
		destinationStart: number;
		sourceOffset: number;
		duration: number;
	}> = [];

	if (exportContext != null && exportContext.audioTracks.length > 0) {
		const AudioContextConstructor =
			window.AudioContext ??
			(
				window as typeof window & {
					webkitAudioContext?: typeof AudioContext;
				}
			).webkitAudioContext;
		if (AudioContextConstructor == null) {
			throw new Error("MP4 audio export is not supported by this browser.");
		}
		audioContext = new AudioContextConstructor();
		await audioContext.resume();
		audioDestination = audioContext.createMediaStreamDestination();

		for (const track of exportContext.audioTracks) {
			if (track.hidden || !track.layerVisible) continue;
			const clipEnd = track.start + track.duration;
			if (
				clipEnd <= settings.startFrame ||
				track.start >= settings.endFrame + 1
			)
				continue;

			const data = await exportContext.getAudioClipData(track.id);
			if (data == null) {
				throw new Error(`Audio data is missing for clip ${track.id}.`);
			}
			const dataBuffer = new ArrayBuffer(data.byteLength);
			new Uint8Array(dataBuffer).set(data);
			const audioBuffer = await audioContext.decodeAudioData(dataBuffer);

			const timelineStartFrame = Math.max(track.start, settings.startFrame);
			const timelineEndFrame = Math.min(clipEnd, settings.endFrame + 1);
			const destinationStart =
				(timelineStartFrame - settings.startFrame) / settings.frameRate;
			const duration =
				(timelineEndFrame - timelineStartFrame) / settings.frameRate;
			const sourceOffset =
				(track.audioStartFrame + timelineStartFrame - track.start) /
				settings.frameRate;

			if (duration <= 0 || sourceOffset >= audioBuffer.duration) continue;
			const source = audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(audioDestination);
			pendingAudioSources.push({
				source,
				destinationStart,
				sourceOffset,
				duration: Math.min(duration, audioBuffer.duration - sourceOffset),
			});
		}
		mixedTracks.push(...audioDestination.stream.getAudioTracks());
	}

	const stream = new MediaStream(mixedTracks);
	const chunks: BlobPart[] = [];
	const recorder = new MediaRecorder(stream, {
		mimeType,
		videoBitsPerSecond: Math.max(
			1_000_000,
			settings.width * settings.height * 4,
		),
	});
	const stopped = new Promise<void>((resolve, reject) => {
		recorder.addEventListener("dataavailable", (event) => {
			if (event.data.size > 0) {
				chunks.push(event.data);
			}
		});
		recorder.addEventListener("stop", () => resolve(), { once: true });
		recorder.addEventListener(
			"error",
			() => {
				reject(new Error("MP4 recording failed."));
			},
			{ once: true },
		);
	});

	recorder.start();
	const frameDuration = 1000 / settings.frameRate;
	const track = stream.getVideoTracks()[0] as MediaStreamTrack & {
		requestFrame?: () => void;
	};
	const audioStartDelay = 50;
	const audioTimelineStart =
		audioContext == null
			? 0
			: audioContext.currentTime + audioStartDelay / 1000;
	for (const pending of pendingAudioSources) {
		pending.source.start(
			audioTimelineStart + pending.destinationStart,
			pending.sourceOffset,
			pending.duration,
		);
	}
	const recordingStart = performance.now();
	const visualTimelineStart = recordingStart + audioStartDelay;
	try {
		for await (const { index, pixels } of frames) {
			const relativeFrame = index - settings.startFrame;
			const deadline = visualTimelineStart + relativeFrame * frameDuration;
			const waitForFrame = deadline - performance.now();
			if (waitForFrame > 0) {
				await new Promise((resolve) =>
					window.setTimeout(resolve, waitForFrame),
				);
			}
			const rgba = new Uint8ClampedArray(pixels.length);
			rgba.set(pixels);
			canvasContext.putImageData(
				new ImageData(rgba, settings.width, settings.height),
				0,
				0,
			);
			track.requestFrame?.();
		}
		const recordingEnd =
			visualTimelineStart +
			(settings.endFrame - settings.startFrame + 1) * frameDuration;
		const remaining = recordingEnd - performance.now();
		if (remaining > 0) {
			await new Promise((resolve) => window.setTimeout(resolve, remaining));
		}
		recorder.stop();
		await stopped;
	} finally {
		if (recorder.state !== "inactive") {
			recorder.stop();
		}
		stream.getTracks().forEach((track) => {
			track.stop();
		});
		if (audioContext != null) {
			void audioContext.close();
		}
	}

	return new Blob(chunks, { type: mimeType.split(";")[0] });
};

export const projectExporters = [
	{
		format: "gif",
		extension: "gif",
		mimeType: "image/gif",
		labelKey: "dialog.projectExport.gif",
		encode: encodeGif,
	},
	{
		format: "apng",
		extension: "apng",
		mimeType: "image/apng",
		labelKey: "dialog.projectExport.apng",
		encode: encodeApng,
	},
	{
		format: "png-sequence",
		extension: "zip",
		mimeType: "application/zip",
		labelKey: "dialog.projectExport.pngSequence",
		encode: encodePngSequence,
	},
	{
		format: "mp4",
		extension: "mp4",
		mimeType: "video/mp4",
		labelKey: "dialog.projectExport.mp4",
		encode: encodeMp4,
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
