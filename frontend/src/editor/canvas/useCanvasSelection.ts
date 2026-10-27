import { useRef, useState } from "react";
import { useClip } from "~/features/clip/useClip";
import type { SelectionArea } from "~/features/clip/ClipContext";
import { usePlayback } from "~/features/playback/usePlayback";

type Selection = SelectionArea;
type Point = { x: number; y: number };

export const useCanvasSelection = (
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	getPointerPosition: (x: number, y: number) => Point,
) => {
	const clipContext = useClip();
	const playback = usePlayback();
	const selectionDragRef = useRef<Point | null>(null);
	const pointsRef = useRef<Point[]>([]);
	const modeRef = useRef<"rectangle" | "lasso">("lasso");
	const selectionDraftRef = useRef<Selection | undefined>(undefined);
	const [selectionDraft, setSelectionDraft] = useState<Selection | undefined>(
		undefined,
	);

	const updateSelectionDraft = (selection: Selection | undefined) => {
		selectionDraftRef.current = selection;
		setSelectionDraft(selection);
	};

	const beginSelection = (event: React.PointerEvent<HTMLCanvasElement>, mode: "rectangle" | "lasso" = "lasso") => {
		const canvas = canvasRef.current;
		if (canvas == null) return;

		const point = getPointerPosition(event.clientX, event.clientY);
		const start = {
			x: Math.max(0, Math.min(canvas.width - 1, Math.floor(point.x))),
			y: Math.max(0, Math.min(canvas.height - 1, Math.floor(point.y))),
		};
		selectionDragRef.current = start;
		modeRef.current = mode;
		pointsRef.current = [start];
		updateSelectionDraft({ ...start, width: 1, height: 1 });
		clipContext.setSelection(undefined);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const moveSelection = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		const start = selectionDragRef.current;
		if (canvas == null || start == null) return false;
		if (!(event.buttons & 1)) return true;

		const point = getPointerPosition(event.clientX, event.clientY);
		const endX = Math.max(0, Math.min(canvas.width - 1, Math.floor(point.x)));
		const endY = Math.max(0, Math.min(canvas.height - 1, Math.floor(point.y)));
		if (modeRef.current === "rectangle") pointsRef.current = [start, { x: endX, y: start.y }, { x: endX, y: endY }, { x: start.x, y: endY }];
		else if (Math.hypot(endX - pointsRef.current.at(-1)!.x, endY - pointsRef.current.at(-1)!.y) >= 1) pointsRef.current.push({ x: endX, y: endY });
		const xs = pointsRef.current.map((p) => p.x);
		const ys = pointsRef.current.map((p) => p.y);
		updateSelectionDraft({
			x: Math.min(...xs), y: Math.min(...ys),
			width: Math.max(...xs) - Math.min(...xs) + 1,
			height: Math.max(...ys) - Math.min(...ys) + 1,
			...(modeRef.current === "lasso" ? { points: [...pointsRef.current] } : {}),
		});
		return true;
	};

	const finishSelection = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (selectionDragRef.current == null) return false;

		selectionDragRef.current = null;
		const draft = selectionDraftRef.current;
		if (draft != null && modeRef.current === "rectangle") {
			clipContext.setSelection({ x: draft.x, y: draft.y, width: draft.width, height: draft.height });
		} else if (draft != null && pointsRef.current.length >= 3) {
			const canvas = canvasRef.current;
			if (canvas != null) {
				const mask = new Uint8Array(canvas.width * canvas.height);
				for (let y = draft.y; y < draft.y + draft.height; y++) for (let x = draft.x; x < draft.x + draft.width; x++) {
					let inside = false;
					for (let i = 0, j = pointsRef.current.length - 1; i < pointsRef.current.length; j = i++) {
						const a = pointsRef.current[i], b = pointsRef.current[j];
						if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
					}
					if (inside) mask[y * canvas.width + x] = 1;
				}
				clipContext.setSelection({ ...draft, mask, points: [...pointsRef.current] });
			}
		}
		updateSelectionDraft(undefined);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		return true;
	};

	return {
		selection: selectionDraft ?? clipContext.selection,
		beginSelection,
		moveSelection,
		finishSelection,
		selectSimilar: async (clientX: number, clientY: number) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const p = getPointerPosition(clientX, clientY), sx = Math.floor(p.x), sy = Math.floor(p.y);
			if (sx < 0 || sy < 0 || sx >= canvas.width || sy >= canvas.height) return;
			const data = await playback.renderFrame(playback.currentFrame);
			if (!data || data.length !== canvas.width * canvas.height * 4) return;
			const start = (sy * canvas.width + sx) * 4, target = data.slice(start, start + 4);
			const mask = new Uint8Array(canvas.width * canvas.height), stack = [sy * canvas.width + sx];
			let left = sx, right = sx, top = sy, bottom = sy;
			while (stack.length) {
				const index = stack.pop()!;
				if (index < 0 || index >= mask.length || mask[index]) continue;
				const offset = index * 4;
				if (data[offset] !== target[0] || data[offset + 1] !== target[1] || data[offset + 2] !== target[2] || data[offset + 3] !== target[3]) continue;
				mask[index] = 1;
				const x = index % canvas.width, y = Math.floor(index / canvas.width);
				left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
				if (x > 0) stack.push(index - 1); if (x + 1 < canvas.width) stack.push(index + 1);
				if (y > 0) stack.push(index - canvas.width); if (y + 1 < canvas.height) stack.push(index + canvas.width);
			}
			clipContext.setSelection({ x: left, y: top, width: right - left + 1, height: bottom - top + 1, mask });
		},
	};
};
