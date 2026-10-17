import { useRef } from "react";

type Orientation = "horizontal" | "vertical";

type Props = {
	orientation: Orientation;
	label: string;
	value: number;
	min: number;
	max: number;
	onResize: (delta: number) => void;
};

const KEYBOARD_STEP = 16;

const Splitter = ({ orientation, label, value, min, max, onResize }: Props) => {
	const pointerPosition = useRef<number | null>(null);
	const isHorizontal = orientation === "horizontal";

	return (
		// biome-ignore lint/a11y/useSemanticElements: A draggable separator is interactive, not a thematic break.
		<div
			role="separator"
			aria-label={label}
			aria-orientation={orientation}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={value}
			tabIndex={0}
			className={`z-10 touch-none hover:not-disabled:bg-zinc-500/20 rounded-full ${
				isHorizontal
					? "h-full cursor-row-resize"
					: "w-full h-full cursor-col-resize"
			}`}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				pointerPosition.current = isHorizontal ? event.clientY : event.clientX;
				event.currentTarget.setPointerCapture(event.pointerId);
			}}
			onPointerMove={(event) => {
				if (
					!event.currentTarget.hasPointerCapture(event.pointerId) ||
					pointerPosition.current == null
				) {
					return;
				}

				const currentPosition = isHorizontal ? event.clientY : event.clientX;
				onResize(currentPosition - pointerPosition.current);
				pointerPosition.current = currentPosition;
			}}
			onPointerUp={() => {
				pointerPosition.current = null;
			}}
			onLostPointerCapture={() => {
				pointerPosition.current = null;
			}}
			onKeyDown={(event) => {
				const decreaseKey = isHorizontal ? "ArrowUp" : "ArrowLeft";
				const increaseKey = isHorizontal ? "ArrowDown" : "ArrowRight";

				if (event.key === decreaseKey) {
					event.preventDefault();
					onResize(-KEYBOARD_STEP);
				} else if (event.key === increaseKey) {
					event.preventDefault();
					onResize(KEYBOARD_STEP);
				}
			}}
		/>
	);
};

export default Splitter;
