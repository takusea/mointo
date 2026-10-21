import { useCallback, useRef, useState } from "react";
import { useCore } from "~/core/useCore";
import { useTool } from "~/features/tool/useTool";
import { hsvaToRgba } from "~/lib/color";
import type { DrawState } from "./type";

// Accumulate every point, then send the batch every few input points.
const DRAW_APPLY_POINT_INTERVAL = 5;

export const useCanvasDraw = (currentFrame: number) => {
	const core = useCore();
	const toolContext = useTool();

	const [drawState, setDrawState] = useState<
		{ isDrawing: false } | { isDrawing: true; state: DrawState }
	>({ isDrawing: false });
	const drawStateRef = useRef<typeof drawState>(drawState);
	const drawingClipIdRef = useRef<string | undefined>(undefined);
	const drawingToolRef = useRef<typeof toolContext.tool | null>(null);
	const pendingPointsRef = useRef<DrawState[]>([]);
	const drawFrameRef = useRef<number | null>(null);
	const inputPointCountRef = useRef(0);
	const stabilizedPointRef = useRef<DrawState | null>(null);

	const rgbaColor = hsvaToRgba(toolContext.color);
	const sizeProperty = toolContext.properties.find(
		(property) => property.name === "size",
	);
	const brushSize =
		typeof sizeProperty?.value === "number"
			? sizeProperty.value
			: Number(sizeProperty?.value ?? 1);

	const updateDrawState = (newState: typeof drawState) => {
		drawStateRef.current = newState;
		setDrawState(newState);
	};

	const beginDraw = (
		state: DrawState,
		clipId: string,
		tool = toolContext.tool,
	) => {
		drawingClipIdRef.current = clipId;
		drawingToolRef.current = tool;
		inputPointCountRef.current = 0;
		stabilizedPointRef.current = state;
		updateDrawState({ isDrawing: true, state });
	};

	const flushPoints = useCallback(() => {
		if (drawFrameRef.current != null) {
			cancelAnimationFrame(drawFrameRef.current);
			drawFrameRef.current = null;
		}
		const points = pendingPointsRef.current;
		pendingPointsRef.current = [];
		const clipId = drawingClipIdRef.current;
		if (clipId == null || points.length === 0) return;
		const color = new Uint8Array([
			rgbaColor.r,
			rgbaColor.g,
			rgbaColor.b,
			rgbaColor.a,
		]);
		void core.applyToolPoints(
			clipId,
			drawingToolRef.current ?? toolContext.tool,
			points,
			color,
			currentFrame,
		);
	}, [
		core,
		rgbaColor.a,
		rgbaColor.b,
		rgbaColor.g,
		rgbaColor.r,
		toolContext.tool,
		currentFrame,
	]);

	const finishDraw = () => {
		flushPoints();
		drawingClipIdRef.current = undefined;
		drawingToolRef.current = null;
		inputPointCountRef.current = 0;
		stabilizedPointRef.current = null;
		updateDrawState({ isDrawing: false });
	};

	const draw = (state: DrawState) => {
		if (drawingClipIdRef.current == null) return;

		const clipId = drawingClipIdRef.current;
		const tool = drawingToolRef.current ?? toolContext.tool;
		void core.applyToolPoints(
			clipId,
			tool,
			[state],
			new Uint8Array([rgbaColor.r, rgbaColor.g, rgbaColor.b, rgbaColor.a]),
			currentFrame,
		);
	};

	const interpolateDrawState = (prev: DrawState, current: DrawState) => {
		const dx = current.x - prev.x;
		const dy = current.y - prev.y;
		const dPressure = current.pressure - prev.pressure;
		const distance = Math.hypot(dx, dy);
		// Large brushes cover more distance per dab. Keeping one dab per pixel
		// makes a large brush repeat expensive raster work unnecessarily.
		const effectiveSize = Math.max(
			1,
			brushSize * Math.min(prev.pressure, current.pressure),
		);
		const steps = Math.ceil(distance / Math.max(1, effectiveSize * 0.5));
		if (steps === 0) return [current];

		const drawStates = [];
		for (let i = 1; i <= steps; i++) {
			const t = i / steps;
			const x = prev.x + dx * t;
			const y = prev.y + dy * t;
			const pressure = prev.pressure + dPressure * t;
			drawStates.push({ x, y, pressure });
		}
		return drawStates;
	};

	const drawMultiple = (states: DrawState[]) => {
		if (!drawStateRef.current.isDrawing || states.length === 0) return;

		const baseState = drawStateRef.current.state;
		let previous = baseState;
		for (const input of states) {
			const alpha = 0.08 ** (toolContext.stabilization / 50);
			const last = stabilizedPointRef.current ?? previous;
			const current = {
				x: last.x + (input.x - last.x) * alpha,
				y: last.y + (input.y - last.y) * alpha,
				pressure: input.pressure,
			};
			pendingPointsRef.current.push(...interpolateDrawState(previous, current));
			previous = current;
			stabilizedPointRef.current = current;
			inputPointCountRef.current += 1;
		}

		if (inputPointCountRef.current >= DRAW_APPLY_POINT_INTERVAL) {
			inputPointCountRef.current %= DRAW_APPLY_POINT_INTERVAL;
			if (drawFrameRef.current == null) {
				drawFrameRef.current = requestAnimationFrame(flushPoints);
			}
		}
		drawStateRef.current = {
			isDrawing: true,
			state: stabilizedPointRef.current ?? states[states.length - 1],
		};
	};

	return {
		beginDraw,
		finishDraw,
		draw,
		drawMultiple,
		drawState,
	};
};
