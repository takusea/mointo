import {
	IconArrowBackUp,
	IconArrowForwardUp,
	IconArrowsMove,
	IconBucketDroplet,
	IconClipboard,
	IconColorPicker,
	IconCopy,
	IconEraser,
	IconFlipHorizontal,
	IconFlipVertical,
	IconLasso,
	IconLayersDifference,
	IconPencil,
	IconPlayerPause,
	IconPlayerPlay,
	IconPlayerSkipBack,
	IconPlayerSkipForward,
	IconPlayerStop,
	IconPlayerTrackNext,
	IconPlayerTrackPrev,
	IconRefresh,
	IconRotate,
	IconScissors,
	IconZoom,
} from "@tabler/icons-react";
import { useHotkeys } from "react-hotkeys-hook";
import Card from "~/components/Card";
import IconButton from "~/components/IconButton";
import NumberField from "~/components/NumberField";
import { useClip } from "~/features/clip/useClip";
import { useUndo } from "~/features/history/useUndo";
import { useI18n } from "~/features/i18n/useI18n";
import { usePlayback } from "~/features/playback/usePlayback";
import { formatShortcut } from "~/features/shortcuts/shortcutDefinitions";
import { useShortcuts } from "~/features/shortcuts/useShortcuts";
import { useTool } from "~/features/tool/useTool";
import { useCanvasView } from "../canvas/useCanvasView";

const Toolbar = () => {
	const { t } = useI18n();
	const playbackContext = usePlayback();
	const clipContext = useClip();
	const toolContext = useTool();
	const canvasView = useCanvasView();
	const undoStack = useUndo();
	const { shortcuts } = useShortcuts();

	useHotkeys(shortcuts.undo, undoStack.undo);
	useHotkeys(shortcuts.redo, undoStack.redo);
	useHotkeys(shortcuts.cut, clipContext.cut);
	useHotkeys(shortcuts.copy, clipContext.copy);
	useHotkeys(shortcuts.paste, clipContext.paste);
	useHotkeys(shortcuts.selectAll, (event) => {
		event.preventDefault();
		clipContext.selectAll();
	});
	useHotkeys(shortcuts.clearSelection, () =>
		clipContext.setSelection(undefined),
	);
	useHotkeys(shortcuts.togglePlayback, () =>
		playbackContext.isPlaying
			? playbackContext.pause()
			: playbackContext.play(),
	);
	useHotkeys(shortcuts.stop, () => playbackContext.stop());
	useHotkeys(shortcuts.toggleOnionSkin, () =>
		canvasView.setIsOnionSkin((prev) => !prev),
	);
	useHotkeys(shortcuts.toggleLoop, () =>
		playbackContext.setIsLoop(!playbackContext.isLoop),
	);
	useHotkeys(shortcuts.firstFrame, () =>
		playbackContext.setCurrentFrame(playbackContext.startFrame),
	);
	useHotkeys(shortcuts.previousFrame, () =>
		playbackContext.setCurrentFrame(playbackContext.currentFrame - 1),
	);
	useHotkeys(shortcuts.nextFrame, () =>
		playbackContext.setCurrentFrame(playbackContext.currentFrame + 1),
	);
	useHotkeys(shortcuts.lastFrame, () =>
		playbackContext.setCurrentFrame(playbackContext.endFrame),
	);
	useHotkeys(shortcuts.moveTool, () => toolContext.setTool("move"));
	useHotkeys(shortcuts.eyedropperTool, () => toolContext.setTool("eyedropper"));
	useHotkeys(shortcuts.penTool, () => toolContext.setTool("pen"));
	useHotkeys(shortcuts.eraserTool, () => toolContext.setTool("eraser"));
	useHotkeys(shortcuts.fillTool, () => toolContext.setTool("fill"));
	useHotkeys(shortcuts.selectTool, () => toolContext.setTool("select"));

	return (
		<div className="flex gap-2">
			<Card size="small">
				<div className="flex gap-1">
					<IconButton
						label={t("toolbar.pen")}
						shortcut={formatShortcut(shortcuts.penTool)}
						icon={IconPencil}
						variant={toolContext.tool === "pen" ? "primary" : "default"}
						onClick={() => toolContext.setTool("pen")}
					/>
					<IconButton
						label={t("toolbar.eraser")}
						shortcut={formatShortcut(shortcuts.eraserTool)}
						icon={IconEraser}
						variant={toolContext.tool === "eraser" ? "primary" : "default"}
						onClick={() => toolContext.setTool("eraser")}
					/>
					<IconButton
						label={t("toolbar.fill")}
						shortcut={formatShortcut(shortcuts.fillTool)}
						icon={IconBucketDroplet}
						variant={toolContext.tool === "fill" ? "primary" : "default"}
						onClick={() => toolContext.setTool("fill")}
					/>
					<IconButton
						label={t("toolbar.eyedropper")}
						shortcut={formatShortcut(shortcuts.eyedropperTool)}
						icon={IconColorPicker}
						variant={toolContext.tool === "eyedropper" ? "primary" : "default"}
						onClick={() => toolContext.setTool("eyedropper")}
					/>
					<IconButton
						label={t("toolbar.select")}
						shortcut={formatShortcut(shortcuts.selectTool)}
						icon={IconLasso}
						variant={toolContext.tool === "select" ? "primary" : "default"}
						onClick={() => toolContext.setTool("select")}
					/>
					<IconButton
						label={t("toolbar.move")}
						shortcut={formatShortcut(shortcuts.moveTool)}
						icon={IconArrowsMove}
						variant={toolContext.tool === "move" ? "primary" : "default"}
						onClick={() => toolContext.setTool("move")}
					/>
				</div>
			</Card>
			<Card size="small">
				<div className="flex gap-1">
					<IconButton
						label={t("toolbar.undo")}
						shortcut={formatShortcut(shortcuts.undo)}
						icon={IconArrowBackUp}
						onClick={undoStack.undo}
						disabled={!undoStack.canUndo}
					/>
					<IconButton
						label={t("toolbar.redo")}
						shortcut={formatShortcut(shortcuts.redo)}
						icon={IconArrowForwardUp}
						onClick={undoStack.redo}
						disabled={!undoStack.canRedo}
					/>
					<IconButton
						label={t("toolbar.cut")}
						shortcut={formatShortcut(shortcuts.cut)}
						icon={IconScissors}
						onClick={clipContext.cut}
					/>
					<IconButton
						label={t("toolbar.copy")}
						shortcut={formatShortcut(shortcuts.copy)}
						icon={IconCopy}
						onClick={clipContext.copy}
					/>
					<IconButton
						label={t("toolbar.paste")}
						shortcut={formatShortcut(shortcuts.paste)}
						icon={IconClipboard}
						onClick={clipContext.paste}
					/>
				</div>
			</Card>
			<Card size="small">
				<div className="flex gap-1">
					<IconButton
						label={t("toolbar.play")}
						shortcut={formatShortcut(shortcuts.togglePlayback)}
						icon={playbackContext.isPlaying ? IconPlayerPause : IconPlayerPlay}
						variant={playbackContext.isPlaying ? "primary" : "default"}
						onClick={() =>
							playbackContext.isPlaying
								? playbackContext.pause()
								: playbackContext.play()
						}
					/>
					<IconButton
						label={t("toolbar.stop")}
						shortcut={formatShortcut(shortcuts.stop)}
						icon={IconPlayerStop}
						onClick={playbackContext.stop}
					/>
					<IconButton
						label={t("toolbar.loop")}
						shortcut={formatShortcut(shortcuts.toggleLoop)}
						icon={IconRefresh}
						variant={playbackContext.isLoop ? "primary" : "default"}
						onClick={() => playbackContext.setIsLoop(!playbackContext.isLoop)}
					/>
					<IconButton
						label={t("toolbar.onionSkin")}
						shortcut={formatShortcut(shortcuts.toggleOnionSkin)}
						icon={IconLayersDifference}
						variant={canvasView.isOnionSkin ? "primary" : "default"}
						onClick={() => canvasView.setIsOnionSkin((prev) => !prev)}
					/>
				</div>
			</Card>
			<Card size="small">
				<div className="flex gap-1">
					<IconButton
						label={t("toolbar.rewind")}
						shortcut={formatShortcut(shortcuts.firstFrame)}
						icon={IconPlayerSkipBack}
						onClick={() =>
							playbackContext.setCurrentFrame(playbackContext.startFrame)
						}
					/>
					<IconButton
						label={t("toolbar.prev")}
						shortcut={formatShortcut(shortcuts.previousFrame)}
						icon={IconPlayerTrackPrev}
						onClick={() =>
							playbackContext.setCurrentFrame(playbackContext.currentFrame - 1)
						}
					/>
					<IconButton
						label={t("toolbar.next")}
						shortcut={formatShortcut(shortcuts.nextFrame)}
						icon={IconPlayerTrackNext}
						onClick={() =>
							playbackContext.setCurrentFrame(playbackContext.currentFrame + 1)
						}
					/>
					<IconButton
						label={t("toolbar.forward")}
						shortcut={formatShortcut(shortcuts.lastFrame)}
						icon={IconPlayerSkipForward}
						onClick={() =>
							playbackContext.setCurrentFrame(playbackContext.endFrame)
						}
					/>
				</div>
			</Card>
			<Card size="small">
				<div className="flex gap-1">
					<div className="w-24">
						<NumberField
							value={Number((canvasView.scale * 100).toFixed(2))}
							max={canvasView.maxScale * 100}
							min={canvasView.minScale * 100}
							step={10}
							rightElement={"%"}
							onValueChange={(value) => canvasView.setScale(value / 100)}
						/>
					</div>
					<IconButton
						label={t("toolbar.resetZoom")}
						shortcut={formatShortcut(shortcuts.resetZoom)}
						icon={IconZoom}
						onClick={() => canvasView.setScale(1)}
					/>
				</div>
			</Card>
			<Card size="small">
				<div className="flex gap-1">
					<div className="w-24">
						<NumberField
							value={canvasView.rotation}
							max={180}
							min={-180}
							step={1}
							rightElement={"deg"}
							onValueChange={canvasView.setRotation}
						/>
					</div>
					<IconButton
						label={t("toolbar.resetRotate")}
						shortcut={formatShortcut(shortcuts.resetRotation)}
						icon={IconRotate}
						onClick={() => canvasView.setRotation(0)}
					/>
				</div>
			</Card>
			<Card size="small">
				<div className="flex gap-1">
					<IconButton
						label={t("toolbar.flipHorizontal")}
						shortcut={formatShortcut(shortcuts.flipHorizontal)}
						icon={IconFlipHorizontal}
						variant={canvasView.isFlippedHorizontal ? "primary" : "default"}
						onClick={() => canvasView.setIsFlippedHorizontal((prev) => !prev)}
					/>
					<IconButton
						label={t("toolbar.flipVertical")}
						shortcut={formatShortcut(shortcuts.flipVertical)}
						icon={IconFlipVertical}
						variant={canvasView.isFlippedVertical ? "primary" : "default"}
						onClick={() => canvasView.setIsFlippedVertical((prev) => !prev)}
					/>
				</div>
			</Card>
		</div>
	);
};

export default Toolbar;
