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
	collapseDirection?: "positive" | "negative";
	onCollapse?: () => void;
};

const KEYBOARD_STEP = 16;
const COLLAPSE_THRESHOLD = 64;

const Splitter = ({
	orientation,
	label,
	value,
	min,
	max,
	onResize,
	collapseDirection,
	onCollapse,
}: Props) => {
	const pointerPosition = useRef<number | null>(null);
	const collapseDistance = useRef(0);
	const pointerCollapseLocked = useRef(false);
	const pointerExpandDistance = useRef(0);
	const isHorizontal = orientation === "horizontal";

	const resize = (delta: number) => {
		if (onCollapse && collapseDirection) {
			const isCollapsing =
				collapseDirection === "positive" ? delta > 0 : delta < 0;
			if (value < min) {
				if (!isCollapsing) onResize(delta);
				return;
			}

			if (isCollapsing) {
				const distanceToMin = Math.max(0, value - min);
				collapseDistance.current =
					value > min
						? Math.max(0, Math.abs(delta) - distanceToMin)
						: collapseDistance.current + Math.abs(delta);
				if (collapseDistance.current >= COLLAPSE_THRESHOLD) {
					collapseDistance.current = 0;
					pointerCollapseLocked.current = true;
					pointerExpandDistance.current = 0;
					onCollapse();
					return;
				}
			} else {
				collapseDistance.current = 0;
			}
		}

		onResize(delta);
	};

	return (
		<Separator
			aria-label={label}
			orientation={orientation}
			aria-valuemin={onCollapse ? 0 : min}
			aria-valuemax={max}
			aria-valuenow={value}
			tabIndex={0}
			className="group z-10 touch-none p-px data-[orientation=horizontal]:h-full data-[orientation=horizontal]:cursor-row-resize data-[orientation=vertical]:size-full data-[orientation=vertical]:cursor-col-resize"
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				pointerPosition.current = isHorizontal ? event.clientY : event.clientX;
				collapseDistance.current = 0;
				pointerCollapseLocked.current = false;
				pointerExpandDistance.current = 0;
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
				const delta = currentPosition - pointerPosition.current;
				pointerPosition.current = currentPosition;
				if (pointerCollapseLocked.current) {
					const isExpanding =
						collapseDirection === "positive" ? delta < 0 : delta > 0;
					if (!isExpanding) {
						pointerExpandDistance.current = 0;
						return;
					}

					pointerExpandDistance.current += Math.abs(delta);
					if (pointerExpandDistance.current < COLLAPSE_THRESHOLD) return;
					pointerCollapseLocked.current = false;
					pointerExpandDistance.current = 0;
				}
				resize(delta);
			}}
			onPointerUp={() => {
				pointerPosition.current = null;
				collapseDistance.current = 0;
				pointerCollapseLocked.current = false;
				pointerExpandDistance.current = 0;
			}}
			onLostPointerCapture={() => {
				pointerPosition.current = null;
				collapseDistance.current = 0;
				pointerCollapseLocked.current = false;
				pointerExpandDistance.current = 0;
			}}
			onKeyDown={(event) => {
				const decreaseKey = isHorizontal ? "ArrowUp" : "ArrowLeft";
				const increaseKey = isHorizontal ? "ArrowDown" : "ArrowRight";

				if (event.key === decreaseKey) {
					event.preventDefault();
					resize(-KEYBOARD_STEP);
				} else if (event.key === increaseKey) {
					event.preventDefault();
					resize(KEYBOARD_STEP);
				}
			}}
		>
			<div className="size-full rounded-full group-hover:not-disabled:bg-primary" />
		</Separator>
	);
};

export default Splitter;
