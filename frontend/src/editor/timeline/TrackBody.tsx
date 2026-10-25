import type { RefObject } from "react";
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
	isLayerHidden: (layerId: LayerId) => boolean;
	isLayerLocked: (layerId: LayerId) => boolean;
	onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
	onClipSelect: (id: string) => void;
	onClipMove: (id: string, start: number, layerId: LayerId) => Promise<void>;
	onClipDurationChange: (id: string, duration: number) => Promise<void>;
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
	isLayerHidden,
	isLayerLocked,
	onPointerDown,
	onScroll,
	onClipSelect,
	onClipMove,
	onClipDurationChange,
	onKeyframeMove,
	onInteractionStart,
	onInteractionEnd,
}: TrackBodyProps) => {
	const bodyHeight = layerHeight * layers.length;

	return (
		<div
			className="relative overflow-scroll"
			onPointerDown={onPointerDown}
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
					isSelected={clip.id === selectedClipId}
					isHidden={clip.hidden || isLayerHidden(clip.layer_id)}
					isLocked={clip.locked || isLayerLocked(clip.layer_id)}
					onSelect={() => onClipSelect(clip.id)}
					onMove={(startFrame: number, layerIndex: number) => {
						const layerId = layers[layerIndex]?.id;
						if (layerId == null) return;
						void onClipMove(clip.id, startFrame, layerId);
					}}
					onDurationChange={(duration) => {
						void onClipDurationChange(clip.id, duration);
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
