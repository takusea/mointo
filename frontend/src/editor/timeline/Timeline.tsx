import { useLayoutEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import Card from "~/components/Card";
import { useCore } from "~/core/useCore";
import { useClip } from "~/features/clip/useClip";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { useShortcuts } from "~/features/shortcuts/useShortcuts";
import TrackBody from "./TrackBody";
import TrackHeader from "./TrackHeader";
import TrackSide from "./TrackSide";

const MIN_LAYER_HEIGHT = 12;
const MAX_LAYER_HEIGHT = 128;
const MIN_FRAME_WIDTH = 2;
const MAX_FRAME_WIDTH = 64;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

const Timeline = () => {
	const core = useCore();
	const clipContext = useClip();
	const playbackContext = usePlayback();
	const projectContext = useProject();
	const layerContext = useLayer();
	const { shortcuts } = useShortcuts();

	useHotkeys(shortcuts.deleteClip, () => {
		if (clipContext.selectedClipId != null) {
			clipContext.deleteClip(clipContext.selectedClipId);
		}
	});

	const [layerHeight, setTrackHeight] = useState<number>(32);
	const [frameWidth, setFrameWidth] = useState<number>(16);
	const [scrollPosition, setScrollPosition] = useState<{
		x: number;
		y: number;
	}>({ x: 0, y: 0 });
	const timelineViewportRef = useRef<HTMLDivElement | null>(null);
	const [pendingScroll, setPendingScroll] = useState<{
		x: number;
		y: number;
	} | null>(null);

	useLayoutEffect(() => {
		const viewport = timelineViewportRef.current;
		if (pendingScroll == null || viewport == null) return;

		viewport.scrollLeft = pendingScroll.x;
		viewport.scrollTop = pendingScroll.y;
		setPendingScroll(null);
		setScrollPosition({ x: viewport.scrollLeft, y: viewport.scrollTop });
	}, [pendingScroll]);

	function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (!(event.buttons & 1)) return;
		const rect = event.currentTarget.getBoundingClientRect();

		const currentFrame = Math.floor(
			(event.clientX - rect.left + scrollPosition.x) / frameWidth,
		);
		playbackContext.setCurrentFrame(currentFrame);

		const layerIndex = Math.floor(
			(event.clientY - rect.top + scrollPosition.y) / layerHeight,
		);
		const layerId = layerContext.layers[layerIndex]?.id;
		layerContext.selectLayer(layerId);
	}

	function handleScroll(event: React.UIEvent<HTMLDivElement, UIEvent>) {
		setScrollPosition({
			x: event.currentTarget.scrollLeft,
			y: event.currentTarget.scrollTop,
		});
	}

	function handleLayerFocus(layerIndex: number) {
		const viewport = timelineViewportRef.current;
		if (viewport == null) return;

		const top = layerIndex * layerHeight;
		let nextScrollTop = viewport.scrollTop;
		if (top < nextScrollTop) nextScrollTop = top;
		else if (top + layerHeight > nextScrollTop + viewport.clientHeight) {
			nextScrollTop = top + layerHeight - viewport.clientHeight;
		}
		if (nextScrollTop === viewport.scrollTop) return;
		viewport.scrollTop = nextScrollTop;
		setScrollPosition((position) => ({ ...position, y: nextScrollTop }));
	}

	function handleFrameFocus(frame: number) {
		const viewport = timelineViewportRef.current;
		if (viewport == null) return;

		const left = frame * frameWidth;
		let nextScrollLeft = viewport.scrollLeft;
		if (left < nextScrollLeft) nextScrollLeft = left;
		else if (left > nextScrollLeft + viewport.clientWidth) {
			nextScrollLeft = left - viewport.clientWidth;
		}
		if (nextScrollLeft === viewport.scrollLeft) return;
		viewport.scrollLeft = nextScrollLeft;
		setScrollPosition((position) => ({ ...position, x: nextScrollLeft }));
	}

	function updateStartFrame(startFrame: number) {
		const settings = projectContext.settings;
		if (settings == null || startFrame === settings.startFrame) return;
		projectContext.setSettings({ ...settings, startFrame });
	}

	function updateEndFrame(endFrame: number) {
		const settings = projectContext.settings;
		if (settings == null || endFrame === settings.endFrame) return;
		projectContext.setSettings({ ...settings, endFrame });
	}

	function handleHorizontalZoom(event: React.WheelEvent<HTMLDivElement>) {
		event.preventDefault();
		const viewport = timelineViewportRef.current;
		if (viewport == null) return;

		const nextFrameWidth = Math.min(
			MAX_FRAME_WIDTH,
			Math.max(
				MIN_FRAME_WIDTH,
				frameWidth * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY),
			),
		);
		if (nextFrameWidth === frameWidth) return;

		const viewportRect = viewport.getBoundingClientRect();
		const pointerOffset = event.clientX - viewportRect.left;
		const frameAtPointer = (viewport.scrollLeft + pointerOffset) / frameWidth;
		setPendingScroll({
			x: Math.max(0, frameAtPointer * nextFrameWidth - pointerOffset),
			y: viewport.scrollTop,
		});
		setFrameWidth(nextFrameWidth);
	}

	function handleVerticalZoom(event: React.WheelEvent<HTMLDivElement>) {
		event.preventDefault();
		const viewport = timelineViewportRef.current;
		if (viewport == null) return;

		const nextLayerHeight = Math.min(
			MAX_LAYER_HEIGHT,
			Math.max(
				MIN_LAYER_HEIGHT,
				layerHeight * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY),
			),
		);
		if (nextLayerHeight === layerHeight) return;

		const viewportRect = viewport.getBoundingClientRect();
		const pointerOffset = event.clientY - viewportRect.top;
		const layerAtPointer = (viewport.scrollTop + pointerOffset) / layerHeight;
		setPendingScroll({
			x: viewport.scrollLeft,
			y: Math.max(0, layerAtPointer * nextLayerHeight - pointerOffset),
		});
		setTrackHeight(nextLayerHeight);
	}

	return (
		<Card>
			<div className="absolute inset-0 grid h-full min-h-0 min-w-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[32px_minmax(0,1fr)] overflow-hidden">
				<div className="flex size-full items-center justify-between border-zinc-500/40 border-r border-b px-2">
					<span>{playbackContext.startFrame}</span>
					<span>-</span>
					<span>{playbackContext.currentFrame}</span>
					<span>-</span>
					<span>{playbackContext.endFrame}</span>
				</div>
				<div className="overflow-hidden">
					<TrackHeader
						frameWidth={frameWidth}
						totalFrames={playbackContext.maxFrameCount}
						scrollX={scrollPosition.x}
						currentFrame={playbackContext.currentFrame}
						startFrame={playbackContext.startFrame}
						endFrame={playbackContext.endFrame}
						onFrameChange={playbackContext.setCurrentFrame}
						onStartFrameChange={updateStartFrame}
						onEndFrameChange={updateEndFrame}
						onFrameFocus={handleFrameFocus}
						onWheel={handleHorizontalZoom}
					/>
				</div>
				<div className="overflow-hidden">
					<TrackSide
						layers={layerContext.layers}
						layerHeight={layerHeight}
						scrollY={scrollPosition.y}
						selectedLayerId={layerContext.selectedLayerId}
						onLayerSelect={layerContext.selectLayer}
						onLayerShow={layerContext.showLayer}
						onLayerHide={layerContext.hideLayer}
						onLayerLockToggle={layerContext.toggleLayerLock}
						onLayerFocus={handleLayerFocus}
						onWheel={handleVerticalZoom}
					/>
				</div>
				<TrackBody
					ref={timelineViewportRef}
					layers={layerContext.layers}
					clips={clipContext.clips}
					layerHeight={layerHeight}
					frameWidth={frameWidth}
					maxFrameCount={playbackContext.maxFrameCount}
					currentFrame={playbackContext.currentFrame}
					startFrame={playbackContext.startFrame}
					endFrame={playbackContext.endFrame}
					selectedClipId={clipContext.selectedClipId}
					isLayerHidden={layerContext.isLayerHidden}
					isLayerLocked={layerContext.isLayerLocked}
					onPointerDown={handlePointerDown}
					onScroll={handleScroll}
					onClipSelect={clipContext.selectClip}
					onClipMove={clipContext.moveClip}
					onClipDurationChange={clipContext.changeClipDuration}
					onInteractionStart={() => void core.beginActionGroup()}
					onInteractionEnd={() => void core.endActionGroup()}
				/>
			</div>
		</Card>
	);
};

export default Timeline;
