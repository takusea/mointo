import { useRef } from "react";
import type { useCanvasView } from "./useCanvasView";

type Point = { x: number; y: number };

const getGesture = (points: Point[]) => {
	const [a, b] = points;
	return {
		center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
		distance: Math.hypot(b.x - a.x, b.y - a.y),
		angle: Math.atan2(b.y - a.y, b.x - a.x),
	};
};

export const useCanvasNavigation = (
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	canvasView: ReturnType<typeof useCanvasView>,
) => {
	const pointers = useRef(new Map<number, Point>());
	const previousGesture = useRef<ReturnType<typeof getGesture> | null>(null);
	const gestureFrame = useRef<number | null>(null);
	const zoomAnchor = useRef<Point | null>(null);

	const handleContainerPointerDown = (event: React.PointerEvent) => {
		if (
			document.documentElement.dataset.drawing === "true" &&
			event.pointerType !== "touch"
		)
			return;
		if (event.button === 0 && event.ctrlKey) {
			zoomAnchor.current = { x: event.clientX, y: event.clientY };
		}
		if (event.pointerType !== "touch") return;
		pointers.current.set(event.pointerId, {
			x: event.clientX,
			y: event.clientY,
		});
		if (pointers.current.size >= 2) {
			previousGesture.current = getGesture(
				[...pointers.current.values()].slice(0, 2),
			);
		}
	};

	const handleContainerPointerUp = (event: React.PointerEvent) => {
		zoomAnchor.current = null;
		pointers.current.delete(event.pointerId);
		previousGesture.current =
			pointers.current.size >= 2
				? getGesture([...pointers.current.values()].slice(0, 2))
				: null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const handleContainerPointerCancel = handleContainerPointerUp;
	const handleWheel = (event: React.WheelEvent) => {
		if (document.documentElement.dataset.drawing === "true") {
			event.preventDefault();
			return;
		}
		const step = event.deltaY < 0 ? 1 : -1;
		if (event.shiftKey) {
			canvasView.rotate(step);
			return;
		}

		const canvas = canvasRef.current;
		if (canvas == null) return;
		const rect = canvas.getBoundingClientRect();
		canvasView.zoomAt(
			step,
			event.clientX - (rect.left + rect.width / 2),
			event.clientY - (rect.top + rect.height / 2),
		);
	};

	const handleContainerPointerMove = (event: React.PointerEvent) => {
		if (
			document.documentElement.dataset.drawing === "true" &&
			event.pointerType !== "touch"
		)
			return;
		if (
			event.pointerType === "touch" &&
			pointers.current.has(event.pointerId)
		) {
			pointers.current.set(event.pointerId, {
				x: event.clientX,
				y: event.clientY,
			});
			if (pointers.current.size >= 2) {
				if (gestureFrame.current == null) {
					gestureFrame.current = requestAnimationFrame(() => {
						gestureFrame.current = null;
						if (pointers.current.size < 2) return;

						const current = getGesture(
							[...pointers.current.values()].slice(0, 2),
						);
						const previous = previousGesture.current;
						if (previous != null && previous.distance > 0) {
							const canvas = canvasRef.current;
							if (canvas != null) {
								const rect = canvas.getBoundingClientRect();
								let angleDelta = current.angle - previous.angle;
								if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
								if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
								canvasView.applyGesture(
									current.distance / previous.distance,
									(angleDelta * 180) / Math.PI,
									previous.center,
									current.center,
									{
										x: rect.left + rect.width / 2,
										y: rect.top + rect.height / 2,
									},
								);
							}
						}
						previousGesture.current = current;
					});
				}
			}
			return;
		}
		const isTranslateButtonPressed =
			(event.buttons & 1 && event.shiftKey) || event.buttons & 4;
		const isZoomButtonPressed = event.buttons & 1 && event.ctrlKey;
		const isRotateButtonPressed = event.buttons & 1 && event.altKey;

		if (
			!isTranslateButtonPressed &&
			!isZoomButtonPressed &&
			!isRotateButtonPressed
		)
			return;

		event.currentTarget.setPointerCapture(event.pointerId);

		if (isTranslateButtonPressed) {
			canvasView.translate(event.movementX, event.movementY);
		}
		if (isZoomButtonPressed) {
			const canvas = canvasRef.current;
			if (canvas == null) return;
			const rect = canvas.getBoundingClientRect();
			const anchor = zoomAnchor.current ?? {
				x: event.clientX,
				y: event.clientY,
			};
			canvasView.zoomAt(
				-event.movementY / 50,
				anchor.x - (rect.left + rect.width / 2),
				anchor.y - (rect.top + rect.height / 2),
			);
		}
		if (isRotateButtonPressed) {
			canvasView.rotate(event.movementX / 10);
		}
	};

	return {
		handleWheel,
		handleContainerPointerDown,
		handleContainerPointerMove,
		handleContainerPointerUp,
		handleContainerPointerCancel,
	};
};
