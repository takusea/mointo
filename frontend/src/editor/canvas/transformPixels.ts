export type PixelBounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type PixelTransform = {
	x: number;
	y: number;
	scaleX: number;
	scaleY: number;
	rotation: number;
};

export const getTransformedBounds = (
	bounds: PixelBounds,
	matrix: PixelTransform,
): PixelBounds => {
	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;
	const cos = Math.cos(matrix.rotation);
	const sin = Math.sin(matrix.rotation);
	const points = [
		[bounds.x, bounds.y],
		[bounds.x + bounds.width, bounds.y],
		[bounds.x + bounds.width, bounds.y + bounds.height],
		[bounds.x, bounds.y + bounds.height],
	].map(([x, y]) => {
		const scaledX = (x - centerX) * matrix.scaleX;
		const scaledY = (y - centerY) * matrix.scaleY;
		return {
			x: centerX + matrix.x + scaledX * cos - scaledY * sin,
			y: centerY + matrix.y + scaledX * sin + scaledY * cos,
		};
	});
	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	const left = Math.min(...xs);
	const top = Math.min(...ys);
	return {
		x: left,
		y: top,
		width: Math.max(...xs) - left,
		height: Math.max(...ys) - top,
	};
};

export const getTransformFrameBounds = (
	bounds: PixelBounds,
	matrix: PixelTransform,
): PixelBounds => {
	const centerX = bounds.x + bounds.width / 2 + matrix.x;
	const centerY = bounds.y + bounds.height / 2 + matrix.y;
	const width = bounds.width * Math.abs(matrix.scaleX);
	const height = bounds.height * Math.abs(matrix.scaleY);
	return {
		x: centerX - width / 2,
		y: centerY - height / 2,
		width,
		height,
	};
};

export const transformPixels = (
	pixels: Uint8ClampedArray,
	width: number,
	height: number,
	bounds: PixelBounds,
	matrix: {
		x: number;
		y: number;
		scaleX: number;
		scaleY: number;
		rotation: number;
	},
	selectionMask?: Uint8Array,
) => {
	const source = document.createElement("canvas");
	source.width = width;
	source.height = height;
	const sourceContext = source.getContext("2d", { willReadFrequently: true });
	if (sourceContext == null) return pixels;
	sourceContext.putImageData(
		new ImageData(new Uint8ClampedArray(pixels), width, height),
		0,
		0,
	);
	const result = sourceContext.getImageData(0, 0, width, height);
	const left = Math.max(0, Math.floor(bounds.x));
	const top = Math.max(0, Math.floor(bounds.y));
	const right = Math.min(width, Math.ceil(bounds.x + bounds.width));
	const bottom = Math.min(height, Math.ceil(bounds.y + bounds.height));
	if (selectionMask == null) {
		for (let y = top; y < bottom; y++) result.data.fill(0, (y * width + left) * 4, (y * width + right) * 4);
	} else {
		for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (selectionMask[y * width + x]) result.data.fill(0, (y * width + x) * 4, (y * width + x + 1) * 4);
		const sourceImage = sourceContext.getImageData(0, 0, width, height);
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (!selectionMask[y * width + x]) sourceImage.data.fill(0, (y * width + x) * 4, (y * width + x + 1) * 4);
		sourceContext.putImageData(sourceImage, 0, 0);
	}
	const transformed = document.createElement("canvas");
	transformed.width = width;
	transformed.height = height;
	const context = transformed.getContext("2d");
	if (context == null) return result.data;
	// Keep all pixels outside the transformed bounds intact.
	context.putImageData(result, 0, 0);
	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;
	context.translate(centerX + matrix.x, centerY + matrix.y);
	context.rotate(matrix.rotation);
	context.scale(matrix.scaleX, matrix.scaleY);
	context.imageSmoothingEnabled = false;
	context.drawImage(
		source,
		bounds.x,
		bounds.y,
		bounds.width,
		bounds.height,
		-bounds.width / 2,
		-bounds.height / 2,
		bounds.width,
		bounds.height,
	);
	return context.getImageData(0, 0, width, height).data;
};

export const transformSelectionMask = (
	mask: Uint8Array,
	width: number,
	height: number,
	bounds: PixelBounds,
	matrix: PixelTransform,
) => {
	const transformed = new Uint8Array(width * height);
	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;
	const cos = Math.cos(matrix.rotation), sin = Math.sin(matrix.rotation);
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (mask[y * width + x]) {
		const dx = (x + 0.5 - centerX) * matrix.scaleX;
		const dy = (y + 0.5 - centerY) * matrix.scaleY;
		const tx = Math.floor(centerX + matrix.x + dx * cos - dy * sin);
		const ty = Math.floor(centerY + matrix.y + dx * sin + dy * cos);
		if (tx >= 0 && ty >= 0 && tx < width && ty < height) transformed[ty * width + tx] = 1;
	}
	return transformed;
};
