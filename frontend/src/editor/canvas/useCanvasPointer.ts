import { useEffect, useRef, useState } from "react";
import { useCore } from "~/core/useCore";
import { useClip } from "~/features/clip/useClip";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { applyPressureCurve } from "~/features/tool/pressureCurve";
import { useTool } from "~/features/tool/useTool";
import { hasSameRgbColor, rgbaToHsva } from "~/lib/color";
import {
	getTransformedBounds,
	getTransformFrameBounds,
	type PixelBounds,
	type PixelTransform,
	transformPixels,
	transformSelectionMask,
} from "./transformPixels";
import { useCanvasDraw } from "./useCanvasDraw";
import { useCanvasSelection } from "./useCanvasSelection";
import type { useCanvasView } from "./useCanvasView";

type CanvasView = ReturnType<typeof useCanvasView>;
type TransformDragMode = "move" | "rotate" | "scale" | "scale-x" | "scale-y";

export const useCanvasPointer = (
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	canvasView: CanvasView,
	isOnionSkin: boolean,
	render: (
		canvas: HTMLCanvasElement,
		isOnionSkin: boolean,
		layerId: string | null,
	) => void,
) => {
	const core = useCore();
	const playbackContext = usePlayback();
	const clipContext = useClip();
	const layerContext = useLayer();
	const toolContext = useTool();
	const canvasDraw = useCanvasDraw(playbackContext.currentFrame);
	const touchPointerIdsRef = useRef(new Set<number>());
	const isMultiTouchRef = useRef(false);
	const isApplyingTransformRef = useRef(false);
	const [transformCursor, setTransformCursor] = useState<string>("move");
	const [transformSession, setTransformSession] = useState<{
		clipId: string;
		original: Uint8ClampedArray;
		preview: Uint8ClampedArray;
		bounds: PixelBounds;
		displayBounds: PixelBounds;
		frameBounds: PixelBounds;
		selectionMask?: Uint8Array;
		hadSelection: boolean;
		matrix: PixelTransform;
	} | null>(null);
	const moveDragRef = useRef<{
		startX: number;
		startY: number;
		centerX: number;
		centerY: number;
		startAngle: number;
		startDistance: number;
		bounds: PixelBounds;
		mode: TransformDragMode;
		cursor: string;
		baseMatrix: PixelTransform;
	} | null>(null);
	const applyTransformSessionRef = useRef<
		(session: NonNullable<typeof transformSession>) => Promise<void>
	>(async () => {});

	const getPointerPosition = (x: number, y: number) => {
		const canvas = canvasRef.current;
		if (canvas == null) {
			throw new Error("canvas is null");
		}

		if (canvas.parentElement == null) {
			throw new Error("canvas.parentElement is null");
		}

		const parentRect = canvas.parentElement.getBoundingClientRect();
		const rect = canvas.getBoundingClientRect();
		const transformed = canvasView.applyTransform(
			x,
			y,
			rect.left + rect.width / 2,
			rect.top + rect.height / 2,
		);

		return {
			x: transformed.x - parentRect.left,
			y: transformed.y - parentRect.top,
		};
	};

	const selection = useCanvasSelection(canvasRef, getPointerPosition);
	const fillTargetColorRef = useRef<Uint8Array | null>(null);
	const fillReferencePixelsRef = useRef<Uint8ClampedArray | undefined>(
		undefined,
	);
	const brushResizeRef = useRef<{ y: number; size: number } | null>(null);

	const sampleReferencePixel = (
		referencePixels: Uint8ClampedArray | Uint8Array | undefined,
		x: number,
		y: number,
		width: number,
		height: number,
	) => {
		if (referencePixels == null) return null;
		const pixelX = Math.floor(x);
		const pixelY = Math.floor(y);
		if (pixelX < 0 || pixelY < 0 || pixelX >= width || pixelY >= height)
			return null;
		const pixelIndex = (pixelY * width + pixelX) * 4;
		if (pixelIndex + 4 > referencePixels.length) return null;
		return new Uint8Array(referencePixels.slice(pixelIndex, pixelIndex + 4));
	};

	const pickColor = async (
		clientX: number,
		clientY: number,
		shiftKey = false,
	) => {
		const canvas = canvasRef.current;
		if (canvas == null) return;
		const { x, y } = getPointerPosition(clientX, clientY);
		const pixelX = Math.floor(x);
		const pixelY = Math.floor(y);
		if (
			pixelX < 0 ||
			pixelY < 0 ||
			pixelX >= canvas.width ||
			pixelY >= canvas.height
		)
			return;
		const image =
			toolContext.referenceOtherLayers.eyedropper || shiftKey
				? await playbackContext.renderFrame(playbackContext.currentFrame)
				: layerContext.selectedLayerId == null
					? undefined
					: await playbackContext.renderLayerFrame(
							playbackContext.currentFrame,
							layerContext.selectedLayerId,
						);
		if (image == null) return;
		const pixelIndex = (pixelY * canvas.width + pixelX) * 4;
		const data = image.subarray(pixelIndex, pixelIndex + 4);
		toolContext.setColor(
			rgbaToHsva({ r: data[0], g: data[1], b: data[2], a: 255 }),
		);
	};

	const getPointerPressure = (
		event: Pick<PointerEvent, "pointerType" | "pressure">,
	) => {
		if (
			!toolContext.pressureEnabled ||
			event.pointerType === "mouse" ||
			event.pressure <= 0
		)
			return 1;
		return applyPressureCurve(toolContext.pressureCurve, event.pressure);
	};

	const getTransformHit = (
		x: number,
		y: number,
		bounds: PixelBounds,
		baseMatrix: PixelTransform,
	) => {
		const tolerance = 8 / Math.max(canvasView.scale, 0.1);
		const centerX = bounds.x + bounds.width / 2;
		const centerY = bounds.y + bounds.height / 2;
		const cos = Math.cos(baseMatrix.rotation);
		const sin = Math.sin(baseMatrix.rotation);
		const deltaX = x - centerX;
		const deltaY = y - centerY;
		const localX = centerX + deltaX * cos + deltaY * sin;
		const localY = centerY - deltaX * sin + deltaY * cos;
		const onBounds =
			localX >= bounds.x - tolerance &&
			localX <= bounds.x + bounds.width + tolerance &&
			localY >= bounds.y - tolerance &&
			localY <= bounds.y + bounds.height + tolerance;
		const horizontalEdge =
			Math.abs(localX - bounds.x) <= tolerance ||
			Math.abs(localX - bounds.x - bounds.width) <= tolerance;
		const verticalEdge =
			Math.abs(localY - bounds.y) <= tolerance ||
			Math.abs(localY - bounds.y - bounds.height) <= tolerance;
		const edge = onBounds && (horizontalEdge || verticalEdge);
		const mode: TransformDragMode = !onBounds
			? "rotate"
			: !edge
				? "move"
				: horizontalEdge && !verticalEdge
					? "scale-x"
					: verticalEdge && !horizontalEdge
						? "scale-y"
						: "scale";
		let cursor = "move";
		if (mode === "rotate") {
			cursor = "crosshair";
		} else if (mode === "scale-x") {
			cursor = Math.abs(cos) >= Math.abs(sin) ? "ew-resize" : "ns-resize";
		} else if (mode === "scale-y") {
			cursor = Math.abs(sin) >= Math.abs(cos) ? "ew-resize" : "ns-resize";
		} else if (mode === "scale") {
			const left = Math.abs(localX - bounds.x) <= tolerance;
			const top = Math.abs(localY - bounds.y) <= tolerance;
			const sx = left ? -1 : 1;
			const sy = top ? -1 : 1;
			const diagonalX = sx * cos - sy * sin;
			const diagonalY = sx * sin + sy * cos;
			cursor = diagonalX * diagonalY >= 0 ? "nwse-resize" : "nesw-resize";
		}
		return { mode, cursor, centerX, centerY };
	};

	const beginTransformDrag = (
		event: React.PointerEvent<HTMLElement>,
		x: number,
		y: number,
		bounds: PixelBounds,
		baseMatrix: PixelTransform,
	) => {
		const { mode, cursor, centerX, centerY } = getTransformHit(
			x,
			y,
			bounds,
			baseMatrix,
		);
		setTransformCursor(cursor);
		moveDragRef.current = {
			startX: x,
			startY: y,
			centerX,
			centerY,
			startAngle: Math.atan2(y - centerY, x - centerX),
			startDistance: Math.max(1, Math.hypot(x - centerX, y - centerY)),
			bounds,
			mode,
			cursor,
			baseMatrix,
		};
		canvasRef.current?.setPointerCapture(event.pointerId);
	};

	const handleTransformOutsidePointerDown = async (
		event: React.PointerEvent<HTMLDivElement>,
	) => {
		if (
			playbackContext.isPlaying ||
			event.target !== event.currentTarget ||
			toolContext.tool !== "move" ||
			!(event.buttons & 1) ||
			event.shiftKey ||
			clipContext.selectedClipId == null
		)
			return;
		const { x, y } = getPointerPosition(event.clientX, event.clientY);
		if (transformSession != null) {
			beginTransformDrag(
				event,
				x,
				y,
				transformSession.frameBounds,
				transformSession.matrix,
			);
			return;
		}
		const clipId = clipContext.selectedClipId;
		const targetClip = clipContext.clips.find((clip) => clip.id === clipId);
		if (
			targetClip == null ||
			targetClip.clip_type !== "image" ||
			targetClip.locked ||
			layerContext.isLayerLocked(targetClip.layer_id)
		)
			return;
		const canvas = canvasRef.current;
		if (canvas == null) return;
		canvas.setPointerCapture(event.pointerId);
		const pixels = await core.getClipPixels(clipId);
		if (pixels == null || pixels.length !== canvas.width * canvas.height * 4)
			return;
		const bounds = clipContext.selection ?? {
			x: 0,
			y: 0,
			width: canvas.width,
			height: canvas.height,
		};
		const matrix: PixelTransform = {
			x: 0,
			y: 0,
			scaleX: 1,
			scaleY: 1,
			rotation: 0,
		};
		setTransformSession({
			clipId,
			original: new Uint8ClampedArray(pixels),
			preview: new Uint8ClampedArray(pixels),
			bounds,
			displayBounds: bounds,
			frameBounds: bounds,
			hadSelection: clipContext.selection != null,
			selectionMask: clipContext.selection?.mask,
			matrix,
		});
		beginTransformDrag(event, x, y, bounds, matrix);
	};

	const handlePointerDown = async (
		event: React.PointerEvent<HTMLCanvasElement>,
	) => {
		if (playbackContext.isPlaying) return;
		if (event.pointerType === "touch") {
			touchPointerIdsRef.current.add(event.pointerId);
			if (touchPointerIdsRef.current.size >= 2) {
				isMultiTouchRef.current = true;
				if (canvasDraw.drawState.isDrawing) {
					canvasDraw.finishDraw();
					await core.cancelDraw();
					const canvas = canvasRef.current;
					if (canvas != null) {
						render(canvas, isOnionSkin, layerContext.selectedLayerId);
					}
				}
				return;
			}
			if (canvasDraw.drawState.isDrawing) return;
		}
		if (canvasRef.current == null) return;
		const isPenEraser =
			event.pointerType === "pen" &&
			(event.button === 5 || (event.buttons & 32) !== 0);
		if (!(event.buttons & 1) && !isPenEraser) return;
		const sizeProperty = toolContext.properties.find(
			(property) => property.name === "size",
		);
		if (
			event.shiftKey &&
			!isPenEraser &&
			(toolContext.tool === "pen" || toolContext.tool === "eraser") &&
			sizeProperty != null &&
			typeof sizeProperty.value === "number"
		) {
			brushResizeRef.current = { y: event.clientY, size: sizeProperty.value };
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		if (
			event.ctrlKey &&
			!isPenEraser &&
			!canvasDraw.drawState.isDrawing
		) {
			event.currentTarget.setPointerCapture(event.pointerId);
			await pickColor(event.clientX, event.clientY, event.shiftKey);
			return;
		}
		if (!isPenEraser && toolContext.tool === "eyedropper") {
			event.currentTarget.setPointerCapture(event.pointerId);
			await pickColor(event.clientX, event.clientY, event.shiftKey);
			return;
		}

		if (!isPenEraser && toolContext.tool === "select") {
			selection.beginSelection(event, "rectangle");
			return;
		}

		if (!isPenEraser && toolContext.tool === "lasso") {
			selection.beginSelection(event, "lasso");
			return;
		}
		if (!isPenEraser && toolContext.tool === "wand") {
			await selection.selectSimilar(event.clientX, event.clientY, event);
			return;
		}

		if (!isPenEraser && toolContext.tool === "move") {
			if (clipContext.selectedClipId == null) {
				return;
			}
			const { x, y } = getPointerPosition(event.clientX, event.clientY);
			if (transformSession != null) {
				beginTransformDrag(
					event,
					x,
					y,
					transformSession.frameBounds,
					transformSession.matrix,
				);
				return;
			}
			const clipId = clipContext.selectedClipId;
			const targetClip = clipContext.clips.find((clip) => clip.id === clipId);
			if (
				targetClip == null ||
				targetClip.clip_type !== "image" ||
				targetClip.locked ||
				layerContext.isLayerLocked(targetClip.layer_id)
			)
				return;
			event.currentTarget.setPointerCapture(event.pointerId);
			const pixels = await core.getClipPixels(clipId);
			const canvas = canvasRef.current;
			if (
				pixels == null ||
				canvas == null ||
				pixels.length !== canvas.width * canvas.height * 4
			)
				return;
			const bounds = clipContext.selection ?? {
				x: 0,
				y: 0,
				width: canvas.width,
				height: canvas.height,
			};
			const matrix = {
				x: 0,
				y: 0,
				scaleX: 1,
				scaleY: 1,
				rotation: 0,
			};
			setTransformSession({
				clipId,
				original: new Uint8ClampedArray(pixels),
				preview: new Uint8ClampedArray(pixels),
				bounds,
				displayBounds: bounds,
				frameBounds: bounds,
				hadSelection: clipContext.selection != null,
				selectionMask: clipContext.selection?.mask,
				matrix,
			});
			beginTransformDrag(event, x, y, bounds, matrix);
			return;
		}

		const latestColor = toolContext.colorHistory[0];
		if (
			latestColor == null ||
			!hasSameRgbColor(toolContext.color, latestColor)
		) {
			toolContext.pushColorHistory(toolContext.color);
		}

		const clipId = await clipContext.ensureClipAt(
			playbackContext.currentFrame,
			layerContext.selectedLayerId,
		);
		if (clipId == null) return;
		if (event.pointerType === "touch" && isMultiTouchRef.current) return;
		await core.beginDraw(clipId);
		if (event.pointerType === "touch" && isMultiTouchRef.current) {
			void core.endDraw();
			return;
		}

		const { x, y } = getPointerPosition(event.clientX, event.clientY);
		const drawState = {
			x,
			y,
			pressure: getPointerPressure(event.nativeEvent),
		};
		const canvas = canvasRef.current;
		canvasDraw.beginDraw(
			drawState,
			clipId,
			isPenEraser ? "eraser" : toolContext.tool,
		);
		if (!isPenEraser && toolContext.tool === "fill" && canvas != null) {
			const referencePixels = toolContext.referenceOtherLayers.fill
				? await playbackContext.renderFrame(playbackContext.currentFrame)
				: layerContext.selectedLayerId == null
					? undefined
					: await playbackContext.renderLayerFrame(
							playbackContext.currentFrame,
							layerContext.selectedLayerId,
						);
			fillReferencePixelsRef.current = referencePixels;
			fillTargetColorRef.current = sampleReferencePixel(
				referencePixels,
				x,
				y,
				canvas.width,
				canvas.height,
			);
			canvasDraw.draw(drawState, referencePixels);
		}
		render(canvasRef.current, isOnionSkin, layerContext.selectedLayerId);
	};

	const handlePointerMove = async (
		event: React.PointerEvent<HTMLCanvasElement>,
	) => {
		if (playbackContext.isPlaying) return;
		if (
			event.pointerType === "touch" &&
			(isMultiTouchRef.current || touchPointerIdsRef.current.size >= 2)
		) {
			return;
		}
		const canvas = canvasRef.current;
		if (canvas == null) return;
		const isPenEraser =
			event.pointerType === "pen" && (event.buttons & 32) !== 0;
		if (selection.moveSelection(event)) return;
		if (
			event.ctrlKey &&
			(event.buttons & 1) !== 0 &&
			!canvasDraw.drawState.isDrawing
		) {
			await pickColor(event.clientX, event.clientY, event.shiftKey);
			return;
		}
		if (brushResizeRef.current != null && event.buttons & 1) {
			const { y, size } = brushResizeRef.current;
			toolContext.setProperty(
				"size",
				Math.max(1, Math.min(100, size + (y - event.clientY) * 0.25)),
			);
			return;
		}
		if (event.buttons & 2) {
			await pickColor(event.clientX, event.clientY, event.shiftKey);
			return;
		}
		if (toolContext.tool === "eyedropper") {
			if (event.buttons & 1)
				await pickColor(event.clientX, event.clientY, event.shiftKey);
			return;
		}
		if (toolContext.tool === "move" && moveDragRef.current == null) {
			const { x, y } = getPointerPosition(event.clientX, event.clientY);
			const bounds = transformSession?.frameBounds ??
				clipContext.selection ?? {
					x: 0,
					y: 0,
					width: canvas.width,
					height: canvas.height,
				};
			const matrix = transformSession?.matrix ?? {
				x: 0,
				y: 0,
				scaleX: 1,
				scaleY: 1,
				rotation: 0,
			};
			setTransformCursor(getTransformHit(x, y, bounds, matrix).cursor);
			return;
		}

		if (
			toolContext.tool === "move" &&
			moveDragRef.current != null &&
			transformSession != null
		) {
			if (!(event.buttons & 1)) return;
			const { x, y } = getPointerPosition(event.clientX, event.clientY);
			const drag = moveDragRef.current;
			setTransformCursor(drag.cursor);
			const matrix = { ...drag.baseMatrix };
			if (drag.mode === "move") {
				let dx = x - drag.startX;
				let dy = y - drag.startY;
				if (event.shiftKey) {
					if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
					else dx = 0;
				}
				matrix.x += dx;
				matrix.y += dy;
			} else if (drag.mode === "rotate") {
				matrix.rotation +=
					Math.atan2(y - drag.centerY, x - drag.centerX) - drag.startAngle;
			} else if (drag.mode === "scale-x") {
				const cos = Math.cos(drag.baseMatrix.rotation);
				const sin = Math.sin(drag.baseMatrix.rotation);
				const deltaX = x - drag.centerX;
				const deltaY = y - drag.centerY;
				const localX = deltaX * cos + deltaY * sin;
				const startLocalX =
					(drag.startX - drag.centerX) * cos +
					(drag.startY - drag.centerY) * sin;
				matrix.scaleX *= Math.max(0.05, localX / (startLocalX || 1));
			} else if (drag.mode === "scale-y") {
				const cos = Math.cos(drag.baseMatrix.rotation);
				const sin = Math.sin(drag.baseMatrix.rotation);
				const deltaX = x - drag.centerX;
				const deltaY = y - drag.centerY;
				const localY = -deltaX * sin + deltaY * cos;
				const startLocalY =
					-(drag.startX - drag.centerX) * sin +
					(drag.startY - drag.centerY) * cos;
				matrix.scaleY *= Math.max(0.05, localY / (startLocalY || 1));
			} else {
				const factor = Math.max(
					0.05,
					Math.hypot(x - drag.centerX, y - drag.centerY) / drag.startDistance,
				);
				matrix.scaleX *= factor;
				matrix.scaleY *= factor;
			}
			const preview = transformPixels(
				transformSession.original,
				canvas.width,
				canvas.height,
				transformSession.bounds,
				matrix,
				transformSession.selectionMask,
			);
			setTransformSession({
				...transformSession,
				preview,
				matrix,
				displayBounds: getTransformedBounds(transformSession.bounds, matrix),
				frameBounds: getTransformFrameBounds(transformSession.bounds, matrix),
			});
			await core.previewClipPixels(transformSession.clipId, preview);
			render(canvas, isOnionSkin, layerContext.selectedLayerId);
			return;
		}

		if (
			!canvasDraw.drawState.isDrawing ||
			(!(event.buttons & 1) &&
				!(event.pointerType === "pen" && (event.buttons & 32) !== 0))
		) {
			return;
		}

		if (!isPenEraser && toolContext.tool === "fill") {
			const referencePixels = fillReferencePixelsRef.current;
			if (referencePixels == null) {
				render(canvas, isOnionSkin, layerContext.selectedLayerId);
				return;
			}
			const latestPointerEvent = event.nativeEvent.getCoalescedEvents
				? (event.nativeEvent.getCoalescedEvents().at(-1) ?? event)
				: event;
			const { x, y } = getPointerPosition(
				latestPointerEvent.clientX,
				latestPointerEvent.clientY,
			);
			const sampledColor = sampleReferencePixel(
				referencePixels,
				x,
				y,
				canvas.width,
				canvas.height,
			);
			if (
				fillTargetColorRef.current != null &&
				sampledColor != null &&
				(sampledColor[0] !== fillTargetColorRef.current[0] ||
					sampledColor[1] !== fillTargetColorRef.current[1] ||
					sampledColor[2] !== fillTargetColorRef.current[2] ||
					sampledColor[3] !== fillTargetColorRef.current[3])
			) {
				render(canvas, isOnionSkin, layerContext.selectedLayerId);
				return;
			}
			canvasDraw.draw(
				{ x, y, pressure: getPointerPressure(latestPointerEvent) },
				referencePixels,
			);
			render(canvas, isOnionSkin, layerContext.selectedLayerId);
			return;
		}

		event.currentTarget.setPointerCapture(event.pointerId);
		const drawStates = event.nativeEvent.getCoalescedEvents
			? event.nativeEvent.getCoalescedEvents().map((pointerEvent) => ({
					...getPointerPosition(pointerEvent.clientX, pointerEvent.clientY),
					pressure: getPointerPressure(pointerEvent),
				}))
			: [
					{
						...getPointerPosition(event.clientX, event.clientY),
						pressure: getPointerPressure(event),
					},
				];
		canvasDraw.drawMultiple(drawStates);
		render(canvas, isOnionSkin, layerContext.selectedLayerId);
	};

	const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (playbackContext.isPlaying) return;
		if (event.pointerType === "touch") {
			touchPointerIdsRef.current.delete(event.pointerId);
			if (touchPointerIdsRef.current.size < 2) {
				isMultiTouchRef.current = false;
			}
			if (isMultiTouchRef.current) return;
		}
		if (selection.finishSelection(event)) return;
		brushResizeRef.current = null;
		if (toolContext.tool === "eyedropper" && !canvasDraw.drawState.isDrawing)
			return;

		if (
			moveDragRef.current != null ||
			(toolContext.tool === "move" && !canvasDraw.drawState.isDrawing)
		) {
			const hadMoveDrag = moveDragRef.current != null;
			moveDragRef.current = null;
			if (!hadMoveDrag) return;
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
			return;
		}
		canvasDraw.finishDraw();
		fillTargetColorRef.current = null;
		fillReferencePixelsRef.current = undefined;
		void core.endDraw();
		if (canvasRef.current != null) {
			render(canvasRef.current, isOnionSkin, layerContext.selectedLayerId);
		}
	};

	const applyTransformSession = async (
		session: NonNullable<typeof transformSession>,
	) => {
		if (isApplyingTransformRef.current) return;
		isApplyingTransformRef.current = true;
		try {
			await core.previewClipPixels(session.clipId, session.original);
			let hasChanges = false;
			for (let index = 0; index < session.original.length; index++) {
				if (session.original[index] !== session.preview[index]) {
					hasChanges = true;
					break;
				}
			}
			if (hasChanges) {
				await core.replaceClipPixels(session.clipId, session.preview);
			}
			clipContext.setSelection(
				session.hadSelection
					? {
							...session.displayBounds,
							...(session.selectionMask == null
								? {}
								: {
										mask: transformSelectionMask(
											session.selectionMask,
											canvasRef.current?.width ?? 0,
											canvasRef.current?.height ?? 0,
											session.bounds,
											session.matrix,
										),
									}),
						}
					: undefined,
			);
			setTransformSession(null);
			if (canvasRef.current != null) {
				render(canvasRef.current, isOnionSkin, layerContext.selectedLayerId);
			}
		} finally {
			isApplyingTransformRef.current = false;
		}
	};
	applyTransformSessionRef.current = applyTransformSession;

	useEffect(() => {
		if (toolContext.tool !== "move" && transformSession != null) {
			void applyTransformSessionRef.current(transformSession);
		}
	}, [toolContext.tool, transformSession]);

	return {
		selection: selection.selection,
		transformSession,
		transformCursor,
		handleTransformOutsidePointerDown,
		applyTransform: async () => {
			if (transformSession != null)
				await applyTransformSession(transformSession);
		},
		cancelTransform: async () => {
			if (transformSession == null) return;
			await core.previewClipPixels(
				transformSession.clipId,
				transformSession.original,
			);
			setTransformSession(null);
			if (canvasRef.current != null)
				render(canvasRef.current, isOnionSkin, layerContext.selectedLayerId);
		},
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
		isBrushResizing: () => brushResizeRef.current != null,
	};
};
