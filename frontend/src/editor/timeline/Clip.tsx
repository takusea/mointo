import { useRef } from "react";

type Props = {
	id: string;
	name: string;
	layerHeight: number;
	frameWidth: number;
	startFrame: number;
	duration: number;
	layerIndex: number;
	isSelected: boolean;
	isHidden: boolean;
	isLocked: boolean;
	onSelect: () => void;
	onMove: (startFrame: number, layerIndex: number) => void;
	onDurationChange: (duration: number) => void;
	onInteractionStart: () => void;
	onInteractionEnd: () => void;
};

type Drag = {
	pointerId: number;
	startX: number;
	startY: number;
	startFrame: number;
	duration: number;
	layerIndex: number;
	kind: "move" | "resize";
};

const Clip = ({
	id,
	name,
	layerHeight,
	frameWidth,
	startFrame,
	duration,
	layerIndex,
	isSelected,
	isHidden,
	isLocked,
	onSelect,
	onMove,
	onDurationChange,
	onInteractionStart,
	onInteractionEnd,
}: Props) => {
	const dragRef = useRef<Drag | null>(null);
	const isInteracting = useRef(false);

	const startInteraction = () => {
		if (isInteracting.current) return;
		isInteracting.current = true;
		onInteractionStart();
	};

	const endInteraction = () => {
		if (!isInteracting.current) return;
		isInteracting.current = false;
		onInteractionEnd();
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);

		onSelect();
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startFrame,
			duration,
			layerIndex,
			kind: event.currentTarget.dataset.resize === "true" ? "resize" : "move",
		};
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (drag == null || drag.pointerId !== event.pointerId) {
			return;
		}
		if (drag.kind !== "move") return;
		event.stopPropagation();
		startInteraction();

		onMove(
			Math.max(
				0,
				drag.startFrame +
					Math.floor((event.clientX - drag.startX) / frameWidth),
			),
			Math.max(
				0,
				drag.layerIndex +
					Math.floor((event.clientY - drag.startY) / layerHeight),
			),
		);
	};

	const handleRightPointerMove = (
		event: React.PointerEvent<HTMLDivElement>,
	) => {
		const drag = dragRef.current;
		if (
			drag == null ||
			drag.pointerId !== event.pointerId ||
			drag.kind !== "resize"
		)
			return;
		event.stopPropagation();
		startInteraction();
		onDurationChange(
			Math.max(
				1,
				drag.duration + Math.floor((event.clientX - drag.startX) / frameWidth),
			),
		);
	};

	const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
		if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
		endInteraction();
	};

	return (
		<div
			key={id}
			className={`absolute grid touch-none grid-cols-[1fr_8px] items-stretch overflow-hidden rounded border font-medium ${isSelected ? "border-primary bg-primary/25" : "border-zinc-500/40 bg-zinc-500/25"} ${isHidden ? "opacity-40" : ""} ${isLocked ? "cursor-not-allowed" : ""}`}
			style={{
				left: `${startFrame * frameWidth}px`,
				top: `${layerIndex * layerHeight}px`,
				width: `${duration * frameWidth}px`,
				height: `${layerHeight}px`,
			}}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			onLostPointerCapture={handlePointerUp}
		>
			<div className="pointer-events-none absolute flex h-full items-center text-nowrap px-1">
				{name}
			</div>
			<div
				className={isLocked ? "" : "cursor-move"}
				onPointerDown={isLocked ? undefined : handlePointerDown}
				onPointerMove={isLocked ? undefined : handlePointerMove}
			/>
			<div
				className={`${isSelected ? "bg-primary" : "bg-zinc-500/40"} ${isLocked ? "" : "cursor-w-resize"}`}
				data-resize="true"
				onPointerDown={isLocked ? undefined : handlePointerDown}
				onPointerMove={isLocked ? undefined : handleRightPointerMove}
			/>
		</div>
	);
};

export default Clip;
