import { useEffect, useRef, useState } from "react";
import type { ClipType } from "~/lib/clip";

type Props = {
	id: string;
	keyframes: { frame: number; property: string }[];
	name: string;
	type: ClipType;
	depth?: number;
	layerHeight: number;
	layerCount: number;
	frameWidth: number;
	scrollX: number;
	scrollY: number;
	startFrame: number;
	duration: number;
	layerIndex: number;
	isSelected: boolean;
	isHidden: boolean;
	isLocked: boolean;
	onSelect: (
		addToSelection: boolean,
		preserveSelection: boolean,
		selectRange: boolean,
		addRangeToSelection: boolean,
	) => void;
	onMove: (
		startFrame: number,
		layerIndex: number,
		frameDelta: number,
		layerDelta: number,
		gestureId: string,
	) => void;
	onDurationChange: (
		duration: number,
		durationDelta: number,
		gestureId: string,
	) => void;
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
	lastX: number;
	lastY: number;
	startScrollX: number;
	startScrollY: number;
	grabOffsetY: number;
	startFrame: number;
	duration: number;
	layerIndex: number;
	gestureId: string;
	deferSelection: boolean;
	didMove: boolean;
	kind: "move" | "resize";
};

const getClipDisplayHeight = (
	type: ClipType,
	depth: number | undefined,
	layerIndex: number,
	layerCount: number,
	layerHeight: number,
) => {
	const coveredLayerCount = type === "group" ? (depth ?? 1) + 1 : 1;
	return Math.min(coveredLayerCount, layerCount - layerIndex) * layerHeight;
};

const Clip = ({
	id,
	keyframes,
	name,
	type,
	depth,
	layerHeight,
	layerCount,
	frameWidth,
	scrollX,
	scrollY,
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
	const displayHeight = getClipDisplayHeight(
		type,
		depth,
		layerIndex,
		layerCount,
		layerHeight,
	);
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
		lastX: number;
		startScrollX: number;
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

		const hasModifier = event.ctrlKey || event.metaKey || event.shiftKey;
		const deferSelection = isSelected && !hasModifier;
		if (!deferSelection) {
			onSelect(
				(event.ctrlKey || event.metaKey) && !event.shiftKey,
				isSelected,
				event.shiftKey,
				event.shiftKey && (event.ctrlKey || event.metaKey),
			);
		}
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			lastX: event.clientX,
			lastY: event.clientY,
			startScrollX: scrollX,
			startScrollY: scrollY,
			grabOffsetY:
				type === "group"
					? Math.min(
							event.clientY - event.currentTarget.getBoundingClientRect().top,
							layerHeight - 1,
						)
					: event.clientY - event.currentTarget.getBoundingClientRect().top,
			startFrame,
			duration,
			layerIndex,
			gestureId: `${event.pointerId}:${event.timeStamp}`,
			deferSelection,
			didMove: false,
			kind: event.currentTarget.dataset.resize === "true" ? "resize" : "move",
		};
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (drag == null || drag.pointerId !== event.pointerId) {
			return;
		}
		if (drag.kind !== "move") return;
		drag.didMove =
			drag.didMove ||
			Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 3;
		if (!drag.didMove) return;
		event.stopPropagation();
		startInteraction();
		drag.lastX = event.clientX;
		drag.lastY = event.clientY;
		updateClipDrag(drag, event.clientX, event.clientY);
	};

	const updateClipDrag = (drag: Drag, clientX: number, clientY: number) => {
		const scrollDeltaX = scrollX - drag.startScrollX;
		const scrollDeltaY = scrollY - drag.startScrollY;
		if (drag.kind === "move") {
			const nextStartFrame = Math.max(
				0,
				drag.startFrame +
					Math.floor((clientX - drag.startX + scrollDeltaX) / frameWidth),
			);
			const nextLayerIndex = Math.max(
				0,
				drag.layerIndex +
					Math.floor(
						(drag.grabOffsetY + clientY - drag.startY + scrollDeltaY) /
							layerHeight,
					),
			);
			onMove(
				nextStartFrame,
				nextLayerIndex,
				nextStartFrame - drag.startFrame,
				nextLayerIndex - drag.layerIndex,
				drag.gestureId,
			);
			return;
		}
		const nextDuration = Math.max(
			1,
			drag.duration +
				Math.floor((clientX - drag.startX + scrollDeltaX) / frameWidth),
		);
		onDurationChange(
			nextDuration,
			nextDuration - drag.duration,
			drag.gestureId,
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
		drag.didMove =
			drag.didMove ||
			Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 3;
		if (!drag.didMove) return;
		event.stopPropagation();
		startInteraction();
		drag.lastX = event.clientX;
		drag.lastY = event.clientY;
		updateClipDrag(drag, event.clientX, event.clientY);
	};

	const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (drag?.pointerId !== event.pointerId) return;
		dragRef.current = null;
		if (
			event.type !== "pointercancel" &&
			drag.deferSelection &&
			!drag.didMove
		) {
			onSelect(false, false, false, false);
		}
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
			lastX: event.clientX,
			startScrollX: scrollX,
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
		drag.lastX = event.clientX;
		drag.frame = Math.max(
			startFrame,
			Math.min(
				startFrame + duration - 1,
				drag.startFrame +
					Math.round(
						(event.clientX - drag.startX + scrollX - drag.startScrollX) /
							frameWidth,
					),
			),
		);
		setKeyframePreview({
			property: drag.property,
			fromFrame: drag.startFrame,
			frame: drag.frame,
		});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: Recompute the active drag only when scroll offsets change.
	useEffect(() => {
		const drag = dragRef.current;
		if (drag?.didMove) updateClipDrag(drag, drag.lastX, drag.lastY);

		const keyframeDrag = keyframeDragRef.current;
		if (keyframeDrag == null) return;
		keyframeDrag.frame = Math.max(
			startFrame,
			Math.min(
				startFrame + duration - 1,
				keyframeDrag.startFrame +
					Math.round(
						(keyframeDrag.lastX -
							keyframeDrag.startX +
							scrollX -
							keyframeDrag.startScrollX) /
							frameWidth,
					),
			),
		);
		setKeyframePreview({
			property: keyframeDrag.property,
			fromFrame: keyframeDrag.startFrame,
			frame: keyframeDrag.frame,
		});
	}, [scrollX, scrollY]);

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
			data-clip="true"
			data-clip-id={id}
			data-type={type}
			data-selected={isSelected}
			data-hidden={isHidden}
			data-locked={isLocked}
			className="group bg-clip/25 absolute grid touch-none grid-cols-[1fr_8px] items-stretch overflow-hidden rounded border border-clip font-medium data-[hidden=true]:opacity-40 data-[locked=true]:cursor-not-allowed data-[type=audio]:[--color-clip:var(--color-clip-audio)] data-[type=group]:[--color-clip:var(--color-clip-group)] data-[type=image]:[--color-clip:var(--color-clip-image)]"
			style={{
				left: `${startFrame * frameWidth}px`,
				top: `${layerIndex * layerHeight}px`,
				width: `${duration * frameWidth}px`,
				height: `${displayHeight}px`,
				zIndex: layerIndex * 2 + (type === "group" ? 0 : 1),
			}}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			onLostPointerCapture={handlePointerUp}
		>
			<div className="pointer-events-none absolute flex h-full items-center gap-1 px-1 text-nowrap group-data-[type=group]:items-start group-data-[type=group]:pt-1">
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
							className="absolute z-20 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center group-data-[locked=true]:cursor-not-allowed active:cursor-grabbing"
							style={{
								left: `${(displayedFrame - startFrame + 0.5) * frameWidth}px`,
								top:
									type === "group"
										? `calc(${layerHeight / 2}px + ${offset}px)`
										: `calc(50% + ${offset}px)`,
							}}
							onPointerDown={(event) =>
								handleKeyframePointerDown(event, frame, key.property)
							}
							onPointerMove={handleKeyframePointerMove}
							onPointerUp={finishKeyframeDrag}
							onPointerCancel={finishKeyframeDrag}
							onLostPointerCapture={finishKeyframeDrag}
						>
							<span className="size-2 rotate-45 bg-foreground-muted" />
						</button>
					);
				}),
			)}
			<div
				className="group-data-[selected=true]:bg-clip group-data-[locked=false]:cursor-move"
				style={{ height: `${layerHeight}px` }}
				onPointerDown={isLocked ? undefined : handlePointerDown}
				onPointerMove={isLocked ? undefined : handlePointerMove}
			/>
			<div
				className="bg-clip grid place-items-center group-data-[locked=false]:cursor-w-resize group-data-[type=group]:items-start group-data-[type=group]:pt-2"
				data-resize="true"
				onPointerDown={isLocked ? undefined : handlePointerDown}
				onPointerMove={isLocked ? undefined : handleRightPointerMove}
			>
				<div className="h-4 w-px bg-foreground-muted" />
			</div>
		</div>
	);
};

export default Clip;
