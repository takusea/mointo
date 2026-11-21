import { use, useCallback } from "react";
import { CanvasViewContext } from "./CanvasViewContext";

const SCALE_MINIMUM = 0.0625;
const SCALE_MAXIMUM = 32;
const ZOOM_DELTA = 1.25;
const ROTATE_DELTA = 5;

export const useCanvasView = () => {
	const context = use(CanvasViewContext);

	if (context == null) {
		throw new Error("useCanvasView must be used within CanvasViewProvider.");
	}

	const translate = (movementX: number, movementY: number) => {
		context.setPosition((prev) => {
			return {
				x: prev.x + movementX,
				y: prev.y + movementY,
			};
		});
	};

	const zoom = (step: number) => {
		const scale = ZOOM_DELTA ** step;
		context.setScale((prev) =>
			Math.min(Math.max(SCALE_MINIMUM, prev * scale), SCALE_MAXIMUM),
		);
	};

	const zoomAt = (step: number, offsetX: number, offsetY: number) => {
		const zoomFactor = ZOOM_DELTA ** step;
		const nextScale = Math.min(
			Math.max(SCALE_MINIMUM, context.scale * zoomFactor),
			SCALE_MAXIMUM,
		);
		const scaleRatio = nextScale / context.scale;

		context.setScale(nextScale);
		context.setPosition((prev) => ({
			x: prev.x + offsetX * (1 - scaleRatio),
			y: prev.y + offsetY * (1 - scaleRatio),
		}));
	};

	const rotate = (step: number) => {
		context.setRotation((prev) => prev + ROTATE_DELTA * step);
	};

	const applyTransform = (
		x: number,
		y: number,
		centerX: number,
		centerY: number,
	) => {
		const cx = x - centerX;
		const cy = y - centerY;

		const rad = (-context.rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);

		const rx = cx * cos - cy * sin;
		const ry = cx * sin + cy * cos;
		const scaleX = context.scale * (context.isFlippedHorizontal ? -1 : 1);
		const scaleY = context.scale * (context.isFlippedVertical ? -1 : 1);

		return {
			x: rx / scaleX + centerX - context.position.x,
			y: ry / scaleY + centerY - context.position.y,
		};
	};

	const applyGesture = (
		scaleRatio: number,
		rotationDelta: number,
		previousCenter: { x: number; y: number },
		nextCenter: { x: number; y: number },
		canvasCenter: { x: number; y: number },
	) => {
		const currentScale = context.scale;
		const nextScale = Math.min(
			Math.max(SCALE_MINIMUM, currentScale * scaleRatio),
			SCALE_MAXIMUM,
		);
		const effectiveRatio = nextScale / currentScale;
		const angle = (rotationDelta * Math.PI) / 180;
		const dx = previousCenter.x - canvasCenter.x;
		const dy = previousCenter.y - canvasCenter.y;
		const transformedX =
			(dx * Math.cos(angle) - dy * Math.sin(angle)) * effectiveRatio;
		const transformedY =
			(dx * Math.sin(angle) + dy * Math.cos(angle)) * effectiveRatio;
		context.setPosition((prev) => ({
			x: prev.x + nextCenter.x - previousCenter.x + dx - transformedX,
			y: prev.y + nextCenter.y - previousCenter.y + dy - transformedY,
		}));
		context.setScale(nextScale);
		context.setRotation((prev) => prev + rotationDelta);
	};

	const fitToView = useCallback((
		contentWidth: number,
		contentHeight: number,
		viewportWidth: number,
		viewportHeight: number,
	) => {
		if (
			contentWidth <= 0 ||
			contentHeight <= 0 ||
			viewportWidth <= 0 ||
			viewportHeight <= 0
		) {
			throw new Error("Canvas and viewport dimensions must be positive.");
		}

		const padding = 0.9;
		const fitScale = Math.min(
			(viewportWidth * padding) / contentWidth,
			(viewportHeight * padding) / contentHeight,
		);
		context.setScale(
			Math.min(Math.max(SCALE_MINIMUM, fitScale), SCALE_MAXIMUM),
		);
		context.setPosition({
			x: (viewportWidth - contentWidth) / 2,
			y: (viewportHeight - contentHeight) / 2,
		});
	}, [context.setPosition, context.setScale]);

	return {
		...context,
		translate,
		zoom,
		zoomAt,
		rotate,
		applyTransform,
		applyGesture,
		fitToView,
		maxScale: SCALE_MAXIMUM,
		minScale: SCALE_MINIMUM,
	};
};
