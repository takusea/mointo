import { IconAdjustmentsHorizontal, IconTools } from "@tabler/icons-react";
import { type RefObject, useRef, useState } from "react";
import { useMediaQuery, useOnClickOutside, useToggle } from "usehooks-ts";
import Card from "~/components/Card";
import IconButton from "~/components/IconButton";
import Splitter from "~/components/Splitter";
import { useCore } from "~/core/useCore";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";
import ClipInspector from "~/editor/inspector/ClipInspector";
import ColorInspector from "~/editor/inspector/ColorInspector";
import ToolInspector from "~/editor/inspector/ToolInspector";
import Toolbar from "~/editor/toolbar/Toolbar";
import { useClip } from "~/features/clip/useClip";
import { useI18n } from "~/features/i18n/useI18n";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useTool } from "~/features/tool/useTool";

const MIN_INSPECTOR_WIDTH = 200;
const DEFAULT_TOOL_INSPECTOR_WIDTH = 240;
const DEFAULT_CLIP_INSPECTOR_WIDTH = 256;

const evaluateKeyframes = (
	keys: { frame: number; property: string; value: number | [number, number] }[],
	previews: {
		frame: number;
		property: string;
		value: number | [number, number];
	}[],
	frame: number,
	fallback: import("~/lib/transform").Transform,
	defaultOpacity: number,
) => {
	const scalar = (property: string, base: number) => {
		const preview = previews.find(
			(key) => key.frame === frame && key.property === property,
		);
		if (preview) return preview.value as number;
		const ordered = keys
			.filter((key) => key.property === property)
			.sort((a, b) => a.frame - b.frame);
		const left = [...ordered].reverse().find((key) => key.frame <= frame);
		const right = ordered.find((key) => key.frame >= frame);
		if (!left) return (right?.value as number | undefined) ?? base;
		if (!right || left.frame === right.frame) return left.value as number;
		const a = left.value as number;
		const b = right.value as number;
		return a + (b - a) * ((frame - left.frame) / (right.frame - left.frame));
	};
	const pair = (property: string, base: [number, number]): [number, number] => {
		const preview = previews.find(
			(key) => key.frame === frame && key.property === property,
		);
		if (preview) return preview.value as [number, number];
		const ordered = keys
			.filter((key) => key.property === property)
			.sort((a, b) => a.frame - b.frame);
		const left = [...ordered].reverse().find((key) => key.frame <= frame);
		const right = ordered.find((key) => key.frame >= frame);
		const a = (left?.value ?? right?.value ?? base) as [number, number];
		if (!left || !right || left.frame === right.frame) return a;
		const b = right.value as [number, number];
		const t = (frame - left.frame) / (right.frame - left.frame);
		return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
	};
	return {
		transform: {
			position: pair("position", fallback.position),
			rotation: scalar("rotation", fallback.rotation),
			scale: pair("scale", fallback.scale),
			anchor: pair("anchor", fallback.anchor),
		},
		opacity: scalar("opacity", defaultOpacity),
	};
};

const InspectorLayout = () => {
	const isDesktop = useMediaQuery("(min-width: 720px)");
	const [isToolInspectorOpen, toggleIsToolInspectorOpen] = useToggle(false);
	const [isClipInspectorOpen, toggleIsClipInspectorOpen] = useToggle(false);
	const [toolInspectorWidth, setToolInspectorWidth] = useState(
		DEFAULT_TOOL_INSPECTOR_WIDTH,
	);
	const [clipInspectorWidth, setClipInspectorWidth] = useState(
		DEFAULT_CLIP_INSPECTOR_WIDTH,
	);
	const { t } = useI18n();
	const toolContext = useTool();
	const core = useCore();
	const clipContext = useClip();
	const layerContext = useLayer();
	const playback = usePlayback();
	const snapshot = useCoreSnapshot();
	const selectedClip = clipContext.clips.find(
		(clip) => clip.id === clipContext.selectedClipId,
	);
	const selectedKeys = selectedClip
		? (snapshot.clipKeyframes[selectedClip.id] ?? [])
		: [];
	const fallbackOpacity = selectedClip
		? (snapshot.clipPreviewOpacities[selectedClip.id] ?? selectedClip.opacity)
		: 1;
	const evaluated =
		selectedClip && clipContext.transform
			? evaluateKeyframes(
					selectedKeys,
					snapshot.clipPreviewKeyframes[selectedClip.id] ?? [],
					playback.currentFrame,
					clipContext.transform,
					fallbackOpacity,
				)
			: undefined;
	const maxInspectorWidth = Math.max(
		MIN_INSPECTOR_WIDTH,
		Math.floor(document.documentElement.clientWidth / 2),
	);
	const showToolInspector = isDesktop || isToolInspectorOpen;
	const showClipInspector = Boolean(
		selectedClip && clipContext.transform && (isDesktop || isClipInspectorOpen),
	);
	const gridTemplateColumns = isDesktop
		? `${showToolInspector ? `${toolInspectorWidth}px 8px ` : ""}minmax(0, 1fr) ${showClipInspector ? `8px ${clipInspectorWidth}px` : ""}`
		: "minmax(0, 1fr)";
	const toolInspectorRef = useRef<HTMLDivElement>(null);
	const clipInspectorRef = useRef<HTMLDivElement>(null);

	useOnClickOutside(toolInspectorRef as RefObject<HTMLDivElement>, () => {
		if (!isDesktop) toggleIsToolInspectorOpen();
	});
	useOnClickOutside(clipInspectorRef as RefObject<HTMLDivElement>, () => {
		if (!isDesktop) toggleIsClipInspectorOpen();
	});

	return (
		<div
			className="pointer-events-none relative grid size-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] pb-18"
			style={{
				gridTemplateColumns,
			}}
		>
			{!isDesktop && (
				<>
					{!isToolInspectorOpen && (
						<div className="pointer-events-auto absolute bottom-16">
							<Card size="small">
								<IconButton
									label={t("editor.openToolInspector")}
									icon={IconTools}
									onClick={() => toggleIsToolInspectorOpen()}
								/>
							</Card>
						</div>
					)}
					{selectedClip && clipContext.transform && !isClipInspectorOpen && (
						<div className="pointer-events-auto absolute right-0 bottom-16">
							<Card size="small">
								<IconButton
									label={t("editor.openClipInspector")}
									icon={IconAdjustmentsHorizontal}
									onClick={() => toggleIsClipInspectorOpen()}
								/>
							</Card>
						</div>
					)}
				</>
			)}
			{showToolInspector && (
				<div
					data-full-width={!isDesktop}
					className="pointer-events-none z-10 h-full min-h-0 min-w-0 overflow-y-auto rounded-2xl data-[full-width=false]:col-start-1 data-[full-width=true]:w-[min(85vw,320px)] data-[full-width=true]:justify-self-start"
					ref={toolInspectorRef}
				>
					<div className="pointer-events-auto flex flex-col gap-2">
						<ToolInspector
							properties={toolContext.properties}
							onPropertyChange={(key, value) =>
								toolContext.setProperty(key, value)
							}
						/>
						<ColorInspector
							currentColor={toolContext.color}
							colorHistory={toolContext.colorHistory}
							onCurrentColorChange={toolContext.setColor}
						/>
					</div>
				</div>
			)}
			{isDesktop && (
				<div className="pointer-events-auto col-start-2 row-start-1 h-full">
					<Splitter
						orientation="vertical"
						label={t("editor.resizeToolInspector")}
						value={toolInspectorWidth}
						min={MIN_INSPECTOR_WIDTH}
						max={maxInspectorWidth}
						onResize={(delta) =>
							setToolInspectorWidth((width) =>
								Math.min(
									maxInspectorWidth,
									Math.max(MIN_INSPECTOR_WIDTH, width + delta),
								),
							)
						}
					/>
				</div>
			)}
			{isDesktop && showClipInspector && (
				<div className="pointer-events-auto col-start-4 row-start-1 h-full">
					<Splitter
						orientation="vertical"
						label={t("editor.resizeClipInspector")}
						value={clipInspectorWidth}
						min={MIN_INSPECTOR_WIDTH}
						max={maxInspectorWidth}
						onResize={(delta) =>
							setClipInspectorWidth((width) =>
								Math.min(
									maxInspectorWidth,
									Math.max(MIN_INSPECTOR_WIDTH, width - delta),
								),
							)
						}
					/>
				</div>
			)}
			{showClipInspector && selectedClip && clipContext.transform && (
				<div
					data-full-width={!isDesktop}
					className="pointer-events-none z-10 h-full min-h-0 min-w-0 overflow-y-auto rounded-2xl data-[full-width=false]:col-start-5 data-[full-width=true]:w-[min(85vw,320px)] data-[full-width=true]:justify-self-end"
					ref={clipInspectorRef}
				>
					<div className="pointer-events-auto flex flex-col gap-2">
						<ClipInspector
							clips={clipContext.clips}
							onUnlink={() => void core.unlinkClip(selectedClip.id)}
							clip={
								evaluated
									? { ...selectedClip, opacity: evaluated.opacity }
									: selectedClip
							}
							isLayerLocked={layerContext.isLayerLocked(selectedClip.layer_id)}
							transform={evaluated?.transform ?? clipContext.transform}
							onStartChange={(start) =>
								clipContext.moveClip(
									selectedClip.id,
									start,
									selectedClip.layer_id,
								)
							}
							onDurationChange={(duration) =>
								clipContext.changeClipDuration(selectedClip.id, duration)
							}
							onNameChange={(name) =>
								clipContext.changeClipName(selectedClip.id, name)
							}
							onSizeChange={(width, height) =>
								clipContext.changeClipSize(selectedClip.id, width, height)
							}
							onPropertiesChange={(properties) =>
								clipContext.changeClipProperties(selectedClip.id, {
									hidden: selectedClip.hidden,
									alpha_locked: selectedClip.alpha_locked,
									locked: selectedClip.locked,
									opacity: selectedClip.opacity,
									blend_mode: selectedClip.blend_mode,
									...properties,
								})
							}
							onTransformChange={(transform) => {
								const previous =
									evaluated?.transform ?? clipContext.transform ?? transform;
								const values: Record<string, number | [number, number]> = {
									position: transform.position,
									rotation: transform.rotation,
									scale: transform.scale,
									anchor: transform.anchor,
								};
								const old: Record<string, number | [number, number]> = {
									position: previous.position,
									rotation: previous.rotation,
									scale: previous.scale,
									anchor: previous.anchor,
								};
								for (const [property, value] of Object.entries(values)) {
									if (JSON.stringify(value) === JSON.stringify(old[property]))
										continue;
									const hasKey = selectedKeys.some(
										(key) =>
											key.frame === playback.currentFrame &&
											key.property === property,
									);
									const hasPropertyKeys = selectedKeys.some(
										(key) => key.property === property,
									);
									if (hasKey)
										void core.setClipKeyframe(
											selectedClip.id,
											playback.currentFrame,
											property,
											value,
										);
									else if (hasPropertyKeys)
										void core.setClipPreviewKeyframe(
											selectedClip.id,
											playback.currentFrame,
											property,
											value,
										);
									else
										void clipContext.changeTransform(selectedClip.id, {
											...(clipContext.transform ?? transform),
											[property]: value,
										});
								}
							}}
							onInteractionStart={() => {
								void core.beginActionGroup();
							}}
							onInteractionEnd={() => {
								void core.endActionGroup();
							}}
							currentFrame={playback.currentFrame}
							keyframes={selectedKeys}
							onKeyframeToggle={(property, value) => {
								if (
									selectedKeys.some(
										(key) =>
											key.frame === playback.currentFrame &&
											key.property === property,
									)
								)
									void core.deleteClipKeyframe(
										selectedClip.id,
										playback.currentFrame,
										property,
									);
								else
									void core.setClipKeyframe(
										selectedClip.id,
										playback.currentFrame,
										property,
										value,
									);
							}}
							onOpacityChange={(opacity) => {
								const frame = playback.currentFrame;
								const hasKey = selectedKeys.some(
									(key) => key.frame === frame && key.property === "opacity",
								);
								const hasOpacityKeys = selectedKeys.some(
									(key) => key.property === "opacity",
								);
								if (hasKey)
									void core.setClipKeyframe(
										selectedClip.id,
										frame,
										"opacity",
										opacity,
									);
								else if (hasOpacityKeys)
									void core.setClipPreviewKeyframe(
										selectedClip.id,
										frame,
										"opacity",
										opacity,
									);
								else
									void clipContext.changeClipProperties(selectedClip.id, {
										hidden: selectedClip.hidden,
										alpha_locked: selectedClip.alpha_locked,
										locked: selectedClip.locked,
										opacity,
										blend_mode: selectedClip.blend_mode,
									});
							}}
							onFrameSelect={playback.setCurrentFrame}
						/>
					</div>
				</div>
			)}
			<div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 overflow-x-auto rounded-xl">
				<div className="pointer-events-auto mx-auto w-fit">
					<Toolbar />
				</div>
			</div>
		</div>
	);
};

export default InspectorLayout;
