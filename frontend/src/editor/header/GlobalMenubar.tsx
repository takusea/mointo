import MenubarCheckboxItem from "~/components/Menubar/MenubarCheckboxItem";
import MenubarItem from "~/components/Menubar/MenubarItem";
import MenubarMenu from "~/components/Menubar/MenubarMenu";
import MenubarRoot from "~/components/Menubar/MenubarRoot";
import MenubarSeparator from "~/components/Menubar/MenubarSeparator";
import MenubarSub from "~/components/Menubar/MenubarSub";
import { formatShortcut } from "~/constants/shortcuts";
import { useDialogs } from "~/editor/dialogs/useDialogs";
import { useClip } from "~/features/clip/useClip";
import { useUndo } from "~/features/history/useUndo";
import { useI18n } from "~/features/i18n/useI18n";
import { projectExporters } from "~/features/io/export/projectExporters";
import { useProjectExport } from "~/features/io/export/useProjectExport";
import { useAudioImport } from "~/features/io/import/useAudioImport";
import { useImageImport } from "~/features/io/import/useImageImport";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { useShortcut } from "~/features/shortcuts/useShortcut";
import { useShortcutSettings } from "~/features/shortcuts/useShortcuts";
import { useCanvasView } from "../canvas/useCanvasView";

const GlobalMenubar = () => {
	const { t } = useI18n();
	const { shortcuts } = useShortcutSettings();
	const undoStack = useUndo();
	const clipContext = useClip();
	const layerContext = useLayer();
	const selectedClip = clipContext.clips.find(
		(clip) => clip.id === clipContext.selectedClipId,
	);
	const selectedLayerIndex = layerContext.layers.findIndex(
		(layer) => layer.id === layerContext.selectedLayerId,
	);
	const canDeleteSelectedClips = clipContext.clips.some(
		(clip) =>
			(clipContext.selectedClipIds.includes(clip.id) ||
				clip.id === clipContext.selectedClipId) &&
			!layerContext.isLayerLocked(clip.layer_id),
	);
	const playbackContext = usePlayback();
	const project = useProject();
	const dialogs = useDialogs();
	const canvasView = useCanvasView();
	const importImage = useImageImport();
	const importAudio = useAudioImport();
	const { progress: exportProgress, exportAs } = useProjectExport();

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
	const addClipAtCurrentFrame = () => {
		if (project.settings == null || layerContext.selectedLayerId == null)
			return;

		const currentFrame = playbackContext.currentFrame;
		void clipContext.addClip(currentFrame, layerContext.selectedLayerId);
	};
	const addGroupClipAtCurrentFrame = () => {
		if (project.settings == null || layerContext.selectedLayerId == null)
			return;
		const currentFrame = playbackContext.currentFrame;
		void clipContext.addGroupClip(currentFrame, layerContext.selectedLayerId);
	};
	useShortcut(shortcuts.addClip, addClipAtCurrentFrame);
	useShortcut(shortcuts.addGroupClip, addGroupClipAtCurrentFrame);

	useShortcut(shortcuts.newProject, () => {
		if (project.confirmDiscard()) dialogs.open("createProject");
	});
	useShortcut(shortcuts.openProject, () => project.open());
	useShortcut(shortcuts.saveProject, () => project.save());
	useShortcut(shortcuts.zoomIn, () => canvasView.zoom(1));
	useShortcut(shortcuts.zoomOut, () => canvasView.zoom(-1));
	useShortcut(shortcuts.resetZoom, () => canvasView.setScale(1));
	useShortcut(shortcuts.fitView, fitToView);
	useShortcut(shortcuts.rotateLeft, () => canvasView.rotate(-1));
	useShortcut(shortcuts.rotateRight, () => canvasView.rotate(1));
	useShortcut(shortcuts.resetRotation, () => canvasView.setRotation(0));
	useShortcut(shortcuts.flipHorizontal, toggleHorizontalFlip);
	useShortcut(shortcuts.flipVertical, toggleVerticalFlip);
	useShortcut(shortcuts.resetFlip, resetFlip);
	useShortcut(shortcuts.toggleGrid, toggleGrid);
	useShortcut(shortcuts.toggleOnionSkin, () =>
		canvasView.setIsOnionSkin((prev) => !prev),
	);

	return (
		<MenubarRoot>
			<MenubarMenu label={t("action.file")}>
				<MenubarItem
					label={t("action.file.new")}
					shortcut={formatShortcut(shortcuts.newProject)}
					onSelect={() => {
						if (project.confirmDiscard()) dialogs.open("createProject");
					}}
				/>
				<MenubarItem
					label={t("action.file.open")}
					shortcut={formatShortcut(shortcuts.openProject)}
					onSelect={() => project.open()}
				/>
				<MenubarItem
					label={t("action.file.save")}
					shortcut={formatShortcut(shortcuts.saveProject)}
					onSelect={() => project.save()}
				/>
				<MenubarItem
					label={t("action.file.saveWith")}
					shortcut={formatShortcut(shortcuts.saveWith)}
				/>
				<MenubarSeparator />
				<MenubarSub label={t("action.file.import")}>
					<MenubarItem
						label={t("action.file.importImage")}
						disabled={
							project.settings == null ||
							layerContext.selectedLayerId == null ||
							layerContext.isLayerLocked(layerContext.selectedLayerId)
						}
						onSelect={() => importImage()}
					/>
					<MenubarItem
						label={t("action.file.importAudio")}
						disabled={
							project.settings == null ||
							layerContext.selectedLayerId == null ||
							layerContext.isLayerLocked(layerContext.selectedLayerId)
						}
						onSelect={() => importAudio()}
					/>
				</MenubarSub>
				<MenubarSub label={t("action.file.export")}>
					{projectExporters.map((exporter) => (
						<MenubarItem
							key={exporter.format}
							label={t(exporter.labelKey)}
							disabled={project.settings == null || exportProgress != null}
							onSelect={() => void exportAs(exporter.format)}
						/>
					))}
				</MenubarSub>
				<MenubarSeparator />
				<MenubarItem
					label={t("action.file.projectSettings")}
					onSelect={() => dialogs.open("editCompositionSettings")}
				/>
				<MenubarSeparator />
				<MenubarItem label={t("action.file.close")} />
			</MenubarMenu>
			<MenubarMenu label={t("action.edit")}>
				<MenubarItem
					label={t("action.edit.undo")}
					shortcut={formatShortcut(shortcuts.undo)}
					onSelect={() => undoStack.undo()}
					disabled={!undoStack.canUndo}
				/>
				<MenubarItem
					label={t("action.edit.redo")}
					shortcut={formatShortcut(shortcuts.redo)}
					onSelect={() => undoStack.redo()}
					disabled={!undoStack.canRedo}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("action.edit.cut")}
					shortcut={formatShortcut(shortcuts.cut)}
					onSelect={clipContext.cut}
				/>
				<MenubarItem
					label={t("action.edit.copy")}
					shortcut={formatShortcut(shortcuts.copy)}
					onSelect={clipContext.copy}
				/>
				<MenubarItem
					label={t("action.edit.paste")}
					shortcut={formatShortcut(shortcuts.paste)}
					onSelect={clipContext.paste}
				/>
				<MenubarSeparator />
				<MenubarSub label={t("action.edit.addClip")}>
					<MenubarItem
						label={t("action.edit.addImageClip")}
						shortcut={formatShortcut(shortcuts.addClip)}
						disabled={
							project.settings == null ||
							layerContext.selectedLayerId == null ||
							layerContext.isLayerLocked(layerContext.selectedLayerId)
						}
						onSelect={addClipAtCurrentFrame}
					/>
					<MenubarItem
						label={t("action.edit.addAudioClip")}
						disabled={
							project.settings == null ||
							layerContext.selectedLayerId == null ||
							layerContext.isLayerLocked(layerContext.selectedLayerId)
						}
						onSelect={() => void importAudio()}
					/>
					<MenubarItem
						label={t("action.edit.addGroupClip")}
						shortcut={formatShortcut(shortcuts.addGroupClip)}
						disabled={
							project.settings == null ||
							layerContext.selectedLayerId == null ||
							layerContext.isLayerLocked(layerContext.selectedLayerId)
						}
						onSelect={addGroupClipAtCurrentFrame}
					/>
				</MenubarSub>
				<MenubarItem
					label={t("action.edit.deleteClip")}
					shortcut={formatShortcut(shortcuts.deleteClip)}
					disabled={!canDeleteSelectedClips}
					onSelect={() => {
						if (selectedClip != null) {
							void clipContext.deleteClip(selectedClip.id);
						}
					}}
				/>
				<MenubarItem
					label={t("action.edit.duplicateClip")}
					shortcut={formatShortcut(shortcuts.duplicateClip)}
					onSelect={clipContext.duplicateSelectedClip}
				/>
				<MenubarItem
					label={t("action.edit.duplicateLinkedClip")}
					shortcut={formatShortcut(shortcuts.duplicateLinkedClip)}
					onSelect={clipContext.linkDuplicateSelectedClip}
				/>
				<MenubarItem
					label={t("action.edit.mergeClips")}
					shortcut={formatShortcut(shortcuts.mergeClips)}
					onSelect={clipContext.mergeSelectedClips}
					disabled={!clipContext.canMergeSelectedClips}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("action.select")}>
				<MenubarItem
					label={t("action.select.selectAll")}
					shortcut={formatShortcut(shortcuts.selectAll)}
					onSelect={clipContext.selectAll}
				/>
				<MenubarItem
					label={t("action.select.clear")}
					shortcut={formatShortcut(shortcuts.clearSelection)}
					onSelect={() => clipContext.setSelection(undefined)}
				/>
				<MenubarItem
					label={t("action.select.reselect")}
					shortcut={formatShortcut(shortcuts.reselect)}
					onSelect={clipContext.reselect}
					disabled={!clipContext.canReselect}
				/>
				<MenubarItem
					label={t("action.select.invert")}
					shortcut={formatShortcut(shortcuts.invertSelection)}
					onSelect={clipContext.invertSelection}
					disabled={project.settings == null}
				/>
				<MenubarItem
					label={t("action.select.modify")}
					onSelect={() => dialogs.open("modifySelection")}
					disabled={project.settings == null || clipContext.selection == null}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("action.select.previousLayer")}
					shortcut={formatShortcut(shortcuts.previousLayer)}
					disabled={selectedLayerIndex <= 0}
					onSelect={() => {
						const layer = layerContext.layers[selectedLayerIndex - 1];
						if (layer != null) layerContext.selectLayer(layer.id);
					}}
				/>
				<MenubarItem
					label={t("action.select.nextLayer")}
					shortcut={formatShortcut(shortcuts.nextLayer)}
					disabled={
						selectedLayerIndex < 0 ||
						selectedLayerIndex >= layerContext.layers.length - 1
					}
					onSelect={() => {
						const layer = layerContext.layers[selectedLayerIndex + 1];
						if (layer != null) layerContext.selectLayer(layer.id);
					}}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("action.view")}>
				<MenubarItem
					label={t("action.view.zoomIn")}
					shortcut={formatShortcut(shortcuts.zoomIn)}
					onSelect={() => canvasView.zoom(1)}
				/>
				<MenubarItem
					label={t("action.view.zoomOut")}
					shortcut={formatShortcut(shortcuts.zoomOut)}
					onSelect={() => canvasView.zoom(-1)}
				/>
				<MenubarItem
					label={t("action.view.fitView")}
					shortcut={formatShortcut(shortcuts.fitView)}
					disabled={project.settings == null}
					onSelect={fitToView}
				/>
				<MenubarItem
					label={t("action.view.resetZoom")}
					shortcut={formatShortcut(shortcuts.resetZoom)}
					onSelect={() => canvasView.setScale(1)}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("action.view.rotateLeft")}
					shortcut={formatShortcut(shortcuts.rotateLeft)}
					onSelect={() => canvasView.rotate(-1)}
				/>
				<MenubarItem
					label={t("action.view.rotateRight")}
					shortcut={formatShortcut(shortcuts.rotateRight)}
					onSelect={() => canvasView.rotate(1)}
				/>
				<MenubarItem
					label={t("action.view.resetRotation")}
					shortcut={formatShortcut(shortcuts.resetRotation)}
					onSelect={() => canvasView.setRotation(0)}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("action.view.flipHorizontal")}
					shortcut={formatShortcut(shortcuts.flipHorizontal)}
					onSelect={toggleHorizontalFlip}
				/>
				<MenubarItem
					label={t("action.view.flipVertical")}
					shortcut={formatShortcut(shortcuts.flipVertical)}
					onSelect={toggleVerticalFlip}
				/>
				<MenubarItem
					label={t("action.view.resetFlip")}
					shortcut={formatShortcut(shortcuts.resetFlip)}
					onSelect={resetFlip}
				/>
				<MenubarSeparator />
				<MenubarCheckboxItem
					label={
						canvasView.isGridVisible
							? t("action.view.hideGrid")
							: t("action.view.showGrid")
					}
					shortcut={formatShortcut(shortcuts.toggleGrid)}
					checked={canvasView.isGridVisible}
					onCheckedChange={toggleGrid}
				/>
				<MenubarCheckboxItem
					label={
						canvasView.isOnionSkin
							? t("action.view.hideOnionSkin")
							: t("action.view.showOnionSkin")
					}
					shortcut={formatShortcut(shortcuts.toggleOnionSkin)}
					checked={canvasView.isOnionSkin}
					onCheckedChange={() => canvasView.setIsOnionSkin((prev) => !prev)}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("action.play")}>
				<MenubarItem
					label={
						playbackContext.isPlaying
							? t("action.play.pause")
							: t("action.play.play")
					}
					shortcut={formatShortcut(shortcuts.togglePlayback)}
					onSelect={() =>
						playbackContext.isPlaying
							? playbackContext.pause()
							: playbackContext.play()
					}
				/>
				<MenubarItem
					label={t("action.play.stop")}
					shortcut={formatShortcut(shortcuts.stop)}
					onSelect={playbackContext.stop}
				/>
				<MenubarSeparator />
				<MenubarCheckboxItem
					label={t("action.play.loop")}
					shortcut={formatShortcut(shortcuts.toggleLoop)}
					checked={playbackContext.isLoop}
					onCheckedChange={() =>
						playbackContext.setIsLoop(!playbackContext.isLoop)
					}
				/>
				<MenubarCheckboxItem
					label={t("action.play.scrollFollow")}
					checked={playbackContext.isScrollFollow}
					onCheckedChange={() =>
						playbackContext.setIsScrollFollow(!playbackContext.isScrollFollow)
					}
				/>
				<MenubarSeparator />
				<MenubarItem
					label={t("action.play.firstFrame")}
					shortcut={formatShortcut(shortcuts.firstFrame)}
					onSelect={() =>
						playbackContext.setCurrentFrame(playbackContext.startFrame)
					}
				/>
				<MenubarItem
					label={t("action.play.previousFrame")}
					shortcut={formatShortcut(shortcuts.previousFrame)}
					onSelect={() =>
						playbackContext.setCurrentFrame(playbackContext.currentFrame - 1)
					}
				/>
				<MenubarItem
					label={t("action.play.nextFrame")}
					shortcut={formatShortcut(shortcuts.nextFrame)}
					onSelect={() =>
						playbackContext.setCurrentFrame(playbackContext.currentFrame + 1)
					}
				/>
				<MenubarItem
					label={t("action.play.lastFrame")}
					shortcut={formatShortcut(shortcuts.lastFrame)}
					onSelect={() =>
						playbackContext.setCurrentFrame(playbackContext.endFrame)
					}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("action.settings")}>
				<MenubarItem
					label={t("action.settings.appearance")}
					onSelect={() => dialogs.open("appearanceSettings")}
				/>
				<MenubarItem
					label={t("action.settings.input")}
					onSelect={() => dialogs.open("inputSettings")}
				/>
				<MenubarItem
					label={t("action.settings.action")}
					onSelect={() => dialogs.open("shortcutSettings")}
				/>
				<MenubarItem
					label={t("action.settings.language")}
					onSelect={() => dialogs.open("languageSettings")}
				/>
			</MenubarMenu>
			<MenubarMenu label={t("action.help")}>
				<MenubarItem
					label={t("action.help.about")}
					onSelect={() => dialogs.open("about")}
				/>
			</MenubarMenu>
		</MenubarRoot>
	);
};

export default GlobalMenubar;
