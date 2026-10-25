import { useHotkeys } from "react-hotkeys-hook";
import MenubarCheckboxItem from "~/components/Menubar/MenubarCheckboxItem";
import MenubarItem from "~/components/Menubar/MenubarItem";
import MenubarMenu from "~/components/Menubar/MenubarMenu";
import MenubarRoot from "~/components/Menubar/MenubarRoot";
import MenubarSeparator from "~/components/Menubar/MenubarSeparator";
import { formatShortcut } from "~/constants/shortcuts";
import { useDialogs } from "~/editor/dialogs/useDialogs";
import { useClip } from "~/features/clip/useClip";
import { useUndo } from "~/features/history/useUndo";
import { useI18n } from "~/features/i18n/useI18n";
import { useImageImport } from "~/features/io/import/useImageImport";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { useShortcuts } from "~/features/shortcuts/useShortcuts";
import { useCanvasView } from "../canvas/useCanvasView";

const GlobalMenubar = () => {
	const { t } = useI18n();
	const { shortcuts } = useShortcuts();
	const undoStack = useUndo();
	const clipContext = useClip();
	const layerContext = useLayer();
	const playbackContext = usePlayback();
	const project = useProject();
	const dialogs = useDialogs();
	const canvasView = useCanvasView();
	const importImage = useImageImport();

	const fitToView = () => {
		if (project.settings == null) {
			return;
		}
		const canvas = document.querySelector<HTMLCanvasElement>("#draw-canvas");
		const viewport = canvas?.parentElement?.getBoundingClientRect();
		if (canvas == null || viewport == null) {
			throw new Error("Cannot fit the view before the canvas is available.");
		}
		canvasView.fitToView(
			canvas.width,
			canvas.height,
			viewport.width,
			viewport.height,
		);
	};
	const toggleHorizontalFlip = () =>
		canvasView.setIsFlippedHorizontal((prev) => !prev);
	const toggleVerticalFlip = () =>
		canvasView.setIsFlippedVertical((prev) => !prev);
	const toggleGrid = () => canvasView.setIsGridVisible((prev) => !prev);
	const resetFlip = () => {
		canvasView.setIsFlippedHorizontal(false);
		canvasView.setIsFlippedVertical(false);
	};

	useHotkeys(shortcuts.newProject, () => {
		if (project.confirmDiscard()) dialogs.open("createProject");
	});
	useHotkeys(shortcuts.openProject, () => project.open());
	useHotkeys(shortcuts.saveProject, () => project.save());
	useHotkeys(shortcuts.zoomIn, () => canvasView.zoom(1));
	useHotkeys(shortcuts.zoomOut, () => canvasView.zoom(-1));
	useHotkeys(shortcuts.resetZoom, () => canvasView.setScale(1));
	useHotkeys(shortcuts.fitView, fitToView);
	useHotkeys(shortcuts.rotateLeft, () => canvasView.rotate(-1));
	useHotkeys(shortcuts.rotateRight, () => canvasView.rotate(1));
	useHotkeys(shortcuts.resetRotation, () => canvasView.setRotation(0));
	useHotkeys(shortcuts.flipHorizontal, toggleHorizontalFlip);
	useHotkeys(shortcuts.flipVertical, toggleVerticalFlip);
	useHotkeys(shortcuts.resetFlip, resetFlip);
	useHotkeys(shortcuts.toggleGrid, toggleGrid);
	useHotkeys(shortcuts.toggleOnionSkin, () =>
		canvasView.setIsOnionSkin((prev) => !prev),
	);

	return (
		<MenubarRoot>
			<MenubarMenu label={t("menubar.file")}>
				<MenubarItem
					label={t("menubar.new")}
					shortcut={formatShortcut(shortcuts.newProject)}
					onSelect={() => {
						if (project.confirmDiscard()) dialogs.open("createProject");
					}}
				/>
				<MenubarItem
					label={t("menubar.open")}
					shortcut={formatShortcut(shortcuts.openProject)}
					onSelect={() => project.open()}
				/>
				<MenubarItem
					label={t("menubar.save")}
					shortcut={formatShortcut(shortcuts.saveProject)}
					onSelect={() => project.save()}
				/>
				<MenubarItem
					label={t("menubar.saveWith")}
					shortcut={formatShortcut(shortcuts.saveWith)}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("menubar.import")}
					disabled={
						project.settings == null ||
						layerContext.selectedLayerId == null ||
						layerContext.isLayerLocked(layerContext.selectedLayerId)
					}
					onSelect={importImage}
				/>
				<MenubarItem
					label={t("menubar.export")}
					disabled={project.settings == null}
					onSelect={() => dialogs.open("exportProject")}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("menubar.projectSettings")}
					onSelect={() => dialogs.open("editCompositionSettings")}
				/>
				<MenubarSeparator />
				<MenubarItem label={t("menubar.close")} />
			</MenubarMenu>
			<MenubarMenu label={t("menubar.edit")}>
				<MenubarItem
					label={t("menubar.undo")}
					shortcut={formatShortcut(shortcuts.undo)}
					onSelect={() => undoStack.undo()}
					disabled={!undoStack.canUndo}
				/>
				<MenubarItem
					label={t("menubar.redo")}
					shortcut={formatShortcut(shortcuts.redo)}
					onSelect={() => undoStack.redo()}
					disabled={!undoStack.canRedo}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("menubar.cut")}
					shortcut={formatShortcut(shortcuts.cut)}
					onSelect={clipContext.cut}
				/>
				<MenubarItem
					label={t("menubar.copy")}
					shortcut={formatShortcut(shortcuts.copy)}
					onSelect={clipContext.copy}
				/>
				<MenubarItem
					label={t("menubar.paste")}
					shortcut={formatShortcut(shortcuts.paste)}
					onSelect={clipContext.paste}
				/>
				<MenubarItem
					label={t("menubar.selectAll")}
					shortcut={formatShortcut(shortcuts.selectAll)}
					onSelect={clipContext.selectAll}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("menubar.duplicateClip")}
					shortcut={formatShortcut(shortcuts.duplicateClip)}
					onSelect={clipContext.duplicateSelectedClip}
				/>
				<MenubarItem
					label={t("menubar.duplicateLinkedClip")}
					shortcut={formatShortcut(shortcuts.duplicateLinkedClip)}
					onSelect={clipContext.linkDuplicateSelectedClip}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("menubar.view")}>
				<MenubarItem
					label={t("menubar.zoomIn")}
					shortcut={formatShortcut(shortcuts.zoomIn)}
					onSelect={() => canvasView.zoom(1)}
				/>
				<MenubarItem
					label={t("menubar.zoomOut")}
					shortcut={formatShortcut(shortcuts.zoomOut)}
					onSelect={() => canvasView.zoom(-1)}
				/>
				<MenubarItem
					label={t("menubar.fitView")}
					shortcut={formatShortcut(shortcuts.fitView)}
					disabled={project.settings == null}
					onSelect={fitToView}
				/>
				<MenubarItem
					label={t("menubar.resetZoom")}
					shortcut={formatShortcut(shortcuts.resetZoom)}
					onSelect={() => canvasView.setScale(1)}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("menubar.rotateLeft")}
					shortcut={formatShortcut(shortcuts.rotateLeft)}
					onSelect={() => canvasView.rotate(-1)}
				/>
				<MenubarItem
					label={t("menubar.rotateRight")}
					shortcut={formatShortcut(shortcuts.rotateRight)}
					onSelect={() => canvasView.rotate(1)}
				/>
				<MenubarItem
					label={t("menubar.resetRotate")}
					shortcut={formatShortcut(shortcuts.resetRotation)}
					onSelect={() => canvasView.setRotation(0)}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("menubar.flipHorizontal")}
					shortcut={formatShortcut(shortcuts.flipHorizontal)}
					onSelect={toggleHorizontalFlip}
				/>
				<MenubarItem
					label={t("menubar.flipVertical")}
					shortcut={formatShortcut(shortcuts.flipVertical)}
					onSelect={toggleVerticalFlip}
				/>
				<MenubarItem
					label={t("menubar.resetFlip")}
					shortcut={formatShortcut(shortcuts.resetFlip)}
					onSelect={resetFlip}
				/>
				<MenubarSeparator />
				<MenubarCheckboxItem
					label={
						canvasView.isGridVisible
							? t("menubar.hideGrid")
							: t("menubar.showGrid")
					}
					shortcut={formatShortcut(shortcuts.toggleGrid)}
					checked={canvasView.isGridVisible}
					onCheckedChange={toggleGrid}
				/>
				<MenubarCheckboxItem
					label={
						canvasView.isOnionSkin
							? t("menubar.hideOnionSkin")
							: t("menubar.showOnionSkin")
					}
					shortcut={formatShortcut(shortcuts.toggleOnionSkin)}
					checked={canvasView.isOnionSkin}
					onCheckedChange={() => canvasView.setIsOnionSkin((prev) => !prev)}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("menubar.playback")}>
				<MenubarItem
					label={
						playbackContext.isPlaying ? t("menubar.pause") : t("menubar.play")
					}
					shortcut={formatShortcut(shortcuts.togglePlayback)}
					onSelect={() =>
						playbackContext.isPlaying
							? playbackContext.pause()
							: playbackContext.play()
					}
				/>
				<MenubarItem
					label={t("menubar.stop")}
					shortcut={formatShortcut(shortcuts.stop)}
					onSelect={playbackContext.stop}
				/>
				<MenubarSeparator />
				<MenubarCheckboxItem
					label={t("menubar.loop")}
					shortcut={formatShortcut(shortcuts.toggleLoop)}
					checked={playbackContext.isLoop}
					onCheckedChange={() =>
						playbackContext.setIsLoop(!playbackContext.isLoop)
					}
				/>
				<MenubarCheckboxItem
					label={t("menubar.scrollFollow")}
					checked={playbackContext.isScrollFollow}
					onCheckedChange={() =>
						playbackContext.setIsScrollFollow(!playbackContext.isScrollFollow)
					}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("menubar.firstFrame")}
					shortcut={formatShortcut(shortcuts.firstFrame)}
					onSelect={() =>
						playbackContext.setCurrentFrame(playbackContext.startFrame)
					}
				/>
				<MenubarItem
					label={t("menubar.previousFrame")}
					shortcut={formatShortcut(shortcuts.previousFrame)}
					onSelect={() =>
						playbackContext.setCurrentFrame(playbackContext.currentFrame - 1)
					}
				/>
				<MenubarItem
					label={t("menubar.nextFrame")}
					shortcut={formatShortcut(shortcuts.nextFrame)}
					onSelect={() =>
						playbackContext.setCurrentFrame(playbackContext.currentFrame + 1)
					}
				/>
				<MenubarItem
					label={t("menubar.lastFrame")}
					shortcut={formatShortcut(shortcuts.lastFrame)}
					onSelect={() =>
						playbackContext.setCurrentFrame(playbackContext.endFrame)
					}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("menubar.settings")}>
				<MenubarItem
					label={t("menubar.appearanceSettings")}
					onSelect={() => dialogs.open("appearanceSettings")}
				/>
				<MenubarItem
					label={t("menubar.inputSettings")}
					onSelect={() => dialogs.open("inputSettings")}
				/>
				<MenubarItem
					label={t("menubar.shortcutSettings")}
					onSelect={() => dialogs.open("shortcutSettings")}
				/>
				<MenubarItem
					label={t("menubar.languageSettings")}
					onSelect={() => dialogs.open("languageSettings")}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("menubar.help")}>
				<MenubarItem
					label={t("menubar.about")}
					onSelect={() => dialogs.open("about")}
				/>
			</MenubarMenu>
		</MenubarRoot>
	);
};

export default GlobalMenubar;
