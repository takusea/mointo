import type { RefObject } from "react";
import type { ClipMetadata } from "~/lib/clip";
import type { LayerId, LayerState } from "~/lib/layer";
import Clip from "./Clip";

type TrackBodyProps = {
	ref: RefObject<HTMLDivElement | null>;
	layers: LayerState[];
	clips: ClipMetadata[];
	layerHeight: number;
	frameWidth: number;
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
	onInteractionStart: () => void;
	onInteractionEnd: () => void;
};

const TrackBody = ({
	ref,
	layers,
	clips,
	layerHeight,
	frameWidth,
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
				className="pointer-events-none absolute top-0 bg-white/50 dark:bg-zinc-800/50"
				style={{
					left: `${startFrame * frameWidth}px`,
					height: `${bodyHeight}px`,
					width: `${(endFrame - startFrame + 1) * frameWidth}px`,
				}}
			/>
			{layers.map((layer, i) => (
				<div
					key={layer.id}
					className="absolute top-0 left-0 h-px bg-zinc-500/25"
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
					name={clip.name}
					layerHeight={layerHeight}
					frameWidth={frameWidth}
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
					onInteractionStart={onInteractionStart}
					onInteractionEnd={onInteractionEnd}
				/>
			))}
			<div
				className="pointer-events-none absolute top-0 z-10 h-full w-px bg-zinc-500/25"
				style={{
					height: `${bodyHeight}px`,
					left: `${startFrame * frameWidth}px`,
				}}
			/>
			<div
				className="pointer-events-none absolute top-0 z-10 h-full w-px bg-zinc-500/25"
				style={{
					height: `${bodyHeight}px`,
					left: `${(endFrame + 1) * frameWidth}px`,
				}}
			/>
		</div>
	);
};

export default TrackBody;
