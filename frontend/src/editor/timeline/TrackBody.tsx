import { type RefObject, useRef, useState } from "react";
import type { ClipMetadata } from "~/lib/clip";
import type { LayerId, LayerState } from "~/lib/layer";
import Clip from "./Clip";

type TrackBodyProps = {
	ref: RefObject<HTMLDivElement | null>;
	layers: LayerState[];
	clips: ClipMetadata[];
	clipKeyframes: Record<
		string,
		{ frame: number; property: string; value: number | [number, number] }[]
	>;
	layerHeight: number;
	frameWidth: number;
	scrollX: number;
	scrollY: number;
	maxFrameCount: number;
	currentFrame: number;
	startFrame: number;
	endFrame: number;
	selectedClipId: string | undefined;
	selectedClipIds: string[];
	isLayerHidden: (layerId: LayerId) => boolean;
	isLayerLocked: (layerId: LayerId) => boolean;
	onPointerDown: (clientX: number, clientY: number) => void;
	onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
	onClipSelect: (
		id: string,
		addToSelection: boolean,
		preserveSelection: boolean,
		deferLayerSelect: boolean,
		selectRange: boolean,
		addRangeToSelection: boolean,
	) => void;
	onClipsSelect: (ids: string[]) => void;
	onClipMove: (
		id: string,
		start: number,
		layerId: LayerId,
		frameDelta: number,
		layerDelta: number,
		gestureId: string,
	) => Promise<void>;
	onClipDurationChange: (
		id: string,
		duration: number,
		durationDelta: number,
		gestureId: string,
	) => Promise<void>;
	onKeyframeMove: (
		id: string,
		property: string,
		fromFrame: number,
		toFrame: number,
	) => void;
	onInteractionStart: () => void;
	onInteractionEnd: () => void;
};

const TrackBody = ({
	ref,
	layers,
	clips,
	clipKeyframes,
	layerHeight,
	frameWidth,
	scrollX,
	scrollY,
	maxFrameCount,
	currentFrame,
	startFrame,
	endFrame,
	selectedClipId,
	selectedClipIds,
	isLayerHidden,
	isLayerLocked,
	onPointerDown,
	onScroll,
	onClipSelect,
	onClipsSelect,
	onClipMove,
	onClipDurationChange,
	onKeyframeMove,
	onInteractionStart,
	onInteractionEnd,
}: TrackBodyProps) => {
	const bodyHeight = layerHeight * layers.length;
	const selectionDragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		currentX: number;
		currentY: number;
		didMove: boolean;
		isBackground: boolean;
		clientX: number;
		clientY: number;
	} | null>(null);
	const [selectionRect, setSelectionRect] = useState<{
		left: number;
		top: number;
		width: number;
		height: number;
	}>();

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;

		const rect = event.currentTarget.getBoundingClientRect();
		const startX = event.clientX - rect.left + event.currentTarget.scrollLeft;
		const startY = event.clientY - rect.top + event.currentTarget.scrollTop;
		const isBackground =
			event.target instanceof Element &&
			event.target.closest("[data-clip='true']") == null;
		selectionDragRef.current = {
			pointerId: event.pointerId,
			startX,
			startY,
			currentX: startX,
			currentY: startY,
			didMove: false,
			isBackground,
			clientX: event.clientX,
			clientY: event.clientY,
		};
		if (isBackground) event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = selectionDragRef.current;
		if (drag == null || drag.pointerId !== event.pointerId) return;

		const rect = event.currentTarget.getBoundingClientRect();
		drag.currentX = event.clientX - rect.left + event.currentTarget.scrollLeft;
		drag.currentY = event.clientY - rect.top + event.currentTarget.scrollTop;
		drag.didMove =
			drag.didMove ||
			Math.hypot(drag.currentX - drag.startX, drag.currentY - drag.startY) >= 3;
		if (!drag.didMove) return;

		if (drag.isBackground) {
			setSelectionRect({
				left: Math.min(drag.startX, drag.currentX),
				top: Math.min(drag.startY, drag.currentY),
				width: Math.abs(drag.currentX - drag.startX),
				height: Math.abs(drag.currentY - drag.startY),
			});
		}
	};

	const finishSelectionDrag = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = selectionDragRef.current;
		if (drag == null || drag.pointerId !== event.pointerId) return;
		const rect = event.currentTarget.getBoundingClientRect();
		drag.currentX = event.clientX - rect.left + event.currentTarget.scrollLeft;
		drag.currentY = event.clientY - rect.top + event.currentTarget.scrollTop;
		drag.didMove =
			drag.didMove ||
			Math.hypot(drag.currentX - drag.startX, drag.currentY - drag.startY) >= 3;
		selectionDragRef.current = null;
		setSelectionRect(undefined);
		if (event.type === "pointercancel") return;
		if (!drag.didMove) {
			if (drag.isBackground) onClipsSelect([]);
			onPointerDown(drag.clientX, drag.clientY);
			return;
		}
		if (!drag.isBackground) return;

		const left = Math.min(drag.startX, drag.currentX);
		const right = Math.max(drag.startX, drag.currentX);
		const top = Math.min(drag.startY, drag.currentY);
		const bottom = Math.max(drag.startY, drag.currentY);
		onClipsSelect(
			clips
				.filter((clip) => {
					const clipLeft = clip.start * frameWidth;
					const clipRight = (clip.start + clip.duration) * frameWidth;
					const clipTop = clip.layer_index * layerHeight;
					const clipBottom = clipTop + layerHeight;
					return (
						clipLeft <= right &&
						clipRight >= left &&
						clipTop <= bottom &&
						clipBottom >= top
					);
				})
				.map((clip) => clip.id),
		);
	};

	return (
		<div
			className="relative overflow-scroll"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={finishSelectionDrag}
			onPointerCancel={finishSelectionDrag}
			onScroll={onScroll}
			ref={ref}
		>
			<div
				className="absolute top-0 z-50 w-px bg-primary"
				style={{
					height: `${bodyHeight}px`,
					translate: `${currentFrame * frameWidth}px 0`,
				}}
			/>
			<div
				className="pointer-events-none absolute top-0 bg-surface"
				style={{
					left: `${startFrame * frameWidth}px`,
					height: `${bodyHeight}px`,
					width: `${(endFrame - startFrame + 1) * frameWidth}px`,
				}}
			/>
			{layers.map((layer, i) => (
				<div
					key={layer.id}
					className="absolute top-0 left-0 h-px bg-border"
					style={{
						top: `${(i + 1) * layerHeight - 1}px`,
						width: `${frameWidth * maxFrameCount}px`,
					}}
				/>
			))}
			{selectionRect != null && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute z-40 border border-primary bg-primary/15"
					style={{
						left: `${selectionRect.left}px`,
						top: `${selectionRect.top}px`,
						width: `${selectionRect.width}px`,
						height: `${selectionRect.height}px`,
					}}
				/>
			)}
			{clips.map((clip) => (
				<Clip
					key={clip.id}
					id={clip.id}
					keyframes={clipKeyframes[clip.id] ?? []}
					name={clip.name}
					layerHeight={layerHeight}
					frameWidth={frameWidth}
					scrollX={scrollX}
					scrollY={scrollY}
					startFrame={clip.start}
					duration={clip.duration}
					layerIndex={clip.layer_index}
					isSelected={
						selectedClipIds.includes(clip.id) || clip.id === selectedClipId
					}
					isHidden={clip.hidden || isLayerHidden(clip.layer_id)}
					isLocked={clip.locked || isLayerLocked(clip.layer_id)}
					onSelect={(
						addToSelection,
						preserveSelection,
						selectRange,
						addRangeToSelection,
					) =>
						onClipSelect(
							clip.id,
							addToSelection,
							preserveSelection,
							true,
							selectRange,
							addRangeToSelection,
						)
					}
					onMove={(
						startFrame: number,
						layerIndex: number,
						frameDelta: number,
						layerDelta: number,
						gestureId: string,
					) => {
						const boundedLayerIndex = Math.min(
							layers.length - 1,
							Math.max(0, layerIndex),
						);
						const layerId = layers[boundedLayerIndex]?.id;
						if (layerId == null) return;
						const baseLayerIndex = layerIndex - layerDelta;
						void onClipMove(
							clip.id,
							startFrame,
							layerId,
							frameDelta,
							boundedLayerIndex - baseLayerIndex,
							gestureId,
						);
					}}
					onDurationChange={(duration, durationDelta, gestureId) => {
						void onClipDurationChange(
							clip.id,
							duration,
							durationDelta,
							gestureId,
						);
					}}
					onKeyframeMove={(property, fromFrame, toFrame) =>
						onKeyframeMove(clip.id, property, fromFrame, toFrame)
					}
					onInteractionStart={onInteractionStart}
					onInteractionEnd={onInteractionEnd}
				/>
			))}
			<div
				className="pointer-events-none absolute top-0 z-10 h-full w-px bg-border"
				style={{
					height: `${bodyHeight}px`,
					left: `${startFrame * frameWidth}px`,
				}}
			/>
			<div
				className="pointer-events-none absolute top-0 z-10 h-full w-px bg-border"
				style={{
					height: `${bodyHeight}px`,
					left: `${(endFrame + 1) * frameWidth}px`,
				}}
			/>
		</div>
	);
};

export default TrackBody;
