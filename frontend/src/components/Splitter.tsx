import { Separator } from "radix-ui/separator";
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
		<Separator
			aria-label={label}
			orientation={orientation}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={value}
			tabIndex={0}
			className={`group z-10 touch-none p-px ${
				isHorizontal
					? "h-full cursor-row-resize"
					: "size-full cursor-col-resize"
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
		>
			<div
				className={`rounded-full group-hover:not-disabled:bg-primary ${
					isHorizontal
						? "h-full cursor-row-resize"
						: "size-full cursor-col-resize"
				}`}
			/>
		</Separator>
	);
};

export default Splitter;
