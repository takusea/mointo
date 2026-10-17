import { useRef } from "react";
import { useCore } from "~/core/useCore";
import { useClip } from "~/features/clip/useClip";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { applyPressureCurve } from "~/features/tool/pressureCurve";
import { useTool } from "~/features/tool/useTool";
import { hasSameRgbColor, rgbaToHsva } from "~/lib/color";
import type { Transform } from "~/lib/transform";
import { useCanvasDraw } from "./useCanvasDraw";
import { useCanvasSelection } from "./useCanvasSelection";
import type { useCanvasView } from "./useCanvasView";

type CanvasView = ReturnType<typeof useCanvasView>;

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
	const canvasDraw = useCanvasDraw();
	const touchPointerIdsRef = useRef(new Set<number>());
	const isMultiTouchRef = useRef(false);
	const moveDragRef = useRef<{
		startX: number;
		startY: number;
		initialTransform: Transform;
	} | null>(null);

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

	const handlePointerDown = async (
		event: React.PointerEvent<HTMLCanvasElement>,
	) => {
		if (event.pointerType === "touch") {
			touchPointerIdsRef.current.add(event.pointerId);
			if (touchPointerIdsRef.current.size >= 2) {
				isMultiTouchRef.current = true;
				if (canvasDraw.drawState.isDrawing) {
					canvasDraw.finishDraw();
					void core.endDraw();
				}
				return;
			}
		}
		if (canvasRef.current == null) return;
		if (!(event.buttons & 1) || event.shiftKey) return;

		if (toolContext.tool === "select") {
			selection.beginSelection(event);
			return;
		}

		if (toolContext.tool === "move") {
			if (clipContext.selectedClipId == null || clipContext.transform == null) {
				return;
			}
			const { x, y } = getPointerPosition(event.clientX, event.clientY);
			moveDragRef.current = {
				startX: x,
				startY: y,
				initialTransform: { ...clipContext.transform },
			};
			event.currentTarget.setPointerCapture(event.pointerId);
			await core.beginActionGroup();
			return;
		}

		const latestColor = toolContext.colorHistory[0];
		if (latestColor == null || !hasSameRgbColor(toolContext.color, latestColor)) {
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
		canvasDraw.beginDraw(drawState, clipId);
		if (toolContext.tool === "fill") {
			canvasDraw.draw(drawState);
		}
		render(canvasRef.current, isOnionSkin, layerContext.selectedLayerId);
	};

	const handlePointerMove = async (
		event: React.PointerEvent<HTMLCanvasElement>,
	) => {
		if (
			event.pointerType === "touch" &&
			(isMultiTouchRef.current || touchPointerIdsRef.current.size >= 2)
		) {
			return;
		}
		const canvas = canvasRef.current;
		if (canvas == null) return;
		if (selection.moveSelection(event)) return;

		if (toolContext.tool === "move" && moveDragRef.current != null) {
			if (moveDragRef.current == null) return;
			if (clipContext.selectedClipId == null || clipContext.transform == null) {
				moveDragRef.current = null;
				return;
			}
			if (!(event.buttons & 1)) return;
			const { x, y } = getPointerPosition(event.clientX, event.clientY);
			const dx = Math.round(x - moveDragRef.current.startX);
			const dy = Math.round(y - moveDragRef.current.startY);
			clipContext.changeTransform(clipContext.selectedClipId, {
				...moveDragRef.current.initialTransform,
				position: [
					Math.round(moveDragRef.current.initialTransform.position[0] + dx),
					Math.round(moveDragRef.current.initialTransform.position[1] + dy),
				],
			});
			return;
		}

		if (event.buttons & 2) {
			const { x, y } = getPointerPosition(event.clientX, event.clientY);
			const image = await playbackContext.renderFrame(
				playbackContext.currentFrame,
			);
			if (image == null) return;
			const pixelIndex = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
			const data = image.subarray(pixelIndex, pixelIndex + 4);
			toolContext.setColor(
				rgbaToHsva({
					r: data[0],
					g: data[1],
					b: data[2],
					a: 255,
				}),
			);
		}

		if (
			!canvasDraw.drawState.isDrawing ||
			!(event.buttons & 1) ||
			event.shiftKey ||
			event.ctrlKey
		) {
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
		if (event.pointerType === "touch") {
			touchPointerIdsRef.current.delete(event.pointerId);
			if (touchPointerIdsRef.current.size < 2) {
				isMultiTouchRef.current = false;
			}
			if (isMultiTouchRef.current) return;
		}
		if (selection.finishSelection(event)) return;

		if (moveDragRef.current != null || toolContext.tool === "move") {
			const hadMoveDrag = moveDragRef.current != null;
			moveDragRef.current = null;
			if (hadMoveDrag) void core.endActionGroup();
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
			return;
		}
		canvasDraw.finishDraw();
		void core.endDraw();
		if (canvasRef.current != null) {
			render(canvasRef.current, isOnionSkin, layerContext.selectedLayerId);
		}
	};

	return {
		selection: selection.selection,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
	};
};
