import { IconAdjustmentsHorizontal, IconTools } from "@tabler/icons-react";
import { type RefObject, useRef, useState } from "react";
import { useMediaQuery, useOnClickOutside, useToggle } from "usehooks-ts";
import Card from "~/components/Card";
import IconButton from "~/components/IconButton";
import Splitter from "~/components/Splitter";
import { useCore } from "~/core/useCore";
import ClipInspector from "~/editor/inspector/ClipInspector";
import ColorInspector from "~/editor/inspector/ColorInspector";
import ToolInspector from "~/editor/inspector/ToolInspector";
import Toolbar from "~/editor/toolbar/Toolbar";
import { useClip } from "~/features/clip/useClip";
import { useI18n } from "~/features/i18n/useI18n";
import { useLayer } from "~/features/layer/useLayer";
import { useTool } from "~/features/tool/useTool";

const MIN_INSPECTOR_WIDTH = 200;
const DEFAULT_TOOL_INSPECTOR_WIDTH = 240;
const DEFAULT_CLIP_INSPECTOR_WIDTH = 256;

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
	const selectedClip = clipContext.clips.find(
		(clip) => clip.id === clipContext.selectedClipId,
	);
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
			className="relative grid min-h-0 min-w-0 pointer-events-none"
			style={{
				gridTemplateColumns,
				gridTemplateRows: "minmax(0, 1fr)",
			}}
		>
			{!isDesktop && (
				<>
					{!isToolInspectorOpen && (
						<div className="absolute bottom-16 pointer-events-auto">
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
						<div className="absolute right-0 bottom-16 pointer-events-auto">
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
					className="z-10 h-full min-h-0 min-w-0 pb-16 overflow-y-auto pointer-events-none"
					style={{
						gridColumn: 1,
						gridRow: 1,
						width: isDesktop ? undefined : "min(85vw, 320px)",
						justifySelf: isDesktop ? undefined : "start",
					}}
					ref={toolInspectorRef}
				>
					<div className="flex flex-col gap-2 pointer-events-auto">
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
				<div
					className="h-full pointer-events-auto"
					style={{ gridColumn: 2, gridRow: 1 }}
				>
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
			{showClipInspector && selectedClip && clipContext.transform && (
				<div
					className="z-10 h-full min-h-0 min-w-0 pb-16 overflow-y-auto pointer-events-none"
					style={{
						gridColumn: isDesktop ? 5 : 1,
						gridRow: 1,
						width: isDesktop ? undefined : "min(85vw, 320px)",
						justifySelf: isDesktop ? undefined : "end",
					}}
					ref={clipInspectorRef}
				>
					<div className="flex flex-col gap-2 pointer-events-auto">
						<ClipInspector
							clip={selectedClip}
							isLayerLocked={layerContext.isLayerLocked(selectedClip.layer_id)}
							transform={clipContext.transform}
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
							onTransformChange={(transform) =>
								clipContext.changeTransform(selectedClip.id, transform)
							}
							onInteractionStart={() => {
								void core.beginActionGroup();
							}}
							onInteractionEnd={() => {
								void core.endActionGroup();
							}}
						/>
					</div>
				</div>
			)}
			{isDesktop && showClipInspector && (
				<div
					className="h-full pointer-events-auto"
					style={{ gridColumn: 4, gridRow: 1 }}
				>
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
			<div className="absolute bottom-0 left-0 right-0 overflow-x-auto z-10 pointer-events-auto">
				<div className="mx-auto w-fit">
					<Toolbar />
				</div>
			</div>
		</div>
	);
};

export default InspectorLayout;
