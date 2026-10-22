import { useRef, useState } from "react";

type Props = {
	id: string;
	keyframes: { frame: number; property: string }[];
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
	onKeyframeMove: (
		property: string,
		fromFrame: number,
		toFrame: number,
	) => void;
	onInteractionStart: () => void;
	onInteractionEnd: () => void;
};

type Drag = {
	pointerId: number;
	startX: number;
	startY: number;
	grabOffsetY: number;
	startFrame: number;
	duration: number;
	layerIndex: number;
	kind: "move" | "resize";
};

const Clip = ({
	id,
	keyframes,
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
	onKeyframeMove,
	onInteractionStart,
	onInteractionEnd,
}: Props) => {
	const dragRef = useRef<Drag | null>(null);
	const isInteracting = useRef(false);
	const [keyframePreview, setKeyframePreview] = useState<{
		property: string;
		fromFrame: number;
		frame: number;
	} | null>(null);
	const keyframeDragRef = useRef<{
		pointerId: number;
		property: string;
		frame: number;
		startFrame: number;
		startX: number;
	} | null>(null);

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
			grabOffsetY:
				event.clientY - event.currentTarget.getBoundingClientRect().top,
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
					Math.floor(
						(drag.grabOffsetY + event.clientY - drag.startY) / layerHeight,
					),
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
	const keysByFrame = new Map<number, { frame: number; property: string }[]>();
	for (const key of keyframes) {
		if (key.frame < startFrame || key.frame >= startFrame + duration) continue;
		keysByFrame.set(key.frame, [...(keysByFrame.get(key.frame) ?? []), key]);
	}

	const handleKeyframePointerDown = (
		event: React.PointerEvent<HTMLButtonElement>,
		frame: number,
		property: string,
	) => {
		event.preventDefault();
		event.stopPropagation();
		if (event.button !== 0 || isLocked) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		keyframeDragRef.current = {
			pointerId: event.pointerId,
			property,
			frame,
			startFrame: frame,
			startX: event.clientX,
		};
		setKeyframePreview({ property, fromFrame: frame, frame });
		startInteraction();
	};

	const handleKeyframePointerMove = (
		event: React.PointerEvent<HTMLButtonElement>,
	) => {
		event.stopPropagation();
		const drag = keyframeDragRef.current;
		if (drag == null || drag.pointerId !== event.pointerId) return;
		drag.frame = Math.max(
			startFrame,
			Math.min(
				startFrame + duration - 1,
				drag.startFrame +
					Math.round((event.clientX - drag.startX) / frameWidth),
			),
		);
		setKeyframePreview({
			property: drag.property,
			fromFrame: drag.startFrame,
			frame: drag.frame,
		});
	};

	const finishKeyframeDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		const drag = keyframeDragRef.current;
		if (drag == null || drag.pointerId !== event.pointerId) return;
		keyframeDragRef.current = null;
		setKeyframePreview(null);
		if (drag.frame !== drag.startFrame) {
			onKeyframeMove(drag.property, drag.startFrame, drag.frame);
		}
		endInteraction();
	};

	return (
		<div
			key={id}
			className={`absolute grid touch-none grid-cols-[1fr_8px] items-stretch overflow-hidden rounded border font-medium ${isSelected ? "border-primary bg-primary/25" : "border-border bg-surface"} ${isHidden ? "opacity-40" : ""} ${isLocked ? "cursor-not-allowed" : ""}`}
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
			{[...keysByFrame.entries()].flatMap(([frame, keys]) =>
				keys.map((key, index) => {
					const offset = (index - (keys.length - 1) / 2) * 7;
					const displayedFrame =
						keyframePreview?.property === key.property &&
						keyframePreview.fromFrame === key.frame &&
						keyframePreview.frame !== key.frame
							? keyframePreview.frame
							: frame;
					return (
						<button
							type="button"
							key={`${frame}:${key.property}`}
							title={`${key.property} · ${frame}`}
							aria-label={`${key.property} keyframe at ${frame}`}
							className={`absolute z-20 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center ${isLocked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
							style={{
								left: `${(displayedFrame - startFrame + 0.5) * frameWidth}px`,
								top: `calc(50% + ${offset}px)`,
							}}
							onPointerDown={(event) =>
								handleKeyframePointerDown(event, frame, key.property)
							}
							onPointerMove={handleKeyframePointerMove}
							onPointerUp={finishKeyframeDrag}
							onPointerCancel={finishKeyframeDrag}
							onLostPointerCapture={finishKeyframeDrag}
						>
							<span
								className={`size-2 rotate-45 border border-border ${isSelected ? "bg-primary" : "bg-border"}`}
							/>
						</button>
					);
				}),
			)}
			<div
				className={isLocked ? "" : "cursor-move"}
				onPointerDown={isLocked ? undefined : handlePointerDown}
				onPointerMove={isLocked ? undefined : handlePointerMove}
			/>
			<div
				className={`${isSelected ? "bg-primary" : "bg-border"} ${isLocked ? "" : "cursor-w-resize"}`}
				data-resize="true"
				onPointerDown={isLocked ? undefined : handlePointerDown}
				onPointerMove={isLocked ? undefined : handleRightPointerMove}
			/>
		</div>
	);
};

export default Clip;
